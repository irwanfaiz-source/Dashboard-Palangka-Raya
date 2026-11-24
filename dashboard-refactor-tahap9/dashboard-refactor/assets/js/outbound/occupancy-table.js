/**
 * assets/js/outbound/occupancy-table.js — Next Slot/Depart dan tabel Occupancy Inner Island
 * Bagian 7/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

/* ===== Next Slot & Next Depart (tabel Occupancy Inner Island) =====
   Data dari Schedule Outbound (window.schedNextDeparture), acuan jam = jam lokal device. */
function updateNextDepartCells() {
  const fn = window.schedNextDeparture;
  function info(label) {
    const route = linehaulRoutes.find(function (r) { return r.label === label; });
    const nx = (fn && route) ? fn(label, route.hubs) : null;
    if (!nx) return null;
    const h = Math.floor(nx.mins / 60), m = nx.mins % 60;
    return {
      nx: nx,
      cd: h > 0 ? (h + 'j ' + m + 'm') : (m + 'm'),
      urgent: nx.off === 0 && nx.mins <= 30,
      soon: nx.off === 0 && nx.mins <= 60,
      dayPrefix: nx.off === 1 ? 'Besok · ' : nx.off > 1 ? '+' + nx.off + ' hari · ' : ''
    };
  }
  document.querySelectorAll('#routeTableBody td[data-nd-slot]').forEach(function (slotTd) {
    const tr = slotTd.parentElement;
    const depTd = tr.querySelector('td[data-nd-dep]');
    if (!depTd) return;
    const d = info(slotTd.dataset.ndRoute);
    if (!d) {
      slotTd.textContent = '-'; slotTd.className = 'text-center font-bold text-slate-400 dark:text-slate-600';
      depTd.textContent = '-'; depTd.className = 'text-center font-bold text-slate-400 dark:text-slate-600';
      tr.dataset.depKey = ''; tr.dataset.depSoon = '0';
      return;
    }
    const cls = d.urgent ? 'text-rose-600 dark:text-rose-400' : d.soon ? 'text-amber-600 dark:text-amber-400' : 'text-sky-700 dark:text-sky-300';
    const isGH = /golden/i.test(d.nx.cot || '');
    slotTd.className = 'text-center font-bold text-amber-600 dark:text-amber-400';
    slotTd.innerHTML = '<span class="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"><span class="text-[15px] font-extrabold">' + escapeHtml(d.nx.slot || '-') + '</span>' + (isGH ? '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-sans font-bold text-[9px] leading-none whitespace-nowrap bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" title="COT: Golden Hours (masuk KPI)"><i class="fa-solid fa-star text-[8px]"></i>Golden Hours</span>' : '') + '</span>';
    depTd.className = 'text-center font-bold whitespace-nowrap ' + cls;
    const cdCls = d.urgent ? 'text-rose-600 dark:text-rose-400' : d.soon ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200';
    depTd.innerHTML = '<span class="text-[14px] font-extrabold">' + d.nx.etd + '</span> <span class="text-[12px] font-sans font-bold ' + cdCls + '">· ' + d.dayPrefix + d.cd + '</span>';
    tr.dataset.depKey = String(d.nx.mins);
    tr.dataset.depSoon = d.soon ? '1' : '0';
  });
  document.querySelectorAll('#topActionPlanContainer [data-nd-card]').forEach(function (el) {
    const d = info(el.dataset.ndCard);
    if (!d) { el.className = 'occ-mini'; el.innerHTML = '<i class="fa-regular fa-clock"></i>Next Depart <b>-</b>'; return; }
    el.className = 'occ-mini ' + (d.urgent ? 'occ-mini-bad' : d.soon ? 'occ-mini-warn' : 'occ-mini-info');
    el.innerHTML = '<i class="fa-regular fa-clock"></i>' + (/golden/i.test(d.nx.cot || '') ? '<i class="fa-solid fa-star text-amber-500" title="Golden Hours"></i>' : '') + (d.nx.slot ? d.nx.slot + ' · ' : '') + d.nx.etd + ' <b>' + d.dayPrefix + d.cd + '</b>';
  });
  if (typeof applyRouteTableView === 'function') applyRouteTableView();
}

/* ===== Tabel Occupancy Inner Island: filter, sort, pencarian ===== */
var occFilter = 'all', occSort = 'total', occQuery = '';

