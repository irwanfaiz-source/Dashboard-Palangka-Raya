/**
 * assets/js/performance-bagger/chart-helpers.js — Plugin label bar & helper modal detail (garis target, tema, chart per jam)
 * Bagian 4/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// Plugin kecil: nampilin angka di atas tiap bar (cuma dataset bertipe bar, nilai > 0)
const barValueLabelsPlugin = {
  id: 'barValueLabels',
  afterDatasetsDraw: function (chart) {
    const opt = (chart.options.plugins && chart.options.plugins.barValueLabels) || {};
    const ctx = chart.ctx;
    const isDark = document.documentElement.classList.contains('dark');
    ctx.save();
    ctx.fillStyle = isDark ? '#e2e8f0' : '#334155';
    ctx.font = '700 ' + (opt.fontSize || 9) + 'px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    chart.data.datasets.forEach(function (ds, i) {
      if (ds.type && ds.type !== 'bar') return;
      const meta = chart.getDatasetMeta(i);
      if (meta.hidden) return;
      meta.data.forEach(function (bar, idx) {
        const v = ds.data[idx];
        if (v === null || v === undefined || !(v > 0)) return;
        ctx.fillText(Number(v).toLocaleString('id-ID'), bar.x, bar.y - 3);
      });
    });
    ctx.restore();
  }
};

// ==== HELPER MODAL DETAIL: garis target, tema, chart per jam ====
const pbdTargetLine = {
  id: 'pbdTargetLine',
  afterDatasetsDraw: function (chart) {
    const o = chart.options.plugins && chart.options.plugins.pbdTargetLine;
    if (!o || !o.value) return;
    const a = chart.chartArea, y = chart.scales.y, ctx = chart.ctx;
    const py = y.getPixelForValue(o.value);
    if (py < a.top || py > a.bottom) return;
    ctx.save();
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#f59e0b';
    ctx.font = '700 10.5px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(o.label, a.right - 4, py - 4);
    ctx.restore();
  }
};
function pbdTheme() {
  const dark = document.documentElement.classList.contains('dark');
  return { grid: dark ? 'rgba(148,163,184,.14)' : '#e2e8f0', tick: dark ? '#94a3b8' : '#64748b', strong: dark ? '#e2e8f0' : '#334155', tip: dark ? '#050b16' : '#0f172a' };
}
function pbdTip(th, extra) {
  return Object.assign({ backgroundColor: th.tip, titleColor: '#fff', bodyColor: '#e2e8f0', padding: 10, cornerRadius: 8, displayColors: false }, extra);
}
function pbdEsc(v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function pbdDotCls(st) {
  if (st === 'Normal / Bekerja') return 'ok';
  return ['Cuti', 'Sakit', 'Izin'].indexOf(st) !== -1 ? 'warn' : '';
}
function pbdStatusDot(sel) {
  const d = sel.parentNode.querySelector('.pbd-dot');
  if (d) d.className = 'pbd-dot ' + pbdDotCls(sel.value);
}
function renderPbHourChart(labels, data, target) {
  const th = pbdTheme();
  if (hourChartInstance) hourChartInstance.destroy();
  hourChartInstance = new Chart(document.getElementById('detailHourChart'), {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Packed/jam', data: data, borderRadius: 6, maxBarThickness: 34,
      backgroundColor: data.map(function (v) { return v === null ? 'transparent' : (v >= target ? '#10b981' : '#f43f5e'); }) }] },
    options: {
      responsive: true, maintainAspectRatio: false, layout: { padding: { top: 16 } },
      plugins: {
        legend: { display: false }, barValueLabels: { fontSize: 10.5 },
        pbdTargetLine: { value: target, label: t('pb.detail.targetLbl') + ': ' + target.toLocaleString('id-ID') },
        tooltip: pbdTip(th, { callbacks: {
          label: function (c) { return c.parsed.y.toLocaleString('id-ID') + ' ' + t('pb.unit.pcs'); },
          afterLabel: function (c) { return target ? t('pb.detail.ofTarget', { n: Math.round(c.parsed.y / target * 100) }) : ''; }
        } })
      },
      scales: {
        y: { beginAtZero: true, suggestedMax: target * 1.5, grace: '12%', grid: { color: th.grid }, border: { display: false }, ticks: { color: th.tick, font: { size: 11 }, maxTicksLimit: 5, callback: function (v) { return v.toLocaleString('id-ID'); } } },
        x: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false, maxRotation: 0, font: { size: 10 }, color: function (c) { return data[c.index] === null ? th.grid : th.tick; } } }
      }
    },
    plugins: [barValueLabelsPlugin, pbdTargetLine]
  });
}

