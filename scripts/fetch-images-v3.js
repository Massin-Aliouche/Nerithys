/* Nerithys — fetch-images-v3.js
   Third pass: GBIF + FishBase for remaining species without images
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');
const CONCURRENCY = 6;
const DELAY = 300;
const UA = 'Nerithys-Bot/1.0 (aquarium encyclopedia; educational)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── GBIF species image ──────────────────────────── */
async function fetchFromGBIF(sciName) {
  try {
    // Step 1: Find species key
    const matchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(sciName)}&strict=true`;
    const matchRes = await fetch(matchUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!matchRes.ok) return null;
    const matchData = await matchRes.json();
    
    if (!matchData.usageKey || matchData.matchType === 'NONE') return null;
    
    // Step 2: Get media for this species
    const mediaUrl = `https://api.gbif.org/v1/species/${matchData.usageKey}/media?limit=3`;
    const mediaRes = await fetch(mediaUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (!mediaRes.ok) return null;
    const mediaData = await mediaRes.json();
    
    if (mediaData.results && mediaData.results.length) {
      for (const m of mediaData.results) {
        if (m.type === 'StillImage' && m.identifier) {
          return m.identifier;
        }
      }
    }
  } catch (e) { /* timeout */ }
  return null;
}

/* ── FishBase thumbnail ──────────────────────────── */
async function fetchFromFishBase(sciName) {
  try {
    const parts = sciName.split(' ');
    if (parts.length < 2) return null;
    const genus = parts[0];
    const species = parts[1];
    
    // FishBase API via rfishbase endpoint
    const url = `https://fishbase.ropensci.org/species?Genus=${encodeURIComponent(genus)}&Species=${encodeURIComponent(species)}&fields=SpecCode,PicPreferredName&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data.data && data.data.length && data.data[0].PicPreferredName) {
      const picName = data.data[0].PicPreferredName;
      return `https://www.fishbase.se/images/species/${picName}`;
    }
  } catch (e) { /* timeout */ }
  return null;
}

async function fetchImage(sciName) {
  // Try GBIF first
  let url = await fetchFromGBIF(sciName);
  if (url) return { url, source: 'GBIF' };

  // Try FishBase
  url = await fetchFromFishBase(sciName);
  if (url) return { url, source: 'FishBase' };

  return null;
}

async function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  
  const toFetch = [];
  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    const imgs = data.images || [];
    if (!imgs.length || !imgs[0]) {
      toFetch.push({ file: f, path: fPath, data });
    }
  }

  console.log(`[fetch-images-v3] ${toFetch.length} species still without images`);
  
  let found = 0, failed = 0, processed = 0;
  const sources = { GBIF: 0, FishBase: 0 };

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
      console.log(`[v3] ${processed}/${toFetch.length} | Found: ${found} (GBIF: ${sources.GBIF}, FishBase: ${sources.FishBase}) | Not found: ${failed}`);
    }

    if (i + CONCURRENCY < toFetch.length) await sleep(DELAY);
  }

  console.log(`\n[fetch-images-v3] Done! Found ${found} more images.`);
  console.log(`  GBIF: ${sources.GBIF}`);
  console.log(`  FishBase: ${sources.FishBase}`);
  console.log(`  Still missing: ${failed}`);
}

main().catch(console.error);
