/**
 * assets/js/report-agent/agent-prompt-rest-guide.js — Panduan operasional Rest Time (teks + aturan menjawab + pemicu kata kunci)
 * Dikirim ke AI HANYA kalau pertanyaan bernuansa "cara/kenapa/artinya" (restHowToWords); dipakai agent-prompt-rest-asset.js.
 * Ditambahkan di report-agent.html versi terbaru (sebelumnya terselip di antara komentar classifyModulesWithAI dan
 * VALID_MODULE_KEYS; dipindah ke file sendiri). KALAU logic/label di rest-time berubah, UPDATE REST_TIME_GUIDE di sini.
 */
// ===== PANDUAN OPERASIONAL rest-time.html (BARU) =====
// Biar user yang belum ngerti cara pakai halaman Rest Time Monitoring bisa tanya langsung ke Odyssey.
// Isinya hasil baca kode asli rest-time.html (alur scan, aturan Pre-Work, aturan PDA, arti alert, FAQ).
// KALAU logic/label di rest-time.html berubah, UPDATE teks REST_TIME_GUIDE di bawah ini.
// Teks ini cuma dikirim ke Gemini kalau pertanyaannya bernuansa "cara/kenapa/artinya" (lihat restHowToWords).
const REST_TIME_GUIDE = `PANDUAN OPERASIONAL "Rest Time Monitoring" (halaman rest-time.html, PALANGKA RAYA DC)
Ini SATU-SATUNYA sumber kebenaran buat pertanyaan "cara pakai / kenapa muncul / artinya apa" soal dashboard ini. Isinya hasil baca kode asli halamannya.

=== A. GAMBARAN UMUM ===
Halaman punya 4 tab di bagian atas:
1. "Rest Time Monitoring" — scan OpsID operator: Check In, Break Out (mulai istirahat), Break In (selesai istirahat).
2. "Asset Usage Monitoring" — catat pinjam & kembali PDA (scan OpsID + 5 digit terakhir Serial Number PDA).
3. "Pre-Work by Attendance FMS" — cek operator yang sudah absen (Clock In) di FMS, sudah isi Form Pre-Work atau belum.
4. "Summary Pre-Work per Vendor" — persentase achievement submit Pre-Work per vendor/agency (harian, mingguan, bulanan).
Elemen umum: pill status koneksi (Menghubungkan / Online / Offline), jam & tanggal realtime, tombol tema Dark/Light Mode, pilihan bahasa, menu sidebar, dan papan "Saran & Masukan". Data tersimpan di database online, jadi semua laptop yang buka halaman melihat data yang sama secara realtime.
Hak akses: tombol Hapus, Rollback (↩), Reset Data, dan Import Raw Attendance hanya aktif buat akun yang punya izin (admin). Kalau tombolnya abu-abu/redup, berarti akun itu tidak punya izin — minta admin/Shift Lead yang berizin.
Semua jam dicatat dari JAM DEVICE (laptop/PC yang dipakai scan), jadi pastikan jam & tanggal laptop benar.

=== B. FILTER (berlaku di tab Rest Time & Asset Usage) ===
- "Start Date" & "End Date": rentang tanggal yang ditampilkan. Default = hari ini dan otomatis ikut ganti hari kalau filter masih "hari ini" saat lewat tengah malam. Tombol "Hari Ini" mengembalikan ke hari ini. Kalau End lebih kecil dari Start, otomatis dirapikan.
- "Filter Jam Check In" (di tab Asset labelnya "Filter Jam Pinjam PDA"): format HH:mm 24 jam, contoh 05:30 s.d 07:00. Ini pengganti dropdown shift: breakdown shift dilakukan dengan mengisi rentang jam. Boleh lintas tengah malam (misal 22:00 s.d 06:00). Tombol "✕ Reset Jam" mengosongkan.
- "Dept": All Dept, SOC Operator, EHA Operator, Admin, SOC Non Operator, SOC PIC, Cache Operator (sudah termasuk MM Operator), MM Operator.
- "Status": All Status, "Sedang Istirahat / Dipinjam", "Selesai Istirahat / Kembali".
- "Station" (khusus tab Asset): Inbound, Sec Sort, Bulky, Assisted Sorting, Outbound, Runner, atau "Belum Diassign".
- "Cari": nama / OpsID (di tab Asset juga SN dan station).
- Tombol "↺ Reset Filter" membersihkan filter jam, status, dept, station, dan cari (tanggal tidak ikut).
- "Export Excel" mengunduh tabel yang sedang tampil sebagai file CSV. Tombol "Import Excel (.xlsx) / CSV" dipakai buat memasukkan/memperbarui database karyawan (kolom: Ops ID, Name/Nama, Agency/Vendor [opsional, default Dedicated Vendor], Departement [opsional, default SOC Operator]).
- Tombol "Sembunyikan Ringkasan / Tampilkan Ringkasan" menyembunyikan kotak angka di atas tabel.

=== C. REST TIME — CARA SCAN ===
Urutan aksi per siklus ada 3 langkah, otomatis ditentukan sistem:
 1) Scan pertama = Check In (masuk kerja).
 2) Scan kedua = Break Out (mulai istirahat).
 3) Scan ketiga = Break In (selesai istirahat).
 Scan berikutnya setelah 3 langkah lengkap, atau kalau sudah lewat 9 jam 30 menit sejak Check In, dianggap Check In baru (siklus baru, wajib lolos Pre-Work lagi). Break Out dan Break In otomatis masuk ke baris/tanggal milik Check In-nya (jadi shift yang lewat tengah malam tetap satu baris di tanggal Check In).
Langkah scan:
 1. Pastikan tab "Rest Time Monitoring" aktif dan kursor ada di kolom "OpsID" (fokus otomatis).
 2. Scan barcode atau ketik OpsID (angka saja boleh, misal 123456 jadi Ops123456).
 3. Begitu OpsID terbaca (minimal 5 karakter), sistem auto-submit sekitar 0,4 detik. Bisa juga tekan Enter atau tombol "Submit (Enter)".
 4. Nama & Departement terisi otomatis. Badge "Aktivitas Log Otomatis" memperlihatkan aksi yang akan dicatat (Check In / Break Out / Break In).
 5. Bunyi "ding" naik = sukses tercatat. Bunyi rendah + pop-up/toast merah = ditolak, baca pesannya.
Penolakan yang mungkin muncul pas scan:
- "Karyawan Baru — Tolong Update Raw Staff Profile": OpsID belum ada di database karyawan, scan TIDAK tercatat. Solusi: daftarkan OpsID lewat "Import Excel (.xlsx) / CSV" atau minta admin update Raw Staff Profile, lalu scan lagi. (Toast "Database karyawan belum termuat" = tunggu beberapa detik lalu scan lagi.)
- "DOUBLE SCAN ditolak": OpsID itu baru saja scan kurang dari 120 detik lalu. Toast menyebut sisa detik tunggu. Ini perlindungan biar tidak kepencet dua kali.
- "Check In Terlalu Awal!": Check In antara jam 23:30 sampai 23:59 ditolak (aturan Shift 00.00: Check In wajib di atas jam 00.00). Scan lagi setelah jam 00.00.
- Pop-up Pre-Work (lihat bagian D): Check In diblok karena Pre-Work belum valid.
- "Belum terhubung ke database online": pill koneksi belum Online. Tunggu sampai "Online" (atau cek internet / pengaturan koneksi database), lalu scan lagi.
PENTING (kasus sering): kalau scan bunyi sukses tapi barisnya tidak kelihatan di tabel, JANGAN scan berulang-ulang. Scan berikutnya (lewat 2 menit) dianggap langkah berikutnya (Check In jadi Break Out, lalu Break In) dan bikin data salah. Penyebab yang paling mungkin: filter sedang membatasi tampilan (tanggal tidak mencakup tanggal baris tersebut, atau filter jam / dept / status / cari aktif). Solusi: klik "Hari Ini" dan "↺ Reset Filter" dulu, cek tabel. Ingat Break Out/Break In masuk ke tanggal Check In, jadi untuk shift lintas tengah malam barisnya ada di tanggal sebelumnya. Kalau terlanjur salah scan, minta akun berizin pakai tombol Rollback (↩).

=== D. PRE-WORK GATE SAAT CHECK IN ===
Setiap Check In dicek ke Google Sheet Pre-Work (data dibaca ulang tiap 60 detik; kalau scan terblok, sistem otomatis cek ulang sekali dengan toast "Cek ulang status Pre-Work..."). Aturannya:
- Hanya status FIT yang lolos Check In.
- Pre-Work harus disubmit SETELAH jam 00.00 pada tanggal Check In.
- Pre-Work harus disubmit paling lama 3 jam sebelum Check In (lebih dari itu = Expired). Kalau submit lebih dari sekali, yang TERBARU yang dipakai.
- Kalau sheet Pre-Work gagal dimuat/masih loading, Check In tetap diloloskan dengan toast peringatan "belum bisa diverifikasi".
Pesan pop-up dan artinya:
- "Status Pre-Work UNFIT!": operator dinyatakan UNFIT, Check In diblok, tidak boleh masuk area kerja (Take Out / dipulangkan). Tindak lanjut sesuai SOP Shift Lead. Sistem selalu membaca submit terbaru.
- "Pre-Work Expired!": submit lebih dari 3 jam sebelum Check In. Solusi: isi ulang Form Pre-Work, lalu scan lagi.
- "Pre-Work Disubmit Sebelum Jam 00.00!": submit dilakukan sebelum 00.00 tanggal Check In. Solusi: isi ulang setelah 00.00, lalu scan lagi.
- "Pre-Work Belum Disubmit!": belum ada Pre-Work yang terbaca buat hari itu. Solusi: isi Form Pre-Work, tunggu beberapa detik, scan lagi. Pastikan OpsID di form sama persis dengan OpsID yang discan.
- "Status Pre-Work Tidak Valid!": baris Pre-Work ada tapi kolom Status kosong atau bukan FIT/UNFIT. Solusi: isi ulang dengan benar.
Badge di kolom Pre-Work tabel: FIT (hijau), UNFIT (merah), "Belum Submit", "Status Kosong", "..." (masih loading), "N/A" (sheet gagal dimuat).

=== E. MEMBACA TABEL REST TIME ===
Kolom: Date, OpsID, Name, Agency, Departement, Check In, Break Out, Break In, Est. Masuk, Duration, Alert Status, Pre-Work, Action.
- Est. Masuk = jam Break Out + 60 menit (jam seharusnya operator sudah kembali).
- Duration = lama istirahat (kalau masih istirahat, hitung berjalan sampai sekarang).
- Alert Status:
  • "Belum Istirahat" (abu): sudah Check In, belum Break Out.
  • "Istirahat": sedang istirahat, kurang dari 50 menit.
  • "Reminder (>=50m)" (baris kuning): sudah 50 sampai 60 menit.
  • "Gancang Meakal" (baris merah): lebih dari 60 menit (berlaku juga kalau sudah Break In tapi durasinya lebih dari 60 menit).
  • "Disiplin": sudah Break In dengan durasi 60 menit atau kurang.
- Badge "⌛ Expired · Tanpa Break Out / Tanpa Break In": siklus tidak lengkap (Check In tanpa Break Out, atau Break Out tanpa Break In) dan sudah lewat 9 jam 30 menit. Arahkan kursor ke badge buat detail.
- Kotak ringkasan: "Total MP Masuk" (jumlah Check In sesuai filter), "Actual MP Rest" (sedang istirahat), "Done Rest" (sudah Break In), "Total MP Sisa" (belum istirahat). Angkanya ikut filter.
- Urutan default: Check In TERBARU di paling atas. Klik header "Duration" atau "Alert Status" buat urut (klik 1 = terbesar dulu, klik 2 = terkecil dulu, klik 3 = kembali default).
- Pop-up overtime: kalau ada operator Break Out lebih dari 60 menit dan belum Break In, muncul pop-up merah berisi nama, OpsID, dept/agency, jam Break Out, durasi, plus alarm suara berulang. Pop-up hanya muncul/bunyi saat tab Rest Time sedang terlihat (kalau sedang di tab lain, ditunda dan muncul saat balik). Browser butuh minimal satu klik/ketik di halaman supaya suara boleh bunyi. Tutup lewat tombol di pop-up.
Koreksi data:
- Edit jam: klik DUA KALI pada badge jam (Check In / Break Out / Break In), pilih jam baru, tekan Enter. Kalau jenis aksi itu belum ada, sistem membuat log manual baru. Pakai hanya buat koreksi yang memang perlu.
- Rollback (↩, di sebelah jam): hapus scan TERBARU jenis itu saja (jam lain aman). Dipakai kalau double scan / salah pencet. Butuh izin.
- "Hapus" (per baris): hapus SEMUA aktivitas OpsID itu pada tanggal itu. Butuh izin, ada konfirmasi.
- "Reset Data": hapus SEMUA transaksi pada rentang tanggal filter untuk tab yang sedang aktif. Sangat destruktif, butuh izin, ada konfirmasi. Sebelum itu, sebaiknya Export dulu.

=== F. ASSET USAGE (PINJAM / KEMBALI PDA) ===
Langkah:
 1. Buka tab "Asset Usage Monitoring".
 2. Scan/ketik OpsID, lalu isi "5 Digit Last SN PDA" (5 digit terakhir serial number di PDA, contoh 01455). Begitu 5 digit terisi, sistem auto-submit sekitar 0,3 detik (atau Enter).
 3. Aksi otomatis: scan pertama = "Pinjam PDA", scan berikutnya oleh OpsID yang sama = "Kembali PDA" (kalau jeda lebih dari 12 jam sejak aksi terakhir, dianggap Pinjam baru).
 Satu OpsID bisa punya beberapa "Sesi" (Sesi 1, Sesi 2, ...) per hari; tiap sesi = satu pasang Pinjam → Kembali.
Aturan Pinjam PDA (hanya dicek saat Pinjam, "Kembali" tidak divalidasi):
- Operator HARUS sudah Check In di Rest Time (dan Check In-nya belum lewat 12 jam). Kalau belum, muncul pop-up "belum Check In".
- Selama jendela 9 jam kerja sejak Check In, operator wajib pinjam PDA yang SAMA dengan yang dipakai sebelumnya. Kalau beda muncul pop-up "Wajib Pinjam PDA yang Sama!" (menyebut akhiran SN yang harus dipakai). Aturan ini lepas kalau operator sudah "Kembali" di Sesi Kedua atau sudah lewat jam Check In + 9 jam.
- Satu PDA hanya boleh dipegang SATU orang (sistem lock 1 PDA = 1 orang). Kalau dipinjam orang lain muncul "PDA Ini Sedang Dipinjam! Locked by [nama] ([OpsID])" dan jam kapan lock otomatis terbuka (Check In pemegang + 9 jam), kecuali pemegang sudah menekan "Kembali" duluan.
- Toast "Serial Number dengan akhiran ... tidak ditemukan dalam sistem": SN itu belum terdaftar. Cek lagi 5 digitnya; kalau memang PDA baru, minta admin menambahkannya lewat tombol "Database Asset".
Tampilan tab Asset:
- Kolom tabel: Date, OpsID, Name, Sesi, Departement, SN PDA (lengkap), Station, Jam Pinjam, Jam Kembali, Durasi, Status ("Sedang Dipinjam" / "Selesai/Kembali"), PIC (email petugas yang input), Action.
- Kotak ringkasan: "Total Peminjam", "Sedang Meminjam" (belum kembali), "Sudah Kembali".
- Panel "PDA Idle per Station": jumlah PDA terdaftar per station yang saat ini tidak sedang dipinjam.
- Panel "Operator Belum Kembali": daftar peminjam yang belum mengembalikan, terlama di atas; yang sudah 4 jam atau lebih ditandai merah dengan ⚠️. Klik nama buat lihat detail (nama, OpsID, SN, station).
- Panel "Aktivitas Log Input": 15 aktivitas input terakhir beserta email petugas.
- Station per PDA diatur di "Database Asset" (tombol ungu; lihat daftar SN & station; tambah/ubah/hapus hanya buat yang punya izin). Pilihan station: Inbound, Sec Sort, Bulky, Assisted Sorting, Outbound, Runner.
- Saat scan di tab Asset, filter tanggal otomatis disesuaikan dan filter lain di-reset biar baris hasil scan kelihatan.

=== G. PRE-WORK BY ATTENDANCE FMS ===
Fungsi: mengecek operator yang SUDAH absen (Clock In) di FMS, apakah sudah mengisi Form Pre-Work. Biasanya operator mengisi Pre-Work sekitar 1 jam sebelum shift/clock in. Departemen yang dicek: SOC Operator, SOC PIC, EHA Operator, dan Cache Operator (dept lain diabaikan otomatis).
Cara pakai:
 1. Import data absen (butuh izin): klik "📥 Import Raw Attendance" dan pilih file export Raw Attendance dari FMS (.csv / .xlsx / .xls). Kolom wajib: Staff ID, Staff Name, Clock In Date, Clock In Time. Kolom lain yang dipakai kalau ada: Agency, Shift Name, Start Time, Clock In Status, Event Department (atau Profile Department).
 2. Muncul jendela preview: jumlah absen baru, diperbarui, rentang tanggal file, daftar OpsID yang belum ada di master, dan peringatan kalau rentang file terpaut jauh (lebih dari 7 hari) dari data yang sudah ada (cek jangan salah file/bulan). Klik konfirmasi buat simpan, atau batal (data tidak berubah).
 3. Data digabung dengan data lama (OpsID + tanggal yang sama ditimpa) dan tersimpan di database, jadi user lain tidak perlu import ulang — tab ini langsung terisi saat dibuka.
 4. Pilih tanggal ("Start Date", "End Date", "Hari Ini"), filter jam Clock In (HH:mm s.d HH:mm, "✕ Reset Jam"), Dept, "Status Pre-Work" (All Status / Belum Isi / Sudah Isi / UNFIT), atau Cari (nama/OpsID).
 5. Kotak "Total Absen FMS", "Sudah Isi", "Belum Isi", "UNFIT" bisa diklik sebagai filter cepat (klik lagi buat reset).
 6. "📊 Export Excel" mengunduh hasil tampilan; "📜 Update Log" melihat riwayat siapa saja yang import Raw Attendance.
Kolom tabel: Date, OpsID, Name, Agency, Departement, Shift, Clock In FMS, Status Absen (On Time / Late In / Early In dari FMS), Pre-Work Status, Jam Submit Pre-Work (kalau beda tanggal dengan Clock In, tanggalnya ikut tampil).
Cara sistem mencocokkan Pre-Work: Pre-Work yang disubmit dari 3 jam sebelum sampai 2 jam sesudah jam mulai shift (Start Time dari FMS) dianggap milik shift itu. Status:
- Sudah Isi = FIT, UNFIT, atau status kosong/lain (artinya sudah ada submit).
- Belum Isi = "Belum Submit" atau "⌛ Expired" (submit lebih dari 3 jam sebelum Clock In, kecuali UNFIT; wajib submit ulang).
- Baris merah = Belum Isi atau UNFIT.
- Catatan kuning "belum bisa dicek" muncul kalau sheet Pre-Work masih dimuat atau gagal; statusnya tampil N/A.

=== H. SUMMARY PRE-WORK PER VENDOR ===
- Achievement = jumlah "Sudah Isi Pre-Work" dibagi total Clock In FMS, per Agency (vendor). Datanya dari Raw Attendance yang diimport di tab Pre-Work by Attendance FMS.
- Kontrol: Start/End Date, tombol cepat "Hari Ini", "7 Hari", "Bulan Ini", "Semua Data", filter Dept, "📊 Export Excel".
- Kartu per vendor + Total di atas. Warna: hijau = 95% atau lebih, kuning = 80% sampai kurang dari 95%, merah = di bawah 80%. Tanda "⚠️ Un-Fit n" = jumlah UNFIT.
- Tabel "Achievement Daily Submission" selalu ada; "Weekly" (minggu mulai Senin) tampil kalau rentang minimal 7 hari; "Monthly" tampil kalau rentang minimal 28 hari. Tanda * = periode terpotong oleh rentang tanggal.
- Klik sel persentase buat membuka detail operator (tab Semua / Belum Submit / Sudah Submit / Un-Fit) beserta Export Excel.
- Operator berstatus N/A (sheet gagal dimuat) sementara dihitung belum submit.

=== I. TROUBLESHOOTING CEPAT ===
- Scan sukses tapi baris tidak muncul → ikuti catatan PENTING di bagian C (Hari Ini + Reset Filter, jangan scan berulang).
- Operator bilang sudah submit Pre-Work tapi masih diblok → cek status/waktunya: harus FIT, disubmit setelah 00.00 tanggal Check In, dan tidak lebih dari 3 jam sebelum Check In. Tunggu sampai 1 menit (data sheet di-refresh tiap 60 detik) lalu scan lagi; pastikan OpsID di form benar.
- Pre-Work tampil "N/A" atau "..." → sheet Pre-Work masih dimuat/gagal dimuat (cek internet, refresh halaman). Check In tetap bisa jalan tapi tidak terverifikasi.
- Jam di tabel salah → jam dicatat dari device yang scan; cek jam laptop. Koreksi pakai klik dua kali pada jam (atau minta Odyssey siapin koreksi).
- Data tanggal lama tidak muncul → pilih Start/End Date yang sesuai; data lama otomatis diambil dari database. Odyssey sendiri hanya melihat data live 3 hari terakhir.
- Tombol Hapus / Reset Data / Rollback / Import Raw Attendance abu-abu → akun tidak punya izin.
- Alarm overtime tidak bunyi → klik atau ketik sekali di halaman supaya browser mengizinkan suara, dan pastikan tab Rest Time sedang terlihat.
- "Belum terhubung ke database online" / pill "Offline" → cek internet; halaman akan menyambung ulang otomatis.

=== J. BATASAN ODYSSEY (WAJIB DIJUJURIN) ===
- Odyssey TIDAK bisa melakukan scan atas nama user. Odyssey hanya bisa menyiapkan Edit Jam dan Delete Activity lewat kartu konfirmasi (baru tersimpan kalau user klik Konfirmasi & Simpan).
- Odyssey tidak punya data tab "Pre-Work by Attendance FMS", "Summary Pre-Work per Vendor", maupun isi Google Sheet Pre-Work. Kalau user nanya status Pre-Work orang tertentu, arahkan ke tab/kolom Pre-Work di dashboard.
- Kalau ada hal yang tidak tercantum di panduan ini, bilang jujur dan sarankan tanya Shift Lead/admin. Jangan mengarang fitur atau aturan.`;

