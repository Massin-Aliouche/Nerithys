/* Nerithys — classify-african.js */
const fs = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');

const AFRICAN_GENERA = new Set([
  'Pelvicachromis','Hemichromis','Steatocranus','Teleogramma','Lamprologus',
  'Neolamprologus','Julidochromis','Tropheus','Cyphotilapia','Cyprichromis',
  'Aulonocara','Pseudotropheus','Labidochromis','Melanochromis','Metriaclima',
  'Maylandia','Haplochromis','Protomelas','Copadichromis','Dimidiochromis',
  'Nimbochromis','Sciaenochromis','Placidochromis','Otopharynx','Tyrannochromis',
  'Petrotilapia','Labeotropheus','Iodotropheus','Cynotilapia','Chindongo',
  'Astatotilapia','Tilapia','Oreochromis','Sarotherodon','Chromidotilapia',
  'Paratilapia','Nanochromis','Benitochromis','Thysochromis','Enigmatochromis',
  'Congochromis','Limbochromis','Tylochromis','Synodontis','Mochokiella',
  'Chiloglanis','Euchilichthys','Microsynodontis','Hemisynodontis',
  'Brycinus','Phenacogrammus','Alestopetersius','Bathyaethiops','Arnoldichthys',
  'Ladigesia','Lepidarchus','Micralestes','Rhabdalestes','Nannopetersius',
  'Aphyosemion','Fundulopanchax','Epiplatys','Scriptaphyosemion','Callopanchax',
  'Archiaphyosemion','Nothobranchius','Pronothobranchius','Foerschichthys',
  'Plataplochilus','Hypsopanchax','Procatopus','Lamprichthys','Poropanchax',
  'Polypterus','Erpetoichthys','Protopterus','Xenomystus','Papyrocranus',
  'Pantodon','Gnathonemus','Campylomormyrus','Brienomyrus','Marcusenius',
  'Mormyrus','Petrocephalus','Pollimyrus','Stomatorhinus',
  'Ctenopoma','Microctenopoma','Distichodus','Neolebias','Nannocharax',
  'Citharinus','Hydrocynus','Alestes','Auchenoglanis','Parauchenoglanis',
  'Chrysichthys','Clarotes','Clarias','Heterobranchus','Malapterurus',
  'Schilbe','Amphilius','Phractura','Atopochilus',
]);

const AFRICAN_KEYWORDS = [
  'afrique', 'africa', 'congo', 'cameroun', 'cameroon', 'niger', 'nigeria',
  'lac malawi', 'lac tanganyika', 'lac victoria', 'rift', 'malawi', 'tanganyika',
  'victoria', 'senegal', 'guinea', 'sierra leone', 'liberia', 'ghana',
  'ivory coast', 'gabon', 'angola', 'mozambique', 'tanzanie', 'tanzania',
  'kenya', 'ouganda', 'uganda', 'rwanda', 'burundi', 'zambie', 'zambia',
  'zimbabwe', 'ethiopia', 'soudan', 'sudan', 'tchad', 'chad', 'nil', 'nile',
  'volta', 'zambezi', 'limpopo', 'okavango',
];

const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
let count = 0;

files.forEach(f => {
  const fPath = path.join(FICHES, f);
  const j = JSON.parse(fs.readFileSync(fPath, 'utf8'));
  if (j.biotope !== 'Eau douce') return;

  const genus = (j.scientificName || '').split(' ')[0];
  if (AFRICAN_GENERA.has(genus)) {
    j.biotope = 'Eau douce — Afrique';
    fs.writeFileSync(fPath, JSON.stringify(j, null, 2), 'utf8');
    count++;
    return;
  }

  const text = [j.notes || '', j.behavior || '', j.compatibility || ''].join(' ').toLowerCase();
  for (const kw of AFRICAN_KEYWORDS) {
    if (text.includes(kw)) {
      j.biotope = 'Eau douce — Afrique';
      fs.writeFileSync(fPath, JSON.stringify(j, null, 2), 'utf8');
      count++;
      return;
    }
  }
});

console.log('Classified as African:', count);
