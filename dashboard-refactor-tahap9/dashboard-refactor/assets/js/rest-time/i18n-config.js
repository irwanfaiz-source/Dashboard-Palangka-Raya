/**
 * assets/js/rest-time/i18n-config.js
 * Konfigurasi terjemahan modul ini. Mesinnya ada di assets/js/i18n-engine.js.
 * Kamus: I18N_DICT di i18n-dict.js (format { id: { kunci: teks }, en: {...} }).
 * I18n.start() dipanggil dari i18n-refresh-and-start.js saat halaman siap.
 */

I18n.configure({
  lookup: I18n.byLang(function () { return I18N_DICT; }),
  onChange: function () {
    refreshDynamicModuleTexts(); // ada di i18n-refresh-and-start.js
  }
});
