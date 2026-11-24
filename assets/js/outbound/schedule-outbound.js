
/* ===== Schedule Outbound (Google Sheet: Schedule V.5) ===== */
(function () {
  const SCHED_SHEET_ID = '1vuJf4-_9sVpWI2WnokZxVCcOyIrnci-qQckxoabNQ8w';
  const SCHED_SHEET_NAME = 'Schedule V.5';
  const SCHED_SHEET_GID = '1130982389';
  // Index kolom (0-based): B=1, C=2, D=3, E=4, U=20, X=23, AC=28, AP=41
  const COL = { cot: 1, ind: 2, lh: 3, route: 4, slot: 20, unit: 23, etd: 28, days: 41 };

  let schedRows = [];

  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

  const DAY_MAP = [
    ['sun', 'min'], ['mon', 'sen'], ['tue', 'sel'], ['wed', 'rab'], ['thu', 'kam'], ['fri', 'jum'], ['sat', 'sab']
  ];
  function isActiveToday(daysStr) {
    const s = String(daysStr || '').toLowerCase();
    if (!s) return false;
    if (/daily|everyday|setiap hari|all/.test(s)) return true;
    const d = DAY_MAP[new Date().getDay()];
    return s.split(/[,;/&\s]+/).some(tok => tok && (tok.startsWith(d[0]) || tok.startsWith(d[1])));
  }

  // ===== Next Slot & Next Depart: ETD Origin terdekat (>= jam lokal device) per route =====
  function activeOnDate(daysStr, date) {
    const s = String(daysStr || '').toLowerCase().trim();
    if (!s || /daily|everyday|setiap hari|all/.test(s)) return true;
    const d = DAY_MAP[date.getDay()];
    return s.split(/[,;/&\s]+/).some(tok => tok && (tok.startsWith(d[0]) || tok.startsWith(d[1])));
  }
  const nrm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  function destOf(route) { const i = String(route || '').indexOf('>'); return nrm(i >= 0 ? String(route).slice(i + 1) : route); }
  function hubsOfDest(dest) { return Array.from(new Set(dest.split(/\s*>\s*|\s+-\s+/).filter(Boolean))); }
  function parseEtd(s) { const m = String(s || '').match(/(\d{1,2})[:.](\d{2})/); return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null; }
  window.schedNextDeparture = function (label, hubs, nowDate) {
    const now = nowDate || new Date();
    const lab = nrm(label);
    const hubSet = new Set((hubs || []).map(nrm));
    let rows = schedRows.filter(r => nrm(r.route) === lab || destOf(r.route) === lab);
    if (!rows.length) rows = schedRows.filter(r => { const h = hubsOfDest(destOf(r.route)); return h.length === hubSet.size && h.every(x => hubSet.has(x)); });
    rows = rows.filter(r => !/^off$/i.test(String(r.ind || '').trim()) && parseEtd(r.etd));
    if (!rows.length) return null;
    for (let off = 0; off <= 7; off++) {
      const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
      let best = null;
      rows.forEach(r => {
        if (!activeOnDate(r.days, base)) return;
        const hm = parseEtd(r.etd);
        const t = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hm[0], hm[1]);
        if (t < now) return;
        if (!best || t < best.t) best = { t: t, r: r };
      });
      if (best) {
        const hm = parseEtd(best.r.etd);
        return { slot: best.r.slot, cot: best.r.cot || '', etd: String(hm[0]).padStart(2, '0') + ':' + String(hm[1]).padStart(2, '0'), mins: Math.round((best.t - now) / 60000), off: off };
      }
    }
    return null;
  };
  // ===== end Next Slot & Next Depart =====

  function renderDays(daysStr) {
    const parts = String(daysStr || '').split(/[,;]+/).map(x => x.trim()).filter(Boolean);
    if (parts.length === 7) parts.splice(0, 7, 'Setiap Hari');
    if (!parts.length) return '<span class="text-slate-400">-</span>';
    return parts.map(p => `<span class="inline-block px-1.5 py-0.5 mr-1 mb-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900 font-sans font-semibold text-[10px]">${esc(p)}</span>`).join('');
  }

  function cotBadge(v) {
    const x = String(v || '').trim();
    if (!x) return '<span class="text-slate-400">-</span>';
    const gh = /golden/i.test(x);
    const cls = gh ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    return `<span class="inline-block px-1.5 py-0.5 rounded border font-sans font-bold text-[10px] whitespace-nowrap ${cls}">${gh ? '<i class="fa-solid fa-star text-[8px] mr-1"></i>' : ''}${esc(x)}</span>`;
  }

  function indBadge(v) {
    const x = String(v || '').trim();
    if (!x) return '<span class="text-slate-400">-</span>';
    const on = /^on$/i.test(x), off = /^off$/i.test(x);
    const cls = on ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
      : off ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    return `<span class="inline-block px-1.5 py-0.5 rounded border font-sans font-bold text-[10px] ${cls}">${esc(x)}</span>`;
  }

  function renderSchedule() {
    const body = document.getElementById('scheduleTableBody');
    const info = document.getElementById('schedCountInfo');
    if (!body) return;
    const q = (document.getElementById('schedSearch').value || '').trim().toLowerCase();
    const dayF = document.getElementById('schedDayFilter').value;
    const list = schedRows.filter(r => {
      if (dayF === 'today' && !isActiveToday(r.days)) return false;
      if (!q) return true;
      return (r.cot + ' ' + r.ind + ' ' + r.lh + ' ' + r.route + ' ' + r.slot + ' ' + r.unit + ' ' + r.etd + ' ' + r.days).toLowerCase().includes(q);
    });
    info.textContent = 'Total: ' + list.length + (list.length !== schedRows.length ? ' / ' + schedRows.length : '');
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-slate-400 dark:text-slate-500 font-sans">' + esc(t('ob.sched.empty')) + '</td></tr>';
      return;
    }
    body.innerHTML = list.map((r, i) => `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
      <td class="text-slate-400">${i + 1}</td>
      <td>${cotBadge(r.cot)}</td>
      <td>${indBadge(r.ind)}</td>
      <td class="font-sans text-left pl-2 font-semibold text-slate-700 dark:text-slate-200">${esc(r.lh) || '-'}</td>
      <td class="font-sans text-left pl-2 font-bold text-slate-800 dark:text-slate-100">${esc(r.route) || '-'}</td>
      <td class="font-bold text-amber-600 dark:text-amber-400">${esc(r.slot) || '-'}</td>
      <td class="font-sans font-semibold text-slate-700 dark:text-slate-200">${esc(r.unit) || '-'}</td>
      <td class="font-bold text-sky-700 dark:text-sky-300">${esc(r.etd) || '-'}</td>
      <td class="text-left pl-2">${renderDays(r.days)}</td>
    </tr>`).join('');
  }

  function setMsg(msg) {
    const body = document.getElementById('scheduleTableBody');
    if (body) body.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-rose-500 font-sans">' + msg + '</td></tr>';
  }

  const SCHED_BASE = 'https://docs.google.com/spreadsheets/d/' + SCHED_SHEET_ID;

  // Percobaan 1 & 2: fetch CSV (gviz lalu export)
  async function fetchRowsCsv() {
    const urls = [
      SCHED_BASE + '/gviz/tq?tqx=out:csv&gid=' + SCHED_SHEET_GID,
      SCHED_BASE + '/export?format=csv&gid=' + SCHED_SHEET_GID
    ];
    let lastErr;
    for (const u of urls) {
      try {
        const res = await fetch(u + '&_=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('Sheet belum public');
        return parseCSV(text);
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  }

  // Percobaan 3: JSONP via <script> (tidak kena CORS)
  function fetchRowsJsonp() {
    return new Promise((resolve, reject) => {
      const cb = '__schedCb' + Date.now();
      const sc = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('JSONP timeout')); }, 15000);
      function cleanup() { clearTimeout(timer); try { delete window[cb]; } catch (_) { window[cb] = undefined; } sc.remove(); }
      window[cb] = function (resp) {
        cleanup();
        if (!resp || resp.status === 'error' || !resp.table) { reject(new Error('JSONP error: ' + JSON.stringify((resp && resp.errors) || resp))); return; }
        resolve(resp.table.rows.map(r => (r.c || []).map(c => c ? (c.f != null ? c.f : (c.v != null ? c.v : '')) : '')));
      };
      sc.onerror = function () { cleanup(); reject(new Error('JSONP diblokir')); };
      sc.src = SCHED_BASE + '/gviz/tq?tqx=out:json;responseHandler:' + cb + '&headers=0&gid=' + SCHED_SHEET_GID;
      document.head.appendChild(sc);
    });
  }

  let schedLoading = false, schedLastSig = null, schedLastLoadAt = 0;
  const SCHED_POLL_MS = 30 * 1000; // auto-refresh tiap 30 detik
  async function loadSchedule(isManual) {
    if (schedLoading) return;
    schedLoading = true;
    const btn = document.getElementById('schedRefreshBtn');
    const upd = document.getElementById('schedUpdatedInfo');
    if (btn) btn.disabled = true;
    const errs = [];
    let all = null;
    try { all = await fetchRowsCsv(); } catch (e) { errs.push('CSV: ' + e.message); }
    if (!all) { try { all = await fetchRowsJsonp(); } catch (e) { errs.push('JSONP: ' + e.message); } }
    if (all) {
      // header = baris yang kolom D-nya "LH Scheme"; data mulai setelahnya
      let start = all.findIndex(r => /lh\s*scheme/i.test(String(r[COL.lh] || '')));
      start = start >= 0 ? start + 1 : 2;
      const get = (r, i) => String(r[i] == null ? '' : r[i]).trim();
      schedRows = all.slice(start).map(r => ({
        cot: get(r, COL.cot), ind: get(r, COL.ind), lh: get(r, COL.lh), route: get(r, COL.route), slot: get(r, COL.slot),
        unit: get(r, COL.unit), etd: get(r, COL.etd), days: get(r, COL.days)
      })).filter(r => /\S\s*>\s*\S/.test(r.route)); // buang baris kosong & catatan (mis. "Live 13 Nov")
      const sig = new Date().getDay() + '|' + JSON.stringify(schedRows.map(r => [r.cot, r.ind, r.lh, r.route, r.slot, r.unit, r.etd, r.days]));
      const changed = sig !== schedLastSig || isManual === true;
      schedLastSig = sig;
      if (changed) {
        if (window.schedRoutesChanged) window.schedRoutesChanged(schedRows);
        renderSchedule();
        if (window.schedAfterLoad) window.schedAfterLoad(schedRows);
      }
      schedLastLoadAt = Date.now();
      if (window.updateNextDepartCells) window.updateNextDepartCells();
      if (upd) upd.textContent = 'Last sync: ' + new Date().toLocaleString('id-ID') + ' • Sheet: ' + SCHED_SHEET_NAME;
    } else {
      console.error('Gagal load Schedule Outbound:', errs);
      if (schedRows.length) {
        if (upd) upd.textContent = 'Gagal refresh (' + errs.join(' | ') + ') — menampilkan data terakhir yang berhasil dimuat.';
      } else setMsg('Gagal load Schedule (' + esc(errs.join(' | ')) + ') — <a class="underline" target="_blank" rel="noopener" href="' + SCHED_BASE + '/edit#gid=' + SCHED_SHEET_GID + '">buka Sheet</a>');
    }
    if (btn) btn.disabled = false;
    schedLoading = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('schedSearch').addEventListener('input', renderSchedule);
    document.getElementById('schedDayFilter').addEventListener('change', renderSchedule);
    document.getElementById('schedRefreshBtn').addEventListener('click', function () { loadSchedule(true); });
    loadSchedule(true);
    setInterval(function () { if (!document.hidden) loadSchedule(); }, SCHED_POLL_MS);
    // begitu tab dibuka lagi / koneksi balik, langsung refresh kalau data sudah > 10 detik
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && Date.now() - schedLastLoadAt > 10 * 1000) loadSchedule();
    });
    window.addEventListener('online', function () { loadSchedule(); });
  });
})();
