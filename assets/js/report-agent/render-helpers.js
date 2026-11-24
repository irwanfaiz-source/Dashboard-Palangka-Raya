/**
 * assets/js/report-agent/render-helpers.js — Render markdown, efek ngetik, nama model
 * Bagian 11/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// Render markdown (bold/italic/list/link/code fence) jadi HTML, lalu jalanin
// syntax highlighting di tiap blok <pre><code>. Dipanggil buat bubble agent
// SETELAH typewriter kelar ngetik (biar gak parsing HTML di tengah animasi).
// Line tunggal (bukan baris kosong) dari "replyLines" harus tetep dianggap
// ganti baris pas di-render markdown — default marked.js NGE-GABUNG newline
// tunggal jadi satu paragraf (butuh baris kosong buat paragraf baru), yang
// bikin baris-baris kayak "(0)Antri" / "(1)In Progress" numpuk jadi satu
// baris panjang. "breaks:true" nyamain perilakunya sama kayak sebelumnya
// (white-space:pre-wrap versi plain text) tapi tetep dapet markdown+highlight.
if (window.marked && marked.setOptions){
  marked.setOptions({ breaks: true, gfm: true });
}

function renderMarkdownInto(bubbleEl, rawText){
  try{
    bubbleEl.innerHTML = marked.parse(rawText || "");
    bubbleEl.querySelectorAll("pre code").forEach(block => {
      try{ hljs.highlightElement(block); }catch(e){ /* abaikan kalau hljs gagal */ }
    });
  }catch(e){
    bubbleEl.textContent = rawText; // fallback plain text kalau marked/hljs gagal load
  }
}

// Efek ngetik karakter-per-karakter buat balasan agent. Ngetik teks MENTAH
// (textContent, bukan innerHTML) dulu biar gak ada tag html "kepotong" di
// tengah jalan, baru begitu kelar di-render ulang jadi markdown+highlight.
function typewriterInto(bubbleEl, fullText, onDone){
  const cursor = document.createElement("span");
  cursor.className = "typewriter-cursor";
  bubbleEl.textContent = "";
  bubbleEl.appendChild(cursor);
  const speed = fullText.length > 400 ? 4 : (fullText.length > 150 ? 10 : 18); // makin panjang, makin cepet
  let i = 0;
  (function step(){
    i += Math.max(1, Math.round(fullText.length / 220)); // biar teks panjang gak kelamaan ngetik
    bubbleEl.textContent = fullText.slice(0, i);
    bubbleEl.appendChild(cursor);
    document.getElementById("chatLog").scrollTop = document.getElementById("chatLog").scrollHeight;
    if (i < fullText.length){
      setTimeout(step, speed);
    } else {
      cursor.remove();
      if (onDone) onDone();
    }
  })();
}

// Mapping nama model "mentah" (dari value dropdown ATAU dari field
// data.modelUsed/data.model yang dibalikin proxy) ke nama tampilan yang
// gak nyebut vendor/tier aslinya (Gemini/Flash/Flash Lite) — biar konsisten
// dipakai di dropdown MAUPUN badge label balasan (termasuk pas mode "Auto"
// & proxy fallback ke model lain, yang balikin id mentah kayak
// "gemini-3.6-flash").
const ODYSSEY_MODEL_NAMES = {
  "gemini-2.5-flash-lite": "Odyssey 2.5",
  "gemini-2.5-flash": "Odyssey 2.5 Pro",
  "gemini-3-flash": "Odyssey 3.0",
  "gemini-3.1-flash-lite": "Odyssey 3.1",
  "gemini-3.5-flash": "Odyssey 3.5 Pro",
  "gemini-3.5-flash-lite": "Odyssey 3.5",
  "gemini-3.6-flash": "Odyssey 3.6",
  "gemini-3.7-flash": "Odyssey 3.7",
  "gemini-3.8-flash": "Odyssey 3.8"
};
function friendlyModelName(rawId){
  if (!rawId) return "Auto";
  return ODYSSEY_MODEL_NAMES[rawId] || "Odyssey";
}

// Urutan sama persis kayak GEMINI_MODEL_CHAIN di gemini-proxy.js — dipakai
// buat retry SISI KLIEN (lihat askAgent) waktu satu model jawab tapi
// hasilnya BUKAN rate limit, melainkan output-nya gak valid JSON (ini gak
// ke-detect sama proxy karena proxy cuma ngecek status HTTP/RESOURCE_EXHAUSTED,
// bukan ngerti isi balasan). Kalau ada model baru ditambah di proxy, tambahin
// juga di sini biar auto-switch-nya ikut jalan.
const ODYSSEY_MODEL_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash"
];

