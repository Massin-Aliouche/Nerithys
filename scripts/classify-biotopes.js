/* Nerithys — classify-biotopes.js
   Classify freshwater species into sub-biotopes:
   - "Eau douce — Asie" for Asian species
   - "Eau douce — Amazonie" for South American (Amazonian/Neotropical) species
   Uses: genus-based lookup + text cues in notes/behavior/compatibility
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');

/* ── Known Asian genera ───────────────────────────── */
const ASIAN_GENERA = new Set([
  // Labyrinth / Anabantoids
  'Betta', 'Trichogaster', 'Trichopodus', 'Trichopsis', 'Macropodus',
  'Parasphaerichthys', 'Sphaerichthys', 'Parosphromenus', 'Osphronemus',
  'Helostoma', 'Anabas', 'Ctenopoma', 'Luciocephalus', 'Belontia',
  // Cyprinids / Barbs / Rasboras
  'Rasbora', 'Trigonostigma', 'Boraras', 'Danio', 'Devario', 'Microdevario',
  'Celestichthys', 'Brachydanio', 'Microrasbora', 'Sundadanio',
  'Puntius', 'Dawkinsia', 'Desmopuntius', 'Haludaria', 'Oliotius', 'Striuntius',
  'Sahyadria', 'Barbodes', 'Barbonymus', 'Oreichthys',
  'Balantiocheilos', 'Cyclocheilichthys', 'Hampala', 'Leptobarbus',
  'Epalzeorhynchos', 'Crossocheilus', 'Garra', 'Gyrinocheilus',
  'Tanichthys', 'Rhodeus', /* Tanichthys = Vietnam/China */
  // Loaches
  'Botia', 'Chromobotia', 'Ambastaia', 'Syncrossus', 'Yasuhikotakia',
  'Pangio', 'Acanthopsoides', 'Lepidocephalichthys', 'Lepidocephalus',
  'Nemacheilus', 'Schistura', 'Acanthocobitis', 'Mesonoemacheilus',
  'Homaloptera', 'Homalopteroides', 'Sewellia', 'Gastromyzon', 'Beaufortia',
  'Pseudogastromyzon', 'Erromyzon', 'Sinogastromyzon', 'Balitoropsis',
  // Snakeheads
  'Channa', 'Parachanna',
  // Asian catfish
  'Mystus', 'Hemibagrus', 'Bagarius', 'Pangasius', 'Pangasianodon',
  'Kryptopterus', 'Ompok', 'Silurus', 'Wallago',
  'Akysis', 'Pseudomystus', 'Leiocassis',
  'Glyptothorax', 'Pseudecheneis', 'Sisoridae',
  // Rainbowfish-like (from Asia)
  'Oryzias', 'Aplocheilichthys',/* medaka */
  // Gobies (Asian freshwater)
  'Brachygobius', 'Mugilogobius', 'Stigmatogobius', 'Rhinogobius',
  // Nandids
  'Nandus', 'Badis', 'Dario',
  // Ricefish
  'Dermogenys', 'Nomorhamphus', 'Hemirhamphodon',
  // Misc Asian
  'Indostomus', 'Monopterus', 'Mastacembelus', 'Macrognathus',
  'Datnioides', 'Toxotes', 'Parambassis', 'Chanda',
  'Etroplus', 'Pseudetroplus',
  // Goldfish / Koi (East Asian)
  'Carassius', 'Cyprinus',
]);

/* ── Known South American / Amazonian genera ──────── */
const AMAZONIAN_GENERA = new Set([
  // Tetras / Characins
  'Paracheirodon', 'Hyphessobrycon', 'Hemigrammus', 'Nematobrycon',
  'Nannostomus', 'Pyrrhulina', 'Copella', 'Carnegiella', 'Gasteropelecus',
  'Thoracocharax', 'Moenkhausia', 'Pristella', 'Thayeria', 'Petitella',
  'Megalamphodus', 'Aphyocharax', 'Axelrodia', 'Tucanoichthys',
  'Inpaichthys', 'Bryconella', 'Microschemobrycon', 'Tyttocharax',
  'Erythrocharax', 'Bryconops', 'Astyanax', 'Gymnocorymbus',
  'Phenacogaster', 'Knodus', 'Boehlkea', 'Brittanichthys',
  'Iguanodectes', 'Chalceus', 'Boulengerella',
  // South American Cichlids
  'Apistogramma', 'Mikrogeophagus', 'Geophagus', 'Satanoperca',
  'Symphysodon', 'Pterophyllum', 'Heros', 'Uaru', 'Mesonauta',
  'Laetacara', 'Nannacara', 'Ivanacara', 'Dicrossus', 'Crenicichla',
  'Cichla', 'Aequidens', 'Bujurquina', 'Cleithracara',
  'Acarichthys', 'Guianacara', 'Retroculus', 'Biotodoma',
  'Taeniacara', 'Teleocichla', 'Acaronia', 'Hypselecara',
  'Astronotus', 'Cichlasoma',
  // Corydoras / Callichthyidae
  'Corydoras', 'Brochis', 'Aspidoras', 'Scleromystax', 'Hoplosternum',
  'Megalechis', 'Callichthys', 'Dianema',
  // Loricariidae (plecos, otos)
  'Otocinclus', 'Hypancistrus', 'Ancistrus', 'Panaque', 'Baryancistrus',
  'Peckoltia', 'Leporacanthicus', 'Pseudacanthicus', 'Spectracanthicus',
  'Parancistrus', 'Scobinancistrus', 'Hemiancistrus',
  'Hypostomus', 'Pterygoplichthys', 'Glyptoperichthys',
  'Loricaria', 'Rineloricaria', 'Farlowella', 'Sturisoma', 'Sturisomatichthys',
  'Whiptail', 'Acanthicus', 'Pseudorinelepis',
  'Hypoptopoma', 'Nannoptopoma', 'Parotocinclus',
  // Piranhas / Pacus
  'Pygocentrus', 'Serrasalmus', 'Pristobrycon', 'Catoprion',
  'Metynnis', 'Myleus', 'Myloplus', 'Colossoma', 'Piaractus',
  // Electric eels / knifefishes
  'Apteronotus', 'Eigenmannia', 'Sternarchorhynchus',
  'Gymnotus', 'Electrophorus',
  // Amazon catfish
  'Pimelodus', 'Pimelodella', 'Pseudopimelodus', 'Microglanis',
  'Brachyplatystoma', 'Pseudoplatystoma', 'Phractocephalus',
  'Sorubim', 'Hemisorubim', 'Leiarius',
  'Tatia', 'Centromochlus', 'Trachelyopterus',
  'Auchenipterus', 'Agamyxis', 'Platydoras', 'Amblydoras',
  'Acanthodoras', 'Anadoras', 'Orinocodoras',
  'Bunocephalus', 'Dysichthys',
  // Livebearers (Central/South America)
  'Poecilia', 'Xiphophorus', 'Gambusia',
  // Pencilfish / Headstanders
  'Anostomus', 'Leporinus', 'Abramites', 'Schizodon',
  // Arowanas
  'Osteoglossum', 'Arapaima',
  // Other SA
  'Crenuchidae', 'Crenuchus', 'Characidium',
  'Rivulus', 'Austrolebias', 'Simpsonichthys', 'Nematolebias', 'Spectrolebias',
  'Potamotrygon', /* freshwater rays */
  'Pipa', /* not fish but sometimes in aquarium databases */
]);

