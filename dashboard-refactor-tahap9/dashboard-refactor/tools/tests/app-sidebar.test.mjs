// Tes komponen SIDEBAR UTAMA (assets/js/app-sidebar.js + assets/css/app-sidebar.css).
// Jalankan:  cd tools && npm install && cd .. && node tools/tests/app-sidebar.test.mjs
import fs from "fs";
import assert from "assert";
import { fileURLToPath } from "url";
import { JSDOM, VirtualConsole } from "jsdom";
import * as acorn from "acorn";

const read = (p) => fs.readFileSync(fileURLToPath(new URL("../../" + p, import.meta.url)), "utf8");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };
const LANGS = ["id", "en", "ja", "zh"];
const MODS = ["rest-time", "performance-bagger", "inbound", "outbound", "inventory-control"];

function mount(mod, lang = "id") {
  const dom = new JSDOM(`<body><div class="sidebar-backdrop" id="appSidebarBackdrop"></div><nav class="app-sidebar" id="appSidebar"></nav></body>`,
    { runScripts: "dangerously", url: "http://localhost/", virtualConsole: new VirtualConsole() });
  const w = dom.window; w.localStorage.setItem("pkydcAppLang", lang);
  w.eval(read("assets/js/i18n-engine.js"));
  w.eval(read("assets/js/app-sidebar.js"));
  w.eval(read(`assets/js/${mod}/app-sidebar-config.js`));
  return w;
}
const txt = (n) => n.textContent.replace(/\s+/g, " ").trim();
const $$ = (w, sel) => [...w.document.querySelectorAll(sel)];

// ---------- 1) struktur untuk tiap modul ----------
const SUBTITLE = { "rest-time": "Rest Time Monitoring", "performance-bagger": "Performance Bagger", "inbound": "Inbound", "outbound": "Outbound Monitoring", "inventory-control": "Inventory Control" };
const ICON = { "rest-time": "⏳", "performance-bagger": "🏆", "inbound": "🚚", "outbound": "📦", "inventory-control": "🗃️" };
for (const mod of MODS) {
  const w = mount(mod);
  const nav = w.document.getElementById("appSidebar");
  ok(txt(nav.querySelector(".app-sidebar-icon-box")) === ICON[mod], `${mod}: ikon header`);
  ok(txt(nav.querySelector(".app-sidebar-title")) === "Palangka Raya DC", `${mod}: judul header`);
  ok(txt(nav.querySelector(".app-sidebar-subtitle")) === SUBTITLE[mod], `${mod}: subtitle header = ${SUBTITLE[mod]}`);
  const groups = $$(w, ".app-sidebar-group-label").map((l) => l.getAttribute("data-group"));
  ok(groups.join() === "Productivity,Inbound,OutboundMonitoring,SOC", `${mod}: 4 grup berurutan`);
  ok($$(w, ".app-sidebar-group-label.collapsed").length === 4 && $$(w, ".app-sidebar-group.collapsed").length === 4, `${mod}: semua grup awalnya tertutup`);

  // link ke modul lain: ada, ber-id, href benar; modul sendiri: aktif & tanpa id (atau diganti sub menu)
  const allLinks = $$(w, "a.app-sidebar-link");
  const hrefs = allLinks.map((a) => a.getAttribute("href"));
  const others = MODS.filter((m) => m !== mod).map((m) => m + ".html");
  ok(others.every((h) => hrefs.includes(h)), `${mod}: link ke semua modul lain ada`);
  ok(allLinks.filter((a) => a.id).length === (mod === "outbound" || mod === "inventory-control" ? 4 : 4), `${mod}: 4 link ber-id (modul lain)`);
  if (mod === "outbound") {
    ok($$(w, "button.app-sidebar-link").length === 1 && w.document.getElementById("menuAging").classList.contains("active"), `${mod}: satu sub menu aktif #menuAging`);
    ok(w.document.getElementById("menuAging").getAttribute("onclick") === "switchSubmenu('aging')" && w.document.getElementById("menuAging").getAttribute("data-tab") === "aging", `${mod}: sub menu memanggil switchSubmenu('aging')`);
    ok(!hrefs.includes("outbound.html"), `${mod}: tidak ada link ke diri sendiri`);
  } else if (mod === "inventory-control") {
    const tabs = $$(w, "button.app-sidebar-link[data-tab]").map((b) => b.getAttribute("data-tab"));
    ok(tabs.join() === "usage,dashboard,stock,auditLog,assetMaster", `${mod}: 5 sub menu`);
    ok($$(w, "button.app-sidebar-link[data-tab]").every((b) => b.getAttribute("onclick") === `switchInvSubmenu('${b.getAttribute("data-tab")}')` && b.querySelector("[data-i18n^='inv.tab.']")), `${mod}: sub menu memanggil switchInvSubmenu & memakai kamus modul`);
    ok(!hrefs.includes("inventory-control.html"), `${mod}: tidak ada link ke diri sendiri`);
  } else {
    const self = allLinks.filter((a) => a.getAttribute("href") === mod + ".html");
    ok(self.length === 1 && self[0].classList.contains("active") && !self[0].id, `${mod}: link modul sendiri aktif & tanpa id`);
  }
  // footer
  ok($$(w, "#appLangSelect option").map((o) => o.value).join() === "id,en,ja,zh" && $$(w, "#appLangSelect")[0].getAttribute("onchange") === "setAppLanguage(this.value)", `${mod}: dropdown bahasa`);
  ok(nav.querySelector(".app-sidebar-feedback-btn").getAttribute("onclick") === "openFeedbackBoard()" && $$(w, ".app-sidebar-footer button").pop().getAttribute("onclick") === "logoutApp()", `${mod}: tombol Saran & Logout`);
  w.close();
}

