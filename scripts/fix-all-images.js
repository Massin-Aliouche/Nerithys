/* fix-all-images.js — Remove obscure marine species + fix all broken images */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const dir = path.join(__dirname, '..', 'content', 'fiches');

// ─── LOAD BAD IMAGES LIST ────────────────────────────────────────
const badFile = path.join(__dirname, 'bad-images.json');
const badImages = JSON.parse(fs.readFileSync(badFile, 'utf8'));
// bad-images.json is an array of filenames like "acanthocobitis-botia.json"
const badSet = new Set(badImages);

// ─── MARINE GENERA TO REMOVE ENTIRELY ───────────────────────────
const REMOVE_MARINE_GENERA = new Set([
  'Cephalopholis',    // Groupers — too large, not home aquarium fish
  'Epinephelus',      // Groupers — same
  'Gobiodon',         // Coral gobies — extremely specialized
  'Anampses',         // Obscure wrasses
  'Cantherhines',     // Filefish — rarely kept
  'Melichthys',       // Triggerfish — aggressive, large
  'Neoglyphidodon',   // Obscure damsels
  'Ctenogobiops',     // Shrimp gobies — specialist
  'Stonogobiops',     // Shrimp gobies — specialist
  'Hoplolatilus',     // Tilefish — deep, specialist
  'Macropharyngodon', // Leopard wrasses — very hard
  'Opistognathus',    // Jawfish — specialist
  'Parupeneus',       // Goatfish — too large
  'Lactoria',         // Cowfish — toxin risk
  'Dunckerocampus',   // Pipefish — specialist
  'Doryrhamphus',     // Pipefish — specialist
  'Siganus',          // Rabbitfish — venomous, large
  'Bodianus',         // Hogfish — large
  'Sufflamen',        // Triggerfish — large
  'Antennarius',      // Frogfish — eat tankmates
  'Pseudanthias',     // Anthias — many die quickly
  'Cirrhitichthys',   // Hawkfish — eat shrimp
  'Paracirrhites',    // Hawkfish — eat shrimp
  'Labroides',        // Cleaner wrasse — die in captivity
  'Cryptocentrus',    // Shrimp gobies — specialist
]);

// ─── TRIM MARINE GENERA ─────────────────────────────────────────
const TRIM_MARINE = {
  'Amphiprion': 6,    // 12→6 (keep most iconic clownfish)
  'Acanthurus': 4,    // 9→4
  'Centropyge': 4,    // 9→4
  'Chromis': 2,       // 6→2
  'Ecsenius': 2,      // 4→2
  'Halichoeres': 2,   // 4→2
  'Pomacentrus': 2,   // 4→2
  'Thalassoma': 2,    // 4→2
  'Valenciennea': 2,  // 3→2
};

// ─── ALWAYS KEEP (popular species) ──────────────────────────────
const ALWAYS_KEEP = new Set([
  'Amphiprion ocellaris', 'Amphiprion percula', 'Amphiprion frenatus',
  'Amphiprion clarkii', 'Amphiprion nigripes', 'Amphiprion polymnus',
  'Paracanthurus hepatus', 'Acanthurus leucosternon', 'Acanthurus japonicus',
  'Acanthurus lineatus', 'Zebrasoma flavescens', 'Zebrasoma veliferum',
  'Zebrasoma xanthurum', 'Centropyge loricula', 'Centropyge bicolor',
  'Centropyge bispinosa', 'Centropyge eibli',
  'Chromis viridis', 'Chrysiptera parasema', 'Chrysiptera cyanea',
  'Pseudocheilinus hexataenia', 'Chelmon rostratus', 'Zanclus cornutus',
  'Premnas biaculeatus', 'Pterapogon kauderni', 'Sphaeramia nematoptera',
  'Gramma loreto', 'Elacatinus oceanops', 'Oxycirrhites typus',
  'Neocirrhites armatus', 'Salarias fasciatus', 'Synchiropus splendidus',
  'Synchiropus picturatus', 'Pterois volitans', 'Oxymonacanthus longirostris',
  'Balistapus undulatus', 'Holacanthus ciliaris', 'Pomacanthus imperator',
  'Meiacanthus grammistes', 'Pictichromis paccagnellae',
  'Serranocirrhitus latus', 'Coris gaimard', 'Paracheilinus mccoskeri',
  'Forcipiger flavissimus',
]);

