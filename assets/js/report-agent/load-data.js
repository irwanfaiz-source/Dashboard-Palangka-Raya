/**
 * assets/js/report-agent/load-data.js — loadData() + helper tampilan (waktu, badge, kartu lampiran)
 * Bagian 9/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

async function loadData(){
  // Auto: kalau session login (auth-guard.js) udah kevalidasi, langsung sync live
  // dari Firebase. Kalau belum login / firebase belum siap, fallback ke data contoh.
  const isLive = firebaseReady;
  document.getElementById("statusLine").textContent = "mode: " + (isLive?"live firebase":"mock data") + " — memuat...";
  try{
    const raw = isLive ? await fetchLiveTrips() : generateMockData();
    // Semua tanggal ditampung tanpa difilter — AI Agent yang nyortir sendiri
    // berdasarkan field "tanggal" tiap trip waktu ada pertanyaan soal tanggal tertentu.
    currentTrips = raw.map(normalizeTrip);
    document.getElementById("quickStat").innerHTML = "<b>"+currentTrips.length+"</b> trip tercatat";
    document.getElementById("statusLine").textContent = "mode: " + (isLive?"live firebase":"mock data");
  }catch(e){
    console.error(e);
    document.getElementById("statusLine").textContent = "gagal ambil data live: " + e.message;
  }

  // Data Rest Time & Asset Usage (prDcMonitoring) — cuma ada versi live, gak
  // ada mock, karena kalau lagi gak login/offline AI-nya emang WAJIB ngaku
  // terus terang gak ada data (bukan ngarang), sama kayak mode DW/Queue Report.
  if (isLive){
    try{
      const mon = await fetchRestAssetData();
      currentRestLogs = mon.logs;
      currentAssetLogs = mon.assetLogs;
      monMasterKaryawan = mon.master;
      monPdaStationMap = mon.stationMap;
    }catch(e){
      console.error("gagal ambil data Rest Time/Asset Usage:", e);
      currentRestLogs = []; currentAssetLogs = []; monMasterKaryawan = {}; monPdaStationMap = {};
    }
  } else {
    currentRestLogs = []; currentAssetLogs = []; monMasterKaryawan = {}; monPdaStationMap = {};
  }

  // Data modul OUTBOUND (Aging & Packer Backlog + Occupancy & Shift) — prDcOutboundMonitoring.
  // Sama kayak Rest Time/Asset Usage: cuma ada versi live, gak ada mock — kalau lagi gak login/offline
  // AI-nya WAJIB ngaku terus terang gak ada data, bukan ngarang.
  if (isLive){
    try{
      const ob = await fetchOutboundData();
      currentOutboundRaw = ob.rows;
      currentOutboundMeta = ob.meta;
    }catch(e){
      console.error("gagal ambil data Outbound (Aging/Occupancy/Shift):", e);
      currentOutboundRaw = []; currentOutboundMeta = null;
    }
  } else {
    currentOutboundRaw = []; currentOutboundMeta = null;
  }

  // Data modul PERFORMANCE BAGGER (produktivitas packer/bagger harian) — prDcPerformanceBagger.
  // Sama kayak Outbound/Rest Time/Asset Usage: cuma ada versi live, gak ada mock — kalau lagi gak
  // login/offline AI-nya WAJIB ngaku terus terang gak ada data, bukan ngarang.
  if (isLive){
    try{
      const pb = await fetchPerformanceBaggerData();
      currentPbDailyRecords = pb.dailyRecords;
      currentPbImportLogs = pb.importLogs;
    }catch(e){
      console.error("gagal ambil data Performance Bagger:", e);
      currentPbDailyRecords = {}; currentPbImportLogs = [];
    }
  } else {
    currentPbDailyRecords = {}; currentPbImportLogs = [];
  }

  // Data modul INVENTORY CONTROL (Stock, Log Activity Usage, Asset IT & NCA, Audit Log) —
  // inventoryControl/SOC. Sama kayak modul lain: cuma ada versi live, gak ada mock — kalau lagi gak
  // login/offline AI-nya WAJIB ngaku terus terang gak ada data, bukan ngarang.
  if (isLive){
    try{
      const inv = await fetchInventoryControlData();
      currentInvStock = inv.stock;
      currentInvUsageLogs = inv.usageLogs;
      currentInvAssetItNca = inv.assetItNca;
      currentInvAuditLog = inv.auditLog;
    }catch(e){
      console.error("gagal ambil data Inventory Control:", e);
      currentInvStock = {}; currentInvUsageLogs = {}; currentInvAssetItNca = {}; currentInvAuditLog = {};
    }
  } else {
    currentInvStock = {}; currentInvUsageLogs = {}; currentInvAssetItNca = {}; currentInvAuditLog = {};
  }
}

function fmtTime(iso){
  const d = new Date(iso);
  if (isNaN(d)) return "-";
  return d.toTimeString().slice(0,5);
}

function badgeClassFor(status){
  if (status === "Late Arrival") return "badge-late";
  if (status === "Early Arrived") return "badge-early";
  if (status === "In Transit") return "badge-transit";
  return "badge-ontime";
}

function renderAttachCard(units){
  if (!units || units.length === 0) return "";
  let rows = units.map(u => {
    return `<tr>
      <td>${u.tripNum||"-"}</td>
      <td>${u.vehiclePlate||"-"}</td>
      <td>${u.vendorName||"-"}</td>
      <td>${u.atdOrigin?fmtTime(u.atdOrigin):"-"}</td>
      <td>${u.ataDest?fmtTime(u.ataDest):"-"}</td>
      <td><span class="badge ${badgeClassFor(u.status)}">${u.status||"-"}</span></td>
    </tr>`;
  }).join("");
  return `<div class="attach-card"><table>
    <thead><tr><th>Trip</th><th>No Truk</th><th>Vendor</th><th>Berangkat</th><th>Tiba</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

