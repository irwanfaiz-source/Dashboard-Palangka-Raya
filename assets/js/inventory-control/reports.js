/**
 * assets/js/inventory-control/reports.js — Export laporan Excel/PDF dan tabel log penggunaan
 * Bagian 13/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ===== Export Laporan ke Excel (Top Asset + Chart Daily Usage + Trend Bulanan) =====
  function exportUsageExcelReport() {
    if (typeof XLSX === 'undefined') { showToast('Library Excel belum ke-load, coba refresh halaman.', 'err'); return; }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Top Asset Terpakai (Bulan Ini)
    const topAssetRows = [['No', t('inv.th.asset'), t('inv.th.totalUsed')]];
    if (lastReportData.topAsset.length === 0) {
      topAssetRows.push(['-', t('inv.msg.noDataThisMonth'), '-']);
    } else {
      lastReportData.topAsset.forEach(function (r) { topAssetRows.push([r.rank, r.name, r.total]); });
    }
    const wsTopAsset = XLSX.utils.aoa_to_sheet(topAssetRows);
    wsTopAsset['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsTopAsset, 'Top Asset Bulan Ini');

    // Sheet 2: Chart Highlight Daily Usage (sesuai rentang tanggal yang lagi ditampilin)
    const dailyRows = [[t('inv.th.date'), t('inv.th.qtyUsed')]];
    lastReportData.dailyChart.rows.forEach(function (r) { dailyRows.push([r.date, r.qty]); });
    const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
    wsDaily['!cols'] = [{ wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Chart Daily Usage');

    // Sheet 3: Trend Bulanan (6 Bulan Terakhir)
    const trendRows = [['Bulan', 'Total Qty Terpakai']];
    lastReportData.monthlyTrend.forEach(function (r) { trendRows.push([r.month, r.qty]); });
    const wsTrend = XLSX.utils.aoa_to_sheet(trendRows);
    wsTrend['!cols'] = [{ wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsTrend, 'Trend Bulanan');

    // Sheet 4: Saran Reorder (Stock Menipis)
    const reorderRows = [['Asset', 'Stock Saat Ini', 'Min Stock', 'Rata-rata Pemakaian/Hari', 'Estimasi Habis (hari)', 'Saran Reorder Qty']];
    if (lastReportData.lowStock.length === 0) {
      reorderRows.push(['-', '-', '-', '-', '-', t('inv.msg.noLowStockShort')]);
    } else {
      lastReportData.lowStock.forEach(function (r) {
        reorderRows.push([r.name, r.qty, r.minStock, r.avgPerDay ? r.avgPerDay.toFixed(1) : '-', r.daysRemaining === null ? '-' : r.daysRemaining, r.reorderQty]);
      });
    }
    const wsReorder = XLSX.utils.aoa_to_sheet(reorderRows);
    wsReorder['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsReorder, 'Saran Reorder');

    const fname = 'Laporan_Usage_' + currentFacility + '_' + todayStr().split('-').reverse().join('') + '.xlsx';
    XLSX.writeFile(wb, fname);
  }

  // ================= EXPORT LAPORAN KE PDF =================
  function exportDashboardPdfReport() {
    if (typeof window.jspdf === 'undefined') { showToast('Library PDF belum ke-load, coba refresh halaman.', 'err'); return; }
    const doc = new window.jspdf.jsPDF();
    const today = new Date();

    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text('Laporan Inventory Control - ' + currentFacility, 14, 16);
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.text('Dicetak: ' + formatDateTimeShort(today), 14, 22);

    let y = 30;
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text('Top Asset Terpakai (Bulan Ini)', 14, y);
    doc.autoTable({
      startY: y + 3,
      head: [['No', 'Asset', 'Total Terpakai']],
      body: lastReportData.topAsset.length ? lastReportData.topAsset.map(function (r) { return [r.rank, r.name, r.total]; }) : [['-', t('inv.msg.noDataThisMonth'), '-']],
      styles: { fontSize: 9 }, headStyles: { fillColor: [0, 0, 0] }
    });

    y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text(t('inv.export.lowStockDetailTitle'), 14, y);
    doc.autoTable({
      startY: y + 3,
      head: [['Asset', 'Qty', 'Min Stock', 'Estimasi Habis', 'Saran Reorder']],
      body: lastReportData.lowStock.length ? lastReportData.lowStock.map(function (r) {
        return [r.name, r.qty + ' ' + r.unit, r.minStock + ' ' + r.unit, r.daysRemaining === null ? '-' : (r.daysRemaining + ' hari'), r.reorderQty > 0 ? ('+' + r.reorderQty + ' ' + r.unit) : 'Cukup'];
      }) : [['-', '-', '-', '-', t('inv.msg.noLowStockShortEmoji')]],
      styles: { fontSize: 9 }, headStyles: { fillColor: [0, 0, 0] }
    });

    y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text('Trend Bulanan Usage (6 Bulan Terakhir)', 14, y);
    doc.autoTable({
      startY: y + 3,
      head: [['Bulan', 'Total Qty Terpakai']],
      body: lastReportData.monthlyTrend.length ? lastReportData.monthlyTrend.map(function (r) { return [r.month, r.qty]; }) : [['-', '-']],
      styles: { fontSize: 9 }, headStyles: { fillColor: [0, 0, 0] }
    });

    doc.save('Laporan_Inventory_' + currentFacility + '_' + todayStr().split('-').reverse().join('') + '.pdf');
  }

  function exportAssetItNcaPdf() {
    if (typeof window.jspdf === 'undefined') { showToast('Library PDF belum ke-load, coba refresh halaman.', 'err'); return; }
    const data = getAssetItNcaData();
    let ids = Object.keys(data);
    const q = assetItNcaFilterQuery.trim().toLowerCase();
    if (q) {
      ids = ids.filter(function (id) {
        const a = data[id];
        return (a.name || '').toLowerCase().indexOf(q) !== -1 || (a.serial || '').toLowerCase().indexOf(q) !== -1 || (a.pic || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (assetItNcaFilterJenis) ids = ids.filter(function (id) { return (data[id].jenis || 'IT') === assetItNcaFilterJenis; });
    if (!ids.length) { showToast(t('inv.err.noDataToExport'), 'err'); return; }
    ids.sort(function (a, b) { return (data[a].name || '').localeCompare(data[b].name || ''); });

    const doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text('Database Asset IT & NCA - ' + currentFacility, 14, 16);
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.text('Dicetak: ' + formatDateTimeShort(new Date()) + ' | Total: ' + ids.length + ' Asset', 14, 22);

    doc.autoTable({
      startY: 28,
      head: [[t('inv.th.assetName'), t('inv.th.type'), t('inv.th.amount'), t('inv.th.category'), t('inv.th.serialNo'), t('inv.th.picHolder'), t('inv.th.location'), t('inv.th.status'), t('inv.th.note')]],
      body: ids.map(function (id) {
        const a = data[id];
        return [a.name || '-', a.jenis || 'IT', (Number(a.qty) || 1), a.category || '-', a.serial || '-', a.pic || '-', a.lokasi || '-', a.status || 'Aktif', a.note || '-'];
      }),
      styles: { fontSize: 8 }, headStyles: { fillColor: [0, 0, 0] }
    });

    doc.save('AssetITNCA_' + currentFacility + '_' + todayStr().split('-').reverse().join('') + '.pdf');
  }

  function formatDateID(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-'); // YYYY-MM-DD
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  // Terapkan filter tanggal custom buat chart "Highlight Daily Usage"
  function applyDailyUsageDateRange() {
    const startVal = document.getElementById('dailyRangeStart').value;
    const endVal = document.getElementById('dailyRangeEnd').value;
    if (!startVal || !endVal) { showToast(t('inv.err.fillDateRangeFirst'), 'err'); return; }
    if (startVal > endVal) { showToast(t('inv.err.startDateAfterEnd'), 'err'); return; }
    dailyUsageStartDate = startVal;
    dailyUsageEndDate = endVal;
    renderUsageDashboard();
  }

  function renderUsageLogTable(logsArr) {
    const canEdit = !!window.__authCanDelete;
    const colCount = 6;

    // Terapkan filter search (nama asset) & rentang tanggal kalau lagi aktif
    let filtered = logsArr;
    if (logFilterAssetQuery) {
      filtered = filtered.filter(function (l) { return (l.assetName || '').toLowerCase().indexOf(logFilterAssetQuery) !== -1; });
    }
    if (logFilterStart) {
      filtered = filtered.filter(function (l) { return (l.workingDate || '') >= logFilterStart; });
    }
    if (logFilterEnd) {
      filtered = filtered.filter(function (l) { return (l.workingDate || '') <= logFilterEnd; });
    }
    const isFiltering = !!(logFilterAssetQuery || logFilterStart || logFilterEnd);

    // Recent logs table (terbaru dulu). Kalau lagi filter, tampilin lebih banyak baris.
    const sorted = filtered.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    const recent = sorted.slice(0, isFiltering ? 500 : 100);
    const logBody = document.getElementById('usageLogBody');
    if (recent.length === 0) {
      logBody.innerHTML = '<tr class="empty-row"><td colspan="' + colCount + '">' + (isFiltering ? t('inv.err.noLogMatchFilter') : t('inv.usage.emptyLog')) + '</td></tr>';
    } else {
      logBody.innerHTML = recent.map(function (log) {
        const devisi = log.devisi || getDevisiForEmail(log.createdBy);
        return '<tr>' +
          '<td>' + escapeHtml(log.workingDate || '-') + '</td>' +
          '<td style="text-align:left;">' + escapeHtml(log.assetName || '-') + '</td>' +
          '<td><b>' + (log.qtyUsed || 0) + ' ' + escapeHtml(log.unit || '') + '</b></td>' +
          '<td>' + escapeHtml(getDevisiLabel(devisi)) + '</td>' +
          '<td>' + escapeHtml(log.createdBy || '-') + '</td>' +
          '<td>' + (canEdit ? ('<button class="btn-edit-sm" onclick="openEditLogModal(\'' + log._key + '\')">✏️</button> <button class="btn-danger-sm" onclick="deleteUsageLog(\'' + log._key + '\')">🗑️</button>') : '-') + '</td>' +
          '</tr>';
      }).join('');
    }
  }

