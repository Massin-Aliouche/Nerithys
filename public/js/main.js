/* ═══════════════════════════════════════════════════════
   Nerithys — main.js  (theme toggle + reveal animations)
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Scroll reveal ──────────────────────────────── */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { observer.observe(el); });
  }

  /* ── Init ───────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
  });
})();
