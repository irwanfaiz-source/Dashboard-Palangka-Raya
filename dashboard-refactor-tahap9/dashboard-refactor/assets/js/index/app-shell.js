
  // ==== APP-SHELL TAB SWITCHER ====
  // Kedua iframe di-load sekali aja pas halaman ini kebuka (barengan sama auth check di
  // atas). Pindah tab abis itu cuma toggle display, jadi 0% reload & data yang lagi
  // ke-sync real-time di background (mis. import operator) gak ilang pas pindah tab.

  // Catatan: "odyssey" SENGAJA gak dimasukin ke TABS biasa ini. Iframe-nya
  // sekarang hidup permanen di dalam #odysseyPopupBody (lihat markup), bukan
  // di dalam #frames kayak tab-tab lain, jadi dia butuh perlakuan render yang
  // beda (lihat setOdysseyMode di bawah) — tapi tombolnya (tabBtnOdyssey) dan
  // src lazy-load-nya tetep dicek bareng tab lain di listener authReady.
  var TABS = {
    "rest-time": { iframe: "iframeRestTime", btn: "tabBtnRestTime" },
    "performance-bagger": { iframe: "iframePerformanceBagger", btn: "tabBtnPerformanceBagger" },
    "inbound": { iframe: "iframeInbound", btn: "tabBtnInbound" },
    "outbound": { iframe: "iframeOutbound", btn: "tabBtnOutbound" },
    "inventory-control": { iframe: "iframeInventoryControl", btn: "tabBtnInventoryControl" }
  };
  var ODYSSEY_TAB = { iframe: "iframeOdyssey", btn: "tabBtnOdyssey" };

  // ==== PEMBATASAN AKSES (dipicu auth-guard.js abis login kevalidasi) ====
  // Tab yang gak diizinkan buat email ybs: tombolnya disembunyiin DAN iframe-nya
  // GAK PERNAH dikasih src sama sekali (jadi gak pernah load/fetch data apapun),
  // bukan cuma disembunyiin doang lewat CSS.
  window.addEventListener("authReady", function (e) {
    var allowedTabs = (e.detail && e.detail.allowedTabs) || Object.keys(TABS);

    Object.keys(TABS).forEach(function (key) {
      var cfg = TABS[key];
      var btn = document.getElementById(cfg.btn);
      var iframe = document.getElementById(cfg.iframe);
      var allowed = allowedTabs.indexOf(key) !== -1;

      btn.style.display = allowed ? "" : "none";
      if (allowed && !iframe.src) iframe.src = iframe.dataset.src;
    });

    // FAB Odyssey (+ tombol tab-nya + lazy-load src-nya) cuma boleh nongol
    // kalau emailnya emang diizinin akses tab "odyssey" (ACCESS_MAP di
    // auth-guard.js) — SAMA PERSIS aturan tab lain, cuma diurus terpisah
    // karena iframe-nya gak tinggal di dalam TABS/#frames.
    odysseyAllowed = allowedTabs.indexOf("odyssey") !== -1;
    var odysseyBtn = document.getElementById(ODYSSEY_TAB.btn);
    var odysseyIframe = document.getElementById(ODYSSEY_TAB.iframe);
    odysseyBtn.style.display = odysseyAllowed ? "" : "none";
    if (odysseyAllowed && !odysseyIframe.src) odysseyIframe.src = odysseyIframe.dataset.src;

    // Default tab: yang pertama diizinkan (biasanya "rest-time" kalau full akses,
    // tapi buat email terbatas ini otomatis loncat ke tab yang emang boleh dia liat).
    var defaultTab = allowedTabs[0];
    if (defaultTab) showTab(defaultTab);
  });

  // Tab yang punya lebih dari 1 submenu di dalam file yang sama (outbound.html:
  // aging/occupancy, inventory-control.html: usage/stock) butuh nunggu iframe-nya
  // selesai load dulu sebelum bisa dikirimin perintah "setSubmenu".
  var tabReady = {};
  var pendingSubmenu = {};
  ["outbound", "inventory-control"].forEach(function (tab) {
    tabReady[tab] = false;
    document.getElementById(TABS[tab].iframe).addEventListener("load", function () {
      tabReady[tab] = true;
      if (pendingSubmenu[tab]) {
        sendSubmenu(tab, pendingSubmenu[tab]);
        pendingSubmenu[tab] = null;
      }
    });
  });

  function sendSubmenu(tab, submenu) {
    document.getElementById(TABS[tab].iframe).contentWindow.postMessage(
      { source: "pkydc", type: "setSubmenu", submenu: submenu }, "*"
    );
  }

  function showTab(tab, submenu) {
    if (tab !== "odyssey" && !TABS[tab]) return;
    if (tab === "odyssey" && !odysseyAllowed) return;

    // Tab-tab "biasa" (yang iframe-nya emang tinggal di dalam #frames):
    // matiin .active semua, nyalain punya yang dipilih. Odyssey DIKELUARIN
    // dari loop ini karena iframe-nya gak ada di dalam #frames lagi.
    Object.keys(TABS).forEach(function (key) {
      var isActive = key === tab;
      document.getElementById(TABS[key].iframe).classList.toggle("active", isActive);
      document.getElementById(TABS[key].btn).classList.toggle("active", isActive);
    });
    document.getElementById(ODYSSEY_TAB.btn).classList.toggle("active", tab === "odyssey");

    // Container Odyssey (popup) di-set ke mode "tab penuh" kalau tab yang
    // dituju emang "odyssey", atau disembunyiin total kalau enggak — TANPA
    // pernah mindah node iframe-nya (lihat setOdysseyMode).
    setOdysseyMode(tab === "odyssey" ? "tab" : "hidden");

    updateOdysseyFabVisibility(tab);

    if (submenu && tabReady.hasOwnProperty(tab)) {
      if (tabReady[tab]) sendSubmenu(tab, submenu);
      else pendingSubmenu[tab] = submenu; // iframe masih loading, kirim pas udah siap
    }

    // Tiap kali tab ini jadi aktif (termasuk balik lagi ke tab yang sama), suruh
    // halamannya nutup semua grup Sidebar Navigasi (Hide) biar user buka manual lagi —
    // gak keinget dari sesi sebelumnya, biar rapi tiap pindah tab.
    var targetIframe = document.getElementById(tab === "odyssey" ? ODYSSEY_TAB.iframe : TABS[tab].iframe);
    if (targetIframe && targetIframe.src) {
      targetIframe.contentWindow.postMessage({ source: "pkydc", type: "collapseSidebarGroups" }, "*");
    }
  }

  // Dengerin permintaan pindah tab dari dalam iframe (klik link sidebar rest-time.html
  // atau outbound.html yang udah di-hijack oleh bridge script di masing-masing halaman)
  window.addEventListener("message", function (e) {
    if (e.origin !== window.location.origin) return; // hanya iframe modul dari origin yang sama
    var data = e.data;
    if (!data || data.source !== "pkydc") return;
    if (data.type === "switchTab") {
      showTab(data.tab, data.submenu);
    }
  });

  // ===== Floating Odyssey Widget =====
  // Prinsip inti (BARU): iframe Odyssey (#iframeOdyssey) TINGGAL DIEM di
  // dalam #odysseyPopupBody dari awal sampai akhir — TIDAK PERNAH di-
  // appendChild ke wadah lain. Yang berubah cuma TAMPILAN wadah luarnya
  // (#odysseyPopup) lewat 3 mode:
  //   - "hidden" → wadah disembunyiin total (display:none)
  //   - "popup"  → wadah jadi kotak chat mengambang di pojok (style lama)
  //   - "tab"    → wadah di-restyle ngisi seluruh area tab (class .tab-mode)
  // Karena node iframe-nya gak pernah pindah/di-reparent, browsing context di
  // dalamnya (chatHistory di memori, listener Firebase, dll di report-agent.html)
  // gak pernah di-reset oleh browser — makanya history chat kejaga terus walau
  // popup dibuka-tutup atau di-switch ke tampilan tab penuh berkali-kali.
  var odysseyAllowed = false; // di-set true di authReady kalau tab "odyssey" diizinin
  var odysseyMode = "hidden"; // "hidden" | "popup" | "tab"

  function updateOdysseyFabVisibility(activeTab) {
    var fabWrap = document.getElementById("odysseyAsk");
    if (!fabWrap) return;
    // FAB disembunyiin kalau: (a) emailnya emang gak diizinin akses Odyssey
    // sama sekali, ATAU (b) user LAGI di tab Odyssey penuh (redundan, chat-nya
    // udah keliatan gede di layar, gak perlu tombol mengambang lagi).
    var shouldShow = odysseyAllowed && activeTab !== "odyssey";
    fabWrap.classList.toggle("odyssey-hidden", !shouldShow);
  }

  function setOdysseyMode(mode) {
    if (mode === odysseyMode) return;
    odysseyMode = mode;
    var popup = document.getElementById("odysseyPopup");
    var fab = document.getElementById("odysseyAsk");
    popup.classList.toggle("show", mode !== "hidden");
    popup.classList.toggle("tab-mode", mode === "tab");
    fab.classList.toggle("is-open", mode === "popup");
  }

  function openOdysseyPopup() {
    if (!odysseyAllowed || odysseyMode === "popup") return;
    setOdysseyMode("popup");
  }
  function closeOdysseyPopup() {
    // Cuma nutup kalau lagi mode "popup" — kalau lagi mode "tab" (tampilan
    // penuh), penutupannya lewat pindah tab (showTab), bukan lewat tombol ✕
    // popup ini.
    if (odysseyMode !== "popup") return;
    setOdysseyMode("hidden");
  }
  function toggleOdysseyPopup() {
    if (odysseyMode === "popup") closeOdysseyPopup(); else openOdysseyPopup();
  }

  document.getElementById("odysseyPopupCloseBtn").addEventListener("click", closeOdysseyPopup);
  document.getElementById("odysseyExpandBtn").addEventListener("click", function () {
    // "Buka tampilan penuh": numpang logic showTab yang udah ada (otomatis
    // switch wadah Odyssey ke mode "tab" & pindahin tab aktif di topnav ke
    // "odyssey").
    showTab("odyssey");
  });
  document.getElementById("odysseyRefreshBtn").addEventListener("click", function () {
    // Tombol "Refresh Data" fisiknya sekarang di title bar popup ini (luar
    // iframe), padahal logic buat narik ulang data trip-nya (loadData())
    // masih hidup di dalam report-agent.html. Jadi klik di sini cuma
    // nge-postMessage ke dalam iframe — report-agent.html yang dengerin
    // pesan ini (lihat listener "pkydc"/"odysseyRefresh" di file itu) dan
    // yang beneran manggil loadData()-nya.
    var iframe = document.getElementById(ODYSSEY_TAB.iframe);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ source: "pkydc", type: "odysseyRefresh" }, "*");
    }
  });

  // ===== Bar "Ask Odyssey" di topnav: klik = buka/tutup popup chat =====
  document.getElementById("odysseyAsk").addEventListener("click", toggleOdysseyPopup);

  // ===== Resize manual panel popup Odyssey lewat handle custom di pojok =====
  // (BUKAN pakai CSS resize:both bawaan browser — itu gagal kepencet karena
  // iframe di dalam popup-body nutupin seluruh kotak sampai ke pojoknya.
  // Handle ini elemen terpisah dengan z-index lebih tinggi dari iframe, jadi
  // klik-tariknya selalu kena duluan sebelum nyentuh iframe di bawahnya.)
  // Popup posisinya fixed pakai right/top (nempel di bawah topnav), jadi pas
  // dibesarin, kotaknya nambah ke arah kiri-bawah — anchor kanan-atasnya
  // tetap diem di tempat. Makanya handle-nya di pojok kiri-bawah.
  (function setupOdysseyPopupResize() {
    var popup = document.getElementById("odysseyPopup");
    var handle = document.getElementById("odysseyResizeHandle");
    if (!popup || !handle) return;
    var resizing = false, startX = 0, startY = 0, startW = 0, startH = 0;

    function pointerXY(e) {
      var p = (e.touches && e.touches[0]) || e;
      return { x: p.clientX, y: p.clientY };
    }
    function onDown(e) {
      resizing = true;
      popup.classList.add("resizing");
      var rect = popup.getBoundingClientRect();
      var p = pointerXY(e);
      startX = p.x; startY = p.y; startW = rect.width; startH = rect.height;
      if (e.cancelable) e.preventDefault();
    }
    function onMove(e) {
      if (!resizing) return;
      if (e.cancelable) e.preventDefault();
      var p = pointerXY(e);
      var dx = p.x - startX, dy = p.y - startY;
      // min-width/min-height/max-width/max-height di CSS otomatis nge-clamp
      // hasilnya walau kita set inline style width/height langsung di sini.
      popup.style.width = (startW - dx) + "px";
      popup.style.height = (startH + dy) + "px";
    }
    function onUp() {
      resizing = false;
      popup.classList.remove("resizing");
    }

    handle.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    handle.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  })();
