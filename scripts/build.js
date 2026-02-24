/* ═══════════════════════════════════════════════════════
   Nerithys — build.js  (Static site generator)
   ═══════════════════════════════════════════════════════ */
const fs   = require('fs');
const fsp  = fs.promises;
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const PUB     = path.join(ROOT, 'public');
const FICHES  = path.join(ROOT, 'content', 'fiches');
const TPL_DIR = path.join(ROOT, 'templates');

/* ── Utilities ────────────────────────────────────── */
function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function relativePath(from, to) {
  let rel = path.relative(from, to).replace(/\\/g, '/');
  if (!rel) rel = '.';
  return rel.endsWith('/') ? rel : rel + '/';
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Image resolution ─────────────────────────────── */
let externalImages = {};
try {
  const extFile = path.join(ROOT, 'content', 'external-images.json');
  if (fs.existsSync(extFile)) {
    externalImages = JSON.parse(fs.readFileSync(extFile, 'utf8'));
  }
} catch (e) { /* ignore */ }

function resolveImage(url, assetPath) {
  if (!url) return '';
  // If externally fetched, use local copy
  if (externalImages[url]) {
    return assetPath + 'content/' + externalImages[url];
  }
  // If it's an absolute URL, use as-is
  if (/^https?:\/\//.test(url)) return url;
  return assetPath + url;
}

/* ── Load templates ───────────────────────────────── */
const ficheTemplate   = fs.readFileSync(path.join(TPL_DIR, 'fiche-template.html'), 'utf8');
const listingTemplate = fs.readFileSync(path.join(TPL_DIR, 'listing-template.html'), 'utf8');

/* ── Load fiches ──────────────────────────────────── */
function loadFiches() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const raw = fs.readFileSync(path.join(FICHES, f), 'utf8');
    return JSON.parse(raw);
  }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
}

/* ── Difficulty helpers ───────────────────────────── */
function diffLabel(n) {
  if (n <= 1) return 'Facile';
  if (n === 2) return 'Moyen';
  if (n === 3) return 'Difficile';
  return 'Expert';
}

function diffBadgeClass(n) {
  if (n <= 1) return 'badge-green';
  if (n === 2) return 'badge-teal';
  if (n === 3) return 'badge-amber';
  return 'badge-red';
}

function diffDots(n) {
  let out = '<div class="diff-dots">';
  for (let i = 1; i <= 4; i++) {
    out += '<span class="dot' + (i <= n ? ' filled' : '') + '"></span>';
  }
  out += '</div>';
  return out;
}

/* ── Parameter card HTML ──────────────────────────── */
// SVG icons for params
const ICONS = {
  temp:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/></svg>',
  ph:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  gh:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  kh:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a8 8 0 008-8c0-6-8-12-8-12S4 8 4 14a8 8 0 008 8z"/></svg>',
  size:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 3h-6M21 3v6M21 3L14 10M3 21h6M3 21v-6M3 21l7-7"/></svg>',
};

function paramCard(icon, label, value) {
  if (!value || value === 'null' || value === '—') return '';
  return '<div class="param-card">' +
    '<div class="icon">' + (ICONS[icon] || '') + '</div>' +
    '<div><strong>' + escapeHtml(label) + '</strong><div class="value">' + escapeHtml(value) + '</div></div>' +
  '</div>';
}

