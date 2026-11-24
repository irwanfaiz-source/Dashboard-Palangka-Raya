# Arsitektur Dashboard Palangka Raya DC

HTML/CSS/JS vanilla tanpa build step, di-host di Netlify (`publish = "."`).
Backend: Netlify Functions di `netlify/functions/` (nggak diubah di refactor ini).

## Struktur

```
index.html              app shell: hanya iframe tiap modul + penerus pesan (TIDAK punya sidebar sendiri)
login.html              halaman login (email + password)
inbound.html            ┐
inventory-control.html  │ 5 modul, tiap satu dimuat sebagai iframe di index.html
outbound.html           │
performance-bagger.html │
rest-time.html          ┘
report-agent.html       Odyssey (AI chat)
auth-guard.js           cek login + peta akses per email (dimuat tiap halaman)

assets/
  css/app-sidebar.css        gaya sidebar utama (aturannya diambil dari sidebar Outbound)
  css/<halaman>.css          CSS halaman
  js/common.js               dipakai SEMUA modul: escapeHtml, showToast, toggleAppSidebar, grup sidebar
  js/feedback-board.js       komponen Papan Saran & Masukan
  js/app-shell-bridge.js     jembatan modul <-> app-shell (postMessage); link diturunkan dari AppSidebar
  js/app-sidebar.js          SIDEBAR UTAMA: satu komponen untuk semua modul + terjemahan 4 bahasa
  js/i18n-engine.js          engine terjemahan: t(), setAppLanguage(), teks statis, pemilih bahasa
  js/<halaman>/*.js          JS khusus halaman, DIPECAH PER TOPIK (state-and-*, firebase-sync, render,
                             init, ...). *-config.js = konfigurasi komponen bersama; i18n.js atau
                             i18n-dict.js = KAMUS terjemahan (data saja). Urutan <script> di HTML = urutan muat.
  img/                       gambar yang dulu base64 inline
docs/                        dokumen ini + CODE-MAP.md (otomatis)
tools/                       check.mjs, check-globals.mjs, check-load-order.mjs, codemap.mjs, tests/ (+ package.json)
```

## Urutan load (penting, jangan ditukar)

Di tiap modul: library CDN → `auth-guard.js` → `common.js` → `feedback-board.js` →
`i18n-engine.js` → `app-shell-bridge.js` → `app-sidebar.js` → `<modul>/app-sidebar-config.js` →
(`i18n.js` kamus) → `feedback-config.js` →
`i18n-config.js` → file topik modul (state → firebase-sync → ... → `init`, persis urutan di HTML) →
`app-shell-bridge.js` (config modul).
Catatan: di performance-bagger `i18n.js` (kamus) dimuat SETELAH file topik; aman karena kamus cuma
dibaca saat `t()` dipanggil, dan `I18n.start()` dijalankan setelah halaman siap.
Di inbound, `event-listeners.js` sengaja dimuat SETELAH `helpers.js` (lihat catatan di kepala file itu).
Semuanya script klasik (bukan module), jadi fungsi & variabel top-level tetap
global dan saling kelihatan seperti waktu masih satu file besar. Komponen bersama
memanggil hal milik halaman (mis. `fbDb`, `switchSubmenu`, `APP_I18N`) hanya saat
runtime, jadi urutannya aman selama config modul dimuat sebelum dipakai.

## Aturan main

1. **Cari kode:** buka `docs/CODE-MAP.md` (fungsi + nomor baris per file).
2. **Dipakai >1 modul dan isinya sama** → `assets/js/common.js`. Mirip tapi beda →
   bikin komponen + `*-config.js` per modul (contoh: `feedback-board.js`), jangan copy-paste.
3. **Fitur baru yang gede** → file sendiri di `assets/js/<halaman>/`, tambah `<script src>`
   di HTML. Jangan nambah `<script>` / `<style>` inline panjang di HTML.
