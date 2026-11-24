/**
 * assets/js/inventory-control/firebase-sync.js — Sinkronisasi Firebase Inventory Control
 * Bagian 3/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= FIREBASE SYNC =================
  // SOC & EHA sekarang 1 menu gabungan — semua data disimpen di 1 cabang Firebase
  // (inventoryControl/SOC/stock & /usageLogs), pembeda SOC/EHA cuma di field
  // "devisi" tiap Log Activity Usage (otomatis dari email yang input).
  function initInventoryFirebaseSync() {
    if (fbDb) return; // udah pernah init
    try {
      fbDb = firebase.database();
    } catch (e) {
      console.error('Gagal connect Firebase Database:', e);
      return;
    }

    FACILITIES.forEach(function (facility) {
      fbDb.ref(FB_ROOT + '/' + facility + '/stock').on('value', function (snap) {
        stockDataByFacility[facility] = snap.val() || {};
        if (facility === currentFacility) {
          renderStockTable();
          renderAssetMasterTable();
          populateAssetSelect();
          renderUsageDashboard();
          renderLowStockBanner();
        }
      });

      fbDb.ref(FB_ROOT + '/' + facility + '/usageLogs').limitToLast(500).on('value', function (snap) {
        usageLogsDataByFacility[facility] = snap.val() || {};
        if (facility === currentFacility) renderUsageDashboard();
      });

      fbDb.ref(FB_ROOT + '/' + facility + '/assetMaster').on('value', function (snap) {
        assetMasterByFacility[facility] = snap.val() || {};
        if (facility === currentFacility) {
          renderAssetMasterTable();
          populateAssetNameSelect();
        }
      });

      fbDb.ref(FB_ROOT + '/' + facility + '/auditLog').limitToLast(300).on('value', function (snap) {
        auditLogByFacility[facility] = snap.val() || {};
        if (facility === currentFacility) renderAuditLogTable();
      });
    });
  }

