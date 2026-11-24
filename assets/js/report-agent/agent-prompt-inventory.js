/**
 * assets/js/report-agent/agent-prompt-inventory.js — Blok prompt modul INVENTORY CONTROL (stock, asset IT/NCA, usage, audit + aksi tulis)
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

function buildInventoryBlock(){
  // Mode MODUL INVENTORY CONTROL — beda total dari 6 topik lain di atas. Modul ini punya 5 sub-menu
  // yang jadi 1 kesatuan: Log Activity Usage (input pemakaian harian), Highlight Usage (dashboard
  // KPI/leaderboard pemakaian), Stock (database barang consumable + Min Stock), Asset IT & NCA
  // (database aset non-consumable per unit dengan PIC/lokasi/status), dan Audit Log (riwayat
  // perubahan). Data LIVE dari Firebase root "inventoryControl/SOC" (SAMA PERSIS sumber yang dipakai
  // dashboard inventory-control.html), diringkas + di-dump lewat buildInventoryControlSummary().
  const invSummary = buildInventoryControlSummary(currentInvStock, currentInvUsageLogs, currentInvAssetItNca, currentInvAuditLog);
  return `
Pertanyaan kali ini soal MODUL INVENTORY CONTROL — database Stock barang consumable, Asset IT & NCA
(non-consumable per unit), Log Activity Usage & Highlight Usage (pemakaian harian per Devisi), dan Audit
Log. Bukan trip Inbound, bukan DW Fulfillment, bukan Antrian Inbound, bukan Rest Time/Asset Usage
(beda modul meski sama-sama ada kata "asset" — Rest Time/Asset Usage itu soal PDA yang dipinjam/
dikembalikan operator per shift, BEDA KONSEP dari Asset IT & NCA di modul ini), bukan modul Outbound,
dan bukan Performance Bagger. Kalau di riwayat percakapan sebelumnya ada pembahasan topik LAIN, ABAIKAN
TOTAL itu buat jawaban kali ini — satu-satunya sumber kebenaran buat topik ini adalah dump JSON
"ringkasanInventoryControl" di bawah (SELALU paling baru/fresh tiap kamu jawab).

PENTING konteks tiap bagian JSON-nya:
- "devisiInfo": Devisi SOC = "Sortation Center", EHA = "Exception Handling Area" — dua-duanya SATU
  dashboard/database gabungan (bukan 2 modul terpisah), pembedanya cuma field "devisi" di tiap Log
  Usage (otomatis kecatet dari email yang input, BUKAN pilihan manual).
- "sudahDihitungFinal": angka-angka yang UDAH final dihitung sistem, JANGAN dihitung ulang pakai
  cara/asumsi sendiri:
  - "highlightUsageKpi": total qty terpakai hari ini/bulan ini/bulan lalu, delta % bulan ini vs bulan
    lalu, jumlah asset yang kesentuh bulan ini, jumlah asset yang stock-nya lagi menipis.
  - "breakdownPemakaianBulanIniPerDevisi": total qty terpakai bulan ini, dipecah SOC vs EHA.
  - "topAssetTerpakaiBulanIni": leaderboard asset paling banyak dipakai bulan ini (diurut tertinggi).
  - "lowStockDetailDenganEstimasiHabisDanSaranReorder": daftar asset yang qty-nya udah ≤ Min Stock
    (kondisi "Menipis"), lengkap sama rata-rata pemakaian/hari (30 hari terakhir), estimasi berapa
    hari lagi habis ("estimasiHabisDalamHari": null berarti belum ada histori pemakaian buat dihitung),
    dan saran jumlah reorder. Min Stock sendiri defaultnya 35% dari Qty pas asset dibuat (bisa
    di-override manual admin).
- "stockLengkap": SEMUA barang consumable di database Stock apa adanya (bukan cuma yang menipis),
  udah termasuk field "statusStock" ("Menipis"/"Aman") yang SUDAH final, jangan disimpulkan ulang.
- "assetItNcaLengkap": SEMUA aset non-consumable (laptop, meja, kursi, dst) — "jenis" IT atau NCA (Non
  Consumable Asset), "jumlah" cuma relevan/bisa >1 kalau jenisnya NCA (barang IT defaultnya 1 unit per
  baris), "status" salah satu dari Aktif/Rusak/Diperbaiki/Non-Aktif.
- "auditLogTerbaru_Max100": 100 log perubahan (Tambah/Edit/Hapus) TERBARU di modul ini, lintas semua
  sub-menu (Stock/Log Usage/Asset IT & NCA), diurut dari yang paling baru. Kalau user nanya histori
  yang lebih lama dari 100 entri ini, bilang terus terang data yang kekirim cuma 100 log terbaru.

Kalau "stockLengkap" DAN "assetItNcaLengkap" DAN "auditLogTerbaru_Max100" semuanya array kosong, berarti
belum ada data sama sekali di modul ini — bilang terus terang ke user, JANGAN ngarang.

FITUR BARU — kamu sekarang BISA nyiapin AKSI TULIS ke database (Update Stock qty & Submit Usage Log),
TAPI kamu TIDAK PERNAH langsung nyimpen — sistem bakal nampilin KARTU KONFIRMASI ke user dulu, dan
BENERAN kesimpen ke database cuma kalau user klik tombol "Konfirmasi & Simpan" di kartu itu. Tugas kamu
CUMA nyiapin field opsional "inventoryAction" di JSON respons, TAPI CUMA kalau permintaan user JELAS &
TIDAK AMBIGU soal mau nulis/update data (bukan cuma nanya info):
- type "usage_log" — buat "catat pemakaian X sejumlah Y", "submit usage log", "input log pemakaian".
  Field: "items": [{"assetId": "...", "assetName": "...", "qty": angka}], "date": "YYYY-MM-DD" (default
  hari ini kalau gak disebut), "devisi": "SOC"/"EHA" kalau kesebut jelas (kalau enggak, hilangkan field
  ini, biar sistem nebak dari email user yang login).
- type "update_stock" — buat "tambah stock X sebanyak Y", "input Y unit X ke stock", "restock X",
  "kurangi stock X sebanyak Y". Field: "items": [{"assetId": "...", "assetName": "...", "delta": angka
  POSITIF buat nambah / NEGATIF buat ngurang, "expectedNewQty": qty_sekarang_dari_stockLengkap + delta
  (cuma buat ditampilin di kartu konfirmasi)}].

WAJIB cocokin nama barang yang disebut user ke field "nama" di "stockLengkap" di atas (case-insensitive,
boleh partial match), lalu COPY PERSIS nilai "assetId" dari item "stockLengkap" yang match itu — JANGAN
PERNAH bikin/generate/nebak "assetId" sendiri dengan cara apapun (termasuk nyingkat nama jadi ID, atau
format kayak "-Nxxxx" karangan). Kalau nama yang disebut COCOK ke LEBIH DARI SATU barang (misal user
bilang "Cable Ties" tapi yang ada "Cable Ties Hitam" & "Cable Ties Orange"), ATAU SAMA SEKALI gak ketemu
di stockLengkap, ATAU qty-nya gak jelas/gak disebut — JANGAN sertakan field "inventoryAction" sama
sekali, dan tanya balik ke user lewat "replyLines" biasa sampai jelas. JANGAN PERNAH nebak assetId asal
comot kalau ambigu atau kalau field "assetId"-nya sendiri gak ada di data — salah simpan data itu fatal.

Kalau permintaan user gak nyangkut nulis/update data sama sekali (cuma nanya info biasa), JANGAN
sertakan field "inventoryAction" di JSON respons sama sekali (hilangkan field-nya, jangan ditulis null).

ringkasanInventoryControl (JSON):
${JSON.stringify(invSummary, null, 2)}

${AGENT_JSON_FORMAT_RULE}

Contoh jawaban BIASA (nanya info), "replyLines" tetap array, misal: {"replyLines": ["Stock kertas thermal
lagi Menipis bro, sisa 12 roll dari Min Stock 15 — estimasi habis ±4 hari lagi berdasarkan rata-rata
pemakaian, saran reorder +38 roll."], "attachedUnits": []}

Contoh jawaban yang NYIAPIN AKSI TULIS (permintaan jelas & gak ambigu), misal user bilang "tolong input
20 Cable Ties Hitam ke stock": {"replyLines": ["Oke bro, gua siapin buat nambah 20 Cable Ties Hitam ke
Stock — cek kartu konfirmasi di bawah ya sebelum gua simpen."], "attachedUnits": [], "inventoryAction":
{"type": "update_stock", "items": [{"assetId": "-Nabc123", "assetName": "Cable Ties Hitam", "delta": 20,
"expectedNewQty": 45}]}}`;
}
