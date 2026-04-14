const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'content', 'fiches');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const EXTRA = {
  'Anabas':        { t:[22,28], ph:[6.0,8.0], gh:[5,20], kh:[3,10], vol:100, len:15 },
  'Aplocheilus':   { t:[22,26], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:60,  len:8 },
  'Benitochromis': { t:[24,27], ph:[6.0,7.0], gh:[3,12], kh:[2,6],  vol:120, len:10 },
  'Bujurquina':    { t:[23,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:150, len:12 },
  'Genicanthus':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:500, len:15 },
  'Girardinus':    { t:[22,28], ph:[7.0,8.0], gh:[8,20], kh:[5,12], vol:60,  len:5 },
  'Hypostomus':    { t:[23,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:300, len:25 },
  'Metynnis':      { t:[24,28], ph:[5.5,7.5], gh:[2,15], kh:[1,8],  vol:400, len:15 },
  'Mystus':        { t:[22,26], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:150, len:15 },
  'Nannacara':     { t:[24,28], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:60,  len:7 },
  'Neolebias':     { t:[23,27], ph:[6.0,7.0], gh:[2,10], kh:[1,5],  vol:40,  len:4 },
  'Ompok':         { t:[22,26], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:200, len:25 },
  'Petrochromis':  { t:[24,27], ph:[7.8,9.0], gh:[8,20], kh:[8,14], vol:400, len:15 },
  'Pyrrhulina':    { t:[24,28], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:60,  len:6 },
  'Rhinecanthus':  { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:500, len:25 },
  'Rhinogobius':   { t:[18,24], ph:[6.5,7.5], gh:[3,15], kh:[2,8],  vol:60,  len:5 },
  'Sundadanio':    { t:[24,28], ph:[4.0,6.5], gh:[1,5],  kh:[0,3],  vol:30,  len:2 },
  'Vieja':         { t:[24,28], ph:[7.0,8.0], gh:[5,20], kh:[3,10], vol:400, len:30 },
  'Megalechis':    { t:[22,28], ph:[6.0,8.0], gh:[3,20], kh:[2,10], vol:100, len:13 },
  'Helostoma':     { t:[24,28], ph:[6.0,8.0], gh:[5,20], kh:[3,10], vol:200, len:20 },
  'Acaronia':      { t:[24,28], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:200, len:15 },
  'Cleithracara':  { t:[24,28], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:80,  len:8 },
  'Acreichthys':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:150, len:10 },
};

const BEHAVIORS = {
  'Anabas': "Poisson robuste et adaptable, capable de respirer l'air atmosphérique. Peut se montrer territorial. Aquarium couvert impératif.",
  'Aplocheilus': "Petit poisson de surface, prédateur de petits invertébrés. Aquarium planté avec couvert végétal de surface. Couvrir l'aquarium.",
  'Benitochromis': "Cichlidé nain paisible d'Afrique de l'Ouest. Territorial en période de reproduction. Aquarium planté avec cachettes.",
  'Bujurquina': "Cichlidé sud-américain territorial mais relativement pacifique. Creuse le substrat. Aquarium spacieux avec cachettes.",
  'Genicanthus': "Poisson ange récifal, l'un des rares du genre adapté aux aquariums récifaux. Nage en pleine eau. Nécessite un grand volume.",
  'Girardinus': "Petit vivipare paisible et actif. Maintenir en groupe avec plus de femelles que de mâles dans un aquarium planté.",
  'Hypostomus': "Pléco robuste et nocturne. Nécessite un grand aquarium avec cachettes (racines, grottes). Courant modéré à fort.",
  'Metynnis': "Poisson grégaire et herbivore. À maintenir en banc dans un très grand aquarium. Peut dévorer les plantes.",
  'Mystus': "Poisson-chat asiatique actif et grégaire. Nocturne, nécessite des cachettes. Peut manger les poissons plus petits.",
  'Nannacara': "Cichlidé nain d'Amérique du Sud, paisible sauf en période de reproduction. Aquarium planté avec cachettes.",
  'Neolebias': "Petit poisson africain grégaire et paisible. À maintenir en banc dans un aquarium densément planté avec éclairage tamisé.",
  'Ompok': "Poisson-chat asiatique nocturne et prédateur. Nécessite un aquarium spacieux avec cachettes. Peut manger les petits poissons.",
  'Petrochromis': "Cichlidé du lac Tanganyika très territorial et agressif. Nécessite un grand aquarium rocheux. Eau dure et alcaline.",
  'Pyrrhulina': "Petit poisson de surface paisible et calme. Aquarium planté avec couvert végétal de surface et courant faible.",
  'Rhinecanthus': "Baliste territorial et parfois agressif. Nécessite un très grand aquarium marin avec cachettes. Peut réarranger le décor.",
  'Rhinogobius': "Petit gobie d'eau douce à tempérée. Territorial au sol. Substrat de gravier fin et pierres plates pour la ponte.",
  'Sundadanio': "Micro-poisson très timide et fragile. Aquarium spécifique avec eau très acide et douce, densément planté.",
  'Vieja': "Grand cichlidé centraméricain territorial. Nécessite un très grand aquarium avec cachettes et substrat solide.",
  'Megalechis': "Poisson-chat paisible et robuste. Nocturne, apprécie les cachettes. Peut respirer l'air en surface.",
  'Helostoma': "Gourami robuste et pacifique. Ses « baisers » sont en réalité des comportements territoriaux. Grand aquarium nécessaire.",
  'Cleithracara': "Cichlidé nain très paisible, idéal pour les aquariums communautaires. Timide, nécessite des cachettes.",
  'Acreichthys': "Petit poisson-lime récifal paisible. Connu pour manger les Aiptasia (anémones parasites). Adapté aux nano-récifaux.",
};

