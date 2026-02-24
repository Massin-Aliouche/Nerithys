/* Nerithys — ui.js (cards, filters, lightbox) */
(function () {
  'use strict';

  var state = { all: [], filtered: [] };

  function qs(sel) { return document.querySelector(sel); }

  function getBase() {
    if (typeof window.ASSET_PATH === 'string' && window.ASSET_PATH !== '') {
      var b = window.ASSET_PATH;
      return b.endsWith('/') ? b : b + '/';
    }
    return './';
  }

  /* ── Fetch fiches.json ───────────────────────── */
  function fetchFiches() {
    var base = getBase();
    var urls = [
      base + 'content/fiches.json',
      './content/fiches.json',
      'content/fiches.json'
    ];
    // dedupe
    var seen = {};
    urls = urls.filter(function (u) {
      if (seen[u]) return false;
      seen[u] = true;
      return true;
    });

    function tryFetch(i) {
      if (i >= urls.length) {
        console.warn('[Nerithys] Could not load fiches.json');
        return Promise.resolve([]);
      }
      return fetch(urls[i])
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        })
        .then(function (data) {
          if (Array.isArray(data)) return data;
          if (data && Array.isArray(data.fiches)) return data.fiches;
          throw new Error('bad format');
        })
        .catch(function () { return tryFetch(i + 1); });
    }
    return tryFetch(0);
  }

  /* ── Difficulty helpers ──────────────────────── */
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

  /* ── Create card ─────────────────────────────── */
  function createCard(item, index) {
    var base = getBase();
    var slug = item.slug || '';
    var href = base + 'fiches/' + encodeURIComponent(slug) + '/';
    var imgSrc = (item.images && item.images[0]) || '';
    var diff = Number(item.difficulty) || 0;

    var card = document.createElement('div');
    card.className = 'card reveal';
    if (index !== undefined) {
      var d = index % 4;
      if (d > 0) card.className += ' reveal-d' + Math.min(d, 3);
    }

    card.innerHTML =
      '<a href="' + href + '">' +
        '<div class="card-img-wrap">' +
          '<img class="card-img" src="' + imgSrc + '" alt="' + (item.name || '') + '" loading="lazy" onerror="this.style.display=\'none\'">' +
          '<div class="card-img-overlay"></div>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-name">' + (item.name || '—') + '</div>' +
          '<div class="card-sci">' + (item.scientificName || '') + '</div>' +
          '<div class="card-badges">' +
            '<span class="badge ' + diffBadgeClass(diff) + '">' + diffLabel(diff) + '</span>' +
            '<span class="badge badge-slate">' + (item.biotope || '') + '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
    return card;
  }

  /* ── Render cards ────────────────────────────── */
  function renderList(list) {
    var container = qs('#species-list');
    if (!container) return;
    container.innerHTML = '';

    if (!list.length) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<p>Aucune fiche trouvée.</p>' +
        '</div>';
      return;
    }

    var featured = Number(container.dataset.featured) || 0;
    var toShow = featured > 0 ? list.slice(0, featured) : list;

    toShow.forEach(function (item, i) {
      container.appendChild(createCard(item, i));
    });

    // Trigger reveal
    requestAnimationFrame(function () {
      if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add('visible');
              obs.unobserve(e.target);
            }
          });
        }, { threshold: 0.08 });
        container.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
      } else {
        container.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
      }
    });

    // Update counter
    var counter = qs('#resultsCount');
    if (counter) {
      counter.textContent = toShow.length + ' fiche' + (toShow.length > 1 ? 's' : '') +
        (featured ? '' : ' sur ' + state.all.length);
    }
  }

  /* ── Filters ─────────────────────────────────── */
  function applyFilters() {
    var qVal = (qs('#q') ? qs('#q').value : '').trim().toLowerCase();
    var bio = qs('#biotope') ? qs('#biotope').value : 'all';
    var diff = qs('#difficulty') ? qs('#difficulty').value : 'all';

    state.filtered = state.all.filter(function (it) {
      if (qVal) {
        var hay = [it.name, it.scientificName, it.biotope, it.notes]
          .filter(Boolean).join(' ').toLowerCase();
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
      opt.value = b;
      opt.textContent = b;
      sel.appendChild(opt);
    });
  }

  /* ── Lightbox ────────────────────────────────── */
  function setupLightbox() {
    var lb = qs('#lightbox');
    if (!lb) return;
    var img = qs('#lightbox-img');

    function openLB(src) {
      if (!src) return;
      img.src = src;
      lb.classList.add('open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeLB() {
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(function () { img.src = ''; }, 300);
    }

    document.addEventListener('click', function (e) {
      var target = e.target.closest('.fiche-hero-img');
      if (target && target.src) {
        e.preventDefault();
        e.stopPropagation();
        openLB(target.src);
        return;
      }
      if (e.target === lb || e.target.closest('.close-btn')) {
        closeLB();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) closeLB();
    });
  }

  /* ── Reset filters ───────────────────────────── */
  function setupReset() {
    var btn = qs('#resetFilters');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var q = qs('#q');
      var bio = qs('#biotope');
      var diff = qs('#difficulty');
      if (q) q.value = '';
      if (bio) bio.value = 'all';
      if (diff) diff.value = 'all';
      applyFilters();
    });
  }

  /* ── Init ────────────────────────────────────── */
  function init() {
    fetchFiches().then(function (data) {
      state.all = data || [];
      state.filtered = state.all.slice();

      var statEl = qs('#statSpecies');
      if (statEl && state.all.length) statEl.textContent = state.all.length;

      populateBiotopes(state.all);
      renderList(state.filtered);

      var qInput = qs('#q');
      var bioSelect = qs('#biotope');
      var diffSelect = qs('#difficulty');
      if (qInput) qInput.addEventListener('input', applyFilters);
      if (bioSelect) bioSelect.addEventListener('change', applyFilters);
      if (diffSelect) diffSelect.addEventListener('change', applyFilters);
    });
    setupLightbox();
    setupReset();
  }

  if (qs('#species-list')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupLightbox);
    } else {
      setupLightbox();
    }
  }
})();
