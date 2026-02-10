// UI helpers: filters for listing and a minimal lightbox
(function(){
  const state = {all:[],filtered:[]};

  function q(sel){return document.querySelector(sel)}
  function qAll(sel){return Array.from(document.querySelectorAll(sel))}

  async function fetchFiches(){
    const candidates=['/content/fiches.json','/data/species.json','/content/fiches/index.json','/public/content/fiches.json'];
    for(const path of candidates){
      try{
        const res = await fetch(path);
        if(!res.ok) continue;
        const json = await res.json();
        // normalize: if top-level has 'fiches' or is an array
        if(Array.isArray(json)) return json;
        if(json.fiches && Array.isArray(json.fiches)) return json.fiches;
      }catch(e){/* ignore */}
    }
    return [];
  }

  function createCard(item){
    const el = document.createElement('article');
    el.className='card';
    const img = document.createElement('img');
    img.className='card-image';
    img.loading='lazy';
    img.alt = item.name || '';
    img.src = item.image || '/public/images/placeholder.png';
    img.dataset.full = item.image || img.src;

    const body = document.createElement('div'); body.className='card-body';
    const title = document.createElement('h3'); title.className='card-title'; title.textContent = item.name || '—';
    const meta = document.createElement('div'); meta.className='card-meta';
    meta.textContent = `${item.volumeMin||'—'} L • pH ${item.ph||'—'}`;

    const badges = document.createElement('div'); badges.style.display='flex';badges.style.gap='0.4rem';
    const b1 = document.createElement('span'); b1.className='badge badge--biotope'; b1.textContent = item.biotope||'—';
    const b2 = document.createElement('span'); b2.className='badge badge--difficulty'; b2.textContent = item.difficulty||'—';
    badges.appendChild(b1); badges.appendChild(b2);

    body.appendChild(title); body.appendChild(badges); body.appendChild(meta);
    el.appendChild(img); el.appendChild(body);
    return el;
  }

  function renderList(list){
    const container = q('#species-list');
    container.innerHTML='';
    if(!list.length){ container.innerHTML='<p>Aucune fiche trouvée.</p>'; return }
    const frag = document.createDocumentFragment();
    list.forEach(item=>{ const card=createCard(item); card.dataset.slug = item.slug||item.id||''; frag.appendChild(card)});
    container.appendChild(frag);
    q('#resultsCount').textContent = `${list.length} fiches (sur ${state.all.length})`;
  }

  function populateBiotopeOptions(list){
    const sel = q('#biotope');
    const set = new Set(list.map(i=>i.biotope).filter(Boolean));
    set.forEach(b=>{ const opt=document.createElement('option'); opt.value=b; opt.textContent=b; sel.appendChild(opt) });
  }

  function applyFilters(){
    const qv = q('#q').value.trim().toLowerCase();
    const bi = q('#biotope').value;
    const diff = q('#difficulty').value;
    const vol = Number(q('#volumeMin').value)||0;
    state.filtered = state.all.filter(it=>{
      if(qv){ const hay = [it.name, it.family, it.common].join(' ').toLowerCase(); if(!hay.includes(qv)) return false }
      if(bi && bi !== 'all' && it.biotope !== bi) return false;
      if(diff && diff !== 'all' && (it.difficulty||'').toLowerCase() !== diff) return false;
      if(vol && Number(it.volumeMin||0) < vol) return false;
      return true;
    });
    renderList(state.filtered);
  }

  function resetFilters(){
    q('#q').value=''; q('#biotope').value='all'; q('#difficulty').value='all'; q('#volumeMin').value='';
    applyFilters();
  }

  function setupLightbox(){
    const lb = q('#lightbox');
    const img = q('#lightbox-img');
    document.addEventListener('click', (e)=>{
      const target = e.target.closest('.card-image');
      if(target){ e.preventDefault(); img.src = target.dataset.full || target.src; lb.classList.add('open'); lb.setAttribute('aria-hidden','false'); }
      if(e.target === lb) closeLB();
    });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLB() });
    function closeLB(){ lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); img.src=''; }
  }

  // init
  async function init(){
    const data = await fetchFiches();
    state.all = data || [];
    populateBiotopeOptions(state.all);
    state.filtered = state.all.slice();
    renderList(state.filtered);

    // events
    q('#q').addEventListener('input', ()=>{ applyFilters() });
    q('#biotope').addEventListener('change', applyFilters);
    q('#difficulty').addEventListener('change', applyFilters);
    q('#volumeMin').addEventListener('input', applyFilters);
    q('#resetFilters').addEventListener('click', (e)=>{ e.preventDefault(); resetFilters() });

    setupLightbox();
  }

  // only run if listing exists
  if(document.querySelector('#species-list')) init();
})();
