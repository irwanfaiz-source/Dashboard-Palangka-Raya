/**
 * assets/js/performance-bagger/init.js — Inisialisasi (DOMContentLoaded)
 * Bagian 13/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== INITIALIZATION ====
document.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    const icon = document.getElementById('darkModeIcon');
    if (icon) icon.className = 'fa-solid fa-sun text-amber-400';
  }
  initPbFirebaseSync();
  I18n.start();
});
