/**
 * assets/js/report-agent/rest-time-data.js — Data Rest Time & Asset Usage: fetch, status live, edit/hapus log, kartu konfirmasi
 * Bagian 3/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Firebase live fetch — Rest Time & Asset Usage (prDcMonitoring) =====
// Ambil 4 node sekaligus (logs, assetLogs, master, pdaStationMap) paralel.
// "logs" & "assetLogs" dibatasin MON_WINDOW_DAYS hari terakhir (sama kayak
// window yang ditampilin rest-time.html sendiri) biar dump JSON ke AI gak
// membengkak nyeret histori lama yang gak relevan buat pertanyaan real-time.
function getMonWindowStartDate(){
  const d = new Date();
  d.setDate(d.getDate() - MON_WINDOW_DAYS);
  return formatDateYYYYMMDDLocal(d);
}
function fetchRestAssetData(){
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
    const startDate = getMonWindowStartDate();
    Promise.all([
      db.ref(MON_LOGS_PATH).orderByChild("workingDate").startAt(startDate).once("value"),
      db.ref(MON_ASSET_PATH).orderByChild("workingDate").startAt(startDate).once("value"),
      db.ref(MON_MASTER_PATH).once("value"),
      db.ref(MON_STATION_PATH).once("value")
    ]).then(([logsSnap, assetSnap, masterSnap, stationSnap]) => {
      const logsVal = logsSnap.val() || {};
      const assetVal = assetSnap.val() || {};
      resolve({
        // "_key" WAJIB disertain (dulu kebuang) — dipakai buat nyari-balik entry Firebase asli pas ada
        // aksi Edit Jam / Delete Activity dari Odyssey. AI TETAP gak pernah disuruh nebak "_key" ini
        // sendiri (beda dari kasus assetId Stock) — sistem yang nyari entry-nya lewat opsId+tanggal
        // pas eksekusi, _key ini cuma dipakai internal buat targetin update/remove-nya.
        logs: Object.keys(logsVal).map(k => Object.assign({ _key: k }, logsVal[k])),
        assetLogs: Object.keys(assetVal).map(k => Object.assign({ _key: k }, assetVal[k])),
        master: masterSnap.val() || {},
        stationMap: stationSnap.val() || {}
      });
    }).catch(reject);
  });
}

// ================= REST TIME & ASSET USAGE - HELPER & AKSI TULIS (dari Odyssey) =================
// parseDateTime niru PERSIS fungsi sama persis di rest-time.html (format "YYYY-MM-DD HH:mm:ss", lokal
// WIB, BUKAN ISO/UTC) — dipakai bareng buat hitung durasi statusLiveTerkini di bawah.
function monParseDateTime(str){
  if (!str) return null;
  const t = String(str).split(/[- :]/);
  return new Date(t[0], t[1]-1, t[2], t[3]||0, t[4]||0, t[5]||0);
}

// Hitung 2 status live yang paling sering ditanya, DI SINI (JS) — bukan diserahin ke AI — niru persis
// checkRestOvertimeAlert() (>60 menit) & getActiveAssetLock()/last-action check (PDA belum kembali) di
// rest-time.html, biar jawabannya selalu konsisten sama yang ditampilin dashboard aslinya.
function computeRestAssetLiveStatus(logs, assetLogs, master, stationMap){
  const now = new Date();

  // --- Operator yang lagi Break Out & udah >60 menit ---
  const byOpsRest = {};
  logs.forEach(function (l) { (byOpsRest[l.opsId] = byOpsRest[l.opsId] || []).push(l); });
  const operatorIstirahatLebih60Menit = [];
  Object.keys(byOpsRest).forEach(function (opsId) {
    const arr = byOpsRest[opsId].slice().sort(function (a, b) { return monParseDateTime(a.timestamp) - monParseDateTime(b.timestamp); });
    const last = arr[arr.length - 1];
    if (last && last.breakType === "Break Out"){
      const breakOutTime = monParseDateTime(last.timestamp);
      const durasiMenit = Math.floor((now - breakOutTime) / 60000);
      if (durasiMenit > 60){
        const u = master[opsId] || {};
        operatorIstirahatLebih60Menit.push({
          opsId: opsId, nama: u.name || "(tanpa nama)", dept: u.dept || "-", agency: u.agency || "-",
          jamBreakOut: last.timestamp, durasiMenit: durasiMenit
        });
      }
    }
  });
  operatorIstirahatLebih60Menit.sort(function (a, b) { return b.durasiMenit - a.durasiMenit; });

  // --- PDA yang aksi terakhirnya "Pinjam PDA" (belum "Kembali PDA") ---
  const byAssetSn = {};
  assetLogs.forEach(function (l) { (byAssetSn[l.serialNumber] = byAssetSn[l.serialNumber] || []).push(l); });
  const belumKembaliFlat = [];
  Object.keys(byAssetSn).forEach(function (sn) {
    const arr = byAssetSn[sn].slice().sort(function (a, b) { return monParseDateTime(a.timestamp) - monParseDateTime(b.timestamp); });
    const last = arr[arr.length - 1];
    if (last && last.action === "Pinjam PDA"){
      const u = master[last.opsId] || {};
      const pinjamTime = monParseDateTime(last.timestamp);
      belumKembaliFlat.push({
        station: stationMap[sn] || "(station tidak diketahui)", serialNumber: sn, last5Sn: last.last5Sn || sn.slice(-5),
        opsId: last.opsId, namaPeminjam: u.name || "(tanpa nama)", jamPinjam: last.timestamp,
        durasiJam: Number(((now - pinjamTime) / 3600000).toFixed(1))
      });
    }
  });
  const pdaBelumKembaliPerStation = {};
  belumKembaliFlat.forEach(function (it) { (pdaBelumKembaliPerStation[it.station] = pdaBelumKembaliPerStation[it.station] || []).push(it); });

  return {
    catatan: "operatorIstirahatLebih60Menit & pdaBelumKembaliPerStation UDAH final dihitung sistem persis kayak alert dashboard, JANGAN dihitung ulang.",
    operatorIstirahatLebih60Menit: operatorIstirahatLebih60Menit,
    pdaBelumKembaliPerStation: pdaBelumKembaliPerStation
  };
}

// Edit Jam by OpsID — niru persis makeTimeEditable() di rest-time.html: kalau entry breakType itu udah
// ada di tanggal itu, UPDATE timestamp-nya; kalau belum pernah ada sama sekali, BIKIN BARU (cycleNum
// default 1, sama kayak perilaku "Input Manual" di dashboard aslinya).
async function monUpdateLogTime(opsId, breakType, dateStr, newTime){
  const db = firebase.database();
  const targetLog = currentRestLogs.find(function (l) { return l.opsId === opsId && l.workingDate === dateStr && l.breakType === breakType; });
  const newTimestamp = dateStr + " " + newTime + ":00";
  if (targetLog){
    await db.ref(MON_LOGS_PATH + "/" + targetLog._key).update({ timestamp: newTimestamp });
  } else {
    const newKey = db.ref(MON_LOGS_PATH).push().key;
    await db.ref(MON_LOGS_PATH + "/" + newKey).set({ opsId: opsId, breakType: breakType, timestamp: newTimestamp, workingDate: dateStr, cycleNum: 1 });
  }
}

// Delete Activity — niru persis removeOpsIdLog() di rest-time.html: hapus SEMUA log opsId itu di
// tanggal itu, buat modul "rest" (Rest Time) ATAU "asset" (Asset Usage PDA). WAJIB dicek
// window.__authCanDelete DULU (Firebase Rules-nya emang butuh whitelist admin buat delete — beda dari
// create/update yang kebuka buat semua user authenticated).
async function monDeleteActivity(opsId, dateStr, module){
  if (!window.__authCanDelete){
    throw new Error("Kamu gak punya akses buat hapus data di modul ini (cuma admin tertentu yang bisa). Hubungi admin kalau ini kesalahan.");
  }
  const db = firebase.database();
  const path = module === "asset" ? MON_ASSET_PATH : MON_LOGS_PATH;
  const source = module === "asset" ? currentAssetLogs : currentRestLogs;
  const matched = source.filter(function (l) { return l.opsId === opsId && l.workingDate === dateStr; });
  if (!matched.length) throw new Error("Gak ada aktivitas " + opsId + " tanggal " + dateStr + " di modul ini — mungkin udah kehapus / salah tanggal.");
  const updates = {};
  matched.forEach(function (l) { updates[path + "/" + l._key] = null; });
  await db.ref().update(updates);
  return matched.length;
}

// Kartu konfirmasi Rest Time & Asset Usage — pola SAMA PERSIS kayak renderInventoryActionConfirmCard:
// TIDAK ADA yang kesimpen sebelum user klik "Konfirmasi & Simpan".
function renderRestActionConfirmCard(action){
  const chatLog = document.getElementById("chatLog");
  if (!chatLog || !action || !action.type) return;

  const wrap = document.createElement("div");
  wrap.className = "msg agent";
  const row = document.createElement("div");
  row.className = "msg-row";
  const avatar = document.createElement("div");
  avatar.className = "avatar avatar-agent";
  const logoImg = document.createElement("img");
  logoImg.src = window.__ODYSSEY_LOGO; logoImg.alt = "Odyssey";
  avatar.appendChild(logoImg);

  const card = document.createElement("div");
  card.className = "bubble";
  const isDelete = action.type === "delete_activity";
  card.style.border = isDelete ? "1px solid #ef4444" : "1px solid #f5a623";
  card.style.background = isDelete ? "rgba(239,68,68,0.10)" : "rgba(245,166,35,0.10)";

  const title = document.createElement("div");
  title.style.fontWeight = "600"; title.style.marginBottom = "8px";
  title.textContent = isDelete ? "🗑️ Konfirmasi Delete Activity" : "🕒 Konfirmasi Edit Jam";
  card.appendChild(title);

  const knownUser = monMasterKaryawan[action.opsId];
  const list = document.createElement("div");
  list.style.fontSize = "14px"; list.style.marginBottom = "10px"; list.style.lineHeight = "1.7";
  let hasInvalidItem = !knownUser; // opsId gak ketemu di masterKaryawan -> tandain, jangan blok total
  const lines = [];
  lines.push("• OpsID: " + action.opsId + (knownUser ? " (" + knownUser.name + ")" : " ⚠️ (gak ketemu di Master Karyawan)"));
  lines.push("• Tanggal: " + action.date);
  if (isDelete){
    lines.push("• Modul: " + (action.module === "asset" ? "Asset Usage (PDA)" : "Rest Time"));
    lines.push("• ⚠️ Aksi ini HAPUS SEMUA aktivitas opsId ini di tanggal itu, gak bisa dibatalin lagi.");
    if (!window.__authCanDelete){ hasInvalidItem = true; lines.push("• 🚫 Kamu gak punya akses hapus data (cuma admin tertentu)."); }
  } else {
    lines.push("• Jenis Status: " + action.breakType);
    lines.push("• Jam Baru: " + action.newTime);
  }
  list.innerHTML = lines.map(function (l) { return String(l).replace(/</g, "&lt;"); }).join("<br>");
  card.appendChild(list);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex"; btnRow.style.gap = "8px"; btnRow.style.flexWrap = "wrap";
  const okBtn = document.createElement("button");
  okBtn.type = "button"; okBtn.className = "quick-reply-chip";
  okBtn.textContent = isDelete ? "✅ Ya, Hapus" : "✅ Konfirmasi & Simpan";
  if (hasInvalidItem) okBtn.disabled = true;
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button"; cancelBtn.className = "quick-reply-chip"; cancelBtn.textContent = "❌ Batal";

  okBtn.addEventListener("click", async function () {
    okBtn.disabled = true; cancelBtn.disabled = true; okBtn.textContent = "⏳ Memproses...";
    try{
      if (!firebase.auth().currentUser) throw new Error("Belum login.");
      if (isDelete){
        const count = await monDeleteActivity(action.opsId, action.date, action.module);
        title.textContent += " — " + count + " entry terhapus ✅";
      } else {
        await monUpdateLogTime(action.opsId, action.breakType, action.date, action.newTime);
        title.textContent += " — Tersimpan ✅";
      }
      try{
        const fresh = await fetchRestAssetData();
        currentRestLogs = fresh.logs; currentAssetLogs = fresh.assetLogs;
        monMasterKaryawan = fresh.master; monPdaStationMap = fresh.stationMap;
      }catch(e){ /* gagal refresh gak fatal */ }
      btnRow.remove();
      chatHistory.push({ role: "assistant", content: "[" + title.textContent + "]" });
      scheduleSaveSession();
      playChatSound("received");
    }catch(e){
      console.error(e);
      okBtn.disabled = !!hasInvalidItem; cancelBtn.disabled = false;
      okBtn.textContent = isDelete ? "✅ Ya, Hapus" : "✅ Konfirmasi & Simpan";
      const errLine = document.createElement("div");
      errLine.style.color = "#ff6b6b"; errLine.style.marginTop = "8px"; errLine.style.fontSize = "13px";
      errLine.textContent = "Gagal: " + (e && e.message ? e.message : String(e));
      card.appendChild(errLine);
    }
  });
  cancelBtn.addEventListener("click", function () {
    title.textContent += " — Dibatalkan";
    btnRow.remove();
  });

  btnRow.appendChild(okBtn); btnRow.appendChild(cancelBtn);
  card.appendChild(btnRow);
  row.appendChild(avatar); row.appendChild(card);
  wrap.appendChild(row);
  chatLog.appendChild(wrap);
  chatLog.scrollTop = chatLog.scrollHeight;
}


