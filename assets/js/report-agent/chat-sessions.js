/**
 * assets/js/report-agent/chat-sessions.js — Simpan & muat riwayat chat per-user ke/dari Firebase
 * Bagian 16/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Simpen & muat histori chat per-user ke/dari Firebase =====
// (bukan cuma di memory browser kayak sebelumnya — refresh/ganti device,
// histori tetep ada selama masih login akun yang sama & masih online).
function getCurrentUid(){
  try{
    const u = window.firebase && firebase.auth && firebase.auth().currentUser;
    return u ? u.uid : null;
  }catch(e){ return null; }
}
// Ubah email user yang lagi login jadi nama tampilan buat label chat.
// Contoh: "irwan.faiz@spxexpress.com" -> "Irwan Faiz". Kalau gagal
// (belum login / gak ada email di akun), fallback ke "Lo" kayak sebelumnya.
function getCurrentUserLabel(){
  try{
    const u = window.firebase && firebase.auth && firebase.auth().currentUser;
    if (!u || !u.email) return "Lo";
    const namePart = u.email.split("@")[0];
    const nameFormatted = namePart
      .split(/[.\-_]+/)
      .filter(Boolean)
      .map(function(s){ return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); })
      .join(" ");
    return nameFormatted || "Lo";
  }catch(e){ return "Lo"; }
}
function newSessionId(){
  return "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}
// Jangan simpen base64 gambar mentah ke Firebase (bisa berat banget & bikin
// database bengkak) — pas nyimpen histori, konten gambar diganti placeholder
// teks aja. Gambar tetep kepake normal buat sesi yang lagi jalan (di memory).
function sanitizeMessagesForSave(history){
  return history.map(function(m){
    if (Array.isArray(m.content)){
      const textPart = m.content.find(function(p){ return p && p.type === "text"; });
      return { role: m.role, content: (textPart && textPart.text) || "(kirim gambar)" };
    }
    return { role: m.role, content: String(m.content == null ? "" : m.content) };
  });
}
function scheduleSaveSession(){
  if (!firebaseReady) return; // mode mock/offline: histori cuma kesimpen di memory browser aja
  if (!chatHistory.length) return;
  clearTimeout(saveSessionTimer);
  saveSessionTimer = setTimeout(saveSessionNow, 900); // debounce biar gak nulis tiap detik
}
function saveSessionNow(){
  const uid = getCurrentUid();
  if (!uid || !window.firebase || !firebase.database) return;
  if (!currentSessionId) currentSessionId = newSessionId();
  const firstUserMsg = chatHistory.find(function(m){ return m.role === "user"; });
  let title = "Chat baru";
  if (firstUserMsg){
    const raw = Array.isArray(firstUserMsg.content)
      ? ((firstUserMsg.content.find(function(p){ return p && p.type === "text"; }) || {}).text || "Kirim gambar")
      : String(firstUserMsg.content || "");
    title = raw.trim().slice(0, 60) || "Chat baru";
  }
  const payload = {
    title: title,
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
    messages: sanitizeMessagesForSave(chatHistory)
  };
  firebase.database().ref(ODYSSEY_CHAT_ROOT + "/" + uid + "/" + currentSessionId).set(payload)
    .then(function(){ refreshSessionsList(); })
    .catch(function(e){ console.warn("Gagal simpen histori chat:", e.message); });
}
function refreshSessionsList(){
  const listEl = document.getElementById("sessionsList");
  const uid = getCurrentUid();
  if (!uid || !window.firebase || !firebase.database){
    listEl.innerHTML = '<div class="sessions-empty">Riwayat cuma kesimpen kalau lagi login &amp; online bro.</div>';
    return;
  }
  firebase.database().ref(ODYSSEY_CHAT_ROOT + "/" + uid).once("value")
    .then(function(snap){
      const items = [];
      snap.forEach(function(child){
        const v = child.val() || {};
        items.push({ id: child.key, title: v.title || "Chat", updatedAt: v.updatedAt || 0 });
      });
      items.sort(function(a, b){ return b.updatedAt - a.updatedAt; });
      renderSessionsList(items);
    })
    .catch(function(e){
      listEl.innerHTML = '<div class="sessions-empty">Gagal muat riwayat: ' + e.message + '</div>';
    });
}
function renderSessionsList(items){
  const listEl = document.getElementById("sessionsList");
  listEl.innerHTML = "";
  if (!items.length){
    listEl.innerHTML = '<div class="sessions-empty">Belum ada riwayat chat.</div>';
    return;
  }
  items.forEach(function(it){
    const el = document.createElement("button");
    el.type = "button";
    el.className = "session-item" + (it.id === currentSessionId ? " active" : "");
    const titleEl = document.createElement("span");
    titleEl.className = "session-title";
    titleEl.textContent = it.title;
    const metaEl = document.createElement("span");
    metaEl.className = "session-meta";
    if (it.updatedAt){
      const d = new Date(it.updatedAt);
      const pad = function(n){ return String(n).padStart(2, "0"); };
      metaEl.textContent = pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
    el.appendChild(titleEl);
    el.appendChild(metaEl);
    el.addEventListener("click", function(){ loadSession(it.id); });
    listEl.appendChild(el);
  });
}
function loadSession(sessionId){
  const uid = getCurrentUid();
  if (!uid || !window.firebase || !firebase.database) return;
  firebase.database().ref(ODYSSEY_CHAT_ROOT + "/" + uid + "/" + sessionId).once("value")
    .then(function(snap){
      const v = snap.val();
      if (!v) return;
      currentSessionId = sessionId;
      const msgs = Array.isArray(v.messages) ? v.messages : [];
      document.getElementById("chatLog").innerHTML = "";
      chatHistory = [];
      clearPendingImage();
      msgs.forEach(function(m){
        const role = m.role === "user" ? "user" : "assistant";
        chatHistory.push({ role: role, content: m.content });
        addMessage(role === "user" ? "user" : "agent", m.content, null, null, null, true);
      });
      refreshSessionsList();
    })
    .catch(function(e){ console.warn("Gagal muat sesi:", e.message); });
}

