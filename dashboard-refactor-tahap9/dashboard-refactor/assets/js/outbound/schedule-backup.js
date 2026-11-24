
/* ===== Backup & Riwayat Perubahan Schedule Outbound (Firebase) ===== */
(function () {
  const BASE = FB_OUTBOUND_ROOT + '/scheduleBackup';
  const TZ = 'Asia/Jakarta';
  const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const LABEL = { i: 'Sch Indicator', l: 'LH Scheme', r: 'Route', s: 'Slot', u: 'Unit Type', e: 'ETD Origin', d: 'Active Day' };
  const CMP_FIELDS = ['i', 'l', 'u', 'e', 'd'];

  let latestRows = null, authed = false, running = false, listenerOn = false, pendingForce = null;

  const db = () => firebase.database();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  function normTime(v) { const m = /^(\d{1,2}):(\d{2})/.exec(v); return m ? m[1].padStart(2, '0') + ':' + m[2] : v; }
  function normDays(v) {
    const parts = clean(v).split(/\s*[,;]\s*/).filter(Boolean);
    const idx = x => { const k = DAY_ORDER.findIndex(d => x.toLowerCase().startsWith(d.toLowerCase())); return k < 0 ? 99 : k; };
    return parts.sort((a, b) => idx(a) - idx(b)).join(',');
  }
  function normRow(r) {
    return { i: clean(r.ind), l: clean(r.lh), r: clean(r.route), s: clean(r.slot), u: clean(r.unit), e: normTime(clean(r.etd)), d: normDays(r.days) };
  }
  const keyOf = r => r.r + '|' + r.s + '|' + r.d;
  function hashRows(rows) {
    const str = JSON.stringify(rows);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16) + '-' + str.length;
  }
  function sortRows(rows) { return rows.slice().sort((a, b) => (keyOf(a) + a.l + a.u).localeCompare(keyOf(b) + b.l + b.u)); }
  const dateKey = ms => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  const timeLabel = ms => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)).replace('.', ':');
  const dateLabel = ms => new Date(ms).toLocaleDateString('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const toArr = v => Array.isArray(v) ? v.filter(Boolean) : (v ? Object.values(v) : []);

  function diffRows(oldRows, newRows) {
    const index = rows => { const m = new Map(), cnt = {}; rows.forEach(r => { const k = keyOf(r); cnt[k] = (cnt[k] || 0) + 1; m.set(k + '#' + cnt[k], r); }); return m; };
    const om = index(oldRows), nm = index(newRows);
    const changes = [];
    const removed = [], added = [];
    om.forEach((o, k) => {
      const n = nm.get(k);
      if (!n) { removed.push(o); return; }
      const f = CMP_FIELDS.filter(x => o[x] !== n[x]);
      if (f.length) changes.push({ type: 'changed', route: n.r, slot: n.s, fields: f, before: o, after: n });
    });
    nm.forEach((n, k) => { if (!om.has(k)) added.push(n); });
    // pasangkan sisa (route+slot sama, tapi hari berubah) sebagai "changed"
    const used = new Set();
    removed.forEach(o => {
      const j = added.findIndex((n, idx) => !used.has(idx) && n.r === o.r && n.s === o.s);
      if (j >= 0) {
        used.add(j);
        const n = added[j];
        const f = CMP_FIELDS.filter(x => o[x] !== n[x]);
        changes.push({ type: 'changed', route: n.r, slot: n.s, fields: f, before: o, after: n });
      } else changes.push({ type: 'removed', route: o.r, slot: o.s, before: o });
    });
    added.forEach((n, idx) => { if (!used.has(idx)) changes.push({ type: 'added', route: n.r, slot: n.s, after: n }); });
    changes.sort((a, b) => (a.route + '|' + a.slot).localeCompare(b.route + '|' + b.slot, undefined, { numeric: true }));
    return changes;
  }

  function toast(msg, kind) { if (typeof showToast === 'function') showToast(msg, kind || 'info'); else console.log(msg); }

  async function commit(rawRows, force) {
    if (running) return;
    running = true;
    try {
      const rows = sortRows(rawRows.map(normRow));
      if (!rows.length) return;
      const hash = hashRows(rows);
      const curSnap = await db().ref(BASE + '/current').once('value');
      const cur = curSnap.val();
      if (cur && cur.hash === hash) { hideGuard(); return; }
      if (cur && !force && cur.count > 10 && rows.length < cur.count * 0.5) {
        showGuard(cur.count, rows.length);
        return;
      }
      hideGuard();
      const now = Date.now(), vid = 'v' + now;
      await db().ref(BASE + '/versions/' + vid).set({ createdAt: now, count: rows.length, hash: hash, rows: rows });
      let oldVal = null;
      const res = await db().ref(BASE + '/current').transaction(function (c) {
        if (c && c.hash === hash) return; // sudah disimpan device lain
        oldVal = c;
        return { hash: hash, versionId: vid, updatedAt: now, count: rows.length };
      });
      if (!res.committed) return;
      const user = firebase.auth().currentUser;
      const by = user ? (user.displayName || user.email || 'user') : 'user';
      const entry = { at: now, dateKey: dateKey(now), by: by, versionId: vid };
      if (!oldVal) {
        entry.kind = 'baseline';
        entry.summary = { added: 0, removed: 0, changed: 0, total: rows.length };
      } else {
        const oldSnap = await db().ref(BASE + '/versions/' + oldVal.versionId).once('value');
        const oldRows = toArr((oldSnap.val() || {}).rows);
        const changes = diffRows(oldRows, rows);
        if (!changes.length) return;
        entry.kind = 'change';
        entry.prevVersionId = oldVal.versionId;
        entry.summary = {
          added: changes.filter(c => c.type === 'added').length,
          removed: changes.filter(c => c.type === 'removed').length,
          changed: changes.filter(c => c.type === 'changed').length,
          total: rows.length
        };
        entry.changes = changes;
      }
      await db().ref(BASE + '/changelog').push(entry);
      if (entry.kind === 'change') toast('📅 Schedule Outbound berubah — ' + entry.summary.added + ' slot baru, ' + entry.summary.removed + ' slot dihapus, ' + entry.summary.changed + ' berubah.', 'info');
    } catch (e) {
      console.error('Gagal backup schedule ke Firebase:', e);
    } finally { running = false; }
  }

  function showGuard(oldN, newN) {
    const el = document.getElementById('schedGuardBanner');
    if (!el) return;
    el.classList.remove('hidden');
    window.toggleSchedHistory(true);
    el.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-1"></i>Data Sheet turun drastis (<b>' + oldN + '</b> → <b>' + newN + '</b> baris), jadi <b>belum disimpan</b> sebagai perubahan (jaga-jaga kalau Sheet lagi diedit/error). ' +
      '<button type="button" class="ml-2 px-2 py-0.5 rounded bg-amber-600 text-white font-bold hover:bg-amber-500" onclick="schedForceSave()">Simpan sebagai perubahan</button>';
  }
  function hideGuard() { const el = document.getElementById('schedGuardBanner'); if (el) { el.classList.add('hidden'); el.innerHTML = ''; } }
  window.toggleSchedHistory = function (forceOpen) {
    const pnl = document.getElementById('schedHistPanel');
    if (!pnl) return;
    if (pnl.parentNode !== document.body) document.body.appendChild(pnl); // biar fixed overlay nggak ketahan container lain
    const open = typeof forceOpen === 'boolean' ? forceOpen : pnl.classList.contains('hidden');
    pnl.classList.toggle('hidden', !open);
    pnl.classList.toggle('flex', open);
    if (open) { const d = document.getElementById('schedHistDot'); if (d) d.classList.add('hidden'); }
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { const pnl = document.getElementById('schedHistPanel'); if (pnl && !pnl.classList.contains('hidden')) window.toggleSchedHistory(false); }
  });
  window.schedForceSave = function () { if (latestRows) commit(latestRows, true); };

  function chip(txt, cls) { return '<span class="px-1.5 py-0.5 rounded font-sans font-extrabold text-[12px] ' + cls + '">' + txt + '</span>'; }

  function describe(c) {
    const fmt = r => esc(r.e || '-') + ' • ' + esc(r.u || '-') + ' • ' + esc(r.d || '-') + (r.i ? ' • ' + esc(r.i) : '');
    if (c.type === 'added') return '<span class="text-emerald-600 dark:text-emerald-400 font-bold">+ Slot ditambah</span> — ' + fmt(c.after);
    if (c.type === 'removed') return '<span class="text-rose-600 dark:text-rose-400 font-bold">− Slot dikurangi</span> — ' + fmt(c.before);
    return toArr(c.fields).map(f => '<b>' + LABEL[f] + ':</b> <span class="line-through text-rose-500">' + esc(c.before[f] || '-') + '</span> → <b class="text-emerald-600 dark:text-emerald-400">' + esc(c.after[f] || '-') + '</b>').join('<br>');
  }

  const CMP_COLS = ['i', 'l', 'u', 'e', 'd'];
  const evMap = {}, verCache = new Map();
  let autoOpened = false;
  const daysShow = d => (d && d.split(',').length === 7) ? 'Setiap Hari' : d;

  async function getVersion(vid) {
    if (verCache.has(vid)) return verCache.get(vid);
    const snap = await db().ref(BASE + '/versions/' + vid).once('value');
    const rows = toArr((snap.val() || {}).rows);
    verCache.set(vid, rows);
    return rows;
  }

  function alignRoute(oldR, newR) {
    const idx = rows => { const m = new Map(), c = {}; rows.forEach(r => { const k = r.s + '|' + r.d; c[k] = (c[k] || 0) + 1; m.set(k + '#' + c[k], r); }); return m; };
    const om = idx(oldR), nm = idx(newR), out = [], rem = [], add = [];
    om.forEach((o, k) => {
      const n = nm.get(k);
      if (!n) { rem.push(o); return; }
      out.push({ st: CMP_COLS.some(f => o[f] !== n[f]) ? 'changed' : 'same', b: o, a: n });
    });
    nm.forEach((n, k) => { if (!om.has(k)) add.push(n); });
    const used = new Set();
    rem.forEach(o => {
      const j = add.findIndex((n, i) => !used.has(i) && n.s === o.s);
      if (j >= 0) { used.add(j); out.push({ st: 'changed', b: o, a: add[j] }); }
      else out.push({ st: 'removed', b: o, a: null });
    });
    add.forEach((n, i) => { if (!used.has(i)) out.push({ st: 'added', b: null, a: n }); });
    out.sort((x, y) => { const rx = x.a || x.b, ry = y.a || y.b; return String(rx.s).localeCompare(String(ry.s), undefined, { numeric: true }) || String(rx.d).localeCompare(String(ry.d)); });
    return out;
  }

  function sideCells(r, other, side, st) {
    if (!r) return '<td colspan="5" class="text-center text-slate-300 dark:text-slate-600 ' + (side === 'a' ? 'border-l-2 border-slate-300 dark:border-slate-600' : '') + '">—</td>';
    return CMP_COLS.map((f, i) => {
      let cls = 'text-slate-900 dark:text-slate-100 font-semibold';
      if (st === 'changed' && other && r[f] !== other[f]) cls = side === 'b' ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 line-through font-extrabold' : 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-extrabold';
      else if (st === 'added') cls = 'text-emerald-800 dark:text-emerald-200 font-bold';
      else if (st === 'removed') cls = 'text-rose-800 dark:text-rose-200 font-bold';
      if (i === 0 && side === 'a') cls += ' border-l-2 border-slate-300 dark:border-slate-600';
      const val = f === 'd' ? daysShow(r[f]) : r[f];
      return '<td class="font-sans ' + cls + '">' + esc(val || '-') + '</td>';
    }).join('');
  }

  function buildCompareHtml(oldRows, newRows, changes) {
    const routes = Array.from(new Set(toArr(changes).map(c => c.route))).sort((a, b) => a.localeCompare(b));
    const head2 = ['Sch', 'LH Scheme', 'Unit Type', 'ETD Origin', 'Active Day'];
    return routes.map(route => {
      const al = alignRoute(oldRows.filter(r => r.r === route), newRows.filter(r => r.r === route));
      const nC = al.filter(x => x.st === 'changed').length, nA = al.filter(x => x.st === 'added').length, nR = al.filter(x => x.st === 'removed').length;
      const body = al.map(x => {
        const slot = (x.a || x.b).s;
        const rowBg = x.st === 'added' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : x.st === 'removed' ? 'bg-rose-50/60 dark:bg-rose-950/20' : x.st === 'same' ? '' : '';
        const tag = x.st === 'added' ? chip('BARU', 'bg-emerald-600 text-white') : x.st === 'removed' ? chip('DIHAPUS', 'bg-rose-600 text-white') : x.st === 'changed' ? chip('BERUBAH', 'bg-amber-600 text-white') : '';
        return '<tr class="' + rowBg + '"><td class="font-extrabold text-[15px] text-amber-700 dark:text-amber-300 text-center">' + esc(slot) + (tag ? '<div class="mt-0.5">' + tag + '</div>' : '') + '</td>' +
          sideCells(x.b, x.a, 'b', x.st) + sideCells(x.a, x.b, 'a', x.st) + '</tr>';
      }).join('');
      return '<div class="schedRouteCard mb-4 rounded-lg overflow-hidden">' +
        '<div class="px-3 py-2 bg-slate-100 dark:bg-slate-800 flex flex-wrap items-center gap-2 text-[15px] font-sans font-extrabold text-slate-900 dark:text-white"><i class="fa-solid fa-route text-amber-500"></i>' + esc(route) +
        (nC ? chip(nC + ' berubah', 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100') : '') +
        (nA ? chip(nA + ' baru', 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100') : '') +
        (nR ? chip(nR + ' dihapus', 'bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100') : '') + '</div>' +
        '<div class="overflow-x-auto"><table class="w-full text-[14px] text-slate-900 dark:text-slate-100"><thead>' +
        '<tr class="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100"><th rowspan="2" class="w-20 text-center font-extrabold">Slot</th><th colspan="5" class="text-center bg-rose-200 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-extrabold tracking-wide">SEBELUM</th><th colspan="5" class="text-center bg-emerald-200 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-extrabold tracking-wide border-l-2 border-slate-300 dark:border-slate-600">SESUDAH</th></tr>' +
        '<tr class="bg-slate-100 dark:bg-slate-900 font-extrabold text-slate-900 dark:text-slate-100">' + head2.map(h => '<th class="text-center">' + h + '</th>').join('') + head2.map((h, i) => '<th class="text-center' + (i === 0 ? ' border-l-2 border-slate-300 dark:border-slate-600' : '') + '">' + h + '</th>').join('') + '</tr>' +
        '</thead><tbody>' + body + '</tbody></table></div></div>';
    }).join('');
  }

  async function loadCompare(box) {
    if (box.dataset.done) return;
    const ev = evMap[box.dataset.evk];
    if (!ev) return;
    box.innerHTML = '<div class="p-3 text-center text-[13px] text-slate-400 font-sans">Memuat perbandingan...</div>';
    try {
      const [oldRows, newRows] = await Promise.all([getVersion(ev.prevVersionId), getVersion(ev.versionId)]);
      box.innerHTML = buildCompareHtml(oldRows, newRows, ev.changes);
      box.dataset.done = '1';
    } catch (e) {
      console.error('Gagal muat perbandingan:', e);
      box.innerHTML = '<div class="p-3 text-center text-[13px] text-rose-500 font-sans">Gagal memuat versi lama/baru dari Firebase.</div>';
    }
  }

  function renderHistory(events) {
    const list = document.getElementById('schedHistList');
    const badge = document.getElementById('schedHistCount');
    if (!list) return;
    const openKeys = Array.from(list.querySelectorAll('details[open]')).map(d => d.dataset.evk);
    events.forEach(ev => { evMap[ev._k] = ev; });
    const changesOnly = events.filter(e => e.kind === 'change');
    badge.textContent = changesOnly.length + ' perubahan';
    const bc = document.getElementById('schedHistBtnCount'); if (bc) bc.textContent = changesOnly.length;
    const last = changesOnly[changesOnly.length - 1];
    const dot = document.getElementById('schedHistDot');
    const pnl = document.getElementById('schedHistPanel');
    if (dot && last && (Date.now() - last.at) < 24 * 3600 * 1000 && pnl && pnl.classList.contains('hidden')) dot.classList.remove('hidden');
    if (!events.length) { list.innerHTML = '<div class="p-4 text-center text-[11px] text-slate-400 dark:text-slate-500 font-sans">Belum ada riwayat. Baseline pertama akan disimpan otomatis.</div>'; return; }
    let html = '', lastDate = '';
    events.slice().reverse().forEach(ev => {
      if (ev.dateKey !== lastDate) {
        lastDate = ev.dateKey;
        html += '<div class="px-3 py-1 bg-slate-100 dark:bg-slate-800/70 text-[12px] font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100 font-sans sticky top-0 z-10">' + esc(dateLabel(ev.at)) + '</div>';
      }
      const sm = ev.summary || {};
      if (ev.kind === 'baseline') {
        html += '<div class="px-3 py-2.5 flex items-center gap-2 text-[13px] font-sans text-slate-600 dark:text-slate-300"><span class="font-bold font-mono">' + timeLabel(ev.at) + ' WIB</span>' +
          chip('Baseline awal', 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200') + '<span>' + (sm.total || 0) + ' baris tersimpan</span>' +
          '<button type="button" class="ml-auto text-[12px] font-bold px-2.5 py-1 rounded bg-slate-800 text-white hover:bg-slate-700" onclick="schedDownloadVersion(\'' + ev.versionId + '\',\'' + ev.dateKey + '_baseline\')"><i class="fa-solid fa-download mr-1"></i>Unduh</button></div>';
        return;
      }
      html += '<details data-evk="' + ev._k + '"><summary class="cursor-pointer px-3 py-2.5 flex flex-wrap items-center gap-2 text-[13px] font-sans hover:bg-slate-50 dark:hover:bg-slate-800/60">' +
        '<i class="fa-solid fa-chevron-right schedChev text-[9px] text-slate-400"></i>' +
        '<span class="font-extrabold font-mono text-slate-900 dark:text-white">' + timeLabel(ev.at) + ' WIB</span>' +
        (sm.added ? chip('+' + sm.added + ' slot ditambah', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300') : '') +
        (sm.removed ? chip('−' + sm.removed + ' slot dikurangi', 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300') : '') +
        (sm.changed ? chip(sm.changed + ' berubah', 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300') : '') +
        '<span class="text-[12px] font-bold text-sky-600 dark:text-sky-400 underline">klik: lihat perbandingan</span>' +
        '<span class="ml-auto text-[12px] font-semibold text-slate-600 dark:text-slate-300">terdeteksi oleh ' + esc(ev.by || '-') + '</span></summary>' +
        '<div class="px-3 pb-3"><div class="flex gap-2 mb-2">' +
        (ev.prevVersionId ? '<button type="button" class="text-[12px] font-bold px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600" onclick="schedDownloadVersion(\'' + ev.prevVersionId + '\',\'' + ev.dateKey + '_lama\')"><i class="fa-solid fa-download mr-1"></i>Unduh data lama</button>' : '') +
        '<button type="button" class="text-[12px] font-bold px-2.5 py-1 rounded bg-slate-800 text-white hover:bg-slate-700" onclick="schedDownloadVersion(\'' + ev.versionId + '\',\'' + ev.dateKey + '_baru\')"><i class="fa-solid fa-download mr-1"></i>Unduh data baru</button></div>' +
        '<div class="schedCmpBox" data-evk="' + ev._k + '"><div class="p-3 text-center text-[13px] text-slate-400 font-sans">Memuat perbandingan...</div></div></div></details>';
    });
    list.innerHTML = html;
    openKeys.forEach(k => { const d = list.querySelector('details[data-evk="' + k + '"]'); if (d) d.open = true; });
    if (!autoOpened && last) { autoOpened = true; const d = list.querySelector('details[data-evk="' + last._k + '"]'); if (d) d.open = true; }
  }

  window.schedDownloadVersion = async function (vid, label) {
    try {
      const snap = await db().ref(BASE + '/versions/' + vid).once('value');
      const v = snap.val();
      if (!v || !v.rows) { toast('⚠️ Versi tidak ditemukan.', 'info'); return; }
      const rows = toArr(v.rows).map(r => ({ 'Sch Indicator': r.i, 'LH Scheme': r.l, 'Route': r.r, 'Slot': r.s, 'Unit Type': r.u, 'ETD Origin': r.e, 'Schedule Active Day': r.d }));
      const ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
      XLSX.writeFile(wb, 'Schedule_Outbound_' + label + '.xlsx');
    } catch (e) { console.error(e); toast('⚠️ Gagal unduh versi.', 'info'); }
  };

  function attachListener() {
    if (listenerOn) return;
    listenerOn = true;
    const hl = document.getElementById('schedHistList');
    if (hl) hl.addEventListener('toggle', function (e) {
      const d = e.target;
      if (!d || d.tagName !== 'DETAILS' || !d.open) return;
      const box = d.querySelector('.schedCmpBox');
      if (box) loadCompare(box);
    }, true);
    db().ref(BASE + '/changelog').orderByKey().limitToLast(100).on('value', function (snap) {
      const arr = [];
      snap.forEach(ch => { const v = ch.val(); v._k = ch.key; arr.push(v); });
      renderHistory(arr);
    }, function (err) {
      console.error('Gagal baca riwayat schedule:', err);
      const list = document.getElementById('schedHistList');
      if (list) list.innerHTML = '<div class="p-4 text-center text-[13px] text-rose-500 font-sans">Gagal baca riwayat dari Firebase (cek Rules untuk path ' + esc(BASE) + ').</div>';
    });
  }

  function maybeRun() {
    if (!authed) return;
    attachListener();
    if (latestRows && latestRows.length) commit(latestRows, false);
  }

  window.schedAfterLoad = function (rows) { latestRows = rows.slice(); maybeRun(); };

  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(function (user) { authed = !!user; maybeRun(); });
  }
})();
