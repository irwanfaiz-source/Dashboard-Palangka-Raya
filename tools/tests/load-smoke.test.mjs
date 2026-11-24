// Tes muat halaman: setiap modul dimuat di jsdom (script lokal DIJALANKAN, library CDN diganti stub)
// dan TIDAK boleh ada error saat load. Menangkap urutan script yang salah, ReferenceError saat
// inisialisasi, dll. yang lolos dari pengecekan sintaks.
// Jalankan:  cd tools && npm install && cd .. && node tools/tests/load-smoke.test.mjs [root-proyek]
// Butuh auth-guard.js di root proyek (ada di repo; BUKAN bagian dari zip refactor).
import fs from "fs";
import path from "path";
import assert from "assert";
import { fileURLToPath } from "url";
import { JSDOM, VirtualConsole, ResourceLoader } from "jsdom";

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL("../../", import.meta.url));
const PAGES = ["inbound", "inventory-control", "outbound", "performance-bagger", "rest-time", "report-agent"];
if (!fs.existsSync(path.join(ROOT, "auth-guard.js"))) { console.error("auth-guard.js tidak ada di " + ROOT); process.exit(2); }

// Stub universal: apa pun yang diakses/dipanggil mengembalikan stub lagi (tanpa 'then', supaya bukan thenable).
function makeStub() {
  const f = function () {};
  const p = new Proxy(f, {
    get(_, k) { if (k === "then" || k === Symbol.toPrimitive) return undefined; if (k === "toString") return () => "[stub]"; if (k === "valueOf") return () => 0; if (k === "length") return 0; if (k === Symbol.iterator) return function* () {}; return p; },
    apply() { return p; }, construct() { return p; }, has() { return true; },
  });
  return p;
}
// http://localhost/... -> file lokal di root; CDN (http/https lain) -> kosong (diganti stub)
function makeLoader(root) {
  return new (class extends ResourceLoader {
    fetch(url) {
      const u = new URL(url);
      if (u.hostname === "localhost") { try { return Promise.resolve(fs.readFileSync(path.join(root, decodeURIComponent(u.pathname)))); } catch (e) { return Promise.reject(e); } }
      return Promise.resolve(Buffer.from(""));
    }
  })();
}

async function loadPage(page, root) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { const m = String(e.detail && e.detail.message || e.message || e); if (!/Not implemented/.test(m)) errors.push(m.split("\n")[0].slice(0, 160)); });
  const dom = await JSDOM.fromFile(path.join(root, page + ".html"), {
    url: `http://localhost/${page}.html`, runScripts: "dangerously", resources: makeLoader(root), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      const s = makeStub();
      for (const n of ["firebase", "Chart", "XLSX", "jspdf", "html2canvas", "tailwind", "QRCode", "hljs", "ChartDataLabels", "JSZip", "Papa", "marked", "DOMPurify", "pdfjsLib"]) w[n] = s;
      w.HTMLCanvasElement.prototype.getContext = () => s;
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {}; w.alert = () => {}; w.confirm = () => true; w.prompt = () => "";
      w.addEventListener("error", (e) => errors.push(String(e.message || e.error).slice(0, 160)));
      w.Audio = function () { return s; }; w.AudioContext = function () { return s; };
      w.fetch = () => new Promise(() => {});          // gak pernah selesai: cukup buat uji load
      const Obs = function () { return { observe() {}, unobserve() {}, disconnect() {} }; };
      w.IntersectionObserver = Obs; w.ResizeObserver = Obs;
    },
  });
  await new Promise((r) => (dom.window.document.readyState === "complete" ? r() : dom.window.addEventListener("load", r)));
  await new Promise((r) => setTimeout(r, 400));
  const w = dom.window;
  const fnNames = Object.getOwnPropertyNames(w).filter((k) => { try { return typeof w[k] === "function" && !/^(on|webkit)/.test(k) && w[k].toString().indexOf("[native code]") === -1; } catch { return false; } }).sort();
  // lexical (let/const) tidak muncul di window; cek lewat eval nama-nama top-level yang kita ketahui dari script
  const html = w.document.body.innerHTML.replace(/<script[\s\S]*?<\/script>/g, "").replace(/\d+/g, "#").replace(/\s+/g, " ");
  const ids = w.document.querySelectorAll("[id]").length;
  w.close();
  return { errors: [...new Set(errors)], ids, fnNames, html };
}


let pass = 0, failed = 0;
for (const p of PAGES) {
  const r = await loadPage(p, ROOT);
  const okPage = r.errors.length === 0 && r.fnNames.length > 100;
  console.log(`${okPage ? "OK  " : "GAGAL"} ${p.padEnd(20)} ${r.errors.length} error saat load, ${r.fnNames.length} fungsi global`);
  r.errors.slice(0, 6).forEach((e) => console.log("      -", e));
  if (okPage) pass++; else failed++;
}
console.log(failed ? `\n${failed} halaman bermasalah.` : `\n${pass} halaman termuat tanpa error.`);
process.exit(failed ? 1 : 0);
