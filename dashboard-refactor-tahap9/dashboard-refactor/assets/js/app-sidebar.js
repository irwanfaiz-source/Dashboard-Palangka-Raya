/**
 * assets/js/app-sidebar.js
 * ------------------------------------------------------------------
 * SIDEBAR UTAMA — satu komponen untuk semua modul. Desain & isinya mengikuti
 * sidebar Outbound (yang dulu paling baru); modul lain dulu menyalin markup-nya
 * sendiri-sendiri (±120–170 baris HTML + CSS per modul).
 *
 * Pemakaian: di HTML cukup <nav class="app-sidebar" id="appSidebar"></nav>, lalu
 * assets/js/<modul>/app-sidebar-config.js memanggil:
 *   AppSidebar.mount({ module: 'inbound' });
 * Modul yang punya sub menu sendiri (Outbound, Inventory Control) menambahkan
 *   submenu: [{ tab, icon, onclick, labelKey | (i18n + text), id?, active? }]
 * yang menggantikan link modul itu di grupnya.
 *
 * - Menambah/mengganti nama modul: ubah daftar MODULES di bawah (1 tempat).
 * - Terjemahan 4 bahasa (id/en/ja/zh) ada di TEXT di bawah, disalin dari kamus
 *   Outbound; komponen ini TIDAK bergantung pada kamus modul. Label ikut berganti
 *   saat bahasa diganti (lewat I18n.subscribe). Label sub menu milik modul (mis.
 *   inv.tab.*) tetap diterjemahkan kamus modul lewat atribut data-i18n.
 * - Link ke modul lain diteruskan ke app-shell lewat AppShellBridge
 *   (AppSidebar.bridgeLinks()). Semua grup awalnya tertutup.
 *
 * Fungsi global yang dipertahankan karena dipakai atribut onclick & kode modul:
 * toggleAppSidebar, toggleSidebarGroup, setSidebarGroupCollapsed, collapseAllSidebarGroups.
 */
