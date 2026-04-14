const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'content', 'fiches');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const BEHAVIORS = {
  'Abramites': "Poisson herbivore grégaire nageant souvent la tête en bas. Peut dévorer les plantes. Aquarium spacieux avec cachettes.",
  'Acantopsis': "Loche fouisseuse qui s'enfouit dans le sable. Substrat de sable fin obligatoire. Paisible et discret.",
  'Anostomus': "Poisson caractéristique nageant souvent la tête en bas. Peut être territorial avec ses congénères. Aquarium planté.",
  'Brochis': "Poisson-chat de fond grégaire et paisible, proche des Corydoras. Maintenir en groupe sur substrat de sable fin.",
  'Celestichthys': "Petit poisson grégaire et paisible. Maintenir en banc dans un aquarium densément planté avec courant modéré.",
  'Chindongo': "Cichlidé du lac Malawi mbuna territorial. Nécessite un aquarium rocheux avec de nombreuses cachettes. Eau dure et alcaline.",
  'Copella': "Petit poisson de surface paisible et vif. Connu pour pondre hors de l'eau (C. arnoldi). Aquarium couvert avec plantes de surface.",
  'Crossocheilus': "Poisson algívore actif et grégaire. Excellent mangeur d'algues filamenteuses. Maintenir en petit groupe avec courant.",
  'Cyclocheilichthys': "Cyprinidé asiatique actif et grégaire. Nage en pleine eau. Aquarium spacieux avec courant modéré.",
  'Dichotomyctere': "Poisson-globe d'eau saumâtre curieux et intelligent. Peut mordre les nageoires. Aquarium spécifique avec sel marin.",
  'Epalzeorhynchos': "Poisson de fond territorial, surtout avec ses congénères. Bon mangeur d'algues. Un seul spécimen par aquarium recommandé.",
  'Garra': "Poisson algívore de fond actif. Apprécie le courant et les surfaces à brouter. Grégaire, maintenir en petit groupe.",
  'Hemirhamphodon': "Demi-bec d'eau douce, poisson de surface prédateur d'insectes. Maintenir en groupe dans un aquarium couvert et planté.",
  'Leporinus': "Poisson robuste et actif, peut devenir grand. Herbivore, dévore les plantes. Aquarium spacieux et couvert.",
  'Macrognathus': "Anguille épineuse nocturne et fouisseuse. S'enfouit dans le sable fin. Paisible mais mange les petits poissons.",
  'Mastacembelus': "Anguille épineuse nocturne et timide. S'enfouit dans le sable. Substrat fin et nombreuses cachettes obligatoires.",
  'Microrasbora': "Micro-poisson très paisible et timide. Aquarium densément planté avec éclairage tamisé. Maintenir en banc.",
  'Mugilogobius': "Petit gobie d'eau saumâtre territorial au sol. Substrat de sable avec petites cachettes (coquillages, pierres).",
  'Nandus': "Poisson prédateur d'embuscade nocturne, se camoufle parmi les feuilles mortes. Mange poissons et crevettes. Aquarium spécifique.",
  'Oryzias': "Petit poisson de rizière paisible et résistant. Facile à maintenir en groupe. Aquarium planté avec éclairage modéré.",
  'Tateurdina': "Gobie paon, petit poisson de fond coloré et paisible. Aquarium densément planté avec cachettes. Peut se reproduire en captivité.",
  'Tatia': "Poisson-chat nain nocturne et discret. Très paisible. Nombreuses cachettes (bois, tubes). Actif la nuit.",
  'Semaprochilodus': "Grand poisson herbivore et migrateur. Nage en pleine eau. Nécessite un très grand aquarium. Grégaire.",
  'Sawbwa': "Petit poisson du lac Inlé, paisible et grégaire. Eau propre et bien oxygénée. Aquarium planté avec courant léger.",
  'Sahyadria': "Barbus indien coloré et actif. Maintenir en banc avec courant. Aquarium planté et bien oxygéné.",
  'Pangio': "Loche serpentiforme fouisseuse et grégaire. Substrat de sable fin obligatoire. Nocturne et paisible.",
  'Pareutropius': "Poisson-chat de verre africain grégaire et paisible. Nage en pleine eau en banc. Courant modéré apprécié.",
  'Phenacogrammus': "Tétra africain grégaire et paisible. Nage en banc en pleine eau. Aquarium planté avec zones de nage dégagées.",
  'Polypterus': "Poisson primitif nocturne et prédateur. Respire l'air en surface. Aquarium couvert avec cachettes. Calme en journée.",
  'Pseudomugil': "Petit poisson arc-en-ciel grégaire et actif. Eau propre et bien oxygénée. Maintenir en banc dans un aquarium planté.",
  'Rasbora': "Petit poisson grégaire et paisible. Nage en banc en pleine eau. Aquarium planté avec zones dégagées.",
  'Stiphodon': "Gobie d'eau douce algívore. Vit sur les roches en courant. Substrat de galets et courant fort.",
  'Thorichthys': "Cichlidé centraméricain modérément territorial. Aquarium spacieux avec sable et cachettes. Couples stables.",
  'Trigonostigma': "Petit poisson grégaire et paisible. Nage en banc en pleine eau. Aquarium planté avec éclairage tamisé.",
  'Xenotilapia': "Cichlidé du lac Tanganyika vivant sur le sable. Grégaire, maintenir en groupe. Substrat de sable fin.",
};

