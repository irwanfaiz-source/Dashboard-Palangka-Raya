/**
 * assets/js/inventory-control/item-history-and-low-stock.js — Riwayat pemakaian per item & banner Low-Stock
 * Bagian 9/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= RIWAYAT PEMAKAIAN PER ITEM (Stock) =================
  // Dipicu tombol "🕘 Riwayat" di tabel Stock. Nampilin kapan asset ditambahin,
  // siapa yang paling sering minjem/minta (dihitung dari usageLogs), dan tabel
  // riwayat pemakaian lengkap (Tanggal, Qty, Divisi, Diinput Oleh).
  function openItemHistoryModal(id) {
    const asset = getStockData()[id];
    document.getElementById('itemHistoryModalTitle').innerText = '🕘 ' + t('inv.modal.historyUsageTitleWithName', { name: (asset ? asset.name : id) });
    document.getElementById('itemHistoryInfoBox').innerHTML = t('inv.msg.loadingInfo');
    document.getElementById('itemHistoryBody').innerHTML = '<tr class="empty-row"><td colspan="4">' + t('inv.loading.history') + '</td></tr>';
    document.getElementById('itemHistoryModalBackdrop').classList.add('open');

    const logsArr = getLogsArr(currentFacility).filter(function (l) { return l.assetId === id; });
    logsArr.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });

    // Hitung siapa yang paling sering minjem/minta asset ini
    const countByEmail = {};
    logsArr.forEach(function (l) {
      const who = l.createdBy || '-';
      countByEmail[who] = (countByEmail[who] || 0) + 1;
    });
    let topBorrower = null, topCount = 0;
    Object.keys(countByEmail).forEach(function (email) {
      if (countByEmail[email] > topCount) { topCount = countByEmail[email]; topBorrower = email; }
    });

    const addedInfo = (asset && asset.createdAt)
      ? t('inv.msg.addedByOn', { date: formatDateTimeShort(new Date(asset.createdAt)), by: escapeHtml(asset.createdBy || '-') })
      : '<i>' + t('inv.msg.addedLegacyData') + '</i>';
    const topInfo = topBorrower
      ? t('inv.msg.topBorrower', { who: escapeHtml(topBorrower), count: topCount, total: logsArr.length })
      : t('inv.msg.noUsageHistory');
    document.getElementById('itemHistoryInfoBox').innerHTML = addedInfo + '<br>' + topInfo;

    const tbody = document.getElementById('itemHistoryBody');
    if (!logsArr.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="4">' + t('inv.msg.noUsageHistory') + '</td></tr>';
      return;
    }
    tbody.innerHTML = logsArr.map(function (l) {
      const devisi = l.devisi || getDevisiForEmail(l.createdBy);
      return '<tr>' +
        '<td>' + escapeHtml(l.workingDate || '-') + '</td>' +
        '<td><b>' + (l.qtyUsed || 0) + ' ' + escapeHtml(l.unit || '') + '</b></td>' +
        '<td>' + escapeHtml(getDevisiLabel(devisi)) + '</td>' +
        '<td>' + escapeHtml(l.createdBy || '-') + '</td>' +
        '</tr>';
    }).join('');
  }
  function closeItemHistoryModal() {
    document.getElementById('itemHistoryModalBackdrop').classList.remove('open');
  }

  // ================= LOW-STOCK BANNER (global) =================
  // Dipanggil tiap Stock berubah (realtime dari Firebase) & tiap pindah tab/facility.
  // "Habis" (qty <= 0) dianggap paling parah (merah), "Menipis" (qty <= minStock) kuning.
  function renderLowStockBanner() {
    const banner = document.getElementById('lowStockBanner');
    if (lowStockBannerDismissed) { banner.classList.remove('show'); return; }

    const stockData = getStockData();
    const outOfStock = [];
    const lowStock = [];
    Object.keys(stockData).forEach(function (id) {
      const a = stockData[id];
      const qty = Number(a.qty) || 0;
      const minStock = Number(a.minStock) || 0;
      if (minStock <= 0) return;
      if (qty <= 0) outOfStock.push(a.name || id);
      else if (qty <= minStock) lowStock.push(a.name || id);
    });

    if (!outOfStock.length && !lowStock.length) {
      banner.classList.remove('show');
      return;
    }

    const level = outOfStock.length ? 'danger' : 'warn';
    banner.classList.remove('level-warn', 'level-danger');
    banner.classList.add('level-' + level, 'show');
    document.getElementById('lowStockBannerIcon').innerText = level === 'danger' ? '🛑' : '⚠️';

    function namesPreview(arr) {
      const shown = arr.slice(0, 4).join(', ');
      return shown + (arr.length > 4 ? ' +' + (arr.length - 4) + ' lainnya' : '');
    }
    let text = '';
    if (outOfStock.length) text += outOfStock.length + ' asset stok-nya HABIS (' + namesPreview(outOfStock) + ')';
    if (lowStock.length) text += (text ? ' — ' : '') + lowStock.length + ' asset menipis di bawah Min Stock (' + namesPreview(lowStock) + ')';
    document.getElementById('lowStockBannerText').innerText = text;
  }
  function dismissLowStockBanner() {
    lowStockBannerDismissed = true;
    document.getElementById('lowStockBanner').classList.remove('show');
  }

