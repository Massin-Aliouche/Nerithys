/* filter-obscure.js — Remove species rarely kept in aquariums */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'content', 'fiches');

// ─── POPULAR SPECIES TO ALWAYS KEEP ──────────────────────────────
// These are well-known aquarium species regardless of genus size
const ALWAYS_KEEP = new Set([
  // Iconic freshwater
  'Paracanthurus hepatus', 'Chromobotia macracanthus', 'Puntigrus tetrazona',
  'Gymnocorymbus ternetzi', 'Pristella maxillaris', 'Pantodon buchholzi',
  'Polypterus delhezi', 'Helostoma temminckii', 'Datnioides microlepis',
  'Iriatherina werneri', 'Megalechis thoracata', 'Brochis splendens',
  'Cleithracara maronii', 'Inpaichthys kerri', 'Arnoldichthys spilopterus',
  'Scatophagus argus', 'Monodactylus argenteus', 'Zanclus cornutus',
  'Chelmon rostratus', 'Premnas biaculeatus', 'Pterois volitans',
  'Gymnothorax tile', 'Gramma loreto', 'Elacatinus oceanops',
  'Boehlkea fredcochui', 'Steatocranus casuarius', 'Etroplus maculatus',
  'Cyphotilapia frontosa', 'Heros severus', 'Biotodoma cupido',
  'Eretmodus cyanostictus', 'Sciaenochromis fryeri', 'Protomelas taeniolatus',
  'Dimidiochromis compressiceps', 'Cynotilapia zebroides', 'Iodotropheus sprengerae',
  'Enigmatochromis lucanusi', 'Chromidotilapia guntheri', 'Pterapogon kauderni',
  'Oxycirrhites typus', 'Salarias fasciatus', 'Sphaeramia nematoptera',
  'Ameca splendens', 'Xenotoca eiseni', 'Zoogoneticus tequila',
  'Rhodeus ocellatus', 'Celestichthys margaritatus', 'Alfaro cultratus',
  'Pimelodus pictus', 'Loricaria simillima', 'Acantopsis dialuzona',
  'Herichthys cyanoguttatus', 'Rocio octofasciata', 'Cryptoheros nigrofasciatus',
  'Agamyxis pectinifrons', 'Acarichthys heckelii', 'Chalceus erythrurus',
  'Bunocephalus coracoideus', 'Oxymonacanthus longirostris',
  'Beaufortia kweichowensis', 'Stiphodon elegans', 'Glossolepis incisus',
  'Hypselecara temporalis', 'Holacanthus ciliaris', 'Centromochlus perugiae',
  'Macrognathus siamensis', 'Neocirrhites armatus', 'Lepidocephalichthys guntea',
  'Taeniacara candidi', 'Crenuchus spilurus', 'Balistapus undulatus',
  'Abramites hypselonotus', 'Parambassis ranga', 'Chilatherina bleheri',
  'Doryrhamphus excisus', 'Haludaria fasciata', 'Mugilogobius tigrinus',
  'Lamprichthys tanganicanus', 'Mystus tengara', 'Pseudocheilinus hexataenia',
  'Nomorhamphus liemi', 'Meiacanthus grammistes', 'Pictichromis paccagnellae',
  'Microdevario kubotai', 'Homaloptera tweediei', 'Parancistrus aurantiacus',
  'Pseudogastromyzon cheni', 'Microrasbora rubescens', 'Rivulus hartii',
  'Trachelyopterus fisheri', 'Mastacembelus erythrotaenia', 'Oliotius oligolepis',
  'Paracheilinus mccoskeri', 'Serranocirrhitus latus', 'Coris gaimard',
  'Scleromystax barbatus', 'Astatotilapia burtoni',
]);

// ─── OBSCURE GENERA TO REMOVE ────────────────────────────────────
// Marine genera that are rarely kept (very specialized, deep reef, etc.)
const OBSCURE_MARINE_GENERA = new Set([
  'Amblyeleotris', 'Tomiyamichthys', 'Trimma', // Gobies — too many obscure spp
  'Ostorhinchus', // Cardinalfish — most are rarely imported
  'Abudefduf', // Damselfish — aggressive, rarely kept intentionally
  'Aeoliscus', // Shrimpfish — extremely difficult
  'Zoramia', 'Manonichthys',
]);

// Obscure freshwater genera with many species rarely seen in trade
const OBSCURE_FW_GENERA = new Set([
  'Chaetostoma', // Rare plecos, hardly in trade
  'Gastromyzon', // Hillstream loaches — few actually available
  'Haplochromis', // Too many, mostly wild/specialist
  'Barbodes', // Obscure barbs from SE Asia
  'Oryzias', // Ricefish — mostly O. latipes/woworae are popular (keep those)
  'Austrolebias', // Killifish — extremely specialized
  'Baryancistrus', // Rare plecos
  'Peckoltia', // Rare plecos
  'Scobinancistrus', // Rare plecos
  'Pseudacanthicus', // Rare plecos
  'Parosphromenus', // Licorice gourami — specialist only
  'Lepidiolamprologus',
  'Erromyzon', // Very rare hillstream
  'Sinogastromyzon', // Very rare hillstream
  'Homalopteroides', // Very rare hillstream
]);