// ---------- 2) terjemahan 4 bahasa: sama dengan kamus OUTBOUND (sumber utama) ----------
const code = read("assets/js/outbound/i18n.js");
const ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "script", allowReturnOutsideFunction: true });
const dn = ast.body.find((x) => x.type === "VariableDeclaration" && x.declarations[0].id.name === "APP_I18N");
const OB = new JSDOM("", { runScripts: "outside-only" }).window.eval(code.slice(dn.start, dn.end).replace(/^const /, "var ") + ";APP_I18N");
// link.inbound: modul ini sekarang "Inbound Tracking" -> sumbernya kamus INBOUND (kunci sidebar.link.inboundTracking), bukan Outbound
const icode = read("assets/js/inbound/i18n.js");
const iast = acorn.parse(icode, { ecmaVersion: "latest", sourceType: "script", allowReturnOutsideFunction: true });
const idn = iast.body.find((x) => x.type === "VariableDeclaration" && x.declarations[0].id.name === "APP_I18N");
const IB = new JSDOM("", { runScripts: "outside-only" }).window.eval(icode.slice(idn.start, idn.end).replace(/^const /, "var ") + ";APP_I18N");
const MAP = { "group.productivity": "sidebar.group.productivity", "group.inbound": "sidebar.group.inbound", "group.outbound": "sidebar.group.outbound", "group.inventory": "sidebar.group.inventory",
  "link.restTime": "sidebar.link.restTime", "link.perfBagger": "sidebar.link.perfBagger", "link.inbound": "sidebar.link.inboundTracking", "link.outbound": "sidebar.link.outboundAging",
  "link.inventory": "sidebar.link.inventory", "lang.label": "lang.label", "feedback.title": "feedback.title", "logout.btn": "logout.btn" };
for (const lang of LANGS) {
  const w = mount("outbound", lang);
  for (const [k, dk] of Object.entries(MAP)) { const src = k === "link.inbound" ? IB : OB; ok(w.AppSidebar.text(k) === src[dk][lang], `teks '${k}' [${lang}] = kamus ${k === "link.inbound" ? "Inbound" : "Outbound"}`); }
  w.close();
}

