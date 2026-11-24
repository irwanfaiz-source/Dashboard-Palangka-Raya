/**
 * assets/js/outbound/dashboard-render.js — renderDashboard, Executive Summary, unduh gambar laporan
 * Bagian 14/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

function renderDashboard() {
  const total = filteredData.length;
  const parcelCount = filteredData.filter(d => d.packingMethod === 'Assisted Sorting').length;
  const bulkyCount = filteredData.filter(d => d.packingMethod === 'Individual Packing').length;
  const hvCount = filteredData.filter(d => d.isHv).length;
  const liquidCount = filteredData.filter(d => d.isLiquid).length;

  const prevDCSnapshot = getPrevDCSnapshot();

  document.getElementById('kpiTotalUnits').innerText = total.toLocaleString('id-ID');
  const kpiTotalDeltaEl = document.getElementById('kpiTotalUnitsDelta');
  if (kpiTotalDeltaEl) {
    kpiTotalDeltaEl.innerHTML = prevDCSnapshot ? deltaBadgeHtml(total - prevDCSnapshot.dcTotal, 'neutral') : `<span class="text-[9px] text-slate-400">Import pertama, belum ada pembanding</span>`;
  }
  document.getElementById('kpiParcel').innerText = parcelCount.toLocaleString('id-ID');
  document.getElementById('kpiBulky').innerText = bulkyCount.toLocaleString('id-ID');
  document.getElementById('kpiHighValue').innerText = hvCount.toLocaleString('id-ID');
  document.getElementById('kpiLiquid').innerText = liquidCount.toLocaleString('id-ID');


  const receiverMap = {};
  let criticalParcels = 0;

  filteredData.forEach(item => {
    const name = item.receiverName;
    if (!receiverMap[name]) receiverMap[name] = {
      name: name, total: 0, assisted: 0, individual: 0, hv: 0, liquid: 0,
      d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, dMore: 0,
      s1: 0, s2: 0, s3: 0, lastPackedDate: null
    };

    receiverMap[name].total++;
    if (item.packingMethod === 'Assisted Sorting') receiverMap[name].assisted++;
    if (item.packingMethod === 'Individual Packing') receiverMap[name].individual++;
    if (item.isHv) receiverMap[name].hv++;
    if (item.isLiquid) receiverMap[name].liquid++;

    if (item.agingDays === 0) receiverMap[name].d0++;
    else if (item.agingDays === 1) receiverMap[name].d1++;
    else if (item.agingDays === 2) receiverMap[name].d2++;
    else if (item.agingDays === 3) receiverMap[name].d3++;
    else if (item.agingDays === 4) receiverMap[name].d4++;
    else if (item.agingDays >= 5) receiverMap[name].d5++;

    if (item.agingDays > 4) criticalParcels++;

    if (item.shift === 'Shift 1') receiverMap[name].s1++;
    if (item.shift === 'Shift 2') receiverMap[name].s2++;
    if (item.shift === 'Shift 3') receiverMap[name].s3++;

    if (item.completeDateObj) {
      if (!receiverMap[name].lastPackedDate || item.completeDateObj > receiverMap[name].lastPackedDate) {
        receiverMap[name].lastPackedDate = item.completeDateObj;
      }
    }
  });

  const sorted = Object.values(receiverMap).sort((a, b) => b.total - a.total);
  sorted.forEach(r => { r.occupancyPct = getOccupancyPct(r.total); r.status = getAgingStatus(r).priority; });

  const sbTopHubEl = document.getElementById('sbTopHub');
  if (sbTopHubEl) {
    if (sorted.length > 0) {
      sbTopHubEl.innerHTML = `${sorted[0].name} (${sorted[0].total.toLocaleString('id-ID')} Parcel)${occupancyBadgeHtml(sorted[0].occupancyPct)}`;
    } else {
      sbTopHubEl.innerText = `-`;
    }
  }

  const sbCriticalCountEl = document.getElementById('sbCriticalCount');
  if (sbCriticalCountEl) {
    sbCriticalCountEl.innerText = `${criticalParcels.toLocaleString('id-ID')} Parcel Critical`;
  }
  const sbCriticalDeltaEl = document.getElementById('sbCriticalCountDelta');
  if (sbCriticalDeltaEl) {
    sbCriticalDeltaEl.innerHTML = prevDCSnapshot ? deltaBadgeHtml(criticalParcels - prevDCSnapshot.dcCritical, 'down') : '';
  }

  const capPctRaw = (total / MAX_STAGING_CAPACITY) * 100;
  const capPct = Math.min(Math.round(capPctRaw), 100);
  const sbCapPercentEl = document.getElementById('sbCapPercent');
  if (sbCapPercentEl) sbCapPercentEl.innerText = `${capPct}%`;
  const sbCapBarEl = document.getElementById('sbCapBar');
  if (sbCapBarEl) sbCapBarEl.style.width = `${capPct}%`;
  const sbCapDetailEl = document.getElementById('sbCapDetail');
  if (sbCapDetailEl) sbCapDetailEl.innerText = `${total.toLocaleString('id-ID')} / ${MAX_STAGING_CAPACITY.toLocaleString('id-ID')} Parcel`;

  lastSortedReceivers = sorted;
  renderGrids();

  renderPackerLeaderboard();
  renderBacklogCharts();
  renderShiftVolumeChart();
  renderTrendChart();

  const routeVolumes = linehaulRoutes.map(r => ({
    label: r.label, hubs: r.hubs, total: 0, parcel: 0, bulky: 0, hv: 0, liquid: 0, category: 'Inner',
    d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, dMore: 0
  }));

  const outerIslandMap = {};
  let totalOuterIslandCount = 0;
  let totalInnerParcel = 0;
  let totalInnerBulky = 0;
  let totalInnerCombined = 0;

  filteredData.forEach(item => {
    let isParcel = item.packingMethod === 'Assisted Sorting';
    let isBulky = item.packingMethod === 'Individual Packing';
    let matched = false;

    for (let r of routeVolumes) {
      if (routeHasHub(r, item.receiverName)) {
        r.total++;
        if (isParcel) { r.parcel++; totalInnerParcel++; }
        if (isBulky) { r.bulky++; totalInnerBulky++; }
        if (item.isHv) r.hv++;
        if (item.isLiquid) r.liquid++;
        totalInnerCombined++;

        if (item.agingDays === 0) r.d0++;
        else if (item.agingDays === 1) r.d1++;
        else if (item.agingDays === 2) r.d2++;
        else if (item.agingDays === 3) r.d3++;
        else if (item.agingDays === 4) r.d4++;
        else if (item.agingDays === 5) r.d5++;
        else if (item.agingDays === 6) r.d6++;
        else if (item.agingDays > 6) r.dMore++;

        matched = true;
        break;
      }
    }

    if (!matched) {
      const og = outerIslandMap[item.receiverName] || (outerIslandMap[item.receiverName] = { name: item.receiverName, total: 0, parcel: 0, hv: 0, bulky: 0, nonBulky: 0, old: 0, category: 'Outer' });
      og.total++;
      og.parcel++;
      if (isBulky) og.bulky++;
      if (isParcel) og.nonBulky++;
      if (item.isHv) og.hv++;
      if (item.agingDays >= 2) og.old++;
      totalOuterIslandCount++;
    }
  });

  routeVolumes.sort((a, b) => b.total - a.total);
  let idx = 1;
  const ageCell = (val, label, type, tone) => {
    if (!(val > 0)) return `<td class="text-center text-slate-300 dark:text-slate-700 font-normal px-0.5">–</td>`;
    const safe = label.replace(/'/g, "\\'");
    return `<td class="text-center px-0.5"><button type="button" class="occ-age ${tone}" onclick="showRouteTONumbers('${safe}', '${type}')" title="${escapeHtml(t('ob.occ.openTo'))}">${val.toLocaleString('id-ID')}</button></td>`;
  };
  document.getElementById('routeTableBody').innerHTML = routeVolumes.map(row => {
    const pct = (row.total / INNER_ROUTE_CAPACITY) * 100;
    const alert = getRouteAlert(pct);
    const safeLabel = row.label.replace(/'/g, "\\'");
    const d5plus = row.d5 + row.d6 + row.dMore;
    const old = row.d2 + row.d3 + row.d4 + d5plus;
    const stripe = pct > 100 ? 'occ-stripe-bad' : pct > 50 ? 'occ-stripe-warn' : 'occ-stripe-ok';
    const pctTxt = pct > 100 ? 'text-rose-600 dark:text-rose-400' : pct > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300';
    return `<tr data-occ-row data-name="${escapeHtml(row.label.toLowerCase())}" data-total="${row.total}" data-pct="${pct.toFixed(2)}" data-hv="${row.hv}" data-old="${old}" class="bg-white dark:bg-slate-900 hover:bg-amber-50/70 dark:hover:bg-slate-800 transition">
      <td class="occ-st-no text-center text-slate-400 dark:text-slate-500">${idx++}</td>
      <td class="occ-st-route ${stripe} font-sans text-slate-800 dark:text-slate-200 font-bold text-left pl-2 cursor-pointer hover:text-shopee dark:hover:text-orange-400 transition" onclick="showRouteDrilldown('${safeLabel}')" title="Klik untuk lihat breakdown per Hub di rute ${escapeHtml(row.label)}">${occRouteChainHtml(row.label)}</td>
      <td data-nd-slot data-nd-route="${row.label.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" class="text-center font-bold text-slate-400 dark:text-slate-600">-</td>
      <td data-nd-dep class="text-center font-bold text-slate-400 dark:text-slate-600">-</td>
      <td class="occ-num font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30">${nz(row.hv)}</td>
      <td class="occ-num font-bold text-sky-600 dark:text-sky-400">${nz(row.liquid)}</td>
      <td class="occ-num font-bold text-slate-800 dark:text-slate-200">${nz(row.bulky)}</td>
      <td class="occ-num font-bold text-slate-800 dark:text-slate-200">${nz(row.parcel)}</td>
      <td class="occ-num bg-orange-50 dark:bg-orange-950/50 font-black text-shopee dark:text-orange-400">${row.total.toLocaleString('id-ID')}</td>
      <td title="${row.total.toLocaleString('id-ID')} / ${INNER_ROUTE_CAPACITY.toLocaleString('id-ID')} parcel · ${alert.level}">
        <div class="flex items-center gap-1.5">
          <div class="occ-bar"><div class="${alert.bar}" style="width:${Math.min(pct, 100).toFixed(0)}%"></div></div>
          <span class="font-mono font-bold ${pctTxt} w-11 text-right shrink-0">${pct.toFixed(1)}%</span>
        </div>
      </td>
      ${ageCell(row.d0, row.label, 'd0', 'occ-age-ok')}
      ${ageCell(row.d1, row.label, 'd1', 'occ-age-ok')}
      ${ageCell(row.d2, row.label, 'd2', 'occ-age-warn')}
      ${ageCell(row.d3, row.label, 'd3', 'occ-age-bad')}
      ${ageCell(row.d4, row.label, 'd4', 'occ-age-bad')}
      ${ageCell(d5plus, row.label, 'd5', 'occ-age-bad')}
    </tr>`;
  }).join('');
  updateNextDepartCells();

  const outerSorted = Object.values(outerIslandMap).sort((a, b) => b.total - a.total);
  document.getElementById('outerIslandTotalHeader').innerText = t('ob.occ.totalLabel', { n: totalOuterIslandCount.toLocaleString('id-ID') });

  let idxOuter = 1;
  if (outerSorted.length === 0) {
    document.getElementById('outerIslandTableBody').innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 dark:text-slate-500 font-sans">${t('ob.emptyNoOuterIsland')}</td></tr>`;
  } else {
    document.getElementById('outerIslandTableBody').innerHTML = outerSorted.map(row => {
      const occPct = getOccupancyPct(row.total);
      const occLevel = getOccupancyLevel(occPct);
      const capTdClass = occLevel === 'critical'
        ? 'text-center font-black text-white bg-rose-600 dark:bg-rose-700'
        : occLevel === 'warn'
          ? 'text-center font-bold text-slate-950 bg-amber-300 dark:bg-amber-500/80'
          : 'text-center font-bold text-slate-700 dark:text-slate-300';
      const safeName = row.name.replace(/'/g, "\\'");
      return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
        <td class="text-center text-slate-400 dark:text-slate-500">${idxOuter++}</td>
        <td class="font-sans text-slate-800 dark:text-slate-200 font-bold text-left pl-2 cursor-pointer hover:text-shopee dark:hover:text-orange-400 hover:underline transition" onclick="showDestinationDrilldown('${safeName}')" title="Klik untuk lihat detail lengkap ${row.name}">${row.name}${occupancyBadgeHtml(occPct)}</td>
        <td class="text-center text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/30 dark:bg-emerald-950/20">${row.parcel.toLocaleString('id-ID')}</td>
        <td class="text-center font-black text-sky-600 dark:text-sky-400 bg-sky-50/40 dark:bg-sky-950/20">${row.total.toLocaleString('id-ID')}</td>
        <td class="${capTdClass}">${occPct.toFixed(1)}%</td>
      </tr>`;
    }).join('');
  }

  const routePlanList = routeVolumes.map(r => ({
    label: r.label,
    total: r.total,
    pct: (r.total / INNER_ROUTE_CAPACITY) * 100,
    cap: INNER_ROUTE_CAPACITY,
    category: 'Inner',
    hv: r.hv, bulky: r.bulky, nonBulky: r.parcel,
    old: r.d2 + r.d3 + r.d4 + r.d5 + r.d6 + r.dMore
  })).concat(outerSorted.map(r => ({
    label: r.name,
    total: r.total,
    pct: DESTINATION_CAPACITY > 0 ? (r.total / DESTINATION_CAPACITY) * 100 : 0,
    cap: DESTINATION_CAPACITY,
    category: 'Outer',
    hv: r.hv, bulky: r.bulky, nonBulky: r.nonBulky, old: r.old
  })));

  const top5 = routePlanList.sort((a, b) => b.pct - a.pct).slice(0, 5);
  const planContainer = document.getElementById('topActionPlanContainer');

  if (top5.length === 0 || top5.every(r => r.total === 0)) {
    planContainer.innerHTML = `<div class="text-center text-slate-400 dark:text-slate-500 py-3 font-sans">${t('ob.occ.emptyAnalysis')}</div>`;
  } else {
    const miniChip = (icon, label, val, tone) => `<span class="occ-mini ${tone}"><i class="${icon}"></i>${label} <b>${Number(val).toLocaleString('id-ID')}</b></span>`;
    planContainer.innerHTML = top5.map((item, index) => {
      const alert = getRouteAlert(item.pct);
      const barWidth = Math.min(Math.round(item.pct), 100);
      const diff = item.total - item.cap;
      const capNote = diff > 0
        ? `<span class="font-bold text-rose-600 dark:text-rose-400">${t('ob.occ.card.over', { n: diff.toLocaleString('id-ID') })}</span>`
        : `<span class="text-slate-500 dark:text-slate-400">${t('ob.occ.card.left', { n: Math.max(-diff, 0).toLocaleString('id-ID') })}</span>`;

      let rankBadge = `<span class="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-[10px] flex items-center justify-center shrink-0">${index + 1}</span>`;
      if (index === 0) rankBadge = `<span class="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-sm shrink-0"><i class="fa-solid fa-crown text-[9px]"></i></span>`;
      else if (index === 1) rankBadge = `<span class="w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-black text-[10px] flex items-center justify-center shadow-sm shrink-0">2</span>`;
      else if (index === 2) rankBadge = `<span class="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shadow-sm shrink-0">3</span>`;

      const catBadge = item.category === 'Outer'
        ? `<span class="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">OUTER</span>`
        : `<span class="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">INNER</span>`;

      const safe = item.label.replace(/'/g, "\\'");
      const onclick = item.category === 'Outer' ? `showDestinationDrilldown('${safe}')` : `showRouteDrilldown('${safe}')`;
      const ndAttr = item.label.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      const nextChip = item.category === 'Inner'
        ? `<span data-nd-card="${ndAttr}" class="occ-mini"><i class="fa-regular fa-clock"></i>Next Depart <b>-</b></span>`
        : '';

      return `<div class="occ-card p-2 rounded-xl border ${alert.ring} bg-slate-50/80 dark:bg-slate-800/60 text-[10px] shadow-sm flex flex-col justify-between gap-1" onclick="${onclick}" title="${escapeHtml(item.label)}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-start gap-1.5 min-w-0">
            ${rankBadge}
            ${catBadge}
            <span class="font-bold text-[11px] leading-snug text-slate-800 dark:text-slate-100 break-words">${item.category === 'Inner' ? occRouteChainHtml(item.label) : escapeHtml(item.label)}</span>
          </div>
          <span class="font-bold px-2 py-0.5 rounded-full ${alert.badge} flex items-center gap-1 shrink-0 text-[9px]"><i class="${alert.icon}"></i>${alert.level}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div class="${alert.bar} h-full rounded-full transition-all duration-500" style="width: ${barWidth}%"></div>
          </div>
          <span class="font-mono font-bold text-slate-700 dark:text-slate-200 shrink-0 w-12 text-right">${item.pct.toFixed(1)}%</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-slate-700 dark:text-slate-200 font-bold"><i class="fa-solid fa-box mr-1"></i>${item.total.toLocaleString('id-ID')} <span class="font-normal text-slate-400">/ ${item.cap.toLocaleString('id-ID')} Paket</span></span>
          ${capNote}
        </div>
        <div class="flex flex-wrap items-center gap-1">
          ${miniChip('fa-solid fa-gem', t('ob.th.hv'), item.hv, item.hv > 0 ? 'occ-mini-warn' : '')}
          ${miniChip('fa-solid fa-box-open', t('ob.th.bulky'), item.bulky, '')}
          ${miniChip('fa-solid fa-boxes-stacked', t('ob.th.nonBulky'), item.nonBulky, '')}
          ${miniChip('fa-solid fa-hourglass-half', 'Aging D-2+', item.old, item.old > 0 ? 'occ-mini-bad' : '')}
          ${nextChip}
        </div>
        <div class="text-slate-500 dark:text-slate-400 italic flex items-start gap-1"><i class="fa-solid fa-circle-info mt-0.5 shrink-0"></i><span>${alert.text}</span></div>
      </div>`;
    }).join('');
  }
  updateNextDepartCells();

  renderExecutiveSummary({ total, criticalParcels, capPct, capPctRaw, prevDCSnapshot, top5 });
}

function renderExecutiveSummary({ total, criticalParcels, capPct, capPctRaw, prevDCSnapshot, top5 }) {
  const verdictBadge = document.getElementById('execVerdictBadge');
  const verdictIcon = document.getElementById('execVerdictIcon');
  const verdictLabel = document.getElementById('execVerdictLabel');
  const narrativeEl = document.getElementById('execNarrativeText');
  const deltaTotalEl = document.getElementById('execDeltaTotal');
  const deltaCriticalEl = document.getElementById('execDeltaCritical');
  const slaContainer = document.getElementById('slaGaugeContainer');

  if (total === 0) {
    narrativeEl.innerText = t('ob.exec.emptyNarrative');
    verdictBadge.className = 'shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center font-black text-white shadow-inner bg-slate-400';
    verdictIcon.className = 'fa-solid fa-circle-question text-xl';
    verdictLabel.innerText = t('ob.badge.na');
    deltaTotalEl.innerHTML = ''; deltaCriticalEl.innerHTML = '';
    slaContainer.innerHTML = `<div class="col-span-2 text-center text-[10px] text-slate-400 dark:text-slate-500 py-2 font-sans">${t('ob.exec.waitingSla')}</div>`;
    return;
  }

  const criticalPctOfTotal = total > 0 ? (criticalParcels / total) * 100 : 0;
  const worst = top5 && top5.length > 0 ? top5[0] : null;
  const worstAlert = worst ? getRouteAlert(worst.pct) : null;

  const packerCriticalMap = {};
  filteredData.forEach(item => {
    if (item.agingDays > 4) {
      const p = item.lastPacker && item.lastPacker !== '-' ? item.lastPacker : t('ob.packer.unassigned');
      packerCriticalMap[p] = (packerCriticalMap[p] || 0) + 1;
    }
  });
  const packerCriticalArr = Object.entries(packerCriticalMap).sort((a, b) => b[1] - a[1]);
  const topPackerName = packerCriticalArr.length > 0 ? packerCriticalArr[0][0] : null;
  const topPackerCount = packerCriticalArr.length > 0 ? packerCriticalArr[0][1] : 0;
  const topPackerPct = criticalParcels > 0 ? ((topPackerCount / criticalParcels) * 100).toFixed(0) : 0;

  let verdict = t('ob.exec.verdictAman'), verdictCls = 'bg-emerald-500', icon = 'fa-solid fa-circle-check', verdictKey = 'aman';
  const capOverTarget = capPctRaw >= SLA_OCC_TARGET;
  const agingOverTarget = criticalPctOfTotal > SLA_AGING_TARGET;
  const routeCritical = worstAlert && (worstAlert.level === 'CRITICAL' || worstAlert.level === 'URGENT');
  const routeWatch = worstAlert && worstAlert.level === 'WATCH';

  if (capPctRaw >= 100 || routeCritical || criticalPctOfTotal > SLA_AGING_TARGET * 2) {
    verdict = t('ob.exec.verdictKritis'); verdictCls = 'bg-rose-600'; icon = 'fa-solid fa-fire'; verdictKey = 'kritis';
  } else if (capOverTarget || agingOverTarget || routeWatch) {
    verdict = t('ob.exec.verdictWaspada'); verdictCls = 'bg-amber-400'; icon = 'fa-solid fa-triangle-exclamation'; verdictKey = 'waspada';
  }

  verdictBadge.className = `shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center font-black text-white shadow-inner ${verdictCls} ${verdictKey === 'waspada' ? 'text-slate-950' : ''}`;
  verdictIcon.className = `${icon} text-xl`;
  verdictLabel.innerText = verdict;

  const execLine = (ico, cls, html) => '<div class="exec-line"><i class="' + ico + ' ' + cls + '"></i><span>' + String(html).replace(/^[\s.,;]+/, '') + '</span></div>';
  let narrative = execLine('fa-solid fa-boxes-stacked', 'text-slate-400', t('ob.exec.narrativeMain', {
    total: total.toLocaleString('id-ID'),
    capPct: capPct,
    maxCap: MAX_STAGING_CAPACITY.toLocaleString('id-ID'),
    critical: criticalParcels.toLocaleString('id-ID'),
    critPct: criticalPctOfTotal.toFixed(1)
  }));
  if (worst) {
    narrative += execLine('fa-solid fa-route', routeCritical ? 'text-rose-500' : (routeWatch ? 'text-amber-500' : 'text-emerald-500'), t('ob.exec.narrativeRoute', {
      route: worst.label, category: worst.category, pct: worst.pct.toFixed(1), alertText: worstAlert.text
    }));
  }
  if (topPackerName && topPackerCount > 0) {
    narrative += execLine('fa-solid fa-user-clock', 'text-rose-500', t('ob.exec.narrativeTopPacker', { name: escapeHtml(topPackerName), pct: topPackerPct }));
  }
  narrativeEl.innerHTML = narrative;

  if (prevDCSnapshot) {
    const dTotal = total - prevDCSnapshot.dcTotal;
    const dCritical = criticalParcels - prevDCSnapshot.dcCritical;
    deltaTotalEl.innerHTML = `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${t('ob.exec.volumeVsPrev', { sign: dTotal >= 0 ? '+' : '', n: dTotal.toLocaleString('id-ID') })}</span>`;
    const critCls = dCritical > 0 ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300' : dCritical < 0 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    deltaCriticalEl.innerHTML = `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${critCls}">${t('ob.exec.backlogVsPrev', { sign: dCritical >= 0 ? '+' : '', n: dCritical.toLocaleString('id-ID') })}</span>`;
  } else {
    deltaTotalEl.innerHTML = `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${t('ob.exec.firstImport')}</span>`;
    deltaCriticalEl.innerHTML = '';
  }

  const slaItems = [
    {
      label: t('ob.exec.slaOccLabel'), icon: 'fa-warehouse',
      value: capPctRaw, target: SLA_OCC_TARGET, unit: '%', pass: capPctRaw <= SLA_OCC_TARGET,
      detail: t('ob.exec.slaDetail', { v: capPctRaw.toFixed(1), t: SLA_OCC_TARGET })
    },
    {
      label: t('ob.exec.slaBacklogLabel'), icon: 'fa-triangle-exclamation',
      value: criticalPctOfTotal, target: SLA_AGING_TARGET, unit: '%', pass: criticalPctOfTotal <= SLA_AGING_TARGET,
      detail: t('ob.exec.slaDetail', { v: criticalPctOfTotal.toFixed(1), t: SLA_AGING_TARGET })
    }
  ];

  slaContainer.innerHTML = slaItems.map(s => {
    if (s.na) {
      return `<div class="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 flex flex-col justify-between">
        <span class="text-[9px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1"><i class="fa-solid ${s.icon}"></i>${s.label}</span>
        <span class="text-[9px] text-slate-400 dark:text-slate-500 mt-1">${s.detail}</span>
      </div>`;
    }
    const passCls = s.pass ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/20';
    const badgeCls = s.pass ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white';
    return `<div class="rounded-lg border ${passCls} p-2 flex flex-col justify-between">
      <div class="flex items-center justify-between gap-1">
        <span class="text-[9px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate"><i class="fa-solid ${s.icon}"></i>${s.label}</span>
        <span class="text-[8px] font-extrabold px-1.5 py-0.3 rounded-full ${badgeCls} shrink-0">${s.pass ? t('ob.exec.pass') : t('ob.exec.fail')}</span>
      </div>
      <div class="flex items-baseline gap-2 mt-1"><span class="text-2xl font-black font-mono leading-none ${s.pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${s.value.toFixed(1)}%</span><span class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">target ≤${s.target}%</span></div>
    </div>`;
  }).join('');
}

function downloadReportImage() {
  const dashboard = document.getElementById('dashboardContent');
  html2canvas(dashboard, {
    scale: 2,
    useCORS: true,
    logging: false,
    onclone: function (doc) { ['occScroll','occScrollInner'].forEach(function (id) { var el = doc.getElementById(id); if (el) { el.style.position = 'static'; el.style.flex = 'none'; el.style.maxHeight = 'none'; el.style.overflow = 'visible'; } }); }
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `STAGING_OUTBOUND_REPORT_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

