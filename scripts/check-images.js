/* check-images.js — Verify all image URLs and detect non-photo content */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const dir = path.join(__dirname, '..', 'content', 'fiches');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const BAD_URL_PATTERNS = [
  /map/i, /carte/i, /range/i, /distribution/i, /drawing/i, /sketch/i,
  /illustration/i, /diagram/i, /dessin/i, /rangemap/i, /silhouette/i,
  /croquis/i, /holotype/i, /syntype/i, /lectotype/i, /paratype/i,
  /specimen/i, /museum/i, /herbarium/i, /taxobox/i, /icon/i,
  /logo/i, /flag/i, /coat_of_arms/i, /blason/i, /stamp/i,
  /_gray\./i, /_grey\./i, /black_and_white/i, /noir_et_blanc/i,
  /lithograph/i, /gravure/i, /engraving/i, /plate_/i,
  /Fauna_Japonica/i, /Naturgeschichte/i, /Historia_natural/i,
  /Bleeker/i, /Cuvier/i, /Hamilton.*Gangetic/i, /Lacepede/i, 
  /Pieter_Bleeker/i, /FMIB_/i, /Bilder_atlas/i,
];

// Common patterns for old scientific illustrations (pre-1950 engravings)
const OLD_ILLUSTRATION_PATTERNS = [
  /FMIB_\d+/i,          // Fisheries & Marine Invertebrates of Britain
  /Fische_/i,           // German ichthyology plates  
  /Bleeker_.*_plate/i,  // Bleeker's reference plates
  /Russell_.*plate/i,
  /Planche_/i,          // French scientific plates
  /Tab\._/i,            // Tabula (Latin plates)
  /Bild_/i,             // German illustration
];

async function checkUrl(url) {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { method: 'HEAD', timeout: 8000 }, res => {
      resolve({
        status: res.statusCode,
        type: res.headers['content-type'] || '',
        size: parseInt(res.headers['content-length'] || '0', 10),
      });
    });
    req.on('error', () => resolve({ status: 0, type: '', size: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, type: '', size: 0 }); });
    req.end();
  });
}

async function main() {
  const results = { broken: [], badPattern: [], tooSmall: [], nonImage: [] };
  let checked = 0;

  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const img = (d.images && d.images[0]) || '';
    if (!img) continue;

    // Check URL patterns first
    const isBadPattern = BAD_URL_PATTERNS.some(p => p.test(img)) || 
                         OLD_ILLUSTRATION_PATTERNS.some(p => p.test(img));
    if (isBadPattern) {
      results.badPattern.push({ name: d.scientificName, slug: d.slug, img, file: f });
    }

    // Check if URL is accessible
    if (img.startsWith('http')) {
      const r = await checkUrl(img);
      if (r.status >= 400 || r.status === 0) {
        results.broken.push({ name: d.scientificName, slug: d.slug, img, file: f, status: r.status });
      } else if (r.type && !r.type.startsWith('image/')) {
        results.nonImage.push({ name: d.scientificName, slug: d.slug, img, file: f, type: r.type });
      } else if (r.size > 0 && r.size < 2000) {
        results.tooSmall.push({ name: d.scientificName, slug: d.slug, img, file: f, size: r.size });
      }
    }

    checked++;
    if (checked % 100 === 0) {
      process.stdout.write(`[check] ${checked}/${files.length} | broken:${results.broken.length} bad:${results.badPattern.length} small:${results.tooSmall.length}\n`);
    }
  }

  console.log('\n=== RESULTS ===');
  console.log('Broken URLs:', results.broken.length);
  results.broken.forEach(r => console.log('  BROKEN [' + r.status + '] ' + r.name + ' | ' + r.img));
  console.log('Bad patterns (maps/drawings/B&W):', results.badPattern.length);
  results.badPattern.forEach(r => console.log('  BAD ' + r.name + ' | ' + r.img));
  console.log('Too small (<2KB):', results.tooSmall.length);
  results.tooSmall.forEach(r => console.log('  SMALL [' + r.size + 'B] ' + r.name + ' | ' + r.img));
  console.log('Non-image content type:', results.nonImage.length);
  results.nonImage.forEach(r => console.log('  TYPE [' + r.type + '] ' + r.name + ' | ' + r.img));

  // Save problematic files list for the fix script
  const allBad = [...results.broken, ...results.badPattern, ...results.tooSmall, ...results.nonImage];
  const unique = [...new Set(allBad.map(r => r.file))];
  fs.writeFileSync(path.join(__dirname, 'bad-images.json'), JSON.stringify(unique, null, 2), 'utf8');
  console.log('\nSaved', unique.length, 'files to bad-images.json');
}

main().catch(console.error);
