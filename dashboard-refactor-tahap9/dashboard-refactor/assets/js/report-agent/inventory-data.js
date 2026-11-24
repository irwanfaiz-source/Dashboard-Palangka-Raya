/**
 * assets/js/report-agent/inventory-data.js — Data Inventory Control: devisi, fetch, ringkasan untuk AI
 * Bagian 6/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Devisi otomatis (SOC/EHA) modul Inventory Control — di-COPY PERSIS dari EHA_EMAILS/
// getDevisiForEmail/DEVISI_LABELS di inventory-control.html (config statis, harus disalin manual
// kalau daftar emailnya berubah, sama kayak roster Performance Bagger di atas). Dipakai sebagai
// fallback kalau ada Log Usage lama yang belum punya field "devisi" tersimpan (SAMA PERSIS fallback
// yang dipakai renderUsageDashboard() di dashboard-nya: (l.devisi || getDevisiForEmail(l.createdBy))). =====
const INV_EHA_EMAILS = [
  "yoga.parera@spxexpress.com",
  "yuyun.lestari@spx-external.com",
  "ugbm_ismu.al-washit@spx-external.com",
  "rahman.ra@spx-external.com",
  "febrio.febrio@spx-external.com",
  "ramadhani@spx-external.com",
  "septhia.arifiani@spx-external.com"
];
function invGetDevisiForEmail(email){
  const e = (email || "").trim().toLowerCase();
  return INV_EHA_EMAILS.indexOf(e) !== -1 ? "EHA" : "SOC";
}
const INV_DEVISI_LABELS = { SOC: "Sortation Center", EHA: "Exception Handling Area" };

function invTodayStrLocal(){
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Ambil data LIVE dari Firebase root "inventoryControl/SOC" — SAMA PERSIS sumber yang dipakai
// dashboard inventory-control.html (Stock semua, Log Usage 500 terakhir, Asset IT & NCA semua,
// Audit Log 300 terakhir — limit-nya disamain kayak listener di dashboard aslinya).
function fetchInventoryControlData(){
  return new Promise((resolve, reject) => {
    if (!window.firebase || !firebase.apps || !firebase.apps.length){
      reject(new Error("Firebase belum ke-init (auth-guard.js gak ketemu / belum login)"));
      return;
    }
    if (!firebase.auth().currentUser){
      reject(new Error("Belum login — buka file ini lewat app shell / login dulu"));
      return;
    }
    const db = firebase.database();
    const facilityRoot = FB_INV_ROOT + "/" + INV_FACILITY;
    Promise.all([
      db.ref(facilityRoot + "/stock").once("value"),
      db.ref(facilityRoot + "/usageLogs").limitToLast(500).once("value"),
      db.ref(facilityRoot + "/assetItNca").once("value"),
      db.ref(facilityRoot + "/auditLog").limitToLast(300).once("value")
    ]).then(function (snaps) {
      resolve({
        stock: snaps[0].val() || {},
        usageLogs: snaps[1].val() || {},
        assetItNca: snaps[2].val() || {},
        auditLog: snaps[3].val() || {}
      });
    }).catch(reject);
  });
}

// Ringkasan lengkap modul Inventory Control buat dikirim ke AI — gabungan data MENTAH (Stock, Asset
// IT & NCA, Audit Log terbaru) SUPAYA Odyssey bisa jawab pertanyaan detail apa aja, PLUS bagian
// "sudahDihitungFinal" yang angkanya udah dihitung persis sama kayak dashboard (Low Stock + estimasi
// habis & saran reorder, KPI Highlight Usage hari ini/bulan ini/delta vs bulan lalu, Top Asset
// Terpakai bulan ini, breakdown pemakaian per Devisi SOC vs EHA) — biar AI GAK ngitung ulang pakai
// cara/asumsi sendiri buat angka-angka yang emang udah final di dashboard.
function buildInventoryControlSummary(stock, usageLogsRaw, assetItNca, auditLogRaw){
  const today = invTodayStrLocal();
  const monthPrefix = today.slice(0, 7);
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = lastMonthDate.getFullYear() + "-" + String(lastMonthDate.getMonth() + 1).padStart(2, "0");

  const usageLogsArr = Object.keys(usageLogsRaw).map(function (id) { return Object.assign({ logId: id }, usageLogsRaw[id]); });

  let todayTotal = 0, monthTotal = 0, lastMonthTotal = 0;
  const monthAssetTotals = {};
  const monthDevisiTotals = { SOC: 0, EHA: 0 };
  usageLogsArr.forEach(function (log) {
    const d = log.workingDate || "";
    const q = Number(log.qtyUsed) || 0;
    if (d === today) todayTotal += q;
    if (d.slice(0, 7) === monthPrefix) {
      monthTotal += q;
      monthAssetTotals[log.assetName || "-"] = (monthAssetTotals[log.assetName || "-"] || 0) + q;
      const devisi = log.devisi || invGetDevisiForEmail(log.createdBy);
      monthDevisiTotals[devisi] = (monthDevisiTotals[devisi] || 0) + q;
    }
    if (d.slice(0, 7) === lastMonthPrefix) lastMonthTotal += q;
  });

  let monthDeltaPct = null; // null = gak ada perbandingan (dua-duanya 0)
  let monthDeltaKeterangan = "Belum ada data bulan ini maupun bulan lalu";
  if (!(lastMonthTotal === 0 && monthTotal === 0)) {
    if (lastMonthTotal === 0) {
      monthDeltaKeterangan = "Baru mulai bulan ini (bulan lalu 0)";
    } else {
      monthDeltaPct = Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100);
      monthDeltaKeterangan = (monthDeltaPct >= 0 ? "naik " : "turun ") + Math.abs(monthDeltaPct) + "% dari bulan lalu";
    }
  }

  const topAssetBulanIni = Object.keys(monthAssetTotals).sort(function (a, b) { return monthAssetTotals[b] - monthAssetTotals[a]; })
    .map(function (name, idx) { return { rank: idx + 1, nama: name, totalTerpakaiBulanIni: monthAssetTotals[name] }; });

  // Rata-rata pemakaian/hari per Asset, 30 hari terakhir (buat estimasi habis stock) — SAMA PERSIS
  // logic renderUsageHighlight() di dashboard.
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 29);
  const cutoffStr = cutoff.getFullYear() + "-" + String(cutoff.getMonth() + 1).padStart(2, "0") + "-" + String(cutoff.getDate()).padStart(2, "0");
  const last30Totals = {};
  usageLogsArr.forEach(function (log) {
    const d = log.workingDate || "";
    if (d >= cutoffStr && log.assetId) last30Totals[log.assetId] = (last30Totals[log.assetId] || 0) + (Number(log.qtyUsed) || 0);
  });
  const avgPerDayByAsset = {};
  Object.keys(last30Totals).forEach(function (id) { avgPerDayByAsset[id] = last30Totals[id] / 30; });

  const stockArr = Object.keys(stock).map(function (id) { return Object.assign({ assetId: id }, stock[id]); });
  const lowStockDetail = [];
  stockArr.forEach(function (a) {
    const minStock = Number(a.minStock) || 0;
    const qty = Number(a.qty) || 0;
    if (minStock > 0 && qty <= minStock) {
      const avgPerDay = avgPerDayByAsset[a.assetId] || 0;
      const daysRemaining = qty <= 0 ? 0 : (avgPerDay > 0 ? Math.floor(qty / avgPerDay) : null);
      const reorderQty = avgPerDay > 0 ? Math.max(0, Math.ceil((avgPerDay * 30) - qty)) : Math.max(0, minStock - qty);
      lowStockDetail.push({
        nama: a.name || "-", unit: a.unit || "-", qtySekarang: qty, minStock: minStock,
        rataRataPemakaianPerHari_30HariTerakhir: Number(avgPerDay.toFixed(2)),
        estimasiHabisDalamHari: daysRemaining,
        saranReorderQty: reorderQty
      });
    }
  });
  lowStockDetail.sort(function (a, b) {
    const av = a.estimasiHabisDalamHari === null ? Infinity : a.estimasiHabisDalamHari;
    const bv = b.estimasiHabisDalamHari === null ? Infinity : b.estimasiHabisDalamHari;
    return av - bv;
  });

  const stockLengkap = stockArr.map(function (a) {
    const minStock = Number(a.minStock) || 0;
    const qty = Number(a.qty) || 0;
    return {
      // "assetId" ini KEY ASLI di Firebase (bukan hasil generate/tebakan) — WAJIB dipakai apa adanya
      // kalau nyiapin "inventoryAction" (Update Stock/Usage Log), JANGAN pernah dimodif/disingkat/ditebak.
      assetId: a.assetId,
      nama: a.name || "-", kategori: a.category || "-", unit: a.unit || "-",
      qty: qty, minStock: minStock, statusStock: (minStock > 0 && qty <= minStock) ? "Menipis" : "Aman",
      catatan: a.note || "-", terakhirDiupdate: a.updatedAt ? new Date(a.updatedAt).toISOString() : null,
      diupdateOleh: a.updatedBy || "-"
    };
  }).sort(function (a, b) { return a.nama.localeCompare(b.nama); });

  const assetItNcaLengkap = Object.keys(assetItNca).map(function (id) {
    const a = assetItNca[id];
    return {
      nama: a.name || "-", jenis: a.jenis || "IT", jumlah: Number(a.qty) || 1,
      noSerialInventaris: a.serial || "-", picPemegang: a.pic || "-", lokasi: a.lokasi || "-",
      status: a.status || "Aktif", catatan: a.note || "-",
      terakhirDiupdate: a.updatedAt ? new Date(a.updatedAt).toISOString() : null, diupdateOleh: a.updatedBy || "-"
    };
  }).sort(function (a, b) { return a.nama.localeCompare(b.nama); });

  const auditLogTerbaru = Object.keys(auditLogRaw).map(function (id) { return auditLogRaw[id]; })
    .sort(function (a, b) { return (b.changedAt || 0) - (a.changedAt || 0); })
    .slice(0, 100)
    .map(function (r) {
      return { waktu: r.changedAt ? new Date(r.changedAt).toISOString() : null, modul: r.module || "-", aksi: r.action || "-", namaItem: r.itemName || "-", detail: r.detail || "-", diubahOleh: r.changedBy || "-" };
    });

  return {
    catatanPentingBuatAI: "Modul Inventory Control ini punya 5 sub-menu: (1) Log Activity Usage — input " +
      "pemakaian asset harian per Devisi, (2) Highlight Usage — dashboard KPI & leaderboard pemakaian, " +
      "(3) Stock — database jumlah stock consumable & Min Stock, (4) Asset IT & NCA — database aset non-consumable " +
      "(laptop, meja, dst) per unit dengan PIC/lokasi/status, (5) Audit Log — riwayat semua perubahan. Devisi SOC " +
      "(Sortation Center) & EHA (Exception Handling Area) itu SATU dashboard gabungan, pembedanya cuma field " +
      "\"devisi\" di tiap Log Usage (otomatis dari email yang input) — BUKAN dua modul terpisah. Bagian " +
      "\"sudahDihitungFinal\" di bawah angkanya SUDAH final dihitung persis sama kayak dashboard — JANGAN hitung " +
      "ulang pakai cara/asumsi sendiri, cukup baca & olah dari situ. Bagian lain (stockLengkap, assetItNcaLengkap, " +
      "auditLogTerbaru) itu data MENTAH lengkap buat kamu olah sendiri kalau user nanya detail spesifik.",
    tanggalHariIni: today,
    devisiInfo: INV_DEVISI_LABELS,
    sudahDihitungFinal: {
      highlightUsageKpi: {
        totalTerpakaiHariIni: todayTotal,
        totalTerpakaiBulanIni: monthTotal,
        totalTerpakaiBulanLalu: lastMonthTotal,
        deltaBulanIniVsBulanLaluPct: monthDeltaPct,
        deltaKeterangan: monthDeltaKeterangan,
        jumlahAssetTersentuhBulanIni: Object.keys(monthAssetTotals).length,
        jumlahAssetStockMenipis: lowStockDetail.length
      },
      breakdownPemakaianBulanIniPerDevisi: {
        SOC_SortationCenter: monthDevisiTotals.SOC || 0,
        EHA_ExceptionHandlingArea: monthDevisiTotals.EHA || 0
      },
      topAssetTerpakaiBulanIni: topAssetBulanIni,
      lowStockDetailDenganEstimasiHabisDanSaranReorder: lowStockDetail
    },
    stockLengkap: stockLengkap,
    assetItNcaLengkap: assetItNcaLengkap,
    auditLogTerbaru_Max100: auditLogTerbaru
  };
}