// "Palangka Raya DC > A Hub - B Hub - C Hub"  ->  "A Hub › B Hub › C Hub" (prefix origin dibuang, label asli tetap ada di tooltip)
function occRouteChainHtml(label) {
  const short = String(label).replace(/^\s*Palangka Raya DC\s*>\s*/i, '');
  return short.split(/\s+-\s+/).map(function (h) { return escapeHtml(h); }).join('<span class="occ-arrow">›</span>');
}

function applyRouteTableView() {
  const tb = document.getElementById('routeTableBody');
  if (!tb) return;
  tb.querySelectorAll('tr.occ-empty-row').forEach(function (e) { e.remove(); });
  const rows = Array.from(tb.querySelectorAll('tr[data-occ-row]'));
  if (rows.length === 0) return;

  const flt = occFilter || 'all', srt = occSort || 'total', q = (occQuery || '').trim().toLowerCase();
  const n = function (r, k) { return parseFloat(r.dataset[k]) || 0; };
  const tests = {
    all: function () { return true; },
    busy: function (r) { return n(r, 'pct') > 50; },
    hv: function (r) { return n(r, 'hv') > 0; },
    aging: function (r) { return n(r, 'old') > 0; },
    soon: function (r) { return r.dataset.depSoon === '1'; }
  };
  const searchOk = function (r) { return !q || (r.dataset.name || '').indexOf(q) !== -1; };

  Object.keys(tests).forEach(function (k) {
    const el = document.querySelector('[data-occ-count="' + k + '"]');
    if (el) el.textContent = rows.filter(function (r) { return searchOk(r) && tests[k](r); }).length;
  });
  document.querySelectorAll('[data-occ-filter]').forEach(function (b) {
    b.classList.toggle('active', b.dataset.occFilter === flt);
  });
  const sel = document.getElementById('occSort');
  if (sel && sel.value !== srt) sel.value = srt;

  const depVal = function (r) { const v = parseFloat(r.dataset.depKey); return isNaN(v) ? Infinity : v; };
  const byTotal = function (a, b) { return n(b, 'total') - n(a, 'total'); };
  const cmps = {
    total: byTotal,
    depart: function (a, b) { return (depVal(a) - depVal(b)) || byTotal(a, b); },
    hv: function (a, b) { return (n(b, 'hv') - n(a, 'hv')) || byTotal(a, b); },
    aging: function (a, b) { return (n(b, 'old') - n(a, 'old')) || byTotal(a, b); },
    name: function (a, b) { return (a.dataset.name || '').localeCompare(b.dataset.name || ''); }
  };
  const sorted = rows.slice().sort(cmps[srt] || cmps.total);
  if (sorted.some(function (r, i) { return r !== rows[i]; })) sorted.forEach(function (r) { tb.appendChild(r); });

  let vis = 0;
  sorted.forEach(function (r) {
    const show = searchOk(r) && tests[flt](r);
    r.style.display = show ? '' : 'none';
    if (show) { vis++; r.classList.toggle('occ-zebra', vis % 2 === 0); if (r.cells[0]) r.cells[0].textContent = vis; }
  });
  if (vis === 0) {
    tb.insertAdjacentHTML('beforeend', '<tr class="occ-empty-row"><td colspan="16" style="text-align:center" class="py-6 text-slate-400 dark:text-slate-500 font-sans">' + t('ob.occ.noMatch') + '</td></tr>');
  }
  const info = document.getElementById('routeTotalInfo');
  if (info) info.textContent = vis === rows.length ? t('ob.occ.totalRoutes', { n: rows.length }) : t('ob.occ.showing', { v: vis, n: rows.length });
}
window.applyRouteTableView = applyRouteTableView;

(function () {
  const si = document.getElementById('occSearch');
  if (si) si.addEventListener('input', function () { occQuery = si.value; applyRouteTableView(); });
  const so = document.getElementById('occSort');
  if (so) so.addEventListener('change', function () { occSort = so.value; applyRouteTableView(); });
  document.querySelectorAll('[data-occ-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      const v = b.dataset.occFilter;
      occFilter = (occFilter === v && v !== 'all') ? 'all' : v;
      applyRouteTableView();
    });
  });
})();
window.updateNextDepartCells = updateNextDepartCells;
setInterval(updateNextDepartCells, 30 * 1000);

