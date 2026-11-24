/**
 * assets/js/report-agent/performance-bagger-data.js — Data Performance Bagger: roster, target, fetch, agregat, ringkasan untuk AI
 * Bagian 5/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Roster staff & target achievement modul Performance Bagger — di-COPY PERSIS dari konstanta
// "STAFF_ROSTER" & "ACHIEVEMENT_THRESHOLD" di performance-bagger.html (sama kayak pola
// outboundLinehaulSchedule di atas: config statis, bukan dari Firebase, jadi harus disalin manual
// kalau roster/target di dashboard-nya berubah biar Odyssey gak ketinggalan info). =====
const PB_STAFF_ROSTER = [
  // -- Dedicated Operator --
  { name: "Muhammad Arifin 2", opsId: "Ops854217", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Muhammad Ramadani", opsId: "Ops767061", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Rivqy Akbar Riswana", opsId: "Ops664556", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Irvansyah", opsId: "Ops1089244", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Irvan Arifai", opsId: "Ops1089247", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "RAHMAN", opsId: "Ops1868559", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Ahmad Mujib", opsId: "Ops1868562", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Egianor", opsId: "Ops767000", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Kristian 2", opsId: "Ops854200", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "NOURHUSEINI", opsId: "Ops1868566", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Sigit Royan Arifin", opsId: "Ops1868565", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Oki Rawana", opsId: "Ops1868561", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Rizky Setiawan", opsId: "Ops1868560", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Obed Yordan Grace Saputra", opsId: "Ops434094", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Amrollah", opsId: "Ops664552", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Sendy Delfrid Nugraha", opsId: "Ops767430", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Amirol Cahya Alfian", opsId: "Ops654983", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Debie Dante Ugul", opsId: "Ops664560", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Muhammad Ali 3", opsId: "Ops854235", agency: "UGBM", status: "Dedicated Operator" },
  { name: "M.ADITIA RIZKY", opsId: "Ops1865262", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Doni Sukma Irawan", opsId: "Ops1865261", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Ahmad Awalluddin", opsId: "Ops1865264", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Ahmad Irfan", opsId: "Ops1865259", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Muhammad Putra Arifin", opsId: "Ops1867071", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Rakhmadani", opsId: "Ops1089309", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Ilham Setiawan", opsId: "Ops318889", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Ahmad Mustafa", opsId: "Ops1867074", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Akhmad Fikri", opsId: "Ops767468", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Helmy Akbar", opsId: "Ops615716", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Bendi Herawan", opsId: "Ops1867070", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Dedi Setiawan 6", opsId: "Ops694308", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Nanda Miko Priambada", opsId: "Ops1867073", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Meici Ariadi", opsId: "Ops1867072", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Andi Alfian Fadillah", opsId: "Ops1089305", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Alpianor", opsId: "Ops434089", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Muhammad Rizky 8", opsId: "Ops616037", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Muhammad Dali 2", opsId: "Ops853924", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Ahmad Ananda Nurwansyah", opsId: "Ops1089276", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Deddy Wahyudi", opsId: "Ops1858809", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Ginanjar Ady Yoga", opsId: "Ops1872556", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "Decky Norhadi", opsId: "Ops1872557", agency: "UGBM", status: "Dedicated Operator" },
  { name: "Wardi Saputra", opsId: "Ops1872559", agency: "UGBM", status: "Dedicated Operator" },
  { name: "DEFRI ANDREADI", opsId: "Ops1872555", agency: "MYROBIN", status: "Dedicated Operator" },
  { name: "AHMAD MUTALIB", opsId: "Ops1872558", agency: "IPI", status: "Dedicated Operator" },

  // -- DW Reguler Pria --
  { name: "MUHAMMAD NAZRIL ILHAM", opsId: "Ops1935449", agency: "IPI", status: "DW Reguler Pria" },
  { name: "AKMAL LUNABIL", opsId: "Ops1472837", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "DANO ALAM", opsId: "Ops1455291", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "MUHTADI", opsId: "Ops1566700", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "RESKY JULIAN PRASETYA", opsId: "Ops1836037", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "NORDIN", opsId: "Ops1955171", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "MUHAMMAD FIQRI", opsId: "Ops1444429", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "NUR FUADY", opsId: "Ops1972742", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "HAIRUL RASIYD", opsId: "Ops1941249", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "AHMAD HAIKAL", opsId: "Ops1876859", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "MUHAMAT HANDRI", opsId: "Ops1876858", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "AHMAD GAZALI", opsId: "Ops2036371", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "MUHAMMAD LEVIARDI", opsId: "Ops1883739", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "ADE IRAWAN", opsId: "Ops1123073", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "BUDI SANTOSO", opsId: "Ops1894719", agency: "IPI", status: "DW Reguler Pria" },
  { name: "A.BUDIMAN", opsId: "Ops1337674", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "AHMAD HAFI", opsId: "Ops1858260", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "MUHAMMAD BAHIT", opsId: "Ops1926180", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "ABDUL SALAM", opsId: "Ops889367", agency: "IPI", status: "DW Reguler Pria" },
  { name: "HARDIMAN", opsId: "Ops1352179", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "RIO ARDIANSYAH", opsId: "Ops1357285", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "IMAM GHAZALI", opsId: "Ops1231724", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "MUHAMMAD RIVAN", opsId: "Ops1164383", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "Ahmad Al Fatah", opsId: "Ops1899115", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "AKHMAD IBRAHIM", opsId: "Ops1783069", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "MUHAMMAD THAZIM", opsId: "Ops1809768", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "IQBAL BASTIAN DAPUTRA MANALU", opsId: "Ops1835326", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "MUHAMMAD ANAS RIYANTO", opsId: "Ops1714824", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "MUHAMMAD BRYAN SYAHWAL", opsId: "Ops1866196", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "IRPA BUSROL KARIM", opsId: "Ops1856698", agency: "IPI", status: "DW Reguler Pria" },
  { name: "NUR WIJAYA", opsId: "Ops1861742", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "MUHAMMAD ALDY RAMADHAN", opsId: "Ops1887650", agency: "IPI", status: "DW Reguler Pria" },
  { name: "KRISTO VORUS WOGE NDROE", opsId: "Ops1887649", agency: "IPI", status: "DW Reguler Pria" },
  { name: "MUHAMMAD SAKRONI", opsId: "Ops1895367", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "WAHYU ALAMSYAH", opsId: "Ops1724253", agency: "UGBM", status: "DW Reguler Pria" },
  { name: "BAHRANI", opsId: "Ops1897682", agency: "IPI", status: "DW Reguler Pria" },
  { name: "MUHAMMAD NUR ICHWANTO", opsId: "Ops1956926", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "AURUM", opsId: "Ops1945014", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "Suriansyah", opsId: "Ops970452", agency: "MYROBIN", status: "DW Reguler Pria" },
  { name: "ALDI SAPUTRA", opsId: "Ops1882883", agency: "IPI", status: "DW Reguler Pria" },
  { name: "PAULUS THALAWANG WOGE NDORE", opsId: "Ops1956235", agency: "IPI", status: "DW Reguler Pria" },
  { name: "TRIO PATRAMAN JOSAFAT SIANTURI", opsId: "Ops1733568", agency: "MYROBIN", status: "DW Reguler Pria" },

  // -- DW Reguler Wanita --
  { name: "YANTI", opsId: "Ops1461807", agency: "MYROBIN", status: "DW Reguler Wanita" },
  { name: "FEBRILIYA ROFIKA SARI", opsId: "Ops1474257", agency: "IPI", status: "DW Reguler Wanita" },
  { name: "NATALIA SIMAMORA", opsId: "Ops1357681", agency: "UGBM", status: "DW Reguler Wanita" },
  { name: "DANUM UTAMI SUCI", opsId: "Ops1472842", agency: "UGBM", status: "DW Reguler Wanita" },
  { name: "HERLINA", opsId: "Ops1863387", agency: "IPI", status: "DW Reguler Wanita" },
  { name: "NAZWA MAHARANI", opsId: "Ops1594622", agency: "MYROBIN", status: "DW Reguler Wanita" },
  { name: "NOVIA", opsId: "Ops1858261", agency: "MYROBIN", status: "DW Reguler Wanita" },
  { name: "DAHLIA", opsId: "Ops1576272", agency: "MYROBIN", status: "DW Reguler Wanita" },
  { name: "SITI AFRILIYANI BUNSIAN", opsId: "Ops1880350", agency: "UGBM", status: "DW Reguler Wanita" },
  { name: "CITRA ANASTASYA", opsId: "Ops1880345", agency: "UGBM", status: "DW Reguler Wanita" },
  { name: "PUTRI NUR HIDAYAH", opsId: "Ops1863389", agency: "IPI", status: "DW Reguler Wanita" },
  { name: "MARI ERLIAN", opsId: "Ops1835353", agency: "MYROBIN", status: "DW Reguler Wanita" },
  { name: "DINALORENZA", opsId: "Ops1782461", agency: "MYROBIN", status: "DW Reguler Wanita" },
  { name: "SINAWATI", opsId: "Ops1359488", agency: "MYROBIN", status: "DW Reguler Wanita" },
  { name: "AMELIA", opsId: "Ops1880346", agency: "UGBM", status: "DW Reguler Wanita" }
];

const PB_ACHIEVEMENT_THRESHOLD = {
  "Dedicated Operator": 6500,
  "DW Reguler Pria": 6500,
  "DW Reguler Wanita": 4500,
  "DW On Call": 3000
};

function pbPad2(n){ return String(n).padStart(2, "0"); }

// "Kemarin" versi tanggal lokal device (SAMA PERSIS getYesterdayDateStr() di performance-bagger.html) —
// dipakai buat kolom "D+1 Packed (Quick View D+1)".
function pbYesterdayLocal(){
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-" + pbPad2(d.getMonth() + 1) + "-" + pbPad2(d.getDate());
}

// Range & label bulan berjalan (SAMA PERSIS currentMonthRange() di performance-bagger.html, tanpa
// parameter monthStr karena Odyssey selalu ambil bulan berjalan device SEKARANG).
function pbCurrentMonthRangeLocal(){
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const bulanIndo = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return {
    start: y + "-" + pbPad2(m) + "-01",
    end: y + "-" + pbPad2(m) + "-31",
    label: bulanIndo[m - 1] + " " + y
  };
}

// Ambil data LIVE dari Firebase root "prDcPerformanceBagger" — SAMA PERSIS sumber yang dipakai
// dashboard performance-bagger.html (bulan berjalan buat dailyRecords, + 20 log import terakhir).
// Data ini tersimpan sebagai JSON polos (BUKAN gzip/columnar kayak modul Outbound), jadi gak perlu
// decompress, cukup baca langsung.
function fetchPerformanceBaggerData(){
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
    const range = pbCurrentMonthRangeLocal();
    Promise.all([
      db.ref(FB_PB_ROOT + "/dailyRecords").orderByKey().startAt(range.start).endAt(range.end).once("value"),
      db.ref(FB_PB_ROOT + "/importLogs").once("value")
    ]).then(function (snaps) {
      const dailyRecords = snaps[0].val() || {};
      const logsVal = snaps[1].val() || {};
      const importLogs = Object.keys(logsVal).map(function (k) { return logsVal[k]; })
        .sort(function (a, b) { return new Date(b.importedAt) - new Date(a.importedAt); })
        .slice(0, 20);
      resolve({ dailyRecords: dailyRecords, importLogs: importLogs });
    }).catch(reject);
  });
}

// Hitung agregat per operator — REPLIKASI PERSIS logic computePbAggregates() di performance-bagger.html
// (total packed, rata-rata/hari, achievedDays vs target, d1Packed "kemarin", underStreak/overStreak
// beruntun di bawah/atas target [ngabaikan hari Off Duty/Cuti/Sakit/Izin], growth 3 hari terakhir vs
// 3 hari sebelumnya, badge Speed Demon/Most Consistent/On Fire) — supaya angka yang dijawab Odyssey
// PERSIS sama kayak yang ditampilin di tabel dashboard Performance Bagger, bukan ngitung versi sendiri.
function computePbAggregatesForAgent(dailyRecords){
  const agg = {};
  const targetDateStr = pbYesterdayLocal();

  PB_STAFF_ROSTER.forEach(function (s) {
    agg[s.opsId] = { name: s.name, opsId: s.opsId, agency: s.agency, status: s.status, total: 0, days: 0, achievedDays: 0, d1Packed: 0, dailyData: {}, dailyStatus: {} };
  });

  Object.keys(dailyRecords).forEach(function (dateStr) {
    const dayData = dailyRecords[dateStr] || {};
    Object.keys(dayData).forEach(function (opsId) {
      const rec = dayData[opsId];
      if (!agg[opsId]) {
        agg[opsId] = { name: rec.name || opsId, opsId: opsId, agency: rec.agency || "-", status: "DW On Call", total: 0, days: 0, achievedDays: 0, d1Packed: 0, dailyData: {}, dailyStatus: {} };
      }
      const packed = rec.packed || 0;
      agg[opsId].total += packed;
      agg[opsId].days += 1;
      agg[opsId].dailyData[dateStr] = packed;
      agg[opsId].dailyStatus[dateStr] = rec.statusInfo || "Normal / Bekerja";
      if (dateStr === targetDateStr) agg[opsId].d1Packed = packed;
      const threshold = PB_ACHIEVEMENT_THRESHOLD[agg[opsId].status] || PB_ACHIEVEMENT_THRESHOLD["DW On Call"];
      if (packed >= threshold) agg[opsId].achievedDays += 1;
    });
  });

  let maxAvg = 0;
  let topSpeedOpsId = null;

  Object.keys(agg).forEach(function (opsId) {
    const item = agg[opsId];
    item.avg = item.days > 0 ? Math.round(item.total / item.days) : 0;
    if (item.days > 0 && item.avg > maxAvg) { maxAvg = item.avg; topSpeedOpsId = opsId; }

    const dates = Object.keys(item.dailyData).sort();
    const threshold = PB_ACHIEVEMENT_THRESHOLD[item.status] || PB_ACHIEVEMENT_THRESHOLD["DW On Call"];

    let underStreak = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      const dStr = dates[i];
      const stInfo = item.dailyStatus[dStr];
      const isOffDutyOrLeave = stInfo && stInfo !== "Normal / Bekerja";
      if (item.dailyData[dStr] < threshold) { if (!isOffDutyOrLeave) underStreak++; }
      else break;
    }
    item.underStreak = underStreak;

    let overStreak = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      if (item.dailyData[dates[i]] >= threshold) overStreak++; else break;
    }
    item.overStreak = overStreak;

    if (dates.length >= 4) {
      const recent = dates.slice(-3).reduce(function (acc, d) { return acc + item.dailyData[d]; }, 0) / 3;
      const prevSlice = dates.slice(-6, -3);
      const prev = prevSlice.reduce(function (acc, d) { return acc + item.dailyData[d]; }, 0) / (dates.length >= 6 ? 3 : (dates.length - 3));
      item.growth = prev > 0 ? Math.round(((recent - prev) / prev) * 100) : 0;
    } else {
      item.growth = 0;
    }

    const achRate = item.days > 0 ? (item.achievedDays / item.days) : null;
    item.achievementRatePct = achRate !== null ? Number((achRate * 100).toFixed(1)) : null;
    item.isRedFlag = item.days > 0 && ((achRate !== null && achRate < 0.5) || item.underStreak >= 3);
    item.badgeMostConsistent = item.days >= 3 && item.achievedDays === item.days;
    item.badgeOnFire = item.overStreak >= 3;
    item.badgeSpeedDemon = false;
  });

  if (topSpeedOpsId) agg[topSpeedOpsId].badgeSpeedDemon = true;
  return agg;
}

// Ringkasan lengkap modul Performance Bagger buat dikirim ke AI — mencakup semua sudut pandang yang
// ada di dashboard (Hall of Fame Top 3, ringkasan achievement rate keseluruhan, breakdown per agency,
// daftar Red Flag/Needs Coaching, ranking lengkap SEMUA operator di roster + badge & streak-nya, dan
// riwayat import PDVT terakhir).
function buildPerformanceBaggerSummary(dailyRecords, importLogs){
  const range = pbCurrentMonthRangeLocal();
  const agg = computePbAggregatesForAgent(dailyRecords);
  const rows = Object.keys(agg).map(function (opsId) { return agg[opsId]; });
  const withData = rows.filter(function (r) { return r.days > 0; });

  let totalDaysAll = 0, totalAchievedAll = 0;
  withData.forEach(function (r) { totalDaysAll += r.days; totalAchievedAll += r.achievedDays; });
  const overallRate = totalDaysAll > 0 ? Number(((totalAchievedAll / totalDaysAll) * 100).toFixed(1)) : 0;

  const topPerformer = withData.length ? withData.slice().sort(function (a, b) { return b.total - a.total; })[0] : null;
  const hallOfFameTop3 = withData.slice().sort(function (a, b) { return b.total - a.total; }).slice(0, 3)
    .map(function (r) { return { nama: r.name, opsId: r.opsId, agency: r.agency, totalPackedBulanIni: r.total }; });

  const redFlagList = rows.filter(function (r) { return r.isRedFlag; })
    .map(function (r) { return { nama: r.name, opsId: r.opsId, agency: r.agency, statusKepegawaian: r.status, achievementRatePct: r.achievementRatePct, hariBeruntunDiBawahTarget: r.underStreak }; });

  const agencyMap = {};
  rows.forEach(function (r) {
    if (!agencyMap[r.agency]) agencyMap[r.agency] = { agency: r.agency, totalPackedBulanIni: 0, jumlahOperatorSudahAdaData: 0 };
    agencyMap[r.agency].totalPackedBulanIni += r.total;
    if (r.days > 0) agencyMap[r.agency].jumlahOperatorSudahAdaData += 1;
  });

  const rankingLengkap = rows.slice().sort(function (a, b) { return b.total - a.total; }).map(function (r, idx) {
    const badges = [];
    if (r.badgeSpeedDemon) badges.push("Speed Demon (rata-rata/hari tertinggi se-DC)");
    if (r.badgeMostConsistent) badges.push("Most Consistent (100% achievement, min. 3 hari data)");
    if (r.badgeOnFire) badges.push("On Fire (≥3 hari beruntun di atas target)");
    if (r.isRedFlag) badges.push("Red Flag / Needs Coaching");
    return {
      rankTotalBulanIni: idx + 1,
      nama: r.name, opsId: r.opsId, agency: r.agency, statusKepegawaian: r.status,
      targetHarian: PB_ACHIEVEMENT_THRESHOLD[r.status] || PB_ACHIEVEMENT_THRESHOLD["DW On Call"],
      totalPackedBulanIni: r.total, rataRataPackedPerHari: r.avg,
      jumlahHariAdaData: r.days, jumlahHariTercapaiTarget: r.achievedDays,
      achievementRatePct: r.achievementRatePct,
      packedKemarin_QuickViewD1: r.d1Packed,
      hariBeruntunDiBawahTarget: r.underStreak, hariBeruntunDiAtasTarget: r.overStreak,
      growthPct_3HariTerakhirVs3HariSebelumnya: r.growth,
      badges: badges
    };
  });

  return {
    catatanPentingBuatAI: "Data ini SAMA PERSIS sumber & cara hitung yang dipakai dashboard Performance Bagger " +
      "(modul monitoring produktivitas packer/bagger harian, sumber import file PDVT harian/mingguan) — " +
      "JANGAN hitung ulang pakai cara/asumsi sendiri, cukup baca & olah dari dump JSON ini.",
    bulanBerjalan: range.label,
    tanggalReferensiKemarin_UntukD1: pbYesterdayLocal(),
    targetAchievementPerStatusKepegawaian: PB_ACHIEVEMENT_THRESHOLD,
    ringkasan: {
      totalOperatorDiRoster: rows.length,
      operatorYangSudahAdaDataBulanIni: withData.length,
      achievementRateKeseluruhanPct: overallRate,
      totalHariDataTercapaiTargetSeDC: totalAchievedAll,
      totalHariDataKeseluruhanSeDC: totalDaysAll,
      topPerformerBulanIni: topPerformer ? { nama: topPerformer.name, opsId: topPerformer.opsId, agency: topPerformer.agency, totalPackedBulanIni: topPerformer.total } : null
    },
    hallOfFameTop3BulanIni: hallOfFameTop3,
    agencyBreakdown: Object.values(agencyMap).sort(function (a, b) { return b.totalPackedBulanIni - a.totalPackedBulanIni; }),
    daftarRedFlag_NeedsCoaching: redFlagList,
    rankingLengkapSemuaOperatorDiRoster: rankingLengkap,
    riwayatImportPdvtTerakhir: (importLogs || []).slice(0, 10).map(function (l) {
      return { namaFile: l.fileName, tanggalCakupan: l.tanggal, jumlahOperator: l.rowCount, importedBy: l.importedBy, importedAt: l.importedAt };
    })
  };
}

