/**
 * assets/js/outbound/app-sidebar-config.js
 * Memasang sidebar utama (assets/js/app-sidebar.js) untuk modul ini.
 */
// Sub menu Outbound menggantikan link modul ini di grupnya (switchSubmenu ada di layout-and-theme.js).
AppSidebar.mount({
  module: 'outbound',
  submenu: [
    { id: 'menuAging', tab: 'aging', icon: '📦', labelKey: 'link.outbound', onclick: "switchSubmenu('aging')", active: true }
  ]
});
