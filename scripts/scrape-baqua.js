/**
 * Scrape species data from b-aqua.com and generate JSON fiche files.
 * Usage: node scripts/scrape-baqua.js
 */
const fs = require('fs');
const path = require('path');

const SPECIES = [
  { id: 349, sci: 'Ancistrus cirrhosus' },
  { id: 350, sci: 'Ancistrus dolichopterus' },
  { id: 422, sci: 'Apistogramma cacatuoides' },
  { id: 1209, sci: 'Corydoras aeneus' },
  { id: 1307, sci: 'Corydoras paleatus' },
  { id: 1342, sci: 'Corydoras sterbai' },
  { id: 1308, sci: 'Corydoras panda' },
  { id: 1318, sci: 'Corydoras pygmaeus' },
  { id: 823, sci: 'Carassius auratus' },
  { id: 1088, sci: 'Chromobotia macracanthus' },
  { id: 1401, sci: 'Crossocheilus oblongus' },
  { id: 8570, sci: 'Crossocheilus langei' },
  { id: 1475, sci: 'Danio rerio' },
  { id: 1754, sci: 'Gyrinocheilus aymonieri' },
  { id: 1982, sci: 'Hyphessobrycon herbertaxelrodi' },
  { id: 1976, sci: 'Hyphessobrycon erythrostigma' },
  { id: 1962, sci: 'Hyphessobrycon amandae' },
  { id: 1886, sci: 'Hemigrammus bleheri' },
  { id: 1893, sci: 'Hemigrammus rhodostomus' },
  { id: 2290, sci: 'Mikrogeophagus ramirezi' },
  { id: 2238, sci: 'Melanotaenia boesemani' },
  { id: 2346, sci: 'Nannacara anomala' },
  { id: 2392, sci: 'Nematobrycon palmeri' },
  { id: 2184, sci: 'Otocinclus affinis' },
  { id: 2528, sci: 'Otocinclus vittatus' },
  { id: 2736, sci: 'Poecilia reticulata' },
  { id: 2559, sci: 'Pangio kuhlii' },
  { id: 2791, sci: 'Pristella maxillaris' },
  { id: 3354, sci: 'Trigonostigma heteromorpha' },
  { id: 3352, sci: 'Trigonostigma espei' },
  { id: 3210, sci: 'Symphysodon aequifasciatus' },
  { id: 3211, sci: 'Symphysodon discus' },
  { id: 3133, sci: 'Sewellia lineolata' },
  { id: 3339, sci: 'Trichogaster lalius' },
  { id: 3344, sci: 'Trichopodus leerii' },
  { id: 3345, sci: 'Trichopodus trichopterus' },
  { id: 3261, sci: 'Tanichthys albonubes' },
  { id: 3427, sci: 'Xiphophorus hellerii' },
  { id: 717, sci: 'Betta splendens' },
];

