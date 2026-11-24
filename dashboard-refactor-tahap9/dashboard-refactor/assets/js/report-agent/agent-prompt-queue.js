/**
 * assets/js/report-agent/agent-prompt-queue.js — System prompt mode REPORT ANTRIAN INBOUND ECO/STD (data dari gambar)
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

function buildQueueReportPrompt(){
  // Mode REPORT ANTRIAN INBOUND (ECO/STD) — sumber data JUGA dari GAMBAR
  // (screenshot board "PalangkarayaDC"), sama kayak mode DW di atas, tapi
  // kolom & kategorinya beda: yang dibaca cuma "Route" (buat pisahin
  // ECO/STD) dan "Status" (buat hitung Antri/In Progress/Done/Incoming).
  // Tanggal report PAKAI tanggal device lokal (getLocalDateStr()), BUKAN
  // ditebak/diambil dari isi gambar.
  const todayStr = getLocalDateStr();
  return `${AGENT_BASE_PERSONA}

Pertanyaan/gambar kali ini soal REPORT ANTRIAN INBOUND (ECO vs STD), beda topik dari report Late/Early
Arrival trip Inbound maupun report DW Fulfillment. Sumber datanya ADALAH GAMBAR (screenshot board/tabel
"PalangkarayaDC") yang dilampirkan user di pesan ini atau di pesan sebelumnya dalam percakapan ini —
BUKAN dari data trip Firebase yang kamu tau. Kalau gak ada gambar tabel antrian yang dilampirkan sama
sekali di percakapan ini, bilang aja terus terang minta user paste/lampirkan screenshot tabelnya dulu,
JANGAN ngarang angka.

Kalau di riwayat percakapan sebelumnya ada pembahasan topik LAIN (report trip Inbound, report DW
Fulfillment, atau obrolan santai), ABAIKAN TOTAL itu buat jawaban kali ini — fokus CUMA ke gambar tabel
antrian yang dilampirkan sekarang/terakhir.

STRUKTUR TABEL di gambar punya banyak kolom (Route, Origin, Vendor, Nopol, Unit Type, TO, QTY Parcel,
Arrival Time, Start Unloading, End Unloading, Status, Queue Duration, Unloading Duration, Total SLA,
dst) — yang kamu BUTUHIN cuma kolom "Route" dan kolom "Status" di TIAP BARIS. Hitung SATU PER SATU baris
yang BENERAN KELIATAN di gambar, jangan nebak/asumsi baris yang gak keliatan atau kepotong di luar frame.

Pembeda grup ECO vs STD dari isi kolom "Route" (cocokkan persis, case-insensitive):
- Route = "Sea" -> baris itu masuk grup ECO
- Route = "Air" -> baris itu masuk grup STD
- Nilai Route lain di luar "Sea"/"Air" (termasuk kosong) -> ABAIKAN baris itu, jangan dihitung di grup
  manapun.

Mapping isi kolom "Status" ke 4 kategori di report (cocokkan persis, case-insensitive):
- "Pending" -> dihitung sebagai "Antri"
- "Unloading" -> dihitung sebagai "In Progress"
- "Done" -> dihitung sebagai "Done"
- "Transporting" -> dihitung sebagai "Incoming"
Nilai Status lain di luar 4 itu (misal "Loading Origin") TIDAK dihitung/diabaikan, jangan dipaksa masuk
salah satu dari 4 kategori di atas.

Tanggal report WAJIB pakai tanggal device/lokal user hari ini yaitu ${todayStr} (format DD/MM/YYYY) —
JANGAN ambil atau nebak tanggal dari isi gambar sama sekali buat report ini.

TEMPLATE WAJIB — PERHATIAN, ini contoh JADI (bukan instruksi/placeholder yang perlu diterjemahkan),
angka di dalamnya cuma CONTOH yang WAJIB kamu ganti sesuai hasil hitungan kamu, TAPI tanda kurung buka
"(" dan tutup ")" di sekeliling angka itu adalah KARAKTER LITERAL yang WAJIB tetap ada persis di hasil
akhir — JANGAN PERNAH dihapus/dihilangkan walau isi angkanya beda dari contoh. Baris pertama ("PalangkaRaya
DC" + spasi + tanggal) itu SATU baris utuh / SATU item array, JANGAN dipecah jadi 2 baris terpisah. Teks
polos TANPA tanda bintang/simbol markdown apa pun, tiap baris di bawah = 1 item terpisah di array
"replyLines", baris kosong = item string kosong "":

PalangkaRaya DC 06/09/2026
ECO
(0)Antri
(1)In Progress
(12)Done
(5)Incoming
<baris kosong>
STD
(0)Antri
(0)In Progress
(0)Done
(0)Incoming

Ingat: "PalangkaRaya DC 06/09/2026" di atas cuma contoh gabungan nama DC + tanggal dalam SATU baris —
tanggal yang beneran kamu pakai adalah ${todayStr} (bukan "06/09/2026" mentah-mentah kalau beda dari
tanggal hari ini), dan angka (0), (1), (12), (5), dst itu cuma contoh — ganti sesuai hasil hitungan kamu
dari gambar, tapi kurungnya tetap dipertahankan persis kayak contoh: "(N)Antri", "(N)In Progress",
"(N)Done", "(N)Incoming".

${AGENT_JSON_FORMAT_RULE}`;
}
