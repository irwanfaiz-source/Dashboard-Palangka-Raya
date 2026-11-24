/**
 * assets/js/report-agent/agent-api.js — Panggilan AI: susun riwayat & body request, panggil proxy Gemini, parse balasan JSON, retry ganti model
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

// Gemini pakai format "contents": array {role:"user"|"model", parts:[...]}
// (BUKAN "assistant" kayak OpenAI/Groq — Gemini pakai "model"). Tiap part
// bisa {text:"..."} biasa, atau {inline_data:{mime_type, data}} buat gambar
// (base64 TANPA prefix "data:image/...;base64,", makanya di-strip di bawah).
// Batasin cuma N pesan TERAKHIR yang dikirim ulang ke API (bukan seluruh riwayat
// dari awal sesi) — biar prompt gak numpuk makin panjang makin berat tiap turn,
// yang bikin token per-request membengkak & gampang kena limit di percakapan panjang.
const AGENT_HISTORY_LIMIT = 12;

function toGeminiParts(content){
  if (Array.isArray(content)){
    return content.map(part => {
      if (part && part.type === "image_url"){
        const url = (part.image_url && part.image_url.url) || "";
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        return match
          ? { inline_data: { mime_type: match[1], data: match[2] } }
          : { text: "" };
      }
      return { text: String((part && part.text) || "") };
    });
  }
  return [{ text: String(content || "") }];
}

// Riwayat chat -> format "contents" Gemini (hanya N pesan terakhir).
function buildContentsForApi(history){
  const recentHistory = history.slice(-AGENT_HISTORY_LIMIT);
  return recentHistory.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: toGeminiParts(m.content)
  }));
}

// Body request ke proxy: jatah token & level thinking tergantung mode data/obrolan.
function buildRequestBodyBase(isDataQuery, systemPrompt, contentsForApi){
  return {
    max_tokens: isDataQuery ? 3000 : 1500, // mode report dikasih jatah lebih gede
    // Level thinking: mode data (trip JSON / DW report) butuh AI teliti nyisir
    // data satu-satu DAN gak kebawa topik riwayat obrolan sebelumnya (misal abis
    // ditanya report DW, terus ditanya Late Arrival trip — pernah kejadian
    // AI ke-distract & jawabannya asal gara-gara "minimal" kekurangan mikir).
    // Obrolan santai tetep "minimal" biar hemat token/latency.
    thinking_level: isDataQuery ? "low" : "minimal",
    system: systemPrompt,
    contents: contentsForApi
  };
}

// Satu panggilan ke proxy (bukan langsung ke Gemini, supaya API key gak ke-expose). Melempar Error
// kalau balasan non-JSON atau HTTP error; hasilnya objek balasan mentah dari Gemini.
async function callGeminiProxy(requestBody){
  let data;
  const response = await fetch("/.netlify/functions/gemini-proxy", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(requestBody)
  });
  const rawText = await response.text();
  try{
    data = rawText ? JSON.parse(rawText) : {};
  }catch(e){
    throw new Error("Server balikin respons non-JSON (kemungkinan function belum ke-deploy atau crash). Cuplikan: " + rawText.slice(0,150));
  }
  if (!response.ok){
    throw new Error((data && data.error && data.error.message) ? data.error.message : ((data && data.error) ? data.error : ("HTTP " + response.status + " (respons kosong)")));
  }
  return data;
}

// Ambil teks jawaban dari kandidat pertama, bersihkan code fence, & potong ke {...} terluar.
function extractModelText(data){
  // Gemini balikin "candidates" (bukan "choices" kayak OpenAI/Groq). Kalau
  // jawaban keblokir safety filter, candidates bisa kosong & alasannya ada
  // di promptFeedback.blockReason.
  const candidate = (data.candidates && data.candidates[0]) || null;
  if (!candidate && data.promptFeedback && data.promptFeedback.blockReason){
    throw new Error("blockReason: " + data.promptFeedback.blockReason);
  }
  const partsText = candidate && candidate.content && Array.isArray(candidate.content.parts)
    ? candidate.content.parts.map(p => (p && p.text) || "").join("")
    : "";
  let text = partsText.trim();
  // Bersihin code fence di mana pun posisinya (bukan cuma di awal/akhir persis)
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Ambil substring dari kurung kurawal PERTAMA sampai kurung kurawal
  // TERAKHIR — jadi kalau AI masih nyelipin kalimat pembuka/penutup di luar
  // JSON (padahal udah dilarang), itu gak bikin JSON.parse langsung gagal.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace){
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

// Coba parse JSON dengan beberapa perbaikan otomatis (newline literal, over-escape, smart quotes,
// trailing comma). Balikin { ok, parsed }.
function parseModelJson(text){
  let parsed, ok = false;
  // Coba parse langsung dulu. Kalau AI-nya (Gemini) masih ngasal — misal nulis
  // enter/tab literal, over-escape jadi "\\n" dobel, pakai tanda kutip
  // "pintar" (smart quotes), atau nyisain trailing comma — di dalam string
  // JSON, JSON.parse bisa gagal atau kebaca aneh.
  const attempts = [
    text,
    text.replace(/\r\n|\r|\n/g, "\\n").replace(/\t/g, "\\t"), // newline/tab literal -> escaped
    text.replace(/\\\\n/g, "\\n").replace(/\\\\t/g, "\\t"),    // over-escaped \\n -> \n
    text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'), // smart quotes -> lurus
    text.replace(/,\s*([\]}])/g, "$1")                         // hapus trailing comma sebelum ] / }
  ];
  for (const candidateText of attempts){
    try{ parsed = JSON.parse(candidateText); ok = true; break; }
    catch(e){ /* coba kandidat berikutnya */ }
  }
  return { ok: ok, parsed: parsed };
}

