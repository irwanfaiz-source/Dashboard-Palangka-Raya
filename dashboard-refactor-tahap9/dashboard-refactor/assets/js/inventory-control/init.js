/**
 * assets/js/inventory-control/init.js — Inisialisasi awal + mulai sync Firebase setelah login tervalidasi
 * Bagian 15/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= INIT =================
  document.getElementById('usageDateInput').value = todayStr();
  initUsageItemRows();
  // Default filter chart Daily Usage: 14 hari terakhir
  (function initDailyUsageRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 13);
    const fmt = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    dailyUsageStartDate = fmt(start);
    dailyUsageEndDate = fmt(end);
    document.getElementById('dailyRangeStart').value = dailyUsageStartDate;
    document.getElementById('dailyRangeEnd').value = dailyUsageEndDate;
  })();
  switchInvSubmenu('usage');

  // Devisi (SOC/EHA) baru bisa dihitung akurat setelah window.__authUserEmail
  // ke-set sama shell/parent halaman — kadang ini kejadian ASYNC, sesudah render
  // form pertama kali. Makanya di-polling ringan tiap 500ms: begitu emailnya
  // kebaca (atau berubah), badge Devisi otomatis ke-refresh.
  (function watchAuthEmailForDevisi() {
    let lastSeenEmail = window.__authUserEmail || null;
    setInterval(function () {
      if (window.__authUserEmail !== lastSeenEmail) {
        lastSeenEmail = window.__authUserEmail;
        updateUsageFormVisibility();
      }
    }, 500);
  })();

  // Baru mulai sync Firebase SETELAH status login kevalidasi (biar gak kena
  // permission-denied karena Security Rules butuh auth != null) - pola yang sama
  // dipakai di modul lain (outbound.html, inbound.html, dst).
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) { initInventoryFirebaseSync(); FeedbackBoard.start(); }
    });
  }
