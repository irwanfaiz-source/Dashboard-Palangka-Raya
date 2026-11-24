// Tes engine terjemahan (assets/js/i18n-engine.js) + konfigurasi tiap modul.
// Jalankan:  cd tools && npm install && cd .. && node tools/tests/i18n-engine.test.mjs
import fs from "fs";
import assert from "assert";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import * as acorn from "acorn";

const read = (p) => fs.readFileSync(fileURLToPath(new URL("../../" + p, import.meta.url)), "utf8");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const LANGS = ["id", "en", "ja", "zh"];
const ENGINE = read("assets/js/i18n-engine.js");
const stripHeader = (s) => s.replace(/^[\s\S]*?\*\/\n/, "");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function win(body = "", url = "http://localhost/") {
  const w = new JSDOM(`<html><head><title>awal</title></head><body>${body}</body></html>`, { runScripts: "outside-only", url }).window;
  w.eval(ENGINE);
  return w;
}

// ================= engine: unit =================
{
  const w = win(`<select id="appLangSelect"><option value="id"></option><option value="en"></option><option value="ja"></option></select>
    <h1 data-i18n="h">Judul HTML</h1><p data-i18n="hilang">Biarkan Saya</p><i data-i18n-html="hh"></i><input data-i18n-placeholder="ph"><b data-i18n-title="tt"></b>`);
  w.eval(`var DICT = { id: { h: 'Halo', hh: '<u>satu</u>', ph: 'cari', tt: 'tip', 'page.title': 'Judul ID', dua: '{x} dan {x}', fallback: 'hanya id' },
                      en: { h: 'Hello', hh: '<u>one</u>', ph: 'search', tt: 'tip-en', 'page.title': 'Title EN', dua: '{x} and {x}' } };
          var log = [];
          I18n.configure({ lookup: I18n.byLang(function () { return DICT; }),
            onChange: function (l) { log.push('change:' + l + ':' + document.querySelector('h1').textContent); },
            onStart: function (l) { log.push('start:' + l); } });`);
  ok(w.eval("I18n.lang()") === "id", "bahasa awal = id");
  ok(w.eval("t('dua', { x: 'A' })") === "A dan A", "parameter diganti SEMUA kemunculan");
  ok(w.eval("t('tidak.ada')") === "tidak.ada", "key hilang -> balikin key");
  w.eval("I18n.start()");
  ok(w.document.querySelector("h1").textContent === "Halo" && w.document.title === "Judul ID", "start(): teks statis + title");
  ok(w.document.querySelector("p").textContent === "Biarkan Saya", "key hilang: teks HTML dibiarkan");
  ok(w.document.querySelector("i").innerHTML === "<u>satu</u>" && w.document.querySelector("input").placeholder === "cari" && w.document.querySelector("b").title === "tip", "html / placeholder / title");
  ok(w.document.documentElement.lang === "id" && w.eval("log.join()") === "start:id", "onStart dipanggil sekali");

  w.eval("setAppLanguage('en')");
  ok(w.document.querySelector("h1").textContent === "Hello" && w.document.title === "Title EN", "setAppLanguage('en') menerapkan teks");
  ok(w.document.getElementById("appLangSelect").value === "en", "dropdown ikut");
  ok(w.localStorage.getItem("pkydcAppLang") === "en", "bahasa disimpan di pkydcAppLang");
  ok(w.eval("log[1]") === "change:en:Hello", "onChange dipanggil SETELAH teks statis diterapkan");
  ok(w.eval("t('fallback')") === "hanya id", "terjemahan hilang di en -> fallback id");
  w.eval("setAppLanguage('xx')");
  ok(w.eval("I18n.lang()") === "id" && w.localStorage.getItem("pkydcAppLang") === "id", "bahasa tidak valid -> id");

  // sinkron antar iframe lewat event 'storage'
  const fire = (key, val) => w.dispatchEvent(new w.StorageEvent("storage", { key, newValue: val }));
  w.eval("log.length = 0");
  fire("pkydcAppLang", "en");
  ok(w.eval("I18n.lang()") === "en" && w.eval("log.length") === 1, "event storage dari modul lain -> ikut ganti bahasa + onChange");
  ok(w.document.querySelector("h1").textContent === "Hello", "teks statis ikut berubah");
  fire("pkydcAppLang", "en"); fire("kunci.lain", "id"); fire("pkydcAppLang", "xx"); fire("pkydcAppLang", null);
  ok(w.eval("log.length") === 1 && w.eval("I18n.lang()") === "en", "nilai sama / kunci lain / tidak valid / null diabaikan");
  w.close();
}
{ // syncAcrossTabs: false
  const w = win("<h1 data-i18n='h'></h1>");
  w.eval(`var DICT={id:{h:'A'},en:{h:'B'}}; I18n.configure({ lookup: I18n.byLang(function(){return DICT;}), syncAcrossTabs: false });`);
  w.dispatchEvent(new w.StorageEvent("storage", { key: "pkydcAppLang", newValue: "en" }));
  ok(w.eval("I18n.lang()") === "id", "syncAcrossTabs:false -> event storage diabaikan");
  w.close();
}
{ // penyimpanan: kunci lama & nilai rusak
  const mk = (setup) => { const w = new JSDOM("<body></body>", { runScripts: "outside-only", url: "http://localhost/" }).window; setup(w.localStorage); w.eval(ENGINE); w.eval("I18n.configure({ lookup: function(){ return undefined; } })"); return w; };
  ok(mk((s) => s.setItem("pr_dc_app_language", "en")).eval("I18n.lang()") === "en", "kunci lama pr_dc_app_language dibaca kalau kunci baru kosong");
  ok(mk((s) => { s.setItem("pr_dc_app_language", "en"); s.setItem("pkydcAppLang", "ja"); }).eval("I18n.lang()") === "ja", "kunci baru menang atas kunci lama");
  ok(mk((s) => s.setItem("pkydcAppLang", "rusak")).eval("I18n.lang()") === "id", "nilai tersimpan tidak valid -> id");
}
{ // autoStart
  const w = new JSDOM("<body><h1 data-i18n='h'>x</h1><select id='appLangSelect'><option value='id'></option><option value='en'></option></select></body>", { runScripts: "outside-only", url: "http://localhost/" }).window;
  w.localStorage.setItem("pkydcAppLang", "en");
  w.eval(ENGINE);
  w.eval(`var APP_I18N={h:{id:'Halo',en:'Hello'}}; I18n.configure({ autoStart: true, lookup: I18n.byKey(function(){return APP_I18N;}) });`);
  await new Promise((r) => (w.document.readyState === "complete" ? r() : w.addEventListener("load", r)));
  ok(w.document.querySelector("h1").textContent === "Hello" && w.document.getElementById("appLangSelect").value === "en", "autoStart: bahasa tersimpan diterapkan saat DOM siap");
  w.close();
}

