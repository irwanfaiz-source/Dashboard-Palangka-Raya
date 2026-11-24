/**
 * assets/js/outbound/log-update.js — Log Update (riwayat import) + start sync setelah login
 * Bagian 3/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

let logUpdateEntries = [];

function initLogUpdateSync() {
  if (!fbDb) return;
  fbDb.ref(FB_OUTBOUND_ROOT + '/importLogs').on('value', function (snapshot) {
    const val = snapshot.val() || {};
    logUpdateEntries = Object.keys(val).map(function (k) {
      return Object.assign({}, val[k], { _key: k });
    });
    logUpdateEntries.sort(function (a, b) { return new Date(b.importedAt) - new Date(a.importedAt); });
    renderLogUpdateList();
  }, function (err) {
    console.error('Gagal baca log update dari Firebase:', err);
  });
}

function renderLogUpdateList() {
  const container = document.getElementById('logUpdateList');
  if (!container) return;
  if (logUpdateEntries.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-400 dark:text-slate-500 font-sans">Belum ada riwayat import.</div>`;
    return;
  }
  container.innerHTML = logUpdateEntries.map(function (log) {
    const dt = log.importedAt ? new Date(log.importedAt) : null;
    const jamStr = dt && !isNaN(dt) ? formatDateTimeShort(dt) : '-';
    return `<div class="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <span class="col-span-5 text-left truncate font-sans font-semibold text-slate-700 dark:text-slate-200" title="${log.fileName || '-'}">${log.fileName || '-'}</span>
      <span class="col-span-3">${jamStr}</span>
      <span class="col-span-3 truncate" title="${log.importedBy || '-'}">${log.importedBy || '-'}</span>
      <span class="col-span-1 text-right">
        <button onclick="deleteLogUpdateEntry('${log._key}')" class="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition" title="Hapus log ini">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </span>
    </div>`;
  }).join('');
}

function deleteLogUpdateEntry(key) {
  if (!fbDb) { showToast('⚠️ Belum terhubung ke database online.', 'info'); return; }
  const log = logUpdateEntries.find(function (l) { return l._key === key; });
  if (!log) return;
  if (!confirm(`Hapus log import "${log.fileName}"? Ini bakal ke-hapus juga di Firebase / semua device.`)) return;

  fbDb.ref(FB_OUTBOUND_ROOT + '/latestImportMeta').once('value').then(function (snap) {
    const active = snap.val();
    const isActiveImport = active && active.fileName === log.fileName && active.importedAt === log.importedAt;
    const updates = {};
    updates[FB_OUTBOUND_ROOT + '/importLogs/' + key] = null;
    if (isActiveImport) {
      updates[FB_OUTBOUND_ROOT + '/latestImportMeta'] = null; // ini import yg lagi aktif ditampilkan, ikut direset juga
      updates[FB_OUTBOUND_ROOT + '/latestImportData'] = null;
    }
    return fbDb.ref().update(updates).then(function () {
      if (isActiveImport) {
        globalRawData = [];
        applyFilters();
        const fnEl = document.getElementById('fileName');
        if (fnEl) fnEl.innerText = '-';
        const infoEl = document.getElementById('importInfo');
        if (infoEl) infoEl.innerText = 'Belum ada import';
      }
    });
  }).catch(function (err) {
    showToast('❌ Gagal hapus log dari database online: ' + err.message, 'err');
  });
}

function openLogUpdateModal() {
  document.getElementById('appSidebar').classList.remove('open');
  document.getElementById('appSidebarBackdrop').classList.remove('open');
  document.getElementById('logUpdateModal').classList.remove('hidden');
  renderLogUpdateList();
}
function closeLogUpdateModal() {
  document.getElementById('logUpdateModal').classList.add('hidden');
}

if (window.firebase && firebase.auth) {
  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      initOutboundFirebaseSync();
      initLogUpdateSync();
      FeedbackBoard.start();
    }
  });
}

