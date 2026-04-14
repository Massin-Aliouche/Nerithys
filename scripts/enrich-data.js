/* Nerithys — enrich-data.js
   Enrich species data from SeriouslyFish.com:
   - Temperature, pH, GH, size, volume
   - Diet, behavior, breeding notes  
   Only updates fields that are missing or "Non renseigné"
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');
const CONCURRENCY = 4;
const DELAY = 500;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isEmpty(v) {
  if (!v) return true;
  const s = String(v).trim();
  return !s || s === 'Non renseigné' || s === 'null';
}

/* Convert Fahrenheit to Celsius */
function f2c(f) { return Math.round((f - 32) * 5 / 9 * 10) / 10; }

/* Parse range like "22 - 28" or "72 - 82" */
function parseRange(text) {
  const m = text.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (!m) {
    const single = text.match(/([\d.]+)/);
    if (single) return { min: parseFloat(single[1]), max: parseFloat(single[1]) };
    return null;
  }
  return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
}

async function fetchSeriouslyFish(sciName) {
  const slug = sciName.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.seriouslyfish.com/species/${slug}/`;
  
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow'
    });
    if (!res.ok) return null;
    const html = await res.text();
    
    const info = {};
    
    // Temperature
    const tempMatch = html.match(/Temperature[:\s]*(?:<[^>]*>)*\s*([\d.]+)\s*[-–]\s*([\d.]+)\s*°?\s*([CF])/i);
    if (tempMatch) {
      let min = parseFloat(tempMatch[1]);
      let max = parseFloat(tempMatch[2]);
      if (tempMatch[3].toUpperCase() === 'F') {
        min = f2c(min);
        max = f2c(max);
      }
      if (min > 0 && min < 40 && max > 0 && max < 45) {
        info.tempMin = min;
        info.tempMax = max;
      }
    }
    
    // pH
    const phMatch = html.match(/pH[:\s]*(?:<[^>]*>)*\s*([\d.]+)\s*[-–]\s*([\d.]+)/i);
    if (phMatch) {
      const phMin = parseFloat(phMatch[1]);
      const phMax = parseFloat(phMatch[2]);
      if (phMin >= 3 && phMin <= 10 && phMax >= 3 && phMax <= 10) {
        info.phMin = phMin;
        info.phMax = phMax;
      }
    }
    
    // Hardness
    const hardMatch = html.match(/Hardness[:\s]*(?:<[^>]*>)*\s*([\d.]+)\s*[-–]\s*([\d.]+)/i);
    if (hardMatch) {
      const ghMin = parseFloat(hardMatch[1]);
      const ghMax = parseFloat(hardMatch[2]);
      if (ghMin >= 0 && ghMax <= 50) {
        info.ghMin = ghMin;
        info.ghMax = ghMax;
      }
    }
    
    // Max Standard Length  
    const sizeMatch = html.match(/(?:Maximum Standard Length|Max(?:imum)?\s+S(?:tandard\s+)?L(?:ength)?)[:\s]*(?:<[^>]*>)*\s*([\d.]+)\s*(?:mm|cm)/i);
    if (sizeMatch) {
      let size = parseFloat(sizeMatch[1]);
      if (html.match(/mm/i) && size > 10) size = Math.round(size / 10 * 10) / 10;
      if (size > 0 && size < 500) info.minLengthCm = size;
    }
    
    // Tank size / Aquarium 
    const tankMatch = html.match(/(?:Aquarium.*?Dimensions|Minimum.*?[Tt]ank)[:\s]*(?:<[^>]*>)*\s*(\d+)\s*(?:x|×)/i);
    if (tankMatch) {
      const length = parseInt(tankMatch[1]);
      // Approximate volume from length (L x W x H ≈ L * 0.3 * 0.3 * 1000 liters)
      if (length >= 30 && length <= 500) {
        info.minVolumeL = Math.round(length * 0.35 * 0.35 * 1000 / 10) * 10;
      }
    }
    
    // Diet section
    const dietMatch = html.match(/Diet[^<]*<\/h[23]>\s*(?:<[^>]*>)*\s*([\s\S]*?)(?:<\/div>|<h[23])/i);
    if (dietMatch) {
      let dietText = dietMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (dietText.length > 20 && dietText.length < 1000) {
        info.diet = dietText.slice(0, 500);
      }
    }
    
    // Behaviour section
    const behavMatch = html.match(/Behavi(?:ou)?r[^<]*<\/h[23]>\s*(?:<[^>]*>)*\s*([\s\S]*?)(?:<\/div>|<h[23])/i);
    if (behavMatch) {
      let behavText = behavMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (behavText.length > 20 && behavText.length < 1500) {
        info.behavior = behavText.slice(0, 800);
      }
    }
    
    // Reproduction section
    const breedMatch = html.match(/(?:Reproduction|Breeding)[^<]*<\/h[23]>\s*(?:<[^>]*>)*\s*([\s\S]*?)(?:<\/div>|<h[23])/i);
    if (breedMatch) {
      let breedText = breedMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (breedText.length > 20 && breedText.length < 1500) {
        info.breeding = breedText.slice(0, 800);
      }
    }

    return Object.keys(info).length > 0 ? info : null;
  } catch (e) { return null; }
}

async function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  
  // Find species that need enrichment (at least one empty field)
  const toEnrich = [];
  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    
    const needsUpdate = 
      isEmpty(data.behavior) || isEmpty(data.diet) || 
      isEmpty(data.breeding) || isEmpty(data.notes) ||
      data.tempMin == null || data.tempMax == null ||
      data.phMin == null || data.phMax == null ||
      !data.minLengthCm || !data.minVolumeL;
    
    if (needsUpdate) {
      toEnrich.push({ file: f, path: fPath, data });
    }
  }

  console.log(`[enrich] ${toEnrich.length} species need data enrichment`);
  
  let enriched = 0, notFound = 0, processed = 0;
  let fieldsUpdated = { tempMin: 0, tempMax: 0, phMin: 0, phMax: 0, ghMin: 0, ghMax: 0, 
                         minLengthCm: 0, minVolumeL: 0, diet: 0, behavior: 0, breeding: 0 };

  for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
    const batch = toEnrich.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (item) => {
      const sciName = item.data.scientificName || '';
      if (!sciName) return { item, info: null };
      const info = await fetchSeriouslyFish(sciName);
      return { item, info };
    }));

    for (const { item, info } of results) {
      processed++;
      if (!info) { notFound++; continue; }

      let updated = false;
      const d = item.data;

      // Update only empty/missing fields
      if (info.tempMin != null && (d.tempMin == null || d.tempMin === 0)) {
        d.tempMin = info.tempMin; fieldsUpdated.tempMin++; updated = true;
      }
      if (info.tempMax != null && (d.tempMax == null || d.tempMax === 0)) {
        d.tempMax = info.tempMax; fieldsUpdated.tempMax++; updated = true;
      }
      if (info.phMin != null && (d.phMin == null || d.phMin === 0)) {
        d.phMin = info.phMin; fieldsUpdated.phMin++; updated = true;
      }
      if (info.phMax != null && (d.phMax == null || d.phMax === 0)) {
        d.phMax = info.phMax; fieldsUpdated.phMax++; updated = true;
      }
      if (info.ghMin != null && (d.ghMin == null || d.ghMin === 0)) {
        d.ghMin = info.ghMin; fieldsUpdated.ghMin++; updated = true;
      }
      if (info.ghMax != null && (d.ghMax == null || d.ghMax === 0)) {
        d.ghMax = info.ghMax; fieldsUpdated.ghMax++; updated = true;
      }
      if (info.minLengthCm && !d.minLengthCm) {
        d.minLengthCm = info.minLengthCm; fieldsUpdated.minLengthCm++; updated = true;
      }
      if (info.minVolumeL && !d.minVolumeL) {
        d.minVolumeL = info.minVolumeL; fieldsUpdated.minVolumeL++; updated = true;
      }
      if (info.diet && isEmpty(d.diet)) {
        d.diet = info.diet; fieldsUpdated.diet++; updated = true;
      }
      if (info.behavior && isEmpty(d.behavior)) {
        d.behavior = info.behavior; fieldsUpdated.behavior++; updated = true;
      }
      if (info.breeding && isEmpty(d.breeding)) {
        d.breeding = info.breeding; fieldsUpdated.breeding++; updated = true;
      }

      if (updated) {
        fs.writeFileSync(item.path, JSON.stringify(d, null, 2), 'utf8');
        enriched++;
      }
    }

    if (i % 20 === 0 || processed >= toEnrich.length) {
      console.log(`[enrich] ${processed}/${toEnrich.length} | Enriched: ${enriched} | Not on SF: ${notFound}`);
    }

    if (i + CONCURRENCY < toEnrich.length) await sleep(DELAY);
  }

  console.log(`\n[enrich] Done!`);
  console.log(`  Species enriched: ${enriched}`);
  console.log(`  Not found on SF: ${notFound}`);
  console.log(`  Fields updated:`);
  Object.entries(fieldsUpdated).forEach(([k, v]) => { if (v > 0) console.log(`    ${k}: ${v}`); });
}

main().catch(console.error);
