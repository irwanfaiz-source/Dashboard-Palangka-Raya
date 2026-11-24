/**
 * assets/js/report-agent/inbound-logic.js — Logika Inbound: status trip, normalisasi, Convoy, Daily Briefing
 * Bagian 8/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Replikasi persis logic status di inbound.html =====
function computeStatus(t){
  const atdOrigin = t.atdOrigin ? new Date(t.atdOrigin) : null;
  const ataDest = t.ataDest ? new Date(t.ataDest) : null;
  const now = new Date();
  let statusText = "-";
  let etaDateObj = atdOrigin ? new Date(atdOrigin.getTime() + 390*60*1000) : null; // ETA = atdOrigin + 6.5 jam

  if (atdOrigin){
    if (ataDest){
      const durationHours = (ataDest.getTime() - atdOrigin.getTime()) / 3600000;
      if (durationHours < 6.0) statusText = "Early Arrived";
      else if (durationHours <= 6.5) statusText = "On Time";
      else statusText = "Late Arrival";
    } else {
      statusText = (etaDateObj && now > etaDateObj) ? "Late Arrival" : "In Transit";
    }
  }
  return { statusText, etaDateObj };
}

// Format tanggal pakai KOMPONEN WAKTU LOKAL (WIB) — SAMA PERSIS kayak
// formatDateYYYYMMDD() di inbound.html. JANGAN pakai .toISOString().slice(0,10)
// buat ambil tanggal, karena toISOString() itu UTC: trip yang ATD Origin-nya
// jam 00:00-06:59 pagi WIB bakal "mundur" ke tanggal UTC sebelumnya (H-1),
// jadi gak match sama kolom "Tanggal" di dashboard Inbound yang pakai local time.
// Ini yang bikin AI Agent salah nyortir trip pas ditanya "hari ini".
function formatDateYYYYMMDDLocal(d){
  const pad = n => String(n).padStart(2,"0");
  return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
}

function normalizeTrip(t){
  const { statusText, etaDateObj } = computeStatus(t);
  const dateSourceRaw = t.atdOrigin || t.stdOrigin;
  const dateSource = dateSourceRaw ? new Date(dateSourceRaw) : null;
  return {
    tripNum: t.tripNum || "-",
    routeName: t.routeName || "-",
    vendorName: t.vendorName || "-",
    driver: t.driver || "-",
    vehiclePlate: t.vehiclePlate || "-",
    vehicleType: t.vehicleType || "-",
    qtyParcelVal: t.qtyParcelVal || 0,
    stdOrigin: t.stdOrigin || null,
    staDest: t.staDest || null,
    atdOrigin: t.atdOrigin || null,
    ataDest: t.ataDest || null,
    etaDest: etaDateObj ? etaDateObj.toISOString() : null,
    tanggal: dateSource && !isNaN(dateSource) ? formatDateYYYYMMDDLocal(dateSource) : null,
    status: statusText
  };
}

// ===== Deteksi "Convoy" (fitur baru) =====
// Definisi convoy: 2 (atau lebih) unit yang ATA Destination-nya berjarak
// DI BAWAH 40 menit satu sama lain, di tanggal yang sama. Cara hitungnya:
// per tanggal, urutin trip yang UDAH punya ataDest dari yang paling pagi,
// lalu "rantai"-in trip yang jaraknya ke trip sebelumnya < 40 menit jadi
// satu grup. Grup yang cuma isi 1 trip (gak ada temen deketnya) dibuang —
// itu bukan convoy. Dihitung SEKALI di sini (JS), bukan diserahin ke AI,
// biar hasilnya konsisten & gak meleset kayak kalau AI disuruh
// ngira-ngira selisih waktu sendiri dari puluhan trip.
function computeConvoyGroups(trips){
  const byDate = {};
  trips.forEach(function (t){
    if (!t.ataDest || !t.tanggal) return; // convoy cuma valid buat trip yang UDAH sampai
    const ataMs = new Date(t.ataDest).getTime();
    if (isNaN(ataMs)) return;
    (byDate[t.tanggal] = byDate[t.tanggal] || []).push(Object.assign({}, t, { ataMs: ataMs }));
  });

  const CONVOY_WINDOW_MS = 40 * 60 * 1000; // di bawah 40 menit
  const groups = [];
  Object.keys(byDate).forEach(function (tanggal){
    const arr = byDate[tanggal].sort(function (a, b){ return a.ataMs - b.ataMs; });
    let current = [];
    arr.forEach(function (t){
      if (current.length && (t.ataMs - current[current.length - 1].ataMs) >= CONVOY_WINDOW_MS){
        if (current.length >= 2) groups.push(current);
        current = [];
      }
      current.push(t);
    });
    if (current.length >= 2) groups.push(current);
  });

  return groups.map(function (g, idx){
    return {
      convoyKe: idx + 1,
      tanggal: g[0].tanggal,
      jumlahUnit: g.length,
      rentangWaktuMenit: Math.round((g[g.length - 1].ataMs - g[0].ataMs) / 60000),
      units: g.map(function (t){
        return {
          tripNum: t.tripNum, vendorName: t.vendorName, driver: t.driver,
          qtyParcelVal: t.qtyParcelVal, staDest: t.staDest, ataDest: t.ataDest
        };
      })
    };
  });
}

// ===== AI "Daily Briefing" (fitur baru) =====
// Begitu Odyssey kebuka & data live udah kevalidasi login, langsung nembak
// 1 pesan ringkasan operasional ("30 detik briefing") tanpa nunggu user
// nanya duluan: jumlah Late Arrival & In Transit HARI INI, jumlah unit
// Convoy yang kedeteksi, anomali vendor (late rate hari ini naik jauh
// dibanding rata-rata 7 hari sebelumnya), dan daftar prioritas nomor trip
// yang paling perlu dicek. Semua dihitung di JS (bukan diserahin ke AI)
// biar angkanya konsisten & gak ngarang, sama kayak computeConvoyGroups().
function greetingSalutation(now){
  const h = now.getHours();
  if (h >= 4 && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 15) return "Selamat siang";
  if (h >= 15 && h < 18) return "Selamat sore";
  return "Selamat malam";
}

// Bandingin late rate per vendor HARI INI vs rata-rata 7 hari sebelumnya.
// Butuh minimal 2 trip hari ini & minimal 3 trip di periode baseline biar
// gak ngasih alert dari sampel kekecilan (1 trip telat = "naik 100%" tapi
// gak berarti apa-apa). Ambang alert: naik >=15 poin persen.
function detectVendorLateRateAnomaly(todayTrips, baselineTrips){
  function rateByVendor(list){
    const map = {};
    list.forEach(function (t){
      const v = t.vendorName || "-";
      if (!map[v]) map[v] = { total: 0, late: 0 };
      map[v].total++;
      if (t.status === "Late Arrival") map[v].late++;
    });
    return map;
  }
  const todayMap = rateByVendor(todayTrips);
  const baseMap = rateByVendor(baselineTrips);
  let best = null;
  Object.keys(todayMap).forEach(function (v){
    const t = todayMap[v];
    const b = baseMap[v];
    if (t.total < 2 || !b || b.total < 3) return;
    const todayPct = Math.round((t.late / t.total) * 100);
    const basePct = Math.round((b.late / b.total) * 100);
    const jump = todayPct - basePct;
    if (jump >= 15 && (!best || jump > best.jump)){
      best = { vendorName: v, todayPct: todayPct, basePct: basePct, jump: jump };
    }
  });
  return best;
}

// Urutin trip Late Arrival buat daftar "Priority": trip yang MASIH di jalan
// & udah lewat ETA didahuluin (masih bisa dikejar/ditindaklanjuti sekarang),
// baru trip yang UDAH sampe tapi telat (cuma tinggal dicatat, gak ada yang
// bisa dilakuin lagi). Di dalam grup yang sama, makin lama telatnya makin
// diprioritasin duluan.
function rankPriorityTrips(lateTrips, now){
  return lateTrips.slice().sort(function (a, b){
    const aStillOnRoad = a.ataDest ? 0 : 1;
    const bStillOnRoad = b.ataDest ? 0 : 1;
    if (aStillOnRoad !== bStillOnRoad) return bStillOnRoad - aStillOnRoad;
    const aRef = a.ataDest ? new Date(a.ataDest) : now;
    const bRef = b.ataDest ? new Date(b.ataDest) : now;
    const aLateMs = a.etaDest ? (aRef - new Date(a.etaDest)) : 0;
    const bLateMs = b.etaDest ? (bRef - new Date(b.etaDest)) : 0;
    return bLateMs - aLateMs;
  }).map(function (t){ return t.tripNum; });
}

function buildDailyBriefingText(trips){
  const now = new Date();
  const salam = greetingSalutation(now);
  const todayStr = formatDateYYYYMMDDLocal(now);
  const todayTrips = trips.filter(function (t){ return t.tanggal === todayStr; });

  if (!todayTrips.length){
    return salam + " bro. Nih briefing 30 detik lo:\n\nBelum ada trip yang tercatat hari ini (" + todayStr +
      ") di data live. Begitu ada trip masuk, gua langsung update ke lo.";
  }

  const lateToday = todayTrips.filter(function (t){ return t.status === "Late Arrival"; });
  const transitToday = todayTrips.filter(function (t){ return t.status === "In Transit"; });
  const convoyToday = computeConvoyGroups(trips).filter(function (g){ return g.tanggal === todayStr; });
  const convoyUnitCount = convoyToday.reduce(function (sum, g){ return sum + g.jumlahUnit; }, 0);

  const sevenDaysAgoStart = new Date(todayStr + "T00:00:00");
  sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7);
  const baselineTrips = trips.filter(function (t){
    if (!t.tanggal || t.tanggal === todayStr) return false;
    const d = new Date(t.tanggal + "T00:00:00");
    return !isNaN(d) && d >= sevenDaysAgoStart;
  });
  const vendorAnomaly = detectVendorLateRateAnomaly(todayTrips, baselineTrips);
  const priorityTrips = rankPriorityTrips(lateToday, now).slice(0, 3);

  const lines = [];
  lines.push(salam + " bro. Nih briefing 30 detik lo:");
  lines.push("");
  lines.push("🔴 " + lateToday.length + " Late Arrival");
  lines.push("🟡 " + transitToday.length + " In Transit");
  lines.push("🚚 " + convoyUnitCount + " unit Convoy terdeteksi" + (convoyToday.length ? " (" + convoyToday.length + " grup)" : ""));
  if (vendorAnomaly){
    lines.push("⚠️ Vendor " + vendorAnomaly.vendorName + " late rate naik dari " + vendorAnomaly.basePct + "% ke " + vendorAnomaly.todayPct + "% (7 hari terakhir)");
  }
  if (priorityTrips.length){
    lines.push("");
    lines.push("**Priority:** cek " + priorityTrips.join(", ") + ".");
  }
  return lines.join("\n");
}

// Cuma jalan sekali per sesi (dailyBriefingShown), dan cuma kalau data live
// Firebase udah kevalidasi login (firebaseReady) — di mode mock/offline
// AI-nya gak ngasih briefing ngarang, sama kayak aturan modul lain.
// Switch: false = briefing pagi disembunyiin (chat awal lebih bersih). Ubah ke true buat nyalain lagi.
const SHOW_DAILY_BRIEFING = false;
function maybeShowDailyBriefing(){
  if (!SHOW_DAILY_BRIEFING) return;
  if (dailyBriefingShown || !firebaseReady) return;
  dailyBriefingShown = true;
  addMessage("agent", buildDailyBriefingText(currentTrips));
}

