/* ═══════════════════════════════════════════════════════
   Nerithys — ui.js  (cards, filters, lightbox)
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Helpers ────────────────────────────────────── */
  var state = { all: [], filtered: [] };

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return document.querySelectorAll(sel); }

  function getBase() {
    if (typeof window.ASSET_PATH === 'string' && window.ASSET_PATH !== '') {
      return window.ASSET_PATH.endsWith('/') ? window.ASSET_PATH : window.ASSET_PATH + '/';
    }
    return './';
  }

  /* ── Fetch fiches JSON ──────────────────────────── */
  function fetchFiches() {
    var base = getBase();
    // Try multiple paths for resilience
    var urls = [
      base + 'content/fiches.json',
      './content/fiches.json',
      'content/fiches.json'
    ];
    // Dedupe
    var seen = {};
    urls = urls.filter(function (u) {
      if (seen[u]) return false;
      seen[u] = true;
      return true;
    });

    function tryFetch(i) {
      if (i >= urls.length) {
        console.warn('[Nerithys] Could not load fiches.json from any path');
        return Promise.resolve([]);
      }
      return fetch(urls[i])
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        })
        .then(function (data) {
          if (Array.isArray(data)) return data;
          if (data && Array.isArray(data.fiches)) return data.fiches;
          throw new Error('unexpected format');
        })
        .catch(function () {
          return tryFetch(i + 1);
        });
    }
    return tryFetch(0);
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

  /* ── Create a card ──────────────────────────────── */
  function createCard(item, index) {
    var base = getBase();
    var slug = item.slug || '';
    var href = base + 'fiches/' + encodeURIComponent(slug) + '/';
    var imgSrc = (item.images && item.images[0]) || '';
    var diff = Number(item.difficulty) || 0;

    var card = document.createElement('div');
    card.className = 'card reveal';
    if (index !== undefined) {
      var delayClass = index % 3;
      if (delayClass > 0) card.className += ' reveal-delay-' + delayClass;
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
            '<span class="badge badge-slate">' + (item.biotope || '—') + '</span>' +
            '<span class="badge badge-slate">' + (item.minVolumeL || '—') + ' L</span>' +
          '</div>' +
        '</div>' +
      '</a>';
    return card;
  }

  /* ── Render cards ───────────────────────────────── */
  function renderList(list) {
    var container = qs('#species-list');
    if (!container) return;
    container.innerHTML = '';

    if (!list.length) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
          '<p>Aucune fiche trouvée</p>' +
        '</div>';
      return;
    }

    var featured = Number(container.dataset.featured) || 0;
    var toShow = featured > 0 ? list.slice(0, featured) : list;

    toShow.forEach(function (item, i) {
      container.appendChild(createCard(item, i));
    });

    // Trigger reveal for dynamically created cards
    requestAnimationFrame(function () {
      if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add('visible');
              obs.unobserve(e.target);
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
        container.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
      } else {
        container.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
      }
    });

    // Update counter
    var counter = qs('#resultsCount');
    if (counter) {
      var total = state.all.length;
      counter.textContent = toShow.length + ' fiche' + (toShow.length > 1 ? 's' : '') +
        (featured ? '' : ' sur ' + total);
    }
  }

  /* ── Filters ────────────────────────────────────── */
  function applyFilters() {
    var qVal = (qs('#q') ? qs('#q').value : '').trim().toLowerCase();
    var bio = qs('#biotope') ? qs('#biotope').value : 'all';
    var diff = qs('#difficulty') ? qs('#difficulty').value : 'all';

    state.filtered = state.all.filter(function (it) {
      if (qVal) {
        var haystack = [it.name, it.scientificName, it.biotope, it.family, it.notes]
          .filter(Boolean).join(' ').toLowerCase();
        if (haystack.indexOf(qVal) === -1) return false;
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

  /* ── Lightbox ───────────────────────────────────── */
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
      // Open on image click
      var target = e.target.closest('.card-img, .fiche-hero-img');
      if (target && target.src) {
        e.preventDefault();
        e.stopPropagation();
        openLB(target.src);
        return;
      }
      // Close
      if (e.target === lb || e.target.closest('.close')) {
        closeLB();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) {
        closeLB();
      }
    });
  }

  /* ── Init ───────────────────────────────────────── */
  function init() {
    fetchFiches().then(function (data) {
      state.all = data || [];
      state.filtered = state.all.slice();

      // Update stat counter if present
      var statEl = qs('#statSpecies');
      if (statEl && state.all.length) {
        statEl.textContent = state.all.length;
      }

      populateBiotopes(state.all);
      renderList(state.filtered);

      // Bind filter events
      var qInput = qs('#q');
      var bioSelect = qs('#biotope');
      var diffSelect = qs('#difficulty');
      if (qInput) qInput.addEventListener('input', applyFilters);
      if (bioSelect) bioSelect.addEventListener('change', applyFilters);
      if (diffSelect) diffSelect.addEventListener('change', applyFilters);
    });
    setupLightbox();
  }

  // Run init if #species-list exists (homepage or listing)
  if (qs('#species-list')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  } else {
    // Fiche detail page: just setup lightbox
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupLightbox);
    } else {
      setupLightbox();
    }
  }
})();
