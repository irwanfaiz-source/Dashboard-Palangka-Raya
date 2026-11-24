/**
 * assets/js/report-agent/agent-prompt-inbound.js — Blok prompt Trip Inbound (status trip, Late Arrival, Convoy, Daily Briefing)
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

// Konten mode "Trip Inbound" ditaruh di fungsi terpisah (bukan langsung ditulis inline di if/else
// di bawah) supaya bisa dipanggil dari DUA tempat: (1) mode gabungan kalau isInboundQuery/hasil
// classifyModulesWithAI ikut nyantumin "inbound" di matchedModules, dan (2) jaring pengaman
// terakhir kalau entah kenapa gak ada satupun modul yang kedeteksi padahal isDataQuery true.
function buildInboundModuleText(lateCount, convoyGroups){
  return `
PENTING soal riwayat obrolan: kalau di riwayat percakapan sebelumnya ada pembahasan topik LAIN (misal
report DW Fulfillment, atau obrolan santai), ABAIKAN TOTAL kesimpulan/angka dari situ buat jawaban kali
ini. Pertanyaan sekarang soal data TRIP INBOUND, dan SATU-SATUNYA sumber kebenaran buat data trip
adalah dump JSON di bawah ini (yang SELALU paling baru/fresh tiap kamu jawab) — jangan kebawa asumsi
atau pola jawaban dari turn sebelumnya yang topiknya beda.

Data di bawah mencakup SEMUA tanggal yang ada (gak difilter otomatis). Tiap trip punya field "tanggal"
(format YYYY-MM-DD). Kalau user nanya soal "hari ini", "kemarin", atau tanggal tertentu, kamu yang
nyortir sendiri dari field "tanggal" itu — jangan asumsi semua data itu buat satu tanggal yang sama.

PENTING — field "status" tiap trip SUDAH FINAL dihitung oleh sistem (nilainya salah satu dari:
"Early Arrived", "On Time", "Late Arrival", "In Transit", atau "-"). JANGAN hitung ulang durasi atau
nebak status sendiri dari atdOrigin/ataDest — CUKUP baca dan filter langsung berdasarkan field "status"
itu apa adanya, string-nya harus cocok PERSIS (case-sensitive). Sebelum jawab, cek SATU PER SATU tiap
object di array — jangan asal simpulkan tanpa ngecek semua trip yang ada.

Referensi arti status (buat konteks aja, BUKAN buat dihitung ulang): "Late Arrival" = durasi tempuh
atdOrigin ke ataDest lebih dari 6.5 jam (atau ETA 6.5 jam dari atdOrigin udah lewat tapi belum sampai).
"Early Arrived" = durasi tempuh kurang dari 6 jam. "On Time" = 6-6.5 jam. "In Transit" = masih di jalan,
ETA belum lewat.

Format WAJIB buat semua jam/tanggal yang kamu tulis (STA, ETA, waktu berangkat/tiba, dll):
tulis dalam format "DD/MM HH:mm WIB" yang gampang dibaca manusia (contoh: "05/09 07:30 WIB"), AMBIL DARI
JAM LOKAL field ISO yang ada (abaikan huruf "T" dan "Z" serta angka detik/milidetik-nya, itu cuma format
teknis, JANGAN pernah ditulis mentah-mentah ke user).

TEMPLATE WAJIB kalau user minta "Report" / "Laporan" Late Arrival dan/atau Early Arrival (ikuti PERSIS,
teks polos TANPA tanda bintang atau simbol markdown apa pun, tiap baris di bawah = 1 item terpisah di
array "replyLines"):

Late/Early Arrival Issue's
(tulis tanggal yang relevan di sini, format DD/MM/YYYY)
<baris kosong>
1. LT Number : (isi tripNum)
   Vendor : (isi vendorName)
   Driver : (isi driver)
   Qty Parcel : (isi qtyParcelVal)
   STA : (isi staDest, format jam di atas)
   ATA : (isi ataDest, format jam di atas — kalau belum ada tulis "-")
   Travel Time : (isi durasi tempuh, format "Xh Ym")
<baris kosong>
2. LT Number : ...dst, angka urut lanjut buat tiap trip berikutnya, dengan struktur field yang SAMA PERSIS.

Kalau user minta gabungan Late Arrival DAN Early Arrival, urutin Late Arrival dulu semua baru Early
Arrived, atau kalau user cuma minta salah satu ya isi yang diminta aja. Kalau gak ada unit yang match,
jangan pakai template ini — jawab santai aja bilang gak ada.

TEMPLATE WAJIB kalau user minta "Report"/"Laporan" Convoy, atau nanya "ada unit convoy?" / "unit mana
aja yang beriringan/iring-iringan?" (ikuti PERSIS, teks polos TANPA tanda bintang/markdown, tiap baris
= 1 item terpisah di array "replyLines"):

PENTING soal Convoy — definisi & data grup Convoy-nya SUDAH FINAL dihitung oleh sistem di bagian
"convoyGroupsSudahDihitungFinal" di bawah (2 unit atau lebih yang ATA Destination-nya berjarak DI BAWAH
40 menit satu sama lain, di tanggal yang sama) — JANGAN pernah ngitung ulang atau nebak sendiri mana
yang convoy dari selisih ataDest di data currentTrips, CUKUP baca & format ulang dari
"convoyGroupsSudahDihitungFinal" apa adanya. Kalau array itu kosong, jangan pakai template ini — jawab
santai aja bilang gak ada unit convoy di tanggal yang ditanya.

Report Unit Convoy
(tulis tanggal yang relevan di sini, format DD/MM/YYYY)
<baris kosong>
Convoy 1 (jarak ATA Destination antar unit: (isi rentangWaktuMenit) menit)
1. LT Number : (isi tripNum)
   Vendor : (isi vendorName)
   Driver : (isi driver)
   Qty Parcel : (isi qtyParcelVal)
   STA : (isi staDest, format jam di atas)
   ATA : (isi ataDest, format jam di atas)
<baris kosong>
2. LT Number : ...dst, angka urut lanjut buat tiap unit LAIN di convoy yang SAMA, struktur field SAMA PERSIS.
<baris kosong>
Convoy 2 (jarak ATA Destination antar unit: ...menit)
1. LT Number : ...dst, ulang pola yang sama buat tiap grup convoy berikutnya (kalau ada lebih dari satu grup
di tanggal yang ditanya).

Data trip tercatat, total ${currentTrips.length} trip, dengan ${lateCount} di antaranya berstatus
"Late Arrival" (JSON):
${JSON.stringify(currentTrips, null, 2)}

convoyGroupsSudahDihitungFinal — daftar grup Convoy yang UDAH dihitung final sama sistem (JANGAN dihitung
ulang, lihat instruksi Convoy di atas), total ${convoyGroups.length} grup (JSON):
${JSON.stringify(convoyGroups, null, 2)}

${AGENT_JSON_FORMAT_RULE}

Contoh buat jawaban singkat 1 baris, "replyLines" tetap array isi 1 item, misal: {"replyLines": ["Gak ada unit Late Arrival hari ini bro."], "attachedUnits": []}`;
}