// Keep maximum N species per large genus (trim to the most popular)
const TRIM_GENERA = {
  'Corydoras': 15, // Keep 15 most popular out of 56
  'Betta': 10,     // Keep 10 out of 45 (most are wild bettas)
  'Apistogramma': 12, // Keep 12 out of 42
  'Hyphessobrycon': 10, // Keep 10 out of 30
  'Chaetodon': 8,  // Keep 8 out of 28
  'Melanotaenia': 8, // Keep 8 out of 21
  'Aphyosemion': 5, // Keep 5 out of 18 (specialist killifish)
  'Puntius': 6,    // Keep 6 out of 18
  'Neolamprologus': 6, // Keep 6 out of 15
  'Badis': 4,      // Keep 4 out of 14
  'Hemigrammus': 6, // Keep 6 out of 14
  'Danio': 8,      // Keep 8 out of 12
  'Rasbora': 8,    // Keep 8 out of 12
  'Xiphophorus': 6, // Keep 6 out of 12
  'Halichoeres': 4, // Keep 4 out of 10
  'Cirrhilabrus': 4, // Keep 4 out of 9
  'Fundulopanchax': 4, // Keep 4 out of 9
  'Amblygobius': 3, // Keep 3 out of 8
  'Antennarius': 3, // Keep 3 out of 8
  'Chrysiptera': 4, // Keep 4 out of 8
  'Pseudochromis': 4, // Keep 4 out of 8
  'Canthigaster': 3, // Keep 3 out of 7
  'Ctenochaetus': 3, // Keep 3 out of 7
  'Bodianus': 3,   // Keep 3 out of 7
  'Pomacentrus': 4, // Keep 4 out of 9
  'Thalassoma': 4, // Keep 4 out of 9
  'Valenciennea': 3, // Keep 3 out of 6
  'Nothobranchius': 3, // Keep 3 out of 6
  'Dawkinsia': 3,  // Keep 3 out of 5
  'Desmopuntius': 3, // Keep 3 out of 5
  'Garra': 2,      // Keep 2 out of 5
  'Heniochus': 3,  // Keep 3 out of 5
};

// ─── POPULARITY SCORING ──────────────────────────────────────────
// Score species by aquarium popularity indicators
const POPULAR_SPECIES_NAMES = [
  // Common names / patterns indicating popularity
  'neon', 'cardinal', 'discus', 'angel', 'guppy', 'platy', 'molly', 'betta',
  'oscar', 'tetra', 'barb', 'rasbora', 'danio', 'gourami', 'loach', 'cory',
  'pleco', 'catfish', 'killifish', 'cichlid', 'clown', 'tang', 'wrasse',
  'goby', 'blenny', 'damsel', 'butterfly', 'ram', 'krib', 'firemouth',
];

function popularityScore(d) {
  let score = 0;
  const name = (d.name || '').toLowerCase();
  const sci = (d.scientificName || '').toLowerCase();

  // Well-known species get bonus
  POPULAR_SPECIES_NAMES.forEach(p => {
    if (name.includes(p) || sci.includes(p)) score += 2;
  });

  // Difficulty 1-2 = beginner-friendly = more popular
  if (d.difficulty <= 2) score += 3;

  // Small volume = easier to keep = more popular
  if (d.minVolumeL && d.minVolumeL <= 100) score += 2;
  if (d.minVolumeL && d.minVolumeL <= 200) score += 1;

  // Has a common name (not just scientific name)
  if (d.name && d.name !== d.scientificName && d.name.length > 3) score += 1;

  return score;
}

// ─── PROCESS ─────────────────────────────────────────────────────
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const species = files.map(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  d._file = f;
  d._genus = (d.scientificName || '').split(' ')[0];
  d._score = popularityScore(d);
  return d;
});

let removed = 0;
const removedByReason = { obscureGenus: 0, trimmed: 0 };

// 1. Remove entire obscure genera
const toRemoveObscure = new Set();
species.forEach(d => {
  if (ALWAYS_KEEP.has(d.scientificName)) return;
  const isMarine = (d.biotope || '').includes('mer');
  if (isMarine && OBSCURE_MARINE_GENERA.has(d._genus)) {
    toRemoveObscure.add(d._file);
    removedByReason.obscureGenus++;
  }
  if (!isMarine && OBSCURE_FW_GENERA.has(d._genus)) {
    toRemoveObscure.add(d._file);
    removedByReason.obscureGenus++;
  }
});

// 2. Trim large genera to their most popular species
const genusBuckets = {};
species.forEach(d => {
  if (!genusBuckets[d._genus]) genusBuckets[d._genus] = [];
  genusBuckets[d._genus].push(d);
});

const toRemoveTrim = new Set();
Object.entries(TRIM_GENERA).forEach(([genus, max]) => {
  const bucket = genusBuckets[genus] || [];
  if (bucket.length <= max) return;

  // Sort by popularity score descending, keep top N
  bucket.sort((a, b) => {
    // Always-keep first
    const ak = ALWAYS_KEEP.has(a.scientificName) ? 1000 : 0;
    const bk = ALWAYS_KEEP.has(b.scientificName) ? 1000 : 0;
    return (bk + b._score) - (ak + a._score);
  });

  for (let i = max; i < bucket.length; i++) {
    if (!ALWAYS_KEEP.has(bucket[i].scientificName)) {
      toRemoveTrim.add(bucket[i]._file);
      removedByReason.trimmed++;
    }
  }
});

// Execute removals
const allToRemove = new Set([...toRemoveObscure, ...toRemoveTrim]);
allToRemove.forEach(f => {
  fs.unlinkSync(path.join(dir, f));
  removed++;
});

const remaining = files.length - removed;
console.log(`Removed ${removed} species (obscure genera: ${removedByReason.obscureGenus}, trimmed: ${removedByReason.trimmed})`);
console.log(`Remaining: ${remaining} species`);
