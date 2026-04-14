/* Nerithys — refonte.js
   Comprehensive species data update:
   1. Fetch correct images from iNaturalist (most reliable species-specific photos)
   2. Fallback to Wikimedia Commons + GBIF
   3. Verify existing images still load (broken link check)
   For species without images after all sources: leave empty (better than wrong)
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');
const CONCURRENCY = 6;
const DELAY = 300;
const UA = 'Nerithys-Bot/1.0 (aquarium encyclopedia; educational)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── iNaturalist: best per-species photos ────────── */
async function fetchFromINaturalist(sciName) {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sciName)}&rank=species&per_page=1`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || !data.results.length) return null;
    const taxon = data.results[0];
    if (!taxon.name || taxon.name.toLowerCase() !== sciName.toLowerCase()) return null;
    if (taxon.default_photo && taxon.default_photo.medium_url) {
      // Get larger size: replace "medium" with "large" in URL
      return taxon.default_photo.medium_url.replace('/medium.', '/large.');
    }
  } catch (e) { /* timeout */ }
  return null;
}

/* ── Wikimedia Commons search ────────────────────── */
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
      if (info.mime && (info.mime.startsWith('image/jpeg') || info.mime.startsWith('image/png'))) {
        return info.thumburl || info.url;
      }
    }
  } catch (e) {}
  return null;
}

/* ── GBIF media ──────────────────────────────────── */
async function fetchFromGBIF(sciName) {
  try {
    const matchRes = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(sciName)}&strict=true`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000)
    });
    if (!matchRes.ok) return null;
    const matchData = await matchRes.json();
    if (!matchData.usageKey || matchData.matchType === 'NONE') return null;

    const mediaRes = await fetch(`https://api.gbif.org/v1/species/${matchData.usageKey}/media?limit=3`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000)
    });
    if (!mediaRes.ok) return null;
    const mediaData = await mediaRes.json();
    if (mediaData.results) {
      for (const m of mediaData.results) {
        if (m.type === 'StillImage' && m.identifier) return m.identifier;
      }
    }
  } catch (e) {}
  return null;
}

/* ── Check if URL is reachable ───────────────────── */
async function isUrlAlive(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow'
    });
    return res.ok;
  } catch (e) { return false; }
}

/* ── Fetch image from all sources ────────────────── */
async function fetchBestImage(sciName) {
  let url = await fetchFromINaturalist(sciName);
  if (url) return { url, source: 'iNaturalist' };

  url = await fetchFromCommons(sciName);
  if (url) return { url, source: 'Commons' };

  url = await fetchFromGBIF(sciName);
  if (url) return { url, source: 'GBIF' };

  return null;
}

async function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));

  // Categorize: needs image vs has image (check validity)
  const needsImage = [];
  const hasImage = [];

  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    const img = (data.images && data.images[0]) || '';
    if (!img) {
      needsImage.push({ file: f, path: fPath, data });
    } else {
      hasImage.push({ file: f, path: fPath, data, img });
    }
  }

  console.log(`[refonte] ${files.length} fiches total`);
  console.log(`[refonte] ${needsImage.length} need images`);
  console.log(`[refonte] ${hasImage.length} have images (will verify a sample)`);

  // ── Phase 1: Fetch images for species without any ──
  console.log('\n=== Phase 1: Fetching missing images ===');
  let found = 0, notFound = 0, processed = 0;
  const sources = { iNaturalist: 0, Commons: 0, GBIF: 0 };

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
      console.log(`[phase1] ${processed}/${needsImage.length} | Found: ${found} (iNat:${sources.iNaturalist} Comm:${sources.Commons} GBIF:${sources.GBIF}) | Missing: ${notFound}`);
    }

    if (i + CONCURRENCY < needsImage.length) await sleep(DELAY);
  }

  // ── Phase 2: Check existing b-aqua images for broken links ──
  console.log('\n=== Phase 2: Checking existing images for broken links ===');
  let checked = 0, broken = 0, fixed = 0;

  // Only check b-aqua images (external URLs most likely to break)
  const baquaImages = hasImage.filter(item => item.img.includes('b-aqua.com'));
  console.log(`[phase2] ${baquaImages.length} b-aqua images to check`);

  for (let i = 0; i < baquaImages.length; i += CONCURRENCY) {
    const batch = baquaImages.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (item) => {
      const alive = await isUrlAlive(item.img);
      return { item, alive };
    }));

    for (const { item, alive } of results) {
      checked++;
      if (!alive) {
        broken++;
        // Try to get a replacement
        const sciName = item.data.scientificName || '';
        const replacement = await fetchBestImage(sciName);
        if (replacement) {
          item.data.images = [replacement.url];
          fs.writeFileSync(item.path, JSON.stringify(item.data, null, 2), 'utf8');
          fixed++;
        } else {
          // Clear broken image
          item.data.images = [];
          fs.writeFileSync(item.path, JSON.stringify(item.data, null, 2), 'utf8');
        }
      }
    }

    if (checked % 50 === 0 || checked === baquaImages.length) {
      console.log(`[phase2] Checked: ${checked}/${baquaImages.length} | Broken: ${broken} | Fixed: ${fixed}`);
    }

    if (i + CONCURRENCY < baquaImages.length) await sleep(DELAY);
  }

  console.log(`\n[refonte] Summary:`);
  console.log(`  New images found: ${found}`);
  console.log(`  Still missing: ${notFound}`);
  console.log(`  Broken links found: ${broken} (${fixed} replaced)`);
}

main().catch(console.error);
