// Memeriksa URUTAN MUAT script tiap halaman secara statis.
//
// Masalah yang dicari: script A (dimuat lebih dulu) menjalankan kode saat load yang memakai
// sesuatu yang baru didefinisikan di script B (dimuat belakangan). Di satu file besar ini aman
// karena deklarasi fungsi di-hoist; setelah dipecah jadi beberapa file, itu jadi ReferenceError.
//
// "Dijalankan saat load" = kode top-level di luar deklarasi fungsi, ditambah isi fungsi yang
// DIPANGGIL dari kode seperti itu (transitif). Callback yang jelas tertunda (addEventListener,
// on, then, setTimeout, setInterval, ...) dan fungsi yang cuma di-assign tidak dihitung.
// Callback ke method lain (forEach, map, ...) dihitung berjalan langsung (konservatif).
//
// Jalankan:  cd tools && npm install && cd .. && node tools/check-load-order.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as acorn from "acorn";
import * as eslintScope from "eslint-scope";

const DEFERRED_CALLEES = new Set(["addEventListener", "removeEventListener", "on", "once", "off", "then", "catch", "finally", "setTimeout", "setInterval",
  "requestAnimationFrame", "requestIdleCallback", "onAuthStateChanged", "onSnapshot", "observe", "queueMicrotask", "subscribe", "ready",
  // API komponen bersama proyek ini yang memanggil callback-nya belakangan (lazy)
  "byKey", "byLang", "configure"]);
const FN = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

function annotate(node, parent) {
  node.parent = parent;
  for (const k of Object.keys(node)) {
    if (k === "parent") continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && annotate(c, node));
    else if (v && typeof v.type === "string") annotate(v, node);
  }
}
function calleeName(call) {
  const c = call.callee;
  if (c.type === "Identifier") return c.name;
  if (c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier") return c.property.name;
  return null;
}
function isDeferredFn(fn) {
  if (fn.type === "FunctionDeclaration") return true;
  const p = fn.parent;
  if (p && p.type === "CallExpression") {
    if (p.callee === fn) return false;                        // IIFE
    return DEFERRED_CALLEES.has(calleeName(p));               // callback ke API asinkron
  }
  if (p && p.type === "NewExpression") return false;          // mis. new Promise(function(){...})
  return true;                                                // di-assign / disimpan saja
}
function typeofOperands(ast) {
  const s = new Set();
  (function w(n) {
    if (n.type === "UnaryExpression" && n.operator === "typeof" && n.argument.type === "Identifier") s.add(n.argument);
    for (const k of Object.keys(n)) { if (k === "parent") continue; const v = n[k]; if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && w(c)); else if (v && typeof v.type === "string") w(v); }
  })(ast);
  return s;
}

