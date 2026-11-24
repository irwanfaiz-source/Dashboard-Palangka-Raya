/**
 * assets/js/rest-time/app-shell-bridge.js
 * Link sidebar yang diteruskan ke app-shell (index.html) diturunkan dari AppSidebar (assets/js/app-sidebar.js).
 * Logika bersama ada di assets/js/app-shell-bridge.js.
 */

AppShellBridge.init({
  links: AppSidebar.bridgeLinks(),
  // Shell ngasih tau tab/modul ini lagi kelihatan atau nggak
  // (shellReportedVisible & handleRestTimeModuleVisibilityChange ada di ui-theme-and-overtime.js)
  onMessage: function (data) {
    if (data.type === 'activeTabChanged' && typeof data.tab === 'string') {
      shellReportedVisible = (data.tab === window.__PAGE_TAB);
      handleRestTimeModuleVisibilityChange();
    }
    if (data.type === 'moduleVisibility' && typeof data.visible === 'boolean') {
      shellReportedVisible = data.visible;
      handleRestTimeModuleVisibilityChange();
    }
  }
});
