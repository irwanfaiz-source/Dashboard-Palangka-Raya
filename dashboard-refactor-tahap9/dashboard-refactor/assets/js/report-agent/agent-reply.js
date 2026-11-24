/**
 * assets/js/report-agent/agent-reply.js — Menampilkan balasan AI di chat + kartu konfirmasi aksi tulis
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

// Susun teks final, tampilkan bubble balasan, simpan ke riwayat, dan munculkan kartu konfirmasi
// kalau AI menyiapkan aksi tulis (TIDAK ada yang tersimpan sebelum user klik konfirmasi).
function renderAgentReply(parsed, rawModelUsed, preferredModel){
  // Susun teks final dari array replyLines (baris baru beneran, bukan hasil
  // escape dari AI) — kalau AI masih pakai format lama "reply" (string biasa),
  // tetap didukung biar gak putus kompatibilitas.
  let replyText = "...";
  if (Array.isArray(parsed.replyLines)){
    replyText = parsed.replyLines.map(l => String(l)).join("\n");
  } else if (typeof parsed.reply === "string"){
    replyText = parsed.reply;
  }

  // Label model yang jawab: pakai model TERAKHIR yang beneran sukses jawab
  // (bisa beda dari pilihan dropdown user kalau proxy fallback rate-limit
  // ATAU loop retry di atas ganti model gara-gara output berantakan), atau
  // "Auto" kalau dropdown-nya "Auto" & gak ada info model dari proxy.
  // Selalu lewat friendlyModelName() biar nama vendor/tier asli
  // (Gemini/Flash/Flash Lite) gak pernah nongol di UI.
  const modelLabel = friendlyModelName(rawModelUsed || preferredModel);

  removeTyping();
  addMessage("agent", replyText, parsed.attachedUnits, null, modelLabel);
  chatHistory.push({role:"assistant", content: replyText});
  scheduleSaveSession();

  // Kalau Gemini nyiapin rencana aksi tulis (Update Stock / Submit Usage Log) buat modul Inventory
  // Control, tampilin kartu konfirmasi — TIDAK ADA yang kesimpen ke Firebase sebelum user klik
  // "Konfirmasi & Simpan" di kartu itu.
  if (parsed.inventoryAction && Array.isArray(parsed.inventoryAction.items) && parsed.inventoryAction.items.length){
    renderInventoryActionConfirmCard(parsed.inventoryAction);
  }
  if (parsed.restAction && parsed.restAction.type && parsed.restAction.opsId){
    renderRestActionConfirmCard(parsed.restAction);
  }
}
