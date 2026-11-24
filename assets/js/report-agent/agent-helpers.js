/**
 * assets/js/report-agent/agent-helpers.js — Pesan error ramah, tanggal lokal, klasifikasi modul pakai AI
 * Bagian 17/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// Ubah pesan error teknis dari API jadi kalimat simpel yang enak dibaca user
// biasa, bukan mentahan pesan Gemini/HTTP yang penuh istilah teknis.
function simplifyErrorMessage(raw){
  const msg = String(raw || "");

  // Kena limit pemakaian (rate limit / quota harian free tier Gemini, dll)
  if (/rate.?limit/i.test(msg) || /RESOURCE_EXHAUSTED/i.test(msg) || /quota/i.test(msg)){
    // Kalau Gemini kasih tau berapa detik lagi harus nunggu (retryDelay/"try again
    // in 12.3s"), hitung jadi jam WIB yang konkret. Kalau gak ada info itu, kasih
    // estimasi umum.
    const waitMatch = msg.match(/try again in\s*([\d.]+)\s*s/i) || msg.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i);
    if (waitMatch){
      const waitSeconds = parseFloat(waitMatch[1]);
      const retryAt = new Date(Date.now() + waitSeconds * 1000);
      const hh = String(retryAt.getHours()).padStart(2,"0");
      const mm = String(retryAt.getMinutes()).padStart(2,"0");
      return `Anda telah melebihi limit penggunaan AI Agent. Mohon gunakan kembali pada jam ${hh}:${mm} WIB ya bro.`;
    }
    return "Anda telah melebihi limit penggunaan AI Agent bro. Mohon tunggu sekitar 1 menit lalu coba lagi ya.";
  }

  // Model gak ketemu/gak bisa diakses, atau kena filter safety Gemini
  if (/does not exist|do not have access|not found|NOT_FOUND/i.test(msg)){
    return "Waduh, model AI-nya lagi bermasalah di sisi server bro. Coba lagi sebentar, atau kabarin admin kalau masih error terus.";
  }
  if (/SAFETY|blockReason|PROHIBITED_CONTENT/i.test(msg)){
    return "Waduh, jawabannya keblokir filter safety AI bro. Coba tulis ulang pertanyaannya dengan cara lain ya.";
  }

  // Server function belum ke-deploy / respons bukan JSON
  if (/non-JSON|Server balikin respons/i.test(msg)){
    return "Waduh, server AI Agent-nya lagi gak bisa dihubungin bro. Coba refresh & tanya lagi sebentar ya.";
  }

  // Fallback umum — gak nampilin detail teknis mentah ke user
  return "Waduh, gagal ngambil jawaban AI bro. Coba tanya ulang sebentar lagi ya.";
}

// Tanggal lokal device user (BUKAN dari isi gambar) — dipakai khusus buat
// header Report Antrian Inbound ECO/STD, format DD/MM/YYYY.
function getLocalDateStr(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ===== KLASIFIKASI MODUL PAKAI AI (BARU) — fallback kalau regex kosakata di
// atas gak nangkep apa-apa =====
// Kata kunci di ACCESS_MAP/keywords atas itu daftar ISTILAH TETAP — kalau ada
// karyawan yang nanya pakai singkatan/slang/typo baru yang belum pernah
// dimasukin ke regex manapun, pertanyaannya bisa jatuh ke "obrolan santai"
// padahal maksudnya nanya data. Fungsi ini jadi jaring pengaman kedua: SEKALI
// panggilan ekstra & ringan ke Gemini (proxy yang sama), minta AI nebak modul
// mana yang paling relevan dari pertanyaan mentahnya (bukan dari regex),
// balikin array key modul. Dipanggil CUMA kalau regex bener-bener 0 match
// tapi pertanyaannya kecium "data-ish" (lihat isDataQuery) — jadi gak nambah
// panggilan API buat pertanyaan yang emang udah jelas jawabannya modul mana
// (regex sendiri masih jadi jalur utama, cepat & gratis, ini cuma cadangan).
const VALID_MODULE_KEYS = ["rest_asset", "outbound", "performance_bagger", "inventory_control", "inbound"];
async function classifyModulesWithAI(question){
  try{
    const classifyPrompt = `Kamu classifier internal buat sistem dashboard, BUKAN buat ngobrol sama user. Dari pertanyaan
mentah di bawah, tentuin modul dashboard mana aja (boleh 1, boleh lebih dari 1, boleh juga TIDAK ADA
yang cocok) yang paling relevan — walau pertanyaannya pakai singkatan/istilah lapangan/typo yang gak
baku. Daftar modul & cakupan topiknya:
- rest_asset: Rest Time & Asset Usage Monitoring (istirahat/break operator, pinjam-balikin PDA,
  check-in/out, idle asset, kelamaan istirahat) — TERMASUK pertanyaan CARA PAKAI / panduan /
  troubleshooting dashboard Rest Time itu sendiri (scan OpsID, Pre-Work FIT/UNFIT, Attendance FMS,
  Summary Pre-Work per Vendor, kenapa Check In diblok/ditolak)
- outbound: Outbound Monitoring (aging parcel, packer backlog, occupancy/kepenuhan staging gudang,
  jadwal shift keberangkatan, rute linehaul)
- performance_bagger: Performance Bagger (produktivitas packing harian per operator, achievement rate,
  red flag/needs coaching, ranking/leaderboard operator)
- inventory_control: Inventory Control (stock barang consumable/ATK, Asset IT & NCA non-consumable,
  audit log perubahan data, reorder barang menipis)
- inbound: Trip Inbound (Line Haul truk dari origin ke DC, Late/Early Arrival, convoy/beriringan,
  vendor/driver truk)

Pertanyaan user: "${question}"

WAJIB balas HANYA dengan key modul dipisah koma tanpa spasi, PERSIS salah satu/gabungan dari:
rest_asset, outbound, performance_bagger, inventory_control, inbound — TANPA teks/penjelasan lain.
Kalau beneran gak ada satupun yang cocok (obrolan santai/pertanyaan umum), balas persis satu kata: none`;
    const resp = await fetch("/.netlify/functions/gemini-proxy", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        max_tokens: 30,
        thinking_level: "minimal",
        system: classifyPrompt,
        contents: [{ role: "user", parts: [{ text: question || "" }] }]
      })
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const candidate = (data.candidates && data.candidates[0]) || null;
    const raw = candidate && candidate.content && Array.isArray(candidate.content.parts)
      ? candidate.content.parts.map(p => (p && p.text) || "").join("").trim().toLowerCase()
      : "";
    if (!raw || raw === "none") return [];
    return raw.split(",").map(k => k.trim()).filter(k => VALID_MODULE_KEYS.includes(k));
  }catch(e){
    console.error("Gagal klasifikasi modul via AI (fallback ke mode Inbound default):", e);
    return [];
  }
}

