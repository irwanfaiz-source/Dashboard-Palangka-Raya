/**
 * assets/js/report-agent/init.js — Mulai sync Firebase setelah login tervalidasi + muat data awal
 * Bagian 20/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// Sama kayak inbound.html: baru mulai sync Firebase SETELAH status login kevalidasi.
// Begitu status login berubah (mis. auth-guard.js baru selesai validasi setelah
// halaman ke-render), langsung auto-reload data dari live Firebase.
if (window.firebase && firebase.auth){
  try{
    firebase.auth().onAuthStateChanged(function(user){
      const wasReady = firebaseReady;
      firebaseReady = !!user;
      if (firebaseReady && !wasReady){
        loadData().then(maybeShowDailyBriefing); // briefing nyusul begitu data live-nya kelar dimuat
        refreshSessionsList(); // baru bisa fetch riwayat begitu uid-nya kevalidasi
      }
    });
  }catch(e){ console.warn("Firebase auth belum siap:", e.message); }
}

(async function init(){
  await loadData();
  addMessage("agent", "Halo, ada yang bisa saya bantu?");
  addQuickReplies();
  maybeShowDailyBriefing(); // kalau pas init() ini status login udah kevalidasi duluan, briefing langsung nyusul
})();
