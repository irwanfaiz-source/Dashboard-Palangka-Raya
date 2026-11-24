/**
 * assets/js/report-agent/command-palette.js — Command Bar / AI Command Palette dan shortcut Ctrl+K
 * Bagian 14/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Command Bar / AI Command Palette =====
// Ketik "/" di chat input buat munculin daftar shortcut command (/late, /convoy,
// /report, /vendor, /queue, /stock, /dw, /summary), atau tetep bisa ngetik
// pertanyaan natural language bebas kayak biasa. Setiap command di-map ke kalimat
// pertanyaan yang udah kena kata kunci deteksi topik di askAgent() (lihat
// dwKeywords/queueKeywords/inventoryControlKeywords/dataKeywords di atas), jadi
// hasilnya sama persis kayak user ngetik manual.
const SLASH_COMMANDS = [
  { cmd: "/late",    icon: "🕒", label: "Late Arrival",    desc: "Cek unit yang Late Arrival hari ini",         query: "Ada unit Late Arrival hari ini?" },
  { cmd: "/convoy",  icon: "🚚", label: "Convoy",           desc: "Cek unit yang jalan Convoy/beriringan",       query: "Ada unit Convoy hari ini?" },
  { cmd: "/report",  icon: "📋", label: "Report Trip",      desc: "Rekap lengkap trip Inbound hari ini",         query: "Buatkan report lengkap trip Inbound hari ini" },
  { cmd: "/vendor",  icon: "🏢", label: "Vendor",           desc: "Analisa performa & keterlambatan vendor",     query: "Vendor mana yang paling sering telat?" },
  { cmd: "/queue",   icon: "🚦", label: "Antrian Inbound",  desc: "Report Antrian Inbound (ECO vs STD)",         query: "Buatkan Report Antrian Inbound (ECO vs STD) hari ini" },
  { cmd: "/stock",   icon: "📦", label: "Stock",            desc: "Cek stock inventory yang udah menipis",       query: "Stock barang apa aja yang udah menipis?" },
  { cmd: "/dw",      icon: "👷", label: "DW Fulfillment",   desc: "Report pemenuhan Daily Worker",               query: "Buatkan Report DW Fulfillment hari ini" },
  { cmd: "/summary", icon: "🧾", label: "Summary",          desc: "Rekap semua trip hari ini",                   query: "Rekap semua trip hari ini" },
  { cmd: "/panduan", icon: "📖", label: "Panduan Rest Time", desc: "Cara pakai Rest Time & Asset Usage Monitoring", query: "Jelasin cara pakai Rest Time Monitoring dari awal sampai akhir" },
  { cmd: "/prework", icon: "📝", label: "Panduan Pre-Work", desc: "Kenapa Check In diblok Pre-Work & solusinya", query: "Kenapa Check In di Rest Time bisa diblok karena Pre-Work dan gimana solusinya?" },
];
let cmdPaletteMatches = [];
let cmdPaletteIndex = 0;

function renderCmdPalette(matches){
  cmdPaletteMatches = matches;
  cmdPaletteIndex = 0;
  const wrap = document.getElementById("cmdPalette");
  wrap.innerHTML = "";
  const hint = document.createElement("div");
  hint.className = "cmd-palette-hint";
  hint.textContent = "Command — ↑↓ pilih, Enter jalanin";
  wrap.appendChild(hint);
  matches.forEach((c, i) => {
    const item = document.createElement("div");
    item.className = "cmd-palette-item" + (i === 0 ? " active" : "");
    item.innerHTML = `<span class="cmd-icon">${c.icon}</span><div class="cmd-text"><span class="cmd-name">${c.cmd}</span><span class="cmd-desc">${c.label} — ${c.desc}</span></div>`;
    item.addEventListener("mousedown", (e) => {
      e.preventDefault(); // biar input gak keburu blur sebelum kita proses klik
      runSlashCommand(c);
    });
    wrap.appendChild(item);
  });
  wrap.classList.add("show");
}
function hideCmdPalette(){
  const wrap = document.getElementById("cmdPalette");
  wrap.classList.remove("show");
  wrap.innerHTML = "";
  cmdPaletteMatches = [];
  cmdPaletteIndex = 0;
}
function isCmdPaletteOpen(){
  return cmdPaletteMatches.length > 0;
}
function highlightCmdPaletteIndex(){
  const wrap = document.getElementById("cmdPalette");
  Array.from(wrap.querySelectorAll(".cmd-palette-item")).forEach((el, i) => {
    el.classList.toggle("active", i === cmdPaletteIndex);
  });
}
function updateCmdPalette(value){
  if (!value.startsWith("/")){ hideCmdPalette(); return; }
  const token = value.slice(1).toLowerCase();
  const matches = SLASH_COMMANDS.filter(c =>
    c.cmd.slice(1).toLowerCase().startsWith(token) || c.label.toLowerCase().includes(token)
  );
  if (!matches.length){ hideCmdPalette(); return; }
  renderCmdPalette(matches);
}
function runSlashCommand(c){
  hideCmdPalette();
  const input = document.getElementById("chatInput");
  input.value = "";
  commitSend(c.query);
}
// Return true kalau tombolnya udah ditangani sama command palette (biar keydown
// handler utama di chatInput gak ikut2an proses, misal Enter buat kirim biasa).
function handleCmdPaletteKeydown(e){
  if (!isCmdPaletteOpen()) return false;
  if (e.key === "ArrowDown"){
    e.preventDefault();
    cmdPaletteIndex = (cmdPaletteIndex + 1) % cmdPaletteMatches.length;
    highlightCmdPaletteIndex();
    return true;
  }
  if (e.key === "ArrowUp"){
    e.preventDefault();
    cmdPaletteIndex = (cmdPaletteIndex - 1 + cmdPaletteMatches.length) % cmdPaletteMatches.length;
    highlightCmdPaletteIndex();
    return true;
  }
  if (e.key === "Enter" || e.key === "Tab"){
    e.preventDefault();
    runSlashCommand(cmdPaletteMatches[cmdPaletteIndex]);
    return true;
  }
  if (e.key === "Escape"){
    e.preventDefault();
    hideCmdPalette();
    return true;
  }
  return false;
}
// Shortcut global ⌘K / Ctrl+K — fokus ke chat input dari mana aja di halaman,
// persis kayak command bar di app-app lain (Slack/Linear/dst).
document.addEventListener("keydown", (e) => {
  const isCmdK = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
  if (!isCmdK) return;
  e.preventDefault();
  const input = document.getElementById("chatInput");
  input.focus();
  input.select();
});

