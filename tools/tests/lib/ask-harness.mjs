// Harness karakterisasi untuk askAgent() (assets/js/report-agent/*). Dipakai oleh tools/tests/ask-agent.test.mjs.
// Memuat halaman Odyssey di jsdom (script lokal DIJALANKAN, library CDN diganti stub), memalsukan fetch
// & fungsi UI/Firebase sebagai PEREKAM, lalu menjalankan skenario dan mengembalikan "trace":
// semua panggilan ke fungsi luar + semua request ke proxy AI + keadaan akhir riwayat chat.
import fs from "fs";
import path from "path";
import { JSDOM, VirtualConsole, ResourceLoader } from "jsdom";

process.env.TZ = "Asia/Jakarta";
const FIXED_ISO = "2026-11-18T03:00:00.000Z"; // 10:00 WIB

function makeStub() {
  const f = function () {};
  const p = new Proxy(f, {
    get(_, k) { if (k === "then" || k === Symbol.toPrimitive) return undefined; if (k === "toString") return () => "[stub]"; if (k === "valueOf") return () => 0; if (k === "length") return 0; if (k === Symbol.iterator) return function* () {}; return p; },
    apply() { return p; }, construct() { return p; }, has() { return true; },
  });
  return p;
}
function makeLoader(root) {
  return new (class extends ResourceLoader {
    fetch(url) {
      const u = new URL(url);
      if (u.hostname === "localhost") { try { return Promise.resolve(fs.readFileSync(path.join(root, decodeURIComponent(u.pathname)))); } catch (e) { return Promise.reject(e); } }
      return Promise.resolve(Buffer.from(""));
    }
  })();
}

export async function loadWindow(root) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { const m = String((e.detail && e.detail.message) || e.message || e); if (!/Not implemented/.test(m)) errors.push(m.split("\n")[0].slice(0, 160)); });
  const dom = await JSDOM.fromFile(path.join(root, "report-agent.html"), {
    url: "http://localhost/report-agent.html", runScripts: "dangerously", resources: makeLoader(root), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      const s = makeStub();
      for (const n of ["firebase", "Chart", "XLSX", "jspdf", "html2canvas", "tailwind", "QRCode", "hljs", "ChartDataLabels", "JSZip", "Papa", "marked", "DOMPurify", "pdfjsLib"]) w[n] = s;
      w.HTMLCanvasElement.prototype.getContext = () => s;
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.scrollTo = () => {}; w.alert = () => {}; w.confirm = () => true; w.prompt = () => "";
      w.Audio = function () { return s; }; w.AudioContext = function () { return s; };
      w.fetch = () => new Promise(() => {});
      const Obs = function () { return { observe() {}, unobserve() {}, disconnect() {} }; };
      w.IntersectionObserver = Obs; w.ResizeObserver = Obs;
      // waktu & acak deterministik
      const RealDate = w.Date, FIXED = new RealDate(FIXED_ISO).getTime();
      w.Date = class extends RealDate { constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); } static now() { return FIXED; } };
      w.Math.random = () => 0.5;
    },
  });
  await new Promise((r) => (dom.window.document.readyState === "complete" ? r() : dom.window.addEventListener("load", r)));
  await new Promise((r) => setTimeout(r, 60));
  dom.window.__loadErrors = errors;
  return dom.window;
}

// ---------- fixture state (non-kosong & berbeda-beda) ----------
function fixtures(w) {
  const trips = w.generateMockData();
  return {
    currentTrips: trips,
    currentRestLogs: [
      { _key: "rk1", opsId: "OPS1", nama: "Budi", breakType: "Break Out", timestamp: "2026-11-18 08:30:00", workingDate: "2026-11-18" },
      { _key: "rk2", opsId: "OPS2", nama: "Sari", breakType: "Break In", timestamp: "2026-11-18 09:10:00", workingDate: "2026-11-18" },
    ],
    currentAssetLogs: [
      { _key: "ak1", serialNumber: "SN-A", opsId: "OPS1", action: "Pinjam PDA", timestamp: "2026-11-18 08:00:00", workingDate: "2026-11-18" },
      { _key: "ak2", serialNumber: "SN-B", opsId: "OPS3", action: "Kembali PDA", timestamp: "2026-11-18 07:00:00", workingDate: "2026-11-18" },
    ],
    monMasterKaryawan: { OPS1: { name: "Budi", dept: "Sortation", agency: "AG-1" }, OPS2: { name: "Sari", dept: "Packing", agency: "AG-2" } },
    monPdaStationMap: { "SN-A": "Station 1", "SN-B": "Station 2" },
    currentOutboundRaw: [{ receiverName: "HUB-X", agingDays: 5, packingMethod: "Assisted Sorting" }, { receiverName: "HUB-Y", agingDays: 1, packingMethod: "Individual Packing" }, { receiverName: "HUB-Z", agingDays: 0 }],
    currentPbDailyRecords: { "2026-11-17": { OPS1: { total: 120 }, OPS2: { total: 90 } } },
    currentPbImportLogs: { L1: { fileName: "pdvt-1.xlsx" }, L2: { fileName: "pdvt-2.xlsx" } },
    currentInvStock: { A1: { name: "ATK Pulpen", qty: 5, minStock: 10 }, A2: { name: "Lakban", qty: 50, minStock: 5 } },
    currentInvUsageLogs: { U1: { assetName: "Lakban", qtyUsed: 3, workingDate: "2026-11-18" } },
    currentInvAssetItNca: { I1: { name: "Laptop-01", pic: "Budi" } },
    currentInvAuditLog: { X1: { action: "edit", by: "a@b.c" } },
  };
}