4. **Sebelum commit / deploy:** `node tools/check.mjs` (file yang dirujuk ada, sintaks JS valid,
   gak ada fungsi `common.js` yang didefinisikan ulang, handler `onclick="..."` nunjuk ke fungsi
   yang ada, HTML gak balik jadi monolit) dan `node tools/check-globals.mjs` (setiap variabel/
   fungsi yang dipakai harus didefinisikan di salah satu script halaman itu; menangkap
   `ReferenceError` yang lolos dari cek sintaks, mis. setelah memindah fungsi antar file).
   Library CDN baru? Tambahkan globalnya lewat `EXTRA_GLOBALS=NamaLib node tools/check-globals.mjs`
   atau di daftar `LIB_GLOBALS`. Lalu `node tools/check-load-order.mjs`: mendeteksi kode yang jalan SAAT
   LOAD (listener yang memberi fungsi sebagai referensi, pemanggilan fungsi di top-level, ...) tapi
   bergantung pada file yang dimuat belakangan. Batasan: panggilan lewat method objek (`obj.fn()`)
   tidak diikuti.
5. **Habis nambah/geser fungsi:** `node tools/codemap.mjs`.
6. **Tes komponen bersama:** `cd tools && npm install` (sekali), lalu dari root:
   `node tools/tests/feedback-board.test.mjs`, `shared-ui.test.mjs`, `i18n-engine.test.mjs`, `app-sidebar.test.mjs`, `ask-agent.test.mjs`
   (jsdom + Firebase palsu). Ubah komponen bersama → jalankan ketiganya.
   `node tools/tests/load-smoke.test.mjs` memuat tiap modul di jsdom (library CDN diganti stub) dan gagal
   kalau ada error saat load; butuh `auth-guard.js` di root proyek.
   Tes i18n juga mengecek semua `data-i18n*` di HTML punya padanan di kamus 'id', dan
   memperingatkan key yang belum diterjemahkan ke ja/zh.
7. **Sidebar:** jangan salin markup/CSS sidebar ke halaman. Menambah/mengganti nama/memindah menu = ubah
   daftar `MODULES`/`GROUPS` di `assets/js/app-sidebar.js` (satu tempat; link bridge ke shell ikut otomatis).
   Teks 4 bahasa ada di `TEXT` file itu. Modul baru: placeholder `<nav class="app-sidebar" id="appSidebar"></nav>`
   di HTML, `<modul>/app-sidebar-config.js` (`AppSidebar.mount({ module: '...' })`), dan daftarkan di `MODULES`.
   Gaya diubah di `assets/css/app-sidebar.css`. Sub menu khusus sebuah modul lewat opsi `submenu` di config-nya.
8. Nama file JS kebab-case, satu topik per file. **Menambah kode di modul:** fungsi & state taruh di file
   topiknya; yang jalan saat load (pendaftaran listener, `init`) taruh di file yang dimuat PALING AKHIR
   (`init.js`) supaya semua fungsi yang dipakainya sudah ada. `check-load-order.mjs` akan memberi tahu
   kalau salah.

## Riwayat refactor

**Tahap 1** — CSS/JS inline dipindah ke `assets/` (terverifikasi bisa disusun balik
byte-per-byte sama dengan aslinya); `escapeHtml` + 3 fungsi grup sidebar → `common.js`;
gambar base64 di `index.html`/`login.html` jadi file (login.html 490 KB → 6 KB).

**Tahap 2 — Papan Saran & Masukan.** 5 salinan (±520 baris) → 1 komponen.
Bug yang ikut kebenerin (dari membaca kode, belum diamati di produksi): semua modul nulis ke
`prDcGlobal/feedback` dengan format beda (`user` vs `userEmail`; `createdAt` string ISO vs
angka). Akibatnya outbound kemungkinan crash (`TypeError`) saat mengurutkan entri ber-`createdAt`
angka, performance-bagger/rest-time mengurutkan jadi `NaN`, dan nama pengirim tampil
"anonim"/"unknown" untuk entri dari modul lain.
- Pembaca toleran terhadap kedua format lama.
- Penulis sekarang satu format di semua modul:
  `{ message, user, userEmail, createdAt (epoch ms), module?, category? }`.
- Baca `limitToLast(200)`; performance-bagger & rest-time pakai toast, bukan `alert()`.