// ---------- 3) ganti bahasa: label komponen ikut berganti, label sub menu milik modul tidak disentuh ----------
{
  const w = mount("inventory-control", "id");
  w.eval("I18n.configure({ lookup: function () { return undefined; } });");
  const before = $$(w, "button.app-sidebar-link span").map(txt);
  w.eval("setAppLanguage('ja')");
  ok(txt(w.document.querySelector(".app-sidebar-subtitle")) === OB["sidebar.group.inventory"].ja, "ganti ke ja: subtitle header ikut");
  ok(txt(w.document.querySelector('[data-group="Productivity"] [data-sb-text]')) === OB["sidebar.group.productivity"].ja, "ganti ke ja: label grup ikut");
  ok(txt(w.document.querySelector("#navToRestTime")).includes(OB["sidebar.link.restTime"].ja), "ganti ke ja: label link ikut");
  ok(txt(w.document.querySelector(".app-sidebar-feedback-btn")).includes(OB["feedback.title"].ja) && txt($$(w, ".app-sidebar-footer button").pop()).includes(OB["logout.btn"].ja), "ganti ke ja: tombol footer ikut");
  ok($$(w, "button.app-sidebar-link span").map(txt).join() === before.join(), "label sub menu milik modul (data-i18n) tidak ditimpa komponen");
  ok(w.document.getElementById("appLangSelect").value === "ja", "dropdown ikut menunjuk bahasa aktif");
  w.eval("setAppLanguage('en')");
  ok(txt(w.document.querySelector("#navToInbound")).includes("Tracking") && !/LH Tracking/.test(txt(w.document.querySelector("#navToInbound"))), "ganti ke en: label link Inbound = Tracking");
  w.close();
}
{ // bahasa tersimpan dipakai saat mount; tanpa engine i18n tetap Indonesia
  const w = mount("inbound", "zh");
  ok(txt(w.document.querySelector(".app-sidebar-subtitle")) === OB["sidebar.group.inbound"].zh, "mount memakai bahasa tersimpan (zh)");
  w.close();
  const dom = new JSDOM(`<body><nav id="appSidebar"></nav></body>`, { runScripts: "outside-only" });
  dom.window.eval(read("assets/js/app-sidebar.js")); dom.window.eval("AppSidebar.mount({ module: 'inbound' })");
  ok(txt(dom.window.document.querySelector(".app-sidebar-subtitle")) === "Inbound", "tanpa I18n: teks Indonesia, tidak error");
}

// ---------- 4) perilaku grup & drawer ----------
{
  const w = mount("outbound");
  w.eval("toggleSidebarGroup('SOC')");
  ok(!w.document.querySelector('[data-group="SOC"]').classList.contains("collapsed") && !w.document.querySelector('[data-group-body="SOC"]').classList.contains("collapsed"), "toggleSidebarGroup membuka grup");
  w.eval("toggleSidebarGroup('SOC')");
  ok(w.document.querySelector('[data-group="SOC"]').classList.contains("collapsed"), "toggleSidebarGroup menutup lagi");
  w.eval("setSidebarGroupCollapsed('Inbound', false); setSidebarGroupCollapsed('Productivity', false)");
  ok($$(w, ".app-sidebar-group-label:not(.collapsed)").length === 2, "setSidebarGroupCollapsed(false) membuka grup");
  w.eval("collapseAllSidebarGroups()");
  ok($$(w, ".app-sidebar-group-label.collapsed").length === 4, "collapseAllSidebarGroups menutup semua");
  w.eval("toggleSidebarGroup('tidak-ada'); setSidebarGroupCollapsed('tidak-ada', true)"); pass++; // tidak error
  w.eval("toggleAppSidebar()");
  ok(w.document.getElementById("appSidebar").classList.contains("open") && w.document.getElementById("appSidebarBackdrop").classList.contains("open"), "toggleAppSidebar membuka drawer + backdrop");
  w.eval("toggleAppSidebar()");
  ok(!w.document.getElementById("appSidebar").classList.contains("open"), "toggleAppSidebar menutup");
  ok(w.document.querySelector(".app-sidebar-header button").getAttribute("onclick") === "toggleAppSidebar()", "tombol ✕ header menutup drawer");
  w.close();
}
{ // nav/backdrop dibuat otomatis kalau belum ada; mount ulang aman; modul tak dikenal -> error jelas
  const w = new JSDOM("<body></body>", { runScripts: "outside-only" }).window;
  w.eval(read("assets/js/app-sidebar.js"));
  w.eval("AppSidebar.mount({ module: 'rest-time' }); AppSidebar.mount({ module: 'rest-time' });");
  ok(w.document.querySelectorAll("#appSidebar").length === 1 && w.document.querySelectorAll("#appSidebarBackdrop").length === 1, "nav & backdrop dibuat sekali, mount ulang idempoten");
  let msg = ""; try { w.eval("AppSidebar.mount({ module: 'xyz' })"); } catch (e) { msg = e.message; }
  ok(/modul tidak dikenal: xyz/.test(msg), "modul tak dikenal -> error jelas");
}

