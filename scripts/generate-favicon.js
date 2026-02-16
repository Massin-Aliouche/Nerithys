const Jimp = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function make(){
  const outDir = path.resolve(__dirname, '..', 'content');
  await fs.promises.mkdir(outDir, { recursive: true });
  const size = 128;

  // create transparent canvas
  const image = new Jimp(size, size, 0x00000000);

  // accent color plate (circular)
  const accent = { r: 43, g:182, b:164, a:255 };
  const cx = Math.floor(size/2), cy = Math.floor(size/2), r = Math.floor(size*0.45);
  image.scan(0,0,size,size,function(x,y){
    const dx = x-cx; const dy = y-cy;
    if(dx*dx+dy*dy <= r*r){
      this.setPixelColor(Jimp.rgbaToInt(accent.r,accent.g,accent.b,accent.a), x, y);
    }
  });

  // draw white fish silhouette (simple ellipse body + tail)
  const white = Jimp.rgbaToInt(255,255,255,255);
  // body ellipse
  const bx = Math.floor(cx - size*0.06), by = cy; const brx = Math.floor(size*0.26), bry = Math.floor(size*0.18);
  image.scan(0,0,size,size,function(x,y){
    const dx = (x-bx)/brx; const dy = (y-by)/bry;
    if(dx*dx+dy*dy <= 1){ this.setPixelColor(white, x, y); }
  });

  // tail triangle (simple fill)
  const tx1 = Math.floor(cx + size*0.18), ty1 = Math.floor(cy - size*0.06);
  const tx2 = Math.floor(cx + size*0.36), ty2 = Math.floor(cy - size*0.16);
  const tx3 = Math.floor(cx + size*0.36), ty3 = Math.floor(cy + size*0.14);
  function area(x1,y1,x2,y2,x3,y3){ return Math.abs((x1*(y2-y3)+x2*(y3-y1)+x3*(y1-y2))/2); }
  const A = area(tx1,ty1,tx2,ty2,tx3,ty3);
  for(let x = Math.min(tx1,tx2,tx3); x<=Math.max(tx1,tx2,tx3); x++){
    for(let y = Math.min(ty1,ty2,ty3); y<=Math.max(ty1,ty2,ty3); y++){
      const A1 = area(x,y,tx2,ty2,tx3,ty3);
      const A2 = area(tx1,ty1,x,y,tx3,ty3);
      const A3 = area(tx1,ty1,tx2,ty2,x,y);
      if(Math.abs((A1+A2+A3)-A) < 1) image.setPixelColor(white, x, y);
    }
  }

  // eye (subtle)
  const eyeX = Math.floor(cx - size*0.12), eyeY = cy - Math.floor(size*0.02);
  image.setPixelColor(Jimp.rgbaToInt(0,0,0,180), eyeX, eyeY);

  // write PNG sizes (round, keep transparency)
  const sizes = [16,32,48,64,96,128,192];
  for(const s of sizes){
    const p = path.join(outDir, `favicon-${s}.png`);
    await image.clone().resize(s,s).writeAsync(p);
  }

  // produce ICO (contains 16x16,32x32,48x48,64x64)
  const icoBuffers = [];
  const icoSizes = [64,48,32,16];
  for(const s of icoSizes){
    const buf = await image.clone().resize(s,s).getBufferAsync(Jimp.MIME_PNG);
    icoBuffers.push(buf);
  }
  const icoBuf = await pngToIco(icoBuffers);
  await fs.promises.writeFile(path.join(outDir,'favicon.ico'), icoBuf);

  console.log('Round favicon generated in', outDir);
}

make().catch(err=>{ console.error(err); process.exit(1) });
