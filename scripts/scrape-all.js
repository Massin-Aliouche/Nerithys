/**
 * Mass scraper for ALL species from b-aqua.com
 * Extracts data from individual fiche pages in parallel batches.
 * Usage: node scripts/scrape-all.js
 */
const fs = require('fs');
const path = require('path');

const CONCURRENCY = 15;   // parallel requests
const DELAY_MS    = 150;  // delay between batches
const OUT_DIR     = path.join(__dirname, '..', 'content', 'fiches');

/* ── Helpers ─────────────────────────────────────── */
function cleanHtml(str) {
  if (!str) return null;
  return str
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function extractLabel(html, labelId) {
  const re = new RegExp(`id="ContentPlaceHolder1_${labelId}"[^>]*>([\\s\\S]*?)</span>`, 'i');
  const m = html.match(re);
  return m ? cleanHtml(m[1]) : null;
}

function extractNumbers(text) {
  if (!text) return [];
  return (text.match(/[\d]+[.,]?[\d]*/g) || []).map(n => parseFloat(n.replace(',', '.')));
}

function extractParamRange(html, divId) {
  const re = new RegExp(`id="ContentPlaceHolder1_${divId}"[\\s\\S]*?<div[^>]*class="col-sm-9[^"]*"[^>]*>([\\s\\S]*?)</div>`, 'i');
  const m = html.match(re);
  if (!m) return [null, null];
  const text = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  const nums = extractNumbers(text);
  if (nums.length >= 4) return [nums[0], nums[3]];
  if (nums.length >= 2) return [nums[0], nums[nums.length - 1]];
  if (nums.length === 1) return [nums[0], nums[0]];
  return [null, null];
}

function extractSize(html) {
  const sizePattern = /:&nbsp;([\d,.\s]+(?:à\s*[\d,.]+\s*)?)cm\s*SL/gi;
  const allSizes = [];
  let m;
  while ((m = sizePattern.exec(html)) !== null) {
    allSizes.push(...extractNumbers(m[1]));
  }
  if (allSizes.length > 0) return Math.max(...allSizes);
  // Fallback
  const tailleIdx = html.indexOf('Taille');
  if (tailleIdx > 0) {
    const block = html.substring(tailleIdx, tailleIdx + 600);
    const cmMatch = block.match(/([\d]+[.,]?[\d]*)\s*(?:à\s*([\d]+[.,]?[\d]*)\s*)?cm/i);
    if (cmMatch) {
      const vals = [parseFloat(cmMatch[1].replace(',', '.'))];
      if (cmMatch[2]) vals.push(parseFloat(cmMatch[2].replace(',', '.')));
      return Math.max(...vals);
    }
  }
  return null;
}

function extractVolume(html) {
  const label = extractLabel(html, 'Label_MAINT_MINSIZE');
  if (!label) return null;
  const nums = extractNumbers(label);
  return nums.length > 0 ? nums[0] : null;
}

function extractImage(html) {
  const m = html.match(/id="ContentPlaceHolder1_Image_MAIN"[^>]*src="([^"]+)"/i);
  if (!m) return null;
  let url = m[1];
  if (url.startsWith('../')) url = 'https://www.b-aqua.com/' + url.substring(3);
  else if (url.startsWith('/')) url = 'https://www.b-aqua.com' + url;
  else if (!url.startsWith('http')) url = 'https://www.b-aqua.com/' + url;
  return url;
}

function extractMilieu(html) {
  const wt = extractLabel(html, 'Label_WATER_TYPE');
  if (wt) {
    if (/mer|marin/i.test(wt)) return 'Eau de mer';
    if (/saumâtre/i.test(wt)) return 'Eau saumâtre';
    return 'Eau douce';
  }
  return 'Eau douce';
}

