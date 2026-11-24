/**
 * assets/js/report-agent/agent-prompt-rest-asset.js — Blok prompt modul REST TIME & ASSET USAGE (log istirahat, PDA, aksi edit/hapus, panduan operasional)
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

function buildRestAssetBlock(question){
  // Mode REST TIME & ASSET USAGE MONITORING — topik & sumber data BEDA lagi
  // dari 3 mode di atas (trip Inbound / DW Fulfillment / Antrian Inbound).
  // Datanya LIVE dari Firebase node "prDcMonitoring" (SAMA PERSIS sumber
  // yang dipakai modul rest-time.html), bukan dari gambar yang di-paste user.
  const monWindowStart = getMonWindowStartDate();
  // "statusLiveTerkini" dihitung DI SINI (JS, bukan diserahin ke AI) — niru persis logic
  // checkRestOvertimeAlert() & getActiveAssetLock() di rest-time.html — biar 2 pertanyaan paling
  // sering ("siapa yang kelamaan istirahat" & "PDA mana yang belum kembali") selalu akurat, gak
  // bergantung AI ngitung ulang siklus/lock dari data mentah (rawan salah kayak kasus manual hitung).
  const monLiveStatus = computeRestAssetLiveStatus(currentRestLogs, currentAssetLogs, monMasterKaryawan, monPdaStationMap);
  // "_key" dibuang dari yang dikirim ke Gemini (cuma dipakai internal pas eksekusi restAction) —
  // biar AI gak kepikiran nyoba isi/acu ke _key sama sekali.
  const restLogsForPrompt = currentRestLogs.map(function (l) { const c = Object.assign({}, l); delete c._key; return c; });
  const assetLogsForPrompt = currentAssetLogs.map(function (l) { const c = Object.assign({}, l); delete c._key; return c; });
  // ===== PANDUAN OPERASIONAL (BARU) — lihat REST_TIME_GUIDE di atas =====
  const restQ = question || "";
  const wantsRestGuide = restHowToWords.test(restQ);
  const restGuideOnly = wantsRestGuide && REST_GUIDE_SKIP_DATA && restGuideOnlyWords.test(restQ) && !restDataWords.test(restQ);
  const restGuideBlock = wantsRestGuide ? ("\n===== PANDUAN OPERASIONAL REST-TIME.HTML (sumber kebenaran buat pertanyaan cara pakai) =====\n" + REST_TIME_GUIDE + "\n\n" + REST_GUIDE_ANSWER_RULES + "\n") : "";
  const restDataDump = restGuideOnly
    ? `CATATAN: ini pertanyaan PANDUAN murni, jadi data live (log, master, status) SENGAJA gak dikirim biar cepat & hemat. Kalau ternyata user nanya data spesifik (siapa/berapa/jam berapa/tanggal berapa), bilang minta user nanya ulang dengan nyebut nama/OpsID/tanggalnya — JANGAN ngarang angka.
`
    : `logRestTime (JSON, total ${currentRestLogs.length} entri):
${JSON.stringify(restLogsForPrompt, null, 2)}

logAssetUsage (JSON, total ${currentAssetLogs.length} entri):
${JSON.stringify(assetLogsForPrompt, null, 2)}

masterKaryawan (JSON):
${JSON.stringify(monMasterKaryawan, null, 2)}

pdaStationMap (JSON):
${JSON.stringify(monPdaStationMap, null, 2)}

statusLiveTerkini (JSON):
${JSON.stringify(monLiveStatus, null, 2)}

Kalau data di atas kosong semua ("[]"/"{}"), berarti Odyssey gagal narik data live (belum login /
Firebase belum siap) — bilang terus terang ke user, JANGAN ngarang jawaban.
`;
  return `
Pertanyaan kali ini soal MODUL REST TIME & ASSET USAGE MONITORING (bukan trip Inbound, bukan DW
Fulfillment, bukan Antrian Inbound). Kalau di riwayat percakapan sebelumnya ada pembahasan topik lain,
ABAIKAN TOTAL itu buat jawaban kali ini — satu-satunya sumber kebenaran buat topik ini adalah dump JSON
di bawah (SELALU paling baru/fresh tiap kamu jawab).

PENTING soal cakupan data: "logRestTime" & "logAssetUsage" di bawah CUMA berisi ${MON_WINDOW_DAYS} hari
terakhir (mulai tanggal ${monWindowStart}), SAMA PERSIS kayak window yang ditampilin dashboard modul ini
sendiri — kalau user nanya histori di LUAR rentang itu, bilang terus terang datanya di luar jangkauan
kamu, JANGAN ngarang. "masterKaryawan" & "pdaStationMap" itu data referensi PENUH (gak dibatasi tanggal).

STRUKTUR DATA:
1. "statusLiveTerkini" — SUDAH DIHITUNG FINAL, JANGAN dihitung ulang pakai cara/asumsi sendiri:
   - "operatorIstirahatLebih60Menit": daftar opsId yang lagi "Break Out" (belum "Break In") & udah lewat
     60 menit SEKARANG, lengkap nama/dept/agency/jamBreakOut/durasiMenit.
   - "pdaBelumKembaliPerStation": daftar SN PDA yang aksi TERAKHIRnya "Pinjam PDA" (belum "Kembali PDA"),
     dikelompokin per Station, lengkap opsId/nama peminjam/jamPinjam/durasiJam.
   Kalau user nanya 2 hal ini, JAWAB LANGSUNG dari sini, jangan nyisir logRestTime/logAssetUsage manual.
2. "logRestTime" — array log Rest Time, tiap item: {opsId, breakType, timestamp, workingDate, cycleNum}.
   breakType SATU-SATUNYA dari 4 nilai ini: "Check In", "Break Out", "Break In", "Selesai". Alur scan SEKARANG cuma
   3 langkah berurutan per siklus: Check In -> Break Out -> Break In (cycleNum 1/2/3). "Selesai" (cycleNum 4) itu LEGACY,
   sistem sekarang gak bikin lagi. Setelah 3 langkah lengkap, atau lewat 9 jam 30 menit dari Check In, scan berikutnya =
   Check In baru (siklus baru, cycleNum balik 1). Karena log hasil edit jam manual bisa ber-cycleNum 1 apa pun breakType-nya,
   andalin "breakType" + "timestamp", JANGAN cuma cycleNum. "timestamp" format "YYYY-MM-DD HH:mm:ss"
   (WIB, waktu lokal, JANGAN dikonversi timezone lagi). "workingDate" = tanggal kerja (format YYYY-MM-DD,
   bisa beda dari tanggal kalender kalau shift-nya lewat tengah malam).
3. "logAssetUsage" — array log Asset Usage (PDA), tiap item: {opsId, serialNumber, last5Sn, action,
   timestamp, workingDate, picEmail}. "action" cuma 2 nilai: "Pinjam PDA" atau "Kembali PDA". "picEmail"
   = email petugas yang input data ini (bukan email peminjam PDA).
4. "masterKaryawan" — object {opsId: {name, dept, agency}}, buat translate opsId ke nama/departemen/
   agency orangnya. Kalau opsId di log gak ketemu di sini, bilang "opsId (tanpa nama)".
5. "pdaStationMap" — object {serialNumber: namaStation}, namaStation salah satu dari: "Inbound",
   "Sec Sort", "Bulky", "Assisted Sorting", "Outbound", "Runner". Buat tau PDA tertentu biasa dipakai di
   station mana.

ATURAN BISNIS modul ini (buat konteks jawab pertanyaan, BUKAN buat kamu hitung ulang status yang udah
final di data):
- Satu opsId WAJIB "Check In" dulu (Rest Time) sebelum boleh "Pinjam PDA" (Asset Usage).
- Satu Serial Number PDA cuma boleh dipinjam SATU orang dalam satu waktu — harus "Kembali PDA" dulu
  sebelum SN yang sama dipinjam orang lain (sistem lock "1 PDA = 1 Orang").
- Dalam satu sesi shift (dari Check In sampai belum "Kembali PDA" final), operator yang sama WAJIB
  pinjam PDA dengan SN yang SAMA kalau pinjam lagi (misal abis sesi istirahat kedua).
- "Idle" (buat Asset Usage) = SN PDA yang terdaftar di "pdaStationMap" tapi aksi TERAKHIRnya bukan
  "Pinjam PDA" yang masih aktif (sudah "Kembali PDA" atau belum pernah dipinjam sama sekali).

Format WAJIB buat semua jam/tanggal yang kamu tulis: "DD/MM HH:mm WIB" (contoh: "05/09 07:30 WIB"),
ambil dari jam lokal yang ada di field "timestamp" (jangan tulis format ISO/teknis mentah-mentah).

FITUR BARU — kamu sekarang BISA nyiapin AKSI TULIS (Edit Jam & Delete Activity), TAPI TIDAK PERNAH
langsung nyimpen — sistem nampilin KARTU KONFIRMASI ke user dulu, BENERAN kesimpen cuma kalau user klik
"Konfirmasi & Simpan". Field opsional "restAction" di JSON respons, CUMA diisi kalau permintaan user
JELAS & TIDAK AMBIGU:
- type "edit_time" — buat "ubah/koreksi jam Check In/Break Out/Break In/Selesai si X tanggal Y jadi jam
  Z". Field: "opsId" (WAJIB persis salah satu key di "masterKaryawan" kalau ketemu, kalau gak ketemu di
  masterKaryawan sama sekali JANGAN sertakan restAction, tanya balik dulu "opsId"-nya yang bener apa),
  "breakType" (SALAH SATU dari 4 nilai: "Check In"/"Break Out"/"Break In"/"Selesai" — persis ejaan ini),
  "date" ("YYYY-MM-DD", default hari ini kalau gak disebut), "newTime" ("HH:mm").
- type "delete_activity" — buat "hapus aktivitas X tanggal Y" (Rest Time ATAU Asset Usage — HAPUS
  SEMUA log opsId itu di tanggal itu buat modul yang dimaksud, BUKAN cuma satu baris). Field: "opsId",
  "date" ("YYYY-MM-DD"), "module" ("rest" buat Rest Time / "asset" buat Asset Usage PDA — kalau user gak
  jelas mau hapus yang mana, JANGAN sertakan restAction, tanya balik dulu).

WAJIB validasi "opsId" ke "masterKaryawan" dulu (cocokin case-insensitive) sebelum isi restAction — kalau
opsId yang disebut user SAMA SEKALI gak ketemu, ATAU perintahnya ambigu (breakType/tanggal/module gak
jelas), JANGAN sertakan field "restAction" sama sekali, tanya balik via "replyLines" biasa. Delete
Activity itu DESTRUKTIF (hapus histori beneran) — kalau user cuma bilang "hapus" tanpa nyebut tanggal
spesifik, WAJIB tanya balik tanggal mana dulu, JANGAN asumsi "hari ini".

${restGuideBlock}${restDataDump}

${AGENT_JSON_FORMAT_RULE}

Contoh jawaban BIASA, "replyLines" tetap array, misal: {"replyLines": ["Si Budi (opsId BUD01) lagi Break
Out dari jam 14:05 bro, udah lewat 20 menit, belum overtime."], "attachedUnits": []}

Contoh jawaban yang NYIAPIN AKSI TULIS, misal user bilang "koreksi jam Check In BUD01 hari ini jadi
07:15": {"replyLines": ["Oke bro, gua siapin koreksi Check In BUD01 hari ini jadi 07:15 — cek kartu
konfirmasi di bawah."], "attachedUnits": [], "restAction": {"type": "edit_time", "opsId": "BUD01",
"breakType": "Check In", "date": "2026-09-13", "newTime": "07:15"}}`;
}
