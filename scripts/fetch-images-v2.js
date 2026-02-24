/* Nerithys — fetch-images-v2.js
   Multi-source image fetcher: Wikimedia Commons + iNaturalist + Wikipedia search
   Much more aggressive than v1.
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');
const CONCURRENCY = 8;
const DELAY = 250;
const UA = 'Nerithys-Bot/1.0 (aquarium encyclopedia; educational)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Source 1: Wikimedia Commons search ──────────── */
async function fetchFromCommons(sciName) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(sciName)}&gsrlimit=3&prop=imageinfo&iiprop=url|mime&iiurlwidth=800&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query && data.query.pages;
    if (!pages) return null;

    for (const pid of Object.keys(pages)) {
      const page = pages[pid];
      if (!page.imageinfo || !page.imageinfo.length) continue;
      const info = page.imageinfo[0];
      // Only accept real images
      if (info.mime && (info.mime.startsWith('image/jpeg') || info.mime.startsWith('image/png') || info.mime.startsWith('image/webp'))) {
        return info.thumburl || info.url;
      }
    }
  } catch (e) { /* timeout */ }
  return null;
}

/* ── Source 2: iNaturalist ───────────────────────── */
async function fetchFromINaturalist(sciName) {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sciName)}&rank=species&per_page=1`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || !data.results.length) return null;
    const taxon = data.results[0];
    // Verify it matches
    if (!taxon.name || taxon.name.toLowerCase() !== sciName.toLowerCase()) return null;
    if (taxon.default_photo && taxon.default_photo.medium_url) {
      return taxon.default_photo.medium_url;
    }
  } catch (e) { /* timeout */ }
  return null;
}

/* ── Source 3: Wikipedia search (broader than v1) ── */
async function fetchFromWikiSearch(sciName) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(sciName)}&gsrlimit=2&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&redirects=1`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query && data.query.pages;
    if (!pages) return null;

    for (const pid of Object.keys(pages)) {
      const page = pages[pid];
      // Make sure the result is about the right species
      if (page.title && page.title.toLowerCase().includes(sciName.split(' ')[0].toLowerCase())) {
        if (page.thumbnail && page.thumbnail.source) {
          return page.thumbnail.source;
        }
      }
    }
  } catch (e) { /* timeout */ }
  return null;
}

/* ── Try all sources ─────────────────────────────── */
async function fetchImage(sciName) {
  // Try iNaturalist first (most reliable for species photos)
  let url = await fetchFromINaturalist(sciName);
  if (url) return { url, source: 'iNaturalist' };

  // Try Wikimedia Commons
  url = await fetchFromCommons(sciName);
  if (url) return { url, source: 'Commons' };

  // Try Wikipedia search
  url = await fetchFromWikiSearch(sciName);
  if (url) return { url, source: 'Wikipedia' };

  return null;
}

async function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  
  // Find species still without images
  const toFetch = [];
  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    const imgs = data.images || [];
    if (!imgs.length || !imgs[0]) {
      toFetch.push({ file: f, path: fPath, data });
    }
  }

  console.log(`[fetch-images-v2] ${toFetch.length} species still without images`);
  
  let found = 0, failed = 0, processed = 0;
  const sources = { iNaturalist: 0, Commons: 0, Wikipedia: 0 };

  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (item) => {
      const sciName = item.data.scientificName || '';
      if (!sciName) return { item, result: null };
      const result = await fetchImage(sciName);
      return { item, result };
    }));

    for (const { item, result } of results) {
      processed++;
      if (result) {
        item.data.images = [result.url];
        fs.writeFileSync(item.path, JSON.stringify(item.data, null, 2), 'utf8');
        found++;
        sources[result.source]++;
      } else {
        failed++;
      }
    }

    if (processed % 100 === 0 || processed === toFetch.length) {
      console.log(`[v2] ${processed}/${toFetch.length} | Found: ${found} (iNat: ${sources.iNaturalist}, Commons: ${sources.Commons}, Wiki: ${sources.Wikipedia}) | Not found: ${failed}`);
    }

    if (i + CONCURRENCY < toFetch.length) await sleep(DELAY);
  }

  console.log(`\n[fetch-images-v2] Done! Found ${found} more images.`);
  console.log(`  iNaturalist: ${sources.iNaturalist}`);
  console.log(`  Wikimedia Commons: ${sources.Commons}`);
  console.log(`  Wikipedia: ${sources.Wikipedia}`);
  console.log(`  Still missing: ${failed}`);
}

main().catch(console.error);
