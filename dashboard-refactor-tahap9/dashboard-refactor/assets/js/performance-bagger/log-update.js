/**
 * assets/js/performance-bagger/log-update.js — Log Update: riwayat import (listener, modal, hapus)
 * Bagian 5/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== LOG UPDATE (riwayat import file: nama file + jam + siapa yang import) ====
// Data log ditulis oleh 4 fungsi import (PDVT harian, raw bulanan, per jam, roster) ke
// FB_PB_ROOT/importLogs. Di sini cuma bagian BACA + TAMPIL + HAPUS.
// Listener cuma nempel selama modal kebuka (off pas ditutup) dan dibatasi PB_LOG_LIMIT entri
// terakhir. orderByKey dipakai karena push-ID Firebase urut waktu, jadi gak butuh .indexOn.
const PB_LOG_LIMIT = 100;
// true = tombol hapus log cuma muncul buat PB_RESET_ALLOWED_EMAIL (pola yang sama kayak Reset Data).
// Ganti ke false kalau mau semua user login bisa hapus (yang BENAR-BENAR nentuin tetap Firebase Rules).
const PB_LOG_DELETE_ADMIN_ONLY = true;

let pbLogEntries = [];
let pbLogRef = null;
let pbLogHandler = null;
let pbLogState = 'loading'; // loading | ok | error

const PB_LOG_TYPE_STYLE = {
  pdvt:   'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  hourly: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  raw:    'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  roster: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
};

// Log lama belum punya field "type" (kecuali hourly), jadi ditebak dari isi "tanggal".
function pbLogType(log) {
  if (log.type && PB_LOG_TYPE_STYLE[log.type]) return log.type;
  const tgl = String(log.tanggal || '');
  if (tgl === 'Auto-Fill Roster') return 'roster';
  if (tgl.indexOf(' s/d ') !== -1) return 'raw';
  return 'pdvt';
}

function pbLogFormatTime(dt) {
  if (!(dt instanceof Date) || isNaN(dt)) return '-';
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return pad(dt.getDate()) + ' ' + getMonthNames()[dt.getMonth()] + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes());
}

function pbLogCanDelete() {
  return PB_LOG_DELETE_ADMIN_ONLY ? isPbResetAllowed() : true;
}

function renderPbLogList() {
  const box = document.getElementById('pbLogList');
  if (!box) return;
  const note = document.getElementById('pbLogLimitNote');

  if (pbLogState === 'error') {
    box.innerHTML = '<div class="p-4 text-center text-rose-500 font-sans">' + escapeHtml(t('pb.log.errLoad')) + '</div>';
    if (note) note.classList.add('hidden');
    return;
  }
  if (pbLogState === 'loading' && pbLogEntries.length === 0) {
    box.innerHTML = '<div class="p-4 text-center text-slate-400 dark:text-slate-500 font-sans">' + escapeHtml(t('pb.log.loading')) + '</div>';
    if (note) note.classList.add('hidden');
    return;
  }
  if (pbLogEntries.length === 0) {
    box.innerHTML = '<div class="p-4 text-center text-slate-400 dark:text-slate-500 font-sans">' + escapeHtml(t('pb.log.empty')) + '</div>';
    if (note) note.classList.add('hidden');
    return;
  }

  const canDelete = pbLogCanDelete();
  box.innerHTML = pbLogEntries.map(function (log) {
    const dt = log.importedAt ? new Date(log.importedAt) : null;
    const validDt = dt && !isNaN(dt);
    const jamStr = validDt ? pbLogFormatTime(dt) : '-';
    const jamFull = validDt ? dt.toLocaleString(I18n.lang() === 'en' ? 'en-GB' : 'id-ID') : '';
    const type = pbLogType(log);
    const name = escapeHtml(log.fileName || '-');
    const by = escapeHtml(log.importedBy || '-');
    const meta = [];
    if (log.tanggal) meta.push(escapeHtml(log.tanggal));
    if (log.rowCount !== undefined && log.rowCount !== null) meta.push(escapeHtml(t('pb.log.operators', { n: Number(log.rowCount).toLocaleString('id-ID') })));
    const delBtn = canDelete
      ? '<button type="button" data-log-del="' + escapeHtml(log._key) + '" class="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition" title="' + escapeHtml(t('pb.log.deleteTitle')) + '" aria-label="' + escapeHtml(t('pb.log.deleteTitle')) + '"><i class="fa-solid fa-trash-can"></i></button>'
      : '';
    return '<div class="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50">' +
      '<div class="col-span-5 min-w-0 text-left font-sans">' +
        '<div class="truncate font-semibold text-slate-700 dark:text-slate-200" title="' + name + '">' + name + '</div>' +
        '<div class="flex items-center gap-1.5 mt-0.5 min-w-0">' +
          '<span class="shrink-0 px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wide ' + PB_LOG_TYPE_STYLE[type] + '">' + escapeHtml(t('pb.log.type.' + type)) + '</span>' +
          '<span class="truncate text-[10px] text-slate-400 dark:text-slate-500" title="' + meta.join(' · ') + '">' + meta.join(' · ') + '</span>' +
        '</div>' +
      '</div>' +
      '<span class="col-span-3 text-slate-600 dark:text-slate-300" title="' + escapeHtml(jamFull) + '">' + escapeHtml(jamStr) + '</span>' +
      '<span class="col-span-3 truncate text-slate-600 dark:text-slate-300" title="' + by + '">' + by + '</span>' +
      '<span class="col-span-1 text-right">' + delBtn + '</span>' +
    '</div>';
  }).join('');

  if (note) {
    if (pbLogEntries.length >= PB_LOG_LIMIT) {
      note.textContent = t('pb.log.limitNote', { n: PB_LOG_LIMIT });
      note.classList.remove('hidden');
    } else {
      note.classList.add('hidden');
    }
  }
}

function attachPbLogListener() {
  if (pbLogRef) return;
  if (!fbDb) { pbLogState = 'error'; renderPbLogList(); return; }
  if (pbLogEntries.length === 0) pbLogState = 'loading';
  pbLogRef = fbDb.ref(FB_PB_ROOT + '/importLogs').orderByKey().limitToLast(PB_LOG_LIMIT);
  pbLogHandler = pbLogRef.on('value', function (snapshot) {
    const val = snapshot.val() || {};
    pbLogEntries = Object.keys(val).map(function (k) {
      return Object.assign({}, val[k], { _key: k });
    });
    pbLogEntries.sort(function (a, b) { return new Date(b.importedAt) - new Date(a.importedAt); });
    pbLogState = 'ok';
    renderPbLogList();
  }, function (err) {
    console.error('Gagal baca log update dari Firebase:', err);
    pbLogRef = null; pbLogHandler = null; // Firebase otomatis batalin listener kalau error
    pbLogState = 'error';
    renderPbLogList();
  });
}

function detachPbLogListener() {
  if (pbLogRef && pbLogHandler) pbLogRef.off('value', pbLogHandler);
  pbLogRef = null; pbLogHandler = null;
}

function deletePbLogEntry(key) {
  if (!pbLogCanDelete()) { showToast(t('pb.log.deleteDenied'), 'err'); return; }
  if (!fbDb) { showToast('⚠️ Belum terhubung ke database online.', 'info'); return; }
  const log = pbLogEntries.find(function (l) { return l._key === key; });
  if (!log) return;
  if (!confirm(t('pb.log.confirmDelete', { f: log.fileName || '-' }))) return;
  fbDb.ref(FB_PB_ROOT + '/importLogs/' + key).remove().catch(function (err) {
    const denied = err && (err.code === 'PERMISSION_DENIED' || /permission_denied/i.test(err.message || ''));
    showToast(denied ? t('pb.log.deleteDenied') : t('pb.log.deleteErr') + (err && err.message ? err.message : err), 'err');
  });
}

function openPbLogModal() {
  const sb = document.getElementById('appSidebar');
  if (sb && sb.classList.contains('open')) toggleAppSidebar();
  pbLogState = pbLogEntries.length ? 'ok' : 'loading';
  document.getElementById('pbLogModal').classList.remove('hidden');
  renderPbLogList();
  attachPbLogListener();
  const x = document.getElementById('pbLogCloseX');
  if (x) x.focus();
}

function closePbLogModal() {
  document.getElementById('pbLogModal').classList.add('hidden');
  detachPbLogListener();
  const btn = document.getElementById('pbLogBtn');
  if (btn) btn.focus();
}

// Dipanggil pas ganti bahasa & saat init: title tombol header + render ulang list kalau modal kebuka
window.pbLogRefresh = function () {
  const btn = document.getElementById('pbLogBtn');
  if (btn) btn.title = t('pb.log.title');
  const modal = document.getElementById('pbLogModal');
  if (modal && !modal.classList.contains('hidden')) renderPbLogList();
};

document.getElementById('pbLogList').addEventListener('click', function (e) {
  const btn = e.target.closest('[data-log-del]');
  if (btn) deletePbLogEntry(btn.getAttribute('data-log-del'));
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape' && e.key !== 'Esc') return;
  const modal = document.getElementById('pbLogModal');
  if (modal && !modal.classList.contains('hidden')) closePbLogModal();
});

