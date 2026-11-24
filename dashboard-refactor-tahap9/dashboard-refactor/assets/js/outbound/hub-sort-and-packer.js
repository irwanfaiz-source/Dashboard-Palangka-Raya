/**
 * assets/js/outbound/hub-sort-and-packer.js — Kode sortir hub dan leaderboard Packer
 * Bagian 11/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

function copyToClipboard(mode) {
  if (currentModalTOList.length === 0) return;
  const textToCopy = currentModalTOList.join('\n');
  navigator.clipboard.writeText(textToCopy).then(() => {
    const btn = document.getElementById('copyBtnTextTO');
    const originalText = btn.innerText;
    btn.innerText = "Berhasil!";
    setTimeout(() => { btn.innerText = originalText; }, 2000);
  });
}

const hubSortCodeMap = {
  "Palangka Raya Hub": "Z-101",
  "Bukit Batu Kota Palangka Raya Hub": "Z-102",
  "Rakumpit Hub": "Z-103",
  "Sebangau Hub": "Z-104",
  "Jekan Raya Hub": "Z-105",
  "Khayan Tengah Hub": "Z-106",
  "Pahandut Hub": "Z-107",
  "Pahandut 3 Hub": "Z-108",
  "Timpah Hub": "Z-109",
  "Timpah 2 Hub": "Z-110",
  "Timpah 3 Hub": "Z-111",
  "Khayan Hilir Hub": "Z-112",
  "Maliku Hub": "Z-113",
  "Kasongan Hub": "Z-114",
  "Tewang Sanggalang Garing (Sangalang) Hub": "Z-115",
  "Katingan Tengah Hub": "Z-116",
  "Katingan Hilir 2 Hub": "Z-117",
  "Cempaga Hulu Hub": "Z-118",
  "Cempaga Hulu 2 Hub": "Z-119",
  "Kurun Hub": "Z-120",
  "Kurun 3 Hub": "Z-121",
  "Tewah Hub": "Z-122",
  "Parenggean Hub": "Z-123",
  "Parenggean 5 Hub": "Z-124",
  "Telaga Antang Hub": "Z-125",
  "Antang Kalang Hub": "Z-126",
  "Kota Besi Hub": "Z-127",
  "Cempaga Hub": "Z-128",
  "Mentawa Baru Hub": "Z-129",
  "Baamang 2 Hub": "Z-130",
  "Baamang Hub": "Z-131",
  "Baamang 3 Hub": "Z-132",
  "Mentaya Hilir Selatan Hub": "Z-133",
  "Mentaya Hilir Utara Hub": "Z-134",
  "Mentaya Hulu Hub": "Z-135",
  "Seruyan Hilir Hub": "Z-136",
  "Seruyan Hilir Timur Hub": "Z-137",
  "Teluk Sampit Hub": "Z-138",
  "Telawang Hub": "Z-139",
  "Danau Seluluk Hub": "Z-140",
  "Danau Seluluk hub": "Z-140",
  "Hanau Hub": "Z-141",
  "Pangkalan Banteng 2 Hub": "Z-142",
  "Pangkalan Banteng Hub": "Z-143",
  "Pangkalan Lada Hub": "Z-144",
  "Arut Selatan Hub": "Z-145",
  "Arut Selatan 3 Hub": "Z-146",
  "Kumai Hub": "Z-147",
  "Nengah Bulik Hub": "Z-148",
  "Bulik Hub": "Z-149",
  "Balai Riam Hub": "Z-150",
  "Balai Riam 2 Hub": "Z-151",
  "Kotawaringin Lama 2 Hub": "Z-152",
  "Sukamara Hub": "Z-153",
  "Kotawaringin Lama Hub": "Z-154"
};
function getSortCode(receiverName) {
  return hubSortCodeMap[receiverName] || '-';
}

function normalizeHubName(str) {
  return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function packerNameHtml(raw) {
  const m = String(raw).match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!m) return '<span class="font-bold text-slate-900 dark:text-slate-100">' + escapeHtml(raw) + '</span>';
  return '<span class="font-bold text-slate-900 dark:text-slate-100">' + escapeHtml(m[2] || m[1]) + '</span>' +
    '<span class="font-mono text-[10px] text-slate-400 dark:text-slate-500 ml-2">' + escapeHtml(m[1]) + '</span>';
}

function togglePackerShowAll() {
  packerShowAll = !packerShowAll;
  renderPackerLeaderboard();
}

function updatePackerShowMoreBar(total, shown) {
  const bar = document.getElementById('packerShowMoreBar');
  const wrap = document.getElementById('packerTableWrap');
  if (!bar || !wrap) return;
  if (total <= PACKER_TOP_N) {
    bar.classList.add('hidden');
    wrap.classList.remove('packer-scroll');
    return;
  }
  bar.classList.remove('hidden');
  const extra = Math.max(shown - PACKER_TOP_N, 0);
  const info = packerShowAll
    ? t('ob.packer.viewAll', { total: total })
    : (extra > 0 ? t('ob.packer.viewTopCritical', { n: PACKER_TOP_N, x: extra, total: total })
                 : t('ob.packer.viewTop', { n: PACKER_TOP_N, total: total }));
  document.getElementById('packerShowMoreInfo').innerText = info;
  document.getElementById('packerShowMoreBtn').innerText = packerShowAll ? t('ob.packer.btnLess') : t('ob.packer.btnAll', { total: total });
  wrap.classList.toggle('packer-scroll', packerShowAll);
}

function renderPackerLeaderboard() {
  const packerMap = {};
  const backlogMap = {};
  let totalParcelsTracked = 0;
  let totalBacklogD2 = 0;

  filteredData.forEach(item => {
    const packer = item.lastPacker && item.lastPacker !== '-' ? item.lastPacker : t('ob.packer.unassigned');
    if (!packerMap[packer]) {
      packerMap[packer] = {
        name: packer,
        total: 0,
        d0: 0,
        d1: 0,
        d2: 0,
        d3: 0,
        d4: 0,
        d5: 0,
        d6: 0,
        criticalD6: 0
      };
    }
    packerMap[packer].total++;
    totalParcelsTracked++;

    if (item.agingDays === 0) packerMap[packer].d0++;
    else if (item.agingDays === 1) packerMap[packer].d1++;
    else if (item.agingDays === 2) packerMap[packer].d2++;
    else if (item.agingDays === 3) packerMap[packer].d3++;
    else if (item.agingDays === 4) packerMap[packer].d4++;
    else if (item.agingDays === 5) packerMap[packer].d5++;
    else if (item.agingDays === 6) packerMap[packer].d6++;
    
    if (item.agingDays > 4) packerMap[packer].criticalD6++;

    if (item.agingDays >= 2) {
      if (!backlogMap[packer]) backlogMap[packer] = { name: packer, total: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, criticalD6: 0 };
      const bp = backlogMap[packer];
      bp.total++; totalBacklogD2++;
      if (item.agingDays === 2) bp.d2++;
      else if (item.agingDays === 3) bp.d3++;
      else if (item.agingDays === 4) bp.d4++;
      else if (item.agingDays === 5) bp.d5++;
      else bp.d6++;                 // D-6 ke atas digabung
      if (item.agingDays > 4) bp.criticalD6++;
    }
  });

  const sortedPackers = Object.values(packerMap).sort((a, b) => b.total - a.total);
  const totalPackersCount = sortedPackers.length;

  document.getElementById('kpiTotalPackers').innerText = t('ob.packer.operatorUnit', { n: totalPackersCount });

  if (sortedPackers.length > 0) {
    document.getElementById('kpiTopPackerName').innerText = `${sortedPackers[0].name.replace(/^\[[^\]]*\]\s*/, '')} (${sortedPackers[0].total.toLocaleString('id-ID')})`;
    document.getElementById('kpiTopPackerName').title = sortedPackers[0].name;
    const avg = Math.round(totalParcelsTracked / totalPackersCount);
    document.getElementById('kpiAvgPackerOutput').innerText = t('ob.packer.parcelUnit', { n: avg.toLocaleString('id-ID') });
  } else {
    document.getElementById('kpiTopPackerName').innerText = '-';
    document.getElementById('kpiAvgPackerOutput').innerText = t('ob.packer.parcelUnit', { n: 0 });
  }

  const criticalPackers = sortedPackers.filter(p => p.criticalD6 > 0).length;
  document.getElementById('kpiCriticalPackerCount').innerText = t('ob.packer.operatorUnit', { n: criticalPackers });

  const tablePackers = Object.values(backlogMap).sort((a, b) => b.total - a.total);
  const maxPackerQty = tablePackers.length > 0 ? tablePackers[0].total : 1;
  const container = document.getElementById('packerTableBody');

  const totalCriticalD6All = tablePackers.reduce((sum, p) => sum + p.criticalD6, 0);
  const rootCauseBox = document.getElementById('packerRootCauseCallout');
  const rootCauseText = document.getElementById('packerRootCauseText');

  if (sortedPackers.length === 0) {
    container.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-slate-400 dark:text-slate-500 font-sans">Belum ada data packer. Silakan import file Excel.</td></tr>`;
    rootCauseBox.classList.add('hidden');
    return;
  }

  if (tablePackers.length === 0) {
    container.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-slate-400 dark:text-slate-500 font-sans">${t('ob.packer.emptyBacklog')}</td></tr>`;
    rootCauseBox.classList.add('hidden');
    updatePackerShowMoreBar(0, 0);
    return;
  }

  if (totalCriticalD6All > 0) {
    const topContributor = [...tablePackers].sort((a, b) => b.criticalD6 - a.criticalD6)[0];
    const contribPct = ((topContributor.criticalD6 / totalCriticalD6All) * 100).toFixed(1);
    rootCauseText.innerText = `Root Cause: ${topContributor.name} menyumbang ${topContributor.criticalD6.toLocaleString('id-ID')} parcel (${contribPct}%) dari total ${totalCriticalD6All.toLocaleString('id-ID')} backlog kritis (>D4) DC ini — prioritaskan follow up ke operator ini.`;
    rootCauseBox.classList.remove('hidden');
  } else {
    rootCauseBox.classList.add('hidden');
  }

  const rankedPackers = tablePackers.map((p, idx) => ({ p, idx }));
  const visiblePackers = packerShowAll ? rankedPackers : rankedPackers.filter(r => r.idx < PACKER_TOP_N || r.p.criticalD6 > 0);
  updatePackerShowMoreBar(tablePackers.length, visiblePackers.length);
  container.innerHTML = visiblePackers.map(({ p, idx }) => {
    const sharePct = ((p.total / (totalBacklogD2 || 1)) * 100).toFixed(1);
    const barWidth = Math.min(Math.round((p.total / maxPackerQty) * 100), 100);

    let rankBadge = `<span class="font-bold text-slate-500 dark:text-slate-400">${idx + 1}</span>`;
    if (idx === 0) rankBadge = `<span class="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-sm"><i class="fa-solid fa-crown text-[9px]"></i></span>`;
    else if (idx === 1) rankBadge = `<span class="w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-black text-[10px] flex items-center justify-center shadow-sm">2</span>`;
    else if (idx === 2) rankBadge = `<span class="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shadow-sm">3</span>`;

    const safeName = p.name.replace(/'/g, "\\'");
    const tdClickP = (val, type) => val > 0 ? `class="text-center font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 underline text-slate-600 dark:text-slate-300 transition"` : `class="text-center text-slate-400 dark:text-slate-600 font-normal"`;
    const fnClickP = (val, type) => val > 0 ? `onclick="showPackerTONumbers('${safeName}', '${type}')"` : '';

    return `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
      <td class="text-center flex justify-center items-center py-1.5">${rankBadge}</td>
      <td class="font-sans text-left pl-3">${packerNameHtml(p.name)}</td>
      <td class="text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20">${p.total.toLocaleString('id-ID')}</td>
      <td ${tdClickP(p.d2, 'd2')} ${fnClickP(p.d2, 'd2')}>${nz(p.d2)}</td>
      <td ${tdClickP(p.d3, 'd3')} ${fnClickP(p.d3, 'd3')}>${nz(p.d3)}</td>
      <td ${tdClickP(p.d4, 'd4')} ${fnClickP(p.d4, 'd4')}>${nz(p.d4)}</td>
      <td ${tdClickP(p.d5, 'd5')} ${fnClickP(p.d5, 'd5')}>${nz(p.d5)}</td>
      <td ${tdClickP(p.d6, 'd6')} ${fnClickP(p.d6, 'd6')}>${nz(p.d6)}</td>
      <td class="text-center font-bold ${p.criticalD6 > 0 ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 font-black cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900 underline' : 'text-slate-400 dark:text-slate-600'}" ${p.criticalD6 > 0 ? `onclick="showPackerTONumbers('${safeName}', 'dMore')"` : ''}>${nz(p.criticalD6)}</td>
      <td class="text-left pl-2 pr-2">
        ${(() => {
          const contribPct = totalCriticalD6All > 0 ? ((p.criticalD6 / totalCriticalD6All) * 100) : 0;
          const barWidthContrib = Math.min(Math.round(contribPct), 100);
          if (p.criticalD6 === 0) return `<span class="text-[10px] text-slate-400 dark:text-slate-600">-</span>`;
          return `<div class="flex items-center gap-2">
            <div class="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div class="bg-rose-500 h-full rounded-full transition-all duration-300" style="width: ${barWidthContrib}%"></div>
            </div>
            <span class="text-[10px] font-bold text-rose-600 dark:text-rose-400 w-10 text-right">${contribPct.toFixed(1)}%</span>
          </div>`;
        })()}
      </td>
      <td class="text-left pl-2 pr-3">
        <div class="flex items-center gap-2">
          <div class="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div class="bg-amber-500 h-full rounded-full transition-all duration-300" style="width: ${barWidth}%"></div>
          </div>
          <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-10 text-right">${sharePct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

