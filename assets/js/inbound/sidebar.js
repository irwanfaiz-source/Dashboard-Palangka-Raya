
  // ESC buat nutup sidebar (ikutin pola tombol Esc di modul lain)
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    const sidebar = document.getElementById('appSidebar');
    if (sidebar && sidebar.classList.contains('open')) toggleAppSidebar();
  });

