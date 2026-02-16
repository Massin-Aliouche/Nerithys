// UI helpers: filters for listing and a minimal lightbox
(function(){
  const state = {all:[],filtered:[]};

  function q(sel){return document.querySelector(sel)}

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

  function createCard(item, idx){
    const el = document.createElement('article');
    el.className='card-ui transform transition-all';
    if(typeof idx === 'number') el.style.setProperty('animation-delay', `${idx*60}ms`);
    const img = document.createElement('img');
    img.className='card-image rounded-md';
    img.loading='lazy';
    img.alt = item.name || '';
    const realSrc = (item.images && item.images[0]) || item.image || '';
    // defer actual src to lazy loader; keep full-size URL in data attribute
    img.dataset.src = realSrc;
    img.dataset.full = realSrc;
    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280"></svg>';

    const wrap = document.createElement('div'); wrap.className = 'img-wrap'; wrap.style.position='relative';
    const overlay = document.createElement('div'); overlay.className = 'img-overlay';
    wrap.appendChild(img); wrap.appendChild(overlay);

    const body = document.createElement('div'); body.className='card-body';
    const title = document.createElement('h3'); title.className='card-title'; title.textContent = item.name || '—';
    const meta = document.createElement('div'); meta.className='card-meta';
    meta.textContent = `${item.minVolumeL||item.volumeMin||'—'} L • pH ${item.phMin||item.ph||'—'}`;

    const badges = document.createElement('div'); badges.style.display='flex';badges.style.gap='0.4rem';
    const b1 = document.createElement('span'); b1.className='badge'; b1.textContent = item.biotope||'—';
    const b2 = document.createElement('span'); b2.className='badge'; b2.textContent = item.difficulty||'—';
    badges.appendChild(b1); badges.appendChild(b2);

    body.appendChild(title); body.appendChild(badges); body.appendChild(meta);
    el.appendChild(wrap); el.appendChild(body);
    // make whole card clickable on home/listing
    const link = document.createElement('a');
    link.href = `/fiches/${encodeURIComponent(item.slug||item.name||'')}/`;
    link.className = 'block';
    link.appendChild(el);
    return link;
  }

  function renderList(list){
    const container = q('#species-list');
    container.innerHTML='';
    if(!list.length){ container.innerHTML='<p>Aucune fiche trouvée.</p>'; return }
    const frag = document.createDocumentFragment();
    // if container requests featured N, limit to that (prefer items tagged 'featured')
    const featuredCount = Number(container.dataset.featured) || 0;
    // determine sort mode from select if present
    const sortSelect = document.getElementById('sortSelect');
    const sortMode = sortSelect ? sortSelect.value : (container.dataset.sort || 'featured');
    const sorted = sortItems(list, sortMode);
    let toShow = sorted.slice();
    if(featuredCount){
      // try to prioritize items with tag 'featured' or 'highlight'
      const fav = toShow.filter(i => (i.tags||[]).includes('featured') || (i.tags||[]).includes('highlight'));
      const remaining = toShow.filter(i => !fav.includes(i));
      toShow = fav.concat(remaining).slice(0, featuredCount);
    }
    toShow.forEach((item,i)=>{ const card=createCard(item,i); card.dataset.slug = item.slug||item.id||''; frag.appendChild(card)});
    container.appendChild(frag);
    q('#resultsCount') && (q('#resultsCount').textContent = `${toShow.length} fiches (sur ${state.all.length})`);
    if(sortSelect && !sortSelect._ui_initialized){
      sortSelect.addEventListener('change', ()=>{ renderList(state.filtered) });
      sortSelect._ui_initialized = true;
    }
  }

  function sortItems(list, mode){
    if(!mode || mode === 'featured') return list;
    const copy = list.slice();
    copy.sort((a,b)=>{
      const get = (o, keys)=>{ for(const k of keys){ if(o[k]!==undefined) return o[k] } return null };
      if(mode === 'name'){
        const an = (get(a,['name','common','common_name'])||'').toString().toLowerCase();
        const bn = (get(b,['name','common','common_name'])||'').toString().toLowerCase();
        return an.localeCompare(bn);
      }
      if(mode === 'difficulty'){
        const ad = Number(get(a,['difficulty','level']))||0; const bd = Number(get(b,['difficulty','level']))||0; return ad - bd;
      }
      if(mode === 'minVolume'){
        const av = Number(get(a,['minVolumeL','min_volume_l','min_volume']))||0; const bv = Number(get(b,['minVolumeL','min_volume_l','min_volume']))||0; return av - bv;
      }
      return 0;
    });
    return copy;
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
    const closeBtn = lb && lb.querySelector('.close');
    const countEl = lb && lb.querySelector('.count');
    document.addEventListener('click', (e)=>{
      const target = e.target.closest('.card-image');
      if(target){
        e.preventDefault();
        const all = Array.from(document.querySelectorAll('img[data-full]'));
        const idx = all.indexOf(target);
        img.src = target.dataset.full || target.src;
        if(countEl) countEl.textContent = `${(idx>=0?idx+1:1)}/${all.length}`;
        lb.classList.add('open'); lb.setAttribute('aria-hidden','false');
      }
      if(e.target === lb || e.target === closeBtn) closeLB();
    });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLB() });
    function closeLB(){ lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); img.src=''; if(countEl) countEl.textContent=''; }
  }

  // init
  async function init(){
    const data = await fetchFiches();
    state.all = data || [];
    // load responsive manifest for client-side srcset handling (if present)
    try{ const r = await fetch('/content/responsive-images.json'); if(r.ok) state.responsive = await r.json(); }catch(e){ state.responsive = {} }
    populateBiotopeOptions(state.all);
    state.filtered = state.all.slice();
    renderList(state.filtered);

    // expose species count to homepage
    const sc = document.getElementById('speciesCount');
    if(sc) sc.textContent = `${state.all.length} espèces`;

    // events
    q('#q').addEventListener('input', ()=>{ applyFilters() });
    q('#biotope').addEventListener('change', applyFilters);
    q('#difficulty').addEventListener('change', applyFilters);
    q('#volumeMin').addEventListener('input', applyFilters);
    q('#resetFilters').addEventListener('click', (e)=>{ e.preventDefault(); resetFilters() });

    setupLightbox();
    setupLazy();
  }

  // lazy-load images via IntersectionObserver
  function setupLazy(){
    if(!('IntersectionObserver' in window)){
      document.querySelectorAll('img[data-src]').forEach(img=>{ img.src = img.dataset.src });
      return;
    }
    const io = new IntersectionObserver((entries, obs)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const img = e.target;
          const candidate = img.dataset.src || img.src;
          // if candidate is local and manifest contains variants, set srcset
          try{
            if(candidate && !/^https?:\/\//.test(candidate) && state.responsive){
              const key = candidate.split('/').pop();
              const variants = state.responsive[key];
              if(Array.isArray(variants) && variants.length){
                img.src = '/' + 'content/' + variants[0].file;
                img.srcset = variants.map(v=>`/content/${v.file} ${v.width}w`).join(', ');
                img.sizes = '(min-width: 768px) 33vw, 100vw';
              } else {
                img.src = candidate;
              }
            } else {
              img.src = candidate;
            }
          }catch(err){ img.src = candidate }
          obs.unobserve(img);
        }
      });
    }, {rootMargin: '200px'});
    document.querySelectorAll('img[data-src]').forEach(i=>io.observe(i));
  }

  // only run if listing exists
  if(document.querySelector('#species-list')) init();
})();