var AppSidebar = (function () {
  'use strict';

  // Sumber teks: kamus Outbound, KECUALI link.inbound (kunci sidebar.link.inboundTracking di kamus Inbound:
  // modul ini sekarang "Inbound Tracking", bukan lagi "LH Tracking & Forecast MP").
  var TEXT = {
    "group.productivity": { id: "Productivity", en: "Productivity", ja: "生産性", zh: "生产力" },
    "group.inbound": { id: "Inbound", en: "Inbound", ja: "インバウンド", zh: "入库" },
    "group.outbound": { id: "Outbound Monitoring", en: "Outbound Monitoring", ja: "アウトバウンドモニタリング", zh: "出库监控" },
    "group.inventory": { id: "Inventory Control", en: "Inventory Control", ja: "在庫管理", zh: "库存管理" },
    "link.restTime": { id: "Rest Time Monitoring", en: "Rest Time Monitoring", ja: "休憩時間モニタリング", zh: "休息时间监控" },
    "link.perfBagger": { id: "Performance Bagger", en: "Performance Bagger", ja: "パフォーマンス（バガー）", zh: "打包员绩效" },
    "link.inbound": { id: "Tracking", en: "Tracking", ja: "トラッキング", zh: "跟踪" },
    "link.outbound": { id: "Aging, Occupancy & Packer Backlog", en: "Aging, Occupancy & Packer Backlog", ja: "滞留時間・稼働率＆梱包滞留", zh: "滞留时间、占用率与打包积压" },
    "link.inventory": { id: "Inventory Control", en: "Inventory Control", ja: "在庫管理", zh: "库存管理" },
    "lang.label": { id: "Bahasa", en: "Language", ja: "言語", zh: "语言" },
    "feedback.title": { id: "Saran & Masukan", en: "Feedback & Suggestions", ja: "ご意見・ご要望", zh: "建议与反馈" },
    "logout.btn": { id: "Logout", en: "Logout", ja: "ログアウト", zh: "退出登录" }
  };

  var LANG_OPTIONS = [
    ['id', '🇮🇩 Bahasa Indonesia'], ['en', '🇬🇧 English'], ['ja', '🇯🇵 日本語'], ['zh', '🇨🇳 中文']
  ];

  // Kunci = id tab di app-shell = nama file modul.
  var MODULES = {
    'rest-time':          { page: 'rest-time.html',          navId: 'navToRestTime',         icon: '⏳',  group: 'Productivity',       linkKey: 'link.restTime',   subtitleKey: 'link.restTime' },
    'performance-bagger': { page: 'performance-bagger.html', navId: 'navToPerformanceBagger', icon: '🏆', group: 'Productivity',       linkKey: 'link.perfBagger', subtitleKey: 'link.perfBagger' },
    'inbound':            { page: 'inbound.html',            navId: 'navToInbound',          icon: '🚚', group: 'Inbound',            linkKey: 'link.inbound',    subtitleKey: 'group.inbound' },
    'outbound':           { page: 'outbound.html',           navId: 'navToOutbound',         icon: '📦', group: 'OutboundMonitoring', linkKey: 'link.outbound',   subtitleKey: 'group.outbound', bridgeSubmenu: 'aging' },
    'inventory-control':  { page: 'inventory-control.html',  navId: 'navToInventoryControl', icon: '🗃️', group: 'SOC',                linkKey: 'link.inventory',  subtitleKey: 'group.inventory' }
  };
  var GROUPS = [
    { id: 'Productivity',       labelKey: 'group.productivity', modules: ['rest-time', 'performance-bagger'] },
    { id: 'Inbound',            labelKey: 'group.inbound',      modules: ['inbound'] },
    { id: 'OutboundMonitoring', labelKey: 'group.outbound',     modules: ['outbound'] },
    { id: 'SOC',                labelKey: 'group.inventory',    modules: ['inventory-control'] }
  ];

  var currentModule = null;

  function lang() {
    try { return typeof I18n !== 'undefined' ? I18n.lang() : 'id'; } catch (e) { return 'id'; }
  }
  function text(key) {
    var e = TEXT[key];
    if (!e) return key;
    var l = lang();
    return e[l] != null ? e[l] : e.id;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function label(key) { return '<span data-sb-text="' + key + '">' + esc(text(key)) + '</span>'; }

  function submenuItemHtml(it) {
    var cls = 'app-sidebar-link' + (it.active ? ' active' : '');
    var inner = it.labelKey ? label(it.labelKey) : '<span data-i18n="' + esc(it.i18n) + '">' + esc(it.text) + '</span>';
    return '<button class="' + cls + '"' + (it.id ? ' id="' + esc(it.id) + '"' : '') + ' data-tab="' + esc(it.tab) + '" onclick="' + esc(it.onclick) + '">' +
      it.icon + ' ' + inner + '</button>';
  }

  function linkHtml(id, isCurrent) {
    var m = MODULES[id];
    return '<a href="' + m.page + '"' + (isCurrent ? '' : ' id="' + m.navId + '"') + ' class="app-sidebar-link' + (isCurrent ? ' active' : '') + '">' +
      m.icon + ' ' + label(m.linkKey) + '</a>';
  }

  function groupHtml(g, opts) {
    var items = g.modules.map(function (id) {
      if (id === opts.module && opts.submenu && opts.submenu.length) return opts.submenu.map(submenuItemHtml).join('');
      return linkHtml(id, id === opts.module);
    }).join('');
    return '<div class="app-sidebar-group-label collapsible collapsed" data-group="' + g.id + '" onclick="toggleSidebarGroup(\'' + g.id + '\')">' +
      label(g.labelKey) + '<span class="chevron">▾</span></div>' +
      '<div class="app-sidebar-group collapsed" data-group-body="' + g.id + '">' + items + '</div>';
  }

  function html(opts) {
    var me = MODULES[opts.module];
    return '<div>' +
      '<div class="app-sidebar-header"><div class="app-sidebar-header-inner">' +
      '<div class="app-sidebar-icon-box">' + me.icon + '</div>' +
      '<div class="app-sidebar-title-group"><span class="app-sidebar-title">Palangka Raya DC</span>' +
      '<span class="app-sidebar-subtitle" data-sb-text="' + me.subtitleKey + '">' + esc(text(me.subtitleKey)) + '</span></div></div>' +
      '<button onclick="toggleAppSidebar()">✕</button></div>' +
      '<div class="app-sidebar-body">' + GROUPS.map(function (g) { return groupHtml(g, opts); }).join('') + '</div></div>' +
      '<div class="app-sidebar-footer"><div class="app-sidebar-lang">' +
      '<label for="appLangSelect">🌐 ' + label('lang.label') + '</label>' +
      '<select id="appLangSelect" onchange="setAppLanguage(this.value)">' +
      LANG_OPTIONS.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<button class="app-sidebar-feedback-btn" onclick="openFeedbackBoard()">💬 ' + label('feedback.title') + '</button>' +
      '<button onclick="logoutApp()">🚪 ' + label('logout.btn') + '</button></div>';
  }

  // Ganti teks semua label milik komponen (tidak menyentuh label sub menu milik modul).
  function refreshLabels() {
    Array.prototype.forEach.call(document.querySelectorAll('#appSidebar [data-sb-text]'), function (el) {
      el.textContent = text(el.getAttribute('data-sb-text'));
    });
  }

  function mount(opts) {
    opts = opts || {};
    if (!MODULES[opts.module]) throw new Error('AppSidebar.mount: modul tidak dikenal: ' + opts.module);
    currentModule = opts.module;
    var nav = document.getElementById('appSidebar');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'app-sidebar';
      nav.id = 'appSidebar';
      document.body.insertBefore(nav, document.body.firstChild);
    }
    if (!document.getElementById('appSidebarBackdrop')) {
      var bd = document.createElement('div');
      bd.className = 'sidebar-backdrop';
      bd.id = 'appSidebarBackdrop';
      bd.setAttribute('onclick', 'toggleAppSidebar()');
      nav.parentNode.insertBefore(bd, nav);
    }
    nav.innerHTML = html(opts);
    var sel = document.getElementById('appLangSelect');
    if (sel) sel.value = lang();
    return nav;
  }

  // Daftar [idElemen, tab, submenu?] untuk AppShellBridge: link ke modul LAIN.
  function bridgeLinks() {
    return Object.keys(MODULES).filter(function (id) { return id !== currentModule; }).map(function (id) {
      var m = MODULES[id];
      return m.bridgeSubmenu ? [m.navId, id, m.bridgeSubmenu] : [m.navId, id];
    });
  }

  try { if (typeof I18n !== 'undefined' && I18n.subscribe) I18n.subscribe(refreshLabels); } catch (e) { /* tanpa engine i18n: teks tetap Indonesia */ }

  return { mount: mount, bridgeLinks: bridgeLinks, refreshLabels: refreshLabels, modules: function () { return MODULES; }, groups: function () { return GROUPS; }, text: text, current: function () { return currentModule; } };
})();

// ---- Fungsi global (dipakai atribut onclick & kode modul — jangan diganti namanya) ----

function toggleAppSidebar() {
  document.getElementById('appSidebar').classList.toggle('open');
  document.getElementById('appSidebarBackdrop').classList.toggle('open');
}

function toggleSidebarGroup(group) {
  const label = document.querySelector('.app-sidebar-group-label[data-group="' + group + '"]');
  const body = document.querySelector('.app-sidebar-group[data-group-body="' + group + '"]');
  if (!label || !body) return;
  const collapsed = label.classList.toggle('collapsed');
  body.classList.toggle('collapsed', collapsed);
}

function setSidebarGroupCollapsed(group, collapsed) {
  const label = document.querySelector('.app-sidebar-group-label[data-group="' + group + '"]');
  const body = document.querySelector('.app-sidebar-group[data-group-body="' + group + '"]');
  if (!label || !body) return;
  label.classList.toggle('collapsed', collapsed);
  body.classList.toggle('collapsed', collapsed);
}

function collapseAllSidebarGroups() {
  AppSidebar.groups().forEach(function (g) { setSidebarGroupCollapsed(g.id, true); });
}