// Common names lookup (fallback if scraping fails)
const COMMON_NAMES = {
  'Ancistrus cirrhosus': 'Ancistrus',
  'Ancistrus dolichopterus': 'Ancistrus étoilé',
  'Apistogramma cacatuoides': 'Apistogramma cacatoès',
  'Corydoras aeneus': 'Corydoras bronze',
  'Corydoras paleatus': 'Corydoras poivré',
  'Corydoras sterbai': 'Corydoras de Sterba',
  'Corydoras panda': 'Corydoras panda',
  'Corydoras pygmaeus': 'Corydoras pygmée',
  'Carassius auratus': 'Poisson rouge',
  'Chromobotia macracanthus': 'Loche clown',
  'Crossocheilus oblongus': 'Mangeur d\'algues siamois',
  'Crossocheilus langei': 'Barbeau de Langei',
  'Danio rerio': 'Danio zébré',
  'Gyrinocheilus aymonieri': 'Mangeur d\'algues chinois',
  'Hyphessobrycon herbertaxelrodi': 'Néon noir',
  'Hyphessobrycon erythrostigma': 'Tétra cœur saignant',
  'Hyphessobrycon amandae': 'Tétra amande',
  'Hemigrammus bleheri': 'Nez-rouge',
  'Hemigrammus rhodostomus': 'Rummy-nose',
  'Mikrogeophagus ramirezi': 'Ramirezi',
  'Melanotaenia boesemani': 'Arc-en-ciel de Boeseman',
  'Nannacara anomala': 'Nannacara',
  'Nematobrycon palmeri': 'Tétra empereur',
  'Otocinclus affinis': 'Otocinclus',
  'Otocinclus vittatus': 'Otocinclus vitté',
  'Poecilia reticulata': 'Guppy',
  'Pangio kuhlii': 'Loche Kuhli',
  'Pristella maxillaris': 'Pristella',
  'Trigonostigma heteromorpha': 'Rasbora arlequin',
  'Trigonostigma espei': 'Rasbora d\'Espei',
  'Symphysodon aequifasciatus': 'Discus',
  'Symphysodon discus': 'Discus de Heckel',
  'Sewellia lineolata': 'Loche à selle',
  'Trichogaster lalius': 'Gourami nain',
  'Trichopodus leerii': 'Gourami perlé',
  'Trichopodus trichopterus': 'Gourami bleu',
  'Tanichthys albonubes': 'Néon du pauvre',
  'Xiphophorus hellerii': 'Xipho',
  'Betta splendens': 'Combattant',
};

// Difficulty mapping based on reproduction + maintenance complexity
const DIFFICULTY_MAP = {
  'Courante': 1,
  'Facile': 1,
  'Possible': 2,
  'Assez difficile': 3,
  'Difficile': 3,
  'Délicate': 3,
  'Rare': 4,
  'Très difficile': 4,
  'Impossible': 4,
};

// Tags based on species characteristics
const TAGS_MAP = {
  'Ancistrus cirrhosus': ['mangeur-algues', 'nettoyeur', 'facile'],
  'Ancistrus dolichopterus': ['mangeur-algues', 'nettoyeur', 'nocturne'],
  'Apistogramma cacatuoides': ['cichlidé-nain', 'coloré', 'territorial'],
  'Corydoras aeneus': ['fond', 'banc', 'facile'],
  'Corydoras paleatus': ['fond', 'banc', 'facile'],
  'Corydoras sterbai': ['fond', 'banc', 'coloré'],
  'Corydoras panda': ['fond', 'banc', 'populaire'],
  'Corydoras pygmaeus': ['nano', 'banc', 'petit'],
  'Carassius auratus': ['eau-froide', 'classique', 'bassin'],
  'Chromobotia macracanthus': ['fond', 'gregaire', 'grand'],
  'Crossocheilus oblongus': ['mangeur-algues', 'nettoyeur', 'actif'],
  'Crossocheilus langei': ['mangeur-algues', 'nettoyeur', 'actif'],
  'Danio rerio': ['banc', 'actif', 'facile'],
  'Gyrinocheilus aymonieri': ['mangeur-algues', 'nettoyeur', 'territorial'],
  'Hyphessobrycon herbertaxelrodi': ['tetra', 'banc', 'classique'],
  'Hyphessobrycon erythrostigma': ['tetra', 'banc', 'coloré'],
  'Hyphessobrycon amandae': ['tetra', 'nano', 'banc'],
  'Hemigrammus bleheri': ['tetra', 'banc', 'coloré'],
  'Hemigrammus rhodostomus': ['tetra', 'banc', 'indicateur'],
  'Mikrogeophagus ramirezi': ['cichlidé-nain', 'coloré', 'populaire'],
  'Melanotaenia boesemani': ['arc-en-ciel', 'banc', 'coloré'],
  'Nannacara anomala': ['cichlidé-nain', 'facile', 'calme'],
  'Nematobrycon palmeri': ['tetra', 'banc', 'élégant'],
  'Otocinclus affinis': ['mangeur-algues', 'nettoyeur', 'petit'],
  'Otocinclus vittatus': ['mangeur-algues', 'nettoyeur', 'petit'],
  'Poecilia reticulata': ['vivipare', 'facile', 'classique'],
  'Pangio kuhlii': ['fond', 'nocturne', 'fouisseur'],
  'Pristella maxillaris': ['tetra', 'banc', 'robuste'],
  'Trigonostigma heteromorpha': ['rasbora', 'banc', 'classique'],
  'Trigonostigma espei': ['rasbora', 'banc', 'coloré'],
  'Symphysodon aequifasciatus': ['cichlidé', 'majestueux', 'exigeant'],
  'Symphysodon discus': ['cichlidé', 'majestueux', 'exigeant'],
  'Sewellia lineolata': ['fond', 'courant', 'original'],
  'Trichogaster lalius': ['gourami', 'coloré', 'calme'],
  'Trichopodus leerii': ['gourami', 'élégant', 'paisible'],
  'Trichopodus trichopterus': ['gourami', 'robuste', 'facile'],
  'Tanichthys albonubes': ['banc', 'eau-froide', 'facile'],
  'Xiphophorus hellerii': ['vivipare', 'actif', 'coloré'],
  'Betta splendens': ['labyrinthe', 'coloré', 'solitaire'],
};