// Last resort kalau SEMUA percobaan (termasuk ganti-ganti model) tetep
// gagal: jangan lempar mentahan JSON ke chat — tarik isi array
// "replyLines" pakai regex biar user tetap dapet teks yang bisa dibaca
// manusia dulu, sebelum bener-bener nyerah ke pesan "berantakan".
function recoverRepliesFromBrokenJson(text){
  const linesMatch = text.match(/"replyLines"\s*:\s*\[([\s\S]*?)\]\s*,\s*"attachedUnits"/);
  if (linesMatch){
    const items = [];
    const itemRegex = /"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = itemRegex.exec(linesMatch[1])) !== null){
      items.push(m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
    }
    if (items.length) return { replyLines: items, attachedUnits: [] };
  }
  return null;
}

// Loop retry sisi klien (ganti model tiap parse gagal), lalu jaring pengaman terakhir.
// Balikin { parsed, rawModelUsed }; melempar Error kalau proxy/jaringan gagal.
async function requestModelReply(requestBodyBase, preferredModel){
  // --- Loop retry sisi klien -------------------------------------------
  // Proxy (gemini-proxy.js) UDAH otomatis ganti model kalau kena rate limit
  // (429/RESOURCE_EXHAUSTED) — itu ke-handle di server, satu request aja
  // cukup. TAPI ada kasus lain yang gak ke-detect proxy: model-nya JAWAB
  // (status 200, bukan rate limit) tapi isinya BUKAN JSON valid (paling
  // sering kejadian di model "lite" yang kurang nurut instruksi format).
  // Ini gak bisa di-fix di server karena proxy gak ngerti skema JSON
  // aplikasi (replyLines/attachedUnits). Jadi retry-nya di sini: kalau
  // parse gagal, otomatis coba ulang pakai model LAIN di chain (bukan
  // model yang barusan gagal) sampai maxAttempts kali, sebelum akhirnya
  // nyerah & nampilin pesan "berantakan" ke user.
  const maxAttempts = 3;
  const usedModels = [];
  let attemptModel = preferredModel;
  let data, ok = false, parsed, text = "", rawModelUsed = "";

  for (let attemptNum = 1; attemptNum <= maxAttempts; attemptNum++){
    const requestBody = Object.assign({}, requestBodyBase);
    if (attemptModel) requestBody.preferred_model = attemptModel;
    data = await callGeminiProxy(requestBody);
    text = extractModelText(data);

    const parsedTry = parseModelJson(text);
    if (parsedTry.ok){ parsed = parsedTry.parsed; ok = true; }

    rawModelUsed = (data && (data.modelUsed || data.model)) || attemptModel || "";
    if (rawModelUsed) usedModels.push(rawModelUsed);

    if (ok) break; // sukses, gak perlu retry ke model lain

    // Parse gagal -> siapin model lain buat percobaan berikutnya (kalau
    // masih ada jatah attempt & masih ada model yang belum dicoba).
    const nextModel = ODYSSEY_MODEL_CHAIN.find(m => !usedModels.includes(m));
    if (!nextModel || attemptNum === maxAttempts) break;
    attemptModel = nextModel;
  }

  if (!ok){
    const recovered = recoverRepliesFromBrokenJson(text);
    if (recovered){ parsed = recovered; ok = true; }
  }
  if (!ok) parsed = { replyLines: ["Waduh, format balasan AI-nya berantakan bro, udah gua coba ganti-ganti model tapi tetep gagal — coba tanya ulang sekali lagi ya."], attachedUnits: [] };

  return { parsed: parsed, rawModelUsed: rawModelUsed };
}
