/**
 * assets/js/report-agent/live-trips-fetch.js — Data mock & ambil trip Inbound live dari Firebase
 * Bagian 2/20 dari report-agent (dulu satu file main.js). Dimuat berurutan oleh report-agent.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// ===== Mock data (dipakai kalau live toggle mati / firebase belum siap) =====
function generateMockData(dateStr){
  const base = dateStr || new Date().toISOString().slice(0,10);
  function iso(h,m){ return base + "T" + String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0") + ":00"; }
  return [
    { tripNum:"LH-2201", routeName:"Banjarmasin - Palangka Raya", vendorName:"PT Trans Kalimantan", driver:"Sujono", vehicleType:"Fuso", vehiclePlate:"DA 8812 XZ", qtyParcelVal:640, stdOrigin:iso(0,0), staDest:iso(6,30), atdOrigin:iso(0,10), ataDest:iso(5,20) },
    { tripNum:"LH-2202", routeName:"Sampit - Palangka Raya", vendorName:"CV Borneo Cargo", driver:"Herman", vehicleType:"CDD", vehiclePlate:"DA 4471 QA", qtyParcelVal:410, stdOrigin:iso(1,0), staDest:iso(7,30), atdOrigin:iso(1,20), ataDest:iso(8,5) },
    { tripNum:"LH-2203", routeName:"Kuala Kapuas - Palangka Raya", vendorName:"PT Trans Kalimantan", driver:"Andi", vehicleType:"Fuso", vehiclePlate:"DA 5510 LP", qtyParcelVal:290, stdOrigin:iso(2,0), staDest:iso(8,0), atdOrigin:iso(2,15), ataDest:iso(8,10) },
    { tripNum:"LH-2204", routeName:"Pangkalan Bun - Palangka Raya", vendorName:"CV Borneo Cargo", driver:"Rudi", vehicleType:"Fuso", vehiclePlate:"DA 3390 WK", qtyParcelVal:520, stdOrigin:iso(3,0), staDest:iso(9,30), atdOrigin:iso(3,30), ataDest:null },
    { tripNum:"LH-2205", routeName:"Banjarmasin - Palangka Raya", vendorName:"PT Trans Kalimantan", driver:"Yanto", vehicleType:"CDD", vehiclePlate:"DA 7701 YD", qtyParcelVal:355, stdOrigin:iso(4,0), staDest:iso(10,30), atdOrigin:iso(4,5), ataDest:iso(9,50) }
  ];
}

// ===== Firebase live fetch =====
function fetchLiveTrips(){
  return new Promise((resolve, reject) => {
    if (!window.firebase || !firebase.apps || !firebase.apps.length){
      reject(new Error("Firebase belum ke-init (auth-guard.js gak ketemu / belum login)"));
      return;
    }
    if (!firebase.auth().currentUser){
      reject(new Error("Belum login — buka file ini lewat app shell / login dulu"));
      return;
    }
    const db = firebase.database();
    db.ref(LH_PATH).once("value")
      .then(snap => {
        const val = snap.val() || {};
        resolve(Object.keys(val).map(k => val[k]));
      })
      .catch(reject);
  });
}

