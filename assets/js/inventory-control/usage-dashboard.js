/**
 * assets/js/inventory-control/usage-dashboard.js — Dashboard & Highlight Usage (chart harian/bulanan)
 * Bagian 12/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // Wrapper: hitung sekali, lalu render ke Sub Menu "Log Activity Usage" (riwayat log)
  // dan Sub Menu "Highlight Usage" (KPI + chart + tabel bulanan) sekaligus, buat
  // Facility yang lagi aktif. Dua-duanya tetep harus update bareng tiap ada
  // perubahan data, meskipun tampil di tab beda.
  function renderUsageDashboard() {
    const logsArr = getLogsArr(currentFacility);
    const highlightArr = dashboardDevisiFilter
      ? logsArr.filter(function (l) { return (l.devisi || getDevisiForEmail(l.createdBy)) === dashboardDevisiFilter; })
      : logsArr;
    renderUsageHighlight(highlightArr);
    renderUsageLogTable(logsArr); // Riwayat Log tetep nampilin semua Devisi, filter breakdown cuma buat Highlight Usage
  }

  function applyDashboardDevisiFilter() {
    dashboardDevisiFilter = document.getElementById('dashboardDevisiFilter').value;
    renderUsageDashboard();
  }

  function renderUsageHighlight(logsArr) {
    const today = todayStr();
    const monthPrefix = today.slice(0, 7); // YYYY-MM

    // Bulan lalu, dipakai buat hitung delta % vs sekarang
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPrefix = lastMonthDate.getFullYear() + '-' + String(lastMonthDate.getMonth() + 1).padStart(2, '0');

    let todayTotal = 0, monthTotal = 0, lastMonthTotal = 0;
    const monthAssetTotals = {};
    const dailyTotals = {}; // { 'YYYY-MM-DD': qty }

    logsArr.forEach(function (log) {
      const d = log.workingDate || '';
      const q = Number(log.qtyUsed) || 0;
      if (d === today) todayTotal += q;
      if (d.slice(0, 7) === monthPrefix) {
        monthTotal += q;
        monthAssetTotals[log.assetName || '-'] = (monthAssetTotals[log.assetName || '-'] || 0) + q;
      }
      if (d.slice(0, 7) === lastMonthPrefix) lastMonthTotal += q;
      dailyTotals[d] = (dailyTotals[d] || 0) + q;
    });

    document.getElementById('kpiTodayUsage').innerText = todayTotal;
    document.getElementById('kpiMonthUsage').innerText = monthTotal;
    document.getElementById('kpiAssetTouched').innerText = Object.keys(monthAssetTotals).length;

    // Delta % Usage Bulan Ini vs Bulan Lalu
    const deltaEl = document.getElementById('kpiMonthDelta');
    if (lastMonthTotal === 0 && monthTotal === 0) {
      deltaEl.className = 'kpi-delta'; deltaEl.innerText = '';
    } else if (lastMonthTotal === 0) {
      deltaEl.className = 'kpi-delta up'; deltaEl.innerText = '▲ Baru mulai bulan ini';
    } else {
      const pct = Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100);
      if (pct > 0) { deltaEl.className = 'kpi-delta up'; deltaEl.innerText = '▲ ' + pct + '% dari bulan lalu'; }
      else if (pct < 0) { deltaEl.className = 'kpi-delta down'; deltaEl.innerText = '▼ ' + Math.abs(pct) + '% dari bulan lalu'; }
      else { deltaEl.className = 'kpi-delta flat'; deltaEl.innerText = '± 0% dari bulan lalu'; }
    }

    // Rata-rata pemakaian/hari per Asset, 30 hari terakhir (buat estimasi habis stock)
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 29);
    const cutoffStr = cutoff.getFullYear() + '-' + String(cutoff.getMonth() + 1).padStart(2, '0') + '-' + String(cutoff.getDate()).padStart(2, '0');
    const last30Totals = {}; // keyed by assetId
    logsArr.forEach(function (log) {
      const d = log.workingDate || '';
      if (d >= cutoffStr && log.assetId) {
        last30Totals[log.assetId] = (last30Totals[log.assetId] || 0) + (Number(log.qtyUsed) || 0);
      }
    });
    const avgPerDayByAsset = {};
    Object.keys(last30Totals).forEach(function (id) { avgPerDayByAsset[id] = last30Totals[id] / 30; });

    // Stock Menipis: KPI count + detail list dengan estimasi habis
    let lowStockCount = 0;
    const stockData = getStockData();
    const lowStockItems = [];
    Object.keys(stockData).forEach(function (id) {
      const a = stockData[id];
      const minStock = Number(a.minStock) || 0;
      const qty = Number(a.qty) || 0;
      if (minStock > 0 && qty <= minStock) {
        lowStockCount++;
        const avgPerDay = avgPerDayByAsset[id] || 0;
        const daysRemaining = qty <= 0 ? 0 : (avgPerDay > 0 ? Math.floor(qty / avgPerDay) : null);
        // Saran Reorder Qty: target stock = pemakaian rata-rata 30 hari ke depan (buffer 1 bulan).
        // Kalau belum ada histori pemakaian, saranin balik ke Min Stock aja.
        const reorderQty = avgPerDay > 0
          ? Math.max(0, Math.ceil((avgPerDay * 30) - qty))
          : Math.max(0, minStock - qty);
        lowStockItems.push({ id: id, name: a.name || '-', unit: a.unit || '', qty: qty, minStock: minStock, avgPerDay: avgPerDay, daysRemaining: daysRemaining, reorderQty: reorderQty });
      }
    });
    document.getElementById('kpiLowStock').innerText = lowStockCount;

    lowStockItems.sort(function (a, b) {
      const av = a.daysRemaining === null ? Infinity : a.daysRemaining;
      const bv = b.daysRemaining === null ? Infinity : b.daysRemaining;
      return av - bv;
    });

    const lowStockBody = document.getElementById('lowStockDetailBody');
    if (lowStockItems.length === 0) {
      lowStockBody.innerHTML = '<tr class="empty-row"><td colspan="6">' + t('inv.msg.noLowStock') + '</td></tr>';
    } else {
      lowStockBody.innerHTML = lowStockItems.map(function (item) {
        let daysHtml;
        if (item.daysRemaining === null) {
          daysHtml = '<span style="color:#a3a3a3;">' + t('inv.msg.noUsageHistoryShort') + '</span>';
        } else {
          const cls = item.daysRemaining <= 3 ? 'critical' : (item.daysRemaining <= 7 ? 'warn-soon' : '');
          daysHtml = '<span class="days-left ' + cls + '">' + item.daysRemaining + ' hari lagi</span>';
        }
        const reorderHtml = item.reorderQty > 0
          ? '<b>+' + item.reorderQty + ' ' + escapeHtml(item.unit) + '</b>'
          : '<span style="color:#a3a3a3;">Cukup</span>';
        return '<tr>' +
          '<td style="text-align:left;">' + escapeHtml(item.name) + '</td>' +
          '<td><b>' + item.qty + ' ' + escapeHtml(item.unit) + '</b></td>' +
          '<td>' + item.minStock + ' ' + escapeHtml(item.unit) + '</td>' +
          '<td>' + (item.avgPerDay > 0 ? item.avgPerDay.toFixed(1) + ' ' + escapeHtml(item.unit) + '/hari' : '-') + '</td>' +
          '<td>' + daysHtml + '</td>' +
          '<td>' + reorderHtml + '</td>' +
          '</tr>';
      }).join('');
    }
    // Cache buat export PDF/Excel laporan dashboard
    lastReportData.lowStock = lowStockItems;

    // Top Asset Terpakai bulan ini (leaderboard + mini bar)
    const monthBody = document.getElementById('monthlyUsageBody');
    const monthKeys = Object.keys(monthAssetTotals).sort(function (a, b) { return monthAssetTotals[b] - monthAssetTotals[a]; });
    if (monthKeys.length === 0) {
      monthBody.innerHTML = '<tr class="empty-row"><td colspan="2">' + t('inv.msg.noDataThisMonth') + '</td></tr>';
      lastReportData.topAsset = [];
    } else {
      const maxVal = monthAssetTotals[monthKeys[0]] || 1;
      monthBody.innerHTML = monthKeys.map(function (name, idx) {
        const val = monthAssetTotals[name];
        const pct = Math.round((val / maxVal) * 100);
        return '<tr>' +
          '<td style="text-align:left; white-space:nowrap;">' + (idx + 1) + '. ' + escapeHtml(name) + '</td>' +
          '<td><div class="lb-bar-wrap"><div class="lb-bar-track"><div class="lb-bar-fill" style="width:' + pct + '%;"></div></div><b>' + val + '</b></div></td>' +
          '</tr>';
      }).join('');
      lastReportData.topAsset = monthKeys.map(function (name, idx) { return { rank: idx + 1, name: name, total: monthAssetTotals[name] }; });
    }

    // Daily chart, sesuai rentang tanggal custom yang dipilih user
    const days = [];
    const startD = new Date(dailyUsageStartDate + 'T00:00:00');
    const endD = new Date(dailyUsageEndDate + 'T00:00:00');
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      days.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"));
    }
    const chartValues = days.map(function (d) { return dailyTotals[d] || 0; });
    const chartLabels = days.map(function (d) { return d.slice(5).split('-').reverse().join('/'); });

    document.getElementById('dailyUsageChartTitle').innerText = '📊 Highlight Daily Usage (' + formatDateID(dailyUsageStartDate) + ' – ' + formatDateID(dailyUsageEndDate) + ')';

    // Cache data chart harian (versi tanggal lengkap DD/MM/YYYY) buat export Excel
    lastReportData.dailyChart = {
      rows: days.map(function (d, idx) { return { date: formatDateID(d), qty: chartValues[idx] }; }),
      start: dailyUsageStartDate, end: dailyUsageEndDate
    };

    const ctx = document.getElementById('dailyUsageChart').getContext('2d');
    if (dailyUsageChart) {
      dailyUsageChart.data.labels = chartLabels;
      dailyUsageChart.data.datasets[0].data = chartValues;
      dailyUsageChart.options.scales.x.ticks.maxTicksLimit = days.length > 30 ? 15 : 31;
      dailyUsageChart.update();
    } else {
      dailyUsageChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{ label: 'Qty Terpakai', data: chartValues, backgroundColor: '#b45309', borderRadius: 4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { ticks: { maxTicksLimit: days.length > 30 ? 15 : 31, autoSkip: true } }
          }
        }
      });
    }

    // ===== Trend Bulanan Usage (6 bulan terakhir) — buat lihat pola musiman =====
    const MONTH_LABELS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlyTrendTotals = {}; // { 'YYYY-MM': qty }
    logsArr.forEach(function (log) {
      const d = log.workingDate || '';
      if (!d) return;
      const key = d.slice(0, 7);
      monthlyTrendTotals[key] = (monthlyTrendTotals[key] || 0) + (Number(log.qtyUsed) || 0);
    });

    const trendMonthKeys = [];
    for (let i = 5; i >= 0; i--) {
      const md = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMonthKeys.push(md.getFullYear() + '-' + String(md.getMonth() + 1).padStart(2, '0'));
    }
    const trendLabels = trendMonthKeys.map(function (key) {
      const parts = key.split('-');
      return MONTH_LABELS_ID[Number(parts[1]) - 1] + ' \'' + parts[0].slice(2);
    });
    const trendValues = trendMonthKeys.map(function (key) { return monthlyTrendTotals[key] || 0; });

    lastReportData.monthlyTrend = trendMonthKeys.map(function (key, idx) {
      const parts = key.split('-');
      return { month: MONTH_LABELS_ID[Number(parts[1]) - 1] + ' ' + parts[0], qty: trendValues[idx] };
    });

    const trendCtx = document.getElementById('monthlyTrendChart').getContext('2d');
    if (monthlyTrendChart) {
      monthlyTrendChart.data.labels = trendLabels;
      monthlyTrendChart.data.datasets[0].data = trendValues;
      monthlyTrendChart.update();
    } else {
      monthlyTrendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: trendLabels,
          datasets: [{
            label: 'Qty Terpakai / Bulan', data: trendValues,
            borderColor: '#171717', backgroundColor: 'rgba(23,23,23,0.08)',
            fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#171717'
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }
  }