// ---------- 5) konsistensi dengan HTML tiap halaman ----------
for (const mod of MODS) {
  const html = read(`${mod}.html`);
  ok(html.includes('<nav class="app-sidebar" id="appSidebar"></nav>') && !/app-sidebar-link/.test(html.replace(/<script[\s\S]*?<\/script>/g, "")), `${mod}.html: hanya placeholder sidebar, tanpa markup salinan`);
  ok(/id="appSidebarBackdrop"/.test(html), `${mod}.html: backdrop ada`);
  const tags = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map((m) => m[1]);
  const iCss = tags.indexOf("assets/css/app-sidebar.css"), iMod = tags.indexOf(`assets/css/${mod}.css`);
  ok(iCss >= 0 && iCss < iMod, `${mod}.html: app-sidebar.css dimuat sebelum CSS modul`);
  const iJs = tags.indexOf("assets/js/app-sidebar.js"), iCfg = tags.indexOf(`assets/js/${mod}/app-sidebar-config.js`);
  const iEngine = tags.indexOf("assets/js/i18n-engine.js"), iBridge = tags.indexOf("assets/js/app-shell-bridge.js");
  const firstOwn = tags.findIndex((t) => t.startsWith(`assets/js/${mod}/`) && !/(app-sidebar-config|tailwind-config)\.js$/.test(t)); // tailwind-config di <head> memang paling awal
  ok(iEngine >= 0 && iEngine < iJs && iBridge < iJs && iJs < iCfg && iCfg < firstOwn, `${mod}.html: urutan engine < app-sidebar < config < skrip modul`);
  const modCss = read(`assets/css/${mod}.css`);
  ok(!/\.app-sidebar-(header|body|link|footer|group)/.test(modCss), `${mod}.css: tidak ada salinan aturan sidebar`);
  // fungsi yang dipanggil sub menu benar-benar ada di skrip modul
  const cfg = read(`assets/js/${mod}/app-sidebar-config.js`);
  for (const fn of new Set([...cfg.matchAll(/onclick: "(\w+)\(/g)].map((m) => m[1]))) {
    const files = fs.readdirSync(fileURLToPath(new URL(`../../assets/js/${mod}/`, import.meta.url))).filter((f) => f.endsWith(".js"));
    ok(files.some((f) => new RegExp(`function ${fn}\\(`).test(read(`assets/js/${mod}/${f}`))), `${mod}: ${fn}() yang dipanggil sub menu ada di skrip modul`);
  }
}
const common = read("assets/js/common.js");
ok(!/function (toggleAppSidebar|toggleSidebarGroup|setSidebarGroupCollapsed|collapseAllSidebarGroups)/.test(common), "common.js tidak lagi mendefinisikan fungsi sidebar (sudah di app-sidebar.js)");
ok(MODS.every((m) => !/SIDEBAR_NAV_GROUPS/.test(fs.readdirSync(fileURLToPath(new URL(`../../assets/js/${m}/`, import.meta.url))).map((f) => read(`assets/js/${m}/${f}`)).join("\n"))), "SIDEBAR_NAV_GROUPS tidak ada lagi di modul manapun");

console.log(`\n${pass} pengecekan LULUS`);
