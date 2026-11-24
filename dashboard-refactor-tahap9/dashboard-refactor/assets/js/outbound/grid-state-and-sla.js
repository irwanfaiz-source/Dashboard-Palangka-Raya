/**
 * assets/js/outbound/grid-state-and-sla.js — State grid/chart, kapasitas, target SLA, badge Occupancy & Aging
 * Bagian 4/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

let lastSortedReceivers = [];
let gridSearchTerm = '';
let gridSortField = 'total';
let gridSortDir = 'desc';
let gridPageSize = 100;
let gridCurrentPage = 1;
let currentSubmenu = 'aging';
let currentShiftFilter = 'ALL';
let packerShowAll = false;
const PACKER_TOP_N = 10;

let agingDistributionChartInstance = null;
let shiftVolumeChartInstance = null;
let destAgingChartInstance = null;
let dcTrendChartInstance = null;

const LS_CAPACITY_KEY = 'pkr_outbound_dest_capacity';
const LS_HISTORY_KEY = 'pkr_outbound_history_snapshots';
const MAX_HISTORY_SNAPSHOTS = 30;
const OCC_WARN_PCT = 70;
const OCC_CRIT_PCT = 100;
const INNER_ROUTE_CAPACITY = 4000; // kapasitas per rute Inner Island (dipakai tabel & Priority Action Center)

let DESTINATION_CAPACITY = parseInt(localStorage.getItem(LS_CAPACITY_KEY), 10) || 2000;

const LS_MAX_STAGING_KEY = 'pkr_outbound_max_staging_capacity';
let MAX_STAGING_CAPACITY = parseInt(localStorage.getItem(LS_MAX_STAGING_KEY), 10) || 85000;

function setMaxStagingCapacity(val) {
  const num = parseInt(val, 10);
  if (isNaN(num) || num <= 0) return;
  MAX_STAGING_CAPACITY = num;
  localStorage.setItem(LS_MAX_STAGING_KEY, String(num));
  if (filteredData.length > 0) renderDashboard();
}

const LS_SLA_OCC_KEY = 'pkr_outbound_sla_occ';
const LS_SLA_AGING_KEY = 'pkr_outbound_sla_aging';
const LS_SLA_ONTIME_KEY = 'pkr_outbound_sla_ontime';
let SLA_OCC_TARGET = parseFloat(localStorage.getItem(LS_SLA_OCC_KEY)) || 85;
let SLA_AGING_TARGET = parseFloat(localStorage.getItem(LS_SLA_AGING_KEY)) || 5;
let SLA_ONTIME_TARGET = parseFloat(localStorage.getItem(LS_SLA_ONTIME_KEY)) || 90;

function setSLATarget(type, val) {
  const num = parseFloat(val);
  if (isNaN(num) || num < 0) return;
  if (type === 'occ') { SLA_OCC_TARGET = num; localStorage.setItem(LS_SLA_OCC_KEY, String(num)); }
  else if (type === 'aging') { SLA_AGING_TARGET = num; localStorage.setItem(LS_SLA_AGING_KEY, String(num)); }
  else if (type === 'ontime') { SLA_ONTIME_TARGET = num; localStorage.setItem(LS_SLA_ONTIME_KEY, String(num)); }
  if (filteredData.length > 0) renderDashboard();
}

function getOccupancyPct(total) {
  return DESTINATION_CAPACITY > 0 ? (total / DESTINATION_CAPACITY) * 100 : 0;
}

function getOccupancyLevel(pct) {
  if (pct >= OCC_CRIT_PCT) return 'critical';
  if (pct >= OCC_WARN_PCT) return 'warn';
  return 'safe';
}

function occupancyBadgeHtml(pct) {
  const level = getOccupancyLevel(pct);
  if (level === 'safe') return '';
  const cls = level === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-400 text-slate-950';
  const icon = level === 'critical' ? 'fa-solid fa-triangle-exclamation' : 'fa-regular fa-clock';
  const label = level === 'critical' ? t('ob.badge.penuh') : t('ob.badge.warn');
  return `<span class="ml-1.5 inline-flex items-center gap-0.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full align-middle ${cls}" title="${t('ob.occ.capTitle')} — ${pct.toFixed(0)}% / ${DESTINATION_CAPACITY.toLocaleString('id-ID')} parcel"><i class="${icon}"></i>${label}</span>`;
}

function getAgingStatus(row) {
  if (row.d3 > 0 || row.d4 > 0 || row.d5 > 0) {
    return { label: 'DANGER', priority: 3, cls: 'bg-rose-600 text-white', icon: 'fa-solid fa-triangle-exclamation' };
  }
  if (row.d2 > 0) {
    return { label: 'WARNING', priority: 2, cls: 'bg-amber-400 text-slate-950', icon: 'fa-regular fa-clock' };
  }
  return { label: 'GOOD', priority: 1, cls: 'bg-emerald-500 text-white', icon: 'fa-solid fa-circle-check' };
}

function agingStatusDisplayLabel(label) {
  if (label === 'DANGER') return t('ob.agingStatus.danger');
  if (label === 'WARNING') return t('ob.agingStatus.warning');
  return t('ob.agingStatus.good');
}

function statusBadgeHtml(row) {
  const st = getAgingStatus(row);
  if (st.label === 'GOOD') {
    return `<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-circle" style="font-size:6px"></i>${agingStatusDisplayLabel(st.label)}</span>`;
  }
  return `<span class="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${st.cls}"><i class="${st.icon}"></i>${agingStatusDisplayLabel(st.label)}</span>`;
}

function setDestinationCapacity(val) {
  const num = parseInt(val, 10);
  if (isNaN(num) || num <= 0) return;
  DESTINATION_CAPACITY = num;
  localStorage.setItem(LS_CAPACITY_KEY, String(num));
  if (filteredData.length > 0) renderDashboard();
}

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' || event.key === 'Esc') {
    closeModal();
    closeDestModal();
    closeRouteModal();
    closeFeedbackBoard();
    const logUpdateModal = document.getElementById('logUpdateModal');
    if (logUpdateModal && !logUpdateModal.classList.contains('hidden')) closeLogUpdateModal();
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('appSidebarBackdrop');
    if (sidebar && sidebar.classList.contains('open')) sidebar.classList.remove('open');
    if (backdrop && backdrop.classList.contains('open')) backdrop.classList.remove('open');
  }

  if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
    event.preventDefault();
    focusGridSearchInput();
  }
});

function focusGridSearchInput() {

  const input = document.getElementById('gridSearchInput');
  if (input) {
    input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    input.focus();
    input.select();
  }
}

