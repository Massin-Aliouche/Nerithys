const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const FICHES = path.join(CONTENT, 'fiches');
const OUT_DIR = path.join(CONTENT, 'external');

async function ensureDir(dir){ await fs.mkdir(dir, { recursive: true }); }

function getClient(url){ return url.startsWith('https') ? https : http }

function basenameFromUrl(url){ try{ const u = new URL(url); const b = path.basename(u.pathname); return b || 'image'; }catch(e){ return 'image' } }

async function download(url, dest){
  const client = getClient(url);
  return new Promise((resolve, reject)=>{
    client.get(url, res=>{
      if(res.statusCode >= 400) return reject(new Error('Failed to fetch '+url+' status '+res.statusCode));
      const out = fs.createWriteStream(dest);
      streamPipeline(res, out).then(()=>resolve()).catch(reject);
    }).on('error', reject);
  });
}

async function run(){
  await ensureDir(OUT_DIR);
  const manifest = {};
  try{
    const files = await fs.readdir(FICHES);
    for(const f of files){
      if(!f.endsWith('.json')) continue;
      const raw = await fs.readFile(path.join(FICHES, f), 'utf8');
      const data = JSON.parse(raw);
      const slug = data.slug || path.parse(f).name;
      const imgs = data.images || [];
      for(let i=0;i<imgs.length;i++){
        const url = imgs[i];
        if(!/^https?:\/\//.test(url)) continue;
        try{
          const extGuess = path.extname(basenameFromUrl(url)) || '.jpg';
          const fname = `${slug}-${i}${extGuess}`.replace(/[^a-zA-Z0-9-._]/g,'');
          const dest = path.join(OUT_DIR, fname);
          // skip if already exists
          try{ await fs.access(dest); }catch(e){ await download(url, dest); }
          manifest[url] = `external/${fname}`;
        }catch(err){ console.warn('download failed', url, err.message) }
      }
    }
  }catch(e){ console.warn('no fiches or error', e.message) }
  await fs.writeFile(path.join(CONTENT,'external-images.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Fetched external images:', Object.keys(manifest).length);
}

run().catch(err=>{ console.error(err); process.exit(1) });
