

  // Bikin tabel di tab Stock / Audit Log / Master Nama Asset memanjang sampai bawah layar
  function fitTableToBottom() {
    const panel = document.querySelector('.inv-panel.active.fit-bottom');
    document.body.classList.toggle('fit-page', !!panel);
    document.querySelectorAll('.inv-panel.fit-bottom .table-wrapper').forEach(function (w) { w.style.removeProperty('--fit-h'); });
    if (!panel) return;
    const wrap = panel.querySelector('.table-wrapper');
    if (!wrap) return;
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    const h = Math.max(240, window.innerHeight - top - 16);
    wrap.style.setProperty('--fit-h', h + 'px');
  }
  window.addEventListener('resize', fitTableToBottom);
  window.addEventListener('load', fitTableToBottom);
  (function () {
    const b = document.getElementById('lowStockBanner');
    if (b && window.ResizeObserver) new ResizeObserver(function () { requestAnimationFrame(fitTableToBottom); }).observe(b);
  })();

  function switchInvSubmenu(tab) {
    currentInvSubmenu = tab;

    ['usage', 'dashboard', 'assetMaster', 'stock', 'auditLog'].forEach(function (key) {
      document.getElementById('invPanel' + capitalize(key)).classList.toggle('active', key === tab);
    });
    document.querySelectorAll('.inv-tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    document.querySelectorAll('.app-sidebar-link[data-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });

    document.getElementById('appSidebar').classList.remove('open');
    document.getElementById('appSidebarBackdrop').classList.remove('open');

    renderForCurrentFacility();
    fitTableToBottom();
    if (tab === 'dashboard' && dailyUsageChart) dailyUsageChart.resize();
    if (tab === 'dashboard' && monthlyTrendChart) monthlyTrendChart.resize();
  }

  // Render ulang ketiga Sub Menu (Log Activity / Highlight / Stock) pakai data
  // Facility yang lagi aktif. Dipanggil tiap pindah Facility/Sub Menu, dan tiap
  // ada data baru masuk dari Firebase buat Facility yang lagi aktif.
  function renderForCurrentFacility() {
    updateUsageFormVisibility();
    populateAssetSelect();
    populateAssetNameSelect();
    renderAssetMasterTable();
    renderStockTable();
    renderUsageDashboard();
    renderAssetItNcaTable();
    renderAuditLogTable();
    renderLowStockBanner();
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