let stats = { vol: 0, temp: 0, ph: 0, gh: 0, kh: 0, len: 0, beh: 0 };

files.forEach(f => {
  const filePath = path.join(dir, f);
  const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;
  const genus = (d.scientificName || '').split(' ')[0];
  const defaults = EXTRA[genus];

  if (defaults) {
    if (!d.minVolumeL || d.minVolumeL === 0) {
      d.minVolumeL = defaults.vol; changed = true; stats.vol++;
    }
    if (!d.tempMin || d.tempMin === 0) {
      d.tempMin = defaults.t[0]; d.tempMax = defaults.t[1]; changed = true; stats.temp++;
    }
    if (!d.phMin || d.phMin === 0) {
      d.phMin = defaults.ph[0]; d.phMax = defaults.ph[1]; changed = true; stats.ph++;
    }
    if (d.ghMin == null && defaults.gh[0] != null) {
      d.ghMin = defaults.gh[0]; d.ghMax = defaults.gh[1]; changed = true; stats.gh++;
    }
    if (d.khMin == null && defaults.kh[0] != null) {
      d.khMin = defaults.kh[0]; d.khMax = defaults.kh[1]; changed = true; stats.kh++;
    }
    if (!d.minLengthCm || d.minLengthCm === 0) {
      d.minLengthCm = defaults.len; changed = true; stats.len++;
    }
  }

  if ((!d.behavior || d.behavior.trim() === '') && BEHAVIORS[genus]) {
    d.behavior = BEHAVIORS[genus];
    changed = true; stats.beh++;
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(d, null, 2), 'utf8');
  }
});

console.log('Fixed:', stats);

// Final audit
let gaps = { vol: [], temp: [], ph: [], gh: 0, kh: 0, beh: [] };
files.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const g = (d.scientificName || '').split(' ')[0];
  if (!d.minVolumeL) gaps.vol.push(g + ': ' + d.scientificName);
  if (!d.tempMin) gaps.temp.push(g + ': ' + d.scientificName);
  if (!d.phMin) gaps.ph.push(g + ': ' + d.scientificName);
  if (d.ghMin == null) gaps.gh++;
  if (d.khMin == null) gaps.kh++;
  if (!d.behavior || !d.behavior.trim()) gaps.beh.push(g + ': ' + d.scientificName);
});

console.log('\n=== REMAINING GAPS ===');
console.log('Volume missing (' + gaps.vol.length + '):', gaps.vol);
console.log('Temp missing (' + gaps.temp.length + '):', gaps.temp);
console.log('pH missing (' + gaps.ph.length + '):', gaps.ph);
console.log('GH missing:', gaps.gh, '(mostly marine - expected)');
console.log('KH missing:', gaps.kh);
console.log('Behavior missing (' + gaps.beh.length + '):', gaps.beh.slice(0, 30));
