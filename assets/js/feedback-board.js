/**
 * assets/js/feedback-board.js
 * ------------------------------------------------------------------
 * Papan "Saran & Masukan" — SATU implementasi buat semua modul.
 * Dulu ada 5 salinan (inbound, inventory-control, outbound,
 * performance-bagger, rest-time) yang beda-beda tipis dan bikin data
 * di node Firebase `prDcGlobal/feedback` nggak konsisten.
 *
 * Dimuat SETELAH common.js (butuh escapeHtml). Tiap modul punya
 * assets/js/<modul>/feedback-config.js yang manggil FeedbackBoard.configure().
 *
 * PEMBACA (render) sengaja toleran, karena data di node ini ditulis oleh
 * modul-modul dengan format beda:
 *   - createdAt : angka epoch (perf-bagger, rest-time) ATAU string ISO (lainnya)
 *   - pengirim  : `user` (nama/email) ATAU `userEmail`
 *   - module/category : opsional (cuma dari inbound & inventory-control)
 *
 * PENULIS (submit) nulis SATU format di semua modul (lihat defaultBuildEntry):
 *   { message, user, userEmail, createdAt (epoch ms), module?, category? }
 * Firebase Rules node ini gak punya .validate, jadi format baru aman.
 *
 * Opsi configure():
 *   getDb       : () => database Firebase           (default firebase.database())
 *   buildEntry  : ({message,module,category}) => objek yang di-push  (opsional, default: format tunggal)
 *   formatTime  : (Date) => string                  (default dd/mm hh:mm)
 *   showTags    : tampilkan label module/category   (default false)
 *   focusOnOpen : fokus ke kolom input pas dibuka   (default true)
 *   escToClose  : tombol Esc nutup papan            (default false)
 *
 * Fungsi global di bawah (openFeedbackBoard, closeFeedbackBoard,
 * submitFeedback) dipertahankan karena dipanggil dari onclick di HTML.
 */
