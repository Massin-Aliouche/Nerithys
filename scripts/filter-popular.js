/* Nerithys — filter-popular.js
   Keep only species that are genuinely popular or commonly available
   in the freshwater and marine aquarium hobby.
   
   Strategy:
   1. Whitelist of popular genera (freshwater + marine)
   2. Whitelist of specific species that are popular even if genus is small
   3. Remove "Eau saumâtre" (brackish) unless explicitly aquarium species
   4. Remove obscure genera with no aquarium relevance
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');

/* ══════════════════════════════════════════════════════
   POPULAR FRESHWATER GENERA
   ══════════════════════════════════════════════════════ */
const POPULAR_FW_GENERA = new Set([
  // Livebearers
  'Poecilia', 'Xiphophorus', 'Gambusia', 'Limia', 'Alfaro',
  'Ameca', 'Xenotoca', 'Zoogoneticus', 'Ilyodon', 'Goodea',
  'Dermogenys', 'Nomorhamphus', 'Hemirhamphodon',
  
  // Tetras / Characins
  'Paracheirodon', 'Hyphessobrycon', 'Hemigrammus', 'Nematobrycon',
  'Moenkhausia', 'Pristella', 'Thayeria', 'Petitella', 'Inpaichthys',
  'Aphyocharax', 'Axelrodia', 'Gymnocorymbus', 'Boehlkea',
  'Megalamphodus', 'Tucanoichthys', 'Bryconella',
  
  // Pencilfish / Headstanders
  'Nannostomus', 'Anostomus', 'Leporinus', 'Abramites',
  
  // Hatchetfish
  'Carnegiella', 'Gasteropelecus', 'Thoracocharax',
  
  // Copella / Splashing tetra
  'Copella', 'Pyrrhulina',
  
  // Piranhas / Pacus (popular oddball)
  'Pygocentrus', 'Serrasalmus', 'Metynnis', 'Myleus', 'Myloplus',
  'Colossoma', 'Piaractus',
  
  // Barbs / Cyprinids
  'Puntius', 'Dawkinsia', 'Desmopuntius', 'Haludaria', 'Oliotius',
  'Sahyadria', 'Barbodes', 'Barbonymus', 'Striuntius',
  'Balantiocheilos', 'Oreichthys',
  
  // Rasboras / Danios
  'Rasbora', 'Trigonostigma', 'Boraras', 'Danio', 'Devario',
  'Microdevario', 'Celestichthys', 'Sundadanio', 'Microrasbora',
  'Brevibora', 'Trigonopoma',
  
  // Coldwater cyprinids
  'Tanichthys', 'Pimephales', 'Rhodeus', 'Carassius', 'Cyprinus',
  
  // Loaches
  'Botia', 'Chromobotia', 'Ambastaia', 'Syncrossus', 'Yasuhikotakia',
  'Pangio', 'Acanthopsoides', 'Lepidocephalichthys',
  'Nemacheilus', 'Schistura', 'Acanthocobitis',
  
  // Hillstream loaches
  'Sewellia', 'Gastromyzon', 'Beaufortia', 'Pseudogastromyzon',
  'Erromyzon', 'Homaloptera', 'Balitoropsis',
  
  // Corydoras / Callichthyidae
  'Corydoras', 'Brochis', 'Aspidoras', 'Scleromystax',
  'Hoplosternum', 'Megalechis', 'Dianema',
  
  // Plecos / Loricariidae
  'Ancistrus', 'Hypancistrus', 'Panaque', 'Baryancistrus',
  'Peckoltia', 'Leporacanthicus', 'Pseudacanthicus', 'Spectracanthicus',
  'Parancistrus', 'Scobinancistrus', 'Hemiancistrus',
  'Hypostomus', 'Pterygoplichthys', 'Glyptoperichthys',
  'Loricaria', 'Rineloricaria', 'Farlowella', 'Sturisoma', 'Sturisomatichthys',
  'Acanthicus', 'Pseudorinelepis',
  'Otocinclus', 'Hypoptopoma', 'Parotocinclus', 'Nannoptopoma',
  'Chaetostoma',
  
  // South American Cichlids
  'Apistogramma', 'Mikrogeophagus', 'Geophagus', 'Satanoperca',
  'Symphysodon', 'Pterophyllum', 'Heros', 'Uaru', 'Mesonauta',
  'Laetacara', 'Nannacara', 'Ivanacara', 'Dicrossus', 'Crenicichla',
  'Cichla', 'Aequidens', 'Bujurquina', 'Cleithracara',
  'Acarichthys', 'Guianacara', 'Biotodoma', 'Taeniacara',
  'Astronotus', 'Cichlasoma', 'Hypselecara', 'Acaronia',
  
  // Central American Cichlids
  'Amatitlania', 'Cryptoheros', 'Vieja', 'Thorichthys',
  'Herichthys', 'Amphilophus', 'Parachromis', 'Nandopsis',
  'Rocio', 'Theraps', 'Mayaheros',
  
  // African Cichlids — Malawi
  'Aulonocara', 'Pseudotropheus', 'Labidochromis', 'Melanochromis',
  'Metriaclima', 'Maylandia', 'Cynotilapia', 'Chindongo',
  'Petrotilapia', 'Labeotropheus', 'Iodotropheus',
  'Protomelas', 'Copadichromis', 'Dimidiochromis', 'Nimbochromis',
  'Sciaenochromis', 'Placidochromis', 'Otopharynx', 'Tyrannochromis',
  
  // African Cichlids — Tanganyika
  'Neolamprologus', 'Julidochromis', 'Tropheus', 'Cyphotilapia',
  'Cyprichromis', 'Lamprologus', 'Altolamprologus',
  'Telmatochromis', 'Eretmodus', 'Spathodus', 'Tanganicodus',
  'Callochromis', 'Xenotilapia', 'Enantiopus',
  
  // African Cichlids — West Africa / other
  'Pelvicachromis', 'Hemichromis', 'Steatocranus', 'Nanochromis',
  'Chromidotilapia', 'Benitochromis', 'Enigmatochromis', 'Congochromis',
  'Tilapia', 'Oreochromis',
  
  // African Tetras
  'Phenacogrammus', 'Alestopetersius', 'Arnoldichthys', 'Brycinus',
  'Ladigesia', 'Bathyaethiops',
  
  // Killifish
  'Aphyosemion', 'Fundulopanchax', 'Epiplatys', 'Scriptaphyosemion',
  'Callopanchax', 'Nothobranchius', 'Austrolebias',
  'Aplocheilus', 'Oryzias', 'Lamprichthys', 'Rivulus',
  
  // Labyrinth / Anabantoids
  'Betta', 'Trichogaster', 'Trichopodus', 'Trichopsis', 'Macropodus',
  'Sphaerichthys', 'Parosphromenus', 'Osphronemus',
  'Helostoma', 'Anabas', 'Ctenopoma', 'Microctenopoma',
  'Belontia', 'Parasphaerichthys',
  
  // Snakeheads
  'Channa',
  
  // Catfish — Asian
  'Mystus', 'Hemibagrus', 'Pangasius', 'Pangasianodon',
  'Kryptopterus', 'Ompok',
  
  // Catfish — African
  'Synodontis', 'Clarias', 'Malapterurus',
  
  // Catfish — South American misc
  'Pimelodus', 'Pimelodella', 'Pseudopimelodus', 'Microglanis',
  'Tatia', 'Centromochlus', 'Trachelyopterus',
  'Agamyxis', 'Platydoras', 'Amblydoras', 'Acanthodoras',
  'Bunocephalus',
  
  // Mormyrids / Elephantnose
  'Gnathonemus', 'Campylomormyrus', 'Marcusenius', 'Mormyrus',
  'Petrocephalus', 'Pollimyrus',
  
  // Arowanas / Bichirs / Oddball
  'Osteoglossum', 'Arapaima', 'Polypterus', 'Erpetoichthys',
  'Pantodon', 'Xenomystus', 'Papyrocranus',
  'Apteronotus', 'Eigenmannia', 'Gymnotus',
  
  // Nandids / Badis
  'Badis', 'Dario', 'Nandus',
  
  // Gobies (freshwater)
  'Brachygobius', 'Mugilogobius', 'Stigmatogobius', 'Rhinogobius',
  
  // Spiny eels
  'Mastacembelus', 'Macrognathus',
  
  // Rainbowfish
  'Melanotaenia', 'Glossolepis', 'Iriatherina', 'Pseudomugil',
  'Chilatherina', 'Bedotia', 'Telmatherina',
  
  // Archer / Leaf / Glass fish
  'Toxotes', 'Parambassis', 'Datnioides', 'Monocirrhus',
  
  // Puffers (freshwater)
  'Tetraodon', 'Carinotetraodon', 'Dichotomyctere',
  
  // Sturgeons
  'Acipenser',
  
  // Freshwater rays
  'Potamotrygon',
  
  // Reedfish / Ropefish
  'Erpetoichthys',
  
  // Misc popular
  'Distichodus', 'Neolebias', 'Lepidarchus',
  'Hydrocynus', 'Boulengerella', 'Acestrorhynchus',
  'Chalceus',
  'Crenuchus', 'Characidium',
  'Hoplias',
  'Ambloplites', 'Lepomis', 'Micropterus', /* sunfish/bass — popular coldwater */
  
  // Missed popular genera
  'Haplochromis', 'Astatotilapia', /* Lake Victoria cichlids */
  'Garra', /* popular algae eaters */
  'Crossocheilus', /* Siamese algae eater */
  'Epalzeorhynchos', /* Rainbow/red-tail shark */
  'Pethia', /* popular barbs */
  'Barbus', /* barbs */
  'Puntigrus', /* Tiger barb */
  'Gymnogeophagus', /* SA eartheater cichlids */
  'Stiphodon', /* freshwater gobies popular in nano */
  'Petrochromis', /* Tanganyika cichlids */
  'Lepidiolamprologus', /* Tanganyika */
  'Elassoma', /* pygmy sunfish, popular nano */
  'Micropoecilia', /* small livebearers */
  'Girardinus', /* livebearers */
  'Simpsonichthys', /* annual killifish */
  'Pachypanchax', /* killifish */
  'Enteromius', /* African barbs */
  'Cyclocheilichthys', /* Asian cyprinids */
  'Kottelatlimia', /* small rasboras */
  'Laubuka', /* hatchet barbs */
  'Homalopteroides', /* hillstream */
  'Sinogastromyzon', /* hillstream */
]);

