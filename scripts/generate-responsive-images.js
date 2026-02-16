const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const OUT_DIR = path.join(CONTENT, 'responsive');

const SIZES = [320, 480, 768, 1024, 1600];

async function ensureDir(dir){
  await fs.mkdir(dir, { recursive: true });
}

async function findImages(dir){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const images = [];
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()){
      images.push(...await findImages(full));
    } else if(e.isFile()){
      const low = e.name.toLowerCase();
      if(low.endsWith('.png') || low.endsWith('.jpg') || low.endsWith('.jpeg')){
        images.push(full);
      }
    }
  }
  return images;
}

function rel(p){
  return path.relative(CONTENT, p).split(path.sep).join('/');
}

async function generate(){
  await ensureDir(OUT_DIR);
  const imgs = await findImages(CONTENT);
  const manifest = {};
  for(const img of imgs){
    // skip files that are already in responsive output
    if(img.includes(`${path.sep}responsive${path.sep}`)) continue;
    const relative = rel(img);
    const parsed = path.parse(relative);
    const destDir = path.join(OUT_DIR, parsed.dir);
    await ensureDir(destDir);
    manifest[relative] = [];
    for(const w of SIZES){
      const outName = `${parsed.name}-w${w}.jpg`;
      const outPath = path.join(destDir, outName);
      try{
        await sharp(img)
          .resize({ width: w })
          .jpeg({ quality: 80 })
          .toFile(outPath);
        manifest[relative].push({ width: w, file: `responsive/${parsed.dir ? parsed.dir + '/' : ''}${outName}` });
      }catch(err){
        console.warn('Failed to process', img, err.message);
      }
    }
  }
  await fs.writeFile(path.join(CONTENT,'responsive-images.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Generated responsive images for', Object.keys(manifest).length, 'source images.');
}

generate().catch(err=>{ console.error(err); process.exit(1); });