**Tahap 3 — komponen UI bersama.**
- `showToast` (5 salinan) dan `toggleAppSidebar` (5 salinan, fungsinya identik) → `common.js`.
  `showToast` versi inventory-control gak punya pengaman kalau `#toastStack` gak ada;
  sekarang semua modul pakai versi yang aman.
- `t()` + `applyStaticI18n()` (3 salinan identik) dipindah ke file bersama; di Tahap 4 file itu
  digantikan `i18n-engine.js`.
- 5 bridge ke app-shell (±130 baris, tinggal beda daftar link) → `app-shell-bridge.js` +
  config per modul. Daftar link tiap modul diturunkan dari kode lama dan dicocokkan di tes.
- Hardening: bridge & shell hanya menerima `postMessage` dari origin yang sama, dan pesan
  keluar dikirim ke origin sendiri (fallback `*` hanya untuk `file://`).

**Tahap 4 — engine terjemahan bersama.**
Dulu dua keluarga kode yang beda-beda: (A) inbound/inventory/outbound dengan kamus
`APP_I18N { kunci: {id,en,ja,zh} }`, (B) performance-bagger/rest-time dengan
`I18N_DICT { id: {...}, en: {...} }`. Sekarang satu engine; **kamusnya tidak diubah**
(teksnya identik; 4.032 kombinasi key × bahasa dibandingkan lama vs baru, 0 selisih).
Tiap modul punya `i18n-config.js` kecil: cara cari teks (`I18n.byKey` / `I18n.byLang`) dan
daftar render-ulang saat bahasa diganti (`onChange`, sama persis dengan versi lama).

Yang sengaja berubah:
1. **Bahasa dipakai bersama semua modul** (`localStorage['pkydcAppLang']`). Dulu performance-bagger
   dan rest-time pakai kunci lain (`pr_dc_app_language`), jadi pilihan bahasa gak ikut antar modul.
   Pilihan lama tetap dibaca sekali kalau kunci baru kosong.
2. **Ganti bahasa di satu modul langsung ikut di modul lain yang lagi terbuka** (event `storage`).
   Matikan dengan `syncAcrossTabs: false` di `I18n.configure`.
3. Key yang gak ada di kamus: teks bawaan HTML dibiarkan (dulu modul A menampilkan nama key mentah).
4. Placeholder `{x}` yang muncul dua kali sekarang diganti semuanya (dulu modul A cuma yang pertama).
5. Bahasa tidak valid di storage jatuh ke `id`; akses `localStorage` yang diblokir tidak lagi bikin error.
6. Tiga tempat yang membaca state bahasa langsung (di outbound, performance-bagger, dan `getMonthNames`) sekarang pakai `I18n.lang()`.

Kekurangan lama yang ketemu (belum dikerjakan): outbound punya 38 key HTML, dan
performance-bagger 31 key, yang belum diterjemahkan ke ja/zh (tampil Indonesia).
Daftarnya muncul sebagai PERINGATAN di `i18n-engine.test.mjs`.

**Tahap 5 — `main.js` dipecah per topik.**
Lima `main.js` modul (1.055–3.005 baris) jadi 9–15 file per modul (total 66 file, terbesar 516 baris), dipotong
di batas section **tanpa mengubah satu baris kode pun**. Nama file = topiknya; kepala tiap file memuat
deskripsi dan nomor urutnya. `docs/CODE-MAP.md` menunjuk fungsi → file → baris.

| Modul | File | Contoh |
|---|---|---|
| inbound | 2 | (Tahap 9) `main.js` lama diganti `inbound-summary.js`; 9 file hasil pecahan Tahap 5 dihapus, lihat Tahap 9 |
| inventory-control | 15 | `stock`, `asset-master`, `asset-it-nca`, `usage-log`, `reports`, `init` |
| outbound | 15 | `linehaul-schedule`, `occupancy-table`, `to-modal-and-alerts`, `dashboard-render` |
| performance-bagger | 13 | `import-daily-and-hourly`, `table-and-aggregates`, `individual-slip-pdf` |
| rest-time | 14 | `prework-data`, `cycle-logic`, `submit-log`, `render-monitoring`, `i18n-dict` |

