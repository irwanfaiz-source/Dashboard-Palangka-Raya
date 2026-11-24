/**
 * assets/js/inventory-control/feedback-config.js
 * Konfigurasi Papan Saran & Masukan buat modul ini. Logika utamanya ada di
 * assets/js/feedback-board.js (dipakai bareng semua modul).
 * fbDb (state-and-devisi.js) & formatDateTimeShort (dialogs-and-shortcuts.js) dipanggil saat runtime.
 */

FeedbackBoard.configure({
  showTags: true,
  getDb: function () { return fbDb; },
  formatTime: function (d) { return formatDateTimeShort(d); }
});
