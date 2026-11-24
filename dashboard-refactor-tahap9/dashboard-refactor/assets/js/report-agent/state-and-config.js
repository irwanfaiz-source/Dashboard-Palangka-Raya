/**
 * assets/js/report-agent/state-and-config.js — Path Firebase semua modul, state chat/data, flag sesi, status suara
 * Bagian 1/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

const FB_ROOT = "prDcInboundTracking";
const LH_PATH = FB_ROOT + "/lhTracking";

// ===== Path Firebase modul Rest Time & Asset Usage (rest-time.html) =====
// Root beda sendiri (BUKAN turunan FB_ROOT trip Inbound di atas) — persis
// sama seperti yang dipakai rest-time.html biar Odyssey baca sumber data
// yang sama persis dengan yang keliatan di dashboard modul itu.
const MON_ROOT = "prDcMonitoring";
const MON_LOGS_PATH = MON_ROOT + "/logs";           // log Rest Time (Check In/Break Out/Break In/Selesai)
const MON_ASSET_PATH = MON_ROOT + "/assetLogs";     // log Asset Usage (Pinjam PDA/Kembali PDA)
const MON_MASTER_PATH = MON_ROOT + "/master";       // data karyawan: {opsId: {name, dept, agency}}
const MON_STATION_PATH = MON_ROOT + "/pdaStationMap"; // mapping SN PDA -> station
const MON_WINDOW_DAYS = 3; // disamain kayak LOGS_WINDOW_DAYS di rest-time.html, biar gak dump histori kelamaan

let currentTrips = [];
let currentRestLogs = [];   // array log Rest Time, MON_WINDOW_DAYS hari terakhir
let currentAssetLogs = [];  // array log Asset Usage, MON_WINDOW_DAYS hari terakhir
let monMasterKaryawan = {}; // {opsId: {name, dept, agency}}
let monPdaStationMap = {};  // {serialNumber: "Inbound"|"Sec Sort"|...}
let chatHistory = []; // {role:'user'|'assistant', content:'...'}
let firebaseReady = false;
let dailyBriefingShown = false; // "AI Daily Briefing" cuma boleh nongol SEKALI per sesi buka Odyssey

// ===== Path Firebase buat histori chat per-user (fitur "simpen histori
// chat ke Firebase, bisa dibuka lagi lewat sidebar") — Root SENDIRI, beda
// dari FB_ROOT (data trip) & MON_ROOT (Rest Time/Asset), biar histori
// obrolan gak numpuk campur sama data operasional. Struktur:
// prDcOdysseyChats/{uid}/{sessionId} = {title, updatedAt, messages:[...]}. */
const ODYSSEY_CHAT_ROOT = "prDcOdysseyChats";
let currentSessionId = null; // null = sesi ini belum pernah kesimpen (chat baru)
let saveSessionTimer = null; // debounce biar gak nulis ke Firebase tiap ketikan/balesan

// ===== Sound effect halus pas kirim/terima pesan (Web Audio API, gak butuh
// file audio eksternal) — bisa dimute lewat tombol 🔊 di header, state-nya
// disimpen di localStorage biar kepake terus tiap buka halaman ini lagi. */
let odysseyAudioCtx = null;
let soundEnabled = localStorage.getItem("odysseySoundEnabled") !== "0"; // default ON

