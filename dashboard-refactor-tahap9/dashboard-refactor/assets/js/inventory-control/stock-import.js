/**
 * assets/js/inventory-control/stock-import.js — Import / template bulk Stock (Excel)
 * Bagian 7/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= IMPORT / BULK TEMPLATE STOCK (Excel) =================
  // Template dibuat sesuai kolom yang dibutuhin buat Import: Nama Asset & Qty wajib,
  // sisanya opsional (Unit default "pcs", Min Stock auto 35% dari Qty kalau kosong).
  function downloadStockBulkTemplate() {
    if (!window.__authCanDelete) { showToast(t('inv.err.noAccessFeature'), 'err'); return; }
    const wb = XLSX.utils.book_new();
    const rows = [
      [t('inv.th.asset'), t('inv.th.category'), t('inv.th.unit'), t('inv.th.qty'), t('inv.th.minStock'), t('inv.th.note')],
      [masterSampleName(0), 'Consumable', 'pcs', 10, 4, t('inv.import.sampleRowNote')],
      [masterSampleName(1), 'Consumable', 'pcs', 50, 18, '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws, t('inv.import.stockSheetName'));

    const noteRows = [
      [t('inv.import.guideSheetTitle')],
      [''],
      [t('inv.import.stock.guide1')],
      [t('inv.import.stock.guide2')],
      [t('inv.import.stock.guide3')],
      [t('inv.import.stock.guide4')],
      [t('inv.import.stock.guide5')],
      [t('inv.import.stock.guide6')],
      [t('inv.import.stock.guide7')]
    ];
    const wsNote = XLSX.utils.aoa_to_sheet(noteRows);
    wsNote['!cols'] = [{ wch: 75 }];
    XLSX.utils.book_append_sheet(wb, wsNote, t('inv.import.guideSheetName'));

    const wsNames = XLSX.utils.aoa_to_sheet([[t('inv.th.assetName')]].concat(masterSortedNames().map(function (n) { return [n]; })));
    wsNames['!cols'] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsNames, t('inv.import.namesSheetName'));

    XLSX.writeFile(wb, 'Template_Import_Stock_' + currentFacility + '.xlsx');
    showToast(t('inv.toast.templateDownloaded', { name: 'Import Stock ' + currentFacility }), 'ok');
  }

  function handleStockImportFile(evt) {
    const fileInput = evt.target;
    if (!window.__authCanDelete) { showToast(t('inv.err.noAccessImportStock'), 'err'); fileInput.value = ''; return; }
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rows.length) { showToast(t('inv.err.emptyFile'), 'err'); fileInput.value = ''; return; }

        const toImport = [];
        const errors = [];
        const existingNames = {};
        const masterNamesImport = {};
        masterSortedNames().forEach(function (n) { masterNamesImport[normalizeAssetName(n)] = true; });
        const stockExisting = getStockData();
        Object.keys(stockExisting).forEach(function (k) { existingNames[normalizeAssetName(stockExisting[k].name)] = true; });
        rows.forEach(function (row, idx) {
          const name = String(row['Nama Asset'] || row['Nama'] || '').trim();
          if (!name) return; // lewatin baris kosong
          const masterHit = findMasterByName(name);
          if (!masterHit) { errors.push(t('inv.err.rowNotInMaster', { row: idx + 2, name: name })); return; }
          const canonName = masterHit.name; // auto-koreksi ke nama resmi Master (salah spasi/kapital gak ditolak)
          const normName = normalizeAssetName(canonName);
          if (existingNames[normName]) { errors.push(t('inv.err.rowDuplicate', { row: idx + 2, name: name })); return; }
          existingNames[normName] = true; // sekalian cegah dobel di dalam file itu sendiri

          const category = String(row['Kategori'] || '').trim();
          const unit = String(row['Unit'] || '').trim() || 'pcs';
          const qty = Number(row['Qty']);
          let minStock = Number(row['Min Stock'] || 0);
          const note = String(row['Catatan'] || '').trim();

          if (isNaN(qty) || qty < 0) { errors.push(t('inv.err.rowQtyInvalid', { row: idx + 2, name: name })); return; }
          if (!minStock) minStock = calcSuggestedMinStock(qty);

          toImport.push({ name: canonName, category: category, unit: unit, qty: qty, minStock: minStock, note: note });
        });

        if (errors.length) {
          showToast(t('inv.err.importCancelledErrors') + errors.join('\n'), 'err', 9000);
          fileInput.value = '';
          return;
        }
        if (!toImport.length) {
          showToast(t('inv.err.noValidRowsStock'), 'err');
          fileInput.value = '';
          return;
        }
        showConfirmModal(t('inv.confirm.importToStockText', { count: toImport.length, facility: currentFacility }), function () {
          const facilityRoot = FB_ROOT + '/' + currentFacility;
          const updates = {};
          toImport.forEach(function (item) {
            const newKey = fbDb.ref(facilityRoot + '/stock').push().key;
            updates['/stock/' + newKey] = Object.assign({}, item, {
              updatedAt: Date.now(), updatedBy: window.__authUserEmail || '-'
            });
          });

          fbDb.ref(facilityRoot).update(updates).then(function () {
            showToast(t('inv.toast.importSuccessStock', { count: toImport.length, facility: currentFacility }), 'ok');
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