// ─── POPULARITY SCORING ─────────────────────────────────────────
function popularityScore(d) {
  let score = 0;
  const name = (d.name || '').toLowerCase();
  if (d.difficulty && d.difficulty <= 2) score += 3;
  if (d.minVolumeL && d.minVolumeL <= 200) score += 2;
  if (name && name !== (d.scientificName || '').toLowerCase()) score += 1;
  // Penalize if already has a broken image
  if (badSet.has((d.slug || '') + '.json')) score -= 5;
  return score;
}

// ─── STEP 1: MARINE CLEANUP ─────────────────────────────────────
console.log('=== STEP 1: Marine species cleanup ===');
const allFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let removedMarine = 0;

const species = allFiles.map(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  d._file = f;
  d._genus = (d.scientificName || '').split(' ')[0];
  return d;
});

// Remove entire marine genera
const toRemove = new Set();
species.forEach(d => {
  if (ALWAYS_KEEP.has(d.scientificName)) return;
  const isMarine = (d.biotope || '').includes('mer');
  if (isMarine && REMOVE_MARINE_GENERA.has(d._genus)) {
    toRemove.add(d._file);
  }
});

// Trim marine genera
const marineGenusMap = {};
species.forEach(d => {
  const isMarine = (d.biotope || '').includes('mer');
  if (!isMarine) return;
  if (!marineGenusMap[d._genus]) marineGenusMap[d._genus] = [];
  marineGenusMap[d._genus].push(d);
});

Object.entries(TRIM_MARINE).forEach(([genus, max]) => {
  const bucket = marineGenusMap[genus] || [];
  if (bucket.length <= max) return;
  bucket.sort((a, b) => {
    const ak = ALWAYS_KEEP.has(a.scientificName) ? 1000 : 0;
    const bk = ALWAYS_KEEP.has(b.scientificName) ? 1000 : 0;
    return (bk + popularityScore(b)) - (ak + popularityScore(a));
  });
  for (let i = max; i < bucket.length; i++) {
    if (!ALWAYS_KEEP.has(bucket[i].scientificName)) {
      toRemove.add(bucket[i]._file);
    }
  }
});

toRemove.forEach(f => {
  fs.unlinkSync(path.join(dir, f));
  removedMarine++;
});
console.log(`Removed ${removedMarine} marine species`);

// ─── STEP 2: FIND REPLACEMENT IMAGES ────────────────────────────
console.log('\n=== STEP 2: Finding replacement images ===');

// Reload after marine cleanup
const remainingFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const remaining = remainingFiles.map(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  d._file = f;
  return d;
});

// Find which remaining species need new images
const needImages = remaining.filter(d => badSet.has(d._file));
console.log(`${needImages.length} remaining species need new images`);

// ─── Wikipedia image fetch ──────────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Nerithys/1.0 (aquarium encyclopedia)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