// ---------- jalankan satu skenario ----------
export async function runScenario(root, sc) {
  const w = await loadWindow(root);
  const trace = [];
  const fetches = [];
  const J = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x, (k, v) => (v === undefined ? "__undefined__" : typeof v === "function" ? "__fn__" : v)));
  const rec = (name, args) => trace.push({ call: name, args: J(args) });

  // UI & efek samping luar -> perekam
  for (const n of ["addMessage", "addTyping", "removeTyping", "scheduleSaveSession", "renderInventoryActionConfirmCard", "renderRestActionConfirmCard"]) {
    w[n] = function () { rec(n, [...arguments]); };
  }
  // pembangun data (TIDAK diubah oleh refactor) -> stub yang mengembalikan turunan argumennya
  w.computeConvoyGroups = function (trips) { rec("computeConvoyGroups", [trips]); return trips.filter((t) => t.ataDest).length >= 2 ? [{ convoyKe: 1, tanggal: "2026-11-18", jumlah: trips.length }] : []; };
  w.computeRestAssetLiveStatus = function (a, b, c, d) { rec("computeRestAssetLiveStatus", [a, b, c, d]); return { stub: "restLive", n: [a.length, b.length, Object.keys(c).length, Object.keys(d).length] }; };
  w.buildOutboundSummary = function (raw) { rec("buildOutboundSummary", [raw]); return { stub: "outbound", rawCount: raw.length, first: raw[0] || null }; };
  w.buildPerformanceBaggerSummary = function (a, b) { rec("buildPerformanceBaggerSummary", [a, b]); return { stub: "pb", a: Object.keys(a), b: Object.keys(b) }; };
  w.buildInventoryControlSummary = function (a, b, c, d) { rec("buildInventoryControlSummary", [a, b, c, d]); return { stub: "inv", n: [Object.keys(a).length, Object.keys(b).length, Object.keys(c).length, Object.keys(d).length] }; };
  w.classifyModulesWithAI = async function (q) { rec("classifyModulesWithAI", [q]); if (sc.classifyThrows) throw new Error(sc.classifyThrows); return sc.classify || []; };

  // state
  const fx = Object.assign(fixtures(w), sc.state || {});
  w.__fx = JSON.parse(JSON.stringify(fx));
  w.eval(Object.keys(fx).map((k) => `${k} = __fx.${k};`).join("\n") + `\nchatHistory = ${JSON.stringify(sc.history || [])};`);

  // dropdown model
  let sel = w.document.getElementById("modelSelect");
  if (sc.noModelSelect) { if (sel) sel.remove(); }
  else {
    if (!sel) { sel = w.document.createElement("select"); sel.id = "modelSelect"; w.document.body.appendChild(sel); }
    sel.innerHTML = '<option value="">Auto</option>' + (sc.model ? `<option value="${sc.model}">${sc.model}</option>` : "");
    sel.value = sc.model || "";
  }

  // fetch -> perekam + respons terskrip
  let i = 0;
  w.fetch = async (url, opts) => {
    fetches.push({ url, method: opts && opts.method, headers: opts && opts.headers, body: opts && opts.body ? JSON.parse(opts.body) : null });
    const r = (sc.responses || [])[i++] || { text: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"replyLines":["default"],"attachedUnits":[]}' }] } }] }) };
    if (r.reject) throw new Error(r.reject);
    return { ok: r.ok !== false, status: r.status || 200, text: async () => r.text };
  };

  let result = { returned: "ok" };
  try { await w.askAgent(sc.question, sc.image); }
  catch (e) { result = { threw: String(e && e.message) }; }
  const finalHistory = J(w.eval("chatHistory"));
  const loadErrors = w.__loadErrors.slice();
  w.close();
  return { result, trace, fetches: J(fetches), finalHistory, loadErrors };
}
