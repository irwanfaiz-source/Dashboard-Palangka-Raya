/**
 * assets/js/common.js
 * ------------------------------------------------------------------
 * Fungsi yang dulu di-copy-paste PERSIS SAMA di banyak modul. Sekarang
 * cukup 1 tempat. Dimuat sebelum script halaman (lihat <script> di HTML).
 *
 * Ubah di sini = ikut berubah di semua modul yang memuat file ini.
 *
 * Isinya HANYA fungsi yang sama di kelima modul (inbound,
 * inventory-control, outbound, performance-bagger, rest-time).
 * Fungsi yang cuma mirip tapi beda-beda (showToast, setAppLanguage, dst)
 * sengaja belum disentuh — lihat docs/ARCHITECTURE.md bagian "Tahap 2".
 *
 * collapseAllSidebarGroups() memanggil SIDEBAR_NAV_GROUPS saat runtime,
 * jadi tiap modul tetap harus mendefinisikan konstanta itu sendiri.
 */

// ==== HTML / teks ====

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// ==== Toast ====
// Butuh <div id="toastStack"> di HTML & CSS .toast-item per modul. Kalau
// #toastStack gak ada, pesan cuma di-log (dulu inventory-control malah error).

function showToast(message, type, durationMs) {
  type = type || 'info';
  var icon = type === 'ok' ? '✅' : (type === 'err' ? '⛔' : 'ℹ️');
  var stack = document.getElementById('toastStack');
  if (!stack) { console.warn('[toast]', message); return; }
  var el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.innerHTML = '<span class="toast-icon">' + icon + '</span>' +
    '<span class="toast-msg">' + escapeHtml(message) + '</span>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">✕</button>';
  stack.appendChild(el);
  setTimeout(function () {
    if (el.parentElement) el.remove();
  }, durationMs || (type === 'err' ? 7000 : 4500));
}
