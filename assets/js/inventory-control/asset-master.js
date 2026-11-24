/**
 * assets/js/inventory-control/asset-master.js — Master Nama Asset (tabel, modal, seed, hapus)
 * Bagian 6/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= MASTER NAMA ASSET =================
  // Daftar baku nama asset (cabang Firebase inventoryControl/{facility}/assetMaster).
  // Stock & Import Excel cuma boleh pakai nama dari daftar ini → gak ada salah ketik / input dobel.
  const DEFAULT_ASSET_MASTER = [
    'Barcode Label - AWB (100 x 100)',
    'Barcode Label - TO (50 x 100)',
    'Bubble Wrap',
    'Cable Ties - Biru (4,8 x 25 mm)',
    'Cable Ties - Oranye (4,8 x 25 mm)',
    'Cable Ties - Hitam (4,8 x 25 mm)',
    'Cable Ties - Pink (4,8 x 25 mm)',
    'Cable Ties - Merah (4,8 x 25 mm)',
    'Lakban Floor Marking - Biru',
    'Lakban Floor Marking - Hijau',
    'Lakban Floor Marking - Merah',
    'Lakban Floor Marking - Kuning',
    'Lakban - Bening Besar',
    'Lakban - Coklat',
    'Lakban - Fragile',
    'Plastik Sampah - Hitam Cap Tulip'
  ];

  function getAssetMasterData() { return assetMasterByFacility[currentFacility] || {}; }

  function findMasterByName(name) {
    const norm = normalizeAssetName(name);
    if (!norm) return null;
    const data = getAssetMasterData();
    const id = Object.keys(data).find(function (k) { return normalizeAssetName(data[k].name) === norm; });
    return id ? Object.assign({ _key: id }, data[id]) : null;
  }

  function masterSortedNames() {
    const data = getAssetMasterData();
    return Object.keys(data).map(function (k) { return data[k].name; }).filter(Boolean)
      .sort(function (a, b) { return a.localeCompare(b); });
  }
  function masterSampleName(i) { return masterSortedNames()[i] || 'Nama dari Master'; }

  // Hitung berapa entry Stock yang pakai nama tertentu (>1 = dobel)
  function countStockByNormName() {
    const stock = getStockData();
    const out = {};
    Object.keys(stock).forEach(function (k) {
      const n = normalizeAssetName(stock[k].name);
      if (n) out[n] = (out[n] || 0) + 1;
    });
    return out;
  }

  // Isi dropdown "Nama Asset" di modal Tambah/Edit Stock dari Master.
  // extraLegacyName: nama lama di Stock yang belum ada di Master (biar tetap bisa diedit).
  function populateAssetNameSelect(extraLegacyName) {
    const sel = document.getElementById('assetNameInput');
    if (!sel) return;
    enhanceAssetCombo(sel);
    const prev = sel.value;
    const names = masterSortedNames();
    let html = '<option value="">' + escapeHtml(t('inv.master.pickName')) + '</option>';
    names.forEach(function (n) { html += '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>'; });
    if (extraLegacyName && !findMasterByName(extraLegacyName)) {
      html += '<option value="' + escapeHtml(extraLegacyName) + '">' + escapeHtml(t('inv.master.legacyOpt', { name: extraLegacyName })) + '</option>';
    }
    sel.innerHTML = html;
    if (prev) sel.value = prev;
    if (sel._syncCombo) sel._syncCombo();
  }

  function renderAssetMasterTable() {
    const tbody = document.getElementById('assetMasterBody');
    if (!tbody) return;
    const canEdit = !!window.__authCanDelete;
    const data = getAssetMasterData();
    const ids = Object.keys(data);

    document.getElementById('btnAddMaster').style.display = canEdit ? '' : 'none';
    document.getElementById('btnSeedMaster').style.display = (canEdit && ids.length === 0) ? '' : 'none';
    document.getElementById('assetMasterReadonlyNote').style.display = canEdit ? 'none' : 'block';

    const q = (document.getElementById('assetMasterSearch').value || '').toLowerCase().split(/\s+/).filter(Boolean);
    const stockCounts = countStockByNormName();

    ids.sort(function (a, b) { return (data[a].name || '').localeCompare(data[b].name || ''); });
    const shown = ids.filter(function (id) {
      const low = ((data[id].name || '') + ' ' + (data[id].category || '')).toLowerCase();
      return q.every(function (tk) { return low.indexOf(tk) !== -1; });
    });

    if (!shown.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">' + t('inv.master.emptyTable') + '</td></tr>';
    } else {
      let html = '';
      shown.forEach(function (id, i) {
        const m = data[id];
        const cnt = stockCounts[normalizeAssetName(m.name)] || 0;
        const stockCell = cnt === 0 ? t('inv.master.stockNo')
          : (cnt === 1 ? t('inv.master.stockYes') : '<b>' + t('inv.master.stockDup', { n: cnt }) + '</b>');
        html += '<tr><td>' + (i + 1) + '</td><td><b>' + escapeHtml(m.name || '-') + '</b></td><td>' + escapeHtml(m.category || '-') +
          '</td><td>' + escapeHtml(m.unit || '-') + '</td><td>' + stockCell + '</td><td>' +
          (canEdit
            ? '<button class="btn-edit-sm" onclick="openAssetMasterModal(\'' + id + '\')">✏️ ' + t('inv.action.save').replace(/.*/, 'Edit') + '</button> ' +
              '<button class="btn-danger-sm" onclick="deleteAssetMaster(\'' + id + '\')">🗑️</button>'
            : '-') +
          '</td></tr>';
      });
      tbody.innerHTML = html;
    }

    // Nama di Stock yang belum masuk Master (data lama) → bisa langsung ditambahin sekali klik
    const box = document.getElementById('assetMasterLegacyBox');
    const stock = getStockData();
    const seen = {}; const legacy = [];
    Object.keys(stock).forEach(function (k) {
      const n = normalizeAssetName(stock[k].name);
      if (n && !seen[n] && !findMasterByName(stock[k].name)) { seen[n] = true; legacy.push(stock[k].name); }
    });
    if (canEdit && legacy.length) {
      let h = '<div style="font-weight:700; margin-bottom:6px;">' + t('inv.master.legacyTitle', { n: legacy.length }) + '</div><div style="display:flex; flex-wrap:wrap; gap:6px;">';
      legacy.sort().forEach(function (n) {
        h += '<button class="btn-edit-sm" data-name="' + escapeHtml(n) + '" onclick="addMasterFromStockName(this.getAttribute(\'data-name\'))">➕ ' + escapeHtml(n) + '</button>';
      });
      box.innerHTML = h + '</div>';
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
      box.innerHTML = '';
    }
  }

  function openAssetMasterModal(id) {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditStock'), 'err'); return; }
    const data = getAssetMasterData();
    document.getElementById('assetMasterModalMsg').innerText = '';
    document.getElementById('assetMasterModalId').value = id || '';
    if (id && data[id]) {
      document.getElementById('assetMasterModalTitle').innerText = '✏️ ' + t('inv.master.modalEdit');
      document.getElementById('assetMasterNameInput').value = data[id].name || '';
      document.getElementById('assetMasterCategoryInput').value = data[id].category || '';
      document.getElementById('assetMasterUnitInput').value = data[id].unit || '';
    } else {
      document.getElementById('assetMasterModalTitle').innerText = '🏷️ ' + t('inv.master.modalAdd');
      document.getElementById('assetMasterNameInput').value = '';
      document.getElementById('assetMasterCategoryInput').value = '';
      document.getElementById('assetMasterUnitInput').value = '';
    }
    document.getElementById('assetMasterModalBackdrop').classList.add('open');
    setTimeout(function () { document.getElementById('assetMasterNameInput').focus(); }, 50);
  }

  function closeAssetMasterModal() {
    document.getElementById('assetMasterModalBackdrop').classList.remove('open');
  }

  window.__masterSaving = false;
  function saveAssetMaster() {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditStock'), 'err'); return; }
    const msgEl = document.getElementById('assetMasterModalMsg');
    const id = document.getElementById('assetMasterModalId').value;
    const name = cleanAssetName(document.getElementById('assetMasterNameInput').value);
    const category = document.getElementById('assetMasterCategoryInput').value.trim();
    const unit = document.getElementById('assetMasterUnitInput').value.trim();
    if (!name) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.assetNameRequired'); return; }

    const data = getAssetMasterData();
    const norm = normalizeAssetName(name);
    const dupId = Object.keys(data).find(function (k) { return k !== id && normalizeAssetName(data[k].name) === norm; });
    if (dupId) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.masterDuplicate', { name: data[dupId].name }); return; }

    // Ganti nama cuma boleh kalau belum kepakai di Stock (riwayat usage nyimpen nama asset)
    const old = id ? data[id] : null;
    if (old && normalizeAssetName(old.name) !== norm && (countStockByNormName()[normalizeAssetName(old.name)] || 0) > 0) {
      msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.masterInUseRename', { name: old.name }); return;
    }

    if (window.__masterSaving) return;
    window.__masterSaving = true;

    const root = FB_ROOT + '/' + currentFacility + '/assetMaster';
    const ref = id ? fbDb.ref(root + '/' + id) : fbDb.ref(root).push();
    const payload = {
      name: name, category: category, unit: unit,
      updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-',
      createdAt: (old && old.createdAt) || Date.now(),
      createdBy: (old && old.createdBy) || window.__authUserEmail || '-'
    };
    ref.set(payload).then(function () {
      window.__masterSaving = false;
      logAudit('Master Asset', id ? 'update' : 'create', name, [category, unit].filter(Boolean).join(' · ') || '-');
      closeAssetMasterModal();
      showToast(t('inv.toast.masterSaved'), 'ok');
    }).catch(function (e) {
      window.__masterSaving = false;
      msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.savePrefix') + e.message;
    });
  }

  function deleteAssetMaster(id) {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessDelete'), 'err'); return; }
    const m = getAssetMasterData()[id];
    if (!m) return;
    if ((countStockByNormName()[normalizeAssetName(m.name)] || 0) > 0) {
      showToast(t('inv.err.masterInUseDelete', { name: m.name }), 'err', 6000); return;
    }
    showConfirmModal(t('inv.confirm.masterDelete', { name: m.name }), function () {
      fbDb.ref(FB_ROOT + '/' + currentFacility + '/assetMaster/' + id).remove().then(function () {
        logAudit('Master Asset', 'delete', m.name, '-');
        showToast(t('inv.toast.masterDeleted'), 'ok');
      }).catch(function (e) { showToast(t('inv.err.savePrefix') + e.message, 'err'); });
    });
  }

  // Tambah banyak nama sekaligus dari daftar awal (yang udah ada dilewatin)
  function seedAssetMaster() {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditStock'), 'err'); return; }
    const todo = DEFAULT_ASSET_MASTER.filter(function (n) { return !findMasterByName(n); });
    if (!todo.length) { showToast(t('inv.toast.masterNothingToSeed'), 'ok'); return; }
    showConfirmModal(t('inv.confirm.masterSeed', { count: todo.length }), function () {
      const root = FB_ROOT + '/' + currentFacility;
      const updates = {};
      todo.forEach(function (n) {
        const key = fbDb.ref(root + '/assetMaster').push().key;
        updates['/assetMaster/' + key] = {
          name: n, category: 'Consumable', unit: '',
          createdAt: Date.now(), createdBy: window.__authUserEmail || '-',
          updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-'
        };
      });
      fbDb.ref(root).update(updates).then(function () {
        logAudit('Master Asset', 'create', todo.length + ' nama asset', 'Daftar awal');
        showToast(t('inv.toast.masterSeeded', { count: todo.length }), 'ok');
      }).catch(function (e) { showToast(t('inv.err.savePrefix') + e.message, 'err'); });
    });
  }

  // Satu klik: masukin nama dari Stock (data lama) ke Master, bawa kategori & unit-nya
  function addMasterFromStockName(name) {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditStock'), 'err'); return; }
    if (findMasterByName(name)) return;
    const stock = getStockData();
    const k = Object.keys(stock).find(function (x) { return normalizeAssetName(stock[x].name) === normalizeAssetName(name); });
    const src = k ? stock[k] : {};
    const root = FB_ROOT + '/' + currentFacility + '/assetMaster';
    fbDb.ref(root).push().set({
      name: cleanAssetName(name), category: src.category || '', unit: src.unit || '',
      createdAt: Date.now(), createdBy: window.__authUserEmail || '-',
      updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-'
    }).then(function () {
      logAudit('Master Asset', 'create', name, 'Dari data Stock');
      showToast(t('inv.toast.masterSaved'), 'ok');
    }).catch(function (e) { showToast(t('inv.err.savePrefix') + e.message, 'err'); });
  }

  // Pilih nama di modal Tambah Stock → kategori & unit ke-isi otomatis dari Master (cuma buat asset baru)
  document.getElementById('assetNameInput').addEventListener('change', function () {
    if (document.getElementById('assetModalId').value) return;
    const m = findMasterByName(this.value);
    if (!m) return;
    if (m.category) document.getElementById('assetCategoryInput').value = m.category;
    if (m.unit) document.getElementById('assetUnitInput').value = m.unit;
  });

  function deleteAsset(id) {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessDelete'), 'err'); return; }
    const assetName = (getStockData()[id] || {}).name || id;
    showConfirmModal(t('inv.confirm.deleteAssetFromStockText', { name: assetName, facility: currentFacility }), function () {
      fbDb.ref(FB_ROOT + '/' + currentFacility + '/stock/' + id).remove().then(function () {
        logAudit('Stock', 'delete', assetName, t('inv.audit.assetDeletedStock'));
      });
    }, t('inv.confirm.yesDelete'));
  }

