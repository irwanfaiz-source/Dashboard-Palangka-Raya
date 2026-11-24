/**
 * assets/js/inventory-control/state-and-devisi.js — State, konfigurasi Firebase, helper data per Facility, deteksi Devisi
 * Bagian 1/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= STATE & FIREBASE =================
  const FB_ROOT = "inventoryControl"; // root data khusus Inventory Control, project Firebase sama kayak modul lain
  const FACILITIES = ["SOC"]; // SOC & EHA udah digabung jadi 1 menu — "SOC" cuma nama path Firebase internal (inventoryControl/SOC/...), gak ditampilin ke user lagi
  let fbDb = null;
  // Data sekarang kepisah per Facility. Data lama (root inventoryControl/stock & /usageLogs,
  // sebelum ada Facility) SENGAJA nggak dipindah/dibaca lagi di sini — diarsipkan begitu aja,
  // jadi SOC & EHA mulai dari kosong.
  let stockDataByFacility = { SOC: {} };     // { SOC: { assetId: {name, category, unit, qty, minStock, note, updatedAt, updatedBy} } }
  let usageLogsDataByFacility = { SOC: {} }; // { SOC: { logId: {assetId, assetName, unit, qtyUsed, workingDate, devisi, createdAt, createdBy} } }
  let assetItNcaByFacility = { SOC: {} };    // { SOC: { itemId: {name, jenis(IT/NCA), category, serial, pic, lokasi, status, note, photoData, updatedAt, updatedBy} } }
  let auditLogByFacility = { SOC: {} };       // { SOC: { logId: {module, action, itemName, detail, changedAt, changedBy} } }
  let assetMasterByFacility = { SOC: {} };   // { SOC: { masterId: {name, category, unit, createdAt, createdBy, updatedAt, updatedBy} } } — Master Nama Asset
  let lowStockBannerDismissed = false;        // ditutup manual, balik muncul lagi kalau pindah tab/reload
  let auditLogFilterQuery = '';
  let auditLogFilterModule = '';
  let assetItNcaFilterQuery = '';
  let assetItNcaFilterJenis = '';
  let dashboardDevisiFilter = ''; // filter breakdown '' (Semua) / 'SOC' / 'EHA' khusus di Highlight Usage
  let dailyUsageChart = null;
  let monthlyTrendChart = null;
  // Cache data render terakhir, dipakai pas export ke Excel biar gak hitung ulang
  let lastReportData = { topAsset: [], dailyChart: { rows: [], start: '', end: '' }, monthlyTrend: [], lowStock: [] };
  let dailyUsageStartDate = null; // 'YYYY-MM-DD', diisi pas init
  let dailyUsageEndDate = null;   // 'YYYY-MM-DD', diisi pas init
  let currentFacility = "SOC";
  let currentInvSubmenu = "usage";

  function getStockData() { return stockDataByFacility[currentFacility] || {}; }
  function getAssetItNcaData() { return assetItNcaByFacility[currentFacility] || {}; }
  function getLogsArr(facility) {
    const data = usageLogsDataByFacility[facility] || {};
    return Object.keys(data).map(function (id) { return Object.assign({ _key: id }, data[id]); });
  }

  // ===== Devisi otomatis (SOC / EHA) berdasarkan email yang lagi login =====
  // Email di bawah ini dianggap Devisi EHA. Selain email ini, otomatis masuk Devisi SOC.
  const EHA_EMAILS = [
    "yoga.parera@spxexpress.com",
    "yuyun.lestari@spx-external.com",
    "ugbm_ismu.al-washit@spx-external.com",
    "rahman.ra@spx-external.com",
    "febrio.febrio@spx-external.com",
    "ramadhani@spx-external.com",
    "septhia.arifiani@spx-external.com"
  ];
  function getDevisiForEmail(email) {
    const e = (email || '').trim().toLowerCase();
    return EHA_EMAILS.indexOf(e) !== -1 ? 'EHA' : 'SOC';
  }
  function getCurrentUserDevisi() { return getDevisiForEmail(window.__authUserEmail); }

  // Nama lengkap Devisi buat ditampilin ke user — kode SOC/EHA tetep dipakai apa
  // adanya di data (Firebase, filter, dsb), cuma yang ditampilin ke layar full name-nya.
  function getDevisiLabel(code) { return code === 'EHA' ? t('inv.dash.ehaLabel') : t('inv.dash.socLabel'); }

  // Devisi (SOC/EHA) cuma buat breakdown laporan — gak butuh field tambahan apapun
  // di form input, karena siapa yang input udah otomatis kecatet di "Diinput Oleh".
  function updateUsageFormVisibility() {
    const devisi = getCurrentUserDevisi();
    document.getElementById('devisiFormBadge').innerText = getDevisiLabel(devisi);
    document.getElementById('usageLogTableHead').innerHTML =
      '<th>' + t('inv.th.date') + '</th><th>' + t('inv.th.asset') + '</th><th>' + t('inv.th.qty') + '</th><th>' + t('inv.th.division') + '</th><th>' + t('inv.th.inputBy') + '</th><th>' + t('inv.th.action') + '</th>';
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

