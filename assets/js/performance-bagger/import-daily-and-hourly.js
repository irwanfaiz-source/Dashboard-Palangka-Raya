/**
 * assets/js/performance-bagger/import-daily-and-hourly.js — Import Excel harian (PDVT) & import per jam
 * Bagian 3/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== IMPORT EXCEL HARIAN (PDVT) ====
function getPbFieldValue(row, possibleKeys) {
  const rowKeys = Object.keys(row);
  for (let i = 0; i < possibleKeys.length; i++) {
    const foundKey = rowKeys.find(function (k) { return k.trim().toLowerCase() === possibleKeys[i].toLowerCase(); });
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) return row[foundKey];
  }
  return null;
}

document.getElementById('pbImportDate').valueAsDate = new Date();

function detectPbDateColumns(sampleRow) {
  if (!sampleRow) return [];
  return Object.keys(sampleRow).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(String(k).trim()); });
}

function parsePbOpsIdName(userEmail) {
  const s = String(userEmail || '').trim();
  const m = s.match(/^\[(.*?)\]\s*(.*)$/);
  if (!m) return null;
  const opsId = m[1].trim();
  if (!opsId) return null;
  return { opsId: opsId, name: m[2].trim() };
}

document.getElementById('pbExcelFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array', raw: true });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      if (!rows || !rows.length) { showToast('File kosong atau format gak kebaca bro.', 'err'); e.target.value = ''; return; }

      const hourCols = detectPbHourColumns(rows[0]);
      const dateCols = detectPbDateColumns(rows[0]);
      if (hourCols.length) {
        processPbHourlyImport(rows, hourCols, file.name);
      } else if (dateCols.length) {
        processPbRawImport(rows, dateCols, file.name);
      } else {
        const pickedDate = document.getElementById('pbImportDate').value;
        if (!pickedDate) {
          showToast('Pilih tanggal dulu bro sebelum import.', 'info');
          e.target.value = '';
          return;
        }
        processPbImport(rows, pickedDate, file.name);
      }
    } catch (err) {
      showToast('❌ Gagal baca file PDVT: ' + err.message, 'err');
    }
    e.target.value = '';
  };
  reader.readAsArrayBuffer(file);
});


// ==== IMPORT PER JAM (export PDVT 12 jam terakhir, kolom "YYYY-MM-DD HH:00") ====
// Disimpan terpisah di hourlyRecords/{tanggal}/{opsId}/h{HH}. Tidak menyentuh dailyRecords.
function detectPbHourColumns(sampleRow) {
  if (!sampleRow) return [];
  return Object.keys(sampleRow).filter(function (k) { return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(k).trim()); });
}

function processPbHourlyImport(rows, hourCols, fileName) {
  const cols = hourCols.map(function (k) { const s = String(k).trim(); return { key: k, date: s.slice(0, 10), hh: s.slice(11, 13) }; });
  const byDate = {};
  const coverage = {};
  const names = {};
  cols.forEach(function (c) {
    byDate[c.date] = byDate[c.date] || {};
    coverage[c.date] = coverage[c.date] || {};
    coverage[c.date]['h' + c.hh] = true;
  });

  let matchedOps = 0;
  let skippedRows = 0;
  rows.forEach(function (row) {
    const parsed = parsePbOpsIdName(getPbFieldValue(row, ['User Email']));
    if (!parsed) { skippedRows++; return; }
    matchedOps++;
    names[parsed.opsId] = (pbStaffMap[parsed.opsId] && pbStaffMap[parsed.opsId].name) || parsed.name || parsed.opsId;
    cols.forEach(function (c) {
      const v = parseInt(String(row[c.key]).replace(/[^\d]/g, ''), 10);
      if (isNaN(v) || v <= 0) return;
      byDate[c.date][parsed.opsId] = byDate[c.date][parsed.opsId] || {};
      byDate[c.date][parsed.opsId]['h' + c.hh] = v;
    });
  });

  if (!matchedOps) { showToast('Gak ada baris dengan format [OpsID]Nama di kolom "User Email" bro.', 'err'); return; }

  const dates = Object.keys(byDate).sort();
  let msg = 'Terdeteksi export PER JAM: ' + cols.length + ' kolom jam (' + dates.join(', ') + ') untuk ' + matchedOps + ' operator.';
  if (skippedRows > 0) msg += '\n\n⚠️ ' + skippedRows + ' baris tanpa format [OpsID]Nama di-skip (misal yang cuma email).';
  msg += '\n\nJam yang sama yang sudah pernah diimport akan dipertahankan di nilai tertinggi (jam berjalan bisa masih kecil di export lama).\n\nTotal harian operator juga otomatis diisi dari jumlah semua jam yang sudah diimport (data harian hasil import PDVT harian/mingguan tidak akan ditimpa).\n\nLanjut import?';
  if (!confirm(msg)) return;

  pushPbHourlyToFirebase(byDate, coverage, dates, fileName, matchedOps, names);
}

function pushPbHourlyToFirebase(byDate, coverage, dates, fileName, opsCount, names) {
  if (!fbDb) { showToast('⚠️ Belum terhubung ke database online.', 'info'); return; }
  names = names || {};
  const importedAtStr = new Date().toISOString();
  const importedByStr = window.__authUserEmail || 'unknown';
  let dailyWritten = 0;
  let dailySkipped = 0;
  Promise.all(dates.map(function (d) {
    return Promise.all([
      fbDb.ref(FB_PB_ROOT + '/hourlyRecords/' + d).once('value'),
      fbDb.ref(FB_PB_ROOT + '/dailyRecords/' + d).once('value')
    ]);
  }))
    .then(function (snaps) {
      const updates = {};
      dates.forEach(function (d, i) {
        const existing = snaps[i][0].val() || {};
        const existingDaily = snaps[i][1].val() || {};
        Object.keys(byDate[d]).forEach(function (opsId) {
          const hoursOld = existing[opsId] || {};
          const hoursNew = byDate[d][opsId];
          const hourKeys = Object.keys(hoursOld).concat(Object.keys(hoursNew)).filter(function (k, idx, arr) { return arr.indexOf(k) === idx; });
          let sum = 0;
          hourKeys.forEach(function (hk) {
            const merged = Math.max(hoursOld[hk] || 0, hoursNew[hk] || 0);
            updates[FB_PB_ROOT + '/hourlyRecords/' + d + '/' + opsId + '/' + hk] = merged;
            sum += merged;
          });

          // Total harian otomatis = jumlah semua jam yang udah diimport.
          // Kalau tanggal itu udah ada data dari import PDVT harian/mingguan (packed > 0, bukan dari per jam), JANGAN ditimpa.
          const dRec = existingDaily[opsId];
          const fromPdvt = dRec && (dRec.packed || 0) > 0 && dRec.source !== 'hourly';
          if (fromPdvt) { dailySkipped++; return; }
          const staff = pbStaffMap[opsId];
          const base = FB_PB_ROOT + '/dailyRecords/' + d + '/' + opsId;
          updates[base + '/name'] = staff ? staff.name : (names[opsId] || (dRec && dRec.name) || opsId);
          updates[base + '/agency'] = staff ? staff.agency : ((dRec && dRec.agency) || '-');
          updates[base + '/packed'] = sum;
          updates[base + '/source'] = 'hourly';
          updates[base + '/importedAt'] = importedAtStr;
          updates[base + '/importedBy'] = importedByStr;
          dailyWritten++;
        });
        Object.keys(coverage[d]).forEach(function (hk) {
          updates[FB_PB_ROOT + '/hourlyCoverage/' + d + '/' + hk] = true;
        });
      });
      return fbDb.ref().update(updates);
    })
    .then(function () {
      const logKey = fbDb.ref(FB_PB_ROOT + '/importLogs').push().key;
      return fbDb.ref(FB_PB_ROOT + '/importLogs/' + logKey).set({
        fileName: fileName, type: 'hourly',
        tanggal: dates.join(', '), rowCount: opsCount,
        importedAt: importedAtStr, importedBy: importedByStr
      });
    })
    .then(function () {
      document.getElementById('pbFileName').innerText = fileName + ' → data per jam ' + dates.join(', ');
      let msg = '✅ Data per jam masuk bro. Total harian terisi untuk ' + dailyWritten + ' operator.';
      if (dailySkipped > 0) msg += '\n' + dailySkipped + ' operator di-skip karena total harian dari import PDVT sudah ada.';
      showToast(msg, 'ok');
      if (currentDetailOpsId) loadPbHourly();
    })
    .catch(function (err) { showToast('❌ Gagal import per jam: ' + err.message, 'err'); });
}

let hourChartInstance = null;

