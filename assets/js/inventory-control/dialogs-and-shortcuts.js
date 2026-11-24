/**
 * assets/js/inventory-control/dialogs-and-shortcuts.js — Modal konfirmasi, shortcut ESC / Enter, format tanggal
 * Bagian 14/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // Modal konfirmasi in-app, pengganti confirm() bawaan browser.
  // Dipanggil async: onConfirm cuma jalan kalau user klik "Ya, Lanjut".
  // okLabel opsional buat ganti teks tombol (misal "Ya, Hapus").
  function showConfirmModal(message, onConfirm, okLabel) {
    const backdrop = document.getElementById('confirmModalBackdrop');
    document.getElementById('confirmModalMsg').innerText = message;
    const okBtn = document.getElementById('confirmModalOkBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');
    okBtn.innerText = okLabel || t('inv.confirm.yesContinue');

    // Ganti listener tiap kali dipanggil (biar gak numpuk callback lama)
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    function close() { backdrop.classList.remove('open'); }
    newOkBtn.addEventListener('click', function () { close(); onConfirm(); });
    newCancelBtn.addEventListener('click', close);
    backdrop.classList.add('open');
  }


  // ESC buat nutup popup/modal yang lagi kebuka (prioritas: yang paling "atas" duluan)
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    const confirmBackdrop = document.getElementById('confirmModalBackdrop');
    const itNcaModal = document.getElementById('assetItNcaModalBackdrop');
    const logModal = document.getElementById('logModalBackdrop');
    const assetModal = document.getElementById('assetModalBackdrop');
    const photoLightbox = document.getElementById('photoLightboxBackdrop');
    const qrModal = document.getElementById('qrLabelModalBackdrop');
    const historyModal = document.getElementById('assetHistoryModalBackdrop');
    const itemHistoryModal = document.getElementById('itemHistoryModalBackdrop');
    const sidebar = document.getElementById('appSidebar');
    const fbBoard = document.getElementById('fbBoardBackdrop');

    if (confirmBackdrop && confirmBackdrop.classList.contains('open')) {
      const cancelBtn = document.getElementById('confirmModalCancelBtn');
      if (cancelBtn) cancelBtn.click();
      return;
    }
    if (fbBoard && fbBoard.classList.contains('open')) { closeFeedbackBoard(); return; }
    if (photoLightbox && photoLightbox.classList.contains('open')) { closePhotoLightbox(); return; }
    if (qrModal && qrModal.classList.contains('open')) { closeQrLabelModal(); return; }
    if (historyModal && historyModal.classList.contains('open')) { closeAssetHistoryModal(); return; }
    if (itemHistoryModal && itemHistoryModal.classList.contains('open')) { closeItemHistoryModal(); return; }
    if (itNcaModal && itNcaModal.classList.contains('open')) { closeAssetItNcaModal(); return; }
    if (logModal && logModal.classList.contains('open')) { closeLogModal(); return; }
    if (assetModal && assetModal.classList.contains('open')) { closeAssetModal(); return; }
    if (sidebar && sidebar.classList.contains('open')) { toggleAppSidebar(); return; }
  });

  // ENTER buat langsung Submit/Simpan tanpa harus klik tombol — berlaku di form
  // "Input Penggunaan Asset/Pcs" (Log Activity Usage), dan di modal-modal Simpan
  // (Tambah/Edit Asset Stock, Tambah/Edit Asset IT & NCA, Edit Log). Nggak berlaku
  // di textarea, <select>, tombol, atau input
  // tag-chip (kalau ada) karena Enter di situ udah punya fungsi sendiri (nambah
  // baris baru / nambah tag / pilih dropdown).
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const el = e.target;
    if (!el || !el.tagName) return;
    const tag = el.tagName;
    if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return;
    if (el.type === 'file') return;
    if (el.classList && el.classList.contains('tag-input-field')) return; // input tag-chip (kalau ada) - Enter-nya punya fungsi sendiri

    const confirmBackdrop = document.getElementById('confirmModalBackdrop');
    const itNcaModal = document.getElementById('assetItNcaModalBackdrop');
    const logModal = document.getElementById('logModalBackdrop');
    const assetModal = document.getElementById('assetModalBackdrop');

    if (confirmBackdrop && confirmBackdrop.classList.contains('open')) {
      e.preventDefault();
      const okBtn = document.getElementById('confirmModalOkBtn');
      if (okBtn) okBtn.click();
      return;
    }
    if (itNcaModal && itNcaModal.classList.contains('open')) { e.preventDefault(); saveAssetItNca(); return; }
    if (logModal && logModal.classList.contains('open')) { e.preventDefault(); saveEditLog(); return; }
    if (assetModal && assetModal.classList.contains('open')) { e.preventDefault(); saveAsset(); return; }

    if (el.closest && el.closest('#invPanelUsage')) {
      e.preventDefault();
      const filterIds = ['logFilterAssetInput', 'logFilterStartInput', 'logFilterEndInput'];
      if (filterIds.indexOf(el.id) !== -1) { applyLogFilter(); return; }
      submitUsageLog();
      return;
    }
  });

  function formatDateTimeShort(d) {
    const opts = { day: '2-digit', month: 'short', year: '2-digit' };
    return d.toLocaleDateString('id-ID', opts) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