function extractLabel(html, labelId) {
  const re = new RegExp(`id="ContentPlaceHolder1_${labelId}"[^>]*>([\\s\\S]*?)</span>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  // Clean HTML tags and entities
  return cleanHtml(m[1]);
}

function cleanHtml(str) {
  if (!str) return null;
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumbers(text) {
  if (!text) return [];
  // Match numbers like 22, 5.5, 5,5, 7.5
  const matches = text.match(/[\d]+[.,]?[\d]*/g);
  if (!matches) return [];
  return matches.map(n => parseFloat(n.replace(',', '.')));
}

function extractParamRange(html, divId) {
  // Find the div block for this parameter
  const re = new RegExp(`id="ContentPlaceHolder1_${divId}"[\\s\\S]*?<div[^>]*class="col-sm-9[^"]*"[^>]*>([\\s\\S]*?)</div>`, 'i');
  const m = html.match(re);
  if (!m) return { min: null, max: null };
  
  const text = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  const nums = extractNumbers(text);
  
  if (nums.length >= 4) {
    // 4-value tolerance bar: outer min, inner min, inner max, outer max
    // Use outer range for min/max
    return { min: nums[0], max: nums[3] };
  } else if (nums.length >= 2) {
    return { min: nums[0], max: nums[nums.length - 1] };
  } else if (nums.length === 1) {
    return { min: nums[0], max: nums[0] };
  }
  return { min: null, max: null };
}

