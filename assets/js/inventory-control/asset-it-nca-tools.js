/**
 * assets/js/inventory-control/asset-it-nca-tools.js — Label QR + export/import Excel Asset IT & NCA
 * Bagian 10/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= QR CODE / LABEL (khusus Asset NCA) =================
  let qrLabelCurrentAsset = null;
  function openQrLabelModal(id) {
    const asset = getAssetItNcaData()[id];
    if (!asset) return;
    qrLabelCurrentAsset = Object.assign({ _key: id }, asset);
    document.getElementById('qrLabelAssetName').innerText = asset.name || '-';
    document.getElementById('qrLabelAssetSerial').innerText = asset.serial ? ('No: ' + asset.serial) : '';
    const wrap = document.getElementById('qrCodeCanvasWrap');
    wrap.innerHTML = '';
    const qrText = 'ASSET-NCA | ' + currentFacility + ' | ' + (asset.name || '-') + ' | ' + (asset.serial || id);
    if (typeof QRCode !== 'undefined') {
      new QRCode(wrap, { text: qrText, width: 180, height: 180, colorDark: '#000000', colorLight: '#ffffff' });
    } else {
      wrap.innerHTML = '<span style="color:#a3a3a3; font-size:12px;">Library QR belum ke-load, coba refresh halaman.</span>';
    }
    document.getElementById('qrLabelModalBackdrop').classList.add('open');
  }
  function closeQrLabelModal() {
    document.getElementById('qrLabelModalBackdrop').classList.remove('open');
  }

  // Cetak label kecil (QR + nama + serial) lewat window print terpisah, siap tempel di fisik asset.
  function printQrLabel() {
    if (!qrLabelCurrentAsset) return;
    const wrap = document.getElementById('qrCodeCanvasWrap');
    const img = wrap.querySelector('img') || wrap.querySelector('canvas');
    const imgSrc = img ? (img.tagName === 'CANVAS' ? img.toDataURL('image/png') : img.src) : '';
    const w = window.open('', '_blank', 'width=400,height=500');
    if (!w) { showToast(t('inv.err.popupBlocked'), 'err'); return; }
    w.document.write('<html><head><title>Cetak Label Asset</title><style>' +
      'body{font-family:sans-serif; text-align:center; padding:20px;}' +
      '.label{border:1px dashed #999; padding:14px; display:inline-block;}' +
      'img{width:150px; height:150px;} .nm{font-weight:800; font-size:14px; margin-top:6px;} .sr{font-size:11px; color:#555;}' +
      '</style></head><body>' +
      '<div class="label"><img src="' + imgSrc + '"><div class="nm">' + escapeHtml(qrLabelCurrentAsset.name || '-') + '</div>' +
      '<div class="sr">' + escapeHtml(qrLabelCurrentAsset.serial ? ('No: ' + qrLabelCurrentAsset.serial) : currentFacility) + '</div></div>' +
      '<script>window.onload=function(){window.print();}<\/script></body></html>');
    w.document.close();
  }

  // ================= EXPORT / IMPORT / BULK TEMPLATE ASSET IT & NCA (Excel) =================
  // Export ngikutin filter (search & Jenis) yang lagi aktif di tabel — jadi yang
  // ke-download = persis yang lagi ditampilin di layar. Export ini kebuka buat
  // semua orang (bukan cuma admin), soalnya cuma baca data, bukan ubah.
  function exportAssetItNcaExcel() {
    if (typeof XLSX === 'undefined') { showToast('Library Excel belum ke-load, coba refresh halaman.', 'err'); return; }
    const data = getAssetItNcaData();
    let ids = Object.keys(data);

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

    if (!ids.length) { showToast(t('inv.err.noDataToExport'), 'err'); return; }

    ids.sort(function (a, b) { return (data[a].name || '').localeCompare(data[b].name || ''); });

    const rows = [[t('inv.th.assetName'), t('inv.th.type'), t('inv.th.amount'), t('inv.th.category'), t('inv.th.serialNo'), t('inv.th.picHolder'), t('inv.th.location'), t('inv.th.status'), t('inv.th.note'), t('inv.th.lastUpdate'), t('inv.th.updatedBy')]];
    ids.forEach(function (id) {
      const a = data[id];
      rows.push([
        a.name || '-', a.jenis || 'IT', (Number(a.qty) || 1), a.category || '-', a.serial || '-', a.pic || '-',
        a.lokasi || '-', a.status || 'Aktif', a.note || '-',
        a.updatedAt ? formatDateTimeShort(new Date(a.updatedAt)) : '-',
        a.updatedBy || '-'
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 26 }, { wch: 8 }, { wch: 9 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 32 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, t('inv.export.itncaSheetName'));

    const fname = 'Export_AssetITNCA_' + currentFacility + '_' + todayStr().split('-').reverse().join('') + '.xlsx';
    XLSX.writeFile(wb, fname);
    showToast(t('inv.toast.exportItNcaDownloaded', { count: ids.length, facility: currentFacility }), 'ok');
  }

  function downloadAssetItNcaBulkTemplate() {
    if (!window.__authCanDelete) { showToast(t('inv.err.noAccessFeature'), 'err'); return; }
    const wb = XLSX.utils.book_new();
    const rows = [
      [t('inv.th.assetName'), t('inv.th.typeItNca'), t('inv.th.amountNcaOnly'), t('inv.th.category'), t('inv.th.serialNo'), t('inv.th.picHolder'), t('inv.th.location'), t('inv.th.status'), t('inv.th.note')],
      ['Laptop Lenovo Thinkpad', 'IT', '', 'Laptop', 'SN-12345', 'Rahman 3', 'Ruang Ops', 'Aktif', t('inv.import.sampleRowNote')],
      ['Meja Kerja', 'NCA', 5, 'Furniture', 'INV-0021', 'Tim SOC', 'Area Sortir', 'Aktif', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws, t('inv.import.itncaSheetName'));

    const noteRows = [
      [t('inv.import.itncaGuideTitle')],
      [''],
      [t('inv.import.itnca.guide1')],
      [t('inv.import.itnca.guide2')],
      [t('inv.import.itnca.guide3')],
      [t('inv.import.itnca.guide4')],
      [t('inv.import.itnca.guide5')],
      [t('inv.import.itnca.guide6')],
      [t('inv.import.itnca.guide7')],
      [t('inv.import.itnca.guide8')],
      [t('inv.import.itnca.guide9')]
    ];
    const wsNote = XLSX.utils.aoa_to_sheet(noteRows);
    wsNote['!cols'] = [{ wch: 75 }];
    XLSX.utils.book_append_sheet(wb, wsNote, t('inv.import.guideSheetName'));

    XLSX.writeFile(wb, 'Template_Import_AssetITNCA_' + currentFacility + '.xlsx');
    showToast(t('inv.toast.templateDownloaded', { name: 'Import Asset IT & NCA ' + currentFacility }), 'ok');
  }

  function handleAssetItNcaImportFile(evt) {
    const fileInput = evt.target;
    if (!window.__authCanDelete) { showToast(t('inv.err.noAccessImportItNca'), 'err'); fileInput.value = ''; return; }
    const file = fileInput.files[0];
    if (!file) return;

    const VALID_JENIS = ['IT', 'NCA'];
    const VALID_STATUS = ['Aktif', 'Rusak', 'Diperbaiki', 'Non-Aktif'];

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rows.length) { showToast(t('inv.err.emptyFile'), 'err'); fileInput.value = ''; return; }

        const toImport = [];
        rows.forEach(function (row) {
          const name = String(row['Nama Asset'] || row['Nama'] || '').trim();
          if (!name) return; // lewatin baris kosong

          let jenis = String(row['Jenis (IT/NCA)'] || row['Jenis'] || '').trim().toUpperCase();
          if (VALID_JENIS.indexOf(jenis) === -1) jenis = 'IT';

          let qty = Number(row['Jumlah (khusus NCA)'] || row['Jumlah'] || 1);
          if (jenis !== 'NCA') qty = 1;
          else if (isNaN(qty) || qty < 1) qty = 1;

          const category = String(row['Kategori'] || '').trim();
          const serial = String(row['No Serial/Inventaris'] || row['No Serial'] || row['Inventaris'] || '').trim();
          const pic = String(row['PIC Pemegang'] || row['PIC'] || '').trim();
          const lokasi = String(row['Lokasi'] || '').trim();
          let status = String(row['Status'] || '').trim();
          if (VALID_STATUS.indexOf(status) === -1) status = 'Aktif';
          const note = String(row['Catatan'] || '').trim();

          toImport.push({ name: name, jenis: jenis, qty: qty, category: category, serial: serial, pic: pic, lokasi: lokasi, status: status, note: note });
        });

        if (!toImport.length) {
          showToast(t('inv.err.noValidRowsItNca'), 'err');
          fileInput.value = '';
          return;
        }
        showConfirmModal(t('inv.confirm.importToItNcaText', { count: toImport.length, facility: currentFacility }), function () {
          const facilityRoot = FB_ROOT + '/' + currentFacility;
          const updates = {};
          toImport.forEach(function (item) {
            const newKey = fbDb.ref(facilityRoot + '/assetItNca').push().key;
            updates['/assetItNca/' + newKey] = Object.assign({}, item, {
              updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-'
            });
          });

          fbDb.ref(facilityRoot).update(updates).then(function () {
            showToast(t('inv.toast.importSuccessItNca', { count: toImport.length, facility: currentFacility }), 'ok');
          }).catch(function (err) {
            showToast(t('inv.err.saveImportFailed') + err.message, 'err');
          });
        }, t('inv.confirm.yesImport'));
        fileInput.value = '';
      } catch (err) {
        showToast(t('inv.err.readExcelFailed') + err.message, 'err');
      } finally {
        fileInput.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

