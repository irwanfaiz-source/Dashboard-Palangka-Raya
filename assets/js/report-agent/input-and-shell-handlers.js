/**
 * assets/js/report-agent/input-and-shell-handlers.js — Tombol Refresh, avatar header, pesan dari app-shell, paste gambar, tombol Kirim
 * Bagian 19/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

document.getElementById("refreshBtn").addEventListener("click", loadData);

// Pasang logo asli The Odyssey di avatar header (dari data URI global).
(function setHeaderAvatar(){
  const headerAvatar = document.getElementById("chatHeaderAvatar");
  if (headerAvatar && window.__ODYSSEY_LOGO){
    const img = document.createElement("img");
    img.src = window.__ODYSSEY_LOGO;
    img.alt = "The Odyssey";
    headerAvatar.appendChild(img);
  }
})();

// Tombol "Refresh Data" aslinya (di atas) udah disembunyiin — yang beneran
// keliatan buat user itu tombol kembarannya di title bar popup, di luar
// iframe ini (index.html). Klik di sana ngirim postMessage ke sini; begitu
// ketrima, panggil loadData() yang sama kayak refreshBtn dulu manggilnya.
window.addEventListener("message", function (e) {
  var data = e.data;
  if (!data || data.source !== "pkydc") return;
  if (data.type === "odysseyRefresh") loadData();
});

// ===== Attach gambar via paste (Ctrl+V) =====
let pendingImageDataUrl = null;

function setPendingImage(dataUrl){
  pendingImageDataUrl = dataUrl;
  const row = document.getElementById("imgPreviewRow");
  const thumb = document.getElementById("imgPreviewThumb");
  thumb.src = dataUrl;
  row.classList.add("show");
}
function clearPendingImage(){
  pendingImageDataUrl = null;
  const row = document.getElementById("imgPreviewRow");
  row.classList.remove("show");
  document.getElementById("imgPreviewThumb").src = "";
}
function handlePasteEvent(e){
  const items = (e.clipboardData || e.originalEvent && e.originalEvent.clipboardData || {}).items;
  if (!items) return;
  for (const item of items){
    if (item.type && item.type.indexOf("image") !== -1){
      const file = item.getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = (ev) => setPendingImage(ev.target.result);
      reader.readAsDataURL(file);
      e.preventDefault();
      break;
    }
  }
}
document.getElementById("chatInput").addEventListener("paste", handlePasteEvent);
document.getElementById("removeImgBtn").addEventListener("click", clearPendingImage);

// commitSend() dipakai bareng sama tombol Kirim, tombol Enter, dan pemilihan
// command dari Command Palette (biar logic "harus ada teks ATAU gambar" +
// clear pending image gak keduplikasi di beberapa tempat).
function commitSend(text){
  const q = (text || "").trim();
  if (!q && !pendingImageDataUrl) return; // minimal harus ada teks ATAU gambar
  const img = pendingImageDataUrl;
  clearPendingImage();
  askAgent(q, img);
}
document.getElementById("sendBtn").addEventListener("click", () => {
  const input = document.getElementById("chatInput");
  const q = input.value;
  input.value = "";
  hideCmdPalette();
  commitSend(q);
});
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (handleCmdPaletteKeydown(e)) return; // command palette lagi kebuka, biarin dia yang nangkep tombolnya
  if (e.key === "Enter") document.getElementById("sendBtn").click();
});
document.getElementById("chatInput").addEventListener("input", (e) => {
  updateCmdPalette(e.target.value);
});

