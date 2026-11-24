/**
 * assets/js/outbound/drilldown-and-history.js — Drilldown destinasi/route, riwayat snapshot DC, tren
 * Bagian 10/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

function computeDestinationStats(receiverName) {
  const items = filteredData.filter(d => d.receiverName === receiverName);
  const stats = {
    name: receiverName, total: items.length,
    d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, dMore: 0,
    lastPackedDate: null, packerMap: {}
  };

  items.forEach(item => {
    if (item.agingDays === 0) stats.d0++;
    else if (item.agingDays === 1) stats.d1++;
    else if (item.agingDays === 2) stats.d2++;
    else if (item.agingDays === 3) stats.d3++;
    else if (item.agingDays === 4) stats.d4++;
    else if (item.agingDays === 5) stats.d5++;
    else if (item.agingDays === 6) stats.d6++;
    else if (item.agingDays > 6) stats.dMore++;

    if (item.completeDateObj && (!stats.lastPackedDate || item.completeDateObj > stats.lastPackedDate)) {
      stats.lastPackedDate = item.completeDateObj;
    }

    const packer = item.lastPacker && item.lastPacker !== '-' ? item.lastPacker : t('ob.packer.unassigned');
    if (!stats.packerMap[packer]) stats.packerMap[packer] = 0;
    stats.packerMap[packer]++;
  });

  stats.occupancyPct = getOccupancyPct(stats.total);
  return stats;
}

let destModalRouteContext = null;

function showDestinationDrilldown(receiverName, routeContext) {
  destModalRouteContext = routeContext || null;
  const backBtn = document.getElementById('destModalBackBtn');
  if (backBtn) backBtn.classList.toggle('hidden', !destModalRouteContext);

  const stats = computeDestinationStats(receiverName);
  const occLevel = getOccupancyLevel(stats.occupancyPct);

  document.getElementById('destModalTitle').innerText = receiverName;
  document.getElementById('destModalSortCode').innerText = `Sort Code: ${getSortCode(receiverName)}`;

  const badgeEl = document.getElementById('destModalOccBadge');
  if (occLevel === 'critical') {
    badgeEl.innerHTML = `<span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white inline-flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i>PENUH</span>`;
  } else if (occLevel === 'warn') {
    badgeEl.innerHTML = `<span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 inline-flex items-center gap-1"><i class="fa-regular fa-clock"></i>WARN</span>`;
  } else {
    badgeEl.innerHTML = `<span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white inline-flex items-center gap-1"><i class="fa-solid fa-circle-check"></i>AMAN</span>`;
  }

  document.getElementById('destModalTotal').innerText = `${stats.total.toLocaleString('id-ID')} Parcel`;
  document.getElementById('destModalOccPct').innerText = `${stats.occupancyPct.toFixed(1)}%`;
  document.getElementById('destModalOccPct').className = `text-[10px] font-extrabold ${occLevel === 'critical' ? 'text-rose-500' : occLevel === 'warn' ? 'text-amber-500' : 'text-emerald-500'}`;
  const occBar = document.getElementById('destModalOccBar');
  occBar.style.width = `${Math.min(stats.occupancyPct, 100)}%`;
  occBar.className = `h-full rounded-full transition-all duration-500 ${occLevel === 'critical' ? 'bg-rose-600' : occLevel === 'warn' ? 'bg-amber-400' : 'bg-emerald-500'}`;
  document.getElementById('destModalLastPacked').innerText = stats.lastPackedDate ? formatDateTime(stats.lastPackedDate) : 'Belum ada data';

  const packerRows = Object.entries(stats.packerMap).sort((a, b) => b[1] - a[1]);
  document.getElementById('destModalPackerList').innerHTML = packerRows.length
    ? packerRows.map(([name, count]) => `
      <div class="flex justify-between items-center py-1.5 px-3 border-b border-slate-100 dark:border-slate-800 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
        <span class="font-sans font-semibold text-slate-700 dark:text-slate-200 truncate pr-2">${name}</span>
        <span class="font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">${count.toLocaleString('id-ID')} pcs</span>
      </div>`).join('')
    : `<div class="text-center text-slate-400 dark:text-slate-500 py-4 text-[11px] font-sans">Tidak ada data packer.</div>`;

  renderDestinationTrend(receiverName);

  if (typeof Chart !== 'undefined') {
    const colors = getChartThemeColors();
    const ctx = document.getElementById('destAgingChart');
    if (destAgingChartInstance) destAgingChartInstance.destroy();
    destAgingChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['D-Day', 'D-1', 'D-2', 'D-3', 'D-4', 'D-5', 'D-6', '>D-6'],
        datasets: [{
          data: [stats.d0, stats.d1, stats.d2, stats.d3, stats.d4, stats.d5, stats.d6, stats.dMore],
          backgroundColor: ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#f97316', '#fb7185', '#f43f5e', '#be123c'],
          borderRadius: 4, maxBarThickness: 26
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: colors.tooltipBg, titleColor: colors.tooltipText, bodyColor: colors.tooltipText } },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.tick, font: { size: 9 } } },
          y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.tick, font: { size: 9 } } }
        }
      }
    });
  }

  document.getElementById('destModal').classList.remove('hidden');
}

function closeDestModal() {
  const el = document.getElementById('destModal');
  if (el) el.classList.add('hidden');
}

function showRouteDrilldown(routeLabel) {
  const route = linehaulRoutes.find(r => r.label === routeLabel);
  if (!route) return;

  const hubStats = route.hubs
    .map(hub => computeDestinationStats(hub))
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total);

  const routeTotal = hubStats.reduce((sum, s) => sum + s.total, 0);

  document.getElementById('routeModalTitle').innerText = routeLabel;
  document.getElementById('routeModalSubtitle').innerText = `${hubStats.length} Hub Aktif • ${routeTotal.toLocaleString('id-ID')} Parcel`;

  const safe = s => s.replace(/'/g, "\\'");
  document.getElementById('routeModalHubList').innerHTML = hubStats.length
    ? hubStats.map((s, i) => {
        const st = getAgingStatus(s);
        return `<div class="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
          <span class="col-span-1 text-slate-400 dark:text-slate-500">${i + 1}</span>
          <span class="col-span-5 font-sans font-semibold text-slate-800 dark:text-slate-100 truncate" title="${s.name}">${s.name}</span>
          <span class="col-span-2 text-center font-bold text-shopee dark:text-orange-400">${s.total.toLocaleString('id-ID')}</span>
          <span class="col-span-2 text-center"><span class="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${st.cls}"><i class="${st.icon}"></i>${st.label}</span></span>
          <span class="col-span-2 text-right"><button onclick="openHubFromRoute('${safe(s.name)}', '${safe(routeLabel)}')" class="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-shopee dark:hover:bg-shopee transition">Detail</button></span>
        </div>`;
      }).join('')
    : `<div class="text-center text-slate-400 dark:text-slate-500 py-6 font-sans">Belum ada data Hub untuk rute ini.</div>`;

  document.getElementById('routeModal').classList.remove('hidden');
}

function openHubFromRoute(hubName, routeLabel) {
  closeRouteModal();
  showDestinationDrilldown(hubName, routeLabel);
}

function backToRouteFromDest() {
  if (!destModalRouteContext) return;
  const routeLabel = destModalRouteContext;
  closeDestModal();
  showRouteDrilldown(routeLabel);
}

function closeRouteModal() {
  const el = document.getElementById('routeModal');
  if (el) el.classList.add('hidden');
}

function saveHistorySnapshot() {
  try {
    const byDest = {};
    globalRawData.forEach(item => {
      const name = item.receiverName;
      if (!byDest[name]) byDest[name] = { total: 0, d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, dMore: 0 };
      byDest[name].total++;
      if (item.agingDays === 0) byDest[name].d0++;
      else if (item.agingDays === 1) byDest[name].d1++;
      else if (item.agingDays === 2) byDest[name].d2++;
      else if (item.agingDays === 3) byDest[name].d3++;
      else if (item.agingDays === 4) byDest[name].d4++;
      else if (item.agingDays === 5) byDest[name].d5++;
      else if (item.agingDays === 6) byDest[name].d6++;
      else if (item.agingDays > 6) byDest[name].dMore++;
    });

    const dcTotal = globalRawData.length;
    const dcCritical = globalRawData.filter(item => item.agingDays > 4).length;
    const dcCapPct = MAX_STAGING_CAPACITY > 0 ? (dcTotal / MAX_STAGING_CAPACITY) * 100 : 0;

    const snapshot = {
      ts: Date.now(), dateLabel: formatDateTime(new Date()), byDest,
      dcTotal, dcCritical, dcCapPct
    };
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    let history = raw ? JSON.parse(raw) : [];
    history.push(snapshot);
    if (history.length > MAX_HISTORY_SNAPSHOTS) history = history.slice(history.length - MAX_HISTORY_SNAPSHOTS);
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Gagal menyimpan history snapshot ke localStorage:', e);
  }
}

function getDCHistorySeries(limit) {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    if (!raw) return [];
    const history = JSON.parse(raw);
    return history.filter(snap => typeof snap.dcTotal === 'number').slice(-limit);
  } catch (e) {
    return [];
  }
}

function getPrevDCSnapshot() {
  const series = getDCHistorySeries(2);
  return series.length >= 2 ? series[series.length - 2] : null;
}

function deltaBadgeHtml(delta, goodDirection) {
  if (delta === 0) return `<span class="text-[9px] font-bold text-slate-400 dark:text-slate-500"><i class="fa-solid fa-equals"></i> Stabil dari import sebelumnya</span>`;
  const isIncrease = delta > 0;
  const icon = isIncrease ? 'fa-arrow-up' : 'fa-arrow-down';
  let cls = 'text-slate-500 dark:text-slate-400';
  if (goodDirection !== 'neutral') {
    const isGood = goodDirection === 'down' ? !isIncrease : isIncrease;
    cls = isGood ? 'text-emerald-500' : 'text-rose-500';
  }
  return `<span class="text-[9px] font-bold ${cls}"><i class="fa-solid ${icon}"></i> ${isIncrease ? '+' : ''}${delta.toLocaleString('id-ID')} dari import sebelumnya</span>`;
}

function calcOnTimeDepartureRate() {
  const now = new Date();
  let dueCount = 0, lateCount = 0;
  linehaulSchedule.forEach(s => {
    const parts = s.time.split(':');
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(parts[0], 10), parseInt(parts[1], 10) || 0);
    if (target <= now) {
      dueCount++;
      if (target < now) lateCount++;
    }
  });
  if (dueCount === 0) return null;
  const onTimeCount = dueCount - lateCount;
  return { rate: (onTimeCount / dueCount) * 100, dueCount, lateCount, onTimeCount };
}

function getDestinationHistory(receiverName, limit) {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    if (!raw) return [];
    const history = JSON.parse(raw);
    return history
      .filter(snap => snap.byDest && snap.byDest[receiverName])
      .slice(-limit)
      .map(snap => ({ dateLabel: snap.dateLabel, ...snap.byDest[receiverName] }));
  } catch (e) {
    return [];
  }
}

function renderDestinationTrend(receiverName) {
  const history = getDestinationHistory(receiverName, 8);
  const container = document.getElementById('destModalTrendList');

  if (history.length === 0) {
    container.innerHTML = `<div class="text-center text-slate-400 dark:text-slate-500 py-4 text-[11px] font-sans px-2">Belum ada histori tersimpan untuk destination ini. Histori otomatis tercatat tiap kali import Excel baru.</div>`;
    return;
  }

  const rows = history.map((h, idx) => {
    const prev = idx > 0 ? history[idx - 1] : null;
    let deltaHtml = '<span class="text-slate-400">-</span>';
    if (prev) {
      const delta = h.dMore - prev.dMore;
      if (delta > 0) deltaHtml = `<span class="text-rose-500 font-bold"><i class="fa-solid fa-arrow-up"></i> +${delta}</span>`;
      else if (delta < 0) deltaHtml = `<span class="text-emerald-500 font-bold"><i class="fa-solid fa-arrow-down"></i> ${delta}</span>`;
      else deltaHtml = `<span class="text-slate-400 font-bold">=</span>`;
    }
    return `<div class="grid grid-cols-4 gap-1 py-1.5 px-3 border-b border-slate-100 dark:border-slate-800 text-[10px] items-center hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
      <span class="font-mono text-slate-500 dark:text-slate-400 truncate" title="${h.dateLabel}">${h.dateLabel}</span>
      <span class="text-center font-bold text-slate-700 dark:text-slate-200">${h.total.toLocaleString('id-ID')}</span>
      <span class="text-center font-bold text-rose-600 dark:text-rose-400">${h.dMore.toLocaleString('id-ID')}</span>
      <span class="text-center">${deltaHtml}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="grid grid-cols-4 gap-1 py-1 px-3 bg-slate-100 dark:bg-slate-800/80 text-[9px] font-bold text-slate-600 dark:text-slate-300 sticky top-0">
      <span>Snapshot Import</span><span class="text-center">Total</span><span class="text-center">D4+</span><span class="text-center">Tren D4+</span>
    </div>
    ${rows}`;
}

