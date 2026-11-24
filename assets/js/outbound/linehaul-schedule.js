/**
 * assets/js/outbound/linehaul-schedule.js — Jadwal Linehaul, daftar route, peta jam berangkat hub
 * Bagian 5/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

const linehaulSchedule = [
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

function getShiftFromTimeStr(timeStr) {
  if(!timeStr || timeStr === '-') return 'Shift 1';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10) || 0;
  const totalMinutes = hour * 60 + minute;

  const GRACE = 40;

  if (totalMinutes >= GRACE && totalMinutes < (8 * 60) + GRACE) return 'Shift 1';
  if (totalMinutes >= (8 * 60) + GRACE && totalMinutes < (16 * 60) + GRACE) return 'Shift 2';
  return 'Shift 3';
}

const linehaulRoutesFallback = Array.from(new Set(linehaulSchedule.map(s => s.dest))).map((label, idx) => {
  const hubs = Array.from(new Set(linehaulSchedule.filter(s => s.dest === label).flatMap(s => s.hubs)));
  return { id: idx + 1, label: label, hubs: hubs };
});
// Daftar route tabel Occupancy = UNIQUE(Route) dari Schedule Outbound; kalau Sheet belum/gagal load, pakai daftar bawaan di atas
let linehaulRoutes = linehaulRoutesFallback.slice();

const knownHubVariants = {};
linehaulSchedule.forEach(s => s.hubs.forEach(h => {
  const k = String(h).toLowerCase();
  (knownHubVariants[k] = knownHubVariants[k] || []).indexOf(h) < 0 && knownHubVariants[k].push(h);
}));
function hubKey(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function routeHasHub(route, name) {
  if (!route.hubSet) route.hubSet = new Set(route.hubs.map(hubKey));
  return route.hubSet.has(hubKey(name));
}
function rebuildLinehaulRoutesFromSchedule(rows) {
  const seen = new Set(), out = [];
  (rows || []).forEach(r => {
    const raw = String(r.route || '').replace(/\s+/g, ' ').trim();
    const i = raw.indexOf('>');
    if (i < 0) return;
    const key = raw.toLowerCase();
    if (seen.has(key)) return; // UNIQUE: 1 route cuma 1 baris walau slot-nya banyak
    seen.add(key);
    const hubs = [];
    raw.slice(i + 1).split(/\s*>\s*|\s+-\s+/).map(x => x.trim()).filter(Boolean).forEach(h => {
      [h].concat(knownHubVariants[hubKey(h)] || []).forEach(v => { if (hubs.indexOf(v) < 0) hubs.push(v); });
    });
    out.push({ id: out.length + 1, label: raw, hubs: hubs });
  });
  if (!out.length) return false;
  linehaulRoutes = out;
  return true;
}
window.schedRoutesChanged = function (rows) {
  if (rebuildLinehaulRoutesFromSchedule(rows) && typeof filteredData !== 'undefined' && filteredData.length > 0) renderDashboard();
};

function timeStrToMinutes(timeStr) {
  const parts = String(timeStr || '0:0').split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

const hubDepartureMinutesMap = {};
linehaulSchedule.forEach(s => {
  const mins = timeStrToMinutes(s.time);
  s.hubs.forEach(h => {
    if (!hubDepartureMinutesMap[h]) hubDepartureMinutesMap[h] = [];
    hubDepartureMinutesMap[h].push(mins);
  });
});
Object.keys(hubDepartureMinutesMap).forEach(h => hubDepartureMinutesMap[h].sort((a, b) => a - b));

function getDeliveryShiftForItem(item) {
  if (!item.completeDateObj) return item.shift;
  const packMinutes = item.completeDateObj.getHours() * 60 + item.completeDateObj.getMinutes();
  const times = hubDepartureMinutesMap[item.receiverName];
  if (!times || times.length === 0) return item.shift;

  let nextMinutes = times.find(t => t >= packMinutes);
  if (nextMinutes === undefined) nextMinutes = times[0];

  const hh = String(Math.floor(nextMinutes / 60)).padStart(2, '0');
  const mm = String(nextMinutes % 60).padStart(2, '0');
  return getShiftFromTimeStr(`${hh}:${mm}`);
}

