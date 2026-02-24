/* Nerithys — build.js (Static site generator) */
const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const PUB     = path.join(ROOT, 'public');
const FICHES  = path.join(ROOT, 'content', 'fiches');
const TPL_DIR = path.join(ROOT, 'templates');

/* ── Utils ─────────────────────────────────────── */
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function relPath(from, to) {
  let r = path.relative(from, to).replace(/\\/g, '/');
  if (!r) r = '.';
  return r.endsWith('/') ? r : r + '/';
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── External images ───────────────────────────── */
let extImgs = {};
try {
  const f = path.join(ROOT, 'content', 'external-images.json');
  if (fs.existsSync(f)) extImgs = JSON.parse(fs.readFileSync(f, 'utf8'));
} catch (e) { /* no-op */ }

function resolveImg(url, assetPath) {
  if (!url) return '';
  if (extImgs[url]) return assetPath + 'content/' + extImgs[url];
  if (/^https?:\/\//.test(url)) return url;
  return assetPath + url;
}

/* ── Templates ─────────────────────────────────── */
const ficheTpl   = fs.readFileSync(path.join(TPL_DIR, 'fiche-template.html'), 'utf8');
const listingTpl = fs.readFileSync(path.join(TPL_DIR, 'listing-template.html'), 'utf8');
const legalTpl   = fs.readFileSync(path.join(TPL_DIR, 'mentions-legales-template.html'), 'utf8');

/* ── Load fiches ───────────────────────────────── */
function loadFiches() {
  return fs.readdirSync(FICHES)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(FICHES, f), 'utf8')))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
}

/* ── Difficulty helpers ────────────────────────── */
function diffLabel(n) {
  if (n <= 1) return 'Facile';
  if (n === 2) return 'Moyen';
  if (n === 3) return 'Difficile';
  return 'Expert';
}
function diffBadge(n) {
  if (n <= 1) return 'badge-green-solid';
  if (n === 2) return 'badge-teal-solid';
  if (n === 3) return 'badge-amber-solid';
  return 'badge-red-solid';
}
function diffDots(n) {
  let h = '<span class="diff-dots">';
  for (let i = 1; i <= 4; i++) h += '<span class="dot' + (i <= n ? ' filled' : '') + '"></span>';
  return h + '</span>';
}

/* ── Param card ────────────────────────────────── */
function paramCard(label, value) {
  if (!value || value === 'null') return '';
  return '<div class="param-card"><div class="label">' + esc(label) + '</div><div class="value">' + esc(value) + '</div></div>';
}

