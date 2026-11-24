/**
 * assets/js/performance-bagger/events-and-export.js — Handler event popup, ESC, export Excel/PDF, dark mode
 * Bagian 12/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== HANDLER EVENT POPUP ====
const pbDetailModal = document.getElementById('pbDetailModal');

pbDetailModal.addEventListener('click', function(e) {
  if (e.target === pbDetailModal) closePbDetail();
});

// ESC buat nutup sidebar juga (dicek terpisah biar gak nyangkut sama guard pbDetailModal di bawah)
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape' && e.key !== 'Esc') return;
  const sidebar = document.getElementById('appSidebar');
  if (sidebar && sidebar.classList.contains('open')) toggleAppSidebar();
});

document.addEventListener('keydown', function(e) {
  if (!pbDetailModal.classList.contains('active')) return;

  if (e.key === 'Escape' || e.key === 'Esc') closePbDetail();

  if (e.key === 'Tab') {
    const focusables = pbDetailModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([-tabindex="-1"])');
    if (!focusables.length) return;

    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === firstEl) {
      lastEl.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      firstEl.focus();
      e.preventDefault();
    }
  }
});

function getFilteredExportData() {
  const start = document.getElementById('exportStartDate').value;
  const end = document.getElementById('exportEndDate').value;

  if (!start && !end) return lastFilteredRows;

  return lastFilteredRows.map((r) => {
    let customTotal = 0;
    let customDays = 0;
    Object.keys(r.dailyData).forEach(d => {
      if ((!start || d >= start) && (!end || d <= end)) {
        customTotal += r.dailyData[d];
        customDays++;
      }
    });
    return {
      ...r,
      total: customTotal,
      days: customDays,
      avg: customDays > 0 ? Math.round(customTotal / customDays) : 0
    };
  });
}

function exportToExcel() {
  const dataToExport = getFilteredExportData();
  if (!dataToExport.length) return showToast('Tidak ada data untuk diexport!', 'err');
  
  const data = dataToExport.map((r, i) => ({
    Rank: i + 1,
    Nama: r.name,
    OpsID: r.opsId,
    Agency: r.agency,
    Status: r.status,
    'Total Packed': r.total,
    'Rata-Rata/Hari': r.avg,
    'Hari Tercapai': `${r.achievedDays}/${r.days}`
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Performance Bagger");
  XLSX.writeFile(wb, `Performance_Bagger_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportToPDF() {
  const dataToExport = getFilteredExportData();
  if (!dataToExport.length) return showToast('Tidak ada data untuk diexport!', 'err');
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("Laporan Performance Bagger - Palangka Raya DC", 14, 15);
  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

  const tableData = dataToExport.map((r, i) => [
    i + 1, r.name, r.opsId, r.agency, r.status, r.total.toLocaleString('id-ID'), r.avg.toLocaleString('id-ID'), `${r.achievedDays}/${r.days}`
  ]);

  doc.autoTable({
    startY: 28,
    head: [['Rank', 'Nama', 'OpsID', 'Agency', 'Status', 'Total Packed', 'Avg/Hari', 'Achieved']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [122, 18, 36] }
  });

  doc.save(`Performance_Bagger_${new Date().toISOString().split('T')[0]}.pdf`);
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  const icon = document.getElementById('darkModeIcon');
  if (isDark) {
    icon.className = 'fa-solid fa-sun text-amber-400';
    localStorage.setItem('theme', 'dark');
  } else {
    icon.className = 'fa-solid fa-moon text-amber-300';
    localStorage.setItem('theme', 'light');
  }
  if (lastFilteredRows.length) renderAgencyChart(lastFilteredRows);
}

