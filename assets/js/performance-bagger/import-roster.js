/**
 * assets/js/performance-bagger/import-roster.js — Import roster staff
 * Bagian 7/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== IMPORT ROSTER (NEW) ====
document.getElementById('pbRosterFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array', raw: true });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      
      if (!rows || !rows.length) { showToast('File kosong bro.', 'err'); e.target.value = ''; return; }
      processRosterImport(rows, file.name);
    } catch (err) {
      showToast('❌ Gagal baca file roster: ' + err.message, 'err');
    }
    e.target.value = '';
  };
  reader.readAsArrayBuffer(file);
});

function processRosterImport(rows, fileName) {
  let headerRowIdx = -1;
  let dateCols = []; 
  let opsIdColIdx = -1;

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const val = String(row[j] || '').trim();
      if (val.toLowerCase() === 'ops id') opsIdColIdx = j;
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        dateCols.push({ colIdx: j, dateStr: val });
      }
    }
    if (opsIdColIdx !== -1 && dateCols.length > 0) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    showToast('Gak ketemu baris header Ops ID & Tanggal (YYYY-MM-DD) bro di file Roster.', 'err');
    return;
  }

  const updates = {};
  let updatedCount = 0;
  
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[opsIdColIdx]) continue;
    const opsId = String(row[opsIdColIdx]).trim();
    
    const staff = pbStaffMap[opsId];
    if (!staff) continue;

    dateCols.forEach(function(dc) {
      const rosterVal = String(row[dc.colIdx] || '').trim();
      if (!rosterVal) return;

      let mappedStatus = null;
      const v = rosterVal.toLowerCase();
      if (v === 'rd' || v === 'rest day') mappedStatus = 'Rest Day';
      else if (v.includes('leave') || v.includes('cuti')) mappedStatus = 'Cuti';
      else if (v === 'nr' || v.includes('not rostered')) mappedStatus = 'Off Duty';
      else if (v.includes('sick') || v.includes('sakit') || v.includes('mc')) mappedStatus = 'Sakit';
      else if (v.includes('izin')) mappedStatus = 'Izin';

      if (!mappedStatus) return;

      const currentDayData = pbMonthlyRecords[dc.dateStr] || {};
      const existingRecord = currentDayData[opsId];
      const packedVol = existingRecord ? (existingRecord.packed || 0) : 0;
      
      if (packedVol === 0) {
        updates[FB_PB_ROOT + '/dailyRecords/' + dc.dateStr + '/' + opsId + '/statusInfo'] = mappedStatus;
        if (!existingRecord) {
          updates[FB_PB_ROOT + '/dailyRecords/' + dc.dateStr + '/' + opsId + '/packed'] = 0;
          updates[FB_PB_ROOT + '/dailyRecords/' + dc.dateStr + '/' + opsId + '/name'] = staff.name;
          updates[FB_PB_ROOT + '/dailyRecords/' + dc.dateStr + '/' + opsId + '/agency'] = staff.agency;
        }
        updatedCount++;
      }
    });
  }

  if (updatedCount === 0) {
    showToast('Gak ada data roster yang perlu di-update bro (mungkin operator udah masuk PDVT / packed > 0 semua).', 'err');
    return;
  }

  if (!confirm(`Ketemu ${updatedCount} jadwal libur/cuti/sakit untuk Auto-Fill ke DB.\n\nLanjut update Status ke database?`)) return;

  const importedAtStr = new Date().toISOString();
  const importedByStr = window.__authUserEmail || 'unknown';
  
  if (fbDb) {
    fbDb.ref().update(updates).then(function () {
      const logKey = fbDb.ref(FB_PB_ROOT + '/importLogs').push().key;
      return fbDb.ref(FB_PB_ROOT + '/importLogs/' + logKey).set({
        fileName: fileName,
        type: 'roster',
        tanggal: 'Auto-Fill Roster',
        rowCount: updatedCount,
        importedAt: importedAtStr,
        importedBy: importedByStr
      });
    }).then(function () {
      document.getElementById('pbFileName').innerText = 'Roster Auto-Fill sukses!';
      showToast('Berhasil Auto-Fill Status Roster bro!', 'ok');
    }).catch(function (err) {
      showToast('❌ Gagal update roster ke database online: ' + err.message, 'err');
    });
  } else {
    showToast('⚠️ Belum terhubung ke database online.', 'info');
  }
}

