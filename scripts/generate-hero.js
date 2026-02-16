const Jimp = require('jimp');
const path = require('path');
const fs = require('fs').promises;

async function make(){
  const outDir = path.resolve(__dirname, '..', 'content');
  await fs.mkdir(outDir, { recursive: true });

  // main hero: wide aquascape-like gradient
  const w = 1600, h = 900;
  const hero = new Jimp(w, h, (err, img) => {});
  for(let y=0;y<h;y++){
    const t = y / (h-1);
    const r = Math.round(6*(1-t) + 12*t + 10);
    const g = Math.round(80*(1-t) + 140*t + 20);
    const b = Math.round(90*(1-t) + 100*t + 60);
    for(let x=0;x<w;x++) hero.setPixelColor(Jimp.rgbaToInt(r,g,b,255), x, y);
  }
  // subtle vignette and texture
  hero.blur(2);
  await hero.quality(85).writeAsync(path.join(outDir,'hero.jpg'));

  // right illustration: portrait/illustrative panel
  const w2 = 800, h2 = 900;
  const right = new Jimp(w2, h2);
  for(let y=0;y<h2;y++){
    const t = y / (h2-1);
    const r = Math.round(12*(1-t) + 20*t + 30);
    const g = Math.round(90*(1-t) + 60*t + 30);
    const b = Math.round(120*(1-t) + 80*t + 40);
    for(let x=0;x<w2;x++) right.setPixelColor(Jimp.rgbaToInt(r,g,b,255), x, y);
  }
  right.blur(1);
  await right.quality(85).writeAsync(path.join(outDir,'hero-right.jpg'));

  console.log('Generated hero images in', outDir);
}

make().catch(err=>{ console.error(err); process.exit(1) });
