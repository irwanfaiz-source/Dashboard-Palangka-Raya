// Tes komponen bersama: toast (common.js) dan app-shell bridge (app-shell-bridge.js + AppSidebar).
// Jalankan:  cd tools && npm install && cd .. && node tools/tests/shared-ui.test.mjs
import fs from "fs";
import assert from "assert";
import { fileURLToPath } from "url";
import { JSDOM, VirtualConsole } from "jsdom";

const read = (p) => fs.readFileSync(fileURLToPath(new URL("../../" + p, import.meta.url)), "utf8");
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; };

// Link yang HARUS diteruskan ke shell per modul: semua modul LAIN, urutan sidebar utama.
// [idElemen, tab, submenu?]
const ALL = [["navToRestTime", "rest-time"], ["navToPerformanceBagger", "performance-bagger"], ["navToInbound", "inbound"], ["navToOutbound", "outbound", "aging"], ["navToInventoryControl", "inventory-control"]];
const SELF = { "rest-time": "navToRestTime", "performance-bagger": "navToPerformanceBagger", "inbound": "navToInbound", "outbound": "navToOutbound", "inventory-control": "navToInventoryControl" };
const EXPECTED_LINKS = Object.fromEntries(Object.entries(SELF).map(([m, selfId]) => [m, ALL.filter((l) => l[0] !== selfId)]));
const MODS = Object.keys(EXPECTED_LINKS);

// ---------------- toast (common.js) ----------------
{
  const dom = new JSDOM(`<body><div id="toastStack"></div></body>`, { runScripts: "dangerously" }); // onclick inline butuh "dangerously"
  const w = dom.window;
  w.eval("var __delays=[]; (function(){ var st=window.setTimeout; window.setTimeout=function(f,d){ __delays.push(d); return st(f,d); }; })();");
  w.eval(read("assets/js/common.js"));

  w.showToast("Halo <b>x</b>", "ok");
  const items = w.document.querySelectorAll("#toastStack .toast-item");
  ok(items.length === 1 && items[0].classList.contains("ok"), "toast ok tampil");
  ok(items[0].innerHTML.includes("✅") && items[0].innerHTML.includes("&lt;b&gt;x"), "ikon ok + pesan di-escape");
  w.showToast("gagal", "err");
  ok(w.document.querySelectorAll(".toast-item.err").length === 1 && w.document.body.innerHTML.includes("⛔"), "toast err tampil");
  w.showToast("info");
  ok(w.document.querySelectorAll(".toast-item.info").length === 1, "tipe default info");
  w.showToast("x", "ok", 123);
  ok(w.__delays.join(",") === "4500,7000,4500,123", "durasi: ok/info 4500, err 7000, custom dihormati -> " + w.__delays.join(","));
  w.document.querySelector(".toast-close").click();
  ok(w.document.querySelectorAll(".toast-item").length === 3, "tombol ✕ menutup toast");

  w.document.getElementById("toastStack").remove();
  let warned = 0; w.console.warn = () => warned++;
  w.showToast("tanpa stack", "ok");
  ok(warned === 1, "tanpa #toastStack: gak crash, cuma console.warn");
  w.close();
}

// ---------------- app-shell-bridge, memakai sidebar utama yang sungguhan ----------------
// Komponen sidebar dievaluasi GLOBAL seperti di browser; hanya bridge yang dibungkus supaya window.top bisa dipalsukan.
function runBridge(mod, { iframe = true, url = "http://localhost/" } = {}) {
  const vc = new VirtualConsole(); // diam: klik <a> memicu "navigation not implemented" di jsdom
  const dom = new JSDOM(`<body><div class="sidebar-backdrop" id="appSidebarBackdrop"></div><nav class="app-sidebar" id="appSidebar"></nav></body>`, { url, runScripts: "dangerously", virtualConsole: vc });
  const w = dom.window;
  w.eval(read("assets/js/app-sidebar.js"));
  w.eval(read(`assets/js/${mod}/app-sidebar-config.js`));
  const posted = [];
  const fakeTop = { postMessage: (m, target) => posted.push([m, target]) };
  const proxy = new Proxy(w, {
    get(t, k) { if (k === "top") return iframe ? fakeTop : w; if (k === "self") return w; const v = t[k]; return typeof v === "function" ? v.bind(t) : v; },
  });
  const calls = [];
  const body = `${read("assets/js/app-shell-bridge.js")}\nlet shellReportedVisible = null;\n${read(`assets/js/${mod}/app-shell-bridge.js`)}\nreturn { get vis() { return shellReportedVisible; } };`;
  const fn = new Function("window", "document", "AppSidebar", "collapseAllSidebarGroups", "switchInvSubmenu", "switchSubmenu", "handleRestTimeModuleVisibilityChange", body);
  w.__PAGE_TAB = "rest-time";
  const state = fn(proxy, w.document, w.AppSidebar, w.collapseAllSidebarGroups, (s) => calls.push(["inv", s]), (s) => calls.push(["sub", s]), () => calls.push(["restVis"]));
  const send = (data, origin) => w.dispatchEvent(new w.MessageEvent("message", { data, origin: origin ?? new URL(url).origin }));
  const click = (id) => { const ev = new w.MouseEvent("click", { cancelable: true, bubbles: true }); w.document.getElementById(id).dispatchEvent(ev); return ev.defaultPrevented; };
  return { w, posted, calls, state, send, click };
}

