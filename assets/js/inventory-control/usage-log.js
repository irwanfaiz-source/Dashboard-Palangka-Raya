/**
 * assets/js/inventory-control/usage-log.js — Log Activity Usage: input multi-asset, submit, edit, filter riwayat
 * Bagian 11/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= LOG ACTIVITY USAGE (SUBMENU 1) =================
  function buildAssetOptionsHtml() {
    const stockData = getStockData();
    const ids = Object.keys(stockData).sort(function (a, b) {
      return (stockData[a].name || '').localeCompare(stockData[b].name || '');
    });
    let html = '<option value="">-- Pilih Asset --</option>';
    ids.forEach(function (id) {
      const a = stockData[id];
      html += '<option value="' + id + '">' + escapeHtml(a.name || '-') + ' (stock: ' + (Number(a.qty) || 0) + ' ' + escapeHtml(a.unit || '') + ')</option>';
    });
    return { html: html, ids: ids };
  }

  // Isi ulang semua dropdown Asset yang lagi kepasang: baris-baris multi-input
  // di form "Input Penggunaan" (class usage-item-asset) DAN dropdown di modal Edit Log.
  // ===== Dropdown Asset yang bisa dicari (ngetik buat filter, klik buat pilih) =====
  // <select> aslinya tetap dipakai (disembunyiin) biar semua logic lama yang baca .value tetap jalan.
  function enhanceAssetCombo(sel) {
    if (!sel || sel._combo) return;
    sel._combo = true;
    sel.style.display = 'none';
    const wrap = document.createElement('div');
    wrap.className = 'asset-combo';
    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = t('inv.combo.placeholder');
    const list = document.createElement('div');
    list.className = 'asset-combo-list';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(input); wrap.appendChild(list); wrap.appendChild(sel);

    let activeIdx = -1;
    function labelOf() {
      const o = sel.options[sel.selectedIndex];
      return (o && o.value) ? o.textContent : '';
    }
    function items() { return Array.prototype.slice.call(list.querySelectorAll('.asset-combo-item')); }
    function setActive(i) {
      const its = items();
      if (!its.length) { activeIdx = -1; return; }
      activeIdx = (i + its.length) % its.length;
      its.forEach(function (el, n) { el.classList.toggle('active', n === activeIdx); });
      its[activeIdx].scrollIntoView({ block: 'nearest' });
    }
    function render(q) {
      const tokens = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
      let html = '';
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!o.value) return;
        const txt = o.textContent;
        const low = txt.toLowerCase();
        if (tokens.every(function (tk) { return low.indexOf(tk) !== -1; })) {
          const empty = /\(stock:\s*(0|-\d+)\b/i.test(txt);
          html += '<div class="asset-combo-item' + (empty ? ' empty-stock' : '') + '" data-value="' + escapeHtml(o.value) + '">' + escapeHtml(txt) + '</div>';
        }
      });
      list.innerHTML = html || '<div class="asset-combo-none">' + t('inv.combo.noResult') + '</div>';
      activeIdx = -1;
    }
    function open() { wrap.classList.add('open'); }
    function close() { wrap.classList.remove('open'); input.value = labelOf(); }
    function choose(val) {
      sel.value = val;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      input.value = labelOf();
      wrap.classList.remove('open');
    }

    input.addEventListener('focus', function () { input.select(); render(''); open(); });
    input.addEventListener('click', function () { render(''); open(); });
    input.addEventListener('input', function () { render(input.value); open(); setActive(0); });
    input.addEventListener('blur', close);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(); setActive(activeIdx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const its = items();
        if (its[activeIdx >= 0 ? activeIdx : 0]) choose(its[activeIdx >= 0 ? activeIdx : 0].getAttribute('data-value'));
      }
      else if (e.key === 'Escape') { input.blur(); }
    });
    // mousedown (bukan click) + preventDefault biar input gak keburu blur sebelum item kepilih
    list.addEventListener('mousedown', function (e) {
      e.preventDefault();
      const it = e.target.closest('.asset-combo-item');
      if (it) choose(it.getAttribute('data-value'));
    });

    sel._syncCombo = function () { input.value = labelOf(); };
    input.value = labelOf();
  }

  function populateAssetSelect() {
    const built = buildAssetOptionsHtml();
    document.querySelectorAll('.usage-item-asset').forEach(function (sel) {
      const prev = sel.value;
      sel.innerHTML = built.html;
      if (built.ids.indexOf(prev) !== -1) sel.value = prev;
      if (sel._syncCombo) sel._syncCombo();
    });
    const logSel = document.getElementById('logModalAssetSelect');
    if (logSel) {
      enhanceAssetCombo(logSel);
      const prev = logSel.value;
      logSel.innerHTML = built.html;
      if (built.ids.indexOf(prev) !== -1) logSel.value = prev;
      if (logSel._syncCombo) logSel._syncCombo();
    }
  }

  // ================= MULTI-INPUT: baris Asset & Qty di form "Input Penggunaan" =================
  let usageItemRowSeq = 0;

  function usageItemRowHtml(rowId) {
    return '<div class="usage-item-row" data-row-id="' + rowId + '">' +
      '<select class="usage-item-asset">' + buildAssetOptionsHtml().html + '</select>' +
      '<input type="number" class="usage-item-qty" min="1" step="1" placeholder="' + t('inv.th.qty') + '">' +
      '<button type="button" class="btn-danger-sm usage-item-remove" onclick="removeUsageItemRow(\'' + rowId + '\')">✕</button>' +
      '</div>';
  }

  function addUsageItemRow() {
    usageItemRowSeq++;
    const rowId = 'r' + usageItemRowSeq;
    const container = document.getElementById('usageItemsContainer');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = usageItemRowHtml(rowId);
    container.appendChild(wrapper.firstChild);
    enhanceAssetCombo(container.querySelector('.usage-item-row[data-row-id="' + rowId + '"] select.usage-item-asset'));
    updateUsageItemRemoveButtons();
  }

  function removeUsageItemRow(rowId) {
    const row = document.querySelector('.usage-item-row[data-row-id="' + rowId + '"]');
    if (row) row.remove();
    updateUsageItemRemoveButtons();
  }

  // Tombol "✕" cuma muncul kalau barisnya lebih dari 1, biar minimal selalu ada 1 baris.
  function updateUsageItemRemoveButtons() {
    const rows = document.querySelectorAll('.usage-item-row');
    rows.forEach(function (row) {
      const btn = row.querySelector('.usage-item-remove');
      if (btn) btn.style.display = rows.length > 1 ? '' : 'none';
    });
  }

  function initUsageItemRows() {
    const container = document.getElementById('usageItemsContainer');
    container.innerHTML = '';
    usageItemRowSeq = 0;
    addUsageItemRow();
  }

  function submitUsageLog() {
    const msgEl = document.getElementById('usageFormMsg');
    updateUsageFormVisibility(); // jaga-jaga kalau badge Devisi belum sempet ke-refresh pas email login baru kebaca
    const dateStr = document.getElementById('usageDateInput').value || todayStr();
    const devisi = getCurrentUserDevisi();
    const stockData = getStockData();

    // Kumpulin semua baris Asset+Qty yang keisi (multi-input sekaligus).
    const rowEls = Array.prototype.slice.call(document.querySelectorAll('.usage-item-row'));
    const items = [];
    for (let i = 0; i < rowEls.length; i++) {
      const assetId = rowEls[i].querySelector('.usage-item-asset').value;
      const qtyRaw = rowEls[i].querySelector('.usage-item-qty').value;
      if (!assetId && !qtyRaw) continue; // baris kosong dilewati aja
      const qty = Number(qtyRaw);
      if (!assetId || !stockData[assetId]) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.rowSelectAssetFirst', { row: i + 1 }); return; }
      if (!qty || qty <= 0) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.rowQtyMustBePositive', { row: i + 1 }); return; }
      items.push({ assetId: assetId, qty: qty });
    }
    if (!items.length) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.fillAtLeastOneAsset'); return; }

    const overStock = items.filter(function (it) { return it.qty > (Number(stockData[it.assetId].qty) || 0); });
    if (overStock.length) {
      const names = overStock.map(function (it) { return stockData[it.assetId].name; }).join(', ');
      showConfirmModal(t('inv.confirm.qtyExceedsStockText', { names: names }), function () {
        proceedSubmitUsageLog(items, dateStr, devisi, stockData, msgEl);
      }, t('inv.confirm.yesContinue'));
      return;
    }

    proceedSubmitUsageLog(items, dateStr, devisi, stockData, msgEl);
  }

  function proceedSubmitUsageLog(items, dateStr, devisi, stockData, msgEl) {
    const facilityRoot = FB_ROOT + '/' + currentFacility;

    // Proses tiap baris berurutan (bukan paralel) biar transaction pengurangan
    // stock-nya aman & gampang dilacak kalau ada yang gagal di tengah jalan.
    let chain = Promise.resolve();
    items.forEach(function (item) {
      chain = chain.then(function () {
        const asset = stockData[item.assetId];
        const logPayload = {
          assetId: item.assetId, assetName: asset.name || '-', unit: asset.unit || '-',
          qtyUsed: item.qty, workingDate: dateStr, devisi: devisi,
          createdAt: Date.now(), createdBy: window.__authUserEmail || '-'
        };
        const newKey = fbDb.ref(facilityRoot + '/usageLogs').push().key;
        return fbDb.ref(facilityRoot + '/usageLogs/' + newKey).set(logPayload)
          .then(function () {
            return fbDb.ref(facilityRoot + '/stock/' + item.assetId + '/qty').transaction(function (curQty) {
              return (Number(curQty) || 0) - item.qty;
            });
          })
          .then(function () {
            return fbDb.ref(facilityRoot + '/stock/' + item.assetId).update({ updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-' });
          });
      });
    });

    chain.then(function () {
      const itemNames = items.map(function (it) { return stockData[it.assetId].name + ' (' + it.qty + ')'; }).join(', ');
      logAudit('Log Usage', 'create', itemNames, t('inv.audit.detail.dateDivision', { date: dateStr, division: getDevisiLabel(devisi) }));
      msgEl.className = 'form-msg ok'; msgEl.innerText = t('inv.toast.logsSaved', { count: items.length });
      initUsageItemRows();
      populateAssetSelect();
    }).catch(function (e) {
      msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.savePrefix') + e.message;
    });
  }

  function deleteUsageLog(id) {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessDelete'), 'err'); return; }
    const logsData = usageLogsDataByFacility[currentFacility] || {};
    const log = logsData[id];
    if (!log) return;
    const stockData = getStockData();
    const assetStillExists = !!(log.assetId && stockData[log.assetId]);
    const restoreNote = assetStillExists
      ? t('inv.confirm.stockWillBeRestored', { qty: (log.qtyUsed || 0) + ' ' + (log.unit || '') + ' ' + (log.assetName || '-') })
      : t('inv.msg.assetGoneNoRestore', { name: (log.assetName || '-') });
    showConfirmModal(t('inv.confirm.deleteLogPrefix') + restoreNote, function () {
      const facilityRoot = FB_ROOT + '/' + currentFacility;
      const assetId = log.assetId;
      const qty = Number(log.qtyUsed) || 0;

      fbDb.ref(facilityRoot + '/usageLogs/' + id).remove()
        .then(function () {
          logAudit('Log Usage', 'delete', log.assetName || '-', t('inv.audit.detail.qtyDeletedDate', { qty: (log.qtyUsed || 0), unit: (log.unit || ''), date: (log.workingDate || '-') }));
          if (!assetStillExists) return;
          // Auto-restore: kembaliin qty yang tadi dipakai balik ke stock asset-nya.
          return fbDb.ref(facilityRoot + '/stock/' + assetId + '/qty').transaction(function (curQty) {
            return (Number(curQty) || 0) + qty;
          }).then(function () {
            return fbDb.ref(facilityRoot + '/stock/' + assetId).update({ updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-' });
          });
        })
        .catch(function (e) {
          showToast(t('inv.err.savePrefix') + e.message, 'err');
        });
    }, t('inv.confirm.yesDelete'));
  }

  // ================= EDIT LOG (modal) =================
  function openEditLogModal(id) {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditData'), 'err'); return; }
    const logsData = usageLogsDataByFacility[currentFacility] || {};
    const log = logsData[id];
    if (!log) { showToast(t('inv.err.logNotFound'), 'err'); return; }

    document.getElementById('logModalMsg').innerText = '';
    document.getElementById('logModalId').value = id;
    populateAssetSelect();
    const logSel = document.getElementById('logModalAssetSelect');
    if (log.assetId) logSel.value = log.assetId;
    if (logSel._syncCombo) logSel._syncCombo();
    document.getElementById('logModalQtyInput').value = log.qtyUsed != null ? log.qtyUsed : '';
    document.getElementById('logModalDateInput').value = log.workingDate || todayStr();

    const logDevisi = log.devisi || getDevisiForEmail(log.createdBy);
    document.getElementById('logModalDevisiInput').value = logDevisi;

    document.getElementById('logModalBackdrop').classList.add('open');
  }

  function closeLogModal() {
    document.getElementById('logModalBackdrop').classList.remove('open');
  }

  function saveEditLog() {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditData'), 'err'); return; }
    const msgEl = document.getElementById('logModalMsg');
    const id = document.getElementById('logModalId').value;
    const logsData = usageLogsDataByFacility[currentFacility] || {};
    const oldLog = logsData[id];
    if (!oldLog) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.logNotFound'); return; }

    const newAssetId = document.getElementById('logModalAssetSelect').value;
    const newQty = Number(document.getElementById('logModalQtyInput').value);
    const dateStr = document.getElementById('logModalDateInput').value || todayStr();
    const devisi = document.getElementById('logModalDevisiInput').value || 'SOC';

    const stockData = getStockData();
    if (!newAssetId || !stockData[newAssetId]) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.selectAssetFirst'); return; }
    if (!newQty || newQty <= 0) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.qtyMustBePositive'); return; }

    const facilityRoot = FB_ROOT + '/' + currentFacility;
    const oldAssetId = oldLog.assetId;
    const oldQty = Number(oldLog.qtyUsed) || 0;
    const newAsset = stockData[newAssetId];

    const updatedPayload = {
      assetId: newAssetId, assetName: newAsset.name || '-', unit: newAsset.unit || '-',
      qtyUsed: newQty, workingDate: dateStr, devisi: devisi,
      createdAt: oldLog.createdAt || Date.now(), createdBy: oldLog.createdBy || '-',
      updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-'
    };

    // Kembalikan dulu qty lama ke asset lama (kalau assetnya masih ada di Stock),
    // baru potong qty baru dari asset baru. Kalau asset-nya sama, efek bersihnya
    // otomatis cuma selisihnya aja.
    let chain = Promise.resolve();
    if (oldAssetId && stockData[oldAssetId]) {
      chain = chain.then(function () {
        return fbDb.ref(facilityRoot + '/stock/' + oldAssetId + '/qty').transaction(function (curQty) {
          return (Number(curQty) || 0) + oldQty;
        });
      }).then(function () {
        return fbDb.ref(facilityRoot + '/stock/' + oldAssetId).update({ updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-' });
      });
    }

    chain.then(function () {
      return fbDb.ref(facilityRoot + '/stock/' + newAssetId + '/qty').transaction(function (curQty) {
        return (Number(curQty) || 0) - newQty;
      });
    }).then(function () {
      return fbDb.ref(facilityRoot + '/stock/' + newAssetId).update({ updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-' });
    }).then(function () {
      return fbDb.ref(facilityRoot + '/usageLogs/' + id).set(updatedPayload);
    }).then(function () {
      logAudit('Log Usage', 'update', newAsset.name || '-', t('inv.audit.detail.qtyDateChanged', { qty: newQty, date: dateStr }));
      closeLogModal();
    }).catch(function (e) {
      msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.savePrefix') + e.message;
    });
  }

  // ================= SEARCH/FILTER RIWAYAT LOG =================
  let logFilterAssetQuery = '';
  let logFilterStart = '';
  let logFilterEnd = '';

  function applyLogFilter() {
    logFilterAssetQuery = document.getElementById('logFilterAssetInput').value.trim().toLowerCase();
    logFilterStart = document.getElementById('logFilterStartInput').value || '';
    logFilterEnd = document.getElementById('logFilterEndInput').value || '';
    if (logFilterStart && logFilterEnd && logFilterStart > logFilterEnd) {
      showToast(t('inv.err.startDateAfterEnd'), 'err');
      return;
    }
    renderUsageLogTable(getLogsArr(currentFacility));
  }

  function resetLogFilter() {
    document.getElementById('logFilterAssetInput').value = '';
    document.getElementById('logFilterStartInput').value = '';
    document.getElementById('logFilterEndInput').value = '';
    logFilterAssetQuery = ''; logFilterStart = ''; logFilterEnd = '';
    renderUsageLogTable(getLogsArr(currentFacility));
  }

