/**
 * assets/js/outbound/feedback-config.js
 * Konfigurasi Papan Saran & Masukan buat modul ini. Logika utamanya ada di
 * assets/js/feedback-board.js (dipakai bareng semua modul).
 * fbDb (state-and-compression.js) & formatDateTimeShort (data-processing.js) dipanggil saat runtime.
 */

FeedbackBoard.configure({
  getDb: function () { return fbDb; },
  formatTime: function (d) { return formatDateTimeShort(d); }
});
