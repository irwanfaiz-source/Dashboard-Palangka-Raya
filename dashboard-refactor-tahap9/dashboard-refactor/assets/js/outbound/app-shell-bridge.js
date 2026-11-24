/**
 * assets/js/outbound/app-shell-bridge.js
 * Link sidebar yang diteruskan ke app-shell (index.html) diturunkan dari AppSidebar (assets/js/app-sidebar.js).
 * Logika bersama ada di assets/js/app-shell-bridge.js.
 */

AppShellBridge.init({
  links: AppSidebar.bridgeLinks(),
  // Shell nyuruh pindah submenu
  onMessage: function (data) {
    if (data.type === 'setSubmenu' && data.submenu) switchSubmenu(data.submenu);
  }
});
