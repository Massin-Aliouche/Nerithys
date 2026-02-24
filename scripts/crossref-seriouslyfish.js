/**
 * Cross-reference fiches with seriouslyfish.com and correct data.
 * Usage: node scripts/crossref-seriouslyfish.js
 */
const fs = require('fs');
const path = require('path');

const CONCURRENCY = 5;
const DELAY_MS = 400;
const FICHES_DIR = path.join(__dirname, '..', 'content', 'fiches');

function extractWaterConditions(text) {
  const result = { tempMin: null, tempMax: null, phMin: null, phMax: null, ghMin: null, ghMax: null };
  
  // Temperature: "75 to 82°F (24 to 28°C)" or "24 to 28°C" or "24-28°C"
  const tempCelsius = text.match(/(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*°?\s*C(?:\s*\))?/i);
  if (tempCelsius) {
    result.tempMin = parseFloat(tempCelsius[1]);
    result.tempMax = parseFloat(tempCelsius[2]);
  } else {
    // Try Fahrenheit conversion
    const tempF = text.match(/(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*°?\s*F/i);
    if (tempF) {
      result.tempMin = Math.round(((parseFloat(tempF[1]) - 32) * 5 / 9) * 10) / 10;
      result.tempMax = Math.round(((parseFloat(tempF[2]) - 32) * 5 / 9) * 10) / 10;
    }
  }
  
  // pH: "6.0 to 7.6" or "6.0-7.6"
  const phMatch = text.match(/pH[:\s]*(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)/i);
  if (phMatch) {
    result.phMin = parseFloat(phMatch[1]);
    result.phMax = parseFloat(phMatch[2]);
  }
  
  // Hardness: "1 to 15°H" or "1-15 dGH" etc.
  const ghMatch = text.match(/(?:Hardness|GH|dGH|dH)[:\s]*(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)/i);
  if (ghMatch) {
    result.ghMin = parseFloat(ghMatch[1]);
    result.ghMax = parseFloat(ghMatch[2]);
  }
  
  return result;
}

function extractSize(text) {
  // "2.6″ (6.5cm)" or "6.5 cm" or "6.5cm"
  const cmMatch = text.match(/(\d+(?:\.\d+)?)\s*cm\)?/i);
  if (cmMatch) return parseFloat(cmMatch[1]);
  // Inches to cm: "2.6″" or "2.6 inches"  
  const inchMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:″|inches?|")/i);
  if (inchMatch) return Math.round(parseFloat(inchMatch[1]) * 2.54 * 10) / 10;
  return null;
}

function extractTankSize(text) {
  // "42.5 litres" or "100 litre"
  const litreMatch = text.match(/(\d+(?:\.\d+)?)\s*lit/i);
  if (litreMatch) return Math.round(parseFloat(litreMatch[1]));
  // Gallons to litres
  const galMatch = text.match(/(\d+(?:\.\d+)?)\s*gal/i);
  if (galMatch) return Math.round(parseFloat(galMatch[1]) * 3.785);
  return null;
}

