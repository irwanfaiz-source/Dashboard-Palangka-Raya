/**
 * assets/js/report-agent/agent-topics.js — Deteksi topik pertanyaan (kata kunci) + penentuan modul yang kena
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

// Kata kunci -> topik. Mengembalikan semua penanda yang dipakai tahap berikutnya.
function detectTopics(question, imageDataUrl){
  // Deteksi simpel: pertanyaan ini soal DATA TRIP (report/status/vendor/dll) atau
  // cuma obrolan santai yang gak butuh data? Kalau cuma basa-basi ("bro", "makasih",
  // "lu tau gua?"), JANGAN kirim seluruh dump data + template Report yang berat —
  // itu yang bikin AI keder/salah format DAN boros token (gampang kepentok limit).
  // Data & template berat cuma dikirim kalau emang relevan.
  const dataKeywords = /report|laporan|rekap|trip|late|telat|ngaret|molor|awal|early|convoy|beriringan|iring|konvoi|unit|vendor|driver|supir|sopir|status|hari ini|kemarin|besok|tanggal|durasi|lama|jadwal|\bsta\b|\beta\b|\bata\b|\batd\b|\bstd\b|\blt[\s-]?\d|nomor|plat|parcel|qty|jumlah|data|\bdc\b|banjarmasin|sampit|kapuas|pangkalan|gimana|update|progress|kondisi/i;
  // Report kedua: DW (Daily Worker) Fulfillment — beda topik dari trip Inbound,
  // datanya BUKAN dari currentTrips (Firebase) tapi dari GAMBAR tabel jadwal DW
  // yang di-paste user (screenshot spreadsheet shift/permintaan/kehadiran).
  const dwKeywords = /\bdw\b|fulfillment|daily worker|reguler|on-?call|kebutuhan (dw|tenaga)|kekurangan (orang|tenaga|dw)|manpower|tenaga kerja harian|permintaan (dw|tenaga)/i;
  const isDwReport = dwKeywords.test(question || "");
  // Report ketiga: ANTRIAN INBOUND (ECO vs STD) — beda lagi dari 2 report di atas.
  // Datanya BUKAN dari currentTrips (Firebase) DAN BUKAN dari tabel jadwal DW,
  // tapi dari GAMBAR board antrian "PalangkarayaDC" (kolom Route & Status) yang
  // di-paste user. Sengaja dibikin gampang triger-nya: kalau user CUMA paste
  // gambar tanpa ngetik apa-apa (dan itu bukan gambar tabel DW), langsung
  // dianggap minta Report Antrian ini — sesuai request awal "kirim gambar,
  // Odyssey langsung generate Report". Kalau user ngetik kata kunci terkait
  // (antrian/eco/std/dll) itu juga triger, meski ada teks lain.
  const queueKeywords = /\bantrian\b|\beco\b|\bstd\b|antrian inbound|report antrian|queue report|lagi ngantri|antri berapa|truk ngantri|unloading queue/i;
  const isQueueReport = !isDwReport && (
    queueKeywords.test(question || "") ||
    (!!imageDataUrl && !(question || "").trim())
  );
  // Topik keempat: REST TIME & ASSET USAGE MONITORING — beda modul lagi dari
  // 3 topik di atas (trip Inbound / DW Fulfillment / Antrian Inbound). Datanya
  // dari Firebase live (currentRestLogs, currentAssetLogs, monMasterKaryawan,
  // monPdaStationMap), BUKAN dari gambar. Kata kunci sengaja dibikin luas biar
  // nangkep istilah opsional yang biasa dipakai Shift Lead sehari-hari di
  // lapangan (istirahat, PDA, pinjam/kembali, check in, dst).
  // CATATAN FIX: kata "asset" polos (\basset\b) SENGAJA DIBUANG dari sini — sebelumnya bikin
  // pertanyaan soal modul Inventory Control (mis. "Asset IT & NCA", "status asset", "jumlah asset")
  // ke-tag duluan sebagai topik Rest Time/PDA (karena Rest Time dicek LEBIH DULU di urutan
  // if/else-nya), padahal maksud user soal Inventory Control. Modul Rest Time tetep ke-cover kok
  // lewat kata kunci lain yang emang spesifik ke PDA: \bpda\b, "asset usage" (frasa utuh), check-in/
  // check-out, istirahat, pinjam, kembali, dst.
  const restAssetKeywords = /rest\s*time|istirahat|\bbreak\s*(in|out)?\b|check\s*-?\s*in\b|check\s*-?\s*out\b|\bcekin\b|\bcekout\b|\bpda\b|asset usage|serial number|\bsn\b|pinjam|kembali|balikin|tukar\s*pda|gantian\s*pda|ops\s*id|opsid|karyawan|operator|\bstation\b|\bidle\b|overtime|kelamaan|kelamaan istirahat|terkunci|\block\b|\bcycle\b|agency|departemen|\bdept\b|lagi istirahat|masih istirahat|belum balik|belum check\s*in|pre-?\s*work|\bunfit\b|un-fit|attendance|\bfms\b|clock\s*-?\s*in|raw staff|staff profile|rest[\s-]?time monitoring|double scan|wrong device|gancang meakal|\best\.?\s*masuk|rollback|reset data|database asset|summary pre-?work|submission pre-?work|\bscan(ning)?\b|\bbarcode\b|\bops\s*\d{3,}/i;
  // CATATAN PERUBAHAN: kelima topik data di bawah ini (Rest/Asset, Outbound,
  // Performance Bagger, Inventory Control, Inbound) SEKARANG independen satu
  // sama lain (sebelumnya nge-chain "!isXQuery" ke topik sebelumnya, jadi
  // cuma SATU topik yang bisa menang tiap pertanyaan). Independennya biar
  // pertanyaan yang nyenggol lebih dari satu modul sekaligus (misal "asset
  // usage sama stock ATK gimana?") bisa kedeteksi dua-duanya, lalu datanya
  // digabung jadi satu system prompt di bagian bawah (lihat matchedModules).
  const isRestAssetQuery = !isDwReport && !isQueueReport && restAssetKeywords.test(question || "");
  // Topik kelima: MODUL OUTBOUND — Aging & Packer Backlog + Occupancy & Shift Departure. Beda lagi
  // dari 4 topik di atas (trip Inbound / DW Fulfillment / Antrian Inbound / Rest Time & Asset Usage).
  // Datanya dari Firebase live (currentOutboundRaw, diringkas lewat buildOutboundSummary()), SAMA
  // PERSIS sumber & logic hitung yang dipakai dashboard outbound.html. Kata kunci sengaja dibikin
  // luas biar nangkep istilah sehari-hari modul ini (aging, backlog, packer, staging, occupancy,
  // shift keberangkatan, linehaul, rute/hub, D0-D6+, bulky/HV/liquid, dst).
  // Topik keenam: MODUL PERFORMANCE BAGGER — beda lagi dari 5 topik di atas, ini soal produktivitas
  // PACKING HARIAN per operator (bukan soal parcel/aging di staging kayak modul Outbound). Datanya
  // dari Firebase live (currentPbDailyRecords, currentPbImportLogs), diringkas lewat
  // buildPerformanceBaggerSummary(). Dicek SEBELUM kata kunci Outbound biar kata "packer" polos gak
  // kebajak ke modul Outbound (yang istilahnya lebih spesifik: "packer leaderboard"/"packer backlog").
  const performanceBaggerKeywords = /performance bagger|\bbagger\b|\bpdvt\b|\bopsid\b|ops\s*id|hall of fame|achievement rate|red flag|needs coaching|butuh coaching|speed demon|\bon fire\b|most consistent|dedicated operator|dw reguler|dw on call|quick view|\bd\+1\b|import roster|rapor pdf|performance slip|target packing|packing target|achievement.*(target|packing)|produktivitas (packer|bagger|packing)|capaian (packing|target)|ranking (operator|packer|bagger)|leaderboard (packing|operator)|operator paling (produktif|rajin|malas)|siapa yang (paling|belum) (packing|capai target)/i;
  const isPerformanceBaggerQuery = !isDwReport && !isQueueReport && performanceBaggerKeywords.test(question || "");
  // Topik ketujuh: MODUL INVENTORY CONTROL — soal database Stock (barang consumable), Asset IT & NCA
  // (non-consumable per unit), Log Activity Usage/Highlight Usage (pemakaian harian per Devisi SOC/EHA),
  // dan Audit Log. Beda total dari 6 topik di atas. Dicek SEBELUM keyword Outbound & Performance Bagger
  // biar kata "stock"/"asset" di sini gak ketuker sama istilah modul lain.
  const inventoryControlKeywords = /inventory control|\binventaris\b|\bstock\b|\bstok\b|min\s*stock|stock menipis|barang menipis|barang habis|habis stok|\breorder\b|\bpic\b|no\.?\s*serial|nomor serial|asset it\b|\bnca\b|non.?consumable|audit log|riwayat pemakaian|riwayat mutasi|log activity|highlight usage|top asset|qty terpakai|devisi (soc|eha)|\bsoc\b|\beha\b|sortation center|exception handling|kondisi asset|status asset|jumlah asset|kategori asset|\batk\b|kertas thermal|spare part|barang consumable|siapa pegang|siapa yang pegang|mutasi asset|label ?nca|cetak label|print label|laptop rusak|kursi rusak|meja rusak/i;
  const isInventoryControlQuery = !isDwReport && !isQueueReport && inventoryControlKeywords.test(question || "");
  const outboundKeywords = /\baging\b|backlog|\bpacker\b|packing method|\bstaging\b|occupancy|okupansi|kapasitas (gudang|staging|dc)|gudang (penuh|munpuk|numpuk)|penuh\b|sisa slot|shift departure|keberangkatan|\blinehaul\b|line ?haul|\blh\b|\bd-?day\b|\bd[0-6]\b|>\s*d-?6|\bbulky\b|high value|\bhv\b|\bliquid\b|inner island|outer island|\bhub\b|\brute\b|breakdown volume|priority action|root cause|receiver name|destinasi|leaderboard|jadwal keberangkatan|slot linehaul|\bto number\b|\btransfer order\b|numpuk|muatan|parcel numpuk|parcel menumpuk/i;
  const isOutboundQuery = !isDwReport && !isQueueReport && outboundKeywords.test(question || "");
  // Topik kedelapan: TRIP INBOUND murni (Line Haul origin->DC, Late/Early Arrival,
  // Convoy, vendor/driver truk) — sebelumnya ini "diam-diam" jadi satu-satunya
  // fallback tiap kali gak ada topik lain yang cocok (lihat mode LENGKAP paling
  // bawah). Sekarang dikasih regex sendiri biar bisa IKUT digabung kalau
  // pertanyaannya nyenggol topik lain juga (misal "trip hari ini sama occupancy
  // gudang gimana?").
  const inboundTripKeywords = /\btrip\b|late arrival|early arrived|in transit|\borigin\b|\bdestination\b|nomor trip|\blt\s*\d|beriringan|iring-?iringan|\bsta\b|\beta\b|\bata\b|\batd\b|no\.?\s*polisi|plat nomor|\bvendor\b|\bdriver\b|supir|sopir/i;
  const isInboundQuery = !isDwReport && !isQueueReport && inboundTripKeywords.test(question || "");
  const isDataQuery = isDwReport || isQueueReport || isRestAssetQuery || isPerformanceBaggerQuery || isInventoryControlQuery || isOutboundQuery || isInboundQuery || dataKeywords.test(question || "") || !!imageDataUrl;
  return { isDwReport, isQueueReport, isRestAssetQuery, isPerformanceBaggerQuery, isInventoryControlQuery, isOutboundQuery, isInboundQuery, isDataQuery };
}

// Modul data yang kena pertanyaan ini (bisa 0, 1, atau banyak). Kalau regex gak nangkep apa pun
// tapi pertanyaannya "data-ish", tanya AI dulu (classifyModulesWithAI).
async function resolveMatchedModules(topics, question, imageDataUrl){
  const { isDwReport, isQueueReport, isRestAssetQuery, isPerformanceBaggerQuery, isInventoryControlQuery, isOutboundQuery, isInboundQuery, isDataQuery } = topics;
  // ===== GABUNGAN MODUL (BARU) =====
  // Kumpulin SEMUA modul data (non-gambar) yang kedeteksi cocok dari regex di
  // atas — bisa 0, 1, atau lebih dari 1. Kalau lebih dari satu, system prompt
  // di bawah bakal digabung (lihat moduleBlocks) biar Odyssey bisa jawab
  // pertanyaan yang nyenggol beberapa modul sekaligus dalam SATU balasan,
  // bukan cuma modul yang kebetulan menang urutan prioritas kayak sebelumnya.
  let matchedModules = [];
  if (isRestAssetQuery) matchedModules.push("rest_asset");
  if (isOutboundQuery) matchedModules.push("outbound");
  if (isPerformanceBaggerQuery) matchedModules.push("performance_bagger");
  if (isInventoryControlQuery) matchedModules.push("inventory_control");
  if (isInboundQuery) matchedModules.push("inbound");

  // Kalau regex kosakata di atas GAK NANGKEP satupun modul spesifik, TAPI
  // pertanyaannya masih kecium "data-ish" (dataKeywords generik/ada gambar),
  // kemungkinan besar user pakai istilah/singkatan/typo yang belum ke-cover
  // regex — coba tanya ke AI dulu (classifyModulesWithAI) sebelum nyerah ke
  // mode obrolan santai. Gak dipanggil kalau mode DW/Queue (itu emang exclusive
  // & butuh gambar, bukan soal kosakata) atau kalau regex UDAH ketemu modulnya
  // (hemat 1 panggilan API ekstra buat kasus yang udah jelas).
  if (!isDwReport && !isQueueReport && matchedModules.length === 0 && isDataQuery && !imageDataUrl){
    matchedModules = await classifyModulesWithAI(question);
  }
  return matchedModules;
}
