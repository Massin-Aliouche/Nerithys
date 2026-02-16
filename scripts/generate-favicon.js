const Jimp = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function make(){
  const outDir = path.resolve(__dirname, '..', 'content');
  await fs.promises.mkdir(outDir, { recursive: true });
  const size = 128;
  const image = new Jimp(size, size);

  // simple gradient background
  for(let y=0;y<size;y++){
    const t = y/ (size-1);
    const r = Math.round(43*(1-t) + 124*t);
    const g = Math.round(182*(1-t) + 92*t);
    const b = Math.round(164*(1-t) + 255*t);
    for(let x=0;x<size;x++){
      image.setPixelColor(Jimp.rgbaToInt(r,g,b,255), x, y);
    }
  }

  // draw a simple white fish-like shape (circle + tail)
  const white = Jimp.rgbaToInt(255,255,255,230);
  // body circle
  image.scan(0,0,size,size,function(x,y){
    const cx = Math.floor(size*0.45);
    const cy = Math.floor(size*0.5);
    const rx = Math.floor(size*0.28);
    const ry = Math.floor(size*0.22);
    const dx = (x-cx)/rx; const dy = (y-cy)/ry;
    if(dx*dx+dy*dy <= 1){ this.setPixelColor(white, x, y); }
  });

  // tail triangle
  const tailColor = white;
  const tx1 = Math.floor(size*0.73), ty1 = Math.floor(size*0.45);
  const tx2 = Math.floor(size*0.9), ty2 = Math.floor(size*0.35);
  const tx3 = Math.floor(size*0.9), ty3 = Math.floor(size*0.6);
  // simple barycentric fill
  function area(x1,y1,x2,y2,x3,y3){ return Math.abs((x1*(y2-y3)+x2*(y3-y1)+x3*(y1-y2))/2); }
  const A = area(tx1,ty1,tx2,ty2,tx3,ty3);
  for(let x=tx1;x<=tx3;x++){
    for(let y=ty2;y<=ty3;y++){
      const A1 = area(x,y,tx2,ty2,tx3,ty3);
      const A2 = area(tx1,ty1,x,y,tx3,ty3);
      const A3 = area(tx1,ty1,tx2,ty2,x,y);
      if(Math.abs((A1+A2+A3)-A) < 1) image.setPixelColor(tailColor, x, y);
    }
  }

  // write multiple PNG sizes
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

  console.log('Favicon generated in', outDir);
}

make().catch(err=>{ console.error(err); process.exit(1) });