export function analyze(scripts) {
  const infos = scripts.map((s, idx) => {
    const ast = acorn.parse(s.code, { ecmaVersion: "latest", sourceType: "script", locations: true, ranges: true, allowReturnOutsideFunction: true });
    annotate(ast, null);
    const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: "script" });
    const reads = new Set(); // node Identifier yang merujuk global (belum terselesaikan / variabel global script ini)
    const skip = typeofOperands(ast);
    for (const scope of sm.scopes) for (const ref of scope.references) {
      if (skip.has(ref.identifier)) continue;
      if (!ref.resolved || ref.resolved.scope.type === "global") reads.add(ref.identifier);
    }
    return { ...s, idx, ast, reads };
  });

  // deklarasi top-level: nama -> [{idx, fnNode}]
  const decls = new Map();
  const addDecl = (name, idx, fnNode) => { if (!decls.has(name)) decls.set(name, []); decls.get(name).push({ idx, fnNode }); };
  for (const info of infos) for (const n of info.ast.body) {
    if (n.type === "FunctionDeclaration") addDecl(n.id.name, info.idx, n);
    else if (n.type === "ClassDeclaration") addDecl(n.id.name, info.idx, null);
    else if (n.type === "VariableDeclaration") for (const d of n.declarations) {
      const names = []; (function w(p) { if (!p) return; if (p.type === "Identifier") names.push(p.name); else if (p.type === "ObjectPattern") p.properties.forEach((x) => w(x.value || x.argument)); else if (p.type === "ArrayPattern") p.elements.forEach(w); else if (p.type === "AssignmentPattern") w(p.left); else if (p.type === "RestElement") w(p.argument); })(d.id);
      const fnNode = d.init && (d.init.type === "FunctionExpression" || d.init.type === "ArrowFunctionExpression") ? d.init : null;
      names.forEach((nm) => addDecl(nm, info.idx, fnNode));
    }
  }

  // kumpulkan identifier global yang dievaluasi saat `root` dieksekusi + callee yang dipanggil
  function exec(info, root) {
    const refs = [], calls = [];
    (function w(n, top) {
      if (!top && FN.has(n.type) && isDeferredFn(n)) return;
      if (!top && (n.type === "ClassDeclaration" || n.type === "ClassExpression")) { if (n.superClass) w(n.superClass, false); return; }
      if (n.type === "Identifier" && info.reads.has(n)) refs.push(n);
      if (n.type === "CallExpression" || n.type === "NewExpression") { if (n.callee.type === "Identifier" && info.reads.has(n.callee)) calls.push(n.callee.name); }
      for (const k of Object.keys(n)) {
        if (k === "parent") continue;
        const v = n[k];
        if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && w(c, false));
        else if (v && typeof v.type === "string") w(v, false);
      }
    })(root, true);
    return { refs, calls };
  }

  const problems = [];
  for (const info of infos) {
    const seen = new Set();
    const report = (name, node, chain) => {
      const ds = decls.get(name); if (!ds) return;                       // bukan buatan kita (browser/library)
      if (ds.some((d) => d.idx <= info.idx)) return;                    // sudah tersedia
      const later = ds[0];
      const key = name + "@" + chain.join(">");
      if (seen.has(key)) return; seen.add(key);
      problems.push({ script: info.label, line: node.loc.start.line, name, declaredIn: scripts[later.idx].label, via: chain });
    };
    // 1) kode top-level script ini (di luar deklarasi fungsi)
    const stack = [];
    const top = { refs: [], calls: [] };
    for (const n of info.ast.body) {
      if (n.type === "FunctionDeclaration") continue;
      const r = exec(info, n); top.refs.push(...r.refs); top.calls.push(...r.calls);
    }
    top.refs.forEach((id) => report(id.name, id, ["(top-level)"]));
    // 2) fungsi yang dipanggil dari sana, transitif
    const visited = new Set();
    const queue = top.calls.map((c) => ({ name: c, chain: ["(top-level)", c + "()"] }));
    while (queue.length) {
      const { name, chain } = queue.shift();
      const ds = (decls.get(name) || []).filter((d) => d.idx <= info.idx && d.fnNode);
      if (!ds.length || visited.has(name)) continue;
      visited.add(name);
      const d = ds[ds.length - 1];
      const r = exec(infos[d.idx], d.fnNode);
      // jalankan pelaporan pakai `info` (kapan dieksekusi) tapi `reads` milik script tempat fungsi didefinisikan
      for (const id of r.refs) {
        const dd = decls.get(id.name); if (!dd) continue;
        if (dd.some((x) => x.idx <= info.idx)) continue;
        const key = id.name + "@" + chain.join(">");
        if (seen.has(key)) continue; seen.add(key);
        problems.push({ script: info.label, line: id.loc.start.line, name: id.name, declaredIn: scripts[dd[0].idx].label, via: chain, inFile: scripts[d.idx].label });
      }
      r.calls.forEach((c) => queue.push({ name: c, chain: [...chain, c + "()"] }));
    }
  }
  return problems;
}

// ----------------------------- CLI -----------------------------
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL("../", import.meta.url));
  let total = 0, pages = 0;
  for (const page of fs.readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort()) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    const scripts = [];
    for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      const src = (m[1].match(/src="([^"]+)"/) || [])[1];
      if (/type="(module|application\/json|importmap)/.test(m[1])) continue;
      if (src) { if (/^https?:/.test(src)) continue; const f = path.join(ROOT, src); if (fs.existsSync(f)) scripts.push({ label: src, code: fs.readFileSync(f, "utf8") }); }
      else if (m[2].trim()) scripts.push({ label: page + " (inline)", code: m[2] });
    }
    pages++;
    for (const p of analyze(scripts)) {
      total++;
      console.log(`${page}: ${p.script}:${p.line} memakai '${p.name}' saat load, padahal baru didefinisikan di ${p.declaredIn}` +
        `\n    jalur: ${p.via.join(" -> ")}${p.inFile ? `  (di ${p.inFile})` : ""}`);
    }
  }
  console.log(total ? `\n${total} masalah urutan muat.` : `\nOK — urutan muat aman di ${pages} halaman.`);
  process.exit(total ? 1 : 0);
}
