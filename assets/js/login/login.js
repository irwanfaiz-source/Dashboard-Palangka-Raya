
  const FB_CONFIG_KEY = "firebase_config_pr_dc";
  const params = new URLSearchParams(window.location.search);
  const redirectTarget = params.get("redirect") || "rest-time.html";

  // Config default udah ditanam di sini (sama kayak di rest-time.html), jadi auto-connect
  // begitu link dibuka, gak perlu paste manual lagi di tiap device.
  const DEFAULT_FB_CONFIG = {
    apiKey: "AIzaSyBn1bdUH8uRc_hFq0h4liWd8vLDOLYZFMA",
    authDomain: "dashboardpalangkarayadc.firebaseapp.com",
    databaseURL: "https://dashboardpalangkarayadc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dashboardpalangkarayadc",
    storageBucket: "dashboardpalangkarayadc.firebasestorage.app",
    messagingSenderId: "796202356400",
    appId: "1:796202356400:web:d5360896e59dcbba66f575",
    measurementId: "G-EMLP5TSZ13"
  };

  let isChangingPassword = false;

  function initFirebaseAndShowLogin(config) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
    } catch (e) {
      // Config tertanam sudah pasti valid; kalau error di sini berarti ada masalah lain
      // (mis. project di-nonaktifkan), bukan sesuatu yang bisa diperbaiki dari sisi user.
      document.getElementById("loginError").innerText = "❌ Gagal konek ke database: " + e.message;
      return;
    }

    // SESSION persistence: sesi login cuma nempel di tab ini aja, begitu tab/window
    // ditutup, sesi ilang otomatis (gak kayak default LOCAL yang tetep login walau ditutup).
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(function (e) {
      console.error("Gagal set persistence:", e);
    });

    // Kalau ternyata udah login (session masih aktif), langsung redirect
    firebase.auth().onAuthStateChanged(function (user) {
      // isChangingPassword: pas proses ganti password kita sengaja login sebentar buat
      // verifikasi password lama, jangan sampai kebawa redirect ke dashboard.
      if (user && !isChangingPassword) window.location.href = redirectTarget;
    });
  }

  // SECURITY FIX: dulu ada opsi "Ganti config Firebase" yang bisa dipencet SIAPAPUN
  // (bahkan sebelum login) buat ngarahin seluruh app ke project Firebase lain — bisa
  // dipakai buat phishing kredensial (form login keliatan sama persis, tapi ngirim
  // email/password ke Firebase project punya orang lain). Sekarang config SELALU pakai
  // DEFAULT_FB_CONFIG yang ditanam di kode ini, gak bisa diubah dari tampilan sama
  // sekali. Kalau memang perlu pindah project Firebase, ubah DEFAULT_FB_CONFIG di kode
  // ini terus redeploy.
  if (localStorage.getItem(FB_CONFIG_KEY)) localStorage.removeItem(FB_CONFIG_KEY); // bersihin sisa config lama
  initFirebaseAndShowLogin(DEFAULT_FB_CONFIG);

  // Login pake Enter key
  document.getElementById("loginPassword").addEventListener("keydown", function (e) {
    if (e.key === "Enter") doLogin();
  });

  document.getElementById("changeNewPassword2").addEventListener("keydown", function (e) {
    if (e.key === "Enter") doChangePassword();
  });

  function doLogin() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errEl = document.getElementById("loginError");
    errEl.innerText = "";
    if (!email || !password) {
      errEl.innerText = "Isi email & password dulu bro.";
      return;
    }
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(function () {
        window.location.href = redirectTarget;
      })
      .catch(function (err) {
        if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
          errEl.innerText = "❌ Email atau password salah.";
        } else if (err.code === "auth/too-many-requests") {
          errEl.innerText = "❌ Kebanyakan percobaan gagal, coba lagi beberapa menit lagi.";
        } else {
          errEl.innerText = "❌ Gagal login: " + err.message;
        }
      });
  }

  // ==== LUPA PASSWORD ====
  // Pindah dari step login ke step forgot-password (dan sebaliknya), pesan
  // error/sukses dibersihin tiap kali pindah biar gak nyangkut dari percobaan
  // sebelumnya.
  function showForgotStep() {
    document.getElementById("loginError").innerText = "";
    document.getElementById("loginSuccess").innerText = "";
    document.getElementById("loginStep").classList.add("hidden");
    document.getElementById("changeStep").classList.add("hidden");
    document.getElementById("forgotStep").classList.remove("hidden");
    document.getElementById("forgotError").innerText = "";
    document.getElementById("forgotSuccess").innerText = "";
    // Kalau user udah sempet ngetik email di form login, bawa otomatis ke sini
    // biar gak perlu ngetik ulang.
    const loginEmailVal = document.getElementById("loginEmail").value.trim();
    if (loginEmailVal) document.getElementById("forgotEmail").value = loginEmailVal;
    document.getElementById("forgotEmail").focus();
  }

  function showLoginStep() {
    document.getElementById("forgotError").innerText = "";
    document.getElementById("forgotSuccess").innerText = "";
    document.getElementById("forgotStep").classList.add("hidden");
    document.getElementById("changeStep").classList.add("hidden");
    document.getElementById("changeError").innerText = "";
    document.getElementById("loginStep").classList.remove("hidden");
  }

  // ==== GANTI PASSWORD (pakai password lama) ====
  // Verifikasi identitas = login pakai email + password lama, baru updatePassword().
  // Lupa password lama tetap lewat "Lupa password?" (link ke email).
  function showChangeStep() {
    document.getElementById("loginError").innerText = "";
    document.getElementById("loginSuccess").innerText = "";
    document.getElementById("changeError").innerText = "";
    document.getElementById("loginStep").classList.add("hidden");
    document.getElementById("forgotStep").classList.add("hidden");
    document.getElementById("changeStep").classList.remove("hidden");
    const loginEmailVal = document.getElementById("loginEmail").value.trim();
    if (loginEmailVal) document.getElementById("changeEmail").value = loginEmailVal;
    document.getElementById(loginEmailVal ? "changeOldPassword" : "changeEmail").focus();
  }

  function doChangePassword() {
    const email = document.getElementById("changeEmail").value.trim();
    const oldPw = document.getElementById("changeOldPassword").value;
    const newPw = document.getElementById("changeNewPassword").value;
    const newPw2 = document.getElementById("changeNewPassword2").value;
    const errEl = document.getElementById("changeError");
    const btn = document.getElementById("changeSubmitBtn");
    errEl.innerText = "";

    if (!email || !oldPw || !newPw || !newPw2) { errEl.innerText = "Isi semua kolom dulu bro."; return; }
    if (newPw.length < 6) { errEl.innerText = "❌ Password baru minimal 6 karakter."; return; }
    if (newPw !== newPw2) { errEl.innerText = "❌ Password baru dan ulangannya gak sama."; return; }
    if (newPw === oldPw) { errEl.innerText = "❌ Password baru harus beda dari password lama."; return; }

    btn.disabled = true;
    btn.innerText = "MEMPROSES...";
    isChangingPassword = true;

    firebase.auth().signInWithEmailAndPassword(email, oldPw)
      .then(function (cred) { return cred.user.updatePassword(newPw); })
      .then(function () { return firebase.auth().signOut(); })
      .then(function () {
        ["changeOldPassword", "changeNewPassword", "changeNewPassword2"].forEach(function (id) {
          document.getElementById(id).value = "";
        });
        document.getElementById("loginPassword").value = "";
        document.getElementById("loginEmail").value = email;
        showLoginStep();
        document.getElementById("loginSuccess").innerText = "✅ Password berhasil diganti. Silakan login pakai password baru.";
      })
      .catch(function (err) {
        if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
          errEl.innerText = "❌ Email atau password lama salah.";
        } else if (err.code === "auth/weak-password") {
          errEl.innerText = "❌ Password baru terlalu lemah, pakai minimal 6 karakter.";
        } else if (err.code === "auth/too-many-requests") {
          errEl.innerText = "❌ Kebanyakan percobaan gagal, coba lagi beberapa menit lagi.";
        } else {
          errEl.innerText = "❌ Gagal ganti password: " + err.message;
        }
        // kalau sempet ke-login tapi updatePassword gagal, keluarin lagi
        if (firebase.auth().currentUser) firebase.auth().signOut();
      })
      .finally(function () {
        isChangingPassword = false;
        btn.disabled = false;
        btn.innerText = "GANTI PASSWORD";
      });
  }

  // Kirim email reset password lewat Firebase Authentication. Firebase SENGAJA
  // gak ngasih tau kalau emailnya emang gak terdaftar (demi keamanan, biar orang
  // luar gak bisa nebak-nebak email mana yang punya akun), makanya pesan
  // suksesnya generic aja ("kalau emailnya kedaftar, link udah dikirim").
  function doForgotPassword() {
    const email = document.getElementById("forgotEmail").value.trim();
    const errEl = document.getElementById("forgotError");
    const okEl = document.getElementById("forgotSuccess");
    const btn = document.getElementById("forgotSubmitBtn");
    errEl.innerText = "";
    okEl.innerText = "";

    if (!email) {
      errEl.innerText = "Isi email dulu bro.";
      return;
    }

    btn.disabled = true;
    btn.innerText = "MENGIRIM...";

    firebase.auth().sendPasswordResetEmail(email)
      .then(function () {
        okEl.innerText = "✅ Kalau email itu kedaftar, link reset password udah dikirim. Cek inbox (atau folder spam) ya.";
      })
      .catch(function (err) {
        if (err.code === "auth/invalid-email") {
          errEl.innerText = "❌ Format email gak valid.";
        } else if (err.code === "auth/too-many-requests") {
          errEl.innerText = "❌ Kebanyakan percobaan, coba lagi beberapa menit lagi.";
        } else {
          // auth/user-not-found sengaja gak dibedain pesannya dari yang sukses,
          // biar gak bocorin email mana yang beneran terdaftar.
          okEl.innerText = "✅ Kalau email itu kedaftar, link reset password udah dikirim. Cek inbox (atau folder spam) ya.";
        }
      })
      .finally(function () {
        btn.disabled = false;
        btn.innerText = "KIRIM LINK RESET";
      });
  }