function checkUrl(url) {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Nerithys/1.0' } }, res => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(8000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// Bad patterns to reject (maps, drawings, B&W, etc.)
const BAD_PATTERNS = /map|carte|range|distribution|drawing|sketch|illustration|diagram|holotype|syntype|specimen|museum|lithograph|gravure|engraving|plate_|Fauna_Japonica|Bleeker|Cuvier|FMIB_|Blochii|Systema_ichthyologiae|Carnegie_Museum|complete_aquarium_book|Biologia_centrali|NoImage/i;

function isGoodImageUrl(url) {
  if (!url) return false;
  if (BAD_PATTERNS.test(url)) return false;
  // Must be a direct image URL
  if (!/\.(jpg|jpeg|png|webp|gif)/i.test(url)) return false;
  return true;
}

async function findWikipediaImage(scientificName) {
  // Try English Wikipedia first, then French, then German
  for (const lang of ['en', 'fr', 'de']) {
    const title = scientificName.replace(/ /g, '_');
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const data = await fetchJson(url);
    if (data && data.thumbnail && data.thumbnail.source) {
      let imgUrl = data.thumbnail.source;
      // Try to get higher resolution
      imgUrl = imgUrl.replace(/\/\d+px-/, '/960px-');
      if (isGoodImageUrl(imgUrl)) {
        const ok = await checkUrl(imgUrl);
        if (ok) return imgUrl;
        // Try original size
        if (data.originalimage && data.originalimage.source) {
          const origUrl = data.originalimage.source;
          if (isGoodImageUrl(origUrl)) {
            const origOk = await checkUrl(origUrl);
            if (origOk) return origUrl;
          }
        }
      }
    }
  }
  return null;
}

async function findWikimediaImage(scientificName) {
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(scientificName)}&srnamespace=6&srlimit=5&format=json`;
  const data = await fetchJson(searchUrl);
  if (!data || !data.query || !data.query.search) return null;

  for (const result of data.query.search) {
    const title = result.title;
    if (!title) continue;
    // Skip obviously bad results
    if (BAD_PATTERNS.test(title)) continue;

    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|mime&format=json`;
    const info = await fetchJson(infoUrl);
    if (!info || !info.query || !info.query.pages) continue;

    const pages = Object.values(info.query.pages);
    for (const page of pages) {
      if (!page.imageinfo || !page.imageinfo[0]) continue;
      const ii = page.imageinfo[0];
      if (!ii.mime || !ii.mime.startsWith('image/')) continue;
      if (ii.size && ii.size < 5000) continue; // too small
      const imgUrl = ii.url;
      if (isGoodImageUrl(imgUrl)) {
        const ok = await checkUrl(imgUrl);
        if (ok) return imgUrl;
      }
    }
  }
  return null;
}

async function findINaturalistImage(scientificName) {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&per_page=1`;
  const data = await fetchJson(url);
  if (!data || !data.results || !data.results[0]) return null;
  const taxon = data.results[0];
  if (taxon.default_photo && taxon.default_photo.medium_url) {
    let imgUrl = taxon.default_photo.medium_url;
    // Get larger version
    imgUrl = imgUrl.replace('/medium.', '/original.').replace('/square.', '/original.');
    const ok = await checkUrl(imgUrl);
    if (ok) return imgUrl;
    // Try medium
    imgUrl = taxon.default_photo.medium_url;
    const ok2 = await checkUrl(imgUrl);
    if (ok2) return imgUrl;
  }
  return null;
}

async function findImage(scientificName) {
  // 1. Wikipedia (fastest, best quality usually)
  let url = await findWikipediaImage(scientificName);
  if (url) return { url, source: 'wikipedia' };

  // 2. iNaturalist
  url = await findINaturalistImage(scientificName);
  if (url) return { url, source: 'inaturalist' };

  // 3. Wikimedia Commons search
  url = await findWikimediaImage(scientificName);
  if (url) return { url, source: 'commons' };

  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let fixed = 0, failed = 0;
  const failures = [];

  for (let i = 0; i < needImages.length; i++) {
    const d = needImages[i];
    const sci = d.scientificName;
    process.stdout.write(`[${i + 1}/${needImages.length}] ${sci}... `);

    const result = await findImage(sci);
    if (result) {
      // Update JSON
      const filePath = path.join(dir, d._file);
      const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      json.images = [result.url];
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
      console.log(`✓ ${result.source}`);
      fixed++;
    } else {
      console.log('✗ no image found');
      failures.push(d);
      failed++;
    }
    // Rate limiting
    await sleep(300);
  }

  console.log(`\nFixed: ${fixed}, Failed: ${failed}`);

  // ─── STEP 3: REMOVE SPECIES WITH NO IMAGE ──────────────────────
  if (failures.length > 0) {
    console.log(`\n=== STEP 3: Removing ${failures.length} species without usable images ===`);
    failures.forEach(d => {
      const filePath = path.join(dir, d._file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`  Removed: ${d.scientificName}`);
      }
    });
  }

  const finalCount = fs.readdirSync(dir).filter(f => f.endsWith('.json')).length;
  console.log(`\n=== FINAL: ${finalCount} species remaining ===`);
  console.log(`Marine removed: ${removedMarine}`);
  console.log(`Images fixed: ${fixed}`);
  console.log(`Species removed (no image): ${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