{ // subscribe: komponen bersama (mis. AppSidebar) ikut berganti bahasa
  const w = win("<h1 data-i18n='h'></h1>");
  w.eval(`var DICT={id:{h:'A'},en:{h:'B'}}; var log=[];
    I18n.configure({ lookup: I18n.byLang(function(){return DICT;}), onChange: function(l){ log.push('onChange:'+l+':'+document.querySelector('h1').textContent); } });
    I18n.subscribe(function(l){ log.push('sub1:'+l); });
    I18n.subscribe(function(){ throw new Error('rusak'); });
    I18n.subscribe(function(l){ log.push('sub3:'+l); });
    I18n.subscribe('bukan fungsi');`);
  w.console.error = () => {};
  w.eval("setAppLanguage('en')");
  ok(w.eval("log.join('|')") === "onChange:en:B|sub1:en|sub3:en", "subscribe: dipanggil SETELAH onChange & teks statis; subscriber yang error tidak menghalangi yang lain -> " + w.eval("log.join('|')"));
  w.eval("log.length = 0");
  w.dispatchEvent(new w.StorageEvent("storage", { key: "pkydcAppLang", newValue: "id" }));
  ok(w.eval("log.join('|')") === "onChange:id:A|sub1:id|sub3:id", "subscribe: ikut terpanggil saat bahasa berubah dari modul lain (event storage)");
  w.close();
}

