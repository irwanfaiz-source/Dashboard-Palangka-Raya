/**
 * assets/js/inventory-control/app-sidebar-config.js
 * Memasang sidebar utama (assets/js/app-sidebar.js) untuk modul ini.
 */
// Sub menu Inventory Control (switchInvSubmenu ada di layout-and-submenu.js). Label sub menu
// diterjemahkan kamus modul ini (kunci inv.tab.*).
AppSidebar.mount({
  module: 'inventory-control',
  submenu: [
    { tab: 'usage',       icon: '📝', i18n: 'inv.tab.usage',       text: 'Log Activity Usage', onclick: "switchInvSubmenu('usage')" },
    { tab: 'dashboard',   icon: '📊', i18n: 'inv.tab.dashboard',   text: 'Highlight Usage',    onclick: "switchInvSubmenu('dashboard')" },
    { tab: 'stock',       icon: '🗄️', i18n: 'inv.tab.stock',       text: 'Stock',              onclick: "switchInvSubmenu('stock')" },
    { tab: 'auditLog',    icon: '📜', i18n: 'inv.tab.auditLog',    text: 'Audit Log',          onclick: "switchInvSubmenu('auditLog')" },
    { tab: 'assetMaster', icon: '🏷️', i18n: 'inv.tab.assetMaster', text: 'Master Nama Asset',  onclick: "switchInvSubmenu('assetMaster')" }
  ]
});
