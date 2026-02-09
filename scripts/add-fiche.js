const fs = require('fs').promises;
const path = require('path');

const CONTENT = path.join(__dirname,'..','content','fiches');

function slugify(s){
  return s.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g,'');
}

async function main(){
  const name = process.argv[2];
  if(!name){
    console.log('Usage: node add-fiche.js "Common Name" [slug]');
    process.exit(1);
  }
  const slug = process.argv[3] || slugify(name);
  const file = path.join(CONTENT, `${slug}.json`);
  try{
    await fs.mkdir(CONTENT, { recursive: true });
    const template = {
      name: name,
      scientificName: '',
      slug: slug,
      biotope: '',
      difficulty: 3,
      tempMin: null,
      tempMax: null,
      phMin: null,
      phMax: null,
      ghMin: null,
      ghMax: null,
      minVolumeL: null,
      minLengthCm: null,
      behavior: '',
      compatibility: '',
      diet: '',
      breeding: '',
      notes: '',
      sources: [],
      images: [],
      gallery: [],
      tags: []
    };
    await fs.writeFile(file, JSON.stringify(template, null, 2), 'utf8');
    console.log('Created', file);
  }catch(e){
    console.error(e);
  }
}

main();