/* ── Build fiche content HTML ──────────────────── */
function buildContent(d, ap) {
  const diff = Number(d.difficulty) || 0;
  const img = resolveImg((d.images && d.images[0]) || '', ap);
  let h = '';

  // Title
  h += '<h1>' + esc(d.name) + '</h1>';
  h += '<p style="color:var(--muted);margin:-.3rem 0 1.25rem"><em>' + esc(d.scientificName || '') + '</em></p>';

  // Hero image
  if (img) {
    h += '<img class="fiche-hero-img" src="' + img + '" alt="' + esc(d.name) + '" loading="lazy" onerror="this.style.display=\'none\'">';
  }

  // Badges
  h += '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem">';
  h += '<span class="badge ' + diffBadge(diff) + '">' + diffLabel(diff) + '</span>';
  h += '<span class="badge badge-slate-solid">' + esc(d.biotope || '') + '</span>';
  if (d.tags && d.tags.length) {
    d.tags.forEach(function (t) {
      h += '<span class="badge badge-teal-solid">' + esc(t) + '</span>';
    });
  }
  h += '</div>';

  // Difficulty dots
  h += '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1.25rem">';
  h += '<span style="font-size:.82rem;color:var(--muted);font-weight:600">Difficulté :</span>';
  h += diffDots(diff);
  h += '<span style="font-size:.82rem;font-weight:600">' + diffLabel(diff) + '</span>';
  h += '</div>';

  // Parameters
  let params = '';
  if (d.tempMin != null && d.tempMax != null) params += paramCard('Température', d.tempMin + ' – ' + d.tempMax + ' °C');
  if (d.phMin != null && d.phMax != null) params += paramCard('pH', d.phMin + ' – ' + d.phMax);
  if (d.ghMin != null && d.ghMax != null) params += paramCard('GH', d.ghMin + ' – ' + d.ghMax);
  if (d.khMin != null && d.khMax != null) params += paramCard('KH', d.khMin + ' – ' + d.khMax);
  if (d.minVolumeL) params += paramCard('Volume min.', d.minVolumeL + ' L');
  if (d.minLengthCm) params += paramCard('Taille adulte', d.minLengthCm + ' cm');
  if (params) h += '<div class="params-grid">' + params + '</div>';

  // Sections
  [['Comportement', d.behavior], ['Compatibilité', d.compatibility], ['Alimentation', d.diet], ['Reproduction', d.breeding]].forEach(function (s) {
    if (s[1]) {
      h += '<div class="fiche-section"><h3>' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p></div>';
    }
  });

  // Notes
  if (d.notes) {
    h += '<div class="info-box info-box-teal" style="margin-top:1.5rem"><strong>À retenir :</strong> ' + esc(d.notes) + '</div>';
  }

  // Gallery
  if (d.gallery && d.gallery.length) {
    h += '<div class="fiche-section"><h3>Galerie</h3>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.75rem;margin-top:.75rem">';
    d.gallery.forEach(function (g) {
      h += '<img class="fiche-hero-img" src="' + resolveImg(g, ap) + '" alt="" loading="lazy" style="max-height:180px" onerror="this.style.display=\'none\'">';
    });
    h += '</div></div>';
  }

  return h;
}

/* ── JSON-LD ───────────────────────────────────── */
function jsonLd(d) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "name": d.name || '',
    "description": d.behavior || '',
    "about": { "@type": "Thing", "name": d.scientificName || '' }
  });
}

/* ── Build fiche page ──────────────────────────── */
function buildFiche(d) {
  const slug = d.slug || '';
  const outDir = path.join(PUB, 'fiches', slug);
  ensureDir(outDir);
  const ap = relPath(outDir, PUB);
  const content = buildContent(d, ap);
  const img = resolveImg((d.images && d.images[0]) || '', ap);

  const page = ficheTpl
    .replace(/\{\{ASSET_PATH\}\}/g, ap)
    .replace(/\{\{TITLE\}\}/g, esc(d.name + ' — Nerithys'))
    .replace(/\{\{DESCRIPTION\}\}/g, esc((d.behavior || d.name || '') + ' | Nerithys'))
    .replace(/\{\{OG_IMAGE\}\}/g, img)
    .replace(/\{\{JSON_LD\}\}/g, jsonLd(d))
    .replace(/\{\{CONTENT\}\}/g, content);

  fs.writeFileSync(path.join(outDir, 'index.html'), page, 'utf8');
}

/* ── Build listing ─────────────────────────────── */
function buildListing() {
  const outDir = path.join(PUB, 'fiches');
  ensureDir(outDir);
  const ap = relPath(outDir, PUB);
  fs.writeFileSync(path.join(outDir, 'index.html'), listingTpl.replace(/\{\{ASSET_PATH\}\}/g, ap), 'utf8');
}

/* ── Build legal page ──────────────────────────── */
function buildLegal() {
  const outDir = path.join(PUB, 'mentions-legales');
  ensureDir(outDir);
  const ap = relPath(outDir, PUB);
  fs.writeFileSync(path.join(outDir, 'index.html'), legalTpl.replace(/\{\{ASSET_PATH\}\}/g, ap), 'utf8');
}

