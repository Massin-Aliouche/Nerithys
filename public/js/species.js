async function fetchSpecies(){
  const res = await fetch('/data/species.json');
  return res.json();
}

function createCard(item){
  const a = document.createElement('a');
  a.className = 'card-ui species-card';
  a.href = `/fiche-poisson/fiche.html?slug=${encodeURIComponent(item.slug)}`;
  a.innerHTML = `
    <div style="display:flex;gap:1rem;align-items:center">
      <img src="${item.image}" alt="${item.common_name}" style="width:120px;height:84px;object-fit:cover;border-radius:10px"> 
      <div>
        <h3>${item.common_name}</h3>
        <p class="muted">${item.scientific_name} · ${item.biotope}</p>
        <p class="muted">T: ${item.temp_c} °C · pH: ${item.ph} · Vol min: ${item.min_volume_l}L</p>
      </div>
    </div>`;
  return a;
}

async function renderList(containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  const species = await fetchSpecies();
  const list = document.createElement('div');
  list.className = 'grid';
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
    const filtered = species.filter(s => {
      if(b && b !== 'all' && s.biotope !== b) return false;
      if(!q) return true;
      return s.common_name.toLowerCase().includes(q) || s.scientific_name.toLowerCase().includes(q) || s.biotope.toLowerCase().includes(q);
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
  const item = species.find(s => s.slug === slug);
  if(!item){ container.innerHTML = '<p>Fiche introuvable.</p>'; return; }

  const toc = [];
  function addSection(title, html){
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    toc.push({title,id});
    return `<section id="${id}">${html}</section>`;
  }

  let html = `
    <article class="card">
      <header>
        <h1>${item.common_name} <small class="muted">${item.scientific_name}</small></h1>
        <p class="muted">T: ${item.temp_c} °C · pH: ${item.ph} · Vol min: ${item.min_volume_l}L · Difficulté: ${item.difficulty}</p>
      </header>
      ${addSection('Paramètres d\'eau', `<ul><li>Température: ${item.temp_c} °C</li><li>pH: ${item.ph}</li><li>GH/KH: ${item.gh_kh}</li></ul>`)}
      ${addSection('Volume & dimensions', `<p>Volume minimum recommandé: <strong>${item.min_volume_l} L</strong></p>`)}
      ${addSection('Comportement & compatibilité', `<p>${item.behavior}</p><p>${item.compatibility}</p>`)}
      ${addSection('Alimentation', `<p>${item.feeding}</p>`)}
      ${addSection('Reproduction', `<p>${item.reproduction}</p>`)}
      ${addSection('Conseils de maintenance', `<p>${item.maintenance_tips}</p>`)}
    </article>`;

  // render toc
  const tocHtml = `<aside class="toc"><h4>Sommaire</h4><ul>${toc.map(t => `<li><a href="#${t.id}">${t.title}</a></li>`).join('')}</ul></aside>`;
  container.innerHTML = `<div style="display:grid;grid-template-columns:1fr 280px;gap:1rem">${html}${tocHtml}</div>`;
}

export { renderList, renderFiche };
