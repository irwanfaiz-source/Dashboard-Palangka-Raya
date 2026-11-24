// Deteksi variabel/fungsi yang DIPAKAI tapi gak didefinisikan di script manapun yang dimuat halaman
// (penyebab ReferenceError saat jalan, mis. setelah memindah fungsi ke file lain).
// Jalankan:  cd tools && npm install && cd .. && node tools/check-globals.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as acorn from "acorn";
import * as eslintScope from "eslint-scope";
import globals from "globals";

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL("../", import.meta.url));
// Global dari library CDN yang dimuat lewat <script src="https://...">
const LIB_GLOBALS = new Set((process.env.EXTRA_GLOBALS || "").split(",").filter(Boolean).concat([
  "QRCode", "hljs", "firebase", "Chart", "XLSX", "jspdf", "html2canvas", "tailwind", "ChartDataLabels", "JSZip", "Papa", "marked", "DOMPurify",
]));
const BROWSER = new Set([...Object.keys(globals.browser), ...Object.keys(globals.builtin), "globalThis", "undefined"]);

function typeofOperands(ast) {
  const set = new Set();
  (function walk(n) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "UnaryExpression" && n.operator === "typeof" && n.argument.type === "Identifier") set.add(n.argument.start);
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
  })(ast);
  return set;
}

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
let total = 0;
for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), "utf8");
  const segs = []; // { label, code }
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = (m[1].match(/src="([^"]+)"/) || [])[1];
    if (/type="(module|application\/json|importmap)/.test(m[1])) continue;
    if (src) {
      if (/^https?:/.test(src)) continue;
      const f = path.join(ROOT, src);
      if (fs.existsSync(f)) segs.push({ label: src, code: fs.readFileSync(f, "utf8") });
    } else if (m[2].trim()) segs.push({ label: page + " (inline)", code: m[2] });
  }
  let code = "", map = [];
  for (const s of segs) { map.push({ start: code.length, label: s.label, line0: code.split("\n").length - 1 }); code += s.code + "\n;\n"; }
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "script", locations: true, ranges: true, allowReturnOutsideFunction: true }); }
  catch (e) { console.log(`${page}: gagal parse (${e.message})`); total++; continue; }
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: "script" });
  const g = sm.globalScope;
  const declared = new Set(g.variables.map((v) => v.name));
  for (const m of code.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) declared.add(m[1]);
  const typeofSet = typeofOperands(ast);
  const missing = new Map();
  for (const ref of g.through) {
    const id = ref.identifier;
    if (declared.has(id.name) || BROWSER.has(id.name) || LIB_GLOBALS.has(id.name) || typeofSet.has(id.start)) continue;
    if (!missing.has(id.name)) {
      let seg = map[0]; for (const s of map) if (s.start <= id.start) seg = s;
      missing.set(id.name, `${seg.label}:${id.loc.start.line - seg.line0}`);
    }
  }
  for (const [name, where] of missing) { console.log(`${page}: '${name}' dipakai tapi tidak didefinisikan (pertama di ${where})`); total++; }
}
console.log(total ? `\n${total} masalah.` : `\nOK — semua identifier terdefinisi di ${pages.length} halaman.`);
process.exit(total ? 1 : 0);
