/**
 * assets/js/report-agent/ask-agent.js — askAgent(): alur utama tanya jawab dengan AI (orkestrator tipis)
 * Sisa dari askAgent() yang dulu satu fungsi ±930 baris di file ini; tahapnya dipindah ke agent-*.js. Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

// Alur: catat pesan user -> deteksi topik & modul -> susun system prompt -> panggil AI (retry) -> tampilkan.
// Tiap tahap ada di file sendiri: agent-topics, agent-prompt-*, agent-api, agent-reply.
// Penyusunan prompt sengaja di LUAR try (error di sana tetap melempar, seperti dulu).
async function askAgent(question, imageDataUrl){
  addMessage("user", question, null, imageDataUrl);
  // Kalau ada gambar, isi content jadi array format vision (OpenAI-compatible)
  // biar bisa dikirim ke model yang bisa "lihat" gambar lewat proxy.
  const userContent = imageDataUrl
    ? [
        { type:"text", text: question || "Tolong lihat & jelasin gambar ini bro." },
        { type:"image_url", image_url:{ url: imageDataUrl } }
      ]
    : question;
  chatHistory.push({role:"user", content: userContent, hasImage: !!imageDataUrl});
  scheduleSaveSession();
  addTyping();

  const lateCount = currentTrips.filter(t => t.status === "Late Arrival").length;
  const convoyGroups = computeConvoyGroups(currentTrips);

  const topics = detectTopics(question, imageDataUrl);
  const matchedModules = await resolveMatchedModules(topics, question, imageDataUrl);
  const systemPrompt = buildSystemPrompt(topics, matchedModules, lateCount, convoyGroups, question);
  const contentsForApi = buildContentsForApi(chatHistory);

  try{
    // Panggil lewat Netlify Function proxy (bukan langsung ke Gemini) supaya
    // API key gak pernah ke-expose di browser. Lihat netlify/functions/gemini-proxy.js
    // Model (termasuk dukungan vision buat gambar) udah ditentuin di sisi proxy
    // (GEMINI_MODEL_CHAIN) — model Gemini flash-nya udah multimodal jadi gak
    // perlu ganti model/parameter khusus kalau ada gambar terlampir. Kalau
    // user milih model tertentu di dropdown (bukan "Auto"), kirim sebagai
    // preferred_model — proxy bakal nyoba model itu duluan, tapi tetep
    // fallback ke chain default kalau model itu kena rate limit.
    const modelSelectEl = document.getElementById("modelSelect");
    const preferredModel = modelSelectEl ? modelSelectEl.value : "";
    const requestBodyBase = buildRequestBodyBase(topics.isDataQuery, systemPrompt, contentsForApi);
    const { parsed, rawModelUsed } = await requestModelReply(requestBodyBase, preferredModel);
    renderAgentReply(parsed, rawModelUsed, preferredModel);
  }catch(e){
    console.error(e);
    removeTyping();
    addMessage("agent", simplifyErrorMessage(e.message));
  }
}
