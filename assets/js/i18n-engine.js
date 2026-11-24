/**
 * assets/js/i18n-engine.js
 * ------------------------------------------------------------------
 * Engine terjemahan SATU untuk semua modul. Dulu ada dua keluarga kode
 * yang beda-beda tipis:
 *   - inbound / inventory-control / outbound : kamus APP_I18N { kunci: { id, en, ja, zh } }
 *   - performance-bagger / rest-time         : kamus I18N_DICT { id: {kunci: teks}, en: {...} }
 *
 * Kamusnya sendiri TIDAK diubah (tetap di file i18n modul masing-masing).
 * Yang dipakai bareng: t(), setAppLanguage(), penerapan teks statis, pemilih
 * bahasa (#appLangSelect), dan penyimpanan bahasa.
 *
 * Tiap modul punya assets/js/<modul>/i18n-config.js yang manggil I18n.configure():
 *   lookup    : (key, lang) => teks | undefined   (pakai I18n.byKey / I18n.byLang)
 *   onChange  : dipanggil SETELAH ganti bahasa — render ulang konten dinamis
 *   onStart   : dipanggil sekali setelah teks statis pertama kali diterapkan
 *   autoStart : true = otomatis start() saat DOM siap
 *   langs / defaultLang / storageKey / legacyKeys / syncAcrossTabs (lihat cfg di bawah)
 * Komponen bersama yang perlu ikut berganti bahasa memakai I18n.subscribe(fn) (dipanggil setelah onChange).
 *
 * Atribut HTML yang diterapkan: data-i18n (teks), data-i18n-html (innerHTML),
 * data-i18n-placeholder, data-i18n-title. Kalau sebuah key gak ada di kamus,
 * teks bawaan di HTML dibiarkan (gak ditimpa nama key mentah).
 *
 * Bahasa disimpan di localStorage 'pkydcAppLang' dan DIPAKAI BERSAMA semua
 * modul. Pilihan lama performance-bagger / rest-time ('pr_dc_app_language')
 * tetap dibaca sekali kalau kunci baru belum ada. Saat bahasa diganti di satu
 * modul, modul lain yang sedang terbuka (iframe) ikut berganti lewat event
 * 'storage' (matikan dengan syncAcrossTabs: false).
 */
var I18n = (function () {
  'use strict';

  var cfg = {
    langs: ['id', 'en', 'ja', 'zh'],
    defaultLang: 'id',
    storageKey: 'pkydcAppLang',
    legacyKeys: ['pr_dc_app_language'],
    lookup: function () { return undefined; },
    onChange: null,
    onStart: null,
    autoStart: false,
    syncAcrossTabs: true
  };

  var current = null;
  var storageBound = false;
  var startBound = false;
  var listeners = [];

  function isValid(l) { return cfg.langs.indexOf(l) !== -1; }

  function readStored() {
    var keys = [cfg.storageKey].concat(cfg.legacyKeys || []);
    for (var i = 0; i < keys.length; i++) {
      var v = null;
      try { v = window.localStorage.getItem(keys[i]); } catch (e) { /* storage diblokir */ }
      if (v && isValid(v)) return v;
    }
    return cfg.defaultLang;
  }

  function lang() {
    if (current === null) current = readStored();
    return current;
  }

  function t(key, params) {
    var v = cfg.lookup(key, lang());
    var str = v !== undefined && v !== null ? String(v) : key;
    if (params) {
      Object.keys(params).forEach(function (p) {
        str = str.split('{' + p + '}').join(params[p]);
      });
    }
    return str;
  }

  function each(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  }

  // Terapkan teks ke semua elemen statis yang punya atribut data-i18n*.
  function apply() {
    var l = lang();
    document.documentElement.lang = l;
    var title = cfg.lookup('page.title', l);
    if (title !== undefined && title !== null) document.title = title;
    var map = [
      ['[data-i18n]', 'data-i18n', function (el, v) { el.textContent = v; }],
      ['[data-i18n-html]', 'data-i18n-html', function (el, v) { el.innerHTML = v; }],
      ['[data-i18n-placeholder]', 'data-i18n-placeholder', function (el, v) { el.placeholder = v; }],
      ['[data-i18n-title]', 'data-i18n-title', function (el, v) { el.title = v; }]
    ];
    map.forEach(function (m) {
      each(m[0], function (el) {
        var v = cfg.lookup(el.getAttribute(m[1]), l);
        if (v !== undefined && v !== null) m[2](el, v);
      });
    });
  }

  function syncSelect() {
    var sel = document.getElementById('appLangSelect');
    if (sel) sel.value = lang();
  }

  // Panggil sekali pas halaman siap: terapkan bahasa tersimpan + samakan dropdown.
  function start() {
    apply();
    syncSelect();
    if (typeof cfg.onStart === 'function') cfg.onStart(lang());
  }

  function setLang(l, opts) {
    if (!isValid(l)) l = cfg.defaultLang;
    current = l;
    if (!(opts && opts.persist === false)) {
      try { window.localStorage.setItem(cfg.storageKey, l); } catch (e) { /* abaikan */ }
    }
    syncSelect();
    apply();
    if (typeof cfg.onChange === 'function') cfg.onChange(l);
    listeners.forEach(function (fn) { try { fn(l); } catch (e) { console.error('I18n.subscribe:', e); } });
  }

  // Komponen bersama (mis. AppSidebar) mendaftar di sini untuk ikut berganti teks saat bahasa diganti.
  function subscribe(fn) { if (typeof fn === 'function') listeners.push(fn); }

  function configure(opts) {
    Object.keys(opts || {}).forEach(function (k) { cfg[k] = opts[k]; });

    if (cfg.syncAcrossTabs && !storageBound) {
      storageBound = true;
      window.addEventListener('storage', function (e) {
        if (e.key !== cfg.storageKey || !e.newValue || !isValid(e.newValue) || e.newValue === lang()) return;
        setLang(e.newValue, { persist: false });
      });
    }
    if (cfg.autoStart && !startBound) {
      startBound = true;
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
      else start();
    }
  }

  // Pencari teks buat dua format kamus. Fallback ke bahasa default kalau
  // terjemahan di bahasa aktif belum ada.
  function byKey(getDict) {          // { kunci: { id: '..', en: '..' } }
    return function (key, l) {
      var e = getDict()[key];
      if (!e) return undefined;
      if (e[l] != null) return e[l];
      return e[cfg.defaultLang] != null ? e[cfg.defaultLang] : undefined;
    };
  }
  function byLang(getDict) {         // { id: { kunci: '..' }, en: { ... } }
    return function (key, l) {
      var d = getDict();
      if (d[l] && d[l][key] !== undefined) return d[l][key];
      var base = d[cfg.defaultLang];
      return base && base[key] !== undefined ? base[key] : undefined;
    };
  }

  return {
    configure: configure,
    start: start,
    apply: apply,
    setLang: setLang,
    subscribe: subscribe,
    lang: lang,
    t: t,
    byKey: byKey,
    byLang: byLang
  };
})();

// Dipanggil dari kode modul & atribut onchange di HTML — jangan diganti namanya.
function t(key, params) { return I18n.t(key, params); }
function setAppLanguage(lang) { I18n.setLang(lang); }
