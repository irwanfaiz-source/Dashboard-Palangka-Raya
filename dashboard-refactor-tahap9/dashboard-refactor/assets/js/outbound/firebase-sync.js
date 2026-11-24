/**
 * assets/js/outbound/firebase-sync.js — Sinkronisasi Firebase Outbound & push import
 * Bagian 2/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

function initOutboundFirebaseSync() {
  if (fbDb) return;
  try {
    fbDb = firebase.database();
  } catch (e) {
    console.error('Gagal connect Firebase Database:', e);
    return;
  }
  fbDb.ref(FB_OUTBOUND_ROOT + '/latestImportMeta').on('value', function (snapshot) {
    const meta = snapshot.val();
    if (!meta || !meta.importedAt) return;

    const fnEl = document.getElementById('fileName');
    if (fnEl) {
  fnEl.innerText = meta.fileName || '-';
  fnEl.title = meta.fileName || '';
}
const infoEl = document.getElementById('importInfo');
if (infoEl) {
  const importedDate = new Date(meta.importedAt);
  const ageMin = (Date.now() - importedDate.getTime()) / 60000;
  const who = String(meta.importedBy || '-').split('@')[0];
  infoEl.innerText = '🕒 ' + formatDateTimeShort(importedDate) + ' · ' + who;
  infoEl.title = 'Terakhir import: ' + importedDate.toLocaleString('id-ID') + ' oleh ' + (meta.importedBy || '-');
  infoEl.className = 'text-[9px] font-mono truncate max-w-full ' + (ageMin > 180 ? 'text-rose-300' : 'text-amber-300');
}

    if (meta.importedAt === lastKnownImportedAt) return;
    lastKnownImportedAt = meta.importedAt;

    fbDb.ref(FB_OUTBOUND_ROOT + '/latestImportData').once('value').then(async function (dataSnap) {
      const payload = dataSnap.val();
      if (!payload || !payload.dataGz) return;
      let columnar;
      try {
        const jsonStr = await decompressFromBase64(payload.dataGz);
        columnar = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Gagal decompress data import:', e);
        return;
      }
      const rows = fromColumnar(columnar);
      globalRawData = rows.map(function (row) {
        return Object.assign({}, row, {
          completeDateObj: row.completeDateObj ? new Date(row.completeDateObj) : null
        });
      });
      applyFilters();
    }, function (err) {
      console.error('Gagal baca data import dari Firebase:', err);
    });
  }, function (err) {
    console.error('Gagal baca metadata import dari Firebase:', err);
  });
}

async function pushImportToFirebase(fileNameStr) {
  if (!fbDb) { console.warn('Firebase belum siap, data import gak ke-sync ke device lain.'); return; }
  try {
    const serializable = globalRawData.map(function (row) {
      return Object.assign({}, row, {
        completeDateObj: row.completeDateObj ? row.completeDateObj.toISOString() : null
      });
    });
    const columnar = toColumnar(serializable);
    const jsonStr = JSON.stringify(columnar);
    const dataGzBase64 = await compressToBase64(jsonStr);

    const importedAtStr = new Date().toISOString();
    const importedByStr = (window.__authUserEmail || 'unknown');
    await fbDb.ref(FB_OUTBOUND_ROOT + '/latestImportData').set({
      dataGz: dataGzBase64
    });
    await fbDb.ref(FB_OUTBOUND_ROOT + '/latestImportMeta').set({
      fileName: fileNameStr,
      importedAt: importedAtStr,
      importedBy: importedByStr
    });
    const logKey = fbDb.ref(FB_OUTBOUND_ROOT + '/importLogs').push().key;
    fbDb.ref(FB_OUTBOUND_ROOT + '/importLogs/' + logKey).set({
      fileName: fileNameStr,
      importedAt: importedAtStr,
      importedBy: importedByStr
    }).catch(function (e) { console.error('Gagal catat log update:', e); });
  } catch (e) {
    console.error('Gagal sync import ke Firebase:', e);
  }
}