for (const mod of MODS) {
  const expected = EXPECTED_LINKS[mod];
  const b = runBridge(mod);
  // link dari komponen == daftar yang diharapkan, dan tiap link benar-benar di-intercept & diteruskan
  ok(JSON.stringify(b.w.AppSidebar.bridgeLinks()) === JSON.stringify(expected), `${mod}: bridgeLinks() = semua modul lain, urutan sidebar`);
  for (const [id, tab, sub] of expected) {
    const before = b.posted.length;
    ok(b.click(id) && b.posted.length === before + 1, `${mod}: ${id} di-intercept`);
    const [msg, target] = b.posted[b.posted.length - 1];
    ok(msg.source === "pkydc" && msg.type === "switchTab" && msg.tab === tab && msg.submenu === (sub || null), `${mod}: ${id} -> ${tab}/${sub || "null"}`);
    ok(target === "http://localhost", `${mod}: pesan keluar hanya ke origin sendiri`);
  }
  ok(b.w.document.getElementById(SELF[mod]) === null, `${mod}: tidak ada link (ber-id) ke modul sendiri`);

  // collapseSidebarGroups: hanya dari origin/source yang benar; efeknya menutup grup yang sedang terbuka
  const label = b.w.document.querySelector('.app-sidebar-group-label[data-group="Productivity"]');
  const body = b.w.document.querySelector('[data-group-body="Productivity"]');
  label.dispatchEvent(new b.w.MouseEvent("click"));                                   // onclick inline -> toggleSidebarGroup
  ok(!label.classList.contains("collapsed") && !body.classList.contains("collapsed"), `${mod}: klik label membuka grup`);
  b.send({ source: "pkydc", type: "collapseSidebarGroups" }, "https://evil.example");
  b.send({ source: "lain", type: "collapseSidebarGroups" });
  b.send(null);
  ok(!label.classList.contains("collapsed"), `${mod}: origin asing / source salah / null diabaikan`);
  b.send({ source: "pkydc", type: "collapseSidebarGroups" });
  ok(label.classList.contains("collapsed") && body.classList.contains("collapsed"), `${mod}: collapseSidebarGroups dari origin sendiri menutup grup`);

  // pesan khusus modul
  if (mod === "inventory-control") {
    b.send({ source: "pkydc", type: "setSubmenu", submenu: "stock" }); b.send({ source: "pkydc", type: "setSubmenu", submenu: "x" }, "https://evil.example");
    ok(JSON.stringify(b.calls.filter((c) => c[0] === "inv")) === '[["inv","stock"]]', `${mod}: setSubmenu -> switchInvSubmenu (origin asing ditolak)`);
  }
  if (mod === "outbound") {
    b.send({ source: "pkydc", type: "setSubmenu", submenu: "aging" });
    ok(JSON.stringify(b.calls.filter((c) => c[0] === "sub")) === '[["sub","aging"]]', `${mod}: setSubmenu -> switchSubmenu`);
  }
  if (mod === "rest-time") {
    b.send({ source: "pkydc", type: "activeTabChanged", tab: "rest-time" });
    ok(b.state.vis === true, `${mod}: activeTabChanged ke tab sendiri -> visible`);
    b.send({ source: "pkydc", type: "activeTabChanged", tab: "inbound" });
    ok(b.state.vis === false, `${mod}: activeTabChanged ke tab lain -> hidden`);
    b.send({ source: "pkydc", type: "moduleVisibility", visible: true });
    ok(b.state.vis === true && b.calls.filter((c) => c[0] === "restVis").length === 3, `${mod}: moduleVisibility + handler dipanggil`);
    b.send({ source: "pkydc", type: "moduleVisibility", visible: "ya" });
    ok(b.calls.filter((c) => c[0] === "restVis").length === 3, `${mod}: moduleVisibility non-boolean diabaikan`);
  }
  // dibuka langsung (bukan iframe): semuanya nonaktif
  const d = runBridge(mod, { iframe: false });
  ok(d.click(expected[0][0]) === false && d.posted.length === 0, `${mod}: dibuka langsung -> link normal`);
}
// file:// (dev lokal): origin "null" -> target '*'
{
  const b = runBridge("inbound", { url: "file:///C:/dash/inbound.html" });
  b.click(EXPECTED_LINKS.inbound[0][0]);
  ok(b.posted.length === 1 && b.posted[0][1] === "*", "file:// -> targetOrigin '*' (gak error)");
}
// shell: pesan hanya dari origin sendiri
ok(/addEventListener\("message", function \(e\) \{\s*if \(e\.origin !== window\.location\.origin\) return;/.test(read("assets/js/index/app-shell.js")), "app-shell: listener memeriksa origin");

console.log(`\n${pass} pengecekan LULUS`);
