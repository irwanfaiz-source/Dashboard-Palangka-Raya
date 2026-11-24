/**
 * assets/js/performance-bagger/table-and-aggregates.js — Agregasi, sortir, leaderboard, tabel utama, ringkasan
 * Bagian 9/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== AGGREGASI & RENDER TABEL ====
function computePbAggregates() {
  const agg = {};
  const targetDateStr = getYesterdayDateStr();

  STAFF_ROSTER.forEach(function (s) {
    agg[s.opsId] = { name: s.name, agency: s.agency, status: s.status, total: 0, days: 0, achievedDays: 0, d1Packed: 0, dailyData: {}, dailyStatus: {} };
  });

  Object.keys(pbMonthlyRecords).forEach(function (dateStr) {
    const dayData = pbMonthlyRecords[dateStr] || {};
    Object.keys(dayData).forEach(function (opsId) {
      const rec = dayData[opsId];
      if (!agg[opsId]) {
        agg[opsId] = { name: rec.name || opsId, agency: rec.agency || '-', status: 'DW On Call', total: 0, days: 0, achievedDays: 0, d1Packed: 0, dailyData: {}, dailyStatus: {} };
      }
      const packed = rec.packed || 0;
      agg[opsId].total += packed;
      agg[opsId].days += 1;
      agg[opsId].dailyData[dateStr] = packed;
      agg[opsId].dailyStatus[dateStr] = rec.statusInfo || 'Normal / Bekerja';
      
      if (dateStr === targetDateStr) {
        agg[opsId].d1Packed = packed;
      }

      const threshold = ACHIEVEMENT_THRESHOLD[agg[opsId].status] || ACHIEVEMENT_THRESHOLD['DW On Call'];
      if (packed >= threshold) agg[opsId].achievedDays += 1;
    });
  });

  let maxAvg = 0;
  let topSpeedOpsId = null;

  Object.keys(agg).forEach(function(opsId) {
    const item = agg[opsId];
    item.avg = item.days > 0 ? Math.round(item.total / item.days) : 0;
    
    if (item.days > 0 && item.avg > maxAvg) {
      maxAvg = item.avg;
      topSpeedOpsId = opsId;
    }

    const dates = Object.keys(item.dailyData).sort();
    let underStreak = 0;
    let overStreak = 0;
    const threshold = ACHIEVEMENT_THRESHOLD[item.status] || ACHIEVEMENT_THRESHOLD['DW On Call'];
    
    for (let i = dates.length - 1; i >= 0; i--) {
      const dStr = dates[i];
      const stInfo = item.dailyStatus[dStr];
      const isOffDutyOrLeave = stInfo && stInfo !== 'Normal / Bekerja';
      
      if (item.dailyData[dStr] < threshold) {
        if (!isOffDutyOrLeave) {
          underStreak++;
        }
      } else {
        break;
      }
    }
    item.underStreak = underStreak;

    for (let i = dates.length - 1; i >= 0; i--) {
      if (item.dailyData[dates[i]] >= threshold) {
        overStreak++;
      } else {
        break;
      }
    }
    item.overStreak = overStreak;

    if (dates.length >= 4) {
      const recent = dates.slice(-3).reduce((acc, d) => acc + item.dailyData[d], 0) / 3;
      const prev = dates.slice(-6, -3).reduce((acc, d) => acc + item.dailyData[d], 0) / (dates.length >= 6 ? 3 : dates.length - 3);
      item.growth = prev > 0 ? Math.round(((recent - prev) / prev) * 100) : 0;
    } else {
      item.growth = 0;
    }
  });

  if (topSpeedOpsId) {
    agg[topSpeedOpsId].isSpeedDemon = true;
  }

  return agg;
}

function statusBadgeClass(status) {
  if (status === 'Dedicated Operator') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  if (status === 'DW Reguler Pria') return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
  if (status === 'DW Reguler Wanita') return 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300';
  return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
}

function pbxEsc(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pbxStatusMeta(status) {
  if (status === 'Dedicated Operator') return { cls: 'pbx-st-ded', icon: 'fa-star' };
  if (status === 'DW Reguler Pria') return { cls: 'pbx-st-pria', icon: 'fa-mars' };
  if (status === 'DW Reguler Wanita') return { cls: 'pbx-st-wanita', icon: 'fa-venus' };
  return { cls: 'pbx-st-oncall', icon: 'fa-clock' };
}

let pbSortState = { col: 'total', dir: 'desc' };

function sortPbTable(col) {
  if (pbSortState.col === col) {
    pbSortState.dir = pbSortState.dir === 'desc' ? 'asc' : 'desc';
  } else {
    pbSortState.col = col;
    pbSortState.dir = (col === 'total' || col === 'avg') ? 'desc' : 'asc';
  }
  renderPbTable();
}

function updatePbSortIcons() {
  document.querySelectorAll('thead tr.bg-shopee th[data-col]').forEach(function (th) {
    const icon = th.querySelector('.sort-icon');
    const isActive = th.getAttribute('data-col') === pbSortState.col;
    th.classList.toggle('sort-active', isActive);
    if (icon) icon.className = 'fa-solid ' + (isActive ? (pbSortState.dir === 'desc' ? 'fa-sort-down' : 'fa-sort-up') : 'fa-sort') + ' sort-icon';
  });
}

function generateSparklineSVG(dailyData) {
  const dates = Object.keys(dailyData).sort().slice(-7);
  if (dates.length < 2) return '<span class="text-slate-300 text-[9px]">-</span>';
  const values = dates.map(d => dailyData[d]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 64, height = 22;
  
  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = values[values.length - 1] >= values[0] ? '#10b981' : '#f43f5e';
  return `<svg width="${width}" height="${height}" class="inline-block"><polyline fill="none" stroke="${strokeColor}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" points="${points}"/></svg>`;
}

function renderLeaderboard(rows) {
  const sorted = rows.slice().sort((a, b) => b.total - a.total).slice(0, 3);
  const container = document.getElementById('pbLeaderboard');

  if (!sorted.length || sorted[0].total === 0) {
    container.innerHTML = '<span class="text-xs text-slate-400 italic">' + t('pb.hof.empty') + '</span>';
    return;
  }

  container.innerHTML = sorted.map((item, idx) => `
    <div class="pbx-pod pbx-pod-${idx + 1}">
      <span class="pbx-medal pbx-m${idx + 1}">${idx + 1}</span>
      <div class="min-w-0">
        <p class="pbx-pod-name" title="${pbxEsc(item.name)}">${pbxEsc(item.name)}</p>
        <p class="pbx-pod-pcs"><b>${item.total.toLocaleString('id-ID')}</b> ${t('pb.unit.pcs')}</p>
      </div>
    </div>
  `).join('');
}

function renderThTotalHeader() {
  const thTotal = document.getElementById('thTotalCol');
  if (!thTotal) return;
  if (d1ViewFilterActive) {
    thTotal.innerHTML = `<span data-i18n="pb.table.d1Packed">${t('pb.table.d1Packed')}</span> (${getYesterdayDateStr()}) <i class="fa-solid fa-sort sort-icon"></i>`;
  } else {
    thTotal.innerHTML = `<span data-i18n="pb.table.totalTarget">${t('pb.table.totalTarget')}</span> <i class="fa-solid fa-sort sort-icon"></i>`;
  }
}

function toggleD1ViewFilter() {
  d1ViewFilterActive = !d1ViewFilterActive;
  const btn = document.getElementById('btnD1ViewFilter');
  btn.classList.toggle('pbx-on', d1ViewFilterActive);
  btn.setAttribute('aria-pressed', d1ViewFilterActive ? 'true' : 'false');
  renderThTotalHeader();
  renderPbTable();
}

function setQuickDateRange(type) {
  if (type === 'd1') {
    const yest = getYesterdayDateStr();
    document.getElementById('exportStartDate').value = yest;
    document.getElementById('exportEndDate').value = yest;
    if (!d1ViewFilterActive) toggleD1ViewFilter();
  }
}

function toggleRedFlagFilter() {
  redFlagFilterActive = !redFlagFilterActive;
  const btn = document.getElementById('btnRedFlagFilter');
  btn.classList.toggle('pbx-on', redFlagFilterActive);
  btn.setAttribute('aria-pressed', redFlagFilterActive ? 'true' : 'false');
  renderPbTable();
}

function renderPbTable() {
  const agg = computePbAggregates();
  let rows = Object.keys(agg).map(function (opsId) { return Object.assign({ opsId: opsId }, agg[opsId]); });

  const searchTerm = (document.getElementById('pbSearch').value || '').toLowerCase();
  const agencyFilter = document.getElementById('pbAgencyFilter').value;
  const statusFilter = document.getElementById('pbStatusFilter').value;

  const filtered = rows.filter(function (r) {
    if (searchTerm && r.name.toLowerCase().indexOf(searchTerm) === -1 && r.opsId.toLowerCase().indexOf(searchTerm) === -1) return false;
    if (agencyFilter !== 'ALL' && r.agency !== agencyFilter) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    
    if (d1ViewFilterActive && r.d1Packed === 0) return false;

    if (redFlagFilterActive) {
      const achRate = r.days > 0 ? (r.achievedDays / r.days) : 1;
      const isLowPerf = r.days > 0 && achRate < 0.5;
      const isUnderStreak = r.underStreak >= 3;
      if (!isLowPerf && !isUnderStreak) return false;
    }

    return true;
  });

  const sortCol = pbSortState.col;
  const sortDir = pbSortState.dir === 'desc' ? -1 : 1;
  filtered.sort(function (a, b) {
    let av = a[sortCol], bv = b[sortCol];
    if (d1ViewFilterActive && sortCol === 'total') {
      av = a.d1Packed; bv = b.d1Packed;
    }
    if (sortCol === 'total' || sortCol === 'avg') return (av - bv) * sortDir;
    av = String(av || '').toLowerCase();
    bv = String(bv || '').toLowerCase();
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  });
  
  lastFilteredRows = filtered;
  updatePbSortIcons();

  const tbody = document.getElementById('pbTableBody');
  if (!filtered.length) {
    tbody.innerHTML = '<tr class="pbx-empty-row"><td colspan="9" class="pbx-empty">' + t('pb.table.noMatch') + '</td></tr>';
  } else {
    tbody.innerHTML = filtered.map(function (r, idx) {
      const achRate = r.days > 0 ? (r.achievedDays / r.days) : 1;
      const isLowPerformance = r.days > 0 && achRate < 0.5;

      const rankBadge = idx < 3
        ? '<span class="pbx-medal pbx-m' + (idx + 1) + '">' + (idx + 1) + '</span>'
        : '<span class="pbx-medal pbx-medal-n">' + (idx + 1) + '</span>';

      const dailyTarget = ACHIEVEMENT_THRESHOLD[r.status] || ACHIEVEMENT_THRESHOLD['DW On Call'];
      const displayVolume = d1ViewFilterActive ? r.d1Packed : r.total;
      const targetMonthly = d1ViewFilterActive ? dailyTarget : (dailyTarget * (r.days || 1));
      const targetPct = Math.min(100, Math.round((displayVolume / targetMonthly) * 100));
      const barCls = (d1ViewFilterActive && r.d1Packed < dailyTarget) ? 'pbx-bar-low'
        : (targetPct >= 100 ? 'pbx-bar-ok' : (targetPct >= 90 ? 'pbx-bar-mid' : 'pbx-bar-low'));

      const subtext = d1ViewFilterActive
        ? (r.d1Packed >= dailyTarget ? ' ' + t('pb.table.achievedD1') : ' ' + t('pb.table.underD1'))
        : (r.days > 0 ? t('pb.table.daysAchieved', { done: r.achievedDays, total: r.days }) : t('pb.table.noDataYet'));

      let visualBadges = '';
      if (r.isSpeedDemon) visualBadges += '<span title="' + t('pb.badge.speedDemon') + '" class="ml-1 text-[11px] cursor-help">🚀</span>';
      if (r.days >= 3 && r.achievedDays === r.days) visualBadges += '<span title="' + t('pb.badge.mostConsistent') + '" class="ml-1 text-[11px] cursor-help">🛡️</span>';
      if (r.overStreak >= 3) visualBadges += '<span title="' + t('pb.badge.onFire') + '" class="ml-1 text-[11px] cursor-help">🔥</span>';
      if (r.underStreak >= 3) visualBadges += '<span title="' + t('pb.badge.underTargetWarn', { n: r.underStreak }) + '" class="ml-1 text-[11px] cursor-help">⚠️</span>';

      let growthHtml = '<span class="pbx-gr pbx-flat">&ndash;</span>';
      if (r.growth > 0) {
        growthHtml = '<span class="pbx-gr pbx-up"><i class="fa-solid fa-arrow-up"></i>' + r.growth + '%</span>';
      } else if (r.growth < 0) {
        growthHtml = '<span class="pbx-gr pbx-down"><i class="fa-solid fa-arrow-down"></i>' + Math.abs(r.growth) + '%</span>';
      }

      const sm = pbxStatusMeta(r.status);
      const openJs = 'openPbDetail(\'' + r.opsId + '\')';

      return '<tr class="' + (isLowPerformance ? 'pbx-low' : '') + '" onclick="' + openJs + '">' +
        '<td class="pbx-rank">' + rankBadge + '</td>' +
        '<td><span class="pbx-name">' + pbxEsc(r.name) + '</span>' + visualBadges + '</td>' +
        '<td class="pbx-ops">' + pbxEsc(r.opsId) + '</td>' +
        '<td>' + pbxEsc(r.agency) + '</td>' +
        '<td><span class="pbx-st ' + sm.cls + '"><i class="fa-solid ' + sm.icon + '"></i>' + statusLabel(r.status) + '</span></td>' +
        '<td class="pbx-tt">' +
          '<div class="pbx-tt-top">' +
            '<button type="button" onclick="event.stopPropagation();' + openJs + '" class="pbx-tt-val">' + displayVolume.toLocaleString('id-ID') + '</button>' +
            '<span class="pbx-tt-of">/ ' + targetMonthly.toLocaleString('id-ID') + '</span>' +
          '</div>' +
          '<div class="pbx-bar-row"><div class="pbx-bar"><i class="' + barCls + '" style="width:' + targetPct + '%"></i></div><span class="pbx-pct">' + targetPct + '%</span></div>' +
          '<div class="pbx-sub">' + subtext + '</div>' +
        '</td>' +
        '<td class="pbx-avg">' + r.avg.toLocaleString('id-ID') + t('pb.table.perDay') + '</td>' +
        '<td><div class="pbx-trend">' + growthHtml + generateSparklineSVG(r.dailyData) + '</div></td>' +
        '<td class="pbx-chev"><i class="fa-solid fa-chevron-right text-[10px]"></i></td>' +
      '</tr>';
    }).join('');
  }
  updatePbSummary(rows);
  renderAgencyChart(rows);
  renderLeaderboard(rows);
}

function updatePbSummary(allRows) {
  const withData = allRows.filter(function (r) { return r.days > 0; });
  document.getElementById('pbSummaryStaff').innerText = withData.length + ' / ' + allRows.length;
  const staffPct = allRows.length ? Math.round((withData.length / allRows.length) * 100) : 0;
  const staffBar = document.getElementById('pbSummaryStaffBar');
  if (staffBar) staffBar.style.width = staffPct + '%';
  const staffPctEl = document.getElementById('pbSummaryStaffPct');
  if (staffPctEl) staffPctEl.innerText = staffPct + '%';

  let totalDays = 0, totalAchieved = 0;
  withData.forEach(function (r) { totalDays += r.days; totalAchieved += r.achievedDays; });
  const rate = totalDays > 0 ? Math.round((totalAchieved / totalDays) * 100) : 0;
  document.getElementById('pbSummaryRate').innerText = rate + '%';
  document.getElementById('pbSummaryRateDetail').innerText = totalDays > 0 ? t('pb.summary.rateDetail', { done: totalAchieved, total: totalDays }) : t('pb.table.noDataYet');

  if (withData.length) {
    const top = withData.slice().sort(function (a, b) { return b.total - a.total; })[0];
    document.getElementById('pbSummaryTop').innerText = top.name + ' (' + top.total.toLocaleString('id-ID') + ')';
  } else {
    document.getElementById('pbSummaryTop').innerText = '-';
  }
}

