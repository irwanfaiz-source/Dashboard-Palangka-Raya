/**
 * assets/js/report-agent/inventory-actions.js — Aksi tulis Inventory (update stock, usage log, audit) + kartu konfirmasi di chat
 * Bagian 7/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ================= INVENTORY CONTROL - AKSI TULIS (Update Stock & Submit Usage Log) =================
// PENTING soal Firebase Rules: kita SENGAJA gak pernah overwrite whole node "stock/{id}" (itu butuh
// whitelist admin di rules). Update qty pakai .transaction() cuma di path "stock/{id}/qty" +
// .update() cuma di "updatedAt"/"updatedBy" — dua-duanya nested rule-nya cuma butuh auth != null &
// bukan email yang di-banned (securty-swat / mmpalangkarayadc), SAMA PERSIS pola proceedSubmitUsageLog()
// di inventory-control.html. Ini bikin fitur ini jalan buat SEMUA user yang emang udah punya akses ke
// modul Inventory Control, gak perlu whitelist tambahan.
function invLogAudit(module, action, itemName, detail){
  const db = firebase.database();
  const facilityRoot = FB_INV_ROOT + "/" + INV_FACILITY;
  const payload = {
    module: module, action: action, itemName: itemName, detail: detail || "",
    changedAt: Date.now(), changedBy: (firebase.auth().currentUser && firebase.auth().currentUser.email) || "-"
  };
  return db.ref(facilityRoot + "/auditLog").push().set(payload).catch(function (e) { console.error("invLogAudit gagal:", e); });
}

// Update Stock: nambah/ngurangin qty asset yang UDAH ADA di Stock. delta boleh positif (restock) atau
// negatif (koreksi manual) — beda dari Usage Log yang otomatis ngurangin qty + nyatet history pemakaian.
async function invUpdateStockQty(assetId, delta, assetNameFallback){
  // Pengaman WAJIB: jangan pernah percaya assetId dari AI mentah-mentah. Kalau ID ini gak beneran ada
  // di Stock saat ini, Firebase .transaction() bakal bikin NODE BARU kosong (cuma field qty doang) —
  // itu row sampah, bukan koreksi ke item yang dimaksud. Makanya divalidasi dulu di sini SEBELUM nulis.
  if (!currentInvStock[assetId]){
    throw new Error("Asset ID \"" + assetId + "\" gak ketemu di Stock saat ini — kemungkinan AI salah tangkep/nebak ID, dibatalkan biar gak bikin data sampah. Coba sebutin ulang nama barangnya lebih spesifik.");
  }
  const db = firebase.database();
  const facilityRoot = FB_INV_ROOT + "/" + INV_FACILITY;
  const userEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || "-";
  const txResult = await db.ref(facilityRoot + "/stock/" + assetId + "/qty").transaction(function (curQty) {
    return (Number(curQty) || 0) + delta;
  });
  if (!txResult.committed) throw new Error("Transaction update qty gagal / dibatalkan Firebase.");
  await db.ref(facilityRoot + "/stock/" + assetId).update({ updatedAt: Date.now(), updatedBy: userEmail });
  const newQty = txResult.snapshot.val();
  const assetName = (currentInvStock[assetId] && currentInvStock[assetId].name) || assetNameFallback || assetId;
  await invLogAudit("Stock", "update", assetName, (delta >= 0 ? "+" : "") + delta + " -> qty jadi " + newQty + " (via Odyssey)");
  return newQty;
}

// Submit Usage Log: bikin entry log baru + otomatis ngurangin qty stock terkait (transaction), niru
// persis proceedSubmitUsageLog() di inventory-control.html — SATU per SATU berurutan biar aman kalau ada
// yang gagal di tengah jalan.
async function invSubmitUsageLog(items, dateStr, devisi, stockSnapshot){
  const db = firebase.database();
  const facilityRoot = FB_INV_ROOT + "/" + INV_FACILITY;
  const userEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || "-";
  const resolvedDevisi = devisi || invGetDevisiForEmail(userEmail);
  for (const item of items){
    const asset = stockSnapshot[item.assetId];
    if (!asset) throw new Error("Asset ID \"" + item.assetId + "\" gak ketemu di Stock (mungkin udah dihapus).");
    const logPayload = {
      assetId: item.assetId, assetName: asset.name || "-", unit: asset.unit || "-",
      qtyUsed: item.qty, workingDate: dateStr, devisi: resolvedDevisi,
      createdAt: Date.now(), createdBy: userEmail
    };
    const newKey = db.ref(facilityRoot + "/usageLogs").push().key;
    await db.ref(facilityRoot + "/usageLogs/" + newKey).set(logPayload);
    await db.ref(facilityRoot + "/stock/" + item.assetId + "/qty").transaction(function (curQty) {
      return (Number(curQty) || 0) - item.qty;
    });
    await db.ref(facilityRoot + "/stock/" + item.assetId).update({ updatedAt: Date.now(), updatedBy: userEmail });
  }
  const itemNames = items.map(function (it) { return (stockSnapshot[it.assetId].name || it.assetId) + " (" + it.qty + ")"; }).join(", ");
  await invLogAudit("Log Usage", "create", itemNames, "Tanggal: " + dateStr + ", Divisi: " + (INV_DEVISI_LABELS[resolvedDevisi] || resolvedDevisi) + " (via Odyssey)");
}

// Kartu konfirmasi di chat — Odyssey CUMA nyiapin rencana aksi (parsed.inventoryAction dari Gemini),
// TIDAK PERNAH nulis langsung ke Firebase. Baru beneran kesimpen kalau user klik "Konfirmasi & Simpan"
// di sini. Ini pengaman wajib karena AI bisa aja salah tangkep nama barang/qty dari kalimat user.
function renderInventoryActionConfirmCard(action){
  const chatLog = document.getElementById("chatLog");
  if (!chatLog || !action || !Array.isArray(action.items) || !action.items.length) return;

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
  card.style.border = "1px solid #f5a623";
  card.style.background = "rgba(245,166,35,0.10)";

  const title = document.createElement("div");
  title.style.fontWeight = "600"; title.style.marginBottom = "8px";
  title.textContent = action.type === "usage_log" ? "📋 Konfirmasi Submit Usage Log" : "📦 Konfirmasi Update Stock";
  card.appendChild(title);

  const list = document.createElement("div");
  list.style.fontSize = "14px"; list.style.marginBottom = "10px"; list.style.lineHeight = "1.7";
  const lines = [];
  if (action.type === "usage_log" && action.date) lines.push("Tanggal: " + action.date);
  // Validasi assetId SEBELUM ditampilin — kalau ID-nya gak ketemu di Stock saat ini (AI kemungkinan
  // salah tangkep/nebak), tandain di sini biar user liat masalahnya SEBELUM klik simpan, bukan sesudah.
  let hasInvalidItem = false;
  action.items.forEach(function (it) {
    const known = currentInvStock[it.assetId];
    if (!known){ hasInvalidItem = true; }
    const label = "• " + (known ? known.name : (it.assetName || it.assetId)) +
      (known ? "" : " ⚠️ (ID gak ketemu di Stock — kemungkinan salah tangkep AI)");
    if (action.type === "usage_log"){
      lines.push(label + " — qty terpakai: " + it.qty);
    } else {
      lines.push(label + " — " + (it.delta >= 0 ? "+" : "") + it.delta +
        (it.expectedNewQty !== undefined && it.expectedNewQty !== null ? " (qty jadi ±" + it.expectedNewQty + ")" : ""));
    }
  });
  list.innerHTML = lines.map(function (l) { return String(l).replace(/</g, "&lt;"); }).join("<br>");
  card.appendChild(list);

  if (hasInvalidItem){
    const warn = document.createElement("div");
    warn.style.color = "#ff6b6b"; warn.style.fontSize = "13px"; warn.style.marginBottom = "10px";
    warn.textContent = "⚠️ Ada item yang ID-nya gak valid — tombol Konfirmasi dimatiin biar gak kebentuk data sampah. Coba sebutin ulang nama barangnya.";
    card.appendChild(warn);
  }

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex"; btnRow.style.gap = "8px"; btnRow.style.flexWrap = "wrap";
  const okBtn = document.createElement("button");
  okBtn.type = "button"; okBtn.className = "quick-reply-chip"; okBtn.textContent = "✅ Konfirmasi & Simpan";
  if (hasInvalidItem) okBtn.disabled = true;
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button"; cancelBtn.className = "quick-reply-chip"; cancelBtn.textContent = "❌ Batal";

  okBtn.addEventListener("click", async function () {
    okBtn.disabled = true; cancelBtn.disabled = true; okBtn.textContent = "⏳ Menyimpan...";
    try{
      if (!firebase.auth().currentUser) throw new Error("Belum login.");
      if (action.type === "usage_log"){
        await invSubmitUsageLog(action.items, action.date || invTodayStrLocal(), action.devisi, currentInvStock);
      } else {
        for (const it of action.items){ await invUpdateStockQty(it.assetId, it.delta, it.assetName); }
      }
      try{
        const fresh = await fetchInventoryControlData();
        currentInvStock = fresh.stock; currentInvUsageLogs = fresh.usageLogs;
        currentInvAssetItNca = fresh.assetItNca; currentInvAuditLog = fresh.auditLog;
      }catch(e){ /* gagal refresh data gak fatal, tetep udah kesimpen */ }
      title.textContent += " — Tersimpan ✅";
      btnRow.remove();
      chatHistory.push({ role: "assistant", content: "[" + title.textContent + "]" });
      scheduleSaveSession();
      playChatSound("received");
    }catch(e){
      console.error(e);
      okBtn.disabled = false; cancelBtn.disabled = false; okBtn.textContent = "✅ Konfirmasi & Simpan";
      const errLine = document.createElement("div");
      errLine.style.color = "#ff6b6b"; errLine.style.marginTop = "8px"; errLine.style.fontSize = "13px";
      errLine.textContent = "Gagal simpan: " + (e && e.message ? e.message : String(e));
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

