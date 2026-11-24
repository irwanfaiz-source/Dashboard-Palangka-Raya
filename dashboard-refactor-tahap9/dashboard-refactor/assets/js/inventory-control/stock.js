/**
 * assets/js/inventory-control/stock.js — Tabel Stock, modal Tambah/Edit, auto-fill Min Stock, simpan asset
 * Bagian 5/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= STOCK TABLE (SUBMENU 2) =================
  function renderStockTable() {
    const tbody = document.getElementById('stockBody');
    const stockData = getStockData();
    const canEdit = !!window.__authCanDelete; // dipakai bareng sama hak admin (nambah/edit/hapus Asset)
    document.getElementById('btnAddAsset').style.display = canEdit ? '' : 'none';
    document.getElementById('btnImportStock').style.display = canEdit ? '' : 'none';
    document.getElementById('btnBulkTemplate').style.display = canEdit ? '' : 'none';
    document.getElementById('stockReadonlyNote').style.display = canEdit ? 'none' : 'block';

    const ids = Object.keys(stockData);
    if (ids.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">' + t('inv.stock.emptyFacility', { facility: currentFacility }) + ' ' + (canEdit ? t('inv.msg.clickToStart') : t('inv.msg.contactAdmin')) + '</td></tr>';
      return;
    }

    ids.sort(function (a, b) {
      return (stockData[a].name || '').localeCompare(stockData[b].name || '');
    });

    let html = '';
    ids.forEach(function (id) {
      const a = stockData[id];
      const qty = Number(a.qty) || 0;
      const minStock = Number(a.minStock) || 0;
      const isLow = minStock > 0 && qty <= minStock;
      html += '<tr class="' + (isLow ? 'low-stock' : '') + '">';
      html += '<td style="text-align:left;">' + escapeHtml(a.name || '-') + (isLow ? '<span class="badge-lowstock">Menipis</span>' : '') + '</td>';
      html += '<td>' + escapeHtml(a.category || '-') + '</td>';
      html += '<td>' + escapeHtml(a.unit || '-') + '</td>';
      html += '<td><b>' + qty + '</b></td>';
      html += '<td>' + minStock + '</td>';
      html += '<td>' + escapeHtml(a.note || '-') + '</td>';
      html += '<td>' + (a.updatedAt ? formatDateTimeShort(new Date(a.updatedAt)) + '<br><small>' + escapeHtml(a.updatedBy || '-') + '</small>' : '-') + '</td>';
      html += '<td>';
      html += '<button class="btn-edit-sm" onclick="openItemHistoryModal(\'' + id + '\')">🕘 ' + t('inv.btn.history') + '</button> ';
      if (canEdit) {
        html += '<button class="btn-edit-sm" onclick="openAssetModal(\'' + id + '\')">✏️ Edit</button> ';
        html += '<button class="btn-danger-sm" onclick="deleteAsset(\'' + id + '\')">🗑️</button>';
      }
      html += '</td></tr>';
    });
    tbody.innerHTML = html;
  }

  function openAssetModal(id) {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditStock'), 'err'); return; }
    // Asset baru wajib pilih dari Master — kalau Master masih kosong, arahin dulu ke tab Master
    if (!id && !Object.keys(getAssetMasterData()).length) {
      showToast(t('inv.err.masterEmpty'), 'err', 6000);
      switchInvSubmenu('assetMaster');
      return;
    }
    document.getElementById('assetModalMsg').innerText = '';
    document.getElementById('assetModalId').value = id || '';
    minStockTouched = false; // reset auto-fill tiap kali modal dibuka
    const stockData = getStockData();
    if (id && stockData[id]) {
      const a = stockData[id];
      document.getElementById('assetModalTitle').innerText = '✏️ Edit Asset';
      populateAssetNameSelect(a.name);
      document.getElementById('assetNameInput').value = a.name || '';
      if (document.getElementById('assetNameInput')._syncCombo) document.getElementById('assetNameInput')._syncCombo();
      document.getElementById('assetCategoryInput').value = a.category || '';
      document.getElementById('assetUnitInput').value = a.unit || '';
      document.getElementById('assetQtyInput').value = a.qty != null ? a.qty : '';
      document.getElementById('assetMinStockInput').value = a.minStock != null ? a.minStock : '';
      document.getElementById('assetNoteInput').value = a.note || '';
      // Kalau minStock yang lagi kesimpen BEDA dari hasil hitungan 35% Qty, anggap
      // sebelumnya udah pernah di-override manual → jangan auto-timpa pas Qty diubah lagi.
      minStockTouched = (a.qty != null && a.minStock != null && Number(a.minStock) !== calcSuggestedMinStock(Number(a.qty)));
    } else {
      document.getElementById('assetModalTitle').innerText = '➕ Tambah Asset Baru';
      populateAssetNameSelect();
      document.getElementById('assetNameInput').value = '';
      if (document.getElementById('assetNameInput')._syncCombo) document.getElementById('assetNameInput')._syncCombo();
      document.getElementById('assetCategoryInput').value = '';
      document.getElementById('assetUnitInput').value = 'pcs';
      document.getElementById('assetQtyInput').value = '';
      document.getElementById('assetMinStockInput').value = '';
      document.getElementById('assetNoteInput').value = '';
    }
    updateMinStockHint();
    document.getElementById('assetModalBackdrop').classList.add('open');
  }

  function closeAssetModal() {
    document.getElementById('assetModalBackdrop').classList.remove('open');
  }

  // ================= AUTO-FILL MIN STOCK (35% dari Qty) =================
  // Minim  : Qty <35% dari Qty yang diisi saat asset dibuat/di-set → auto Min Stock = 35% Qty
  // Aman   : selama qty aktual masih >35% dari angka itu, status Stock dianggap aman
  let minStockTouched = false; // true kalau user udah ngetik manual di kolom Min Stock

  function calcSuggestedMinStock(qty) {
    if (isNaN(qty) || qty <= 0) return 0;
    return Math.max(1, Math.round(qty * 0.35));
  }

  function updateMinStockHint() {
    const hint = document.getElementById('minStockHint');
    const qty = Number(document.getElementById('assetQtyInput').value);
    if (!qty || isNaN(qty) || qty <= 0) {
      hint.innerText = t('inv.hint.minStock');
      return;
    }
    const suggested = calcSuggestedMinStock(qty);
    hint.innerText = t('inv.hint.minStockSuggested', { suggested: suggested, qty: qty });
  }

  document.getElementById('assetQtyInput').addEventListener('input', function () {
    const qty = Number(this.value);
    if (!minStockTouched) {
      document.getElementById('assetMinStockInput').value = calcSuggestedMinStock(qty);
    }
    updateMinStockHint();
  });

  document.getElementById('assetMinStockInput').addEventListener('input', function () {
    minStockTouched = true; // user override manual, auto-fill berhenti nimpa
  });

  // Normalisasi nama buat deteksi dobel: huruf kecil, spasi berlebih dirapihin
  // Kunci pembanding nama: huruf kecil + buang spasi, strip, underscore & kurung, jadi
  // 'Pink( 4,8' dan 'Pink ( 4,8' dianggap SAMA (deteksi dobel lebih ketat).
  function normalizeAssetName(n) { return String(n || '').toLowerCase().replace(/[\s\-\u2013\u2014_()]+/g, '').trim(); }
  // Rapihin format nama sebelum disimpan (spasi dobel, " - " konsisten, spasi sebelum "(").
  // Sengaja TIDAK Title Case biar satuan kayak "mm", "x", "AWB" nggak rusak.
  function cleanAssetName(n) {
    return String(n || '')
      .replace(/\s+/g, ' ')
      .replace(/\s+[-\u2013\u2014]\s*|\s*[-\u2013\u2014]\s+/g, ' - ')
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)/g, ')')
      .replace(/\s+/g, ' ')
      .trim();
  }
  window.__assetSaving = false;

  function saveAsset() {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditStock'), 'err'); return; }
    const msgEl = document.getElementById('assetModalMsg');
    const id = document.getElementById('assetModalId').value;
    const name = document.getElementById('assetNameInput').value.trim();
    const category = document.getElementById('assetCategoryInput').value.trim();
    const unit = document.getElementById('assetUnitInput').value.trim() || 'pcs';
    const qty = Number(document.getElementById('assetQtyInput').value);
    const minStock = Number(document.getElementById('assetMinStockInput').value) || 0;
    const note = document.getElementById('assetNoteInput').value.trim();

    if (!name) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.assetNameRequired'); return; }
    if (isNaN(qty) || qty < 0) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.qtyInvalid'); return; }

    // Cegah nama asset dobel (baik tambah baru maupun ganti nama jadi nama yang udah ada)
    const stockNow = getStockData();
    const normNew = normalizeAssetName(name);
    const dupId = Object.keys(stockNow).find(function (k) { return k !== id && normalizeAssetName(stockNow[k].name) === normNew; });
    if (dupId) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.assetDuplicate', { name: stockNow[dupId].name }); return; }

    // Nama wajib ada di Master Nama Asset (kecuali edit data lama yang namanya gak diubah)
    const oldNormName = (id && stockNow[id]) ? normalizeAssetName(stockNow[id].name) : null;
    if (!findMasterByName(name) && oldNormName !== normNew) {
      msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.assetNotInMaster', { name: name }); return;
    }

    // Cegah klik Simpan 2x yang bikin 2 data kesimpen
    if (window.__assetSaving) return;
    window.__assetSaving = true;

    const facilityRoot = FB_ROOT + '/' + currentFacility;
    const isNew = !id;
    const oldData = id ? getStockData()[id] : null;

    const payload = {
      name: name, category: category, unit: unit, qty: qty, minStock: minStock, note: note,
      updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-',
      // createdAt/createdBy dipakai buat "Riwayat Pemakaian per Item" (kapan asset ini pertama ditambahin).
      // Kalau edit data lama yang belum punya createdAt, dianggap "ditambahin" pas edit ini biar tetep ada catatannya.
      createdAt: (oldData && oldData.createdAt) || Date.now(),
      createdBy: (oldData && oldData.createdBy) || window.__authUserEmail || '-'
    };

    const ref = id ? fbDb.ref(facilityRoot + '/stock/' + id) : fbDb.ref(facilityRoot + '/stock').push();
    ref.set(payload).then(function () {
      window.__assetSaving = false;
      logAudit('Stock', isNew ? 'create' : 'update', name, t('inv.audit.detail.qtyMinStock', { qty: qty, unit: unit, minStock: minStock }));
      closeAssetModal();
    }).catch(function (e) {
      window.__assetSaving = false;
      msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.savePrefix') + e.message;
    });
  }


