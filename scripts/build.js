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

async function build(){
  await ensureDir(OUT);

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

    let outHtml = ficheTpl.replace(/{{ASSET_PATH}}/g, relToRoot)
      .replace(/{{TITLE}}/g, title)
      .replace(/{{DESCRIPTION}}/g, description)
      .replace(/{{OG_IMAGE}}/g, (f.images && f.images[0]) || '')
      .replace(/{{JSON_LD}}/g, JSON.stringify(jsonld))
      .replace(/{{CONTENT}}/g, `<!-- Content generated -->\n<div class="card"><h1>${f.name} <small class="muted">${f.scientificName}</small></h1>
<p class="muted">Biotope: ${f.biotope} · Difficulté: ${f.difficulty}</p>
<h3>Paramètres</h3>
<ul><li>Temp: ${f.tempMin}–${f.tempMax} °C</li><li>pH: ${f.phMin}–${f.phMax}</li><li>GH: ${f.ghMin}–${f.ghMax}</li><li>KH: ${f.khMin}–${f.khMax}</li></ul>
<h3>Volume / dimensions</h3><p>Volume minimum: ${f.minVolumeL} L · Taille adulte: ${f.minLengthCm} cm</p>
<h3>Comportement & compatibilité</h3><p>${f.behavior}</p><h3>Alimentation</h3><p>${f.diet}</p><h3>Reproduction</h3><p>${f.breeding}</p><h3>Conseils</h3><p>${f.notes}</p></div>`);

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
