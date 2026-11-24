/**
 * assets/js/app-shell-bridge.js
 * ------------------------------------------------------------------
 * Jembatan antara modul (di dalam iframe) dan app-shell (index.html).
 * Kalau halaman dibuka langsung (bukan di iframe), semua ini gak aktif dan
 * link sidebar jalan normal. Kalau di dalam iframe, klik link ke modul lain
 * di-intercept dan diteruskan ke shell lewat postMessage, biar shell yang
 * pindah tab tanpa reload.
 *
 * Pemakaian (lihat assets/js/<modul>/app-shell-bridge.js):
 *   AppShellBridge.init({
 *     links: [[idElemen, tab, submenu?], ...],
 *     onMessage: function (data) { ... }   // pesan khusus modul (opsional)
 *   });
 *
 * Pesan 'collapseSidebarGroups' ditangani di sini (butuh
 * collapseAllSidebarGroups() dari common.js).
 *
 * Keamanan: pesan masuk hanya diterima dari origin yang sama dengan halaman,
 * dan pesan keluar hanya dikirim ke origin itu (kecuali file:// saat dev).
 */
var AppShellBridge = (function () {
  'use strict';

  function targetOrigin() {
    return window.location.origin && window.location.origin !== 'null' ? window.location.origin : '*';
  }

  function hijack(id, tab, submenu, target) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function (e) {
      e.preventDefault();
      window.top.postMessage({ source: 'pkydc', type: 'switchTab', tab: tab, submenu: submenu || null }, target);
    });
  }

  function init(opts) {
    opts = opts || {};
    if (window.self === window.top) return; // dibuka langsung, biarin behavior default
    var target = targetOrigin();
    (opts.links || []).forEach(function (l) { hijack(l[0], l[1], l[2], target); });

    window.addEventListener('message', function (e) {
      if (target !== '*' && e.origin !== target) return;
      var data = e.data;
      if (!data || data.source !== 'pkydc') return;
      // Suruh nutup semua grup Sidebar tiap kali shell nge-switch balik ke tab ini
      if (data.type === 'collapseSidebarGroups' && typeof collapseAllSidebarGroups === 'function') collapseAllSidebarGroups();
      if (typeof opts.onMessage === 'function') opts.onMessage(data);
    });
  }

  return { init: init };
})();