Cara membuktikannya aman (semuanya otomatis dan bisa diulang):
1. Gabungan file-file baru sama **byte-per-byte** dengan `main.js` lama.
2. `check-load-order.mjs`: tidak ada kode yang jalan saat load tapi bergantung pada file yang dimuat belakangan.
   Ini menemukan satu kasus nyata di inbound (listener yang memberi `renderAll` langsung sebagai referensi),
   diselesaikan dengan memuat `event-listeners.js` setelah `helpers.js`; file yang dilompati terbukti hanya
   berisi deklarasi fungsi dan dua konstanta literal.
3. Nama global tiap halaman sebelum vs sesudah: identik. `check-globals.mjs`: bersih.
4. Uji dinamis (jsdom): sebelum vs sesudah dipecah, tiap modul punya fungsi global yang sama, DOM hasil load
   yang sama, dan 0 error.

Yang berubah: **isolasi error.** Dulu exception saat load di satu `main.js` menghentikan seluruh sisa file;
sekarang hanya file tempat error itu terjadi (file lain tetap jalan). Selain itu ada ±60 request HTTP lebih
banyak per halaman (Netlify memakai HTTP/2 dan meng-cache; tidak terasa).

**Tahap 6 — `report-agent/main.js` (Odyssey) dipecah.**
3.628 baris jadi 20 file per topik: data tiap modul untuk AI (`rest-time-data`, `outbound-data`,
`performance-bagger-data`, `inventory-data`), aksi tulis Inventory, logika Inbound & Daily Briefing, render chat,
command palette, riwayat sesi, `input-and-shell-handlers`, `init`, dan lain-lain. Cara pembuktiannya sama dengan
Tahap 5: gabungan identik byte-per-byte, `check-load-order` bersih (tanpa perlu memindah urutan muat), 140 nama
global sama persis, dan uji dinamis sebelum/sesudah identik (328 fungsi global, DOM sama, 0 error).
Catatan: `askAgent()` waktu itu masih SATU fungsi ±930 baris (memecahnya berarti mengubah kode, bukan sekadar
memotong file); itu dikerjakan di Tahap 8.

**Tahap 7 — sidebar Outbound jadi SIDEBAR UTAMA (komponen).**
Dulu tiap modul menyalin markup sidebar-nya sendiri (±120–170 baris HTML), CSS sendiri, dan daftar link sendiri;
`index.html` (shell) tidak punya sidebar. Sekarang `assets/js/app-sidebar.js` merender sidebar dari satu daftar
modul, dengan struktur & gaya persis milik Outbound (acuan), dan `assets/css/app-sidebar.css` berisi 33 aturan
Outbound. Tiap halaman tinggal `<nav class="app-sidebar" id="appSidebar"></nav>` + `app-sidebar-config.js`.
- Terjemahan 4 bahasa dibawa komponen sendiri (disalin dari kamus Outbound), jadi performance-bagger yang dulu
  sidebar-nya hardcode Indonesia dan rest-time yang pakai kunci lain sekarang ikut ter-translate. Label ikut berganti
  lewat `I18n.subscribe`. Label sub menu milik modul (`inv.tab.*`) tetap dari kamus modul.
- Link bridge ke shell diturunkan dari daftar yang sama (`AppSidebar.bridgeLinks()`); 5 daftar link per modul dihapus.
- `toggleAppSidebar`/`toggleSidebarGroup`/`setSidebarGroupCollapsed`/`collapseAllSidebarGroups` pindah dari `common.js`
  ke komponen; `SIDEBAR_NAV_GROUPS` dan panggilan `collapseAllSidebarGroups()` di tiap modul dihapus (grup awalnya
  sudah tertutup dari komponen).

Pembuktian: DOM sidebar Outbound hasil render **identik** dengan markup lama (setelah abaikan atribut i18n & status
collapsed); aturan di `app-sidebar.css` identik dengan aturan lama Outbound; tiap modul hanya kehilangan tepat 33 aturan
sidebar (35 di inventory-control) dan tidak ada aturan lain yang hilang; muat halaman di jsdom sebelum vs sesudah:
0 error, fungsi global sama, DOM di luar sidebar sama persis, item sidebar yang aktif sama.

