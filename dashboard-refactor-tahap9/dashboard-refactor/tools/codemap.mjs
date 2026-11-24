// Bikin docs/CODE-MAP.md: daftar section & fungsi top-level tiap file JS.
// Jalankan dari root project:  node tools/codemap.mjs
// (tanpa dependency; deteksi fungsi pakai pola indentasi, jadi hasilnya perkiraan)
import fs from "fs";
import path from "path";

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
}
const files = walk("assets/js").filter((f) => f.endsWith(".js")).sort();
const secRe = /^\s*(?:\/\/|\/\*)\s*[=\-*#]{3,}\s*(.+?)\s*(?:[=\-*#]{3,})?\s*(?:\*\/)?\s*$/;
const fnRe = /^ {0,2}(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/;

let md = `# CODE MAP\n\n_Dibuat otomatis oleh \`node tools/codemap.mjs\`. Jangan diedit manual._\n\n` +
  `Dipakai buat nyari "fungsi X ada di file apa, baris berapa" tanpa scroll ribuan baris. ` +
  `Deteksi fungsi berdasarkan indentasi, jadi fungsi di dalam IIFE bisa ikut/ketinggalan.\n`;
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  const sections = [{ title: "(awal file)", line: 1, fns: [] }];
  lines.forEach((l, i) => {
    const s = l.match(secRe);
    if (s && !/^\s*\/\/\s*$/.test(l) && s[1].length > 3 && /[A-Za-z]/.test(s[1])) { sections.push({ title: s[1], line: i + 1, fns: [] }); return; }
    const m = l.match(fnRe);
    if (m) sections[sections.length - 1].fns.push(`${m[1]}:${i + 1}`);
  });
  md += `\n## ${f.replace(/\\/g, "/")}  _(${lines.length} baris)_\n`;
  for (const s of sections) {
    if (!s.fns.length && s.title === "(awal file)") continue;
    md += `\n**${s.title}** — baris ${s.line}\n`;
    if (s.fns.length) md += s.fns.map((x) => `\`${x}\``).join(", ") + "\n";
  }
}
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/CODE-MAP.md", md);
console.log(`docs/CODE-MAP.md dibuat (${files.length} file JS)`);