/* ══════════════════════════════════════════════════════
   POPULAR MARINE GENERA
   ══════════════════════════════════════════════════════ */
const POPULAR_MARINE_GENERA = new Set([
  // Clownfish
  'Amphiprion', 'Premnas',
  
  // Tangs / Surgeonfish
  'Acanthurus', 'Paracanthurus', 'Zebrasoma', 'Naso', 'Ctenochaetus',
  
  // Angelfish (marine)
  'Centropyge', 'Pomacanthus', 'Holacanthus', 'Pygoplites', 'Genicanthus',
  'Apolemichthys', 'Chaetodontoplus',
  
  // Butterflyfish
  'Chaetodon', 'Chelmon', 'Forcipiger', 'Heniochus',
  
  // Wrasses
  'Halichoeres', 'Cirrhilabrus', 'Paracheilinus', 'Pseudocheilinus',
  'Thalassoma', 'Labroides', 'Coris', 'Anampses', 'Macropharyngodon',
  'Bodianus',
  
  // Damselfish
  'Chrysiptera', 'Pomacentrus', 'Dascyllus', 'Chromis', 'Abudefduf',
  'Stegastes', 'Neoglyphidodon',
  
  // Gobies (marine)
  'Gobiodon', 'Valenciennea', 'Amblyeleotris', 'Stonogobiops',
  'Elacatinus', 'Nemateleotris', 'Ptereleotris', 'Trimma',
  'Amblygobius', 'Signigobius',
  
  // Blennies
  'Ecsenius', 'Salarias', 'Meiacanthus', 'Atrosalarias',
  'Escenius', 'Blenniella',
  
  // Dottybacks / Pseudochromis
  'Pseudochromis', 'Pictichromis', 'Manonichthys',
  
  // Hawkfish
  'Oxycirrhites', 'Cirrhitichthys', 'Neocirrhites', 'Paracirrhites',
  
  // Cardinals
  'Pterapogon', 'Ostorhinchus', 'Sphaeramia', 'Zoramia',
  
  // Dragonets
  'Synchiropus', 'Neosynchiropus',
  
  // Lionfish / Scorpionfish
  'Pterois', 'Dendrochirus',
  
  // Groupers (small/popular)
  'Cephalopholis', 'Epinephelus',
  
  // Seahorses / Pipefish
  'Hippocampus', 'Doryrhamphus', 'Dunckerocampus',
  
  // Triggerfish
  'Rhinecanthus', 'Odonus', 'Xanthichthys', 'Balistoides', 'Balistapus',
  'Melichthys', 'Sufflamen',
  
  // Boxfish / Cowfish
  'Ostracion', 'Lactoria',
  
  // Puffers (marine)
  'Canthigaster', 'Arothron', 'Diodon',
  
  // Filefish
  'Acreichthys', 'Oxymonacanthus', 'Aluterus', 'Cantherhines',
  
  // Rabbitfish
  'Siganus', 'Lo',
  
  // Eels (marine)
  'Gymnothorax', 'Echidna', 'Rhinomuraena',
  
  // Jawfish
  'Opistognathus',
  
  // Mandarinfish already in Synchiropus
  
  // Foxface
  'Foxface', /* alias for Lo/Siganus */
  
  // Basslets
  'Gramma', 'Lipogramma', 'Assessor',
  
  // Anthias
  'Pseudanthias', 'Serranocirrhitus',
  
  // Frogfish
  'Antennarius',
  
  // Batfish
  'Platax',
  
  // Moorish idol
  'Zanclus',
  
  // Goatfish (popular reef)
  'Parupeneus',
  
  // Tilefish
  'Hoplolatilus',
  
  // Shrimpfish / Razorfish
  'Aeoliscus',
  
  // Missed popular marine genera
  'Cryptocentrus', /* shrimp gobies */
  'Tomiyamichthys', /* shrimp gobies */
  'Ctenogobiops', /* shrimp gobies */
  'Centropyge', /* dwarf angels (already listed but ensure) */
]);