Yang berubah (konsekuensi "ikut Outbound"):
1. **Dua link Outbound di modul lain jadi satu entri** "Aging, Occupancy & Packer Backlog" (sesuai sidebar Outbound);
   link terpisah "Occupancy & Shift" tidak ada lagi. Halaman Outbound-nya sendiri tidak berubah.
2. Dropdown bahasa seragam (bendera + "Bahasa Indonesia"); dulu inventory-control tanpa bendera dan performance-bagger/
   rest-time menulis "Indonesia".
3. Dua override gaya sidebar milik inventory-control (ukuran font/padding) dan tombol Saran milik rest-time (tanpa
   transisi hover) hilang; semua ikut gaya Outbound. Aturan `@media` responsif & print inventory-control dipertahankan.
4. Link ke modul sendiri di rest-time tidak ber-id lagi (tidak dipakai kode manapun).
Belum diverifikasi secara visual di browser (jsdom tidak merender CSS); cek tampilan sidebar tiap modul di preview.

**Tahap 8 — `askAgent()` (Odyssey) dipecah jadi fungsi-fungsi kecil.**
Fungsi tunggal ±930 baris (deteksi topik + 7 cabang system prompt + panggilan AI dengan retry + render balasan,
semuanya dalam satu closure) sekarang jadi orkestrator 30-an baris di `ask-agent.js` yang memanggil tahap-tahapnya,
masing-masing di file sendiri:

| File | Isi |
|---|---|
| `agent-topics.js` | `detectTopics()` (kata kunci → topik), `resolveMatchedModules()` (+ klasifikasi AI kalau regex tak menangkap) |
| `agent-prompt-common.js` | `AGENT_BASE_PERSONA`, `AGENT_JSON_FORMAT_RULE` |
| `agent-prompt-dw.js`, `-queue.js` | prompt mode Report DW dan Report Antrian (data dari gambar) |
| `agent-prompt-rest-guide.js` | panduan operasional Rest Time (teks + aturan menjawab + kata kunci pemicu) — dikirim ke AI hanya untuk pertanyaan "cara/kenapa/artinya" (ditambahkan di Tahap 9) |
| `agent-prompt-rest-asset.js`, `-outbound.js`, `-performance-bagger.js`, `-inventory.js`, `-inbound.js` | satu blok prompt per modul |
| `agent-prompt-assemble.js` | `buildSystemPrompt()` memilih mode; `buildModulesPrompt()` menggabungkan blok modul |
| `agent-api.js` | riwayat → `contents`, body request, `callGeminiProxy`, `extractModelText`, `parseModelJson`, `recoverRepliesFromBrokenJson`, `requestModelReply` (retry ganti model) |
| `agent-reply.js` | `renderAgentReply()` (bubble balasan + kartu konfirmasi aksi tulis) |

Teks prompt (±700 baris) dipindahkan lewat salinan dari AST, bukan diketik ulang. Penyusunan prompt tetap di LUAR
`try` seperti dulu (error di sana tetap melempar), dan urutan efek samping (`addTyping`, `computeConvoyGroups`, klasifikasi
AI, `fetch`, ...) tidak berubah.

Pembuktian — **tes karakterisasi** `tools/tests/ask-agent.test.mjs`: 65 skenario (54 awal + 11 untuk panduan Rest Time & kata kunci baru, Tahap 9) di jsdom (fetch & UI dipalsukan,
waktu & acak dikunci) merekam SEMUA yang teramati: system prompt lengkap, body request ke proxy, urutan panggilan
fungsi luar dengan argumennya, riwayat chat akhir, dan error. Cakupan: semua cabang prompt (ringan, DW, antrian, tiap
modul tunggal, gabungan 2–5 modul, mode lengkap), klasifikasi AI (dipanggil/tidak/error), dan semua jalur API (JSON
bersih, code fence, newline literal, smart quotes, trailing comma, retry ganti model, last resort regex, error HTTP,
jaringan putus, safety block, aksi tulis, pemangkasan riwayat & gambar). Golden awalnya direkam dari `askAgent()` ASLI
(kode lama dan baru sama-sama lulus); di Tahap 9 direkam ulang dari `report-agent.html` TERBARU (monolit) karena
prompt Rest Time memang berubah (hanya 6 dari 54 skenario lama yang berubah, semuanya terkait Rest Time). Sensitivitasnya diuji dengan 17 mutasi halus (salah kirim variabel, urutan
blok, batas riwayat, retry, dst.): 14 terdeteksi; 3 lolos dengan dua alasan, dan keduanya terbukti *equivalent mutant*
(perilakunya memang tidak bisa berbeda: `rawModelUsed` sudah otomatis berisi `preferredModel`, dan kalau ada modul yang
cocok pasti `isDataQuery` true).
Selain itu: `check-globals` bersih (menangkap variabel lokal lama yang terlewat), `check-load-order` bersih, 25 nama
global baru tanpa satu pun bentrok.

