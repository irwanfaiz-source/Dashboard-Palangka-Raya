
// Indikator titik hijau di header: nyala kalau sudah ada file/aksi import (teks #pbFileName berubah dari default)
(function () {
  var el = document.getElementById('pbFileName');
  var dot = document.getElementById('pbImportDot');
  if (!el || !dot) return;
  function sync() {
    var txt = (el.textContent || '').trim();
    var idle = 'Belum ada import';
    try { if (typeof t === 'function') idle = t('pb.header.noImport') || idle; } catch (e) {}
    dot.classList.toggle('on', txt !== '' && txt !== idle && txt !== 'Belum ada import');
    el.title = txt;
  }
  new MutationObserver(sync).observe(el, { childList: true, characterData: true, subtree: true });
  sync();
})();
