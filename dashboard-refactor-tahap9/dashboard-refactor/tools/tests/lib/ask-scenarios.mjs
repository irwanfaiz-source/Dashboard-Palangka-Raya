// Skenario karakterisasi askAgent(). Tiap skenario: { name, question, image?, history?, state?, model?, classify?, responses[] }
const okResp = (obj, model) => ({ text: JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof obj === "string" ? obj : JSON.stringify(obj) }] } }], ...(model ? { modelUsed: model } : {}) }) });
const rawResp = (text, model) => ({ text: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }], ...(model ? { modelUsed: model } : {}) }) });
const IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==";
const GOOD = (lines = ["jawaban uji"]) => okResp({ replyLines: lines, attachedUnits: [] });

export const SCENARIOS = [
  // ---------- pemilihan mode / prompt ----------
  { name: "mode-ringan: obrolan santai", question: "bro makasih ya", responses: [GOOD()] },
  { name: "mode-inbound: report late arrival", question: "report late arrival hari ini", responses: [GOOD()] },
  { name: "mode-inbound: convoy", question: "ada convoy gak hari ini bro", responses: [GOOD()] },
  { name: "mode-DW: report + gambar", question: "buatin report dw fulfillment dong", image: IMG, responses: [GOOD()] },
  { name: "mode-DW: tanpa gambar", question: "kebutuhan dw hari ini berapa", responses: [GOOD()] },
  { name: "mode-antrian: hanya gambar tanpa teks", question: "", image: IMG, responses: [GOOD()] },
  { name: "mode-antrian: kata kunci eco std", question: "report antrian eco std dong", responses: [GOOD()] },
  { name: "modul-rest: istirahat kelamaan", question: "siapa yang kelamaan istirahat?", responses: [GOOD()] },
  { name: "modul-rest: PDA belum kembali", question: "pda mana yang belum kembali", responses: [GOOD()] },
  { name: "modul-outbound: aging backlog", question: "aging backlog packer gimana", responses: [GOOD()] },
  { name: "modul-bagger: top performer", question: "siapa top performer bagger bulan ini", responses: [GOOD()] },
  { name: "modul-inventory: stock menipis", question: "stock menipis apa aja", responses: [GOOD()] },
  { name: "gabungan-2: rest + inventory", question: "asset usage sama stock ATK gimana?", responses: [GOOD()] },
  { name: "gabungan-3: inbound + outbound + inventory", question: "trip late hari ini, occupancy gudang, sama stock menipis gimana", responses: [GOOD()] },
  { name: "gabungan-5: semua modul", question: "trip late, istirahat kelamaan, aging backlog, bagger, dan stock menipis", responses: [GOOD()] },
  { name: "gambar + teks modul (bukan antrian)", question: "stock menipis di gambar ini?", image: IMG, responses: [GOOD()] },


  // ---------- BARU: panduan operasional Rest Time + kata kunci Rest/Pre-Work ----------
  { name: "panduan: cara scan check in (murni)", question: "gimana cara scan check in di rest time", responses: [GOOD()] },
  { name: "panduan: kenapa check in diblok pre-work", question: "kenapa check in diblok pre-work", responses: [GOOD()] },
  { name: "panduan: perintah /panduan", question: "Jelasin cara pakai Rest Time & Asset Usage Monitoring", responses: [GOOD()] },
  { name: "panduan: perintah /prework", question: "Kenapa Check In di Rest Time bisa diblok karena Pre-Work dan gimana solusinya?", responses: [GOOD()] },
  { name: "panduan + data: cara pakai & siapa istirahat hari ini", question: "cara pakai rest time, terus siapa yang istirahat hari ini", responses: [GOOD()] },
  { name: "panduan + gabungan modul lain", question: "cara pakai rest time dan stock menipis apa aja", responses: [GOOD()] },
  { name: "panduan: tanpa kata tanya cara -> bukan panduan", question: "siapa yang kelamaan istirahat?", responses: [GOOD()] },
  { name: "panduan: state kosong", question: "apa itu pre-work unfit", state: { currentRestLogs: [], currentAssetLogs: [], monMasterKaryawan: {}, monPdaStationMap: {} }, responses: [GOOD()] },
  { name: "kata kunci baru: attendance fms", question: "attendance fms hari ini gimana", responses: [GOOD()] },
  { name: "kata kunci baru: double scan / wrong device", question: "kenapa muncul wrong device sama double scan", responses: [GOOD()] },
  { name: "kata kunci baru: clock in raw staff", question: "clock in raw staff profile kok kosong", responses: [GOOD()] },

  // ---------- klasifikasi AI (fallback) ----------
  { name: "fallback-AI: dipanggil, hasil [outbound]", question: "kasih rekap ringkas dong", classify: ["outbound"], responses: [GOOD()] },
  { name: "fallback-AI: dipanggil, hasil 2 modul", question: "kasih rekap ringkas dong", classify: ["inventory_control", "performance_bagger"], responses: [GOOD()] },
  { name: "fallback-AI: dipanggil, hasil kosong -> mode lengkap", question: "kasih rekap ringkas dong", classify: [], responses: [GOOD()] },
  { name: "fallback-AI: tidak dipanggil karena ada gambar -> mode lengkap/antrian", question: "kasih rekap ringkas dong", image: IMG, classify: ["outbound"], responses: [GOOD()] },
  { name: "fallback-AI: tidak dipanggil karena regex sudah ketemu", question: "rekap stock menipis", classify: ["outbound"], responses: [GOOD()] },
  { name: "fallback-AI: error -> askAgent melempar (di luar try)", question: "kasih rekap ringkas dong", classifyThrows: "classify gagal", responses: [GOOD()] },

  // ---------- panggilan API: format & parsing ----------
  { name: "api: JSON bersih, model proxy dilaporkan", question: "halo", responses: [okResp({ replyLines: ["a", "", "b"], attachedUnits: ["T1"] }, "gemini-3-flash")] },
  { name: "api: pakai pilihan dropdown, proxy ganti model", question: "halo", model: "gemini-3.5-flash", responses: [okResp({ replyLines: ["ok"], attachedUnits: [] }, "gemini-3.1-flash-lite")] },
  { name: "api: tanpa elemen #modelSelect", question: "halo", noModelSelect: true, responses: [GOOD()] },
  { name: "api: format lama 'reply' (string)", question: "halo", responses: [okResp({ reply: "balasan lama", attachedUnits: [] })] },
  { name: "api: tanpa replyLines & reply -> '...'", question: "halo", responses: [okResp({ attachedUnits: [] })] },
  { name: "api: code fence + kalimat pembuka/penutup", question: "halo", responses: [rawResp('Ini jawabannya:\n```json\n{"replyLines":["dari fence"],"attachedUnits":[]}\n```\nSemoga membantu')] },
  { name: "api: newline literal di dalam string", question: "halo", responses: [rawResp('{"replyLines":["baris1\nbaris2"],"attachedUnits":[]}')] },
  { name: "api: over-escaped \\\\n", question: "halo", responses: [rawResp('{"replyLines":["a\\\\nb"],"attachedUnits":[]}')] },
  { name: "api: smart quotes", question: "halo", responses: [rawResp('{“replyLines”:[“kutip pintar”],“attachedUnits”:[]}')] },
  { name: "api: trailing comma", question: "halo", responses: [rawResp('{"replyLines":["koma",],"attachedUnits":[],}')] },
  { name: "api: retry — gagal parse 2x lalu berhasil (ganti model tiap kali)", question: "halo", model: "gemini-3-flash",
    responses: [rawResp("bukan json sama sekali", "gemini-3-flash"), rawResp("masih bukan json", "gemini-3.1-flash-lite"), okResp({ replyLines: ["akhirnya"], attachedUnits: [] }, "gemini-3.5-flash")] },
  { name: "api: retry — tanpa info model dari proxy", question: "halo",
    responses: [rawResp("rusak"), rawResp("rusak lagi"), okResp({ replyLines: ["pulih"], attachedUnits: [] })] },
  { name: "api: semua gagal parse tapi replyLines bisa ditarik regex", question: "halo",
    responses: Array(3).fill(rawResp('{"replyLines":["baris A","baris \\"kutip\\" B\\nlanjut"],"attachedUnits":[ BROKEN', "gemini-3-flash")) },
  { name: "api: semua gagal total -> pesan 'berantakan'", question: "halo", responses: Array(3).fill(rawResp("sampah total tanpa kurung")) },
  { name: "api: kandidat kosong (respons {})", question: "halo", responses: Array(3).fill({ text: "{}" }) },
  { name: "api: respons kosong string", question: "halo", responses: Array(3).fill({ text: "" }) },
  { name: "api: HTTP 500 dengan error.message", question: "halo", responses: [{ ok: false, status: 500, text: JSON.stringify({ error: { message: "Kuota habis" } }) }] },
  { name: "api: HTTP 429 dengan error string", question: "halo", responses: [{ ok: false, status: 429, text: JSON.stringify({ error: "RESOURCE_EXHAUSTED" }) }] },
  { name: "api: HTTP 502 tanpa error", question: "halo", responses: [{ ok: false, status: 502, text: JSON.stringify({}) }] },
  { name: "api: body non-JSON -> error", question: "halo", responses: [{ text: "<html>crash</html>" }] },
  { name: "api: diblokir safety (blockReason)", question: "halo", responses: [{ text: JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }) }] },
  { name: "api: fetch gagal (jaringan)", question: "halo", responses: [{ reject: "Failed to fetch" }] },
  { name: "api: gagal di percobaan ke-2 (jaringan) setelah parse gagal", question: "halo", responses: [rawResp("rusak"), { reject: "putus di tengah" }] },

  // ---------- aksi tulis ----------
  { name: "aksi: inventoryAction -> kartu konfirmasi", question: "pakai 2 lakban", responses: [okResp({ replyLines: ["siap"], attachedUnits: [], inventoryAction: { type: "usage", items: [{ assetName: "Lakban", qty: 2 }] } })] },
  { name: "aksi: inventoryAction items kosong -> tidak ada kartu", question: "halo", responses: [okResp({ replyLines: ["x"], inventoryAction: { type: "usage", items: [] } })] },
  { name: "aksi: restAction -> kartu konfirmasi", question: "break in OPS1", responses: [okResp({ replyLines: ["ok"], restAction: { type: "edit", opsId: "OPS1", timestamp: "08:30" } })] },
  { name: "aksi: restAction tanpa opsId -> tidak ada kartu", question: "halo", responses: [okResp({ replyLines: ["ok"], restAction: { type: "edit" } })] },
  { name: "aksi: dua-duanya", question: "halo", responses: [okResp({ replyLines: ["ok"], inventoryAction: { items: [{ a: 1 }] }, restAction: { type: "t", opsId: "O" } })] },

  // ---------- riwayat & gambar ----------
  { name: "riwayat: > 12 pesan dipangkas, campur gambar & asisten", question: "lanjut dong",
    history: Array.from({ length: 16 }, (_, i) => i % 3 === 0
      ? { role: "user", content: [{ type: "text", text: "teks " + i }, { type: "image_url", image_url: { url: IMG } }], hasImage: true }
      : { role: i % 2 ? "assistant" : "user", content: "pesan ke-" + i }), responses: [GOOD()] },
  { name: "riwayat: gambar tidak valid & part aneh", question: "oke",
    history: [{ role: "user", content: [{ type: "image_url", image_url: { url: "bukan-data-url" } }, { type: "image_url" }, { text: "tanpa type" }, null], hasImage: true }, { role: "assistant", content: null }], responses: [GOOD()] },
  { name: "riwayat: pertanyaan dengan gambar & teks kosong", question: "", image: IMG, history: [{ role: "assistant", content: "hai" }], responses: [GOOD()] },
  { name: "state kosong: semua data modul kosong", question: "trip late, istirahat, aging, bagger, stock",
    state: { currentTrips: [], currentRestLogs: [], currentAssetLogs: [], monMasterKaryawan: {}, monPdaStationMap: {}, currentOutboundRaw: [], currentPbDailyRecords: {}, currentPbImportLogs: {}, currentInvStock: {}, currentInvUsageLogs: {}, currentInvAssetItNca: {}, currentInvAuditLog: {} }, responses: [GOOD()] },
];