function extractSize(html) {
  // Extract all size values from the pattern ":&nbsp;X à Y cm SL" or ":&nbsp;X,Y cm SL"
  const sizePattern = /:&nbsp;([\d,.\s]+(?:à\s*[\d,.]+\s*)?)cm\s*SL/gi;
  const allSizes = [];
  let m;
  while ((m = sizePattern.exec(html)) !== null) {
    const nums = extractNumbers(m[1]);
    allSizes.push(...nums);
  }
  if (allSizes.length > 0) {
    return Math.max(...allSizes);
  }
  
  // Fallback: look for "X cm" near Taille section but exclude CSS px values
  const tailleIdx = html.indexOf('Taille');
  if (tailleIdx > 0) {
    const block = html.substring(tailleIdx, tailleIdx + 600);
    // Only look for "cm SL" or "cm" patterns, NOT "px" 
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
  if (m) {
    let url = m[1];
    if (url.startsWith('../')) url = 'https://www.b-aqua.com/' + url.substring(3);
    else if (url.startsWith('/')) url = 'https://www.b-aqua.com' + url;
    else if (!url.startsWith('http')) url = 'https://www.b-aqua.com/' + url;
    return url;
  }
  return null;
}

function extractMilieu(html) {
  const waterType = extractLabel(html, 'Label_WATER_TYPE');
  if (waterType) {
    if (/mer|marin/i.test(waterType)) return 'Eau de mer';
    if (/saumâtre/i.test(waterType)) return 'Eau saumâtre';
    return 'Eau douce';
  }
  // Look for Milieu section
  const m = html.match(/Milieu[\s\S]*?<span[^>]*>([^<]+)/i);
  if (m) {
    if (/mer|marin/i.test(m[1])) return 'Eau de mer';
    if (/saumâtre/i.test(m[1])) return 'Eau saumâtre';
    return 'Eau douce';
  }
  return 'Eau douce';
}

function extractDiet(html) {
  const alim = extractLabel(html, 'Label_ALIM_TYPE');
  return alim || 'Omnivore';
}

function extractReproType(html) {
  const repro = extractLabel(html, 'Label_REPRO_TYPE_LAB');
  return repro || null;
}

function extractReproDiff(html) {
  const diff = extractLabel(html, 'Label_REPRO_POSS_LAB');
  return diff || null;
}

function extractMaintenanceText(html) {
  const text = extractLabel(html, 'Label_MAINT_DESC');
  if (!text) return null;
  // Limit to first 300 chars for notes
  const cleaned = text.replace(/\n/g, ' ').trim();
  return cleaned.length > 400 ? cleaned.substring(0, 397) + '...' : cleaned;
}

function extractZone(html) {
  return extractLabel(html, 'Label_LIFE_ZONE') || null;
}

function extractPopulation(html) {
  const pop = extractLabel(html, 'Label_MAINT_MINNB');
  if (!pop) return null;
  const nums = extractNumbers(pop);
  return nums.length > 0 ? nums[0] : null;
}

function guessDifficulty(reproText, maintText, species) {
  // Hard-coded overrides for well-known species
  const easy = ['Poecilia reticulata', 'Betta splendens', 'Danio rerio', 
    'Tanichthys albonubes', 'Corydoras paleatus', 'Corydoras aeneus',
    'Xiphophorus hellerii', 'Ancistrus cirrhosus', 'Ancistrus dolichopterus'];
  const medium = ['Corydoras sterbai', 'Corydoras panda', 'Hemigrammus bleheri',
    'Trigonostigma heteromorpha', 'Nematobrycon palmeri', 'Melanotaenia boesemani',
    'Trichogaster lalius', 'Trichopodus leerii', 'Pristella maxillaris',
    'Hyphessobrycon herbertaxelrodi', 'Hyphessobrycon amandae'];
  const hard = ['Symphysodon aequifasciatus', 'Symphysodon discus', 'Carassius auratus',
    'Chromobotia macracanthus'];
  
  if (easy.includes(species)) return 1;
  if (medium.includes(species)) return 2;
  if (hard.includes(species)) return 3;
  
  // Try from reproduction difficulty
  if (reproText) {
    for (const [key, val] of Object.entries(DIFFICULTY_MAP)) {
      if (reproText.toLowerCase().includes(key.toLowerCase())) return val;
    }
  }
  return 2; // Default medium
}

function buildBehaviorText(html, zone) {
  const pop = extractLabel(html, 'Label_MAINT_MINNB');
  const ratio = extractLabel(html, 'Label_MAINT_RATIO');
  let parts = [];
  if (pop) parts.push(`Population: ${pop}`);
  if (zone) parts.push(`Zone: ${zone}`);
  if (ratio) parts.push(`Ratio M/F: ${ratio}`);
  return parts.join('. ') || 'Paisible.';
}

function buildBreedingText(reproType, reproDiff, html) {
  let parts = [];
  if (reproType) parts.push(reproType);
  if (reproDiff) parts.push(`difficulté: ${reproDiff}`);
  return parts.join(', ') || null;
}

function makeSlug(scientificName) {
  return scientificName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function scrapeSpecies(id, expectedSci) {
  const url = `https://www.b-aqua.com/pages/fiche.aspx?id=${id}`;
  console.log(`  Fetching ${expectedSci} (id=${id})...`);
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  ❌ HTTP ${res.status} for ${expectedSci}`);
      return null;
    }
    
    const html = await res.text();
    
    // Extract scientific name from page
    const pageName = extractLabel(html, 'Label_NAME');
    const sciName = pageName || expectedSci;
    
    // Extract common name - prefer our curated names, fallback to scraped
    let commonName = extractLabel(html, 'Label_FIRST_NAME_COMMON');
    // If common name is too long or contains commas, use our lookup
    if (commonName && (commonName.length > 40 || commonName.includes(','))) {
      commonName = COMMON_NAMES[expectedSci] || commonName.split(',')[0].trim();
    }
    const name = COMMON_NAMES[expectedSci] || commonName || sciName;
    
    const slug = makeSlug(expectedSci);
    const biotope = extractMilieu(html);
    const temp = extractParamRange(html, 'div_TEMP_MAINT');
    const ph = extractParamRange(html, 'div_PH_MAINT');
    const gh = extractParamRange(html, 'div_GH_MAINT');
    const volume = extractVolume(html);
    const size = extractSize(html);
    const diet = extractDiet(html);
    const reproType = extractReproType(html);
    const reproDiff = extractReproDiff(html);
    const zone = extractZone(html);
    const maintenanceNotes = extractMaintenanceText(html);
    const image = extractImage(html);
    const difficulty = guessDifficulty(reproDiff, maintenanceNotes, expectedSci);
    
    const dietText = diet + (diet ? '' : 'Omnivore');
    
    const fiche = {
      name: name,
      scientificName: expectedSci,
      slug: slug,
      biotope: biotope,
      difficulty: difficulty,
      tempMin: temp.min,
      tempMax: temp.max,
      phMin: ph.min,
      phMax: ph.max,
      ghMin: gh.min,
      ghMax: gh.max,
      khMin: null,
      khMax: null,
      minVolumeL: volume,
      minLengthCm: size,
      behavior: buildBehaviorText(html, zone),
      compatibility: zone ? `Zone ${zone.toLowerCase()}.` : 'Compatible communautaire.',
      diet: diet,
      breeding: buildBreedingText(reproType, reproDiff, html),
      notes: maintenanceNotes,
      sources: [`https://www.b-aqua.com/pages/fiche.aspx?id=${id}`],
      images: image ? [image] : [],
      gallery: [],
      tags: TAGS_MAP[expectedSci] || [],
    };
    
    console.log(`  ✅ ${name} (${expectedSci}) — T:${temp.min}-${temp.max} pH:${ph.min}-${ph.max} GH:${gh.min}-${gh.max} Vol:${volume}L Size:${size}cm`);
    return fiche;
  } catch (err) {
    console.log(`  ❌ Error for ${expectedSci}: ${err.message}`);
    return null;
  }
}

async function main() {
  const outDir = path.join(__dirname, '..', 'content', 'fiches');
  
  // Check which fiches already exist
  const existing = fs.readdirSync(outDir).map(f => f.replace('.json', ''));
  console.log(`Existing fiches: ${existing.length} (${existing.join(', ')})`);
  
  const toScrape = SPECIES.filter(s => {
    const slug = makeSlug(s.sci);
    return !existing.includes(slug);
  });
  
  console.log(`\nWill scrape ${toScrape.length} new species (skipping ${SPECIES.length - toScrape.length} existing)`);
  console.log('---');
  
  let success = 0;
  let failed = 0;
  
  for (const species of toScrape) {
    const fiche = await scrapeSpecies(species.id, species.sci);
    if (fiche) {
      const filePath = path.join(outDir, `${fiche.slug}.json`);
      fs.writeFileSync(filePath, JSON.stringify(fiche, null, 2), 'utf-8');
      success++;
    } else {
      failed++;
    }
    // Small delay to be polite
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n===');
  console.log(`Done! Created ${success} fiches, ${failed} failed.`);
  console.log(`Total fiches now: ${existing.length + success}`);
}

main().catch(console.error);
