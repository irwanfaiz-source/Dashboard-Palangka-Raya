/**
 * assets/js/report-agent/agent-prompt-performance-bagger.js — Blok prompt modul PERFORMANCE BAGGER (produktivitas packing harian)
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

function buildPerformanceBaggerBlock(){
  // Mode MODUL PERFORMANCE BAGGER — soal produktivitas PACKING HARIAN per operator (Dedicated
  // Operator / DW Reguler Pria / DW Reguler Wanita / DW On Call), sumber import file PDVT harian
  // atau raw mingguan. Beda topik dari trip Inbound, DW Fulfillment, Antrian Inbound, Rest
  // Time/Asset Usage, MAUPUN modul Outbound (yang soal parcel/aging/backlog di staging area, BUKAN
  // soal packing individu operator). Data LIVE dari Firebase root "prDcPerformanceBagger" (bulan
  // berjalan, SAMA PERSIS sumber yang dipakai dashboard performance-bagger.html), diringkas lewat
  // buildPerformanceBaggerSummary() biar udah mencakup semua sudut pandang dashboard: Hall of Fame,
  // ringkasan achievement rate keseluruhan, breakdown per agency, daftar Red Flag/Needs Coaching,
  // dan ranking lengkap SEMUA operator yang ada di roster (termasuk yang belum ada data sama sekali
  // bulan ini, jumlahHariAdaData-nya bakal 0).
  const pbSummary = buildPerformanceBaggerSummary(currentPbDailyRecords, currentPbImportLogs);
  return `
Pertanyaan kali ini soal MODUL PERFORMANCE BAGGER — monitoring produktivitas PACKING HARIAN per
operator (Dedicated Operator, DW Reguler Pria, DW Reguler Wanita, DW On Call), sumber datanya import
file PDVT (harian atau raw export mingguan). Bukan trip Inbound, bukan DW Fulfillment, bukan Antrian
Inbound, bukan Rest Time/Asset Usage, dan BUKAN modul Outbound (Outbound itu soal parcel/aging/backlog
di staging area, beda konsep sama sekali dari packing individu operator di modul ini — meski sama-sama
ada kata "packer", JANGAN ketuker). Kalau di riwayat percakapan sebelumnya ada pembahasan topik LAIN,
ABAIKAN TOTAL itu buat jawaban kali ini — satu-satunya sumber kebenaran buat topik ini adalah dump JSON
"ringkasanPerformanceBagger" di bawah (SELALU paling baru/fresh tiap kamu jawab, dan angka di dalamnya
SUDAH final dihitung persis sama kayak yang ditampilin dashboard Performance Bagger — JANGAN hitung
ulang pakai cara/asumsi sendiri, cukup baca & olah dari situ).

PENTING konteks tiap bagian JSON-nya:
- "bulanBerjalan" & "tanggalReferensiKemarin_UntukD1": data yang dikirim CUMA cakup bulan berjalan
  (device SEKARANG), sama kayak default dashboard-nya. Kalau user nanya bulan lain yang udah lewat,
  bilang terus terang datanya gak ada di sini (dashboard perlu pindah bulan manual buat itu).
- "targetAchievementPerStatusKepegawaian": target packing HARIAN (pcs) per kategori status kepegawaian
  — ini yang jadi acuan "tercapai target" atau nggak buat tiap operator, SUDAH final, jangan diubah.
- "ringkasan": angka level DC — jumlah operator di roster vs yang udah ada data bulan ini, achievement
  rate keseluruhan (persen hari kerja yang capai target dari SEMUA operator gabung), dan top performer.
- "hallOfFameTop3BulanIni": 3 operator dengan TOTAL packed tertinggi bulan berjalan (bukan achievement
  rate tertinggi, murni total volume).
- "agencyBreakdown": total packed & jumlah operator per agency (MYROBIN/UGBM/IPI).
- "daftarRedFlag_NeedsCoaching": operator yang kena flag butuh coaching — kriterianya (SUDAH final,
  jangan disimpulkan ulang): achievement rate di bawah 50% dari hari yang ada datanya, ATAU lagi
  beruntun ≥3 hari di bawah target (underStreak, ngabaikan hari Off Duty/Cuti/Sakit/Izin).
- "rankingLengkapSemuaOperatorDiRoster": ranking SEMUA operator yang ada di roster (diurut total packed
  tertinggi ke rendah), termasuk yang jumlahHariAdaData-nya 0 (berarti belum ada data sama sekali bulan
  ini buat operator itu — bukan berarti performanya jelek, WAJIB dibedain dari yang ada data tapi
  rendah). Tiap item ada "badges" — array teks, bisa kosong, isinya SUDAH final ditentukan sistem
  (Speed Demon = rata-rata/hari tertinggi se-DC bulan ini; Most Consistent = 100% achievement min. 3
  hari data; On Fire = lagi beruntun ≥3 hari di atas target; Red Flag/Needs Coaching = sama kriteria di
  atas) — JANGAN nentuin badge sendiri di luar yang udah ada di array itu.
- "riwayatImportPdvtTerakhir": 10 log import PDVT terakhir (nama file, tanggal cakupan, jumlah operator,
  siapa & jam yang import).

Kalau "ringkasan.operatorYangSudahAdaDataBulanIni" = 0 DAN "riwayatImportPdvtTerakhir" kosong, berarti
belum pernah ada file PDVT yang di-import ke modul ini bulan ini sama sekali — bilang terus terang ke
user, JANGAN ngarang angka.

ringkasanPerformanceBagger (JSON):
${JSON.stringify(pbSummary, null, 2)}

${AGENT_JSON_FORMAT_RULE}

Contoh buat jawaban singkat, "replyLines" tetap array, misal: {"replyLines": ["Bulan ini achievement rate
DC secara keseluruhan 78% bro, top performer-nya [nama] dengan total [angka] pcs. Ada 4 operator kena Red
Flag/Needs Coaching, salah satunya [nama] udah 5 hari beruntun di bawah target."], "attachedUnits": []}`;
}