/* ── Build fiches.json ─────────────────────────── */
function buildFichesJson(fiches) {
  const outDir = path.join(PUB, 'content');
  ensureDir(outDir);
  const data = fiches.map(function (f) {
    const c = Object.assign({}, f);
    if (c.images && c.images.length) {
      c.images = c.images.map(function (img) {
        return extImgs[img] ? 'content/' + extImgs[img] : img;
      });
    }
    return c;
  });
  fs.writeFileSync(path.join(outDir, 'fiches.json'), JSON.stringify(data, null, 2), 'utf8');
}

/* ── Copy helpers ──────────────────────────────── */
function copyDir(src, dest) {
  ensureDir(dest);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
function copyFile(s, d) {
  if (fs.existsSync(s)) { ensureDir(path.dirname(d)); fs.copyFileSync(s, d); }
}

/* ── SEO ───────────────────────────────────────── */
function buildSeo(fiches) {
  const base = 'https://massin-aliouche.github.io/Nerithys/';
  const now = new Date().toISOString().slice(0, 10);

  // robots.txt
  fs.writeFileSync(path.join(PUB, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + base + 'sitemap.xml\n', 'utf8');

  // sitemap
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '  <url><loc>' + base + '</loc><lastmod>' + now + '</lastmod></url>\n';
  xml += '  <url><loc>' + base + 'fiches/</loc><lastmod>' + now + '</lastmod></url>\n';
  xml += '  <url><loc>' + base + 'mentions-legales/</loc><lastmod>' + now + '</lastmod></url>\n';
  fiches.forEach(f => { xml += '  <url><loc>' + base + 'fiches/' + encodeURIComponent(f.slug) + '/</loc><lastmod>' + now + '</lastmod></url>\n'; });
  xml += '</urlset>\n';
  fs.writeFileSync(path.join(PUB, 'sitemap.xml'), xml, 'utf8');

  // rss
  let rss = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n';
  rss += '<title>Nerithys</title><link>' + base + '</link><description>Fiches aquatiques</description>\n';
  fiches.forEach(f => {
    rss += '<item><title>' + esc(f.name) + '</title><link>' + base + 'fiches/' + encodeURIComponent(f.slug) + '/</link></item>\n';
  });
  rss += '</channel></rss>\n';
  fs.writeFileSync(path.join(PUB, 'rss.xml'), rss, 'utf8');
}

/* ═══════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════ */
function build() {
  console.log('[build] Starting...');
  ensureDir(PUB);

  const fiches = loadFiches();
  console.log('[build] ' + fiches.length + ' fiches loaded');

  // CSS
  copyDir(path.join(ROOT, 'css'), path.join(PUB, 'css'));

  // JS
  ensureDir(path.join(PUB, 'js'));
  copyFile(path.join(ROOT, 'js', 'main.js'), path.join(PUB, 'js', 'main.js'));
  copyFile(path.join(ROOT, 'js', 'ui.js'), path.join(PUB, 'js', 'ui.js'));
  copyFile(path.join(ROOT, 'js', 'species.js'), path.join(PUB, 'js', 'species.js'));

  // Content assets (images, not source JSON)
  if (fs.existsSync(path.join(ROOT, 'content'))) {
    const out = path.join(PUB, 'content');
    ensureDir(out);
    for (const e of fs.readdirSync(path.join(ROOT, 'content'), { withFileTypes: true })) {
      const s = path.join(ROOT, 'content', e.name), d = path.join(out, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'fiches' && e.name !== 'articles') copyDir(s, d);
      } else if (!e.name.endsWith('.json') || e.name === 'external-images.json') {
        copyFile(s, d);
      }
    }
  }

  // Homepage
  if (fs.existsSync(path.join(ROOT, 'index.html'))) {
    fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(PUB, 'index.html'));
  }

  // .nojekyll (prevent Jekyll processing on GitHub Pages)
  fs.writeFileSync(path.join(PUB, '.nojekyll'), '', 'utf8');

  // Build outputs
  buildFichesJson(fiches);
  buildListing();
  buildLegal();
  fiches.forEach(buildFiche);
  buildSeo(fiches);

  console.log('[build] Done! ' + fiches.length + ' fiches, listing, sitemap, rss generated.');
}

build();