/* ── Build fiche content HTML ─────────────────────── */
function buildFicheContent(data, assetPath) {
  const diff = Number(data.difficulty) || 0;
  const imgSrc = resolveImage((data.images && data.images[0]) || '', assetPath);

  let html = '';

  // Title block
  html += '<h1>' + escapeHtml(data.name) + '</h1>';
  html += '<p style="color:var(--muted);margin-top:-.5rem;margin-bottom:1.5rem;">';
  html += '<em>' + escapeHtml(data.scientificName || '') + '</em>';
  html += '</p>';

  // Hero image
  if (imgSrc) {
    html += '<img class="fiche-hero-img" src="' + imgSrc + '" alt="' + escapeHtml(data.name) + '" loading="lazy" onerror="this.style.display=\'none\'">';
  }

  // Quick info badges
  html += '<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem;">';
  html += '<span class="badge ' + diffBadgeClass(diff) + '">' + diffLabel(diff) + '</span>';
  html += '<span class="badge badge-slate">' + escapeHtml(data.biotope || '—') + '</span>';
  if (data.tags && data.tags.length) {
    data.tags.forEach(function(t) {
      html += '<span class="badge badge-accent">' + escapeHtml(t) + '</span>';
    });
  }
  html += '</div>';

  // Difficulty dots
  html += '<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1.5rem;">';
  html += '<span style="font-size:.85rem;color:var(--muted);font-weight:600;">Difficulté :</span>';
  html += diffDots(diff);
  html += '<span style="font-size:.85rem;font-weight:600;">' + diffLabel(diff) + '</span>';
  html += '</div>';

  // Parameters grid
  let params = '';
  if (data.tempMin != null && data.tempMax != null) {
    params += paramCard('temp', 'Température', data.tempMin + ' – ' + data.tempMax + ' °C');
  }
  if (data.phMin != null && data.phMax != null) {
    params += paramCard('ph', 'pH', data.phMin + ' – ' + data.phMax);
  }
  if (data.ghMin != null && data.ghMax != null) {
    params += paramCard('gh', 'GH', data.ghMin + ' – ' + data.ghMax);
  }
  if (data.khMin != null && data.khMax != null) {
    params += paramCard('kh', 'KH', data.khMin + ' – ' + data.khMax);
  }
  if (data.minVolumeL) {
    params += paramCard('volume', 'Volume min.', data.minVolumeL + ' L');
  }
  if (data.minLengthCm) {
    params += paramCard('size', 'Taille adulte', data.minLengthCm + ' cm');
  }

  if (params) {
    html += '<div class="params-grid">' + params + '</div>';
  }

  // Sections
  const sections = [
    ['Comportement', data.behavior],
    ['Compatibilité', data.compatibility],
    ['Alimentation', data.diet],
    ['Reproduction', data.breeding],
  ];

  sections.forEach(function(s) {
    if (s[1]) {
      html += '<div class="fiche-section">';
      html += '<h3>' + escapeHtml(s[0]) + '</h3>';
      html += '<p>' + escapeHtml(s[1]) + '</p>';
      html += '</div>';
    }
  });

  // Notes (takeaway box)
  if (data.notes) {
    html += '<div class="takeaway-box" style="margin-top:2rem;">';
    html += '<strong>À retenir :</strong> ' + escapeHtml(data.notes);
    html += '</div>';
  }

  // Gallery
  if (data.gallery && data.gallery.length) {
    html += '<div class="fiche-section">';
    html += '<h3>Galerie</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-top:1rem;">';
    data.gallery.forEach(function(g) {
      var gSrc = resolveImage(g, assetPath);
      html += '<img class="fiche-hero-img" src="' + gSrc + '" alt="" loading="lazy" style="max-height:200px" onerror="this.style.display=\'none\'">';
    });
    html += '</div></div>';
  }

  // Sources
  if (data.sources && data.sources.length) {
    html += '<div class="fiche-section">';
    html += '<h3>Sources</h3>';
    html += '<ul style="list-style:disc;padding-left:1.3rem;">';
    data.sources.forEach(function(src) {
      html += '<li><a href="' + escapeHtml(src) + '" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;">' + escapeHtml(src) + '</a></li>';
    });
    html += '</ul></div>';
  }

  return html;
}

/* ── Generate JSON-LD ─────────────────────────────── */
function jsonLd(data) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "name": data.name || '',
    "description": data.behavior || '',
    "about": {
      "@type": "Thing",
      "name": data.scientificName || ''
    }
  });
}

/* ── Build one fiche page ─────────────────────────── */
function buildFiche(data) {
  const slug = data.slug || '';
  const outDir = path.join(PUB, 'fiches', slug);
  ensureDirSync(outDir);

  const assetPath = relativePath(outDir, PUB);
  const content = buildFicheContent(data, assetPath);

  const imgSrc = resolveImage((data.images && data.images[0]) || '', assetPath);

  let page = ficheTemplate
    .replace(/\{\{ASSET_PATH\}\}/g, assetPath)
    .replace(/\{\{TITLE\}\}/g, escapeHtml(data.name + ' — Nerithys'))
    .replace(/\{\{DESCRIPTION\}\}/g, escapeHtml((data.behavior || data.name || '') + ' | Nerithys'))
    .replace(/\{\{OG_IMAGE\}\}/g, imgSrc)
    .replace(/\{\{JSON_LD\}\}/g, jsonLd(data))
    .replace(/\{\{CONTENT\}\}/g, content);

  fs.writeFileSync(path.join(outDir, 'index.html'), page, 'utf8');
}

/* ── Build listing page ───────────────────────────── */
function buildListing() {
  const outDir = path.join(PUB, 'fiches');
  ensureDirSync(outDir);
  const assetPath = relativePath(outDir, PUB);

  let page = listingTemplate.replace(/\{\{ASSET_PATH\}\}/g, assetPath);
  fs.writeFileSync(path.join(outDir, 'index.html'), page, 'utf8');
}

/* ── Build fiches.json aggregate ──────────────────── */
function buildFichesJson(fiches) {
  const outDir = path.join(PUB, 'content');
  ensureDirSync(outDir);

  // Map images to asset-relative paths from public root
  const data = fiches.map(function(f) {
    const copy = Object.assign({}, f);
    if (copy.images && copy.images.length) {
      copy.images = copy.images.map(function(img) {
        if (externalImages[img]) {
          return 'content/' + externalImages[img];
        }
        return img;
      });
    }
    return copy;
  });

  fs.writeFileSync(path.join(outDir, 'fiches.json'), JSON.stringify(data, null, 2), 'utf8');
}

