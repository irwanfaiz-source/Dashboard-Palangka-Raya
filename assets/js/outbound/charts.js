/**
 * assets/js/outbound/charts.js — Chart backlog, volume shift, tren
 * Bagian 12/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

function getChartThemeColors() {
  const isDark = currentTheme === 'dark';
  return {
    grid: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)',
    tick: isDark ? '#94a3b8' : '#475569',
    tooltipBg: isDark ? '#1e293b' : '#0f172a',
    tooltipText: '#f1f5f9'
  };
}

function renderBacklogCharts() {
  if (typeof Chart === 'undefined') return;
  const colors = getChartThemeColors();

  const agingBuckets = { d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, dMore: 0 };
  filteredData.forEach(item => {
    if (item.agingDays === 0) agingBuckets.d0++;
    else if (item.agingDays === 1) agingBuckets.d1++;
    else if (item.agingDays === 2) agingBuckets.d2++;
    else if (item.agingDays === 3) agingBuckets.d3++;
    else if (item.agingDays === 4) agingBuckets.d4++;
    else if (item.agingDays === 5) agingBuckets.d5++;
    else if (item.agingDays === 6) agingBuckets.d6++;
    else if (item.agingDays > 6) agingBuckets.dMore++;
  });
  const agingTotal = Object.values(agingBuckets).reduce((a, b) => a + b, 0);
  document.getElementById('agingChartTotalBadge').innerText = `${agingTotal.toLocaleString('id-ID')} Parcel`;

  const agingCtx = document.getElementById('agingDistributionChart');
  const agingData = [agingBuckets.d0, agingBuckets.d1, agingBuckets.d2, agingBuckets.d3, agingBuckets.d4, agingBuckets.d5, agingBuckets.d6, agingBuckets.dMore];
  const agingColors = ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#f97316', '#fb7185', '#f43f5e', '#be123c'];

  if (agingDistributionChartInstance) agingDistributionChartInstance.destroy();
  agingDistributionChartInstance = new Chart(agingCtx, {
    type: 'bar',
    data: {
      labels: ['D-Day', 'D-1', 'D-2', 'D-3', 'D-4', 'D-5', 'D-6', '>D-6'],
      datasets: [{ label: 'Jumlah Parcel', data: agingData, backgroundColor: agingColors, borderRadius: 4, maxBarThickness: 34 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: colors.tooltipBg, titleColor: colors.tooltipText, bodyColor: colors.tooltipText } },
      scales: {
        x: { grid: { display: false }, ticks: { color: colors.tick, font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.tick, font: { size: 10 } } }
      }
    }
  });
}

function renderShiftVolumeChart() {
  if (typeof Chart === 'undefined') return;
  if (!document.getElementById('shiftVolumeChart')) return; // chart Perbandingan Volume per Shift sudah dihapus dari halaman
  const colors = getChartThemeColors();

  let s1 = 0, s2 = 0, s3 = 0;
  filteredData.forEach(d => {
    const shift = getDeliveryShiftForItem(d);
    if (shift === 'Shift 1') s1++;
    else if (shift === 'Shift 2') s2++;
    else s3++;
  });
  const shiftTotal = s1 + s2 + s3;
  document.getElementById('shiftChartTotalBadge').innerText = `${shiftTotal.toLocaleString('id-ID')} Parcel`;

  const ctx = document.getElementById('shiftVolumeChart');
  if (shiftVolumeChartInstance) shiftVolumeChartInstance.destroy();
  shiftVolumeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Shift 1 (00:00-09:00)', 'Shift 2 (08:00-17:00)', 'Shift 3 (16:00-01:00)'],
      datasets: [{ label: 'Total Parcel Packed', data: [s1, s2, s3], backgroundColor: ['#f59e0b', '#6366f1', '#f43f5e'], borderRadius: 4, maxBarThickness: 60 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: colors.tooltipBg, titleColor: colors.tooltipText, bodyColor: colors.tooltipText } },
      scales: {
        x: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.tick, font: { size: 10 } } },
        y: { grid: { display: false }, ticks: { color: colors.tick, font: { size: 10 } } }
      }
    }
  });
}

function renderTrendChart() {
  if (typeof Chart === 'undefined') return;
  const colors = getChartThemeColors();
  const series = getDCHistorySeries(15);
  const badge = document.getElementById('trendChartInfoBadge');
  const ctx = document.getElementById('dcTrendChart');

  if (series.length < 2) {
    if (badge) badge.innerText = series.length === 0 ? t('ob.chart.noHistory') : t('ob.chart.needMinSnapshot');
    if (dcTrendChartInstance) { dcTrendChartInstance.destroy(); dcTrendChartInstance = null; }
    return;
  }

  if (badge) badge.innerText = t('ob.chart.lastSnapshots', { n: series.length });

  const labels = series.map(s => s.dateLabel);
  const totalSeries = series.map(s => s.dcTotal);
  const criticalSeries = series.map(s => s.dcCritical);

  if (dcTrendChartInstance) dcTrendChartInstance.destroy();
  dcTrendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: t('ob.chart.totalVolume'),
          data: totalSeries,
          borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)',
          tension: 0.3, fill: true, yAxisID: 'y', pointRadius: 3, pointHoverRadius: 5
        },
        {
          label: t('ob.chart.backlogKritis'),
          data: criticalSeries,
          borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.12)',
          tension: 0.3, fill: true, yAxisID: 'y1', pointRadius: 3, pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { color: colors.tick, font: { size: 9 }, boxWidth: 10 } },
        tooltip: { backgroundColor: colors.tooltipBg, titleColor: colors.tooltipText, bodyColor: colors.tooltipText }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: colors.tick, font: { size: 8 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
        y: { position: 'left', beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.tick, font: { size: 9 } }, title: { display: true, text: t('ob.chart.totalVolume'), color: colors.tick, font: { size: 8 } } },
        y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { color: colors.tick, font: { size: 9 } }, title: { display: true, text: t('ob.chart.backlogKritis'), color: colors.tick, font: { size: 8 } } }
      }
    }
  });
}