async function checkSpecies(slug, sci) {
  const sfSlug = sci.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.seriouslyfish.com/species/${sfSlug}/`;
  
  try {
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return null;
    const html = await res.text();
    
    // Extract Water Conditions section
    const waterIdx = html.indexOf('Water Conditions');
    if (waterIdx < 0) return null;
    const waterBlock = html.substring(waterIdx, waterIdx + 500);
    const conditions = extractWaterConditions(waterBlock);
    
    // Extract Maximum Standard Length
    const sizeIdx = html.indexOf('Maximum Standard Length');
    let size = null;
    if (sizeIdx > 0) {
      const sizeBlock = html.substring(sizeIdx, sizeIdx + 200);
      size = extractSize(sizeBlock);
    }
    
    // Extract Aquarium Size
    const tankIdx = html.indexOf('Aquarium Size');
    let tankSize = null;
    if (tankIdx > 0) {
      const tankBlock = html.substring(tankIdx, tankIdx + 300);
      tankSize = extractTankSize(tankBlock);
    }

    // Extract Diet type
    const dietIdx = html.indexOf('<h2');
    let dietType = null;
    const dietHeadIdx = html.indexOf('Diet');
    if (dietHeadIdx > 0) {
      const dietBlock = html.substring(dietHeadIdx, dietHeadIdx + 300);
      if (/omnivorous|omnivore/i.test(dietBlock)) dietType = 'Omnivore';
      else if (/carnivorous|carnivore|predator/i.test(dietBlock)) dietType = 'Carnivore';
      else if (/herbivorous|herbivore|aufwuchs|algae/i.test(dietBlock)) dietType = 'Herbivore';
    }
    
    return { ...conditions, size, tankSize, dietType };
  } catch (e) {
    return null;
  }
}

async function main() {
  const files = fs.readdirSync(FICHES_DIR).filter(f => f.endsWith('.json'));
  console.log(`Checking ${files.length} fiches against seriouslyfish.com...`);
  
  const fichesData = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(FICHES_DIR, f), 'utf8'));
    return { file: f, data };
  });
  
  let checked = 0, found = 0, corrected = 0;
  const corrections = [];
  
  for (let i = 0; i < fichesData.length; i += CONCURRENCY) {
    const batch = fichesData.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(({ data }) => 
      checkSpecies(data.slug, data.scientificName)
    ));
    
    for (let j = 0; j < results.length; j++) {
      const sf = results[j];
      const { file, data } = batch[j];
      checked++;
      
      if (!sf) continue;
      found++;
      
      let changes = [];
      
      // Correct temperature
      if (sf.tempMin != null && sf.tempMax != null) {
        if (data.tempMin != null && (data.tempMin < sf.tempMin - 3 || data.tempMin > sf.tempMin + 3)) {
          changes.push(`tempMin: ${data.tempMin} → ${sf.tempMin}`);
          data.tempMin = sf.tempMin;
        }
        if (data.tempMax != null && (data.tempMax < sf.tempMax - 3 || data.tempMax > sf.tempMax + 3)) {
          changes.push(`tempMax: ${data.tempMax} → ${sf.tempMax}`);
          data.tempMax = sf.tempMax;
        }
        if (data.tempMin == null) { data.tempMin = sf.tempMin; changes.push(`tempMin: null → ${sf.tempMin}`); }
        if (data.tempMax == null) { data.tempMax = sf.tempMax; changes.push(`tempMax: null → ${sf.tempMax}`); }
      }
      
      // Correct pH
      if (sf.phMin != null && sf.phMax != null) {
        if (data.phMin != null && (data.phMin < sf.phMin - 1.5 || data.phMin > sf.phMin + 1.5)) {
          changes.push(`phMin: ${data.phMin} → ${sf.phMin}`);
          data.phMin = sf.phMin;
        }
        if (data.phMax != null && (data.phMax < sf.phMax - 1.5 || data.phMax > sf.phMax + 1.5)) {
          changes.push(`phMax: ${data.phMax} → ${sf.phMax}`);
          data.phMax = sf.phMax;
        }
        if (data.phMin == null) { data.phMin = sf.phMin; changes.push(`phMin: null → ${sf.phMin}`); }
        if (data.phMax == null) { data.phMax = sf.phMax; changes.push(`phMax: null → ${sf.phMax}`); }
      }
      
      // Correct GH
      if (sf.ghMin != null && sf.ghMax != null) {
        if (data.ghMin == null) { data.ghMin = sf.ghMin; changes.push(`ghMin: null → ${sf.ghMin}`); }
        if (data.ghMax == null) { data.ghMax = sf.ghMax; changes.push(`ghMax: null → ${sf.ghMax}`); }
      }
      
      // Correct size
      if (sf.size != null && sf.size > 0) {
        if (data.minLengthCm == null || Math.abs(data.minLengthCm - sf.size) > sf.size * 0.5) {
          changes.push(`size: ${data.minLengthCm} → ${sf.size}`);
          data.minLengthCm = sf.size;
        }
      }
      
      // Correct tank size
      if (sf.tankSize != null && sf.tankSize > 0) {
        if (data.minVolumeL == null) {
          changes.push(`volume: null → ${sf.tankSize}`);
          data.minVolumeL = sf.tankSize;
        }
      }
      
      // Correct diet  
      if (sf.dietType && data.diet === 'Non renseigné') {
        changes.push(`diet: Non renseigné → ${sf.dietType}`);
        data.diet = sf.dietType;
      }
      
      if (changes.length > 0) {
        // Remove sources field completely
        delete data.sources;
        fs.writeFileSync(path.join(FICHES_DIR, file), JSON.stringify(data, null, 2), 'utf8');
        corrected++;
        corrections.push({ species: data.scientificName, changes });
      }
    }
    
    if ((i / CONCURRENCY) % 20 === 0 || i + CONCURRENCY >= fichesData.length) {
      const pct = (checked / fichesData.length * 100).toFixed(1);
      console.log(`[${pct}%] Checked: ${checked} | Found: ${found} | Corrected: ${corrected}`);
    }
    
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  
  console.log(`\n=== DONE ===`);
  console.log(`Total checked: ${checked}`);
  console.log(`Found on SF: ${found}`);
  console.log(`Corrected: ${corrected}`);
  
  if (corrections.length > 0) {
    console.log(`\nCorrections made:`);
    corrections.forEach(c => {
      console.log(`  ${c.species}: ${c.changes.join(', ')}`);
    });
  }
}

main().catch(console.error);
