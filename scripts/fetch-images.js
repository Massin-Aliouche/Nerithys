/* Nerithys — fetch-images.js
   Fetch images from Wikipedia/Wikimedia Commons for species that lack one.
   Uses the Wikipedia API (pageimages) to get the main image for each species.
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');
const CONCURRENCY = 10;
const DELAY = 200; // ms between batches

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* Query Wikipedia for the main image of a species */
async function fetchWikiImage(scientificName) {
  // Try English Wikipedia first
  const encodedName = encodeURIComponent(scientificName);
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodedName}&prop=pageimages&format=json&pithumbsize=800&redirects=1`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Nerithys-Bot/1.0 (aquarium encyclopedia; educational)' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query && data.query.pages;
    if (!pages) return null;

    for (const pid of Object.keys(pages)) {
      if (pid === '-1') continue;
      const page = pages[pid];
      if (page.thumbnail && page.thumbnail.source) {
        // Get a higher-res version by modifying the thumb URL
        let imgUrl = page.thumbnail.source;
        // Try to get original or larger size
        if (page.original && page.original.source) {
          imgUrl = page.original.source;
        }
        return imgUrl;
      }
    }
  } catch (e) { /* timeout or network error */ }
  return null;
}

async function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  
  // Find species without images
  const toFetch = [];
  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    const imgs = data.images || [];
    if (!imgs.length || !imgs[0]) {
      toFetch.push({ file: f, path: fPath, data });
    }
  }

  console.log(`[fetch-images] ${toFetch.length} species without images`);
  
  let found = 0, failed = 0, processed = 0;

  // Process in batches
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (item) => {
      const sciName = item.data.scientificName || '';
      if (!sciName) return { item, url: null };
      const url = await fetchWikiImage(sciName);
      return { item, url };
    }));

    for (const { item, url } of results) {
      processed++;
      if (url) {
        item.data.images = [url];
        fs.writeFileSync(item.path, JSON.stringify(item.data, null, 2), 'utf8');
        found++;
      } else {
        failed++;
      }
    }

    if (processed % 100 === 0 || processed === toFetch.length) {
      console.log(`[fetch-images] Progress: ${processed}/${toFetch.length} | Found: ${found} | Not found: ${failed}`);
    }

    if (i + CONCURRENCY < toFetch.length) await sleep(DELAY);
  }

  console.log(`\n[fetch-images] Done! Found images for ${found} species. ${failed} still without images.`);
}

main().catch(console.error);
