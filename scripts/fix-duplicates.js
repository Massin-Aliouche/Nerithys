/* Nerithys — fix-duplicates.js
   Step 1: Clear duplicate images. Only the FIRST species alphabetically
   keeps the image; the rest are cleared so they get re-fetched with correct ones.
*/
const fs = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');

const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
const imgMap = {};

// Build image -> species map
files.forEach(f => {
  const fPath = path.join(FICHES, f);
  const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
  const img = (data.images && data.images[0]) || '';
  if (!img) return;
  if (!imgMap[img]) imgMap[img] = [];
  imgMap[img].push({ file: f, path: fPath, sci: data.scientificName || f });
});

let cleared = 0;
Object.entries(imgMap).forEach(([img, species]) => {
  if (species.length <= 1) return;
  // Sort alphabetically, keep first, clear rest
  species.sort((a, b) => a.sci.localeCompare(b.sci));
  console.log(`Duplicate image shared by ${species.length} species:`);
  console.log(`  Keeping for: ${species[0].sci}`);
  for (let i = 1; i < species.length; i++) {
    const data = JSON.parse(fs.readFileSync(species[i].path, 'utf8'));
    data.images = [];
    fs.writeFileSync(species[i].path, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  Cleared from: ${species[i].sci}`);
    cleared++;
  }
});

console.log(`\nCleared ${cleared} duplicate images.`);
