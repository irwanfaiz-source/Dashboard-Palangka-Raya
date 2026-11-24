/**
 * assets/js/performance-bagger/daily-status.js — Update status harian operator (manual via popup)
 * Bagian 8/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== UPDATE STATUS HARIAN OPERATOR (MANUAL VIA POPUP) ====
function updateDailyStatusInfo(dateStr, opsId, selectEl) {
  const val = selectEl.value;
  const customInput = document.getElementById(`custom-status-${dateStr}`);
  
  if (val === 'Lainnya...') {
    if (customInput) customInput.classList.remove('hidden');
    return;
  } else {
    if (customInput) customInput.classList.add('hidden');
  }

  saveDailyStatusToFirebase(dateStr, opsId, val);
}

function updateDailyStatusCustom(dateStr, opsId, inputEl) {
  const val = inputEl.value.trim();
  if (!val) return;
  saveDailyStatusToFirebase(dateStr, opsId, val);
}

function saveDailyStatusToFirebase(dateStr, opsId, statusText) {
  if (!fbDb) return;
  fbDb.ref(FB_PB_ROOT + '/dailyRecords/' + dateStr + '/' + opsId + '/statusInfo').set(statusText)
    .then(() => {
      console.log(`Status ${opsId} pada ${dateStr} berhasil di-update: ${statusText}`);
    })
    .catch((err) => {
      console.error('Gagal update status:', err);
    });
}