var FeedbackBoard = (function () {
  'use strict';

  var ROOT = 'prDcGlobal/feedback';
  var LIMIT = 200; // cukup 200 terbaru, gak narik seluruh histori tiap buka

  function pad2(n) { return String(n).padStart(2, '0'); }

  // Format tulis tunggal. `user` = nama tampilan (atau email), `userEmail` = email,
  // `createdAt` = epoch ms (angka, jadi urutan & .indexOn createdAt konsisten).
  function defaultBuildEntry(f) {
    var email = window.__authUserEmail || null;
    var name = null;
    try {
      var u = firebase.auth().currentUser;
      if (u) { name = u.displayName || null; email = email || u.email || null; }
    } catch (e) { /* biarin: pakai email dari auth-guard */ }
    var entry = { message: f.message, user: name || email || 'unknown', userEmail: email, createdAt: Date.now() };
    if (f.module) entry.module = f.module;
    if (f.category) entry.category = f.category;
    return entry;
  }

  var cfg = {
    getDb: function () { return firebase.database(); },
    buildEntry: defaultBuildEntry,
    formatTime: function (d) {
      return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    },
    showTags: false,
    focusOnOpen: true,
    escToClose: false
  };

  var entries = [];
  var attached = false;
  var loaded = false;
  var escBound = false;

  function el(id) { return document.getElementById(id); }

  // Ambil teks dari t() milik halaman; kalau key-nya belum ada di kamus
  // modul itu (t() balikin key mentah), pakai teks cadangan.
  function tr(key, fallback) {
    try {
      if (typeof t === 'function') {
        var v = t(key);
        if (v && v !== key) return v;
      }
    } catch (e) { /* abaikan, pakai fallback */ }
    return fallback;
  }

  function notify(message, type) {
    if (typeof showToast === 'function') showToast(message, type);
    else alert(message);
  }

  // createdAt bisa number ATAU string ISO. Jadikan angka biar sortir gak crash.
  function createdAtToTime(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { var n = new Date(v).getTime(); return isNaN(n) ? 0 : n; }
    return 0;
  }

  function userLabel(it) {
    if (it.user) return String(it.user);
    if (it.userEmail) return String(it.userEmail).split('@')[0];
    return tr('feedback.anon', 'unknown');
  }

  function itemHtml(it) {
    var d = it.createdAt ? new Date(it.createdAt) : null;
    var time = d && !isNaN(d) ? cfg.formatTime(d) : '-';
    var tags = '';
    if (cfg.showTags && (it.module || it.category)) {
      var catCls = it.category === 'Bug' ? 'is-bug' : (it.category === 'Fitur' ? 'is-fitur' : '');
      tags = '<div class="fb-board-item-tags">' +
        (it.module ? '<span class="fb-board-item-tag">' + escapeHtml(it.module) + '</span>' : '') +
        (it.category ? '<span class="fb-board-item-tag ' + catCls + '">' + escapeHtml(it.category) + '</span>' : '') +
        '</div>';
    }
    return '<div class="fb-board-item">' +
      '<div class="fb-board-item-head">' +
      '<span class="fb-board-item-user">' + escapeHtml(userLabel(it)) + '</span>' +
      '<span class="fb-board-item-time">' + escapeHtml(time) + '</span>' +
      '</div>' + tags +
      '<p class="fb-board-item-msg">' + escapeHtml(it.message || '') + '</p>' +
      '</div>';
  }

  function emptyHtml(text) { return '<div class="fb-board-empty">' + escapeHtml(text) + '</div>'; }

  function showListMessage(text) {
    var list = el('fbBoardList');
    if (list) list.innerHTML = emptyHtml(text);
  }

  // Gambar ulang list (+ preview dashboard kalau halamannya punya).
  // Aman dipanggil kapan aja, mis. pas ganti bahasa. Sebelum data pertama
  // datang, list dibiarkan (teks "memuat" dari HTML tetap tampil).
  function render() {
    if (!loaded) return;
    var empty = emptyHtml(tr('feedback.empty', 'Belum ada saran.'));
    var list = el('fbBoardList');
    if (list) list.innerHTML = entries.length ? entries.map(itemHtml).join('') : empty;
    var preview = el('fbDashboardPreviewList');
    if (preview) preview.innerHTML = entries.length ? entries.slice(0, 5).map(itemHtml).join('') : empty;
  }

  // Pasang listener real-time SEKALI. Aman dipanggil berulang; kalau database
  // belum siap, balikin false dan bisa dicoba lagi nanti (mis. pas dibuka).
  function start() {
    if (attached) return true;
    var db;
    try { db = cfg.getDb(); } catch (e) {
      console.error('Firebase belum siap buat Saran & Masukan:', e);
      showListMessage(tr('feedback.errorConn', 'Belum terhubung ke database.'));
      return false;
    }
    if (!db) return false;
    attached = true;
    try {
      db.ref(ROOT).limitToLast(LIMIT).on('value', function (snap) {
        var val = snap.val() || {};
        entries = Object.keys(val)
          .filter(function (k) { return val[k] && typeof val[k] === 'object'; })
          .map(function (k) { return Object.assign({}, val[k], { _key: k }); })
          .sort(function (a, b) { return createdAtToTime(b.createdAt) - createdAtToTime(a.createdAt); });
        loaded = true;
        render();
      }, function (err) {
        console.error('Gagal baca Saran & Masukan:', err);
        showListMessage(tr('feedback.errorLoad', 'Gagal memuat saran.'));
      });
    } catch (e) {
      attached = false;
      console.error('Gagal pasang listener Saran & Masukan:', e);
      showListMessage(tr('feedback.errorConn', 'Belum terhubung ke database.'));
      return false;
    }
    return true;
  }

  function open() {
    var backdrop = el('fbBoardBackdrop');
    if (!backdrop) return;
    backdrop.classList.add('open');
    start();
    render();
    var input = el('fbBoardInput');
    if (cfg.focusOnOpen && input) setTimeout(function () { input.focus(); }, 50);
  }

  function close() {
    var backdrop = el('fbBoardBackdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  function submit() {
    var input = el('fbBoardInput');
    if (!input) return;
    var moduleSel = el('fbBoardModule');
    var categorySel = el('fbBoardCategory');
    var btn = el('fbBoardSubmitBtn');

    var message = input.value.trim();
    var moduleVal = moduleSel ? moduleSel.value : '';
    var categoryVal = categorySel ? categorySel.value : '';

    // Halaman yang punya pilihan Modul & Kategori mewajibkan keduanya.
    if ((moduleSel || categorySel) && (!moduleVal || !categoryVal)) {
      notify(tr('feedback.err.selectModuleCategory', 'Pilih Modul dan Kategori dulu.'), 'err');
      return;
    }
    if (!message) return;

    var db;
    try { db = cfg.getDb(); } catch (e) { db = null; }
    if (!db) {
      notify(tr('feedback.errorConn', '⚠️ Belum terhubung ke database online.'), 'info');
      return;
    }

    if (btn) btn.disabled = true;
    db.ref(ROOT).push(cfg.buildEntry({ message: message, module: moduleVal, category: categoryVal }))
      .then(function () {
        input.value = '';
        if (moduleSel) moduleSel.value = '';
        if (categorySel) categorySel.value = '';
      })
      .catch(function (err) {
        console.error('Gagal kirim Saran & Masukan:', err);
        var base = tr('toast.err.saveFeedback', null);
        var detail = err && err.message ? err.message : String(err);
        notify(base !== null ? base + detail : tr('feedback.errorSend', 'Gagal mengirim saran. Coba lagi.'), 'err');
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  function configure(opts) {
    Object.keys(opts || {}).forEach(function (k) { cfg[k] = opts[k]; });
    if (cfg.escToClose && !escBound) {
      escBound = true;
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' && e.key !== 'Esc') return;
        var backdrop = el('fbBoardBackdrop');
        if (backdrop && backdrop.classList.contains('open')) close();
      });
    }
  }

  return {
    configure: configure,
    start: start,
    render: render,
    open: open,
    close: close,
    submit: submit,
    createdAtToTime: createdAtToTime
  };
})();

// Dipanggil dari atribut onclick/onkeydown di HTML — jangan diganti namanya.
function openFeedbackBoard() { FeedbackBoard.open(); }
function closeFeedbackBoard() { FeedbackBoard.close(); }
function submitFeedback() { FeedbackBoard.submit(); }
