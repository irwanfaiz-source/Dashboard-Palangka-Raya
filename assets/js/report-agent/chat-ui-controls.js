/**
 * assets/js/report-agent/chat-ui-controls.js — Quick reply, New Chat, sidebar riwayat, popover pengaturan tampilan
 * Bagian 15/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Quick-reply shortcut chips =====
const QUICK_REPLIES = [
  "Ada unit Late Arrival hari ini?",
  "Ada unit Convoy hari ini?",
  "Rekap semua trip hari ini",
  "Trip mana aja yang masih In Transit?",
  "Vendor mana yang paling sering telat?"
];
// Switch: false = chip pertanyaan cepat disembunyiin. Ubah ke true buat nyalain lagi.
const SHOW_QUICK_REPLIES = false;
function addQuickReplies(){
  if (!SHOW_QUICK_REPLIES) return;
  const log = document.getElementById("chatLog");
  const wrap = document.createElement("div");
  wrap.className = "quick-replies";
  QUICK_REPLIES.forEach(q => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "quick-reply-chip";
    chip.textContent = q;
    chip.addEventListener("click", () => { chip.parentElement.remove(); askAgent(q, null); });
    wrap.appendChild(chip);
  });
  log.appendChild(wrap);
  log.scrollTop = log.scrollHeight;
}

// ===== New Chat / reset percakapan =====
function startNewChat(){
  document.getElementById("chatLog").innerHTML = "";
  chatHistory = [];
  currentSessionId = null; // sesi baru — belum ada di Firebase sampe pesan pertama kekirim
  clearPendingImage();
  addMessage("agent", "Chat baru dimulai bro. Ada yang bisa gua bantu soal operasional Palangka Raya DC?");
  addQuickReplies();
  refreshSessionsList(); // ngilangin highlight "active" dari sesi lama di sidebar
}
document.getElementById("newChatBtn").addEventListener("click", startNewChat);
document.getElementById("newSessionBtn").addEventListener("click", startNewChat);

// ===== Toggle sidebar riwayat chat =====
document.getElementById("toggleSidebarBtn").addEventListener("click", () => {
  const sidebar = document.getElementById("sessionsSidebar");
  const wasHidden = sidebar.classList.contains("hidden");
  sidebar.classList.toggle("hidden");
  if (wasHidden) refreshSessionsList(); // baru di-fetch pas dibuka, gak perlu polling terus-terusan
});
document.getElementById("closeSidebarBtn").addEventListener("click", () => {
  document.getElementById("sessionsSidebar").classList.add("hidden");
});

// ===== Popover Setting (ukuran font & lebar chat) =====
document.getElementById("settingsBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("settingsPopover").classList.toggle("show");
});
document.addEventListener("click", (e) => {
  const pop = document.getElementById("settingsPopover");
  if (pop.classList.contains("show") && !pop.contains(e.target) && e.target.id !== "settingsBtn"){
    pop.classList.remove("show");
  }
});

// --chat-font-size & --chat-msg-max-width diaplikasiin ke :root biar kepake
// sama semua bubble pesan (lama & baru) sekaligus, gak perlu loop ke tiap
// elemen .msg yang udah kerender. Pilihan disimpen ke localStorage per-browser.
const FONT_SIZE_MAP = { small: "13px", normal: "14px", large: "16px" };
const CHAT_WIDTH_MAP = { narrow: "min(58%, 520px)", normal: "min(78%, 720px)", wide: "min(94%, 960px)" };
function applyFontSize(key){
  document.documentElement.style.setProperty("--chat-font-size", FONT_SIZE_MAP[key] || FONT_SIZE_MAP.normal);
}
function applyChatWidth(key){
  document.documentElement.style.setProperty("--chat-msg-max-width", CHAT_WIDTH_MAP[key] || CHAT_WIDTH_MAP.normal);
}
(function initDisplaySettings(){
  const savedFont = localStorage.getItem("odysseyFontSize") || "normal";
  const savedWidth = localStorage.getItem("odysseyChatWidth") || "normal";
  document.getElementById("fontSizeSelect").value = savedFont;
  document.getElementById("chatWidthSelect").value = savedWidth;
  applyFontSize(savedFont);
  applyChatWidth(savedWidth);
})();
document.getElementById("fontSizeSelect").addEventListener("change", (e) => {
  localStorage.setItem("odysseyFontSize", e.target.value);
  applyFontSize(e.target.value);
});
document.getElementById("chatWidthSelect").addEventListener("change", (e) => {
  localStorage.setItem("odysseyChatWidth", e.target.value);
  applyChatWidth(e.target.value);
});

