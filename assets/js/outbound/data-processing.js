/**
 * assets/js/outbound/data-processing.js — Upload Excel, format tanggal, olah data & filter
 * Bagian 8/15 dari outbound (dulu satu file main.js). Dimuat berurutan oleh outbound.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

document.getElementById('excelFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('fileName').innerText = file.name;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array', cellDates: true });
    processData(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]), file.name);
  };
  reader.readAsArrayBuffer(file);
});

function formatDateTime(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
}

function formatDateTimeShort(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  return `${pad(dateObj.getDate())} ${monthNames[dateObj.getMonth()]} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
}

function getFieldValue(row, possibleKeys) {
  const rowKeys = Object.keys(row);
  for (let key of possibleKeys) {
    const foundKey = rowKeys.find(k => k.trim().toLowerCase() === key.toLowerCase());
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      return row[foundKey];
    }
  }
  return null;
}

function processData(data, importFileName) {
  const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  
  globalRawData = data.map(row => {
    let agingDays = 0;
    let rawCompleteTime = getFieldValue(row, ['Complete Time', 'Completion Time', 'Packed Time', 'Finished Time']);
    let formattedTimeStr = '-';
    let shift = 'Shift 1';
    let compDateObj = null;

    if (rawCompleteTime) {
      const compDate = rawCompleteTime instanceof Date ? rawCompleteTime : new Date(rawCompleteTime);
      if (!isNaN(compDate)) {
        compDateObj = compDate;
        agingDays = Math.floor((todayStart - new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate())) / (1000 * 60 * 60 * 24));
        if (agingDays < 0) agingDays = 0;
        formattedTimeStr = formatDateTime(compDate);
        
        const hour = compDate.getHours();
        if (hour >= 0 && hour < 8) shift = 'Shift 1';
        else if (hour >= 8 && hour < 16) shift = 'Shift 2';
        else shift = 'Shift 3';
      }
    }

    const toNo = getFieldValue(row, ['Transfer Order Number', 'TO Number', 'No TO', 'TO No', 'Order No']) || '-';
    const spxNo = getFieldValue(row, [
      'SPX Tracking Number', 'SPX Tracking No', 'Tracking Number', 'SPX No',
      'Waybill Number', 'Waybill No', 'Airway Bill', 'AWB', 'Resi', 'No Resi', 'Parcel ID', 'SPX ID'
    ]) || '-';

    const operatorVal = getFieldValue(row, [
      'Operator', 'Last Packer', 'Packer', 'Packed By',
      'Operator Name', 'Packer Name', 'Created By', 'User',
      'Account', 'Worker', 'Staging Operator'
    ]) || '-';

    const isHv = String(getFieldValue(row, ['TO High Value', 'High Value', 'HV']) || '').trim().toUpperCase() === 'Y';
    const dgValue = String(getFieldValue(row, ['Dangerous Goods', 'Liquid']) || '').trim().toUpperCase();
    const isLiquid = dgValue.includes('TYPE A') || dgValue.includes('TYPE B');

    return {
      toNo: String(toNo).trim(),
      spxNo: String(spxNo).trim(),
      completeTimeStr: formattedTimeStr,
      completeDateObj: compDateObj,
      shift: shift,
      lastPacker: String(operatorVal).trim(),
      receiverName: String(getFieldValue(row, ['Receiver Name', 'Destination', 'Hub Name']) || 'Unknown Hub').trim(),
      senderName: String(getFieldValue(row, ['Sender Name', 'Origin']) || '').trim(),
      packingMethod: getFieldValue(row, ['Packing Method', 'Method']) || '',
      isHv: isHv,
      isLiquid: isLiquid,
      journeyType: getFieldValue(row, ['Journey Type', 'Journey Tipe']) || 'Forward',
      agingDays: agingDays
    };
  });

  saveHistorySnapshot();
  pushImportToFirebase(importFileName || 'Manual Import');
  applyFilters();
}

function applyFilters() {
  const jFilter = document.getElementById('filterJourney').value;
  filteredData = jFilter === 'ALL' ? globalRawData : globalRawData.filter(d => d.journeyType.toLowerCase() === jFilter.toLowerCase());
  renderDashboard();
}

