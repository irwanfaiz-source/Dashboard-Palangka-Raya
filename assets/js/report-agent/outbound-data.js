/**
 * assets/js/report-agent/outbound-data.js — Data Outbound: fetch & dekompres, jadwal Linehaul, aturan alert, ringkasan untuk AI
 * Bagian 4/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Path Firebase modul OUTBOUND (outbound.html) — Aging & Packer Backlog + Occupancy & Shift.
// Root beda sendiri, SAMA PERSIS yang dipakai outbound.html, biar Odyssey baca sumber data yang
// sama persis dengan yang keliatan di dashboard Outbound. =====
const FB_OUTBOUND_ROOT = "prDcOutboundMonitoring";
let currentOutboundRaw = [];    // array parcel Outbound (hasil decompress data import terakhir)
let currentOutboundMeta = null; // {fileName, importedAt, importedBy} import terakhir modul Outbound

// ===== Modul PERFORMANCE BAGGER (monitoring produktivitas packer/bagger harian, sumber import PDVT) =====
const FB_PB_ROOT = "prDcPerformanceBagger";
let currentPbDailyRecords = {}; // {tanggal(YYYY-MM-DD): {opsId: {name, agency, packed, statusInfo, importedAt, importedBy}}} bulan berjalan, live Firebase
let currentPbImportLogs = [];   // riwayat import PDVT terakhir (max 20, sesuai yang ditampilin dashboard)

// ===== Modul INVENTORY CONTROL (Stock, Log Activity Usage & Highlight, Asset IT & NCA, Audit Log) =====
const FB_INV_ROOT = "inventoryControl";
const INV_FACILITY = "SOC"; // SOC & EHA sekarang 1 cabang Firebase gabungan (inventoryControl/SOC/...) —
                             // "SOC" di sini CUMA nama path internal, pembeda SOC/EHA yang beneran cuma
                             // di field "devisi" tiap Log Activity Usage. SAMA PERSIS pola inventory-control.html.
let currentInvStock = {};      // { assetId: {name, category, unit, qty, minStock, note, updatedAt, updatedBy, createdAt, createdBy} }
let currentInvUsageLogs = {};  // { logId: {assetId, assetName, unit, qtyUsed, workingDate(YYYY-MM-DD), devisi(SOC/EHA), createdAt, createdBy} } — 500 log terakhir
let currentInvAssetItNca = {}; // { itemId: {name, jenis(IT/NCA), qty, serial, pic, lokasi, status, note, updatedAt, updatedBy} }
let currentInvAuditLog = {};   // { logId: {module, action(create/update/delete), itemName, detail, changedAt, changedBy} } — 300 log terakhir

// Data import Outbound disimpen di Firebase dalam bentuk COLUMNAR + GZIP base64 (biar hemat kuota,
// SAMA PERSIS teknik yang dipakai outbound.html sendiri) — jadi harus di-decode balik di sini dulu
// sebelum dipakai buat jawab pertanyaan.
function outboundBase64ToUint8(base64){
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function outboundDecompressFromBase64(base64){
  const bytes = outboundBase64ToUint8(base64);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}
function outboundFromColumnar(columnar){
  if (!columnar || !columnar.fields || !columnar.length) return [];
  const fields = columnar.fields, length = columnar.length, columns = columnar.columns;
  const rows = new Array(length);
  for (let i = 0; i < length; i++){
    const row = {};
    for (let f = 0; f < fields.length; f++) row[fields[f]] = columns[fields[f]][i];
    rows[i] = row;
  }
  return rows;
}

function fetchOutboundData(){
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
    Promise.all([
      db.ref(FB_OUTBOUND_ROOT + "/latestImportMeta").once("value"),
      db.ref(FB_OUTBOUND_ROOT + "/latestImportData").once("value")
    ]).then(function (snaps) {
      const meta = snaps[0].val() || null;
      const payload = snaps[1].val();
      if (!payload || !payload.dataGz){ resolve({ rows: [], meta: meta }); return; }
      outboundDecompressFromBase64(payload.dataGz).then(function (jsonStr) {
        let columnar;
        try { columnar = JSON.parse(jsonStr); } catch (e) { reject(e); return; }
        const rows = outboundFromColumnar(columnar).map(function (row) {
          return Object.assign({}, row, {
            completeDateObj: row.completeDateObj ? new Date(row.completeDateObj) : null
          });
        });
        resolve({ rows: rows, meta: meta });
      }).catch(reject);
    }).catch(reject);
  });
}

// ===== Jadwal keberangkatan Linehaul modul Outbound (Occupancy & Shift Departure Schedule) — config
// STATIS (bukan dari Firebase), di-COPY PERSIS dari konstanta "linehaulSchedule" di outbound.html,
// biar Odyssey tau jadwal per rute tanpa perlu sumber data tambahan. =====
const outboundLinehaulSchedule = [
  { dest: "Sebangau Hub - Jekan Raya Hub", slot: 1, time: "21:00", hubs: ["Sebangau Hub", "Jekan Raya Hub"] },
  { dest: "Sebangau Hub - Jekan Raya Hub", slot: 2, time: "03:00", hubs: ["Sebangau Hub", "Jekan Raya Hub"] },
  { dest: "Sebangau Hub - Jekan Raya Hub", slot: 3, time: "11:25", hubs: ["Sebangau Hub", "Jekan Raya Hub"] },
  { dest: "Pahandut Hub - Pahandut 3 Hub", slot: 1, time: "21:00", hubs: ["Pahandut Hub", "Pahandut 3 Hub"] },
  { dest: "Pahandut Hub - Pahandut 3 Hub", slot: 2, time: "03:15", hubs: ["Pahandut Hub", "Pahandut 3 Hub"] },
  { dest: "Pahandut Hub - Pahandut 3 Hub", slot: 3, time: "10:40", hubs: ["Pahandut Hub", "Pahandut 3 Hub"] },
  { dest: "Palangka Raya Hub - Bukit Batu Kota Palangka Raya Hub - Rakumpit Hub", slot: 1, time: "21:00", hubs: ["Palangka Raya Hub", "Bukit Batu Kota Palangka Raya Hub", "Rakumpit Hub"] },
  { dest: "Palangka Raya Hub - Bukit Batu Kota Palangka Raya Hub", slot: 2, time: "02:40", hubs: ["Palangka Raya Hub", "Bukit Batu Kota Palangka Raya Hub"] },
  { dest: "Palangka Raya Hub - Bukit Batu Kota Palangka Raya Hub - Rakumpit Hub", slot: 3, time: "09:20", hubs: ["Palangka Raya Hub", "Bukit Batu Kota Palangka Raya Hub", "Rakumpit Hub"] },
  { dest: "Timpah Hub", slot: 1, time: "19:05", hubs: ["Timpah Hub"] },
  { dest: "Khayan Hilir Hub - Maliku Hub", slot: 1, time: "20:00", hubs: ["Khayan Hilir Hub", "Maliku Hub"] },
  { dest: "Khayan Hilir Hub - Maliku Hub", slot: 2, time: "08:30", hubs: ["Khayan Hilir Hub", "Maliku Hub"] },
  { dest: "Khayan Hilir Hub - Maliku Hub", slot: 3, time: "13:00", hubs: ["Khayan Hilir Hub", "Maliku Hub"] },
  { dest: "Kasongan Hub - Tewang Sanggalang Garing (Sangalang) Hub", slot: 1, time: "19:25", hubs: ["Kasongan Hub", "Tewang Sanggalang Garing (Sangalang) Hub"] },
  { dest: "Katingan Tengah Hub", slot: 1, time: "14:00", hubs: ["Katingan Tengah Hub"] },
  { dest: "Katingan Hilir 2 Hub - Cempaga Hulu 2 Hub - Cempaga Hulu Hub", slot: 1, time: "19:30", hubs: ["Katingan Hilir 2 Hub", "Cempaga Hulu 2 Hub", "Cempaga Hulu Hub"] },
  { dest: "Katingan Hilir 2 Hub - Cempaga Hulu 2 Hub - Cempaga Hulu Hub", slot: 2, time: "11:30", hubs: ["Katingan Hilir 2 Hub", "Cempaga Hulu 2 Hub", "Cempaga Hulu Hub"] },
  { dest: "Kurun Hub - Kurun 3 Hub - Tewah Hub", slot: 1, time: "19:00", hubs: ["Kurun Hub", "Kurun 3 Hub", "Tewah Hub"] },
  { dest: "Kurun Hub - Kurun 3 Hub - Tewah Hub", slot: 2, time: "09:15", hubs: ["Kurun Hub", "Kurun 3 Hub", "Tewah Hub"] },
  { dest: "Parenggean 5 Hub - Parenggean Hub", slot: 1, time: "20:05", hubs: ["Parenggean 5 Hub", "Parenggean Hub"] },
  { dest: "Parenggean 5 Hub - Parenggean Hub", slot: 2, time: "10:10", hubs: ["Parenggean 5 Hub", "Parenggean Hub"] },
  { dest: "Telaga Antang Hub - Antang Kalang Hub", slot: 1, time: "19:35", hubs: ["Telaga Antang Hub", "Antang Kalang Hub"] },
  { dest: "Telaga Antang Hub - Antang Kalang Hub", slot: 2, time: "10:10", hubs: ["Telaga Antang Hub", "Antang Kalang Hub"] },
  { dest: "Cempaga Hub - Kota Besi Hub", slot: 1, time: "20:15", hubs: ["Cempaga Hub", "Kota Besi Hub"] },
  { dest: "Mentawa Baru Hub", slot: 1, time: "17:00", hubs: ["Mentawa Baru Hub"] },
  { dest: "Mentawa Baru Hub", slot: 2, time: "20:20", hubs: ["Mentawa Baru Hub"] },
  { dest: "Mentawa Baru Hub", slot: 3, time: "09:20", hubs: ["Mentawa Baru Hub"] },
  { dest: "Mentaya Hilir Selatan Hub - Mentaya Hilir Utara Hub", slot: 1, time: "20:25", hubs: ["Mentaya Hilir Selatan Hub", "Mentaya Hilir Utara Hub"] },
  { dest: "Mentaya Hilir Selatan Hub - Mentaya Hilir Utara Hub", slot: 2, time: "09:25", hubs: ["Mentaya Hilir Selatan Hub", "Mentaya Hilir Utara Hub"] },
  { dest: "Mentaya Hulu Hub", slot: 1, time: "14:00", hubs: ["Mentaya Hulu Hub"] },
  { dest: "Mentaya Hulu Hub", slot: 2, time: "20:30", hubs: ["Mentaya Hulu Hub"] },
  { dest: "Mentaya Hulu Hub", slot: 3, time: "09:30", hubs: ["Mentaya Hulu Hub"] },
  { dest: "Baamang 2 Hub - Baamang Hub", slot: 1, time: "13:00", hubs: ["Baamang 2 Hub", "Baamang Hub"] },
  { dest: "Baamang 2 Hub - Baamang Hub - Baamang 3 Hub", slot: 2, time: "19:30", hubs: ["Baamang 2 Hub", "Baamang Hub", "Baamang 3 Hub"] },
  { dest: "Baamang 2 Hub - Baamang Hub - Baamang 3 Hub", slot: 3, time: "10:00", hubs: ["Baamang 2 Hub", "Baamang Hub", "Baamang 3 Hub"] },
  { dest: "Telawang Hub - Danau Seluluk hub - Hanau Hub", slot: 1, time: "16:55", hubs: ["Telawang Hub", "Danau Seluluk hub", "Danau Seluluk Hub", "Hanau Hub"] },
  { dest: "Telawang Hub - Danau Seluluk hub - Hanau Hub", slot: 2, time: "09:35", hubs: ["Telawang Hub", "Danau Seluluk hub", "Danau Seluluk Hub", "Hanau Hub"] },
  { dest: "Telawang Hub - Danau Seluluk hub - Hanau Hub", slot: 3, time: "13:00", hubs: ["Telawang Hub", "Danau Seluluk hub", "Danau Seluluk Hub", "Hanau Hub"] },
  { dest: "Pangkalan Banteng 2 Hub - Pangkalan Banteng Hub - Pangkalan Lada Hub", slot: 1, time: "09:40", hubs: ["Pangkalan Banteng 2 Hub", "Pangkalan Banteng Hub", "Pangkalan Lada Hub"] },
  { dest: "Pangkalan Banteng 2 Hub - Pangkalan Banteng Hub - Pangkalan Lada Hub", slot: 2, time: "20:00", hubs: ["Pangkalan Banteng 2 Hub", "Pangkalan Banteng Hub", "Pangkalan Lada Hub"] },
  { dest: "Seruyan Hilir Hub - Seruyan Hilir Timur Hub - Teluk Sampit Hub", slot: 1, time: "13:00", hubs: ["Seruyan Hilir Hub", "Seruyan Hilir Timur Hub", "Teluk Sampit Hub"] },
  { dest: "Seruyan Hilir Hub - Seruyan Hilir Timur Hub - Teluk Sampit Hub", slot: 2, time: "19:20", hubs: ["Seruyan Hilir Hub", "Seruyan Hilir Timur Hub", "Teluk Sampit Hub"] },
  { dest: "Arut Selatan Hub - Arut Selatan 3 Hub - Kumai Hub", slot: 1, time: "09:50", hubs: ["Arut Selatan Hub", "Arut Selatan 3 Hub", "Kumai Hub"] },
  { dest: "Arut Selatan Hub - Arut Selatan 3 Hub - Kumai Hub", slot: 2, time: "15:00", hubs: ["Arut Selatan Hub", "Arut Selatan 3 Hub", "Kumai Hub"] },
  { dest: "Arut Selatan Hub - Arut Selatan 3 Hub - Kumai Hub", slot: 3, time: "19:35", hubs: ["Arut Selatan Hub", "Arut Selatan 3 Hub", "Kumai Hub"] },
  { dest: "Nengah Bulik Hub - Bulik Hub", slot: 1, time: "11:00", hubs: ["Nengah Bulik Hub", "Bulik Hub"] },
  { dest: "Nengah Bulik Hub - Bulik Hub", slot: 2, time: "21:20", hubs: ["Nengah Bulik Hub", "Bulik Hub"] },
  { dest: "Balai Riam Hub - Balai Riam 2 Hub", slot: 1, time: "12:25", hubs: ["Balai Riam Hub", "Balai Riam 2 Hub"] },
  { dest: "Kotawaringin Lama 2 Hub - Kotawaringin Lama Hub", slot: 1, time: "10:55", hubs: ["Kotawaringin Lama 2 Hub","Kotawaringin Lama Hub"] },
  { dest: "Sukamara Hub", slot: 1, time: "11:45", hubs: ["Sukamara Hub"] },
  { dest: "Kahayan Tengah Hub", slot: 1, time: "01:30", hubs: ["Kahayan Tengah Hub"] },
  { dest: "Sukamara Hub", slot: 2, time: "19:45", hubs: ["Sukamara Hub"] }
];

function outboundShiftFromTimeStr(timeStr){
  if (!timeStr || timeStr === "-") return "Shift 1";
  const parts = timeStr.split(":");
  const totalMinutes = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  const GRACE = 40; // SAMA PERSIS grace period pergantian shift di outbound.html
  if (totalMinutes >= GRACE && totalMinutes < (8 * 60) + GRACE) return "Shift 1";
  if (totalMinutes >= (8 * 60) + GRACE && totalMinutes < (16 * 60) + GRACE) return "Shift 2";
  return "Shift 3";
}
const outboundLinehaulRoutes = Array.from(new Set(outboundLinehaulSchedule.map(function (s) { return s.dest; })))
  .map(function (label, idx) {
    const hubs = Array.from(new Set(outboundLinehaulSchedule.filter(function (s) { return s.dest === label; }).flatMap(function (s) { return s.hubs; })));
    return { id: idx + 1, label: label, hubs: hubs };
  });
function outboundTimeStrToMinutes(timeStr){
  const parts = String(timeStr || "0:0").split(":");
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}
const outboundHubDepartureMinutesMap = {};
outboundLinehaulSchedule.forEach(function (s) {
  const mins = outboundTimeStrToMinutes(s.time);
  s.hubs.forEach(function (h) {
    if (!outboundHubDepartureMinutesMap[h]) outboundHubDepartureMinutesMap[h] = [];
    outboundHubDepartureMinutesMap[h].push(mins);
  });
});
Object.keys(outboundHubDepartureMinutesMap).forEach(function (h) { outboundHubDepartureMinutesMap[h].sort(function (a, b) { return a - b; }); });

// SAMA PERSIS logic getDeliveryShiftForItem() di outbound.html — shift sebuah parcel ditentukan dari
// keberangkatan hub terdekat SESUDAH jam packing, bukan cuma dibagi rata jam packing / 8 jam.
function outboundDeliveryShiftForItem(item){
  if (!item.completeDateObj) return item.shift;
  const packMinutes = item.completeDateObj.getHours() * 60 + item.completeDateObj.getMinutes();
  const times = outboundHubDepartureMinutesMap[item.receiverName];
  if (!times || times.length === 0) return item.shift;
  let nextMinutes = times.find(function (t) { return t >= packMinutes; });
  if (nextMinutes === undefined) nextMinutes = times[0];
  const hh = String(Math.floor(nextMinutes / 60)).padStart(2, "0");
  const mm = String(nextMinutes % 60).padStart(2, "0");
  return outboundShiftFromTimeStr(hh + ":" + mm);
}
// SAMA PERSIS logic getDepartureStatus() di outbound.html
function outboundDepartureStatusText(timeStr){
  const now = new Date();
  const parts = timeStr.split(":");
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(parts[0], 10), parseInt(parts[1], 10) || 0);
  const diffMinutes = (target - now) / 60000;
  if (diffMinutes < 0) return "Lewat Jadwal";
  if (diffMinutes <= 30) return "Segera (kurang dari 30 menit)";
  return "Terjadwal";
}
// SAMA PERSIS logic getRouteAlert() di outbound.html
function outboundRouteAlert(pct){
  if (pct > 150) return { level: "CRITICAL", text: "Need Early Load + Slot Tambahan (Follow Up Team MM)" };
  if (pct > 100) return { level: "URGENT", text: "Need Early Loading Segera (Follow Up Team MM)" };
  if (pct > 50) return { level: "WATCH", text: "Need Early Loading (Follow Up Team MM)" };
  return { level: "AMAN", text: "Kondisi Normal, Belum Perlu Tindakan" };
}

// Setting kapasitas & SLA modul Outbound — dibaca dari localStorage KALAU report-agent.html satu
// origin sama outbound.html (sesuai pola app shell di project ini), biar angkanya nyambung PERSIS
// sama yang di-setting Shift Lead di System Settings dashboard Outbound. Kalau gak ketemu (origin
// beda / localStorage kosong), fallback ke DEFAULT BAWAAN outbound.html sendiri.
function outboundGetNum(key, fallback){
  const v = parseFloat(localStorage.getItem(key));
  return isNaN(v) ? fallback : v;
}
function outboundGetSettings(){
  return {
    destCapacity: outboundGetNum("pkr_outbound_dest_capacity", 2000),
    maxStagingCapacity: outboundGetNum("pkr_outbound_max_staging_capacity", 85000),
    slaOccTarget: outboundGetNum("pkr_outbound_sla_occ", 85),
    slaAgingTarget: outboundGetNum("pkr_outbound_sla_aging", 5)
  };
}

// Bikin RINGKASAN AGREGAT modul Outbound (Aging & Packer Backlog + Occupancy & Shift) dari data
// mentah per-parcel — REPLIKASI PERSIS logic hitung di outbound.html (renderDashboard(),
// renderPackerLeaderboard(), renderShiftTable(), renderExecutiveSummary(), dst), biar angka yang
// Odyssey sebut ke user SAMA PERSIS kayak yang keliatan di dashboard Outbound. Sengaja GAK ngirim
// ribuan baris parcel mentah ke AI (boros token & lambat) — cukup ringkasan agregatnya aja, yang
// notabene udah mencakup semua sudut pandang (per rute, per packer, per shift, per destinasi).
function buildOutboundSummary(rawData){
  const cfg = outboundGetSettings();
  const total = rawData.length;
  const parcelCount = rawData.filter(function (d) { return d.packingMethod === "Assisted Sorting"; }).length;
  const bulkyCount = rawData.filter(function (d) { return d.packingMethod === "Individual Packing"; }).length;
  const hvCount = rawData.filter(function (d) { return d.isHv; }).length;
  const liquidCount = rawData.filter(function (d) { return d.isLiquid; }).length;
  const criticalParcels = rawData.filter(function (d) { return d.agingDays > 4; }).length;
  const capPctRaw = cfg.maxStagingCapacity > 0 ? (total / cfg.maxStagingCapacity) * 100 : 0;
  const criticalPctOfTotal = total > 0 ? (criticalParcels / total) * 100 : 0;

  // Breakdown Volume & Aging Days Inner Island (per rute linehaul terjadwal)
  const routeVolumes = outboundLinehaulRoutes.map(function (r) {
    return { label: r.label, total: 0, parcel: 0, bulky: 0, d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, dMore: 0 };
  });
  const outerIslandMap = {};
  rawData.forEach(function (item) {
    const isParcel = item.packingMethod === "Assisted Sorting";
    const isBulky = item.packingMethod === "Individual Packing";
    let matched = false;
    for (let i = 0; i < outboundLinehaulRoutes.length; i++){
      if (outboundLinehaulRoutes[i].hubs.includes(item.receiverName)){
        const r = routeVolumes[i];
        r.total++;
        if (isParcel) r.parcel++;
        if (isBulky) r.bulky++;
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
    if (!matched){
      if (!outerIslandMap[item.receiverName]) outerIslandMap[item.receiverName] = { name: item.receiverName, total: 0, parcel: 0 };
      outerIslandMap[item.receiverName].total++;
      outerIslandMap[item.receiverName].parcel++;
    }
  });
  // Cap (%) Inner Island pakai kapasitas tetap 4000/rute (SAMA PERSIS outbound.html)
  routeVolumes.forEach(function (r) { r.capPct = Number(((r.total / 4000) * 100).toFixed(1)); });
  routeVolumes.sort(function (a, b) { return b.total - a.total; });
  // Cap (%) Outer Island pakai DESTINATION_CAPACITY per destinasi (setting System Settings)
  const outerIslandList = Object.values(outerIslandMap).map(function (r) {
    return Object.assign({}, r, { capPct: Number((cfg.destCapacity > 0 ? (r.total / cfg.destCapacity) * 100 : 0).toFixed(1)) });
  }).sort(function (a, b) { return b.total - a.total; });

  // Priority Action Center — Top 5 Rute Occupancy Tertinggi (gabungan Inner + Outer)
  const top5Priority = routeVolumes.map(function (r) { return { label: r.label, total: r.total, pct: (r.total / 4000) * 100, category: "Inner" }; })
    .concat(outerIslandList.map(function (r) { return { label: r.name, total: r.total, pct: (r.total / 2000) * 100, category: "Outer" }; }))
    .sort(function (a, b) { return b.pct - a.pct; }).slice(0, 5)
    .map(function (r) {
      const alert = outboundRouteAlert(r.pct);
      return { rute: r.label, kategori: r.category, totalParcel: r.total, persenOccupancy: Number(r.pct.toFixed(1)), levelAlert: alert.level, rekomendasiAksi: alert.text };
    });

  // Packer Leaderboard (Root Cause backlog kritis per operator)
  const packerMap = {};
  rawData.forEach(function (item) {
    const p = item.lastPacker && item.lastPacker !== "-" ? item.lastPacker : "Unassigned / Unknown";
    if (!packerMap[p]) packerMap[p] = { name: p, total: 0, d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, criticalD6: 0 };
    packerMap[p].total++;
    if (item.agingDays === 0) packerMap[p].d0++;
    else if (item.agingDays === 1) packerMap[p].d1++;
    else if (item.agingDays === 2) packerMap[p].d2++;
    else if (item.agingDays === 3) packerMap[p].d3++;
    else if (item.agingDays === 4) packerMap[p].d4++;
    else if (item.agingDays === 5) packerMap[p].d5++;
    else if (item.agingDays === 6) packerMap[p].d6++;
    if (item.agingDays > 4) packerMap[p].criticalD6++;
  });
  const totalCriticalAll = Object.values(packerMap).reduce(function (s, p) { return s + p.criticalD6; }, 0);
  const packerLeaderboard = Object.values(packerMap).map(function (p) {
    return Object.assign({}, p, { kontribusiBacklogKritisPct: totalCriticalAll > 0 ? Number(((p.criticalD6 / totalCriticalAll) * 100).toFixed(1)) : 0 });
  }).sort(function (a, b) { return b.total - a.total; }).slice(0, 30); // batasin Top 30 biar payload gak membengkak

  // Perbandingan Volume Parcel per Shift (pakai jadwal keberangkatan hub, bukan cuma jam packing)
  let s1 = 0, s2 = 0, s3 = 0;
  rawData.forEach(function (d) {
    const sh = outboundDeliveryShiftForItem(d);
    if (sh === "Shift 1") s1++; else if (sh === "Shift 2") s2++; else s3++;
  });

  // Shift Departure Schedule & Heatmap Monitoring (jadwal + status real-time SEKARANG)
  const shiftSchedule = outboundLinehaulSchedule.map(function (s) {
    return { rute: s.dest, slot: s.slot, jamKeberangkatan: s.time, shift: outboundShiftFromTimeStr(s.time), statusSekarang: outboundDepartureStatusText(s.time) };
  }).sort(function (a, b) { return a.jamKeberangkatan.localeCompare(b.jamKeberangkatan); });

  // Verdict keseluruhan DC — SAMA PERSIS logic renderExecutiveSummary() di outbound.html
  const worst = top5Priority.length > 0 ? top5Priority[0] : null;
  const routeCritical = worst && (worst.levelAlert === "CRITICAL" || worst.levelAlert === "URGENT");
  const routeWatch = worst && worst.levelAlert === "WATCH";
  let verdict = "AMAN";
  if (capPctRaw >= 100 || routeCritical || criticalPctOfTotal > cfg.slaAgingTarget * 2) verdict = "KRITIS";
  else if (capPctRaw >= cfg.slaOccTarget || criticalPctOfTotal > cfg.slaAgingTarget || routeWatch) verdict = "WASPADA";

  return {
    infoImportTerakhir: currentOutboundMeta,
    ringkasanEksekutif: {
      totalParcelDiStagingArea: total,
      breakdownTipePacking: { parcel_AssistedSorting: parcelCount, bulky_IndividualPacking: bulkyCount, highValue: hvCount, liquid: liquidCount },
      backlogKritis_AgingLebihDari4Hari: criticalParcels,
      persenBacklogKritisDariTotal: Number(criticalPctOfTotal.toFixed(1)),
      kapasitasMaxStagingDC: cfg.maxStagingCapacity,
      persenOkupansiStagingDC: Number(capPctRaw.toFixed(1)),
      slaTargetOkupansiMaxPct: cfg.slaOccTarget,
      slaTargetBacklogKritisMaxPct: cfg.slaAgingTarget,
      verdictKondisiDC: verdict
    },
    volumeParcelPerShift: { "Shift 1 (00:00-09:00)": s1, "Shift 2 (08:00-17:00)": s2, "Shift 3 (16:00-01:00)": s3 },
    breakdownVolumeAgingInnerIsland: routeVolumes,
    breakdownVolumeOuterIsland: outerIslandList,
    priorityActionCenter_Top5RuteOccupancyTertinggi: top5Priority,
    packerLeaderboard_RootCauseBacklogKritis_Top30: packerLeaderboard,
    shiftDepartureScheduleHeatmap: shiftSchedule
  };
}

