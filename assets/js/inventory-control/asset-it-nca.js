/**
 * assets/js/inventory-control/asset-it-nca.js — Database Asset IT & NCA: tabel, modal, foto, riwayat mutasi
 * Bagian 8/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= DATABASE ASSET IT & NCA (SUBMENU 4) =================
  // Beda sama Stock: gak ada Qty/Min Stock, tapi punya Jenis (IT/NCA), No Serial/Inventaris,
  // PIC Pemegang, Lokasi & Status (Aktif/Rusak/Diperbaiki/Non-Aktif). Data-nya kepisah total
  // dari Stock, di cabang Firebase inventoryControl/{facility}/assetItNca.
  function statusBadgeHtml(status) {
    const map = {
      'Aktif': { bg: '#171717', fg: '#ffffff' },
      'Rusak': { bg: '#b91c1c', fg: '#ffffff' },
      'Diperbaiki': { bg: '#b45309', fg: '#ffffff' },
      'Non-Aktif': { bg: '#e5e5e5', fg: '#525252' }
    };
    const c = map[status] || { bg: '#e5e5e5', fg: '#525252' };
    return '<span style="display:inline-block; padding:2px 9px; border-radius:999px; font-size:10.5px; font-weight:700; background:' + c.bg + '; color:' + c.fg + ';">' + escapeHtml(status || '-') + '</span>';
  }

  function renderAssetItNcaTable() {
    if (!document.getElementById('assetItNcaBody')) return; // tab IT & NCA sudah dihapus
    const tbody = document.getElementById('assetItNcaBody');
    const data = getAssetItNcaData();
    const canEdit = !!window.__authCanDelete;
    document.getElementById('btnAddAssetItNca').style.display = canEdit ? '' : 'none';
    document.getElementById('btnImportAssetItNca').style.display = canEdit ? '' : 'none';
    document.getElementById('btnBulkTemplateAssetItNca').style.display = canEdit ? '' : 'none';
    document.getElementById('assetItNcaReadonlyNote').style.display = canEdit ? 'none' : 'block';

    let ids = Object.keys(data);

    // Terapkan filter search (nama/serial/PIC) & filter Jenis kalau lagi aktif
    const q = assetItNcaFilterQuery.trim().toLowerCase();
    if (q) {
      ids = ids.filter(function (id) {
        const a = data[id];
        return (a.name || '').toLowerCase().indexOf(q) !== -1 ||
          (a.serial || '').toLowerCase().indexOf(q) !== -1 ||
          (a.pic || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (assetItNcaFilterJenis) {
      ids = ids.filter(function (id) { return (data[id].jenis || 'IT') === assetItNcaFilterJenis; });
    }

    if (ids.length === 0) {
      const isFiltering = !!(q || assetItNcaFilterJenis);
      tbody.innerHTML = '<tr class="empty-row"><td colspan="11">' +
        (isFiltering ? t('inv.err.noDataMatchFilter') : (t('inv.itnca.emptyFacility', { facility: currentFacility }) + ' ' + (canEdit ? t('inv.msg.clickToStart') : t('inv.msg.contactAdmin')))) +
        '</td></tr>';
      return;
    }

    ids.sort(function (a, b) {
      return (data[a].name || '').localeCompare(data[b].name || '');
    });

    let html = '';
    ids.forEach(function (id) {
      const a = data[id];
      const jenis = a.jenis || 'IT';
      html += '<tr>';
      html += '<td>' + (a.photoData ? ('<img class="asset-photo-thumb" src="' + a.photoData + '" onclick="openPhotoLightbox(\'' + a.photoData + '\', \'' + escapeHtml(a.name || '') + '\')">') : '<span class="asset-photo-empty">-</span>') + '</td>';
      html += '<td style="text-align:left;">' + escapeHtml(a.name || '-') + '</td>';
      html += '<td>' + escapeHtml(jenis) + '</td>';
      html += '<td>' + (jenis === 'NCA' ? '<b>' + (Number(a.qty) || 1) + '</b>' : String(Number(a.qty) || 1)) + '</td>';
      html += '<td>' + escapeHtml(a.serial || '-') + '</td>';
      html += '<td>' + escapeHtml(a.pic || '-') + '</td>';
      html += '<td>' + escapeHtml(a.lokasi || '-') + '</td>';
      html += '<td>' + statusBadgeHtml(a.status || 'Aktif') + '</td>';
      html += '<td style="white-space:normal;">' + escapeHtml(a.note || '-') + '</td>';
      html += '<td>' + (a.updatedAt ? formatDateTimeShort(new Date(a.updatedAt)) + '<br><small>' + escapeHtml(a.updatedBy || '-') + '</small>' : '-') + '</td>';
      html += '<td style="white-space:normal;">';
      html += '<button class="btn-icon-sm" onclick="openAssetHistoryModal(\'' + id + '\')" title="' + t('inv.btn.historyMutation') + '">🕘 ' + t('inv.btn.history') + '</button>';
      if (jenis === 'NCA') {
        html += '<button class="btn-icon-sm" onclick="openQrLabelModal(\'' + id + '\')" title="QR Code / Label">🏷️ QR</button>';
      }
      if (canEdit) {
        html += '<button class="btn-edit-sm" onclick="openAssetItNcaModal(\'' + id + '\')">✏️ Edit</button> ';
        html += '<button class="btn-danger-sm" onclick="deleteAssetItNca(\'' + id + '\')">🗑️</button>';
      }
      html += '</td></tr>';
    });
    tbody.innerHTML = html;
  }

  function applyAssetItNcaFilter() {
    assetItNcaFilterQuery = document.getElementById('assetItNcaFilterInput').value;
    assetItNcaFilterJenis = document.getElementById('assetItNcaJenisFilter').value;
    renderAssetItNcaTable();
  }

  function resetAssetItNcaFilter() {
    document.getElementById('assetItNcaFilterInput').value = '';
    document.getElementById('assetItNcaJenisFilter').value = '';
    assetItNcaFilterQuery = ''; assetItNcaFilterJenis = '';
    renderAssetItNcaTable();
  }

  function openAssetItNcaModal(id) {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditItNca'), 'err'); return; }
    document.getElementById('assetItNcaModalMsg').innerText = '';
    document.getElementById('assetItNcaModalId').value = id || '';
    const data = getAssetItNcaData();
    if (id && data[id]) {
      const a = data[id];
      document.getElementById('assetItNcaModalTitle').innerText = '✏️ Edit Asset IT / NCA';
      document.getElementById('assetItNcaNameInput').value = a.name || '';
      document.getElementById('assetItNcaJenisInput').value = a.jenis || 'IT';
      document.getElementById('assetItNcaQtyInput').value = a.qty || 1;
      document.getElementById('assetItNcaSerialInput').value = a.serial || '';
      document.getElementById('assetItNcaPicInput').value = a.pic || '';
      document.getElementById('assetItNcaLokasiInput').value = a.lokasi || '';
      document.getElementById('assetItNcaStatusInput').value = a.status || 'Aktif';
      document.getElementById('assetItNcaNoteInput').value = a.note || '';
      document.getElementById('assetItNcaPhotoData').value = a.photoData || '';
      showAssetItNcaPhotoPreview(a.photoData || '');
    } else {
      document.getElementById('assetItNcaModalTitle').innerText = '➕ Tambah Asset IT / NCA Baru';
      document.getElementById('assetItNcaNameInput').value = '';
      document.getElementById('assetItNcaJenisInput').value = 'IT';
      document.getElementById('assetItNcaQtyInput').value = 1;
      document.getElementById('assetItNcaSerialInput').value = '';
      document.getElementById('assetItNcaPicInput').value = '';
      document.getElementById('assetItNcaLokasiInput').value = '';
      document.getElementById('assetItNcaStatusInput').value = 'Aktif';
      document.getElementById('assetItNcaNoteInput').value = '';
      document.getElementById('assetItNcaPhotoData').value = '';
      showAssetItNcaPhotoPreview('');
    }
    toggleAssetItNcaJumlahField();
    document.getElementById('assetItNcaPhotoInput').value = '';
    document.getElementById('assetItNcaModalBackdrop').classList.add('open');
  }

  // Field "Jumlah Asset" cuma relevan buat Jenis NCA (asset IT biasanya dicatat
  // satuan per unit via No. Serial, jadi jumlahnya selalu dianggap 1).
  function toggleAssetItNcaJumlahField() {
    const isNca = document.getElementById('assetItNcaJenisInput').value === 'NCA';
    document.getElementById('assetItNcaJumlahFormItem').style.display = isNca ? '' : 'none';
  }

  // ================= FOTO KONDISI ASSET (upload + kompres client-side) =================
  function showAssetItNcaPhotoPreview(dataUrl) {
    const box = document.getElementById('assetItNcaPhotoPreviewBox');
    const img = document.getElementById('assetItNcaPhotoPreviewImg');
    if (dataUrl) { img.src = dataUrl; box.style.display = 'flex'; }
    else { img.src = ''; box.style.display = 'none'; }
  }

  function removeAssetItNcaPhoto() {
    document.getElementById('assetItNcaPhotoData').value = '';
    document.getElementById('assetItNcaPhotoInput').value = '';
    showAssetItNcaPhotoPreview('');
  }

  // Foto dikompres di browser (resize max 480px + JPEG q0.6) sebelum disimpan sebagai
  // base64 ke Firebase Realtime Database, biar ukuran datanya tetep kecil & hemat kuota.
  function handleAssetItNcaPhotoPick(evt) {
    const file = evt.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('File harus berupa gambar.', 'err'); evt.target.value = ''; return; }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const MAX_W = 480;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        document.getElementById('assetItNcaPhotoData').value = dataUrl;
        showAssetItNcaPhotoPreview(dataUrl);
      };
      img.onerror = function () { showToast('Gagal baca gambar.', 'err'); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function openPhotoLightbox(dataUrl, title) {
    if (!dataUrl) return;
    document.getElementById('photoLightboxImg').src = dataUrl;
    document.getElementById('photoLightboxTitle').innerText = '📷 ' + (title || 'Foto Kondisi Asset');
    document.getElementById('photoLightboxBackdrop').classList.add('open');
  }
  function closePhotoLightbox() {
    document.getElementById('photoLightboxBackdrop').classList.remove('open');
  }

  function closeAssetItNcaModal() {
    document.getElementById('assetItNcaModalBackdrop').classList.remove('open');
  }

  function saveAssetItNca() {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessEditItNca'), 'err'); return; }
    const msgEl = document.getElementById('assetItNcaModalMsg');
    const id = document.getElementById('assetItNcaModalId').value;
    const name = document.getElementById('assetItNcaNameInput').value.trim();
    const jenis = document.getElementById('assetItNcaJenisInput').value;
    const qty = jenis === 'NCA' ? (Number(document.getElementById('assetItNcaQtyInput').value) || 1) : 1;
    const serial = document.getElementById('assetItNcaSerialInput').value.trim();
    const pic = document.getElementById('assetItNcaPicInput').value.trim();
    const lokasi = document.getElementById('assetItNcaLokasiInput').value.trim();
    const status = document.getElementById('assetItNcaStatusInput').value;
    const note = document.getElementById('assetItNcaNoteInput').value.trim();

    if (!name) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.assetNameRequired'); return; }
    if (jenis === 'NCA' && (isNaN(qty) || qty < 1)) { msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.minQtyAsset'); return; }

    const photoData = document.getElementById('assetItNcaPhotoData').value || '';
    const oldData = id ? (getAssetItNcaData()[id] || {}) : null;

    const payload = {
      name: name, jenis: jenis, qty: qty, serial: serial, pic: pic, lokasi: lokasi, status: status, note: note,
      photoData: photoData, updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-'
    };

    const facilityRoot = FB_ROOT + '/' + currentFacility;
    const isNew = !id;
    const itemId = id || fbDb.ref(facilityRoot + '/assetItNca').push().key;
    const ref = fbDb.ref(facilityRoot + '/assetItNca/' + itemId);
    ref.set(payload).then(function () {
      // Catat Riwayat Mutasi: bandingin PIC/Lokasi/Status lama vs baru, tiap ada
      // perubahan disimpan sebagai 1 entry history biar jejak siapa pindah kapan kelihatan.
      const histRef = fbDb.ref(facilityRoot + '/assetItNcaHistory/' + itemId);
      const changedBy = window.__authUserEmail || '-';
      if (isNew) {
        histRef.push().set({ change: t('inv.audit.detail.itncaCreated', { pic: (pic || '-'), lokasi: (lokasi || '-'), status: status, qtyPart: (jenis === 'NCA' ? t('inv.audit.detail.itncaQtyPart', { qty: qty }) : '') }), changedAt: Date.now(), changedBy: changedBy });
      } else if (oldData) {
        const diffs = [];
        if ((oldData.pic || '') !== pic) diffs.push(t('inv.audit.diff.pic', { old: (oldData.pic || '-'), new: (pic || '-') }));
        if ((oldData.lokasi || '') !== lokasi) diffs.push(t('inv.audit.diff.location', { old: (oldData.lokasi || '-'), new: (lokasi || '-') }));
        if ((oldData.status || 'Aktif') !== status) diffs.push(t('inv.audit.diff.status', { old: (oldData.status || 'Aktif'), new: status }));
        if (jenis === 'NCA' && (Number(oldData.qty) || 1) !== qty) diffs.push(t('inv.audit.diff.qty', { old: (Number(oldData.qty) || 1), new: qty }));
        diffs.forEach(function (change) {
          histRef.push().set({ change: change, changedAt: Date.now(), changedBy: changedBy });
        });
      }
      logAudit('Asset IT & NCA', isNew ? 'create' : 'update', name, t('inv.audit.detail.itncaSummary', { jenis: jenis, qtyPart: (jenis === 'NCA' ? t('inv.audit.detail.itncaSummaryQtyPart', { qty: qty }) : ''), status: status, picPart: (pic ? t('inv.audit.detail.itncaSummaryPicPart', { pic: pic }) : '') }));
      closeAssetItNcaModal();
    }).catch(function (e) {
      msgEl.className = 'form-msg err'; msgEl.innerText = t('inv.err.savePrefix') + e.message;
    });
  }

  function deleteAssetItNca(id) {
    if (!window.__authCanDelete) { showToast('🚫 ' + t('inv.err.noAccessDelete'), 'err'); return; }
    const assetName = (getAssetItNcaData()[id] || {}).name || id;
    showConfirmModal(t('inv.confirm.deleteAssetFromItNcaText', { name: assetName, facility: currentFacility }), function () {
      fbDb.ref(FB_ROOT + '/' + currentFacility + '/assetItNca/' + id).remove().then(function () {
        fbDb.ref(FB_ROOT + '/' + currentFacility + '/assetItNcaHistory/' + id).remove();
        logAudit('Asset IT & NCA', 'delete', assetName, t('inv.audit.assetDeletedItNca'));
      });
    }, t('inv.confirm.yesDelete'));
  }

  // ================= RIWAYAT MUTASI ASSET (modal) =================
  function openAssetHistoryModal(id) {
    const asset = getAssetItNcaData()[id];
    document.getElementById('assetHistoryModalTitle').innerText = '🕘 ' + t('inv.modal.historyMutationTitleWithName', { name: (asset ? asset.name : id) });
    document.getElementById('assetHistoryBody').innerHTML = '<tr class="empty-row"><td colspan="3">' + t('inv.loading.history') + '</td></tr>';
    document.getElementById('assetHistoryModalBackdrop').classList.add('open');

    fbDb.ref(FB_ROOT + '/' + currentFacility + '/assetItNcaHistory/' + id).once('value').then(function (snap) {
      const data = snap.val() || {};
      const rows = Object.keys(data).map(function (k) { return data[k]; }).sort(function (a, b) { return (b.changedAt || 0) - (a.changedAt || 0); });
      const tbody = document.getElementById('assetHistoryBody');
      if (!rows.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="3">' + t('inv.msg.noMutationHistory') + '</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(function (r) {
        return '<tr>' +
          '<td>' + (r.changedAt ? formatDateTimeShort(new Date(r.changedAt)) : '-') + '</td>' +
          '<td style="text-align:left; white-space:normal;">' + escapeHtml(r.change || '-') + '</td>' +
          '<td>' + escapeHtml(r.changedBy || '-') + '</td>' +
          '</tr>';
      }).join('');
    }).catch(function (e) {
      document.getElementById('assetHistoryBody').innerHTML = '<tr class="empty-row"><td colspan="3">' + t('inv.err.loadHistoryFailed') + escapeHtml(e.message) + '</td></tr>';
    });
  }
  function closeAssetHistoryModal() {
    document.getElementById('assetHistoryModalBackdrop').classList.remove('open');
  }

