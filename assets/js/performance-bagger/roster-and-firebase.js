/**
 * assets/js/performance-bagger/roster-and-firebase.js — Roster staff, ambang pencapaian, state, load bulan, sync Firebase
 * Bagian 2/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ==== ROSTER STAFF ====
const STAFF_ROSTER = [
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

const ACHIEVEMENT_THRESHOLD = {
  "Dedicated Operator": 6500,
  "DW Reguler Pria": 6500,
  "DW Reguler Wanita": 5500,
  "DW On Call": 3000
};

let pbStaffMap = {};
STAFF_ROSTER.forEach(function (s) { pbStaffMap[s.opsId] = s; });

let fbDb = null;
const FB_PB_ROOT = "prDcPerformanceBagger";
let pbMonthlyRecords = {}; 
let agencyChartInstance = null;
let detailChartInstance = null;
let lastFilteredRows = [];
let redFlagFilterActive = false;
let d1ViewFilterActive = false;
let currentDetailOpsId = null;

function pad2(n) { return String(n).padStart(2, '0'); }

function getYesterdayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function currentMonthRange(monthStr) {
  let y, m;
  if (monthStr) {
    const parts = monthStr.split('-');
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
  } else {
    const now = new Date();
    y = now.getFullYear();
    m = now.getMonth() + 1;
  }
  return {
    start: y + '-' + pad2(m) + '-01',
    end: y + '-' + pad2(m) + '-31',
    monthStr: y + '-' + pad2(m),
    label: ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][m - 1] + ' ' + y
  };
}

let pbDailyRecordsRef = null;

function loadPbMonth(monthStr) {
  if (!fbDb) return;
  const range = currentMonthRange(monthStr);
  document.getElementById('pbSummaryMonth').innerText = range.label;
  document.getElementById('pbMonthPicker').value = range.monthStr;

  if (pbDailyRecordsRef) pbDailyRecordsRef.off();
  pbDailyRecordsRef = fbDb.ref(FB_PB_ROOT + '/dailyRecords').orderByKey().startAt(range.start).endAt(range.end);
  pbDailyRecordsRef.on('value', function (snapshot) {
    pbMonthlyRecords = snapshot.val() || {};
    renderPbTable();
    if (window.pbStatsRefresh) pbStatsRefresh();
    if (currentDetailOpsId) openPbDetail(currentDetailOpsId);
  }, function (err) { console.error('Gagal baca data Performance Bagger:', err); });
}

function initPbFirebaseSync() {
  if (fbDb) return;
  try { fbDb = firebase.database(); } catch (e) { console.error('Gagal connect Firebase Database:', e); return; }
  const range = currentMonthRange();
  document.getElementById('pbMonthPicker').value = range.monthStr;
  loadPbMonth(range.monthStr);
}