Ubah prompt/perilaku Odyssey dengan sengaja? Jalankan tes, tinjau selisihnya, lalu rekam ulang golden:
`node tools/tests/ask-agent.test.mjs --update` (jangan di-update hanya supaya tes hijau).
Fungsi `t => ...` kecil di dalam fungsi hasil ekstraksi tetap lokal; yang kini global (25 nama) tercantum di `CODE-MAP.md`.

**Tahap 9 — menyatukan perubahan terbaru `inbound.html`, `index.html`, `report-agent.html` ke struktur ini.**
Ketiga file itu diperbarui di versi monolit (sebelum refactor), jadi perubahannya dibawa ulang. Prinsipnya: teks
perubahan diambil langsung dari file baru (bukan diketik ulang), lalu dibuktikan sama dengan file baru.

| File | Yang berubah | Cara dibawa | Pembuktian |
|---|---|---|---|
| `report-agent.html` | judul header chat; switch `SHOW_DAILY_BRIEFING` & `SHOW_QUICK_REPLIES`; perintah palette `/panduan` `/prework`; **panduan operasional Rest Time** (`agent-prompt-rest-guide.js`) + kata kunci Rest/Pre-Work baru; teks prompt klasifikasi; sapaan awal | hunk kecil ditempel ke file terpecah; `askAgent` diregenerasi dari versi baru (`question` kini diteruskan ke `buildRestAssetBlock`) | `askAgent` hasil patch **identik byte-per-byte** dengan versi baru; 65 skenario golden identik; 177 dari 178 statement top-level identik (sisanya `askAgent`); muat halaman 0 error |
| `index.html` | tombol mengambang Odyssey diganti bar "Ask Odyssey" di topnav (+CSS, posisi popup, JS) | diekstrak ulang dengan logika yang sama; `odyssey-fab.png` → `odyssey-logo.png` (isi gambar sama) | disusun balik == file baru; 20 dari 21 statement identik (sisanya patch origin-check milikku); DOM sama |
| `inbound.html` | **modul ditulis ulang** jadi "Inbound Tracking" (ringkasan dari Google Sheet "Inbound Sea & Air", export PDF); script utama lama (Line Haul, Manpower Planning) dihapus; jsPDF + AutoTable; CSS baru | region body diganti sebagai satu blok; script baru → `inbound-summary.js`, CSS baru → `inbound-summary.css`; 9 file hasil pecahan Tahap 5 dihapus; kunci kamus baru; hook bahasa dipangkas (tinggal `renderAll`) | 68 statement script baru identik; DOM hasil load identik (di luar sidebar); 0 error; selisih fungsi global = persis yang digantikan komponen bersama |

Efek ikutan: label modul Inbound di **sidebar utama** sekarang "Tracking" (id/en/ja/zh dari kunci `sidebar.link.inboundTracking`)
di SEMUA modul, bukan lagi "LH Tracking & Forecast MP".

