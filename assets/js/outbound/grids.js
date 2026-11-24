/**
 * assets/js/outbound/grids.js — Grid (search, sort, paging), export Excel, alert route
 * Bagian 13/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

function onGridSearchInput(val) {
  gridSearchTerm = val;
  gridCurrentPage = 1;
  renderGrids();
}

function onGridPageSizeChange(val) {
  gridPageSize = val === 'all' ? 'all' : parseInt(val, 10);
  gridCurrentPage = 1;
  renderGrids();
}

function changeGridPage(delta) {
  gridCurrentPage += delta;
  renderGrids();
}

function setGridSort(field) {
  if (gridSortField === field) {
    gridSortDir = gridSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    gridSortField = field;
    gridSortDir = (field === 'name' || field === 'sortcode') ? 'asc' : 'desc';
  }
  gridCurrentPage = 1;
  renderGrids();
}

function updateGridSortIcons() {
  document.querySelectorAll('[data-sort-field]').forEach(th => {
    const icon = th.querySelector('i');
    if (!icon) return;
    if (th.dataset.sortField === gridSortField) {
      icon.className = `fa-solid ${gridSortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} ml-1 text-[9px]`;
    } else {
      icon.className = 'fa-solid fa-sort ml-1 opacity-40 text-[8px]';
    }
  });
}

function renderGrids() {
  const isDark = currentTheme === 'dark';
  const globalMaxQty = lastSortedReceivers.length > 0 ? lastSortedReceivers[0].total : 1;

  const term = gridSearchTerm.trim().toLowerCase();
  let data = term
    ? lastSortedReceivers.filter(row =>
        row.name.toLowerCase().includes(term) || getSortCode(row.name).toLowerCase().includes(term))
    : lastSortedReceivers.slice();

  data.sort((a, b) => {
    let va, vb;
    if (gridSortField === 'sortcode') { va = getSortCode(a.name); vb = getSortCode(b.name); }
    else if (gridSortField === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
    else { va = a[gridSortField]; vb = b[gridSortField]; }

    if (va < vb) return gridSortDir === 'asc' ? -1 : 1;
    if (va > vb) return gridSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalFiltered = data.length;
  const pageSize = gridPageSize === 'all' ? Math.max(totalFiltered, 1) : gridPageSize;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  if (gridCurrentPage > totalPages) gridCurrentPage = totalPages;
  if (gridCurrentPage < 1) gridCurrentPage = 1;
  const startIdx = (gridCurrentPage - 1) * pageSize;
  const pageData = data.slice(startIdx, startIdx + pageSize);

  const halfSplit = Math.ceil(pageData.length / 2);
  const grid1Data = pageData.slice(0, halfSplit);
  const grid2Data = pageData.slice(halfSplit);

  const makeTable = rows => rows.map(row => {
    const tdClick = (val, type) => val > 0 ? `class="text-center font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 underline text-slate-800 dark:text-slate-200 transition px-0.5"` : `class="text-center text-slate-400 dark:text-slate-600 font-normal px-0.5"`;
    const fnClick = (val, type) => val > 0 ? `onclick="showTONumbers('${row.name.replace(/'/g, "\\'")}', '${type}')"` : '';

    let bgRowClass = isDark ? 'bg-slate-900' : 'bg-white';
    if (row.total === globalMaxQty) bgRowClass = isDark ? 'bg-orange-950/50 font-bold' : 'bg-orange-50 font-bold';
    else if (row.total > globalMaxQty * 0.6) bgRowClass = isDark ? 'bg-orange-900/20' : 'bg-orange-50/50';

    return `
    <tr class="${bgRowClass} hover:bg-slate-100 dark:hover:bg-slate-800/80 transition">
      <td class="!text-center font-mono text-slate-500 dark:text-slate-400">${getSortCode(row.name)}</td>
      <td class="text-center">${statusBadgeHtml(row)}</td>
      <td class="font-sans font-semibold text-slate-900 dark:text-slate-100 text-left">${row.name}</td>
      <td class="text-center font-bold text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30">${nz(row.hv)}</td>
      <td class="text-center text-sky-600 dark:text-sky-400">${nz(row.liquid)}</td>
      <td class="text-center font-bold text-slate-800 dark:text-slate-200">${nz(row.individual)}</td>
      <td class="text-center font-bold text-slate-800 dark:text-slate-200">${nz(row.assisted)}</td>
      <td class="text-center bg-orange-50 dark:bg-orange-950/50 font-bold text-shopee dark:text-orange-400">${row.total}</td>
      <td ${tdClick(row.d0, 'd0')} ${fnClick(row.d0, 'd0')}>${nz(row.d0)}</td>
      <td ${tdClick(row.d1, 'd1')} ${fnClick(row.d1, 'd1')}>${nz(row.d1)}</td>
      <td ${tdClick(row.d2, 'd2')} ${fnClick(row.d2, 'd2')}>${nz(row.d2)}</td>
      <td ${tdClick(row.d3, 'd3')} ${fnClick(row.d3, 'd3')}>${nz(row.d3)}</td>
      <td ${tdClick(row.d4, 'd4')} ${fnClick(row.d4, 'd4')}>${nz(row.d4)}</td>
      <td ${tdClick(row.d5, 'd5')} ${fnClick(row.d5, 'd5')}>${nz(row.d5)}</td>
    </tr>`;
  }).join('');

  const emptyRow = `<tr><td colspan="14" class="text-center py-6 text-slate-400 dark:text-slate-500 font-sans">${term ? t('ob.emptyNoMatch') : t('ob.emptyImportNew')}</td></tr>`;

  document.getElementById('grid1TableBody').innerHTML = grid1Data.length ? makeTable(grid1Data) : emptyRow;
  document.getElementById('grid2TableBody').innerHTML = grid2Data.length ? makeTable(grid2Data) : emptyRow;

  document.getElementById('gridPageInfo').innerText = t('ob.grid.pageShort', { p: gridCurrentPage, t: totalPages, n: totalFiltered.toLocaleString('id-ID') });
  document.getElementById('gridPrevBtn').disabled = gridCurrentPage <= 1;
  document.getElementById('gridNextBtn').disabled = gridCurrentPage >= totalPages;

  updateGridSortIcons();
}

function exportGridToExcel() {
  if (!lastSortedReceivers.length) {
    showToast('Belum ada data untuk di-export. Import data dulu ya.', 'info');
    return;
  }

  const term = gridSearchTerm.trim().toLowerCase();
  const data = term
    ? lastSortedReceivers.filter(row =>
        row.name.toLowerCase().includes(term) || getSortCode(row.name).toLowerCase().includes(term))
    : lastSortedReceivers.slice();

  data.sort((a, b) => {
    let va, vb;
    if (gridSortField === 'sortcode') { va = getSortCode(a.name); vb = getSortCode(b.name); }
    else if (gridSortField === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
    else { va = a[gridSortField]; vb = b[gridSortField]; }
    if (va < vb) return gridSortDir === 'asc' ? -1 : 1;
    if (va > vb) return gridSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const exportRows = data.map(row => ({
    'Sort Code': getSortCode(row.name),
    'Status': getAgingStatus(row).label,
    'Receiver Name': row.name,
    'HV': row.hv,
    'Liquid': row.liquid,
    'Bulky': row.individual,
    'Non-Bulky': row.assisted,
    'Total Parcel': row.total,
    'D-Day': row.d0,
    'D-1': row.d1,
    'D-2': row.d2,
    'D-3': row.d3,
    'D-4': row.d4,
    'D-5+': row.d5
  }));

  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Aging Grid');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  XLSX.writeFile(wb, `Aging_Grid_Export_${stamp}.xlsx`);
}

function getRouteAlert(pct) {
  if (pct > 150) return { level: 'CRITICAL', text: 'Need Early Load + Slot Tambahan (Follow Up Team MM)', badge: 'bg-rose-600 text-white', bar: 'bg-rose-600', icon: 'fa-solid fa-fire', ring: 'border-rose-300 dark:border-rose-800/70' };
  if (pct > 100) return { level: 'URGENT', text: 'Need Early Loading Segera (Follow Up Team MM)', badge: 'bg-rose-500 text-white', bar: 'bg-rose-500', icon: 'fa-solid fa-triangle-exclamation', ring: 'border-rose-200 dark:border-rose-800/70' };
  if (pct > 50) return { level: 'WATCH', text: 'Need Early Loading (Follow Up Team MM)', badge: 'bg-amber-400 text-slate-950', bar: 'bg-amber-400', icon: 'fa-solid fa-clock', ring: 'border-amber-200 dark:border-amber-800/70' };
  return { level: 'AMAN', text: 'Kondisi Normal, Belum Perlu Tindakan', badge: 'bg-emerald-500 text-white', bar: 'bg-emerald-500', icon: 'fa-solid fa-circle-check', ring: 'border-emerald-200 dark:border-emerald-800/70' };
}

