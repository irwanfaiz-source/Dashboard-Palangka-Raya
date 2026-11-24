import fs from "fs";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import assert from "assert";

const MODS = {
  "inbound":            { tags: true,  esc: true,  focus: true },
  "inventory-control":  { tags: true,  esc: false, focus: true,  globals: "var fbDb=null; function formatDateTimeShort(d){return 'FMT:'+d.getDate();}" },
  "outbound":           { tags: false, esc: false, focus: true,  globals: "var fbDb=null; function formatDateTimeShort(d){return 'FMT:'+d.getDate();}" },
  "performance-bagger": { tags: false, esc: false, focus: false },
  "rest-time":          { tags: false, esc: false, focus: false },
};
// Jalankan:  cd tools && npm install && cd .. && node tools/tests/feedback-board.test.mjs
const read = (p) => fs.readFileSync(fileURLToPath(new URL("../../" + p, import.meta.url)), "utf8");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };

function fakeDb(initial) {
  const pushed = []; let listener = null, errListener = null, queries = [];
  const db = {
    pushed, queries,
    ref(path) {
      return {
        limitToLast(n) { queries.push({ path, limit: n }); return { on(ev, cb, eb) { listener = cb; errListener = eb; cb({ val: () => initial }); } }; },
        push(entry) { pushed.push({ path, entry }); return Promise.resolve(); },
      };
    },
    emit(val) { listener({ val: () => val }); },
    fail(e) { errListener(e); },
  };
  return db;
}

const html = (tags) => `<body>
<div id="fbBoardBackdrop"><div id="fbBoardList">memuat…</div>
<textarea id="fbBoardInput"></textarea>
${tags ? '<select id="fbBoardModule"><option value=""></option><option value="Inbound">Inbound</option></select><select id="fbBoardCategory"><option value=""></option><option value="Bug">Bug</option></select><div id="fbDashboardPreviewList"></div>' : ''}
<button id="fbBoardSubmitBtn"></button></div></body>`;

const T = {
  now: Date.now(),
};
const mixed = {
  a: { message: "dari inbound <b>bold</b>", user: "budi@x.com", createdAt: "2026-11-10T08:00:00.000Z", module: "Inbound", category: "Bug" },
  b: { message: "dari rest-time", userEmail: "siti@spx.com", createdAt: 1762750000000 },        // number
  c: { message: "outbound", user: "andi@x.com", createdAt: "2026-11-12T08:00:00.000Z" },
  d: { message: "tanpa pengirim", createdAt: "bukan-tanggal" },
  e: "korup",
  f: null,
};

