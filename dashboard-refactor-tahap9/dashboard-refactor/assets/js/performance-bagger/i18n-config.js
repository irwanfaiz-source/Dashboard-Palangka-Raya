/**
 * assets/js/performance-bagger/i18n-config.js
 * Konfigurasi terjemahan modul ini. Mesinnya ada di assets/js/i18n-engine.js.
 * Kamus: I18N_DICT di i18n.js (format { id: { kunci: teks }, en: {...} }).
 * I18n.start() dipanggil dari init.js (DOMContentLoaded).
 */

I18n.configure({
  lookup: I18n.byLang(function () { return I18N_DICT; }),
  onStart: function () {
    if (window.pbLogRefresh) pbLogRefresh();
  },
  onChange: function () {
    // Semua konten yang dirender lewat JS (bukan elemen data-i18n statis) harus
    // di-render ulang manual, karena teksnya "dibekukan" saat pertama kali dirender.
    if (document.getElementById("thTotalCol")) renderThTotalHeader();
    if (document.getElementById("pbTableBody")) renderPbTable(); // ini juga cascade ke summary, agency chart, leaderboard

    // Kalau modal detail harian sedang kebuka, refresh juga isinya
    const detailModal = document.getElementById("pbDetailModal");
    if (detailModal && detailModal.classList.contains("active") && currentDetailOpsId) {
      openPbDetail(currentDetailOpsId);
    }

    // Modal Log Update: title tombol + isi list ikut bahasa baru
    if (window.pbLogRefresh) pbLogRefresh();

    // Kalau modal Statistik Top 20 lagi kebuka, render ulang biar label ikut bahasa baru
    if (window.pbStatsRefresh) pbStatsRefresh();

    // Kalau papan Saran & Masukan sedang kebuka, refresh state kosong/error/list-nya
    FeedbackBoard.render();
  }
});