/* ── Text cues for classification ─────────────────── */
const ASIAN_KEYWORDS = [
  'asie', 'asia', 'inde', 'india', 'thaïlande', 'thailand', 'birmanie', 'myanmar',
  'vietnam', 'cambodge', 'laos', 'malaisie', 'malaysia', 'bornéo', 'borneo',
  'sumatra', 'java', 'indonés', 'indonesi', 'sri lanka', 'ceylan',
  'chine', 'china', 'japon', 'japan', 'corée', 'korea', 'taïwan', 'taiwan',
  'mékong', 'mekong', 'gange', 'ganges', 'brahmapoutre', 'brahmaputra',
  'irrawaddy', 'philippin', 'bangladesh', 'népal', 'nepal', 'pakistan',
  'sud-est asiatique', 'asie du sud', 'oriental', 'bengale',
];

const AMAZONIAN_KEYWORDS = [
  'amazone', 'amazon', 'amérique du sud', 'south america', 'sudaméri',
  'brésil', 'brazil', 'brasil', 'colombie', 'colombia', 'pérou', 'peru',
  'venezuela', 'guyane', 'guyana', 'guiana', 'surinam', 'bolivie', 'bolivia',
  'équateur', 'ecuador', 'paraguay', 'uruguay', 'argentine', 'argentin',
  'orinoque', 'orinoco', 'río negro', 'rio negro', 'rio branco',
  'amérique centrale', 'central america', 'panama', 'costa rica',
  'mexique', 'mexico', 'guatemala', 'honduras', 'nicaragua', 'belize',
  'néotropical', 'neotropical', 'sud-américain',
  'rio', 'araguaia', 'tocantins', 'xingu', 'tapajós', 'madeira',
  'paraná', 'parana', 'solimões', 'ucayali',
];

function classifySpecies(data) {
  if (data.biotope !== 'Eau douce') return null; // Only reclassify freshwater

  const genus = (data.scientificName || '').split(' ')[0];
  
  // Check genus-based classification first
  if (ASIAN_GENERA.has(genus)) return 'Eau douce — Asie';
  if (AMAZONIAN_GENERA.has(genus)) return 'Eau douce — Amazonie';

  // Fall back to text cue analysis
  const text = [
    data.notes || '',
    data.behavior || '',
    data.compatibility || '',
    data.breeding || '',
    data.diet || '',
  ].join(' ').toLowerCase();

  let asianScore = 0, amazonianScore = 0;
  for (const kw of ASIAN_KEYWORDS) {
    if (text.includes(kw)) asianScore++;
  }
  for (const kw of AMAZONIAN_KEYWORDS) {
    if (text.includes(kw)) amazonianScore++;
  }

  if (asianScore > 0 && asianScore > amazonianScore) return 'Eau douce — Asie';
  if (amazonianScore > 0 && amazonianScore > asianScore) return 'Eau douce — Amazonie';

  return null; // Can't determine — leave as "Eau douce"
}

function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  let asian = 0, amazonian = 0, unchanged = 0;

  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    
    const newBiotope = classifySpecies(data);
    if (newBiotope) {
      data.biotope = newBiotope;
      fs.writeFileSync(fPath, JSON.stringify(data, null, 2), 'utf8');
      if (newBiotope.includes('Asie')) asian++;
      else amazonian++;
    } else {
      unchanged++;
    }
  }

  console.log(`[classify-biotopes] Done!`);
  console.log(`  Asian: ${asian}`);
  console.log(`  Amazonian: ${amazonian}`);
  console.log(`  Unchanged: ${unchanged}`);
}

main();