/* ══════════════════════════════════════════════════════
   SPECIFIC POPULAR SPECIES (for genera not whitelisted above)
   ══════════════════════════════════════════════════════ */
const POPULAR_SPECIES = new Set([
  // Specific popular species from less-common genera
  'Abramis brama',
  'Acantopsis dialuzona',
  'Ageneiosus marmoratus',
  'Anostomus anostomus',
  'Bedotia geayi',
  'Chaca chaca',
  'Chitala ornata',
  'Colisa lalia', // synonym for Trichogaster lalius
  'Colomesus asellus',
  'Dimidiochromis compressiceps',
  'Dimidiochromis strigatus',
  'Electrophorus electricus',
  'Etroplus maculatus',
  'Etroplus suratensis',
  'Hoplias malabaricus',
  'Indostomus paradoxus',
  'Lepisosteus oculatus',
  'Monodactylus argenteus',
  'Monodactylus sebae',
  'Monocirrhus polyacanthus',
  'Periophthalmus barbarus',
  'Protopterus annectens',
  'Scatophagus argus',
  'Tetraodon nigroviridis',
  'Wallago attu',
  'Hemichromis bimaculatus',
  'Astatotilapia burtoni',
  'Haplochromis obliquidens',
  'Pseudetroplus maculatus',
]);