// KH defaults for genera with missing KH
const KH_DEFAULTS = {
  // Marine species: typical reef KH 7-12
  'Centropyge': [7, 12],
  'Chrysiptera': [7, 12],
  'Chelmon': [7, 12],
  'Gobiodon': [7, 12],
  'Gramma': [7, 12],
  'Nemateleotris': [7, 12],
  'Opistognathus': [7, 12],
  'Oxycirrhites': [7, 12],
  'Premnas': [7, 12],
  'Pseudanthias': [7, 12],
  'Pseudocheilinus': [7, 12],
  'Pterapogon': [7, 12],
  'Salarias': [7, 12],
  'Siganus': [7, 12],
  'Stonogobiops': [7, 12],
  'Synchiropus': [7, 12],
  'Valenciennea': [7, 12],
  'Zebrasoma': [7, 12],
  // Freshwater
  'Abramites': [2, 8],
  'Acantopsis': [1, 6],
  'Brochis': [2, 8],
  'Celestichthys': [2, 6],
  'Copella': [1, 5],
  'Cyclocheilichthys': [2, 8],
  'Hemirhamphodon': [1, 5],
  'Leporinus': [2, 10],
  'Macrognathus': [2, 6],
  'Mastacembelus': [2, 8],
  'Microrasbora': [1, 4],
  'Nandus': [2, 8],
  'Oryzias': [2, 8],
  'Tateurdina': [2, 6],
  'Tatia': [1, 6],
  'Semaprochilodus': [2, 8],
  'Sawbwa': [3, 8],
  'Sahyadria': [2, 8],
  'Pareutropius': [3, 10],
  'Phenacogrammus': [2, 8],
  'Polypterus': [2, 10],
  'Pseudomugil': [3, 10],
  'Stiphodon': [2, 8],
  'Thorichthys': [3, 10],
  'Xenotilapia': [8, 14],
  'Chindongo': [8, 14],
  'Dichotomyctere': [5, 15],
  'Mugilogobius': [5, 12],
};

let stats = { beh: 0, kh: 0 };

files.forEach(f => {
  const filePath = path.join(dir, f);
  const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;
  const genus = (d.scientificName || '').split(' ')[0];

  if ((!d.behavior || d.behavior.trim() === '') && BEHAVIORS[genus]) {
    d.behavior = BEHAVIORS[genus];
    changed = true; stats.beh++;
  }

  if (d.khMin == null && KH_DEFAULTS[genus]) {
    d.khMin = KH_DEFAULTS[genus][0];
    d.khMax = KH_DEFAULTS[genus][1];
    changed = true; stats.kh++;
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(d, null, 2), 'utf8');
  }
});

console.log('Fixed:', stats);

// Final audit
let beh = [], kh = 0;
files.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const g = (d.scientificName || '').split(' ')[0];
  if (!d.behavior || !d.behavior.trim()) beh.push(g + ': ' + d.scientificName);
  if (d.khMin == null) kh++;
});
console.log('\nRemaining behavior missing (' + beh.length + '):', beh);
console.log('Remaining KH missing:', kh);
