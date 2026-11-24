/**
 * assets/js/report-agent/explain-panels.js — Fitur "Explain Why?" & "Details"
 * Bagian 10/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Fitur "Explain Why?" & "Details" (fitur baru) =====
// Tujuannya: user bisa AUDIT reasoning AI tanpa nge-prompt ulang. Caranya —
// begitu balasan agent kelar, kita gak nanya AI lagi, tapi nyisir ULANG teks
// balasan itu buat nyari entity (vendor/driver/trip) yang paling relevan
// disebut di situ, lalu hitung breakdown status-nya LANGSUNG dari currentTrips
// (data yang emang jadi sumber balasan AI tadi) — sama kayak filosofi
// computeConvoyGroups()/buildDailyBriefingText(): angka dihitung sekali di JS
// biar konsisten, bukan diserahin ke AI buat diitung ulang & bisa ngarang.
function buildExplainData(replyText){
  const trips = (typeof currentTrips !== "undefined" && currentTrips) || [];
  if (!trips.length) return null;
  const lower = (replyText || "").toLowerCase();

  // Prioritas deteksi entity yang disebut di balasan: Vendor > Driver > No Trip.
  // Vendor didahuluin karena paling sering jadi subjek pertanyaan performa
  // ("Vendor mana yang paling sering telat?").
  let entityLabel = null, entityValue = null, matchTrips = null;

  const vendorNames = [...new Set(trips.map(t => t.vendorName).filter(v => v && v !== "-"))];
  const matchedVendor = vendorNames.find(v => lower.includes(v.toLowerCase()));
  if (matchedVendor){
    entityLabel = "Vendor"; entityValue = matchedVendor;
    matchTrips = trips.filter(t => t.vendorName === matchedVendor);
  }
  if (!matchTrips){
    const driverNames = [...new Set(trips.map(t => t.driver).filter(v => v && v !== "-"))];
    const matchedDriver = driverNames.find(v => lower.includes(v.toLowerCase()));
    if (matchedDriver){
      entityLabel = "Driver"; entityValue = matchedDriver;
      matchTrips = trips.filter(t => t.driver === matchedDriver);
    }
  }
  if (!matchTrips){
    const matchedTrip = trips.find(t => t.tripNum && t.tripNum !== "-" && lower.includes(t.tripNum.toLowerCase()));
    if (matchedTrip){
      entityLabel = "Trip"; entityValue = matchedTrip.tripNum;
      matchTrips = trips.filter(t => t.tripNum === matchedTrip.tripNum);
    }
  }

  // Scope waktu: dibaca dari kata kunci yang kesebut di balasan sendiri, biar
  // breakdown-nya konsisten sama periode yang lagi dibahas AI ("bulan ini",
  // "hari ini", "minggu ini"/"7 hari"). Default: semua data yang lagi kemuat.
  let scopeLabel = "yang tercatat";
  let scopeTrips = matchTrips || trips;
  const now = new Date();
  const todayStr = formatDateYYYYMMDDLocal(now);
  if (/bulan ini/.test(lower)){
    const ym = todayStr.slice(0,7);
    scopeTrips = scopeTrips.filter(t => t.tanggal && t.tanggal.slice(0,7) === ym);
    scopeLabel = "bulan ini";
  } else if (/hari ini/.test(lower)){
    scopeTrips = scopeTrips.filter(t => t.tanggal === todayStr);
    scopeLabel = "hari ini";
  } else if (/minggu ini|7 hari/.test(lower)){
    const weekAgo = new Date(todayStr + "T00:00:00");
    weekAgo.setDate(weekAgo.getDate() - 7);
    scopeTrips = scopeTrips.filter(t => t.tanggal && new Date(t.tanggal + "T00:00:00") >= weekAgo);
    scopeLabel = "7 hari terakhir";
  }

  if (!scopeTrips.length) return null;

  const counts = { "Late Arrival":0, "On Time":0, "Early Arrived":0, "In Transit":0 };
  scopeTrips.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
  const finished = counts["Late Arrival"] + counts["On Time"] + counts["Early Arrived"];
  const lateRate = finished ? ((counts["Late Arrival"] / finished) * 100).toFixed(1) : "0.0";

  return {
    entityLabel: entityLabel || "Semua trip",
    entityValue: entityValue || "",
    scopeLabel, scopeTrips,
    total: scopeTrips.length,
    counts, lateRate
  };
}

function buildExplainPanel(data){
  const panel = document.createElement("details");
  panel.className = "note-details explain-panel";
  panel.open = true;
  const summary = document.createElement("summary");
  summary.textContent = "💡 Kenapa jawaban ini?";
  panel.appendChild(summary);
  const inner = document.createElement("div");
  inner.className = "inner";
  if (!data){
    inner.textContent = "Gak nemu data trip spesifik yang cocok buat di-audit dari balasan ini — coba klik Details buat liat data mentahnya.";
  } else {
    const subject = data.entityValue ? (data.entityLabel + " " + data.entityValue) : data.entityLabel;
    const lines = [];
    lines.push("Dari " + data.total + " trip " + subject + " " + data.scopeLabel + ":");
    if (data.counts["Late Arrival"]) lines.push("• " + data.counts["Late Arrival"] + " Late");
    if (data.counts["On Time"]) lines.push("• " + data.counts["On Time"] + " On Time");
    if (data.counts["Early Arrived"]) lines.push("• " + data.counts["Early Arrived"] + " Early");
    if (data.counts["In Transit"]) lines.push("• " + data.counts["In Transit"] + " In Transit");
    lines.push("");
    lines.push("<b>Late rate: " + data.lateRate + "%</b>");
    inner.innerHTML = lines.join("<br>");
  }
  panel.appendChild(inner);
  return panel;
}

function buildDetailsPanel(data){
  const panel = document.createElement("details");
  panel.className = "note-details details-panel";
  panel.open = true;
  const summary = document.createElement("summary");
  summary.textContent = "📄 Data mentah trip";
  panel.appendChild(summary);
  const inner = document.createElement("div");
  inner.className = "inner";
  if (!data || !data.scopeTrips.length){
    inner.textContent = "Gak ada trip mentah yang bisa ditampilkan buat balasan ini.";
  } else {
    inner.innerHTML = renderAttachCard(data.scopeTrips);
  }
  panel.appendChild(inner);
  return panel;
}