function isPopular(data) {
  const sci = (data.scientificName || '').trim();
  const genus = sci.split(' ')[0];
  const biotope = data.biotope || '';

  // Check specific species first
  if (POPULAR_SPECIES.has(sci)) return true;

  // Check genus against BOTH lists regardless of biotope
  // (some species are miscategorized in biotope)
  if (POPULAR_FW_GENERA.has(genus)) return true;
  if (POPULAR_MARINE_GENERA.has(genus)) return true;

  // Brackish — keep only very popular brackish species
  if (biotope === 'Eau saumâtre') {
    const BRACKISH_POPULAR = new Set([
      'Brachygobius', 'Stigmatogobius', 'Monodactylus', 'Scatophagus',
      'Periophthalmus', 'Toxotes', 'Datnioides', 'Tetraodon',
      'Dichotomyctere', 'Dermogenys', 'Etroplus', 'Pseudetroplus',
      'Selenotoca', 'Parambassis', 'Chanda', 'Poecilia', 'Gambusia',
    ]);
    return BRACKISH_POPULAR.has(genus);
  }

  return false;
}

function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  let kept = 0, removed = 0;
  const keptBiotopes = {};
  const removedList = [];

  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));

    if (isPopular(data)) {
      kept++;
      const b = data.biotope || '?';
      keptBiotopes[b] = (keptBiotopes[b] || 0) + 1;
    } else {
      fs.unlinkSync(fPath);
      removed++;
      removedList.push(data.scientificName || f);
    }
  }

  console.log(`[filter-popular] Done!`);
  console.log(`  Kept: ${kept}`);
  console.log(`  Removed: ${removed}`);
  console.log(`\n  Kept by biotope:`);
  Object.entries(keptBiotopes).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`    ${v} ${k}`);
  });

  // Save removed list for reference
  fs.writeFileSync(
    path.join(__dirname, '..', 'removed-species.txt'),
    removedList.join('\n'),
    'utf8'
  );
  console.log(`\n  Removed list saved to removed-species.txt`);
}

main();
