/**
 * assets/js/inbound/i18n-config.js
 * Konfigurasi terjemahan modul ini. Mesinnya ada di assets/js/i18n-engine.js.
 * Kamus: APP_I18N di i18n.js (format { kunci: { id, en, ja, zh } }).
 */

I18n.configure({
  autoStart: true,
  lookup: I18n.byKey(function () { return APP_I18N; }),
  onChange: function () {
    // Re-render konten dinamis (KPI, tabel vendor/shift/detail, trend) biar ikut translate; renderAll ada di inbound-summary.js
    if (typeof renderAll === 'function') renderAll();
  }
});