function makeSlug(sci) {
  return sci.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function guessDifficulty(maint, repro) {
  const text = ((maint || '') + ' ' + (repro || '')).toLowerCase();
  if (/très difficile|expert|impossible/.test(text)) return 4;
  if (/difficile|délicat/.test(text)) return 3;
  if (/moyen|possible|assez/.test(text)) return 2;
  return 1;
}

function truncate(s, max) {
  if (!s) return null;
  return s.length > max ? s.substring(0, max - 3) + '...' : s;
}

function guessTagsFromData(data) {
  const tags = [];
  if (/mer|marin/i.test(data.biotope)) tags.push('marin');
  if (/saumâtre/i.test(data.biotope)) tags.push('saumâtre');
  if (/douce/i.test(data.biotope)) tags.push('eau-douce');
  
  const diet = (data.diet || '').toLowerCase();
  if (/carni/i.test(diet)) tags.push('carnivore');
  else if (/herbi/i.test(diet)) tags.push('herbivore');
  else if (/omni/i.test(diet)) tags.push('omnivore');
  
  if (data.minLengthCm && data.minLengthCm <= 4) tags.push('nano');
  if (data.minLengthCm && data.minLengthCm >= 20) tags.push('grand');
  if (data.difficulty <= 1) tags.push('facile');
  if (data.difficulty >= 3) tags.push('exigeant');
  
  const repro = (data.breeding || '').toLowerCase();
  if (/vivipare|ovovivipare/.test(repro)) tags.push('vivipare');
  
  return tags.slice(0, 5);
}

/* ── Scrape one species ─────────────────────────── */
async function scrapeOne(id, expectedSci) {
  try {
    const res = await fetch(`https://www.b-aqua.com/pages/fiche.aspx?id=${id}`, {
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Check if it's a draft with absolutely no data
    const hasMaint = html.includes('div_TEMP_MAINT') || html.includes('div_PH_MAINT');
    const hasSize = html.includes('cm SL') || html.includes('cm TL');

    const sciName = extractLabel(html, 'Label_NAME') || expectedSci;
    let commonName = extractLabel(html, 'Label_FIRST_NAME_COMMON');
    if (commonName && commonName.length > 50) commonName = commonName.split(',')[0].trim();
    
    const [tempMin, tempMax] = extractParamRange(html, 'div_TEMP_MAINT');
    const [phMin, phMax] = extractParamRange(html, 'div_PH_MAINT');
    const [ghMin, ghMax] = extractParamRange(html, 'div_GH_MAINT');
    const volume = extractVolume(html);
    const size = extractSize(html);
    const biotope = extractMilieu(html);
    const diet = extractLabel(html, 'Label_ALIM_TYPE') || 'Non renseigné';
    const reproType = extractLabel(html, 'Label_REPRO_TYPE_LAB');
    const reproDiff = extractLabel(html, 'Label_REPRO_POSS_LAB');
    const zone = extractLabel(html, 'Label_LIFE_ZONE');
    const population = extractLabel(html, 'Label_MAINT_MINNB');
    const ratio = extractLabel(html, 'Label_MAINT_RATIO');
    const maintDesc = extractLabel(html, 'Label_MAINT_DESC');
    const image = extractImage(html);
    const lifetime = extractLabel(html, 'Label_LIFETIME');

    const slug = makeSlug(expectedSci);
    const name = commonName || sciName;

    // Build behavior
    let behavParts = [];
    if (population) behavParts.push(`Population: ${population}`);
    if (zone) behavParts.push(`Zone: ${zone}`);
    if (ratio) behavParts.push(`Ratio M/F: ${ratio}`);
    const behavior = behavParts.join('. ') || 'Non renseigné';

    const compatibility = zone ? `Zone ${zone.toLowerCase()}.` : 'Non renseigné';
    const breeding = [reproType, reproDiff ? `difficulté: ${reproDiff}` : null].filter(Boolean).join(', ') || null;
    const notes = truncate(maintDesc, 400);
    const difficulty = guessDifficulty(maintDesc, reproDiff);

    const fiche = {
      name, scientificName: expectedSci, slug, biotope, difficulty,
      tempMin, tempMax, phMin, phMax, ghMin, ghMax,
      khMin: null, khMax: null,
      minVolumeL: volume, minLengthCm: size,
      behavior, compatibility, diet, breeding, notes,
      images: image ? [image] : [], gallery: [], tags: []
    };
    fiche.tags = guessTagsFromData(fiche);

    return fiche;
  } catch (e) {
    return null;
  }
}

/* ── Main ────────────────────────────────────────── */
async function main() {
  // Load species IDs
  const idsFile = path.join(__dirname, '..', 'all_species_ids.json');
  if (!fs.existsSync(idsFile)) {
    console.log('ERROR: all_species_ids.json not found. Run ID collection first.');
    process.exit(1);
  }
  const allSpecies = JSON.parse(fs.readFileSync(idsFile, 'utf8'));
  console.log(`Loaded ${allSpecies.length} species IDs`);

  // Check existing
  const existing = new Set(fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')));
  const toScrape = allSpecies.filter(s => !existing.has(makeSlug(s.sci)));
  console.log(`Existing: ${existing.size}, To scrape: ${toScrape.length}`);

  let success = 0, failed = 0, skipped = 0;
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    const batch = toScrape.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(s => scrapeOne(s.id, s.sci)));

    for (let j = 0; j < results.length; j++) {
      const fiche = results[j];
      if (fiche) {
        // Skip fiches with absolutely no useful data
        if (!fiche.tempMin && !fiche.phMin && !fiche.minVolumeL && !fiche.minLengthCm && !fiche.images.length) {
          skipped++;
          continue;
        }
        const filePath = path.join(OUT_DIR, `${fiche.slug}.json`);
        fs.writeFileSync(filePath, JSON.stringify(fiche, null, 2), 'utf8');
        success++;
      } else {
        failed++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const pct = (((i + batch.length) / toScrape.length) * 100).toFixed(1);
    if ((i / CONCURRENCY) % 10 === 0 || i + CONCURRENCY >= toScrape.length) {
      console.log(`[${pct}%] ${i + batch.length}/${toScrape.length} | ✅ ${success} | ❌ ${failed} | ⏭️ ${skipped} | ${elapsed}s`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== DONE in ${totalTime}s ===`);
  console.log(`Created: ${success} | Failed: ${failed} | Skipped (no data): ${skipped}`);
  console.log(`Total fiches: ${existing.size + success}`);
}

main().catch(console.error);
