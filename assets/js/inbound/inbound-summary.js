/**
 * assets/js/inbound/inbound-summary.js — Inbound Tracking: ringkasan dari Google Sheet "Inbound Sea & Air"
 * (KPI, Rekap Performance Vendor, Shift, Detail, Trend, Leads, Attention) + Export PDF/preview.
 * Menggantikan script utama lama (Line Haul Tracking & Manpower Planning, ±1.055 baris). Tidak memakai Firebase.
 * Teks diambil apa adanya dari inbound.html versi terbaru; butuh APP_I18N (i18n.js) sudah dimuat, escapeHtml &
 * showToast (common.js), dan library jsPDF (CDN).
 */
  // ==== INBOUND SUMMARY — baca langsung dari Google Sheet "Inbound Sea & Air" (CSV gviz) ====
  // Sheet harus di-share "Anyone with the link (Viewer)" biar bisa kebaca dari browser.
  APP_I18N['page.title'] = { id: 'Inbound - Internal Palangka Raya DC', en: 'Inbound - Internal Palangka Raya DC', ja: 'Inbound - Internal Palangka Raya DC', zh: 'Inbound - Internal Palangka Raya DC' };

  const SUM_SHEET_ID = '1vuJf4-_9sVpWI2WnokZxVCcOyIrnci-qQckxoabNQ8w';
  const SUM_GID = '500696715';
  const SUM_URL = 'https://docs.google.com/spreadsheets/d/' + SUM_SHEET_ID + '/gviz/tq?tqx=out:csv&headers=1&gid=' + SUM_GID;
  const SUM_AUTO_REFRESH_MS = 5 * 60 * 1000;
  // Index kolom (A=0 ... AC=28)
  const C = { date: 0, lt: 1, type: 3, route: 4, to: 5, parcel: 6, nopol: 7, driver: 8, vendor: 10, ata: 15, dateArr: 16, status: 18, durUnload: 23, durFinishUnload: 24, durFinish: 25, shift: 26 };
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11 };
  let sumHeaders = [];
  let sumRows = [];
  let sumFiltered = [];

  function pDT(s) { // "01/11/2026 04:41"
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/.exec(s || '');
    return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]) : null;
  }
  function pD(s) { // "1-Nov-2026" / "1 November 2026"
    const m = /(\d{1,2})[\s-]([A-Za-z]+)[\s-](\d{4})/.exec(s || '');
    if (!m) return null;
    const mo = MON[m[2].slice(0, 3).toLowerCase()];
    return mo == null ? null : new Date(+m[3], mo, +m[1]);
  }
  function pMin(s) { const m = /^\s*(\d+):(\d{2})/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function fMin(v) { if (v == null || isNaN(v)) return '-'; const r = Math.round(v); return Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0'); }
  function pNum(s) { return parseInt(String(s || '').replace(/[^\d]/g, ''), 10) || 0; }
  function rowDate(r) { return pDT(r[C.ata]) || pD(r[C.dateArr]) || pD(r[C.date]); }
  function normShift(s) { const m = /shif\w*\s*(\d)/i.exec(s || ''); return m ? 'Shift ' + m[1] : ((s || '').trim() || '-'); }
  function normStatus(s) {
    s = String(s || '').toLowerCase().replace(/\s/g, '');
    if (s.indexOf('early') === 0) return 'Early';
    if (s.indexOf('ontime') === 0) return 'Ontime';
    if (s.indexOf('late') === 0) return 'Late';
    return '';
  }
  function avg(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null; }
  function pct(n, d) { return d ? (n / d * 100).toFixed(1) + '%' : '-'; }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function setDefaultPeriod() {
    const now = new Date();
    document.getElementById('sumFrom').value = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    document.getElementById('sumTo').value = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  // Coba beberapa jalur berurutan: (1) gviz langsung, (2) export CSV langsung, (3) proxy Netlify Function
  // (/.netlify/functions/inbound-sheet, bebas CORS). Kalau semua gagal, tampilkan alasan tiap jalur.
  const SUM_SOURCES = [
    { name: 'gviz', url: SUM_URL },
    { name: 'export', url: 'https://docs.google.com/spreadsheets/d/' + SUM_SHEET_ID + '/export?format=csv&gid=' + SUM_GID },
    { name: 'proxy', url: '/.netlify/functions/inbound-sheet' }
  ];
  async function fetchSheetCsv() {
    const errs = [];
    for (const src of SUM_SOURCES) {
      try {
        const res = await fetch(src.url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const txt = await res.text();
        if (txt.trim().charAt(0) === '<') throw new Error('balasan bukan CSV (sheet belum public / butuh login)');
        return txt;
      } catch (e) {
        errs.push(src.name + ': ' + e.message);
      }
    }
    throw new Error(errs.join(' | ') + ' — pastikan sheet di-share "Anyone with the link (Viewer)".');
  }

  async function loadSummary() {
    const btn = document.getElementById('sumBtnRefresh');
    const err = document.getElementById('sumError');
    btn.disabled = true;
    try {
      const txt = await fetchSheetCsv();
      const p = Papa.parse(txt, { skipEmptyLines: true });
      sumHeaders = p.data[0].map(function (h) { return String(h).replace(/\s+/g, ' ').trim(); });
      sumRows = p.data.slice(1).filter(function (r) { return r[C.lt] && String(r[C.lt]).trim(); });
      err.style.display = 'none';
      document.getElementById('sumLast').textContent = new Date().toLocaleTimeString('id-ID');
      fillSumSelects();
      renderAll();
    } catch (e) {
      err.style.display = 'block';
      err.textContent = '⛔ Gagal ambil data dari Google Sheet: ' + e.message;
    } finally {
      btn.disabled = false;
    }
  }

  let sumBase = [];
  function selVal(id) { return document.getElementById(id).value; }
  function applySumFilter() {
    const f = selVal('sumFrom'), t2 = selVal('sumTo');
    const q = document.getElementById('sumSearch').value.trim().toLowerCase();
    const vd = selVal('sumVendor'), sh = selVal('sumShiftSel'), ty = selVal('sumType'), st = selVal('sumStatus');
    const from = f ? new Date(f + 'T00:00:00') : null;
    const to = t2 ? new Date(t2 + 'T23:59:59') : null;
    sumBase = sumRows.filter(function (r) {
      const d = rowDate(r);
      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;
      if (vd && ((r[C.vendor] || '').trim() || '-') !== vd) return false;
      if (sh && normShift(r[C.shift]) !== sh) return false;
      if (ty && (r[C.type] || '').trim() !== ty) return false;
      if (q) {
        const hay = [r[C.lt], r[C.route], r[C.nopol], r[C.driver], r[C.vendor]].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    // sumBase = semua filter KECUALI status (dipakai kartu & rekap vendor biar tetap utuh)
    sumFiltered = st ? sumBase.filter(function (r) { return normStatus(r[C.status]) === st; }) : sumBase;
  }
  function fillSel(id, vals, allLabel) {
    const el = document.getElementById(id), cur = el.value;
    el.innerHTML = '<option value="">' + allLabel + '</option>' + vals.map(function (v) { return '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>'; }).join('');
    if (vals.indexOf(cur) > -1) el.value = cur;
  }
  function uniqVals(fn) { const m = {}; sumRows.forEach(function (r) { const v = fn(r); if (v) m[v] = 1; }); return Object.keys(m).sort(); }
  function fillSumSelects() {
    fillSel('sumVendor', uniqVals(function (r) { return (r[C.vendor] || '').trim() || '-'; }), 'Semua');
    fillSel('sumShiftSel', uniqVals(function (r) { return normShift(r[C.shift]); }), 'Semua');
    fillSel('sumType', uniqVals(function (r) { return (r[C.type] || '').trim(); }), 'Semua');
  }
  function sumSetStatus(st) {
    const el = document.getElementById('sumStatus');
    el.value = el.value === st ? '' : st;
    renderAll();
  }

  function renderAll() {
    if (!document.getElementById('sumKpi')) return;
    applySumFilter();
    renderSumKpi();
    renderSumVendor();
    renderSumShift();
    renderSumDetail();
    renderSumTrend();
    renderSumLeads();
    renderSumAttention();
  }

  function renderSumKpi() {
    const rows = sumBase;
    const cnt = { Early: 0, Ontime: 0, Late: 0 };
    let toQty = 0, parcel = 0, done = 0;
    const fin = [];
    rows.forEach(function (r) {
      const s = normStatus(r[C.status]); if (s) cnt[s]++;
      toQty += pNum(r[C.to]); parcel += pNum(r[C.parcel]);
      const m = pMin(r[C.durFinish]);
      if (m != null) { done++; fin.push(m); }
    });
    const judged = cnt.Early + cnt.Ontime + cnt.Late;
    const cards = [
      ['🚚 Total Trip', rows.length.toLocaleString(), 'Sudah Finish: ' + done, ''],
      ['📦 Total TO Qty', toQty.toLocaleString(), '', ''],
      ['🧮 Total Parcel Qty', parcel.toLocaleString(), '', ''],
      ['🟢 Early', cnt.Early.toLocaleString(), pct(cnt.Early, judged), 'a-green', 'Early'],
      ['🔵 Ontime', cnt.Ontime.toLocaleString(), pct(cnt.Ontime, judged), 'a-blue', 'Ontime'],
      ['🔴 Late', cnt.Late.toLocaleString(), pct(cnt.Late, judged), 'a-red', 'Late'],
      ['⏱️ Avg Arrival → Finish', fMin(avg(fin)), 'Standar 1:40', '']
    ];
    document.getElementById('sumKpi').innerHTML = cards.map(function (c) {
      return '<div class="forecast-item sum-k ' + c[3] + (c[4] ? ' clickable' + (selVal('sumStatus') === c[4] ? ' active' : '') + '" onclick="sumSetStatus(\'' + c[4] + '\')' : '') + '"><div class="forecast-title">' + c[0] + '</div><div class="forecast-value">' + c[1] + '</div>' +
        (c[2] ? '<div class="sum-kpi-sub">' + escapeHtml(c[2]) + '</div>' : '') + '</div>';
    }).join('');
    document.getElementById('sumCount').textContent = sumFiltered.length + ' / ' + sumRows.length + ' trip';
  }

  function renderSumVendor() {
    const map = {};
    sumBase.forEach(function (r) {
      const v = (r[C.vendor] || '').trim() || '-';
      const o = map[v] || (map[v] = { n: 0, Early: 0, Ontime: 0, Late: 0 });
      o.n++; const s = normStatus(r[C.status]); if (s) o[s]++;
    });
    const list = Object.keys(map).sort(function (a, b) { return map[b].n - map[a].n; });
    const tot = { n: 0, Early: 0, Ontime: 0, Late: 0 };
    const line = function (name, o, cls) {
      const j = o.Early + o.Ontime + o.Late;
      const w = function (x) { return j ? (x / j * 100).toFixed(1) : 0; };
      return '<tr class="' + (cls || '') + '"><td style="text-align:left;">' + escapeHtml(name) + '</td><td>' + o.n + '</td><td>' + o.Early + '</td><td>' + o.Ontime + '</td><td>' + o.Late +
        '</td><td class="sum-pe">' + pct(o.Early, j) + '</td><td class="sum-po">' + pct(o.Ontime, j) + '</td><td class="sum-pl">' + pct(o.Late, j) + '</td>' +
        '<td><div class="sum-bar"><span class="e" style="width:' + w(o.Early) + '%"></span><span class="o" style="width:' + w(o.Ontime) + '%"></span><span class="l" style="width:' + w(o.Late) + '%"></span></div></td></tr>';
    };
    let html = list.map(function (v) {
      const o = map[v]; tot.n += o.n; tot.Early += o.Early; tot.Ontime += o.Ontime; tot.Late += o.Late;
      return line(v, o);
    }).join('');
    html += list.length ? line('TOTAL', tot, 'sum-total') : '<tr><td colspan="9" style="color:#94a3b8;">Tidak ada data di periode ini.</td></tr>';
    document.getElementById('sumVendorBody').innerHTML = html;
  }

  function renderSumShift() {
    const map = {};
    sumFiltered.forEach(function (r) {
      const k = normShift(r[C.shift]);
      const o = map[k] || (map[k] = { n: 0, u: [], f: [], a: [] });
      o.n++;
      const u = pMin(r[C.durUnload]), f = pMin(r[C.durFinishUnload]), a = pMin(r[C.durFinish]);
      if (u != null) o.u.push(u); if (f != null) o.f.push(f); if (a != null) o.a.push(a);
    });
    const keys = Object.keys(map).sort();
    const cell = function (v, std) { return '<td class="' + (v == null ? '' : (v > std ? 'sum-over' : 'sum-ok')) + '">' + fMin(v) + '</td>'; };
    document.getElementById('sumShiftBody').innerHTML = keys.length ? keys.map(function (k) {
      const o = map[k];
      return '<tr><td style="font-weight:800;">' + escapeHtml(k) + '</td><td>' + o.n + '</td><td>' + o.a.length + '</td>' +
        cell(avg(o.u), 20) + cell(avg(o.f), 80) + cell(avg(o.a), 100) + '<td>' + fMin(o.a.length ? Math.max.apply(null, o.a) : null) + '</td></tr>';
    }).join('') : '<tr><td colspan="7" style="color:#94a3b8;">Tidak ada data di periode ini.</td></tr>';
  }

  function renderSumDetail() {
    document.getElementById('sumDetailHead').innerHTML = sumHeaders.map(function (h) { return '<th>' + escapeHtml(h) + '</th>'; }).join('');
    document.getElementById('sumDetailCount').textContent = sumFiltered.length + ' baris';
    document.getElementById('sumDetailBody').innerHTML = sumFiltered.map(function (r) {
      return '<tr>' + sumHeaders.map(function (h, i) {
        const v = r[i] == null ? '' : r[i];
        if (i === C.status) { const s = normStatus(v); return '<td>' + (s ? '<span class="sum-chip ' + s.toLowerCase() + '">' + s + '</span>' : escapeHtml(v)) + '</td>'; }
        return '<td>' + escapeHtml(v) + '</td>';
      }).join('') + '</tr>';
    }).join('') || '<tr><td colspan="' + (sumHeaders.length || 1) + '" style="color:#94a3b8;">Tidak ada data di periode ini.</td></tr>';
  }

  function durCell(v, std) { return '<td class="' + (v == null ? '' : (v > std ? 'sum-over' : 'sum-ok')) + '">' + fMin(v) + '</td>'; }
  function fmtK(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n); }

  function renderSumTrend() {
    const map = {};
    sumFiltered.forEach(function (r) {
      const d = rowDate(r); if (!d) return;
      const k = ymd(d);
      const o = map[k] || (map[k] = { Early: 0, Ontime: 0, Late: 0, n: 0, parcel: 0 });
      o.n++; o.parcel += pNum(r[C.parcel]);
      const s2 = normStatus(r[C.status]); if (s2) o[s2]++;
    });
    const keys = Object.keys(map).sort();
    const tripEl = document.getElementById('sumTrendTrip'), parEl = document.getElementById('sumTrendParcel');
    if (!keys.length) { tripEl.innerHTML = parEl.innerHTML = '<div class="sum-empty">Tidak ada data di periode ini.</div>'; return; }
    const maxN = Math.max.apply(null, keys.map(function (k) { return map[k].n; }));
    const maxP = Math.max.apply(null, keys.map(function (k) { return map[k].parcel; })) || 1;
    const H = 110;
    tripEl.innerHTML = keys.map(function (k) {
      const o = map[k], day = k.slice(8), h = Math.max(3, Math.round(o.n / maxN * H));
      const seg = ['Early', 'Ontime', 'Late'].map(function (n2) { return o[n2] ? '<i class="' + n2[0].toLowerCase() + '" style="height:' + Math.round(o[n2] / o.n * h) + 'px"></i>' : ''; }).join('');
      return '<div class="sum-col" title="' + day + '/' + k.slice(5, 7) + ' · ' + o.n + ' trip (Early ' + o.Early + ' / Ontime ' + o.Ontime + ' / Late ' + o.Late + ')"><b>' + o.n + '</b><div class="sum-stk" style="height:' + h + 'px">' + seg + '</div><span>' + day + '</span></div>';
    }).join('');
    parEl.innerHTML = keys.map(function (k) {
      const o = map[k], day = k.slice(8), h = Math.max(3, Math.round(o.parcel / maxP * H));
      return '<div class="sum-col" title="' + day + '/' + k.slice(5, 7) + ' · ' + o.parcel.toLocaleString() + ' parcel"><b>' + fmtK(o.parcel) + '</b><div class="sum-stk" style="height:' + h + 'px"></div><span>' + day + '</span></div>';
    }).join('');
  }

  function renderLeadTable(bodyId, idx) {
    const map = {};
    sumFiltered.forEach(function (r) {
      const k = (r[idx] || '').trim() || '-';
      const o = map[k] || (map[k] = { n: 0, late: 0, u: [], f: [], a: [] });
      o.n++; if (normStatus(r[C.status]) === 'Late') o.late++;
      const u = pMin(r[C.durUnload]), f = pMin(r[C.durFinishUnload]), a = pMin(r[C.durFinish]);
      if (u != null) o.u.push(u); if (f != null) o.f.push(f); if (a != null) o.a.push(a);
    });
    const keys = Object.keys(map).sort(function (a, b) { return map[b].n - map[a].n; });
    document.getElementById(bodyId).innerHTML = keys.length ? keys.map(function (k) {
      const o = map[k];
      return '<tr><td style="text-align:left;font-weight:700;">' + escapeHtml(k) + '</td><td>' + o.n + '</td><td>' + o.late + '</td>' + durCell(avg(o.u), 20) + durCell(avg(o.f), 80) + durCell(avg(o.a), 100) + '</tr>';
    }).join('') : '<tr><td colspan="6" style="color:#94a3b8;">Tidak ada data.</td></tr>';
  }
  function renderSumLeads() { renderLeadTable('sumShiftLeadBody', 27); renderLeadTable('sumTeamLeadBody', 28); }

  function renderSumAttention() {
    const late = [];
    sumFiltered.forEach(function (r) {
      if (normStatus(r[C.status]) !== 'Late') return;
      const sta = pDT(r[12]), ata = pDT(r[C.ata]);
      let delay = sta && ata ? (ata - sta) / 60000 : null;
      if (delay != null && (delay <= 0 || delay > 7 * 1440)) delay = null; // STA ngaco (mis. jadwal udara) -> gak dihitung
      late.push({ r: r, delay: delay });
    });
    late.sort(function (a, b) { return (b.delay == null ? -1 : b.delay) - (a.delay == null ? -1 : a.delay); });
    document.getElementById('sumLateCount').textContent = '(' + late.length + ' trip Late)';
    document.getElementById('sumLateBody').innerHTML = late.slice(0, 10).map(function (x) {
      const r = x.r;
      return '<tr><td>' + escapeHtml(r[C.lt]) + '</td><td>' + escapeHtml(r[C.vendor]) + '</td><td style="text-align:left;">' + escapeHtml(r[C.route]) + '</td><td>' + escapeHtml(r[12]) + '</td><td>' + escapeHtml(r[C.ata]) + '</td><td class="sum-over">' + (x.delay == null ? '-' : fMin(x.delay)) + '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="color:#94a3b8;">Tidak ada trip Late.</td></tr>';

    const slow = [];
    sumFiltered.forEach(function (r) { const a = pMin(r[C.durFinish]); if (a != null && a > 100) slow.push({ r: r, a: a }); });
    slow.sort(function (x, y) { return y.a - x.a; });
    document.getElementById('sumSlowCount').textContent = '(' + slow.length + ' trip)';
    document.getElementById('sumSlowBody').innerHTML = slow.slice(0, 10).map(function (x) {
      const r = x.r;
      return '<tr><td>' + escapeHtml(r[C.lt]) + '</td><td>' + escapeHtml(r[C.vendor]) + '</td><td>' + escapeHtml(normShift(r[C.shift])) + '</td><td>' + escapeHtml(r[C.durUnload]) + '</td><td>' + escapeHtml(r[C.durFinishUnload]) + '</td><td class="sum-over">' + fMin(x.a) + '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="color:#94a3b8;">Semua trip dalam standar.</td></tr>';
  }


  // ==== EXPORT PDF (preview dulu → pilih Status & Vendor → download) ====
  // Data dasar ikut filter di halaman (tanggal, cari, shift, trip type); Status & Vendor ditentukan di modal.
  const EXP_STATUS_LABEL = { '': 'All', Early: 'Early Arrival', Ontime: 'On Time', Late: 'Late Arrival' };
  const EXP_COLS = [
    { h: 'No' },
    { h: 'LT', f: function (r) { return r[C.lt]; } },
    { h: 'Vendor', f: function (r) { return r[C.vendor]; } },
    { h: 'Type', f: function (r) { return r[C.type]; } },
    { h: 'Route', f: function (r) { return r[C.route]; } },
    { h: 'Parcel', f: function (r) { return r[C.parcel]; } },
    { h: 'Nopol', f: function (r) { return r[C.nopol]; } },
    { h: 'Driver', f: function (r) { return r[C.driver]; } },
    { h: 'STA', f: function (r) { return r[12]; } },
    { h: 'ATA', f: function (r) { return r[C.ata]; } },
    { h: 'Status', f: function (r) { return normStatus(r[C.status]) || r[C.status]; } },
    { h: 'Shift', f: function (r) { return normShift(r[C.shift]); } },
    { h: 'Arr-Unload', f: function (r) { return r[C.durUnload]; } },
    { h: 'Unload-Finish', f: function (r) { return r[C.durFinishUnload]; } },
    { h: 'Arr-Finish', f: function (r) { return r[C.durFinish]; } }
  ];
  const EXP_STATUS_COL = 10;
  let expStatus = '';
  let expVendorMode = 'all';
  let expVendor = '';

  function vendorOf(r) { return (r[C.vendor] || '').trim() || '-'; }
  function fmtYmd(v) { return v ? v.split('-').reverse().join('/') : '-'; }

  // Semua filter halaman KECUALI vendor & status
  function expBaseRows() {
    const f = selVal('sumFrom'), t2 = selVal('sumTo');
    const q = document.getElementById('sumSearch').value.trim().toLowerCase();
    const sh = selVal('sumShiftSel'), ty = selVal('sumType');
    const from = f ? new Date(f + 'T00:00:00') : null;
    const to = t2 ? new Date(t2 + 'T23:59:59') : null;
    return sumRows.filter(function (r) {
      const d = rowDate(r);
      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;
      if (sh && normShift(r[C.shift]) !== sh) return false;
      if (ty && (r[C.type] || '').trim() !== ty) return false;
      if (q) {
        const hay = [r[C.lt], r[C.route], r[C.nopol], r[C.driver], r[C.vendor]].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }
  function expVendorFiltered(base) {
    return (expVendorMode === 'one' && expVendor) ? base.filter(function (r) { return vendorOf(r) === expVendor; }) : base;
  }
  function expRows() {
    const rows = expVendorFiltered(expBaseRows());
    const out = expStatus ? rows.filter(function (r) { return normStatus(r[C.status]) === expStatus; }) : rows.slice();
    out.sort(function (a, b) { const da = rowDate(a), db = rowDate(b); return (da ? +da : 0) - (db ? +db : 0); });
    return out;
  }
  function expFilterNote() {
    const parts = [];
    if (selVal('sumShiftSel')) parts.push('Shift: ' + selVal('sumShiftSel'));
    if (selVal('sumType')) parts.push('Trip Type: ' + selVal('sumType'));
    const q = document.getElementById('sumSearch').value.trim();
    if (q) parts.push('Cari: "' + q + '"');
    return parts.join(' | ');
  }

  function openExportPreview() {
    if (!sumRows.length) { showToast('Data belum termuat. Coba klik Refresh dulu.', 'err'); return; }
    expStatus = selVal('sumStatus');
    expVendor = selVal('sumVendor');
    expVendorMode = expVendor ? 'one' : 'all';
    document.getElementById('expModal').classList.add('open');
    renderExportPreview();
  }
  function closeExportPreview() { document.getElementById('expModal').classList.remove('open'); }

  function renderExportPreview() {
    const base = expBaseRows();

    // dropdown vendor (hanya vendor yang ada di periode/filter halaman)
    const cnt = {};
    base.forEach(function (r) { const v = vendorOf(r); cnt[v] = (cnt[v] || 0) + 1; });
    const vendors = Object.keys(cnt).sort();
    if (expVendor && vendors.indexOf(expVendor) === -1) expVendor = '';
    if (expVendorMode === 'one' && !expVendor && vendors.length) expVendor = vendors[0];
    const sel = document.getElementById('expVendorSel');
    sel.innerHTML = vendors.map(function (v) { return '<option value="' + escapeHtml(v) + '"' + (v === expVendor ? ' selected' : '') + '>' + escapeHtml(v) + ' (' + cnt[v] + ')</option>'; }).join('');
    sel.style.display = expVendorMode === 'one' ? 'block' : 'none';
    document.querySelectorAll('#expVendorSeg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-m') === expVendorMode); });

    // hitung per status (sesudah filter vendor) → tampil di tombol status
    const vf = expVendorFiltered(base);
    const c = { Early: 0, Ontime: 0, Late: 0 };
    vf.forEach(function (r) { const st = normStatus(r[C.status]); if (st) c[st]++; });
    const segTxt = { '': 'All (' + vf.length + ')', Early: '🟢 Early Arrival (' + c.Early + ')', Ontime: '🔵 On Time (' + c.Ontime + ')', Late: '🔴 Late Arrival (' + c.Late + ')' };
    document.querySelectorAll('#expStatusSeg button').forEach(function (b) {
      const v = b.getAttribute('data-v');
      b.textContent = segTxt[v];
      b.classList.toggle('on', v === expStatus);
    });

    const rows = expRows();
    const info = '<b>Periode:</b> ' + fmtYmd(selVal('sumFrom')) + ' – ' + fmtYmd(selVal('sumTo')) +
      ' &nbsp;·&nbsp; <b>Status:</b> ' + EXP_STATUS_LABEL[expStatus] +
      ' &nbsp;·&nbsp; <b>Vendor:</b> ' + (expVendorMode === 'one' && expVendor ? escapeHtml(expVendor) : 'All Vendor') +
      (expFilterNote() ? '<br><b>Filter halaman:</b> ' + escapeHtml(expFilterNote()) : '');
    document.getElementById('expInfo').innerHTML = info;

    const cs = { Early: 0, Ontime: 0, Late: 0 };
    rows.forEach(function (r) { const st = normStatus(r[C.status]); if (st) cs[st]++; });
    document.getElementById('expChips').innerHTML =
      '<span class="sum-chip tot">Total ' + rows.length + ' trip</span>' +
      '<span class="sum-chip early">Early ' + cs.Early + '</span>' +
      '<span class="sum-chip ontime">Ontime ' + cs.Ontime + '</span>' +
      '<span class="sum-chip late">Late ' + cs.Late + '</span>';

    document.getElementById('expHead').innerHTML = EXP_COLS.map(function (col) { return '<th>' + col.h + '</th>'; }).join('');
    const LIM = 100;
    document.getElementById('expBody').innerHTML = rows.slice(0, LIM).map(function (r, i) {
      return '<tr>' + EXP_COLS.map(function (col, ci) {
        if (ci === 0) return '<td>' + (i + 1) + '</td>';
        const v = col.f(r);
        if (ci === EXP_STATUS_COL) { const st = normStatus(r[C.status]); return '<td>' + (st ? '<span class="sum-chip ' + st.toLowerCase() + '">' + st + '</span>' : escapeHtml(v)) + '</td>'; }
        return '<td>' + escapeHtml(v == null ? '' : v) + '</td>';
      }).join('') + '</tr>';
    }).join('') || '<tr><td colspan="' + EXP_COLS.length + '" style="color:#94a3b8;">Tidak ada data dengan pilihan ini.</td></tr>';

    document.getElementById('expNote').textContent = rows.length > LIM
      ? 'Preview menampilkan ' + LIM + ' dari ' + rows.length + ' baris — file PDF memuat semua baris.'
      : (rows.length ? 'PDF memuat ' + rows.length + ' baris (A4 landscape).' : '');
    document.getElementById('expGo').disabled = !rows.length;
  }

  // teks aman buat font bawaan jsPDF (helvetica = Latin-1 saja)
  function pdfTxt(v) { const t = String(v == null ? '' : v).replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '').replace(/\s+/g, ' ').trim(); return t || '-'; }

  function downloadExportPdf() {
    const rows = expRows();
    if (!rows.length) { showToast('Tidak ada data untuk di-export dengan pilihan ini.', 'err'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { showToast('Library PDF belum termuat. Cek koneksi internet lalu coba lagi.', 'err'); return; }
    try {
      const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const vendorLbl = (expVendorMode === 'one' && expVendor) ? expVendor : 'All Vendor';
      const cs = { Early: 0, Ontime: 0, Late: 0 };
      rows.forEach(function (r) { const st = normStatus(r[C.status]); if (st) cs[st]++; });
      const judged = cs.Early + cs.Ontime + cs.Late;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(15, 23, 42);
      doc.text('Inbound Tracking - Palangka Raya DC', 10, 12);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
      doc.text(pdfTxt('Periode: ' + fmtYmd(selVal('sumFrom')) + ' - ' + fmtYmd(selVal('sumTo')) + '   |   Status: ' + EXP_STATUS_LABEL[expStatus] + '   |   Vendor: ' + vendorLbl), 10, 17.5);
      const extra = expFilterNote();
      let y = 17.5;
      if (extra) { y += 4.5; doc.text(pdfTxt('Filter: ' + extra), 10, y); }
      y += 4.5;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
      doc.text(pdfTxt('Total ' + rows.length + ' trip   |   Early ' + cs.Early + ' (' + pct(cs.Early, judged) + ')   |   Ontime ' + cs.Ontime + ' (' + pct(cs.Ontime, judged) + ')   |   Late ' + cs.Late + ' (' + pct(cs.Late, judged) + ')'), 10, y);

      const body = rows.map(function (r, i) {
        return EXP_COLS.map(function (col, ci) { return pdfTxt(ci === 0 ? i + 1 : col.f(r)); });
      });
      const colors = { Early: [21, 128, 61], Ontime: [29, 78, 216], Late: [185, 28, 28] };
      doc.autoTable({
        head: [EXP_COLS.map(function (c) { return c.h; })],
        body: body,
        startY: y + 3.5,
        theme: 'grid',
        margin: { left: 10, right: 10, top: 12, bottom: 12 },
        styles: { fontSize: 6.5, cellPadding: 1.2, overflow: 'linebreak', valign: 'middle', lineColor: [226, 232, 240], lineWidth: 0.1, textColor: [30, 41, 59] },
        headStyles: { fillColor: [100, 116, 139], textColor: 255, halign: 'center', fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 5: { halign: 'center' }, 8: { halign: 'center' }, 9: { halign: 'center' }, 10: { halign: 'center' }, 11: { halign: 'center' }, 12: { halign: 'center' }, 13: { halign: 'center' }, 14: { halign: 'center' } },
        didParseCell: function (d) {
          if (d.section === 'body' && d.column.index === EXP_STATUS_COL && colors[d.cell.raw]) {
            d.cell.styles.textColor = colors[d.cell.raw]; d.cell.styles.fontStyle = 'bold';
          }
        }
      });

      const n = doc.getNumberOfPages();
      const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
      const stamp = new Date().toLocaleString('id-ID');
      for (let i = 1; i <= n; i++) {
        doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
        doc.text('Dicetak: ' + stamp + '  |  Internal Palangka Raya DC', 10, ph - 6);
        doc.text('Halaman ' + i + ' / ' + n, pw - 10, ph - 6, { align: 'right' });
      }

      const safe = function (x) { return String(x).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
      const fname = 'Inbound_' + safe(EXP_STATUS_LABEL[expStatus]) + '_' + safe(vendorLbl) + '_' + (selVal('sumFrom') || 'awal') + '_sd_' + (selVal('sumTo') || 'akhir') + '.pdf';
      doc.save(fname);
      showToast('PDF berhasil dibuat: ' + fname, 'ok');
      closeExportPreview();
    } catch (e) {
      console.error(e);
      showToast('Gagal membuat PDF: ' + e.message, 'err');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('expStatusSeg').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      expStatus = b.getAttribute('data-v'); renderExportPreview();
    });
    document.getElementById('expVendorSeg').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      expVendorMode = b.getAttribute('data-m'); renderExportPreview();
    });
    document.getElementById('expVendorSel').addEventListener('change', function () { expVendor = this.value; renderExportPreview(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeExportPreview(); });
  });

  document.addEventListener('DOMContentLoaded', function () {
    setDefaultPeriod();
    ['sumFrom', 'sumTo', 'sumVendor', 'sumShiftSel', 'sumType', 'sumStatus'].forEach(function (id) { document.getElementById(id).addEventListener('change', renderAll); });
    document.getElementById('sumSearch').addEventListener('input', renderAll);
    document.getElementById('sumBtnReset').addEventListener('click', function () {
      setDefaultPeriod(); document.getElementById('sumSearch').value = ''; ['sumVendor', 'sumShiftSel', 'sumType', 'sumStatus'].forEach(function (id) { document.getElementById(id).value = ''; }); renderAll();
    });
    loadSummary();
    setInterval(loadSummary, SUM_AUTO_REFRESH_MS);
  });
