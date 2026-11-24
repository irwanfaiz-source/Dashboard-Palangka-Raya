/**
 * assets/js/report-agent/chat-messages.js — Gelembung pesan, indikator mengetik, lightbox gambar
 * Bagian 13/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// param "instant": true kalau ini balesan LAMA yang lagi dimuat ulang dari
// histori Firebase (klik sesi di sidebar) — langsung tampil penuh, gak perlu
// efek ngetik typewriter lagi kayak balesan yang baru dateng.
function addMessage(role, text, attachUnits, imageDataUrl, modelLabel, instant){
  playChatSound(role === "user" ? "sent" : "received");
  const log = document.getElementById("chatLog");
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role==="user" ? "user" : "agent");
  const row = document.createElement("div");
  row.className = "msg-row";
  const avatar = document.createElement("div");
  avatar.className = "avatar " + (role==="user" ? "avatar-user" : "avatar-agent");
  if (role === "user"){
    avatar.textContent = "👤";
  } else {
    const logoImg = document.createElement("img");
    logoImg.src = window.__ODYSSEY_LOGO;
    logoImg.alt = "Odyssey";
    avatar.appendChild(logoImg);
  }
  const col = document.createElement("div");
  col.style.display = "flex"; col.style.flexDirection = "column"; col.style.gap = "6px";
  col.style.alignItems = role==="user" ? "flex-end" : "flex-start";

  const who = document.createElement("div");
  who.className = "who";
  const whoText = document.createElement("span");
  whoText.textContent = role==="user" ? getCurrentUserLabel() : "Odyssey";
  who.appendChild(whoText);
  if (role !== "user" && modelLabel){
    const badge = document.createElement("span");
    badge.className = "model-badge";
    badge.textContent = modelLabel;
    who.appendChild(badge);
  }
  col.appendChild(who);

  if (imageDataUrl){
    const img = document.createElement("img");
    img.className = "msg-image";
    img.src = imageDataUrl;
    img.alt = "gambar terlampir";
    img.addEventListener("click", () => openLightbox(imageDataUrl));
    col.appendChild(img);
  }
  let bubble = null;
  if (text && text.trim()){
    bubble = document.createElement("div");
    bubble.className = "bubble";
    if (role === "user"){
      bubble.textContent = text; // pesan user gak perlu markdown/typewriter
    }
    col.appendChild(bubble);
  }
  if (attachUnits && attachUnits.length){
    const card = document.createElement("div");
    card.innerHTML = renderAttachCard(attachUnits);
    col.appendChild(card);
  }
  row.appendChild(avatar);
  row.appendChild(col);
  wrap.appendChild(row);

  // Balasan agent: ngetik dulu (typewriter) baru di-render jadi markdown +
  // syntax highlight begitu kelar. Kalau instant=true (lagi muat ulang sesi
  // lama dari sidebar riwayat), langsung render penuh tanpa animasi ngetik.
  if (role !== "user" && bubble){
    if (instant){
      renderMarkdownInto(bubble, text);
    } else {
      typewriterInto(bubble, text, () => renderMarkdownInto(bubble, text));
    }
  }

  if (role !== "user" && text && text.trim()){
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.type = "button";
    copyBtn.textContent = "📋 Copy";
    copyBtn.addEventListener("click", () => {
      const finish = () => {
        copyBtn.textContent = "✓ Tersalin";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "📋 Copy";
          copyBtn.classList.remove("copied");
        }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(finish).catch(() => {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          finish();
        });
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        finish();
      }
    });
    const actionsRow = document.createElement("div");
    actionsRow.className = "msg-actions";
    actionsRow.appendChild(copyBtn);

    // "Explain": nampilin breakdown angka (Late/On Time/Early + late rate) di
    // BALIK jawaban AI, dihitung langsung dari currentTrips — jadi user bisa
    // audit reasoning-nya tanpa harus nge-prompt ulang.
    const explainBtn = document.createElement("button");
    explainBtn.className = "copy-btn explain-btn";
    explainBtn.type = "button";
    explainBtn.textContent = "💡 Explain";
    let explainPanel = null;
    explainBtn.addEventListener("click", () => {
      if (explainPanel){
        explainPanel.remove();
        explainPanel = null;
        explainBtn.textContent = "💡 Explain";
        return;
      }
      explainBtn.textContent = "💡 Tutup";
      explainPanel = buildExplainPanel(buildExplainData(text));
      col.insertBefore(explainPanel, actionsRow);
    });
    actionsRow.appendChild(explainBtn);

    // "Details": nampilin tabel trip mentah (No Trip/Vendor/Berangkat/Tiba/
    // Status) yang jadi dasar breakdown di atas, buat yang mau cek satu-satu.
    const detailsBtn = document.createElement("button");
    detailsBtn.className = "copy-btn details-btn";
    detailsBtn.type = "button";
    detailsBtn.textContent = "📄 Details";
    let detailsPanel = null;
    detailsBtn.addEventListener("click", () => {
      if (detailsPanel){
        detailsPanel.remove();
        detailsPanel = null;
        detailsBtn.textContent = "📄 Details";
        return;
      }
      detailsBtn.textContent = "📄 Tutup";
      detailsPanel = buildDetailsPanel(buildExplainData(text));
      col.insertBefore(detailsPanel, actionsRow);
    });
    actionsRow.appendChild(detailsBtn);

    col.appendChild(actionsRow);
  }
  log.appendChild(wrap);
  log.scrollTop = log.scrollHeight;
  return wrap;
}

function addTyping(){
  const log = document.getElementById("chatLog");
  const el = document.createElement("div");
  el.className = "msg agent";
  el.id = "typingIndicator";
  el.innerHTML = '<div class="msg-row"><div class="avatar avatar-agent"><img src="" alt="Odyssey" id="typingAvatarImg"></div><div style="display:flex;flex-direction:column;gap:4px;"><div class="who">Odyssey</div><div class="typing-dots"><span></span><span></span><span></span></div></div></div>';
  log.appendChild(el);
  document.getElementById("typingAvatarImg").src = window.__ODYSSEY_LOGO;
  log.scrollTop = log.scrollHeight;
}
function removeTyping(){
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

// ===== Lightbox gambar in-app (ganti window.open tab baru) =====
function openLightbox(url){
  const overlay = document.getElementById("lightboxOverlay");
  document.getElementById("lightboxImg").src = url;
  overlay.classList.add("show");
}
function closeLightbox(){
  document.getElementById("lightboxOverlay").classList.remove("show");
  document.getElementById("lightboxImg").src = "";
}
document.getElementById("lightboxOverlay").addEventListener("click", (e) => {
  if (e.target.id === "lightboxOverlay") closeLightbox();
});
document.getElementById("lightboxCloseBtn").addEventListener("click", closeLightbox);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

