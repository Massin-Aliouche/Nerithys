/* Nerithys — fetch-images-v4.js
   Last-resort image fetching using:
   1. Wikipedia page main image (via pageimages API)
   2. Wikimedia Commons broader category search
   3. FishBase thumbnails
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');
const CONCURRENCY = 5;
const DELAY = 400;
const UA = 'Nerithys-Bot/1.0 (aquarium encyclopedia; educational)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Wikipedia page image (multiple language editions) ── */
async function fetchWikipediaImage(sciName) {
  // Try English, then French, then Commons-linked Wikipedia
  const langs = ['en', 'fr', 'de'];
  for (const lang of langs) {
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(sciName)}&prop=pageimages&pithumbsize=800&format=json&redirects=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) continue;
      const data = await res.json();
      const pages = data.query && data.query.pages;
      if (!pages) continue;
      for (const pid of Object.keys(pages)) {
        if (pid === '-1') continue;
        const page = pages[pid];
        if (page.thumbnail && page.thumbnail.source) {
          // Get higher res version
          let imgUrl = page.thumbnail.source;
          // Replace /XXXpx- with /800px- for larger image
          imgUrl = imgUrl.replace(/\/\d+px-/, '/800px-');
          return imgUrl;
        }
      }
    } catch (e) {}
  }
  return null;
}

/* ── Wikimedia Commons broader search (genus-level) ── */
async function fetchCommonsGenusImage(sciName) {
  try {
    // Search with just the species name but also try genus + species combinations
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent('"' + sciName + '"')}&gsrlimit=5&prop=imageinfo&iiprop=url|mime&iiurlwidth=800&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query && data.query.pages;
    if (!pages) return null;
    
    // Prefer results that contain the exact species name in the title
    const sorted = Object.values(pages).sort((a, b) => {
      const aMatch = (a.title || '').toLowerCase().includes(sciName.toLowerCase()) ? 0 : 1;
      const bMatch = (b.title || '').toLowerCase().includes(sciName.toLowerCase()) ? 0 : 1;
      return aMatch - bMatch;
    });
    
    for (const page of sorted) {
      if (!page.imageinfo || !page.imageinfo.length) continue;
      const info = page.imageinfo[0];
      if (info.mime && (info.mime.startsWith('image/jpeg') || info.mime.startsWith('image/png'))) {
        return info.thumburl || info.url;
      }
    }
  } catch (e) {}
  return null;
}

/* ── FishBase species image ── */
async function fetchFishBaseImage(sciName) {
  try {
    const parts = sciName.split(' ');
    if (parts.length < 2) return null;
    const genus = parts[0];
    const species = parts[1].toLowerCase();
    
    // Try FishBase summary endpoint
    const url = `https://fishbase.ropensci.org/species?Genus=${encodeURIComponent(genus)}&Species=${encodeURIComponent(species)}&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const sp = data.data[0];
      if (sp.PicPreferredName) {
        return `https://www.fishbase.se/images/species/${sp.PicPreferredName}`;
      }
    }
  } catch (e) {}
  return null;
}

async function fetchBestImage(sciName) {
  // 1. Wikipedia page image
  let url = await fetchWikipediaImage(sciName);
  if (url) return { url, source: 'Wikipedia' };
  
  // 2. Commons broader search
  url = await fetchCommonsGenusImage(sciName);
  if (url) return { url, source: 'Commons2' };
  
  // 3. FishBase
  url = await fetchFishBaseImage(sciName);
  if (url) return { url, source: 'FishBase' };
  
  return null;
}

async function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  
  const needsImage = [];
  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    if (!data.images || !data.images[0]) {
      needsImage.push({ file: f, path: fPath, data });
    }
  }
  
  console.log(`[v4] ${needsImage.length} species need images`);
  
  let found = 0, notFound = 0, processed = 0;
  const sources = { Wikipedia: 0, Commons2: 0, FishBase: 0 };
  
  for (let i = 0; i < needsImage.length; i += CONCURRENCY) {
    const batch = needsImage.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (item) => {
      const sciName = item.data.scientificName || '';
      if (!sciName) return { item, result: null };
      return { item, result: await fetchBestImage(sciName) };
    }));
    
    for (const { item, result } of results) {
      processed++;
      if (result) {
        item.data.images = [result.url];
        fs.writeFileSync(item.path, JSON.stringify(item.data, null, 2), 'utf8');
        found++;
        sources[result.source]++;
      } else {
        notFound++;
      }
    }
    
    if (processed % 100 === 0 || processed === needsImage.length) {
      console.log(`[v4] ${processed}/${needsImage.length} | Found: ${found} (Wiki:${sources.Wikipedia} Comm:${sources.Commons2} FB:${sources.FishBase}) | Missing: ${notFound}`);
    }
    
    if (i + CONCURRENCY < needsImage.length) await sleep(DELAY);
  }
  
  // Dedup check
  const imgMap = {};
  let dupes = 0;
  for (const f of fs.readdirSync(FICHES).filter(f => f.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(FICHES, f), 'utf8'));
    const img = (data.images && data.images[0]) || '';
    if (img) {
      if (imgMap[img]) {
        // Clear the duplicate
        data.images = [];
        fs.writeFileSync(path.join(FICHES, f), JSON.stringify(data, null, 2), 'utf8');
        dupes++;
      } else {
        imgMap[img] = f;
      }
    }
  }
  
  console.log(`\n[v4] Summary:`);
  console.log(`  New images: ${found}`);
  console.log(`  Still missing: ${notFound}`);
  console.log(`  Duplicates cleared: ${dupes}`);
}

main().catch(console.error);