for (const [mod, o] of Object.entries(MODS)) {
  const dom = new JSDOM(html(o.tags), { runScripts: "outside-only", url: "http://localhost/" });
  const w = dom.window;
  const toasts = [];
  w.eval(read("assets/js/common.js"));
  w.eval(`var __authUserEmail='tester@spx.com'; function showToast(m,t){ window.__toasts.push([m,t]); }
    function t(k){ return ({'feedback.empty':'KOSONG'})[k] || k; }
    var firebase={ auth:function(){return {currentUser:{displayName:'Budi D', email:'budi@x.com'}};}, database:function(){return window.__db;} };`);
  w.__toasts = toasts;
  const db = fakeDb(mixed); w.__db = db;
  w.eval(MODS[mod].globals || "");
  if (MODS[mod].globals) w.eval("fbDb = window.__db;");
  w.eval(read("assets/js/feedback-board.js"));
  w.eval(read(`assets/js/${mod}/feedback-config.js`));

  // fungsi global untuk onclick
  for (const f of ["openFeedbackBoard", "closeFeedbackBoard", "submitFeedback"]) ok(typeof w[f] === "function", `${mod}: ${f} global`);

  // buka -> render campuran
  w.openFeedbackBoard();
  ok(w.document.getElementById("fbBoardBackdrop").classList.contains("open"), `${mod}: backdrop open`);
  ok(db.queries.length === 1 && db.queries[0].path === "prDcGlobal/feedback" && db.queries[0].limit === 200, `${mod}: listener limitToLast(200) di node yg benar`);
  const list = w.document.getElementById("fbBoardList");
  const items = [...list.querySelectorAll(".fb-board-item")];
  ok(items.length === 4, `${mod}: 4 entri valid (korup/null dilewati), dapat ${items.length}`);
  const users = items.map((i) => i.querySelector(".fb-board-item-user").textContent);
  const msgs = items.map((i) => i.querySelector(".fb-board-item-msg").textContent);
  // urutan terbaru dulu: b(1762750000000=2025-11-10) vs a(2026-11-10) vs c(2026-11-12)
  ok(msgs[0] === "outbound" && msgs[1].startsWith("dari inbound") && msgs[2] === "dari rest-time" && msgs[3] === "tanpa pengirim", `${mod}: urutan campur number+ISO: ${msgs.join(" | ")}`);
  ok(users[0] === "andi@x.com" && users[1] === "budi@x.com", `${mod}: pengirim dari field user`);
  ok(users[2] === "siti", `${mod}: pengirim dari userEmail -> local-part`);
  ok(users[3] === "unknown", `${mod}: tanpa pengirim -> fallback`);
  ok(!list.innerHTML.includes("<b>bold</b>") && list.innerHTML.includes("&lt;b&gt;bold"), `${mod}: HTML di-escape`);
  const time3 = items[3].querySelector(".fb-board-item-time").textContent;
  ok(time3 === "-", `${mod}: tanggal invalid -> '-'`);
  const hasTags = !!list.querySelector(".fb-board-item-tags");
  ok(hasTags === o.tags, `${mod}: tag module/category ${o.tags ? "tampil" : "tidak tampil"}`);
  if (o.tags) {
    ok(w.document.getElementById("fbDashboardPreviewList").querySelectorAll(".fb-board-item").length === 4, `${mod}: preview dashboard terisi`);
    ok(/is-bug/.test(list.innerHTML), `${mod}: kelas is-bug`);
  }
  if (mod === "inventory-control" || mod === "outbound") ok(/FMT:/.test(list.innerHTML), `${mod}: pakai formatDateTimeShort milik modul`);
  else if (mod !== "inbound") ok(/\d{2}\/\d{2} \d{2}:\d{2}/.test(list.innerHTML), `${mod}: format default dd/mm hh:mm`);

  // buka lagi -> gak attach listener dobel
  w.openFeedbackBoard(); ok(db.queries.length === 1, `${mod}: listener gak dobel`);

  // update realtime
  db.emit({}); ok(list.innerHTML.includes("KOSONG"), `${mod}: state kosong pakai t('feedback.empty')`);
  db.emit(mixed);

  // submit
  const input = w.document.getElementById("fbBoardInput"); input.value = "  halo dunia  ";
  if (o.tags) {
    w.submitFeedback();
    ok(db.pushed.length === 0 && toasts.length === 1 && toasts[0][1] === "err", `${mod}: wajib pilih modul+kategori (fallback teks) -> toast err`);
    ok(/Pilih Modul/.test(toasts[0][0]), `${mod}: teks cadangan dipakai karena key hilang di kamus`);
    w.document.getElementById("fbBoardModule").value = "Inbound"; w.document.getElementById("fbBoardCategory").value = "Bug";
  }
  w.submitFeedback();
  ok(db.pushed.length === 1, `${mod}: 1 entri di-push`);
  const e = db.pushed[0].entry; ok(db.pushed[0].path === "prDcGlobal/feedback", `${mod}: path tulis benar`);
  ok(e.message === "halo dunia", `${mod}: pesan di-trim`);
  // SEMUA modul sekarang nulis satu format yang sama
  const keys = Object.keys(e).sort().join(",");
  const expect = o.tags ? "category,createdAt,message,module,user,userEmail" : "createdAt,message,user,userEmail";
  ok(keys === expect, `${mod}: skema tulis tunggal = ${expect} (dapat ${keys})`);
  ok(e.user === "Budi D" && e.userEmail === "tester@spx.com", `${mod}: user=nama tampilan, userEmail=email`);
  ok(typeof e.createdAt === "number" && Math.abs(e.createdAt - Date.now()) < 5000, `${mod}: createdAt epoch ms`);
  if (o.tags) ok(e.module === "Inbound" && e.category === "Bug", `${mod}: module & category ikut`);
  await new Promise((r) => setTimeout(r, 10));
  ok(input.value === "", `${mod}: input dikosongkan setelah sukses`);
  ok(w.document.getElementById("fbBoardSubmitBtn").disabled === false, `${mod}: tombol aktif lagi`);

  // pesan kosong -> gak push
  input.value = "   "; w.submitFeedback(); ok(db.pushed.length === 1, `${mod}: pesan kosong diabaikan`);

  // gagal baca
  db.fail(new Error("denied")); ok(/errorLoad|Gagal memuat/.test(list.innerHTML), `${mod}: error baca ditampilkan`);

  // Esc
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" }));
  const stillOpen = w.document.getElementById("fbBoardBackdrop").classList.contains("open");
  ok(stillOpen === !o.esc, `${mod}: Esc ${o.esc ? "nutup" : "tidak diurus komponen"}`);
  w.closeFeedbackBoard(); ok(!w.document.getElementById("fbBoardBackdrop").classList.contains("open"), `${mod}: close`);
  w.close();
}

// db belum siap -> start() balikin false lalu bisa retry
{
  const dom = new JSDOM(html(false), { runScripts: "outside-only" }); const w = dom.window;
  w.eval(read("assets/js/common.js"));
  w.eval(`var __authUserEmail='x@y'; function showToast(m,t){window.__t=[m,t];} function t(k){return k;} var fbDb=null; function formatDateTimeShort(d){return 'x';}`);
  w.eval(read("assets/js/feedback-board.js"));
  w.eval(read("assets/js/outbound/feedback-config.js"));
  ok(w.FeedbackBoard.start() === false, "db null -> start() false (tanpa crash)");
  const db = fakeDb({ a: { message: "m", user: "u", createdAt: Date.now() } }); w.eval("fbDb = null"); w.__db = db; w.eval("fbDb = window.__db");
  ok(w.FeedbackBoard.start() === true && db.queries.length === 1, "retry setelah db siap -> listener terpasang");
  w.document.getElementById("fbBoardInput").value = "x"; w.eval("fbDb = null"); w.submitFeedback();
  ok(/Belum terhubung/.test(w.__t[0]) && w.__t[1] === "info", "submit saat db null -> toast info");
}
console.log(`\n${pass} pengecekan LULUS`);
