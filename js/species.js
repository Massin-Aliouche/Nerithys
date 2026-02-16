async function fetchSpecies(){
  const candidates = ['/content/fiches.json','/data/species.json','/public/content/fiches.json','/content/fiches/index.json'];
  for(const p of candidates){
    try{
      const res = await fetch(p);
      if(!res.ok) continue;
      const json = await res.json();
      if(Array.isArray(json)) return json;
      if(json.fiches && Array.isArray(json.fiches)) return json.fiches;
    }catch(e){ /* ignore */ }
  }
  return [];
}

function slugify(s){
  return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

function escapeHtml(s){
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function normalize(raw){
  const out = {};
  out.slug = raw.slug || slugify(raw.name || raw.common_name || raw.commonName || raw.scientificName || raw.scientific_name || '');
  out.name = raw.name || raw.common_name || raw.commonName || '';
  out.scientificName = raw.scientificName || raw.scientific_name || raw.scientific || '';
  out.images = Array.isArray(raw.images) ? raw.images : (raw.images ? [raw.images] : (raw.image ? [raw.image] : []));
  out.image = out.images[0] || raw.image || raw.image_url || '';
  out.biotope = raw.biotope || '';
  out.tempMin = raw.tempMin || raw.temp_c || raw.temp_min || null;
  out.tempMax = raw.tempMax || raw.temp_max || null;
  out.phMin = raw.phMin || raw.ph_min || raw.ph || null;
  out.phMax = raw.phMax || raw.ph_max || null;
  out.ghMin = raw.ghMin || raw.gh_min || null;
  out.ghMax = raw.ghMax || raw.gh_max || null;
  out.minVolumeL = raw.minVolumeL || raw.min_volume_l || raw.min_volume || null;
  out.minLengthCm = raw.minLengthCm || raw.min_length_cm || null;
  out.behavior = raw.behavior || '';
  out.compatibility = raw.compatibility || '';
  out.diet = raw.diet || raw.feeding || '';
  out.breeding = raw.breeding || raw.reproduction || '';
  out.notes = raw.notes || raw.maintenance_tips || '';
  out.difficulty = raw.difficulty || raw.level || '';
  return out;
}

function createCard(raw){
  const item = normalize(raw);
  const a = document.createElement('a');
  a.className = 'card-ui species-card block rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md';
  a.href = `/fiches/${encodeURIComponent(item.slug)}/`;
  const imgSrc = item.image || (item.images && item.images[0]) || '/content/placeholder.png';
  a.innerHTML = `
    <div class="flex gap-4 items-center p-4">
      <img src="${imgSrc}" alt="${escapeHtml(item.name)}" class="w-28 h-20 object-cover rounded-md" />
      <div>
        <h3 class="text-lg font-medium">${escapeHtml(item.name)}</h3>
        <p class="text-sm text-slate-500">${escapeHtml(item.scientificName || '')} · ${escapeHtml(item.biotope || '')}</p>
        <p class="text-sm text-slate-500">T: ${item.tempMin||'—'}°C · pH: ${item.phMin||'—'} · Vol min: ${item.minVolumeL||'—'}L</p>
      </div>
    </div>`;
  return a;
}

async function renderList(containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  const species = await fetchSpecies();
  const list = document.createElement('div');
  list.className = 'grid gap-4';
  species.forEach(s => list.appendChild(createCard(s)));
  container.innerHTML = '';
  container.appendChild(list);
  populateFilters(species);
  setupSearch(species, container);
}

function populateFilters(species){
  const biotope = document.getElementById('filter-biotope');
  if(!biotope) return;
  const set = new Set(species.map(s => s.biotope).filter(Boolean));
  // clear existing options except 'all'
  biotope.querySelectorAll('option:not([value="all"])').forEach(o => o.remove());
  Array.from(set).sort().forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    biotope.appendChild(opt);
  });
}

function setupSearch(species, container){
  const search = document.getElementById('search');
  const biotope = document.getElementById('filter-biotope');
  if(!search || !biotope) return;
  function doFilter(){
    const q = search.value.trim().toLowerCase();
    const b = biotope.value;
    const filtered = species.filter(raw => {
      const s = normalize(raw);
      if(b && b !== 'all' && s.biotope !== b) return false;
      if(!q) return true;
      return (s.name||'').toLowerCase().includes(q) || (s.scientificName||'').toLowerCase().includes(q) || (s.biotope||'').toLowerCase().includes(q);
    });
    const list = container.querySelector('.grid');
    list.innerHTML = '';
    filtered.forEach(s => list.appendChild(createCard(s)));
    const countEl = document.getElementById('result-count');
    if(countEl) countEl.textContent = `${filtered.length} résultat${filtered.length>1? 's' : ''}`;
  }
  // initialize counter
  const initCount = document.getElementById('result-count');
  if(initCount) initCount.textContent = `${species.length} résultat${species.length>1? 's' : ''}`;
  search.addEventListener('input', doFilter);
  biotope.addEventListener('change', doFilter);
}

// fiche page renderer
async function renderFiche(contentId){
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const container = document.getElementById(contentId);
  if(!container){ return; }
  const species = await fetchSpecies();
  const raw = species.find(s => (s.slug||s.name||'').toString() === slug || (s.slug||'').toString() === slug);
  const item = raw ? normalize(raw) : null;
  if(!item){ container.innerHTML = '<p>Fiche introuvable.</p>'; return; }

  const toc = [];
  function addSection(title, html){
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    toc.push({title,id});
    return `<section id="${id}">${html}</section>`;
  }

  let html = `
    <article class="space-y-4">
      <header>
        <h1 class="text-2xl font-bold">${escapeHtml(item.name)} <small class="text-sm text-slate-500">${escapeHtml(item.scientificName||'')}</small></h1>
        <p class="text-sm text-slate-500">T: ${item.tempMin||'—'}–${item.tempMax||'—'} °C · pH: ${item.phMin||'—'}–${item.phMax||'—'} · Difficulté: ${item.difficulty||'—'}</p>
      </header>
      ${addSection('Paramètres', `<ul><li>Temp: ${item.tempMin||'—'}–${item.tempMax||'—'} °C</li><li>pH: ${item.phMin||'—'}–${item.phMax||'—'}</li><li>GH: ${item.ghMin||'—'}–${item.ghMax||'—'}</li></ul>`)}
      ${addSection('Volume & dimensions', `<p>Volume minimum: <strong>${item.minVolumeL||'—'} L</strong> · Taille adulte: ${item.minLengthCm||'—'} cm</p>`)}
      ${addSection('Comportement & compatibilité', `<p>${escapeHtml(item.behavior||'')}</p><p>${escapeHtml(item.compatibility||'')}</p>`)}
      ${addSection('Alimentation', `<p>${escapeHtml(item.diet||'')}</p>`)}
      ${addSection('Reproduction', `<p>${escapeHtml(item.breeding||'')}</p>`)}
      ${addSection('Conseils', `<p>${escapeHtml(item.notes||'')}</p>`)}
    </article>`;

  // render toc
  const tocHtml = `<aside class="toc"><h4>Sommaire</h4><ul>${toc.map(t => `<li><a href="#${t.id}">${t.title}</a></li>`).join('')}</ul></aside>`;
  container.innerHTML = `<div style="display:grid;grid-template-columns:1fr 280px;gap:1rem">${html}${tocHtml}</div>`;
}

// expose for non-module usage
window.renderList = renderList;
window.renderFiche = renderFiche;
