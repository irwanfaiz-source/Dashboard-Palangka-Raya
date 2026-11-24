/**
 * assets/js/performance-bagger/agency-and-detail.js — Breakdown agency & popup detail harian
 * Bagian 10/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== AGENCY BREAKDOWN (proportional bars) ====
function renderAgencyChart(allRows) {
  const agencyColors = { MYROBIN: '#7c6bb0', UGBM: '#3b82f6', IPI: '#f59e0b' };
  const agencyTotals = { MYROBIN: 0, UGBM: 0, IPI: 0 };
  allRows.forEach(r => {
    if (agencyTotals[r.agency] !== undefined) agencyTotals[r.agency] += (r.total || 0);
  });

  const grandTotal = agencyTotals.MYROBIN + agencyTotals.UGBM + agencyTotals.IPI;
  const maxVal = Math.max(agencyTotals.MYROBIN, agencyTotals.UGBM, agencyTotals.IPI, 1);
  const container = document.getElementById('agencyBreakdownList');
  if (!container) return;

  container.innerHTML = Object.keys(agencyTotals).map(function (agency) {
    const val = agencyTotals[agency];
    const widthPct = Math.max((val / maxVal) * 100, val > 0 ? 4 : 0);
    const sharePct = grandTotal > 0 ? Math.round((val / grandTotal) * 100) : 0;
    return '<div>' +
      '<div class="pbx-ag-top">' +
        '<span class="pbx-ag-name"><i style="background-color:' + agencyColors[agency] + ';"></i>' + agency + '</span>' +
        '<span class="pbx-ag-val">' + val.toLocaleString('id-ID') + ' ' + t('pb.unit.pcs') + ' &middot; ' + sharePct + '%</span>' +
      '</div>' +
      '<div class="pbx-prog-track"><i style="width:' + widthPct + '%; background-color:' + agencyColors[agency] + ';"></i></div>' +
    '</div>';
  }).join('');
}

// ==== POPUP DETAIL HARIAN & CHART ====
function formatTanggalId(dateStr) {
  const parts = dateStr.split('-').map(Number);
  const monthNames = getMonthNames();
  return parts[2] + '-' + monthNames[parts[1] - 1] + '-' + parts[0];
}

function openPbDetail(opsId) {
  currentDetailOpsId = opsId;
  const agg = computePbAggregates();
  const staff = agg[opsId];
  if (!staff) return;
  const threshold = ACHIEVEMENT_THRESHOLD[staff.status] || ACHIEVEMENT_THRESHOLD['DW On Call'];
  const fmt = function (n) { return Number(n).toLocaleString('id-ID'); };
  const setTxt = function (id, v) { document.getElementById(id).innerText = v; };

  // Header: identitas operator
  setTxt('pbDetailName', staff.name);
  setTxt('pbDetailAvatar', staff.name.trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase());
  setTxt('pbDetailOps', opsId);
  setTxt('pbDetailAgency', staff.agency);
  setTxt('pbDetailRole', statusLabel(staff.status));
  const streakEl = document.getElementById('pbDetailStreak');
  if (staff.underStreak >= 3) {
    streakEl.innerText = t('pb.detail.streakWarn', { n: staff.underStreak });
    streakEl.classList.remove('hidden');
  } else {
    streakEl.classList.add('hidden');
  }

  // Kartu ringkasan
  setTxt('pbKpiTotal', fmt(staff.total));
  setTxt('pbKpiAvg', (staff.days > 0 ? staff.total / (staff.days * 8) : 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  setTxt('pbKpiTarget', '>' + fmt(threshold));
  setTxt('pbLegTarget', t('pb.detail.legendTarget') + ' (' + fmt(threshold) + ')');
  const rate = staff.days > 0 ? staff.achievedDays / staff.days : 0;
  const achEl = document.getElementById('pbKpiAch');
  if (staff.days > 0) {
    const lvl = rate >= 0.8 ? 'ok' : (rate >= 0.5 ? 'mid' : 'bad');
    achEl.className = 'pbd-ach ' + lvl;
    achEl.innerHTML = '<i class="fa-solid ' + (lvl === 'bad' ? 'fa-circle-xmark' : 'fa-circle-check') + '"></i>' +
      (lvl === 'ok' ? t('pb.detail.achieved') : (lvl === 'mid' ? t('pb.detail.partial') : t('pb.detail.notAchieved')));
    setTxt('pbKpiAchSub', t('pb.detail.daysOf', { a: staff.achievedDays, b: staff.days }));
  } else {
    achEl.className = 'pbd-ach'; achEl.innerText = '-'; setTxt('pbKpiAchSub', '');
  }

  const dateKeys = Object.keys(pbMonthlyRecords).filter(function (d) { return pbMonthlyRecords[d][opsId]; }).sort();
  // Dropdown Per Jam: gabungin tanggal dari dailyRecords + hourlyCoverage,
  // biar chart per jam tetap muncul walau data harian belum diimport.
  const hourMonthStr = document.getElementById('pbMonthPicker').value;
  if (fbDb && hourMonthStr) {
    fbDb.ref(FB_PB_ROOT + '/hourlyCoverage')
      .orderByKey().startAt(hourMonthStr + '-01').endAt(hourMonthStr + '-31')
      .once('value')
      .then(function (snap) {
        if (currentDetailOpsId !== opsId) return;
        refreshPbHourSelect(opsId, Array.from(new Set(dateKeys.concat(Object.keys(snap.val() || {})))).sort());
      })
      .catch(function () { refreshPbHourSelect(opsId, dateKeys); });
  } else {
    refreshPbHourSelect(opsId, dateKeys);
  }

  // Tabel riwayat
  const tbody = document.getElementById('pbDetailBody');
  const packedValues = [], shortLabels = [], fullLabels = [];
  const presetOptions = ['Normal / Bekerja', 'Off Duty', 'Rest Day', 'Cuti', 'Sakit', 'Izin', 'Lainnya...'];
  const names = getMonthNames();

  if (!dateKeys.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="pbd-empty">' + t('pb.detail.noData') + '</td></tr>';
  } else {
    tbody.innerHTML = dateKeys.map(function (d) {
      const rec = pbMonthlyRecords[d][opsId];
      const packed = rec.packed || 0;
      const statusInfo = rec.statusInfo || 'Normal / Bekerja';
      const parts = d.split('-').map(Number);
      packedValues.push(packed);
      shortLabels.push(parts[2] + ' ' + names[parts[1] - 1]);
      fullLabels.push(parts[2] + ' ' + names[parts[1] - 1] + ' ' + parts[0]);

      const achieved = packed >= threshold;
      const isPreset = presetOptions.indexOf(statusInfo) !== -1;
      const selected = isPreset ? statusInfo : 'Lainnya...';
      const opts = presetOptions.map(function (o) { return '<option value="' + o + '"' + (selected === o ? ' selected' : '') + '>' + o + '</option>'; }).join('');

      return '<tr>' +
        '<td>' + fullLabels[fullLabels.length - 1] + '</td>' +
        '<td>' +
          '<span class="pbd-stat"><span class="pbd-dot ' + pbdDotCls(statusInfo) + '"></span>' +
          '<select class="pbd-sel" aria-label="Status ' + d + '" onchange="pbdStatusDot(this);updateDailyStatusInfo(\'' + d + '\', \'' + opsId + '\', this)">' + opts + '</select></span>' +
          '<input id="custom-status-' + d + '" type="text" placeholder="Tulis alasan..." value="' + (isPreset ? '' : pbdEsc(statusInfo)) + '" onblur="updateDailyStatusCustom(\'' + d + '\', \'' + opsId + '\', this)" class="pbd-sel pbd-custom ' + (selected === 'Lainnya...' ? '' : 'hidden') + '" />' +
        '</td>' +
        '<td class="num">' + fmt(packed) + '</td>' +
        '<td class="num">' + (packed / 8).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + t('pb.detail.perHour') + '</td>' +
        '<td><span class="pbd-ach ' + (achieved ? 'ok' : 'bad') + '" style="margin-top:0"><i class="fa-solid ' + (achieved ? 'fa-circle-check' : 'fa-circle-xmark') + '"></i>' + (achieved ? t('pb.detail.achieved') : t('pb.detail.notAchieved')) + '</span></td>' +
      '</tr>';
    }).join('');
  }
  setTxt('pbDetailTotal', fmt(staff.total));

  const modal = document.getElementById('pbDetailModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.pbd-body').scrollTop = 0;
  setTimeout(function () { document.getElementById('pbDetailCloseBtn').focus(); }, 100);

  // Grafik harian
  const th = pbdTheme();
  if (detailChartInstance) detailChartInstance.destroy();
  detailChartInstance = new Chart(document.getElementById('detailDailyChart').getContext('2d'), {
    type: 'bar',
    data: { labels: shortLabels, datasets: [{ label: 'Packed Harian', data: packedValues, borderRadius: 6, maxBarThickness: 56,
      backgroundColor: packedValues.map(function (v) { return v >= threshold ? '#10b981' : '#f43f5e'; }) }] },
    options: {
      responsive: true, maintainAspectRatio: false, layout: { padding: { top: 16 } },
      onHover: function (e, els) { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
      onClick: function (e, els) {
        if (!els.length) return;
        const sel = document.getElementById('pbHourDateSelect');
        sel.value = dateKeys[els[0].index];
        if (sel.value === dateKeys[els[0].index]) loadPbHourly();
      },
      plugins: {
        legend: { display: false }, barValueLabels: { fontSize: 10.5 },
        pbdTargetLine: { value: threshold, label: t('pb.detail.targetLbl') + ': ' + fmt(threshold) },
        tooltip: pbdTip(th, { callbacks: {
          title: function (items) { return fullLabels[items[0].dataIndex]; },
          label: function (c) { return fmt(c.parsed.y) + ' ' + t('pb.unit.pcs'); },
          afterLabel: function (c) { return t('pb.detail.ofTarget', { n: Math.round(c.parsed.y / threshold * 100) }); }
        } })
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 10, maxRotation: 0, font: { size: 11 }, color: th.tick } },
        y: { beginAtZero: true, suggestedMax: threshold * 1.2, grace: '12%', grid: { color: th.grid }, border: { display: false }, ticks: { color: th.tick, font: { size: 11 }, maxTicksLimit: 6, callback: function (v) { return fmt(v); } } }
      }
    },
    plugins: [barValueLabelsPlugin, pbdTargetLine]
  });
}