const REST_GUIDE_ANSWER_RULES = `CARA MENJAWAB pertanyaan panduan modul ini:
1. Jawab santai & jelas, seolah ngajarin orang yang belum pernah buka dashboard-nya.
2. Kalau berupa urutan langkah, tulis bernomor ("1.", "2.", ...) — SATU langkah per item "replyLines".
3. Sebut NAMA TOMBOL/MENU/PESAN persis seperti di layar (contoh: "Hari Ini", "↺ Reset Filter", "Pre-Work Expired!").
4. Pakai HANYA isi panduan di atas. Kalau yang ditanya gak ada di panduan, bilang jujur & saranin tanya Shift Lead/admin — JANGAN ngarang fitur atau aturan.
5. Kalau user nanya DATA tab "Pre-Work by Attendance FMS" / "Summary Pre-Work per Vendor" / isi Google Sheet Pre-Work, bilang kamu gak punya data itu dan arahin buka tab/kolomnya.
6. Kamu gak bisa scan atas nama user. Yang bisa kamu siapin cuma Edit Jam & Delete Activity (lewat kartu konfirmasi).`;

// Deteksi pertanyaan "cara pakai / kenapa / artinya" soal dashboard Rest Time.
const restHowToWords = /\bcara\b|gimana|bagaimana|gmn|\bkenapa\b|\bkok\b|\bknp\b|ngapa|tidak bisa|ga bisa|gak bisa|nggak bisa|enggak bisa|\berror\b|gagal|muncul|artinya|\barti\b|maksud|fungsi|panduan|tutorial|langkah|apa itu|bedanya|\bboleh\b|\bharus\b|\bwajib\b|aturan|syarat|\bkapan\b|diblok|diblokir|ditolak|\bmodal\b|pop-?up|tombol|\bmenu\b|fitur|jelasin|jelaskan|petunjuk|prosedur|\bsop\b|belajar|\bpakai\b|\bpake\b|menggunakan|\bimport\b|\bexport\b|upload|isi ulang|expired/i;
// Pertanyaan panduan MURNI (gak butuh data live) — dipakai buat skip dump log yang berat.
const restGuideOnlyWords = /\bcara\b|panduan|tutorial|langkah|apa itu|artinya|maksud|fungsi|jelasin|jelaskan|prosedur|bedanya|buat apa|untuk apa|aturan|syarat|petunjuk|pengenalan/i;
// Kalau ada kata ini, kemungkinan user nanya DATA spesifik -> dump log tetap dikirim.
const restDataWords = /siapa|berapa|daftar|\blist\b|hari ini|kemarin|\btadi\b|sekarang|\blagi\b|sedang|masih|\bsi\s+\w|\bops\s*\d|\d{3,}|tanggal|rekap|jumlah|total|\bnama\b|ubah|koreksi|\bedit\b|hapus|delete|ganti jam|belum balik|overtime|kelamaan/i;
// Switch: true = pertanyaan panduan murni TIDAK ngirim dump log/master/status (lebih cepat & hemat token).
// Ubah ke false kalau mau data live selalu ikut dikirim.
const REST_GUIDE_SKIP_DATA = true;
