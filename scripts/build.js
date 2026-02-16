const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'public');
const TEMPLATES = path.join(ROOT, 'templates');

function slugify(s){
  return s.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g,'');
}

async function readJSON(file){
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw);
}

async function ensureDir(dir){
  await fs.mkdir(dir, { recursive: true });
}

async function copyDir(src, dest){
  try{
    const entries = await fs.readdir(src, { withFileTypes: true });
    await ensureDir(dest);
    for(const e of entries){
      const srcPath = path.join(src, e.name);
      const destPath = path.join(dest, e.name);
      if(e.isDirectory()){
        await copyDir(srcPath, destPath);
      } else if(e.isFile()){
        await fs.copyFile(srcPath, destPath);
      }
    }
  }catch(e){ /* ignore missing dirs */ }
}

async function build(){
  await ensureDir(OUT);

  // copy site CSS and JS into public so pages can reference them relatively
  await copyDir(path.join(ROOT,'css'), path.join(OUT,'css'));
  await copyDir(path.join(ROOT,'js'), path.join(OUT,'js'));

  // copy top-level HTML files (index, landing pages) into public root
  try{
    const rootFiles = await fs.readdir(ROOT);
    for(const fn of rootFiles){
      if(fn.endsWith('.html')){
        await fs.copyFile(path.join(ROOT, fn), path.join(OUT, fn));
      }
    }
  }catch(e){ /* ignore */ }

  // copy top-level content assets (images/icons) into public/content so templates can reference them
  await ensureDir(path.join(OUT,'content'));
  try{
    const rootFiles = await fs.readdir(CONTENT);
    for(const fn of rootFiles){
      const full = path.join(CONTENT, fn);
      const stat = await fs.stat(full);
      if(stat.isFile()){
        const lower = fn.toLowerCase();
        if(lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.ico')){
          await fs.copyFile(full, path.join(OUT,'content',fn));
        }
      }
    }
  }catch(e){ /* ignore */ }

  // read fiches
  const fichesDir = path.join(CONTENT, 'fiches');
  let fiches = [];
  try{
    const files = await fs.readdir(fichesDir);
    for(const f of files){
      if(!f.endsWith('.json')) continue;
      const data = await readJSON(path.join(fichesDir, f));
      fiches.push(data);
    }
  }catch(e){
    console.warn('No fiches found', e.message);
  }

  // read articles
  const articlesDir = path.join(CONTENT, 'articles');
  let articles = [];
  try{
    const files = await fs.readdir(articlesDir);
    for(const f of files){
      if(!f.endsWith('.json')) continue;
      const data = await readJSON(path.join(articlesDir, f));
      articles.push(data);
    }
  }catch(e){ /* ignore */ }

  // write public/content index JSON
  await ensureDir(path.join(OUT,'content'));
  await fs.writeFile(path.join(OUT,'content','fiches.json'), JSON.stringify(fiches, null, 2), 'utf8');

  // load templates
  const ficheTpl = await fs.readFile(path.join(TEMPLATES,'fiche-template.html'),'utf8');
  const listingTpl = await fs.readFile(path.join(TEMPLATES,'listing-template.html'),'utf8');

  // generate fiche pages
  for(const f of fiches){
    const slug = f.slug || slugify(f.name || f.commonName || 'untitled');
    const dir = path.join(OUT,'fiches',slug);
    await ensureDir(dir);
    const title = `${f.name} — Nerithys`;
    const description = (f.notes && f.notes.substr(0,160)) || `${f.name} — fiche maintenance, paramètres et conseils.`;

    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'Thing',
      'name': f.name,
      'alternateName': f.scientificName,
      'description': description,
      'additionalProperty': [
        { 'name': 'biotope', 'value': f.biotope },
        { 'name': 'difficulty', 'value': f.difficulty }
      ]
    };

    // compute asset path prefix for this fiche output (relative path from fiche dir to OUT)
    const outDir = dir; // directory where index.html will be written
    let relToRoot = path.relative(outDir, OUT);
    if(relToRoot === '') relToRoot = '.';
    // convert backslashes to slashes for URLs and ensure trailing slash
    relToRoot = relToRoot.split(path.sep).join('/');
    if(!relToRoot.endsWith('/')) relToRoot = relToRoot === '.' ? './' : relToRoot + '/';

    // determine OG image: if it's an absolute URL, use it as-is, otherwise prefix with the asset path
    let ogImage = (f.images && f.images[0]) || '';
    if(ogImage && !/^https?:\/\//.test(ogImage)){
      ogImage = relToRoot + ogImage;
    }

    // badges color by difficulty
    const diff = f.difficulty || '—';
    const diffLabel = typeof diff === 'number' ? diff.toString() : diff;
    const diffColor = (d => {
      if(d==1) return 'bg-green-100 text-green-800';
      if(d==2) return 'bg-teal-100 text-teal-800';
      if(d==3) return 'bg-orange-100 text-orange-800';
      if(d>=4) return 'bg-red-100 text-red-800';
      return 'bg-slate-100 text-slate-700';
    })(diff);

    const imageHtml = (f.images && f.images[0]) ? `<div class="w-full md:w-1/3"><img src="${(f.images&&f.images[0])}" alt="${f.name}" class="w-full h-56 object-cover rounded-lg"/></div>` : '';

    const paramsHtml = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
      <div><strong>Température</strong><div>${f.tempMin||'—'}–${f.tempMax||'—'} °C</div></div>
      <div><strong>pH</strong><div>${f.phMin||'—'}–${f.phMax||'—'}</div></div>
      <div><strong>GH</strong><div>${f.ghMin||'—'}–${f.ghMax||'—'}</div></div>
      <div><strong>KH</strong><div>${f.khMin||'—'}–${f.khMax||'—'}</div></div>
    </div>`;

    const errorsHtml = `<div class="bg-red-50 border border-red-100 p-3 rounded-md text-sm text-red-800"><strong>Erreurs courantes:</strong><ul class="list-disc pl-5 mt-2"><li>Maintenir en petit bac malgré la taille adulte</li><li>Méconnaître la salinité / paramètres marins</li></ul></div>`;

    const badgesHtml = `<div class="flex gap-2 items-center mt-2"><span class="px-2 py-1 text-xs font-medium rounded ${diffColor}">Difficulté: ${diffLabel}</span><span class="px-2 py-1 text-xs bg-slate-100 rounded">Biotope: ${f.biotope||'—'}</span><span class="px-2 py-1 text-xs bg-slate-100 rounded">Taille: ${f.minLengthCm||'—'} cm</span></div>`;

    let outHtml = ficheTpl.replace(/{{ASSET_PATH}}/g, relToRoot)
      .replace(/{{TITLE}}/g, title)
      .replace(/{{DESCRIPTION}}/g, description)
      .replace(/{{OG_IMAGE}}/g, ogImage)
      .replace(/{{JSON_LD}}/g, JSON.stringify(jsonld))
      .replace(/{{CONTENT}}/g, `<!-- Content generated -->\n<div class="flex flex-col md:flex-row gap-6">${imageHtml}<div class="flex-1 space-y-4"><header><h1 class=\"text-2xl font-bold\">${f.name} <small class=\"text-sm text-slate-500\">${f.scientificName||''}</small></h1>${badgesHtml}</header>${paramsHtml}<section><h3 class=\"text-lg font-semibold\">Comportement & compatibilité</h3><p>${f.behavior||''}</p></section><section><h3 class=\"text-lg font-semibold\">Alimentation</h3><p>${f.diet||''}</p></section><section><h3 class=\"text-lg font-semibold\">Reproduction</h3><p>${f.breeding||''}</p></section><section><h3 class=\"text-lg font-semibold\">Conseils</h3><p>${f.notes||''}</p></section>${errorsHtml}</div></div>`);

    await fs.writeFile(path.join(dir,'index.html'), outHtml, 'utf8');
  }

  // generate listing page HTML
  const cards = fiches.map(f => {
    const slug = f.slug || slugify(f.name);
    return `<article class="card"><a href="${slug}/"><h3>${f.name}</h3><p class="muted">${f.scientificName} · ${f.biotope}</p></a></article>`;
  }).join('\n');

  // listing is written to OUT/fiches/index.html, compute ASSET_PATH for that location
  const listingDir = path.join(OUT,'fiches');
  let relListing = path.relative(listingDir, OUT);
  if(relListing === '') relListing = '.';
  relListing = relListing.split(path.sep).join('/');
  if(!relListing.endsWith('/')) relListing = relListing === '.' ? './' : relListing + '/';

  const listingHtml = listingTpl.replace(/{{ASSET_PATH}}/g, relListing)
    .replace(/{{TITLE}}/g, 'Fiches poissons — Nerithys')
    .replace(/{{CARDS}}/g, cards);
  await ensureDir(listingDir);
  await fs.writeFile(path.join(listingDir,'index.html'), listingHtml, 'utf8');

  // sitemap
  let urls = ['https://massin-aliouche.github.io/Nerithys/','https://massin-aliouche.github.io/Nerithys/fiches/'];
  for(const f of fiches){
    const slug = f.slug || slugify(f.name);
    urls.push(`https://massin-aliouche.github.io/Nerithys/fiches/${slug}/`);
  }
  for(const a of articles){
    urls.push(`https://massin-aliouche.github.io/Nerithys/articles/${a.slug || slugify(a.title)}/`);
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`;
  await fs.writeFile(path.join(OUT,'sitemap.xml'), sitemap, 'utf8');

  // robots
  const robots = `User-agent: *\nAllow: /\nSitemap: https://massin-aliouche.github.io/Nerithys/sitemap.xml\n`;
  await fs.writeFile(path.join(OUT,'robots.txt'), robots, 'utf8');

  // RSS for articles
  if(articles.length){
    const items = articles.map(a=>`<item><title>${a.title}</title><link>https://massin-aliouche.github.io/Nerithys/articles/${a.slug || slugify(a.title)}/</link><pubDate>${new Date(a.date||Date.now()).toUTCString()}</pubDate><description>${(a.summary||'')}</description></item>`).join('\n');
    const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Nerithys — Articles</title><link>https://massin-aliouche.github.io/Nerithys/</link>${items}</channel></rss>`;
    await fs.writeFile(path.join(OUT,'rss.xml'), rss, 'utf8');
  }

  console.log('Build complete. Public output in', OUT);
}

build().catch(err=>{ console.error(err); process.exit(1); });
