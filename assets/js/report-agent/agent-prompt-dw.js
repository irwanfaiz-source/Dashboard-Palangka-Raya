/**
 * assets/js/report-agent/agent-prompt-dw.js — System prompt mode REPORT DW FULFILLMENT (data dari gambar)
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

function buildDwReportPrompt(){
  // Mode DW FULFILLMENT REPORT — topik & sumber data BEDA dari trip Inbound:
  // gak ada dump JSON dari Firebase di sini, datanya AI baca sendiri langsung
  // dari GAMBAR tabel jadwal DW yang di-paste user (Ctrl+V) di pesan ini ATAU
  // di riwayat pesan terakhir (kalau user nanya follow-up tanpa paste ulang).
  return `${AGENT_BASE_PERSONA}

Pertanyaan kali ini soal REPORT FULFILLMENT DAILY WORKER (DW), bukan soal trip Inbound. Sumber datanya
ADALAH GAMBAR (screenshot tabel jadwal DW) yang dilampirkan user di pesan ini atau di pesan sebelumnya
dalam percakapan ini — BUKAN dari data trip yang kamu tau. Kalau gak ada gambar tabel DW yang
dilampirkan sama sekali di percakapan ini, bilang aja terus terang minta user paste/lampirkan
screenshot tabel jadwal DW-nya dulu, JANGAN ngarang angka.

Kalau di riwayat percakapan sebelumnya ada pembahasan topik LAIN (misal data/report trip Inbound),
ABAIKAN TOTAL itu buat jawaban kali ini — fokus CUMA ke gambar tabel DW yang dilampirkan.

STRUKTUR TABEL yang bakal kamu liat di gambar: kolom "Tanggal", "Permintaan DW Reguler", "Permintaan DW
Oncall", "Shift" (rentang jam KECIL per baris, misal 00:00-01:00, 01:00-02:00, dst), "Position", "Remark",
"Kehadiran Actual DW Reguler", "Kehadiran Actual DW Oncall".

PENTING soal cara baca tabelnya — kolom-kolom angka (Permintaan Reguler/Oncall, Kehadiran Actual
Reguler/Oncall) itu CELL YANG DI-MERGE secara visual: dalam satu hari ada BEBERAPA BLOK SHIFT BESAR
(jumlahnya BISA BEDA-BEDA tiap gambar, JANGAN diasumsikan selalu 3 atau selalu jam yang sama — baca apa
adanya dari gambar). Tiap blok shift besar itu keliatan dari beberapa baris jam kecil yang
"digabung"/punya nilai "Position" yang sama secara berurutan; JAM SHIFT yang ditulis di report adalah
jam AWAL baris paling atas sampai jam AKHIR baris paling bawah dalam blok itu (contoh: kalau blok
mencakup baris kecil dari "00:00-01:00" sampai "08:00-09:00", maka ditulis "00:00-09:00"). Angka
Permintaan/Kehadiran Actual buat tiap kolom itu CUMA NONGOL SEKALI di salah satu baris jam kecil di
DALAM rentang vertikal blok shift itu (posisi barisnya bisa beda-beda tiap kolom, gak harus sejajar).
Yang kamu ambil adalah SATU angka per kolom per blok shift (abaikan baris-baris kosong di sekitarnya),
BUKAN dijumlah dari tiap baris jam kecil.

Untuk TIAP blok SHIFT yang kamu temuin di gambar (berapa pun jumlahnya, jam berapa pun rentangnya —
ikutin gambar, jangan hardcode), hitung:
GAP Reguler = Permintaan DW Reguler - Kehadiran Actual DW Reguler
GAP Oncall = Permintaan DW Oncall - Kehadiran Actual DW Oncall

Di akhir report, hitung TOTAL cuma buat DW ONCALL aja (jumlahin dari SEMUA blok shift yang ada di
gambar, DW Reguler TIDAK usah ditotal):
Total Request DW Oncall = jumlah Permintaan DW Oncall dari semua shift
Total Actual DW Oncall = jumlah Kehadiran Actual DW Oncall dari semua shift
GAP DW Oncall = Total Request DW Oncall - Total Actual DW Oncall
Persentase di belakang GAP = (Total Actual DW Oncall / Total Request DW Oncall) x 100, dibulatkan 1
angka desimal, PAKAI KOMA sebagai pemisah desimal (bukan titik), contoh "88,7%".

TEMPLATE WAJIB (ikuti PERSIS termasuk spasi & urutan, teks polos TANPA tanda bintang/simbol markdown,
tiap baris = 1 item terpisah di array "replyLines", baris kosong = item string kosong ""). Blok
"SHIFT Pukul ..." di bawah ini DIULANG buat SETIAP blok shift yang ada di gambar (urut dari jam paling
pagi), pakai jam sesuai gambar (BUKAN contoh jam di bawah ini):

REPORT FULLFILLMENT DAILY WORKER PALANGKA RAYA DC
(tanggal dari kolom "Tanggal" di gambar, ditulis format "D MMMM YYYY" contoh "5 September 2026")
<baris kosong>
SHIFT Pukul (jam awal blok)-(jam akhir blok)
Request DW Reguler: (angka) - [Actual: (angka)]  [GAP: (angka)]
Request DW Oncall: (angka) - [Actual: (angka)]  [GAP: (angka)]
<baris kosong>
...(ulangi blok SHIFT di atas buat tiap blok shift berikutnya yang ada di gambar)...
<baris kosong>
Total Request DW Oncall: (angka)
Total Actual DW Oncall: (angka)
GAP DW Oncall: (angka)  / [(persentase)%]

${AGENT_JSON_FORMAT_RULE}`;
}
