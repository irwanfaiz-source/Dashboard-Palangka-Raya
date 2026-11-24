/**
 * assets/js/report-agent/agent-prompt-outbound.js — Blok prompt modul OUTBOUND (Aging & Packer Backlog, Occupancy & Shift)
 * Dipecah dari askAgent() (dulu satu fungsi ±930 baris di ask-agent.js). Perilaku tidak berubah;
 * dijaga tes karakterisasi tools/tests/ask-agent.test.mjs. Cari fungsi lewat docs/CODE-MAP.md.
 */

function buildOutboundBlock(){
  // Mode MODUL OUTBOUND — Aging & Packer Backlog + Occupancy & Shift Departure. Beda topik & beda
  // sumber data dari 4 mode lain di atas. Data LIVE dari Firebase root "prDcOutboundMonitoring"
  // (SAMA PERSIS sumber yang dipakai dashboard outbound.html), diringkas lewat buildOutboundSummary()
  // biar gak ngirim ribuan baris parcel mentah ke AI — ringkasannya udah mencakup semua sudut
  // pandang yang ada di dashboard: ringkasan eksekutif, breakdown per rute (Inner/Outer Island),
  // volume per shift, Priority Action Center, Packer Leaderboard, dan Shift Departure Schedule.
  const outboundSummary = buildOutboundSummary(currentOutboundRaw);
  return `
Pertanyaan kali ini soal MODUL OUTBOUND — mencakup DUA sub-menu di dashboard itu: (1) "Aging & Packer
Backlog" (breakdown volume & aging days per rute/destinasi, packer leaderboard/root cause backlog
kritis) dan (2) "Occupancy & Shift" (occupancy staging DC, breakdown Inner/Outer Island, volume per
shift, Priority Action Center, Shift Departure Schedule & Heatmap). Bukan trip Inbound, bukan DW
Fulfillment, bukan Antrian Inbound, bukan Rest Time/Asset Usage. Kalau di riwayat percakapan
sebelumnya ada pembahasan topik LAIN, ABAIKAN TOTAL itu buat jawaban kali ini — satu-satunya sumber
kebenaran buat topik ini adalah dump JSON "ringkasanOutbound" di bawah (SELALU paling baru/fresh tiap
kamu jawab, dan angka di dalamnya SUDAH final dihitung persis sama kayak yang ditampilin dashboard
Outbound — JANGAN hitung ulang pakai cara/asumsi sendiri, cukup baca & olah dari situ).

PENTING konteks tiap bagian JSON-nya:
- "infoImportTerakhir": metadata file Excel yang terakhir kali di-import ke modul ini (nama file, jam
  import, siapa yang import). Kalau null, berarti belum pernah ada import.
- "ringkasanEksekutif": angka-angka utama tingkat DC — total parcel di staging, breakdown tipe packing
  (parcel/bulky/high value/liquid), backlog kritis (aging > D4) beserta persennya, kapasitas & persen
  okupansi staging DC, target SLA (occupancy max & backlog kritis max), dan "verdictKondisiDC" yang
  nilainya salah satu dari "AMAN" / "WASPADA" / "KRITIS" (SUDAH final, jangan disimpulkan ulang).
- "volumeParcelPerShift": total parcel per Shift 1/2/3, dihitung dari jadwal keberangkatan hub tujuan
  (bukan cuma jam packing mentah).
- "breakdownVolumeAgingInnerIsland": array per rute linehaul terjadwal (Inner Island) — total parcel,
  bulky, capPct (occupancy % rute itu, kapasitas tetap 4000/rute), dan distribusi aging D0-D6+ (field
  "dMore" = >D6).
- "breakdownVolumeOuterIsland": array per destinasi Outer Island (rute yang gak ada di jadwal
  linehaul terjadwal) — total parcel & capPct (occupancy % terhadap kapasitas per destinasi).
- "priorityActionCenter_Top5RuteOccupancyTertinggi": Top 5 rute/destinasi (gabungan Inner+Outer) yang
  occupancy-nya paling tinggi, tiap item punya "levelAlert" (AMAN/WATCH/URGENT/CRITICAL) dan
  "rekomendasiAksi" yang SUDAH final ditentukan sistem — jangan bikin rekomendasi sendiri di luar itu.
- "packerLeaderboard_RootCauseBacklogKritis_Top30": ranking operator/packer berdasarkan total parcel
  yang mereka packing, termasuk berapa yang masuk backlog kritis (criticalD6 = aging >D4) dan
  "kontribusiBacklogKritisPct" (persen kontribusi ke total backlog kritis DC). Dibatasin Top 30 kalau
  operatornya banyak — kalau user nanya operator spesifik yang gak ada di list ini, berarti dia gak
  masuk Top 30 (kontribusinya kecil), bukan berarti gak ada datanya sama sekali.
- "shiftDepartureScheduleHeatmap": jadwal keberangkatan TIAP rute linehaul (bisa lebih dari satu slot
  per rute), dengan "statusSekarang" yang SUDAH dihitung real-time (relatif ke jam SEKARANG) — nilainya
  "Terjadwal" / "Segera (kurang dari 30 menit)" / "Lewat Jadwal". JANGAN hitung ulang status ini
  sendiri, cukup baca apa adanya.

Kalau "ringkasanEksekutif.totalParcelDiStagingArea" = 0 DAN "infoImportTerakhir" = null, berarti belum
pernah ada file Excel yang di-import ke modul Outbound sama sekali — bilang terus terang ke user,
JANGAN ngarang angka.

Format WAJIB buat semua jam yang kamu tulis (kalau relevan): format jam biasa "HH:mm" apa adanya dari
data (data ini emang udah dalam format jam lokal WIB, gak perlu dikonversi/ditulis ulang aneh-aneh).

ringkasanOutbound (JSON):
${JSON.stringify(outboundSummary, null, 2)}

${AGENT_JSON_FORMAT_RULE}

Contoh buat jawaban singkat, "replyLines" tetap array, misal: {"replyLines": ["Kondisi DC sekarang WASPADA
bro — okupansi staging udah 88% dari target maks 85%, backlog kritis di rute Kasongan Hub perlu Early
Loading segera."], "attachedUnits": []}`;
}