// ================= per modul: kamus asli + config asli =================
const MODS = {
  "inbound":            { dict: "assets/js/inbound/i18n.js", name: "APP_I18N", fam: "A" },
  "inventory-control":  { dict: "assets/js/inventory-control/i18n.js", name: "APP_I18N", fam: "A" },
  "outbound":           { dict: "assets/js/outbound/i18n.js", name: "APP_I18N", fam: "A" },
  "performance-bagger": { dict: "assets/js/performance-bagger/i18n.js", name: "I18N_DICT", fam: "B" },
  "rest-time":          { dict: "assets/js/rest-time/i18n-dict.js", name: "I18N_DICT", fam: "B" },
};
function dictText(file, name) {
  const code = read(file); const ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "script", allowReturnOutsideFunction: true });
  const n = ast.body.find((x) => x.type === "VariableDeclaration" && x.declarations[0].id.name === name);
  return code.slice(n.start, n.end).replace(/^const /, "var ");
}
const attrKeys = (html) => [...new Set([...html.matchAll(/data-i18n(?:-html|-placeholder|-title)?="([^"]+)"/g)].map((m) => m[1]))];

for (const [mod, s] of Object.entries(MODS)) {
  const html = read(`${mod}.html`);
  const dict = dictText(s.dict, s.name);

  // --- cakupan key: semua data-i18n* di HTML harus ada di kamus ---
  const w0 = win();
  w0.eval(dict);
  const has = (k, l) => s.fam === "A" ? !!(w0.eval(`${s.name}[${JSON.stringify(k)}]`) || {})[l] : w0.eval(`(${s.name}[${JSON.stringify(l)}]||{})[${JSON.stringify(k)}]`) !== undefined;
  const keys = attrKeys(html);
  const missingId = keys.filter((k) => !has(k, "id"));
  ok(missingId.length === 0, `${mod}: key HTML yang gak ada di kamus 'id': ${missingId.join(", ")}`);
  for (const l of LANGS.slice(1)) {
    const miss = keys.filter((k) => !has(k, l));
    if (miss.length) console.log(`  PERINGATAN ${mod}: ${miss.length} key HTML belum diterjemahkan ke '${l}' (pakai teks bawaan): ${miss.slice(0, 4).join(", ")}${miss.length > 4 ? "…" : ""}`);
  }
  w0.close();

  // --- setiap bahasa menghasilkan teks beda dari key mentah untuk key yang ada ---
  const w = win();
  w.eval(dict);
  const calls = [];
  w.eval(`var __c = []; function __rec(n) { return function () { __c.push(n); }; }
    var renderAll = __rec('renderAll'), renderCountHeadTable = __rec('renderCountHeadTable'), renderProjectionTable = __rec('renderProjectionTable'), updateDropdownOptions = __rec('updateDropdownOptions'),
        renderForCurrentFacility = __rec('renderForCurrentFacility'), updateClock = __rec('updateClock'), renderDashboard = __rec('renderDashboard'), renderLogUpdateList = __rec('renderLogUpdateList'),
        refreshDynamicModuleTexts = __rec('refreshDynamicModuleTexts'), pbLogRefresh = __rec('pbLogRefresh'), pbStatsRefresh = __rec('pbStatsRefresh'),
        renderThTotalHeader = __rec('renderThTotalHeader'), renderPbTable = __rec('renderPbTable'), openPbDetail = __rec('openPbDetail');
    var filteredData = [1], currentDetailOpsId = null;
    var FeedbackBoard = { render: __rec('FeedbackBoard.render') };`);
  w.eval(stripHeader(read(`assets/js/${mod}/i18n-config.js`)));
  const sample = keys[0];
  const texts = LANGS.map((l) => { w.eval(`I18n.setLang('${l}', { persist: false })`); return w.eval(`t(${JSON.stringify(sample)})`); });
  ok(texts[0] !== sample && texts.every((x) => typeof x === "string" && x.length), `${mod}: t('${sample}') terjemahan ada di semua bahasa`);
  ok(new Set(texts).size >= 2, `${mod}: terjemahan antar-bahasa memang beda`);

  // --- hook onChange memanggil render ulang yang sama seperti dulu ---
  w.eval("__c.length = 0; setAppLanguage('en')");
  const c = w.eval("__c.slice()");
  const expected = {
    "inbound": ["renderAll"], // hook lain (Count Head, Projection, dropdown) hilang bersama script lama; kini hanya renderAll di inbound-summary.js
    "inventory-control": ["renderForCurrentFacility"],
    "outbound": ["updateClock", "renderDashboard", "renderLogUpdateList"],
    "performance-bagger": ["pbLogRefresh", "pbStatsRefresh", "FeedbackBoard.render"], // renderThTotalHeader/renderPbTable hanya kalau elemennya ada
    "rest-time": ["refreshDynamicModuleTexts"],
  }[mod];
  ok(JSON.stringify(c) === JSON.stringify(expected), `${mod}: onChange memanggil ${expected.join(", ")} (dapat ${c.join(", ")})`);
  if (mod === "performance-bagger") {
    w.document.body.innerHTML = '<div id="thTotalCol"></div><div id="pbTableBody"></div>';
    w.eval("__c.length = 0; setAppLanguage('ja')");
    ok(w.eval("__c.slice(0,2)").join() === "renderThTotalHeader,renderPbTable", `${mod}: render ulang tabel hanya kalau elemennya ada`);
    w.eval("__c.length = 0; I18n.start()");
    ok(w.eval("__c.join()") === "pbLogRefresh", `${mod}: I18n.start() memanggil pbLogRefresh`);
  }
  w.close();
}
console.log(`\n${pass} pengecekan LULUS`);
