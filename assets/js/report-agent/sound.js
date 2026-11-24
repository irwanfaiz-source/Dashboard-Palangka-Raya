/**
 * assets/js/report-agent/sound.js — Bunyi blip chat & tombol suara
 * Bagian 12/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// Bikin bunyi "blip" halus pakai oscillator, bukan file audio — biar ringan
// & gak perlu nge-load asset tambahan. "sent" nadanya naik dikit (lebih
// "aktif"), "received" nadanya turun pelan (lebih "lembut"). Volume sengaja
// dijaga kecil (gain rendah) + envelope cepet biar kesannya "halus", gak
// ganggu kayak notifikasi HP.
function ensureAudioCtx(){
  if (!odysseyAudioCtx){
    try{ odysseyAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ odysseyAudioCtx = null; }
  }
  return odysseyAudioCtx;
}
function playChatSound(kind){
  if (!soundEnabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  try{
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    if (kind === "sent"){
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(940, now + 0.07);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.start(now); osc.stop(now + 0.13);
    } else {
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(430, now + 0.15);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.start(now); osc.stop(now + 0.23);
    }
  }catch(e){ /* browser kadang nge-block audio sebelum ada interaksi user — abaikan aja */ }
}
function applySoundToggleIcon(){
  const btn = document.getElementById("soundToggleBtn");
  if (!btn) return;
  btn.textContent = soundEnabled ? "🔊" : "🔇";
  btn.title = soundEnabled ? "Sound efek: nyala (klik buat mute)" : "Sound efek: mute (klik buat nyalain)";
}
document.getElementById("soundToggleBtn").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("odysseySoundEnabled", soundEnabled ? "1" : "0");
  applySoundToggleIcon();
});
applySoundToggleIcon();

