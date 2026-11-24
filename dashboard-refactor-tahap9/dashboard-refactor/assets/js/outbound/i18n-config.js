/**
 * assets/js/outbound/i18n-config.js
 * Konfigurasi terjemahan modul ini. Mesinnya ada di assets/js/i18n-engine.js.
 * Kamus: APP_I18N di i18n.js (format { kunci: { id, en, ja, zh } }).
 */

I18n.configure({
  autoStart: true,
  lookup: I18n.byKey(function () { return APP_I18N; }),
  onChange: function () {
    if (typeof updateClock === 'function') updateClock();
    // Re-render semua konten dinamis biar ikut translate
    if (filteredData && filteredData.length > 0) {
      if (typeof renderDashboard === 'function') renderDashboard();
    }
    if (typeof renderLogUpdateList === 'function') renderLogUpdateList();
  }
});
