const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'public');
const TEMPLATES = path.join(ROOT, 'templates');

/* ── Helpers ─────────────────────────────────────── */
function slugify(s) {
  return s.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function readJSON(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyDir(src, dest) {
  try {
    const entries = await fs.readdir(src, { withFileTypes: true });
    await ensureDir(dest);
    for (const e of entries) {
      const srcPath = path.join(src, e.name);
      const destPath = path.join(dest, e.name);
      if (e.isDirectory()) await copyDir(srcPath, destPath);
      else if (e.isFile()) await fs.copyFile(srcPath, destPath);
    }
  } catch (_) { /* dir missing */ }
}

function relPath(from, to) {
  let r = path.relative(from, to).split(path.sep).join('/');
  if (r === '') r = '.';
  if (!r.endsWith('/')) r = r === '.' ? './' : r + '/';
  return r;
}

function diffBadgeClass(n) {
  if (n <= 1) return 'badge-green';
  if (n === 2) return 'badge-teal';
  if (n === 3) return 'badge-amber';
  return 'badge-red';
}
function diffLabel(n) {
  if (n <= 1) return 'Facile';
  if (n === 2) return 'Moyen';
  if (n === 3) return 'Difficile';
  return 'Expert';
}

/* ── Inline SVG icons ──────────────────────────────── */
const ICONS = {
  temp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V6a2 2 0 10-4 0v8.76a4 4 0 104 0z"/></svg>',
  ph:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s6 5.5 6 9.5a6 6 0 11-12 0C6 7.5 12 2 12 2z"/></svg>',
  gh:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10"/></svg>',
  size: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M7 8v8M17 8v8"/></svg>',
  bio:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 6 3 7 3 12c0 4 4 8 9 10 5-2 9-6 9-10 0-5-5-6-9-10z"/></svg>',
  vol:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20V4h12v16H6z"/><path d="M6 12h12"/></svg>',
};

/* ── Build fiche HTML content ──────────────────────── */
function buildFicheContent(f, assetPath) {
  const diff = Number(f.difficulty) || 0;

  // Hero image
  const rawImg = (f.images && f.images[0]) || '';
  const imgSrc = rawImg && !/^https?:\/\//.test(rawImg) ? assetPath + rawImg : rawImg;
  const heroImg = imgSrc
    ? `<img class="fiche-hero-img" src="${imgSrc}" alt="${f.name}" style="width:100%;max-height:340px;object-fit:cover;border-radius:var(--radius-lg);margin-bottom:1.5rem;cursor:pointer">`
    : '';

  // Difficulty dots
  let dots = '';
  for (let i = 1; i <= 5; i++) dots += `<span class="dot${i <= diff ? ' filled' : ''}" aria-hidden="true"></span>`;

  // Badges
  const badges = `<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin:.75rem 0">
    <span class="badge ${diffBadgeClass(diff)}">${diffLabel(diff)}</span>
    <span class="badge badge-slate">${f.biotope || '—'}</span>
    <span class="badge badge-slate">${f.minVolumeL || '—'} L</span>
    <span class="badge badge-slate">${f.minLengthCm || '—'} cm</span>
  </div>`;

  // Params grid
  const params = `<div class="params-grid">
    <div class="param-card"><span class="icon">${ICONS.temp}</span><div><strong>Température</strong><div class="value">${f.tempMin || '—'} – ${f.tempMax || '—'} °C</div></div></div>
    <div class="param-card"><span class="icon">${ICONS.ph}</span><div><strong>pH</strong><div class="value">${f.phMin || '—'} – ${f.phMax || '—'}</div></div></div>
    <div class="param-card"><span class="icon">${ICONS.gh}</span><div><strong>GH</strong><div class="value">${f.ghMin || '—'} – ${f.ghMax || '—'}</div></div></div>
    <div class="param-card"><span class="icon">${ICONS.gh}</span><div><strong>KH</strong><div class="value">${f.khMin || '—'} – ${f.khMax || '—'}</div></div></div>
    <div class="param-card"><span class="icon">${ICONS.size}</span><div><strong>Taille adulte</strong><div class="value">${f.minLengthCm || '—'} cm</div></div></div>
    <div class="param-card"><span class="icon">${ICONS.vol}</span><div><strong>Volume min.</strong><div class="value">${f.minVolumeL || '—'} L</div></div></div>
  </div>`;

  // Takeaway
  const summary = f.summary || (f.notes ? (f.notes.split('.').filter(Boolean)[0] || '') : '');
  const takeaway = summary ? `<div class="takeaway-box"><strong>À retenir :</strong> ${summary}.</div>` : '';

  // Sections
  function sec(title, body) {
    if (!body) return '';
    return `<section style="margin-top:1.5rem"><h3 style="font-size:1.1rem;font-weight:700;margin-bottom:.5rem">${title}</h3><p style="color:var(--muted);line-height:1.7">${body}</p></section>`;
  }

  // Errors box
  const errors = `<div class="errors-box" style="margin-top:1.5rem">
    <strong>Erreurs courantes :</strong>
    <ul>
      <li>Maintenir en bac trop petit malgré la taille adulte</li>
      <li>Ignorer les paramètres d'eau spécifiques du biotope</li>
    </ul>
  </div>`;

  return `
    <header>
      <h1 style="font-size:1.8rem;font-weight:700">${f.name}</h1>
      <p style="font-style:italic;color:var(--muted);margin-top:.15rem">${f.scientificName || ''}</p>
      <div class="diff-dots" style="margin-top:.5rem">${dots}</div>
      ${badges}
    </header>
    ${heroImg}
    ${takeaway}
    ${params}
    ${sec('Comportement & compatibilité', (f.behavior || '') + (f.compatibility ? ' — ' + f.compatibility : ''))}
    ${sec('Alimentation', f.diet)}
    ${sec('Reproduction', f.breeding)}
    ${sec('Conseils de maintenance', f.notes)}
    ${errors}
  `;
}

/* ═══════════════════════════════════════════════════════
   Main build
   ═══════════════════════════════════════════════════════ */
async function build() {
  console.log('Building Nerithys…');
  await ensureDir(OUT);

  /* ── 1. Copy assets ─────────────────────────────── */
  await copyDir(path.join(ROOT, 'css'), path.join(OUT, 'css'));
  await copyDir(path.join(ROOT, 'js'), path.join(OUT, 'js'));
  await copyDir(CONTENT, path.join(OUT, 'content'));

  // Copy only index.html from root (no legacy HTML)
  const allowed = ['index.html'];
  for (const fn of allowed) {
    const src = path.join(ROOT, fn);
    try { await fs.access(src); await fs.copyFile(src, path.join(OUT, fn)); } catch (_) {}
  }

  /* ── 2. Read content JSON ───────────────────────── */
  let fiches = [];
  try {
    const files = await fs.readdir(path.join(CONTENT, 'fiches'));
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      fiches.push(await readJSON(path.join(CONTENT, 'fiches', f)));
    }
  } catch (e) { console.warn('No fiches:', e.message); }

  let articles = [];
  try {
    const files = await fs.readdir(path.join(CONTENT, 'articles'));
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      articles.push(await readJSON(path.join(CONTENT, 'articles', f)));
    }
  } catch (_) {}

  // Write aggregated fiches.json for client-side JS
  await ensureDir(path.join(OUT, 'content'));
  await fs.writeFile(path.join(OUT, 'content', 'fiches.json'), JSON.stringify(fiches, null, 2), 'utf8');

  /* ── 3. Load templates ──────────────────────────── */
  const ficheTpl = await fs.readFile(path.join(TEMPLATES, 'fiche-template.html'), 'utf8');
  const listingTpl = await fs.readFile(path.join(TEMPLATES, 'listing-template.html'), 'utf8');

  /* ── 4. Generate fiche pages ────────────────────── */
  for (const f of fiches) {
    const slug = f.slug || slugify(f.name || 'untitled');
    const dir = path.join(OUT, 'fiches', slug);
    await ensureDir(dir);

    const title = `${f.name} — Nerithys`;
    const desc = (f.notes && f.notes.substring(0, 160)) || `${f.name} — fiche maintenance, paramètres et conseils.`;
    const ap = relPath(dir, OUT);

    let ogImage = (f.images && f.images[0]) || '';
    if (ogImage && !/^https?:\/\//.test(ogImage)) ogImage = ap + ogImage;

    const jsonld = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Thing',
      name: f.name,
      alternateName: f.scientificName,
      description: desc,
    });

    const html = ficheTpl
      .replace(/{{ASSET_PATH}}/g, ap)
      .replace(/{{TITLE}}/g, title)
      .replace(/{{DESCRIPTION}}/g, desc)
      .replace(/{{OG_IMAGE}}/g, ogImage)
      .replace(/{{JSON_LD}}/g, jsonld)
      .replace(/{{CONTENT}}/g, buildFicheContent(f, ap));

    await fs.writeFile(path.join(dir, 'index.html'), html, 'utf8');
    console.log('  ✓ fiche', slug);
  }

  /* ── 5. Generate listing page ───────────────────── */
  const listingDir = path.join(OUT, 'fiches');
  await ensureDir(listingDir);
  const listingAP = relPath(listingDir, OUT);
  // Listing is JS-driven (ui.js fetches fiches.json), no static cards needed
  const listingHtml = listingTpl.replace(/{{ASSET_PATH}}/g, listingAP);
  await fs.writeFile(path.join(listingDir, 'index.html'), listingHtml, 'utf8');
  console.log('  ✓ listing');

  /* ── 6. Sitemap ─────────────────────────────────── */
  const base = 'https://massin-aliouche.github.io/Nerithys/';
  let urls = [base, base + 'fiches/'];
  for (const f of fiches) urls.push(base + 'fiches/' + (f.slug || slugify(f.name)) + '/');
  for (const a of articles) urls.push(base + 'articles/' + (a.slug || slugify(a.title)) + '/');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`;
  await fs.writeFile(path.join(OUT, 'sitemap.xml'), sitemap, 'utf8');

  /* ── 7. robots.txt ──────────────────────────────── */
  await fs.writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`, 'utf8');

  /* ── 8. RSS ─────────────────────────────────────── */
  if (articles.length) {
    const items = articles.map(a => `<item><title>${a.title}</title><link>${base}articles/${a.slug || slugify(a.title)}/</link><pubDate>${new Date(a.date || Date.now()).toUTCString()}</pubDate><description>${a.summary || ''}</description></item>`).join('\n');
    const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Nerithys — Articles</title><link>${base}</link>${items}</channel></rss>`;
    await fs.writeFile(path.join(OUT, 'rss.xml'), rss, 'utf8');
  }

  console.log('Build complete →', OUT);
}

build().catch(err => { console.error(err); process.exit(1); });
