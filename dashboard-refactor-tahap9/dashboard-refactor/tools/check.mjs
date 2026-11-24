// Pengecek struktur sebelum deploy.  Jalankan dari root project:  node tools/check.mjs
// Tanpa dependency. Exit code 1 kalau ada masalah.
import fs from "fs";
import path from "path";
import vm from "vm";

const problems = [];
const warns = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (e.name === "node_modules" || e.name === "netlify" ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);

const htmls = fs.readdirSync(".").filter((f) => f.endsWith(".html"));
const jsFiles = fs.existsSync("assets/js") ? walk("assets/js").filter((f) => f.endsWith(".js")) : [];

// 1) semua file yang dirujuk HTML harus ada
for (const h of htmls) {
  const html = fs.readFileSync(h, "utf8");
  for (const m of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
    if (!fs.existsSync(m[1])) problems.push(`${h}: merujuk ${m[1]} tapi file-nya gak ada`);
  }
  // 2) jangan balik jadi monolit: inline script/style gede
  for (const m of html.matchAll(/<(script|style)([^>]*)>([\s\S]*?)<\/\1>/g)) {
    if (/src=|type=/.test(m[2])) continue;
    const n = m[3].split("\n").length;
    if (n > 40) warns.push(`${h}: <${m[1]}> inline ${n} baris — pindahin ke assets/${m[1] === "script" ? "js" : "css"}/`);
  }
}

// 3) sintaks semua JS
for (const f of jsFiles) {
  try { new vm.Script(fs.readFileSync(f, "utf8"), { filename: f }); }
  catch (e) { problems.push(`${f}: syntax error — ${e.message}`); }
}

// 4) fungsi di common.js gak boleh didefinisikan ulang di file halaman
if (fs.existsSync("assets/js/common.js")) {
  const common = fs.readFileSync("assets/js/common.js", "utf8");
  const names = [...common.matchAll(/^function\s+([A-Za-z0-9_$]+)\s*\(/gm)].map((m) => m[1]);
  for (const f of jsFiles.filter((x) => !x.endsWith("common.js"))) {
    const code = fs.readFileSync(f, "utf8");
    for (const n of names) if (new RegExp(`^ {0,2}(?:async\\s+)?function\\s+${n}\\s*\\(`, "m").test(code)) problems.push(`${f}: mendefinisikan ulang ${n}() yang sudah ada di common.js`);
  }
  // 5) halaman yang manggil fungsi common harus memuat common.js
  for (const h of htmls) {
    const html = fs.readFileSync(h, "utf8");
    const own = [...html.matchAll(/src="(assets\/js\/[^"]+)"/g)].map((m) => m[1]);
    const used = own.some((f) => fs.existsSync(f) && names.some((n) => new RegExp(`\\b${n}\\(`).test(fs.readFileSync(f, "utf8"))));
    if (used && !own.includes("assets/js/common.js")) problems.push(`${h}: pakai fungsi common.js tapi gak memuat assets/js/common.js`);
  }
}

// 6) handler di HTML (onclick="foo()") harus nunjuk ke fungsi yang beneran ada
{
  const SKIP = new Set(["if", "for", "while", "switch", "function", "return", "typeof", "event", "this", "window", "document", "alert", "confirm", "prompt",
    "setTimeout", "setInterval", "parseInt", "parseFloat", "String", "Number", "Boolean", "Array", "Object", "Math", "JSON", "Date", "isNaN", "console", "localStorage", "sessionStorage", "encodeURIComponent", "decodeURIComponent", "catch", "new"]);
  const defined = new Set();
  const sources = [...jsFiles, ...(fs.existsSync("auth-guard.js") ? ["auth-guard.js"] : [])].map((f) => fs.readFileSync(f, "utf8"));
  for (const h of htmls) for (const m of fs.readFileSync(h, "utf8").matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) sources.push(m[1]);
  for (const code of sources) {
    for (const m of code.matchAll(/function\s+([A-Za-z0-9_$]+)\s*\(/g)) defined.add(m[1]);
    for (const m of code.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_$]+)/g)) defined.add(m[1]);
    for (const m of code.matchAll(/window\.([A-Za-z0-9_$]+)\s*=/g)) defined.add(m[1]);
  }
  for (const h of htmls) {
    const html = fs.readFileSync(h, "utf8");
    const missing = new Set();
    for (const a of html.matchAll(/\son[a-z]+\s*=\s*"([^"]*)"/g)) {
      for (const c of a[1].matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
        if (!SKIP.has(c[1]) && !defined.has(c[1])) missing.add(c[1]);
      }
    }
    for (const n of missing) problems.push(`${h}: handler memanggil ${n}() tapi fungsinya gak ditemukan di script manapun`);
  }
}

warns.forEach((w) => console.log("PERINGATAN:", w));
problems.forEach((p) => console.log("MASALAH   :", p));
console.log(problems.length ? `\n${problems.length} masalah.` : `\nOK — ${htmls.length} halaman, ${jsFiles.length} file JS.`);
process.exit(problems.length ? 1 : 0);