**Perhatian — data Inbound tidak lagi disinkron ke Firebase.** Inbound baru tidak memakai Firebase sama sekali, padahal
`prDcInboundTracking/lhTracking` (hasil sinkron versi lama) masih dibaca oleh: Odyssey (`report-agent/state-and-config.js`,
`live-trips-fetch.js`), dan di Netlify `_seatalk-common.js` (`getInboundTrips`) yang dipakai `check-ops-alerts.js` (alert Late
Arrival numpuk), `daily-briefing.js` (ringkasan Inbound), dan bot SeaTalk. Mereka akan membaca data terakhir yang di-upload
versi lama (basi). Perlu diputuskan: pembaca-pembaca itu dialihkan ke sumber baru (Google Sheet), atau Inbound baru
tetap menulis ringkasan ke Firebase.

## Yang tersisa

| Yang tersisa | Catatan |
|---|---|
| File besar lain (`render-monitoring` 516, `to-modal-and-alerts` 424, `stock` 370 baris) | bisa dipecah lagi per fitur kalau perlu |
| Key kamus sidebar yang nganggur | ±45 key `sidebar.*` / `grp.*` / `nav.*` di kamus inbound, inventory-control, outbound, rest-time sudah tidak dipakai (sidebar punya teks sendiri); aman dihapus (kecuali `sidebar.openMenu` di inbound dan `nav.restTime`/`nav.assetUsage` di rest-time yang masih dipakai halamannya) |
| Terjemahan ja/zh yang kurang | lihat peringatan di tes i18n |
| Format kamus A vs B | sengaja belum disatukan (datanya besar, nilainya kecil setelah engine-nya satu) |

## Catatan keamanan & Firebase Rules

Rules RTDB adalah satu-satunya perlindungan data yang sebenarnya. `ACCESS_MAP` dan
`DELETE_ALLOWED_EMAILS` di `auth-guard.js` cuma menyembunyikan UI di browser.
Rules yang sudah dirapikan + simulator pembanding ada di `firebase-rules/` (lihat README di sana).

1. **Cek sign-up Firebase Auth** (belum bisa diverifikasi dari kode). Kode login cuma
   `signInWithEmailAndPassword`, tapi `apiKey` itu publik. Kalau "Enable create (sign-up)" aktif di
   Firebase Console → Authentication → Settings → User actions, siapa pun bisa bikin akun lalu
   lolos `auth != null` dan baca data operasional. Pastikan OFF.
2. **File internal tayang publik.** `publish = "."` berarti semua isi repo bisa dibuka lewat URL
   (`/docs`, `/tools`, `/netlify/functions/*.js`, `/package.json`, ...). `netlify.toml` sekarang memblokirnya
   dengan redirect 404 (lihat bagian bawah file itu). Tambahkan folder internal baru ke daftar itu.
3. ~~`attendanceFms` `.write: true`~~ **diperbaiki** di `firebase-rules/` (harus login, bukan MMP).
4. ~~Feedback bisa ditimpa/dihapus siapa pun~~ **diperbaiki** (hanya pengirimnya; ada `.validate`).
5. **Allowlist client vs Rules gak sama (belum diputuskan).** `DELETE_ALLOWED_EMAILS` punya
   `eka.prayogi@spxexpress.com`, tapi di Rules dia hanya ADMIN untuk `prDcMonitoring/logs`. Flag
   `__authCanDelete` dipakai bareng Rest Time & Inventory Control, jadi tombol Tambah/Edit/Hapus Asset
   muncul tapi write-nya ditolak. Pilih: tambahkan ke `ADMINS` di `firebase-rules/gen-new-rules.mjs`, atau
   pisahkan flag di klien.
6. `ACCESS_MAP` default-nya fail-open: email yang gak terdaftar dapat SEMUA tab. Wajar kalau
   semua akun itu staf, tapi artinya akun baru langsung punya akses penuh. Rules juga memakai
   daftar-tolak (SWAT/MMP), jadi akun terbatas baru harus ditambahkan di semua node.
7. `netlify/functions/seatalk-webhook.js`: pengecekan signature SeaTalk masih di-comment
   (`return 401` nonaktif), jadi siapa pun yang tahu URL-nya bisa memicu bot membaca data dashboard.
   Aktifkan lagi setelah nama header signature dipastikan.
8. `cdn.tailwindcss.com` itu versi development (play CDN); idealnya diganti build statis
   kalau suatu saat ada build step.
