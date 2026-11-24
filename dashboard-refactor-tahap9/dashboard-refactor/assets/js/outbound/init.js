/**
 * assets/js/outbound/init.js — Listener klik global + inisialisasi setelah login
 * Bagian 15/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

document.addEventListener('click', function(e) {
  const th = e.target.closest('[data-sort-field]');
  if (th) setGridSort(th.dataset.sortField);
});

if (window.location.hash === '#occupancy') {
  history.replaceState(null, '', window.location.pathname);
  window.addEventListener('load', function () { setTimeout(function () { switchSubmenu('occupancy'); }, 300); });
}
