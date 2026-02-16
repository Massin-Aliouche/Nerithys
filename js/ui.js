/* ═══════════════════════════════════════════════════════
   Nerithys — ui.js  (listing cards, filters, lightbox)
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Helpers ────────────────────────────────────── */
  var state = { all: [], filtered: [] };

  function qs(sel) { return document.querySelector(sel); }
  function getBase() {
    var p = window.ASSET_PATH;
    if (typeof p === 'undefined' || p === null || p === '') return './';
    return p.endsWith('/') ? p : p + '/';
  }

  /* ── Fetch fiches JSON ──────────────────────────── */
  function fetchFiches() {
    var base = getBase();
    var urls = [
      base + 'content/fiches.json',
      'content/fiches.json'
    ];
    function tryNext(i) {
      if (i >= urls.length) return Promise.resolve([]);
      return fetch(urls[i]).then(function (r) {
        if (!r.ok) return tryNext(i + 1);
        return r.json().then(function (d) {
          if (Array.isArray(d)) return d;
          if (d.fiches && Array.isArray(d.fiches)) return d.fiches;
          return tryNext(i + 1);
        });
      }).catch(function () { return tryNext(i + 1); });
    }
    return tryNext(0);
  }

  /* ── Difficulty helpers ─────────────────────────── */
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
  function diffDots(n) {
    var html = '<div class="diff-dots">';
    for (var i = 1; i <= 5; i++) {
      html += '<span class="dot' + (i <= n ? ' filled' : '') + '"></span>';
    }
    return html + '</div>';
  }

  /* ── Create a card ──────────────────────────────── */
  function createCard(item) {
    var base = getBase();
    var slug = item.slug || '';
    var href = base + 'fiches/' + encodeURIComponent(slug) + '/';
    var imgSrc = (item.images && item.images[0]) || '';
    var diff = Number(item.difficulty) || 0;

    var card = document.createElement('div');
    card.className = 'card reveal';
    card.innerHTML =
      '<a href="' + href + '">' +
        '<img class="card-img" src="' + imgSrc + '" alt="' + (item.name || '') + '" loading="lazy">' +
        '<div class="card-body">' +
          '<div class="card-name">' + (item.name || '—') + '</div>' +
          '<div class="card-sci">' + (item.scientificName || '') + '</div>' +
          '<div class="card-badges">' +
            '<span class="badge badge-slate">' + (item.biotope || '—') + '</span>' +
            '<span class="badge ' + diffBadgeClass(diff) + '">' + diffLabel(diff) + '</span>' +
            '<span class="badge badge-slate">' + (item.minVolumeL || '—') + ' L</span>' +
          '</div>' +
        '</div>' +
      '</a>';
    return card;
  }

  /* ── Render list ────────────────────────────────── */
  function renderList(list) {
    var container = qs('#species-list');
    if (!container) return;
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;grid-column:1/-1">Aucune fiche trouvée.</p>';
      return;
    }
    var featured = Number(container.dataset.featured) || 0;
    var toShow = featured ? list.slice(0, featured) : list;
    toShow.forEach(function (item) {
      container.appendChild(createCard(item));
    });
    // trigger reveal for dynamically added cards
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        });
      }, { threshold: 0.1 });
      container.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
    } else {
      container.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
    }
    var counter = qs('#resultsCount');
    if (counter) counter.textContent = toShow.length + ' fiche' + (toShow.length > 1 ? 's' : '') + (featured ? '' : ' (sur ' + state.all.length + ')');
  }

  /* ── Filters ────────────────────────────────────── */
  function applyFilters() {
    var qVal = (qs('#q') ? qs('#q').value : '').trim().toLowerCase();
    var bio = qs('#biotope') ? qs('#biotope').value : 'all';
    var diff = qs('#difficulty') ? qs('#difficulty').value : 'all';

    state.filtered = state.all.filter(function (it) {
      if (qVal) {
        var hay = [it.name, it.scientificName, it.biotope, it.family].join(' ').toLowerCase();
        if (hay.indexOf(qVal) === -1) return false;
      }
      if (bio !== 'all' && it.biotope !== bio) return false;
      if (diff !== 'all' && String(it.difficulty) !== diff) return false;
      return true;
    });
    renderList(state.filtered);
  }

  function populateBiotopes(list) {
    var sel = qs('#biotope');
    if (!sel) return;
    var set = {};
    list.forEach(function (it) { if (it.biotope) set[it.biotope] = true; });
    Object.keys(set).sort().forEach(function (b) {
      var opt = document.createElement('option');
      opt.value = b; opt.textContent = b;
      sel.appendChild(opt);
    });
  }

  /* ── Lightbox ───────────────────────────────────── */
  function setupLightbox() {
    var lb = qs('#lightbox');
    if (!lb) return;
    var img = qs('#lightbox-img');
    var closeBtn = lb.querySelector('.close');

    document.addEventListener('click', function (e) {
      var target = e.target.closest('.card-img, .fiche-hero-img');
      if (target) {
        e.preventDefault();
        img.src = target.src;
        lb.classList.add('open');
        lb.setAttribute('aria-hidden', 'false');
      }
      if (e.target === lb || e.target === closeBtn) {
        lb.classList.remove('open');
        lb.setAttribute('aria-hidden', 'true');
        img.src = '';
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) {
        lb.classList.remove('open');
        lb.setAttribute('aria-hidden', 'true');
        img.src = '';
      }
    });
  }

  /* ── Init ───────────────────────────────────────── */
  function init() {
    fetchFiches().then(function (data) {
      state.all = data || [];
      state.filtered = state.all.slice();
      populateBiotopes(state.all);
      renderList(state.filtered);

      // bind filter events
      var qInput = qs('#q');
      var bioSelect = qs('#biotope');
      var diffSelect = qs('#difficulty');
      if (qInput) qInput.addEventListener('input', applyFilters);
      if (bioSelect) bioSelect.addEventListener('change', applyFilters);
      if (diffSelect) diffSelect.addEventListener('change', applyFilters);

      setupLightbox();
    });
  }

  // only init if listing container exists
  if (qs('#species-list')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  } else {
    // fiche page: just setup the lightbox
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupLightbox);
    } else {
      setupLightbox();
    }
  }
})();
