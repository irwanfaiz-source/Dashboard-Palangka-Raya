/**
 * assets/js/inbound/feedback-config.js
 * Konfigurasi Papan Saran & Masukan buat modul ini. Logika utamanya ada di
 * assets/js/feedback-board.js (dipakai bareng semua modul).
 */

FeedbackBoard.configure({
  showTags: true,
  escToClose: true,
  formatTime: function (d) { return d.toLocaleString(); }
});
