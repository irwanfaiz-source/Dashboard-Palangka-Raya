/**
 * assets/js/performance-bagger/reset-and-raw-import.js — Reset data, load per jam, import mentah & terproses ke Firebase
 * Bagian 6/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== RESET DATA (hapus semua data Performance Bagger di dashboard + RTDB) ====
// Yang dihapus: dailyRecords, hourlyRecords, hourlyCoverage, importLogs. Roster (hardcode di JS) tidak ikut.
// Tombol cuma tampil buat PB_RESET_ALLOWED_EMAIL. Itu cuma lapisan UI; yang BENAR-BENAR nolak akun lain adalah Firebase Rules.
const PB_RESET_ALLOWED_EMAIL = 'irwan.faiz@spxexpress.com';

function isPbResetAllowed() {
  let email = window.__authUserEmail || '';
  try { const u = firebase.auth().currentUser; if (u && u.email) email = u.email; } catch (e) {}
  return String(email).trim().toLowerCase() === PB_RESET_ALLOWED_EMAIL;
}

function applyPbResetPermission() {
  const show = isPbResetAllowed();
  ['pbResetBtn', 'pbResetSep'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  });
}

(function initPbResetPermission() {
  applyPbResetPermission();
  try { firebase.auth().onAuthStateChanged(function () { applyPbResetPermission(); }); } catch (e) {}
  // jaga-jaga kalau email baru ke-set belakangan oleh auth-guard.js
  let tries = 0;
  const iv = setInterval(function () {
    applyPbResetPermission();
    if (isPbResetAllowed() || ++tries > 20) clearInterval(iv);
  }, 500);
})();

function resetPbData() {
  if (!isPbResetAllowed()) { showToast('⛔ Reset Data cuma bisa dipakai oleh admin yang ditentukan.', 'err'); return; }
  if (!fbDb) { showToast('⚠️ Belum terhubung ke database online.', 'info'); return; }
  const typed = prompt(
    '⚠️ RESET DATA\n\nIni akan MENGHAPUS PERMANEN semua data Performance Bagger di database online (BUKAN cuma bulan yang lagi dibuka):\n' +
    '• Data harian semua tanggal\n• Data per jam\n• Riwayat import\n\nTidak bisa di-undo.\n\nKetik RESET untuk lanjut:'
  );
  if (typed === null) return;
  if (typed.trim() !== 'RESET') { showToast('Reset dibatalkan, kata konfirmasi gak sesuai.', 'info'); return; }

  const btn = document.getElementById('pbResetBtn');
  btn.disabled = true;
  const updates = {};
  updates[FB_PB_ROOT + '/dailyRecords'] = null;
  updates[FB_PB_ROOT + '/hourlyRecords'] = null;
  updates[FB_PB_ROOT + '/hourlyCoverage'] = null;
  updates[FB_PB_ROOT + '/importLogs'] = null;

  fbDb.ref().update(updates).then(function () {
    pbMonthlyRecords = {};
    closePbDetail();
    if (hourChartInstance) { hourChartInstance.destroy(); hourChartInstance = null; }
    document.getElementById('pbFileName').innerText = 'Belum ada import';
    renderPbTable();
    showToast('🗑️ Semua data berhasil direset.', 'ok');
    // catatan audit, best-effort (kalau rules nolak, reset tetap sukses)
    fbDb.ref(FB_PB_ROOT + '/resetLogs').push({ resetAt: new Date().toISOString(), resetBy: window.__authUserEmail || 'unknown' }).catch(function () {});
  }).catch(function (err) {
    const denied = err && (err.code === 'PERMISSION_DENIED' || /permission_denied/i.test(err.message || ''));
    showToast(denied ? '⛔ Kamu gak punya izin buat reset data.' : '❌ Gagal reset: ' + err.message, 'err');
  }).then(function () { btn.disabled = false; });
}

function refreshPbHourSelect(opsId, dateKeys) {
  const sel = document.getElementById('pbHourDateSelect');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = dateKeys.slice().reverse().map(function (d) { return '<option value="' + d + '">' + formatTanggalId(d) + '</option>'; }).join('');
  if (prev && dateKeys.indexOf(prev) !== -1) sel.value = prev;
  loadPbHourly();
}

function loadPbHourly() {
  const sel = document.getElementById('pbHourDateSelect');
  const info = document.getElementById('pbHourInfo');
  const d = sel.value;
  const opsId = currentDetailOpsId;
  if (!d || !opsId || !fbDb) { info.innerText = 'Belum ada data.'; return; }
  Promise.all([
    fbDb.ref(FB_PB_ROOT + '/hourlyRecords/' + d + '/' + opsId).once('value'),
    fbDb.ref(FB_PB_ROOT + '/hourlyCoverage/' + d).once('value')
  ]).then(function (snaps) {
    if (sel.value !== d || currentDetailOpsId !== opsId) return;
    const hours = snaps[0].val() || {};
    const cov = snaps[1].val() || {};
    const staff = computePbAggregates()[opsId];
    const threshold = staff ? (ACHIEVEMENT_THRESHOLD[staff.status] || ACHIEVEMENT_THRESHOLD['DW On Call']) : 0;
    const perHourTarget = Math.round(threshold / 8);

    const labels = [];
    const data = [];
    for (let h = 0; h < 24; h++) {
      const hh = pad2(h);
      labels.push(hh + ':00');
      data.push(cov['h' + hh] ? (hours['h' + hh] || 0) : null);
    }

    renderPbHourChart(labels, data, perHourTarget);

    const covKeys = Object.keys(cov).sort();
    if (!covKeys.length) { info.innerText = 'Belum ada import per jam untuk tanggal ini.'; return; }
    const sumH = Object.keys(hours).reduce(function (a, k) { return a + hours[k]; }, 0);
    const rec = pbMonthlyRecords[d] && pbMonthlyRecords[d][opsId];
    const daily = rec ? (rec.packed || 0) : 0;
    info.innerText = 'Cakupan ' + covKeys[0].slice(1) + ':00–' + covKeys[covKeys.length - 1].slice(1) + ':00 (' + covKeys.length + ' jam) • Data jam ' +
      sumH.toLocaleString('id-ID') + ' dari ' + daily.toLocaleString('id-ID') + ' total harian • Target/jam ' + perHourTarget.toLocaleString('id-ID');
  }).catch(function (err) { info.innerText = 'Gagal baca data per jam: ' + err.message; });
}

function processPbRawImport(rows, dateCols, fileName) {
  const sortedDates = dateCols.slice().sort();
  const byDate = {};
  sortedDates.forEach(function (d) { byDate[d] = {}; });

  let matchedOps = 0;
  let duplicatesFound = 0;

  rows.forEach(function (row) {
    const parsed = parsePbOpsIdName(getPbFieldValue(row, ['User Email']));
    if (!parsed) return;
    
    matchedOps++;
    const staff = pbStaffMap[parsed.opsId];
    sortedDates.forEach(function (d) {
      const packedRaw = row[d];
      const packed = parseInt(String(packedRaw).replace(/[^\d-]/g, ''), 10);
      if (isNaN(packed)) return;

      if (byDate[d][parsed.opsId]) duplicatesFound++;

      byDate[d][parsed.opsId] = {
        name: staff ? staff.name : (parsed.name || parsed.opsId),
        agency: staff ? staff.agency : '-',
        packed: packed
      };
    });
  });

  if (!matchedOps) { showToast('Gak ada baris dengan format [OpsID]Nama di kolom "User Email" bro.', 'err'); return; }

  const rangeLabel = sortedDates[0] + ' s/d ' + sortedDates[sortedDates.length - 1];
  let confirmMsg = `Terdeteksi raw export mingguan: ${sortedDates.length} tanggal (${rangeLabel}) untuk ${matchedOps} operator.`;
  if (duplicatesFound > 0) {
    confirmMsg += `\n\n⚠️ PERINGATAN DEDUPLIKASI: Ditemukan ${duplicatesFound} data ganda (OpsID ganda pada tanggal yang sama). Sistem akan menimpa data lama dengan yang paling baru.`;
  }
  confirmMsg += '\n\nLanjut import semua sekaligus?';

  if (!confirm(confirmMsg)) return;

  pushPbRawImportToFirebase(byDate, sortedDates, fileName, matchedOps);
}

function pushPbRawImportToFirebase(byDate, sortedDates, fileName, opsCount) {
  if (!fbDb) { showToast('⚠️ Belum terhubung ke database online.', 'info'); return; }
  const importedAtStr = new Date().toISOString();
  const importedByStr = window.__authUserEmail || 'unknown';
  const updates = {};
  sortedDates.forEach(function (dateStr) {
    Object.keys(byDate[dateStr]).forEach(function (opsId) {
      updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/name'] = byDate[dateStr][opsId].name;
      updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/agency'] = byDate[dateStr][opsId].agency;
      updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/packed'] = byDate[dateStr][opsId].packed;
      updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/importedAt'] = importedAtStr;
      updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/importedBy'] = importedByStr;
      updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/source'] = null;
    });
  });
  fbDb.ref().update(updates).then(function () {
    const logKey = fbDb.ref(FB_PB_ROOT + '/importLogs').push().key;
    return fbDb.ref(FB_PB_ROOT + '/importLogs/' + logKey).set({
      fileName: fileName, type: 'raw',
      tanggal: sortedDates[0] + ' s/d ' + sortedDates[sortedDates.length - 1] + ' (' + sortedDates.length + ' hari)',
      rowCount: opsCount,
      importedAt: importedAtStr, importedBy: importedByStr
    });
  }).then(function () {
    document.getElementById('pbFileName').innerText = fileName + ' → ' + sortedDates.length + ' hari';
  }).catch(function (err) {
    showToast('❌ Gagal import ke database online: ' + err.message, 'err');
  });
}

function processPbImport(rows, dateStr, fileName) {
  if (!rows || !rows.length) { showToast('File kosong atau format gak kebaca bro.', 'err'); return; }
  const records = {};
  let duplicatesFound = 0;

  rows.forEach(function (row) {
    const opsId = String(getPbFieldValue(row, ['OpsID', 'Ops Id', 'Ops ID', 'ID Ops']) || '').trim();
    if (!opsId) return;
    const name = String(getPbFieldValue(row, ['Staff Name', 'Nama', 'Name']) || '').trim();
    const agency = String(getPbFieldValue(row, ['Agency', 'Agensi']) || '').trim();
    const packedRaw = getPbFieldValue(row, ['Total Packed', 'Packed', 'Jumlah Packed', 'Qty Packed']);
    const packed = parseInt(String(packedRaw).replace(/[^\d-]/g, ''), 10);
    if (isNaN(packed)) return;

    if (records[opsId]) duplicatesFound++;

    records[opsId] = { name: name || (pbStaffMap[opsId] ? pbStaffMap[opsId].name : opsId), agency: agency || (pbStaffMap[opsId] ? pbStaffMap[opsId].agency : '-'), packed: packed };
  });
  const keys = Object.keys(records);
  if (!keys.length) { showToast('Gak ada baris valid ketemu bro.', 'err'); return; }

  let confirmMsg = `Import ${keys.length} data operator untuk tanggal ${dateStr}?`;
  if (duplicatesFound > 0) {
    confirmMsg += `\n\n⚠️ DEDUP GUARD: Ada ${duplicatesFound} OpsID ganda dalam file. Data duplikat akan dibersihkan otomatis.`;
  }

  if (!confirm(confirmMsg)) return;
  pushPbImportToFirebase(records, dateStr, fileName, keys.length);
}

function pushPbImportToFirebase(records, dateStr, fileName, rowCount) {
  if (!fbDb) { showToast('⚠️ Belum terhubung ke database online.', 'info'); return; }
  const importedAtStr = new Date().toISOString();
  const importedByStr = window.__authUserEmail || 'unknown';
  const updates = {};
  Object.keys(records).forEach(function (opsId) {
    updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/name'] = records[opsId].name;
    updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/agency'] = records[opsId].agency;
    updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/packed'] = records[opsId].packed;
    updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/importedAt'] = importedAtStr;
    updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/importedBy'] = importedByStr;
      updates[FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/source'] = null;
  });
  fbDb.ref().update(updates).then(function () {
    const logKey = fbDb.ref(FB_PB_ROOT + '/importLogs').push().key;
    return fbDb.ref(FB_PB_ROOT + '/importLogs/' + logKey).set({
      fileName: fileName, type: 'pdvt', tanggal: dateStr, rowCount: rowCount, importedAt: importedAtStr, importedBy: importedByStr
    });
  }).then(function () {
    document.getElementById('pbFileName').innerText = fileName + ' → ' + dateStr;
  }).catch(function (err) {
    showToast('❌ Gagal import ke database online: ' + err.message, 'err');
  });
}

