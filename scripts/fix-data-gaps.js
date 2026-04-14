/* fix-data-gaps.js — Fill remaining missing values in species JSON */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'content', 'fiches');

// ── Genus-level defaults for missing data ──────────────────
const GENUS_DEFAULTS = {
  // Gastromyzon — hillstream loaches
  'Gastromyzon': { tempMin: 20, tempMax: 25, phMin: 6.5, phMax: 7.5, ghMin: 2, ghMax: 12 },
  // Acanthocobitis — loaches
  'Acanthocobitis': { phMin: 6.5, phMax: 7.5, ghMin: 5, ghMax: 15 },
  // Crenicichla — pike cichlids
  'Crenicichla': { phMin: 6.0, phMax: 7.5, ghMin: 5, ghMax: 15 },

  // Marine defaults (most marine species: same water params)
  '_marine': { ghMin: 8, ghMax: 12 },

  // Freshwater defaults
  '_freshwater': { ghMin: 5, ghMax: 15 },
  '_brackish': { ghMin: 10, ghMax: 25 },
};

// ── Process all files ──────────────────────────────────────
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let fixedTemp = 0, fixedPh = 0, fixedGh = 0;

files.forEach(f => {
  const filePath = path.join(dir, f);
  const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const genus = (d.scientificName || '').split(' ')[0];
  const biotope = (d.biotope || '').toLowerCase();
  const isMarine = biotope.includes('mer');
  const isBrackish = biotope.includes('saumâtre');
  let changed = false;

  // Fix missing tempMax
  if (d.tempMin && (!d.tempMax || d.tempMax <= 0)) {
    const gd = GENUS_DEFAULTS[genus];
    if (gd && gd.tempMax) {
      d.tempMax = gd.tempMax;
    } else if (isMarine) {
      d.tempMax = 28;
    } else {
      d.tempMax = d.tempMin + 6; // reasonable range
    }
    fixedTemp++;
    changed = true;
  }

  // Fix missing phMax
  if (d.phMin && (!d.phMax || d.phMax <= 0)) {
    const gd = GENUS_DEFAULTS[genus];
    if (gd && gd.phMax) {
      d.phMax = gd.phMax;
    } else if (isMarine) {
      d.phMax = 8.4;
    } else {
      d.phMax = Math.min(d.phMin + 1.0, 8.5);
    }
    fixedPh++;
    changed = true;
  }

  // Fix missing GH
  if (d.ghMin == null || d.ghMax == null || d.ghMax <= 0) {
    const gd = GENUS_DEFAULTS[genus];
    if (gd && gd.ghMin != null) {
      d.ghMin = gd.ghMin;
      d.ghMax = gd.ghMax;
    } else if (isMarine) {
      d.ghMin = GENUS_DEFAULTS._marine.ghMin;
      d.ghMax = GENUS_DEFAULTS._marine.ghMax;
    } else if (isBrackish) {
      d.ghMin = GENUS_DEFAULTS._brackish.ghMin;
      d.ghMax = GENUS_DEFAULTS._brackish.ghMax;
    } else {
      d.ghMin = GENUS_DEFAULTS._freshwater.ghMin;
      d.ghMax = GENUS_DEFAULTS._freshwater.ghMax;
    }
    fixedGh++;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(d, null, 2), 'utf8');
  }
});

console.log(`Fixed: temp=${fixedTemp}, pH=${fixedPh}, GH=${fixedGh}`);
console.log(`Total fiches: ${files.length}`);

// ── Verify no gaps remain ──────────────────────────────────
let remaining = { vol: 0, temp: 0, ph: 0, gh: 0, img: 0 };
files.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!d.minVolumeL || d.minVolumeL <= 0) remaining.vol++;
  if (!d.tempMin || !d.tempMax || d.tempMin <= 0 || d.tempMax <= 0) remaining.temp++;
  if (!d.phMin || !d.phMax || d.phMin <= 0 || d.phMax <= 0) remaining.ph++;
  if (d.ghMin == null || d.ghMax == null || d.ghMax <= 0) remaining.gh++;
  if (!d.images || !d.images[0]) remaining.img++;
});
console.log('Remaining gaps:', JSON.stringify(remaining));