/* ── Copy static assets ───────────────────────────── */
function copyDir(src, dest) {
  ensureDirSync(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    ensureDirSync(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

/* ── Generate robots.txt ──────────────────────────── */
function buildRobots() {
  const content = 'User-agent: *\nAllow: /\nSitemap: https://massin-aliouche.github.io/Nerithys/sitemap.xml\n';
  fs.writeFileSync(path.join(PUB, 'robots.txt'), content, 'utf8');
}

/* ── Generate sitemap.xml ─────────────────────────── */
function buildSitemap(fiches) {
  const base = 'https://massin-aliouche.github.io/Nerithys/';
  const now = new Date().toISOString().slice(0, 10);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  xml += '  <url><loc>' + base + '</loc><lastmod>' + now + '</lastmod></url>\n';
  xml += '  <url><loc>' + base + 'fiches/</loc><lastmod>' + now + '</lastmod></url>\n';

  fiches.forEach(function(f) {
    xml += '  <url><loc>' + base + 'fiches/' + encodeURIComponent(f.slug) + '/</loc><lastmod>' + now + '</lastmod></url>\n';
  });

  xml += '</urlset>\n';
  fs.writeFileSync(path.join(PUB, 'sitemap.xml'), xml, 'utf8');
}

/* ── Generate RSS feed ────────────────────────────── */
function buildRss(fiches) {
  const base = 'https://massin-aliouche.github.io/Nerithys/';
  const now = new Date().toUTCString();
  let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
  rss += '<rss version="2.0"><channel>\n';
  rss += '  <title>Nerithys — Fiches poissons</title>\n';
  rss += '  <link>' + base + '</link>\n';
  rss += '  <description>Fiches d\'espèces aquatiques</description>\n';
  rss += '  <lastBuildDate>' + now + '</lastBuildDate>\n';

  fiches.forEach(function(f) {
    rss += '  <item>\n';
    rss += '    <title>' + escapeHtml(f.name) + '</title>\n';
    rss += '    <link>' + base + 'fiches/' + encodeURIComponent(f.slug) + '/</link>\n';
    rss += '    <description>' + escapeHtml(f.behavior || f.name || '') + '</description>\n';
    rss += '  </item>\n';
  });

  rss += '</channel></rss>\n';
  fs.writeFileSync(path.join(PUB, 'rss.xml'), rss, 'utf8');
}

/* ═══════════════════════════════════════════════════════
   MAIN BUILD
   ═══════════════════════════════════════════════════════ */
function build() {
  console.log('[build] Starting Nerithys build...');

  // 1. Ensure public directory
  ensureDirSync(PUB);

  // 2. Load fiches
  const fiches = loadFiches();
  console.log('[build] Loaded ' + fiches.length + ' fiches');

  // 3. Copy CSS
  copyDir(path.join(ROOT, 'css'), path.join(PUB, 'css'));
  console.log('[build] Copied CSS');

  // 4. Copy JS
  ensureDirSync(path.join(PUB, 'js'));
  copyFile(path.join(ROOT, 'js', 'main.js'), path.join(PUB, 'js', 'main.js'));
  copyFile(path.join(ROOT, 'js', 'ui.js'), path.join(PUB, 'js', 'ui.js'));
  copyFile(path.join(ROOT, 'js', 'species.js'), path.join(PUB, 'js', 'species.js'));
  console.log('[build] Copied JS');

  // 5. Copy content assets (images, etc.)
  if (fs.existsSync(path.join(ROOT, 'content'))) {
    const contentItems = fs.readdirSync(path.join(ROOT, 'content'), { withFileTypes: true });
    const contentOut = path.join(PUB, 'content');
    ensureDirSync(contentOut);
    for (const item of contentItems) {
      const src = path.join(ROOT, 'content', item.name);
      const dest = path.join(contentOut, item.name);
      if (item.isDirectory()) {
        // Copy directories except 'fiches' (raw JSON, not needed in public)
        // But DO copy 'external' directory for fetched images
        if (item.name !== 'fiches' && item.name !== 'articles') {
          copyDir(src, dest);
        }
      } else if (!item.name.endsWith('.json') || item.name === 'external-images.json') {
        // Copy non-JSON files (images, etc.) and the external-images manifest
        copyFile(src, dest);
      }
    }
    console.log('[build] Copied content assets');
  }

  // 6. Copy homepage
  const indexSrc = path.join(ROOT, 'index.html');
  if (fs.existsSync(indexSrc)) {
    fs.copyFileSync(indexSrc, path.join(PUB, 'index.html'));
    console.log('[build] Copied index.html');
  }

  // 7. Build fiches.json
  buildFichesJson(fiches);
  console.log('[build] Generated content/fiches.json');

  // 8. Build listing page
  buildListing();
  console.log('[build] Generated fiches/index.html');

  // 9. Build individual fiche pages
  fiches.forEach(function(f) {
    buildFiche(f);
  });
  console.log('[build] Generated ' + fiches.length + ' fiche pages');

  // 10. Build SEO files
  buildRobots();
  buildSitemap(fiches);
  buildRss(fiches);
  console.log('[build] Generated robots.txt, sitemap.xml, rss.xml');

  console.log('[build] ✓ Build complete! Output at public/');
}

build();
