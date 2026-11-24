/**
 * assets/js/outbound/layout-and-theme.js — Section & submenu aktif, sidebar, tema gelap, jam
 * Bagian 6/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

function setActiveSection(menuType) {
  currentSubmenu = menuType;
  const isOcc = menuType === 'occupancy';
  const bA = document.getElementById('menuAging');
  const bO = document.getElementById('menuOccupancy');
  if (bA) bA.classList.add('active');
  if (bO) bO.classList.toggle('active', isOcc);
  document.querySelectorAll('#sectionJump [data-jump]').forEach(b => b.classList.toggle('active', b.dataset.jump === menuType));
}

function switchSubmenu(menuType) {
  const main = document.querySelector('main');
  setActiveSection(menuType === 'occupancy' ? 'occupancy' : 'aging');
  document.getElementById('appSidebar').classList.remove('open');
  document.getElementById('appSidebarBackdrop').classList.remove('open');
  if (!main) return;
  if (menuType === 'occupancy') {
    const sec = document.getElementById('occupancySection');
    if (sec) main.scrollTo({ top: Math.max(main.scrollTop + sec.getBoundingClientRect().top - main.getBoundingClientRect().top - 8, 0), behavior: 'smooth' });
  } else {
    main.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

(function () {
  const main = document.querySelector('main');
  if (!main) return;
  let ticking = false;
  main.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      const sec = document.getElementById('occupancySection');
      if (!sec) return;
      const top = sec.getBoundingClientRect().top - main.getBoundingClientRect().top;
      const atBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 4;
      setActiveSection(top <= main.clientHeight * 0.35 || atBottom ? 'occupancy' : 'aging');
    });
  }, { passive: true });
})();

function setThemeMode(mode) {
  currentTheme = mode;
  const htmlEl = document.documentElement;
  const iconEl = document.getElementById('themeToggleIcon');
  const textEl = document.getElementById('themeToggleText');
  const sidebarSelect = document.getElementById('sidebarThemeSelect');

  if (mode === 'dark') {
    htmlEl.classList.add('dark');
    iconEl.className = 'fa-solid fa-sun text-amber-300';
    textEl.innerText = t('ob.header.themeLight');
    if (sidebarSelect) sidebarSelect.value = 'dark';
  } else {
    htmlEl.classList.remove('dark');
    iconEl.className = 'fa-solid fa-moon';
    textEl.innerText = t('ob.header.themeDark');
    if (sidebarSelect) sidebarSelect.value = 'light';
  }
  if (filteredData.length > 0) renderDashboard();
}

function toggleThemeMode() {
  setThemeMode(currentTheme === 'light' ? 'dark' : 'light');
}

function updateClock() {
  const now = new Date();
  const options = { day: '2-digit', month: 'short', year: '2-digit' };
  const dStr = now.toLocaleDateString('id-ID', options);
  const tStr = now.toLocaleTimeString('id-ID', { hour12: false }).replace(/\./g, ':');
  const lc = document.getElementById('liveClock'); if (lc) lc.innerText = `${dStr} | ${tStr}`;
  const lt = document.getElementById('liveTime'); if (lt) lt.innerText = tStr;
  const ld = document.getElementById('liveDate');
  if (ld) {
    const lang = I18n.lang();
    const loc = { id: 'id-ID', en: 'en-GB', ja: 'ja-JP', zh: 'zh-CN' }[lang] || 'id-ID';
    const wd = now.toLocaleDateString(loc, { weekday: 'long' });
    const dt = now.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' });
    ld.innerText = (lang === 'ja' || lang === 'zh') ? `${dt} ${wd}` : `${wd}, ${dt}`;
  }
}
setInterval(updateClock, 1000); updateClock();

