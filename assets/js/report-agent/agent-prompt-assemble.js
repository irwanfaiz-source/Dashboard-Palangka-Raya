/**
 * assets/js/report-agent/agent-prompt-assemble.js — Merakit system prompt: pilih mode & gabungkan blok modul
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

// Pilih system prompt sesuai topik. Urutan cabang SAMA dengan versi lama:
// DW -> Antrian -> modul (gabungan) -> ringan -> lengkap.
function buildSystemPrompt(topics, matchedModules, lateCount, convoyGroups, question){
  if (topics.isDwReport) return buildDwReportPrompt();
  if (topics.isQueueReport) return buildQueueReportPrompt();
  if (matchedModules.length > 0) return buildModulesPrompt(matchedModules, lateCount, convoyGroups, question);
  if (!topics.isDataQuery) return buildLightPrompt();
  return buildFullPrompt(lateCount, convoyGroups);
}

// Mode GABUNGAN: satu blok per modul yang cocok (urutan tetap: rest, outbound, bagger, inventory, inbound).
function buildModulesPrompt(matchedModules, lateCount, convoyGroups, question){
  const moduleBlocks = [];
  if (matchedModules.includes("rest_asset")){
    moduleBlocks.push(buildRestAssetBlock(question));
  }
  if (matchedModules.includes("outbound")){
    moduleBlocks.push(buildOutboundBlock());
  }
  if (matchedModules.includes("performance_bagger")){
    moduleBlocks.push(buildPerformanceBaggerBlock());
  }
  if (matchedModules.includes("inventory_control")){
    moduleBlocks.push(buildInventoryBlock());
  }
  if (matchedModules.includes("inbound")){
    moduleBlocks.push(buildInboundModuleText(lateCount, convoyGroups));
  }

  // Gabungin semua blok modul yang cocok jadi satu system prompt. Kalau
  // lebih dari satu modul, dikasih catatan pembuka biar AI-nya gak
  // ngcampur-adukin angka antar modul & tetep nyebut sumbernya masing-masing.
  const crossModuleNote = moduleBlocks.length > 1
    ? `

PENTING: pertanyaan kali ini kesenggol LEBIH DARI SATU modul dashboard sekaligus (` + matchedModules.join(", ") + `). Di
bawah ada beberapa blok instruksi + data, MASING-MASING independen — JANGAN dicampur-adukin angkanya.
Kalau jawabanmu makai angka dari suatu modul, sebutkan modul asalnya biar user gak bingung. Kalau user
emang minta perbandingan/korelasi antar modul, boleh dihubungkan, tapi tetep jujur kalau sumber datanya
beda-beda.`
    : "";
  return `${AGENT_BASE_PERSONA}${crossModuleNote}
` + moduleBlocks.join("\n\n===== MODUL LAIN YANG JUGA RELEVAN =====\n");
}

// Mode RINGAN: obrolan/pertanyaan umum yang gak nyangkut data dashboard.
function buildLightPrompt(){
  // Mode RINGAN — obrolan/pertanyaan umum, gak nyangkut data trip. Prompt sengaja
  // dibikin pendek soal instruksi dashboard-nya (biar gak numpuk & bikin AI keder),
  // tapi persona di atas udah nyatain wawasannya luas gak cuma dashboard.
  return `${AGENT_BASE_PERSONA}

Pertanyaan kali ini gak nyangkut data trip dashboard. Jawab santai & informatif sesuai konteks obrolan,
pake pengetahuan umum kamu — jangan bilang "gua cuma bisa bantu soal trip" kalau ditanya hal lain,
karena kamu memang bisa bantu topik apa aja.

${AGENT_JSON_FORMAT_RULE}

Contoh: {"replyLines": ["Wih nanya gitu bro 😄"], "attachedUnits": []}`;
}

// Mode LENGKAP (jaring pengaman): pertanyaan "data-ish" tapi gak ada modul yang kedeteksi.
function buildFullPrompt(lateCount, convoyGroups){
  // Mode LENGKAP (jaring pengaman) — seharusnya sekarang jarang kepake, karena
  // isInboundQuery/classifyModulesWithAI biasanya udah nyantumin "inbound" ke
  // matchedModules di atas duluan. Ini cuma fallback terakhir kalau entah kenapa
  // isDataQuery true tapi gak ada satupun modul yang kedeteksi/di-klasifikasi.
  return `${AGENT_BASE_PERSONA}
` + buildInboundModuleText(lateCount, convoyGroups);
}
