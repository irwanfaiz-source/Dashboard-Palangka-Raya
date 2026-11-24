// Tes KARAKTERISASI askAgent() (Odyssey): menjalankan 54 skenario di jsdom (fetch & UI dipalsukan) dan
// membandingkan SEMUA yang teramati — system prompt, body request ke proxy AI, urutan panggilan fungsi luar,
// riwayat chat akhir, dan error — dengan "golden" yang direkam dari askAgent() ASLI (satu fungsi ±930 baris)
// sebelum dipecah. Menjaga refactor askAgent tidak mengubah perilaku.
//
// Jalankan:  cd tools && npm install && cd .. && node tools/tests/ask-agent.test.mjs [root-proyek]
//   --update   rekam ulang golden (HANYA setelah perubahan prompt/perilaku yang disengaja dan sudah kamu tinjau!)
//   ONLY=teks  jalankan skenario yang namanya mengandung teks itu
// Butuh auth-guard.js di root proyek (ada di repo; BUKAN bagian dari zip refactor).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runScenario } from "./lib/ask-harness.mjs";
import { SCENARIOS } from "./lib/ask-scenarios.mjs";

const args = process.argv.slice(2);
const update = args.includes("--update");
const ROOT = args.find((a) => !a.startsWith("--")) ? path.resolve(args.find((a) => !a.startsWith("--"))) : fileURLToPath(new URL("../../", import.meta.url));
const GOLDEN = fileURLToPath(new URL("./fixtures/ask-agent.golden.json", import.meta.url));
if (!fs.existsSync(path.join(ROOT, "auth-guard.js"))) { console.error("auth-guard.js tidak ada di " + ROOT); process.exit(2); }

const only = process.env.ONLY;
const out = {};
for (const sc of SCENARIOS) { if (only && !sc.name.includes(only)) continue; out[sc.name] = await runScenario(ROOT, sc); }

if (update) {
  if (only) { console.error("--update tidak boleh dengan ONLY (golden akan terpotong)"); process.exit(2); }
  fs.writeFileSync(GOLDEN, JSON.stringify(out));
  console.log(`golden direkam ulang: ${Object.keys(out).length} skenario`);
  process.exit(0);
}
const gold = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
let bad = 0;
for (const [name, cur] of Object.entries(out)) {
  const g = gold[name];
  if (!g) { console.log("TAK ADA DI GOLDEN:", name); bad++; continue; }
  if (JSON.stringify(g) === JSON.stringify(cur)) continue;
  bad++;
  console.log("\nBEDA:", name);
  for (const k of ["result", "finalHistory", "loadErrors", "fetches", "trace"]) {
    const x = JSON.stringify(g[k]), y = JSON.stringify(cur[k]);
    if (x !== y) { let i = 0; while (x[i] === y[i]) i++; console.log(`  bagian '${k}' beda di posisi ${i}:\n    golden: …${x.slice(Math.max(0, i - 60), i + 140)}\n    kini  : …${y.slice(Math.max(0, i - 60), i + 140)}`); }
  }
}
console.log(bad ? `\n${bad} skenario BEDA dari golden` : `\n${Object.keys(out).length} skenario identik dengan golden`);
process.exit(bad ? 1 : 0);
