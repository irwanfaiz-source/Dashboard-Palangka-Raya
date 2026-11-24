
// ==== STATISTIK PACKED OPERATOR (TOP 20) — dibuka dari klik Hall of Fame ====
// Daily / Weekly / Monthly dihitung dari pbMonthlyRecords (bulan yang lagi dibuka, sama kayak tabel utama).
// Hourly dibaca on-demand dari hourlyRecords/{tanggal} + hourlyCoverage.
(function () {
  var TOP_N = 20;
  var sel = { tab: 'daily', daily: '', weekly: '', hourlyDate: '', hourFrom: '', hourTo: '' };
  var coverage = null;   // { 'YYYY-MM-DD': { h08: true, ... } }
  var hourCache = {};    // { 'YYYY-MM-DD': { opsId: { h08: n } } }
  var reqId = 0;         // buang hasil async yang udah basi

  function $(id) { return document.getElementById(id); }
  function fmt(n) { return Number(n).toLocaleString('id-ID'); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function p2(n) { return String(n).padStart(2, '0'); }
  function parseD(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function shortD(s) { var d = parseD(s); return p2(d.getDate()) + ' ' + getMonthNames()[d.getMonth()]; }
  function weekStart(s) {
    var d = parseD(s);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Senin
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }
  function targetOf(status) { return ACHIEVEMENT_THRESHOLD[status] || ACHIEVEMENT_THRESHOLD['DW On Call']; }
  function isOpen() { return $('pbStatModal').classList.contains('active'); }

  // tanggal di bulan aktif yang ada packed > 0, urut naik
  function activeDates() {
    return Object.keys(pbMonthlyRecords).filter(function (d) {
      var day = pbMonthlyRecords[d] || {};
      return Object.keys(day).some(function (o) { return (day[o].packed || 0) > 0; });
    }).sort();
  }

  // minggu (Senin–Minggu) dalam bulan aktif; n = minggu ke-berapa di kalender bulan itu
  function weeksOfMonth() {
    var g = {};
    activeDates().forEach(function (d) { var k = weekStart(d); (g[k] = g[k] || []).push(d); });
    return Object.keys(g).sort().map(function (k) {
      var first = g[k][0].slice(0, 7) + '-01';
      var n = Math.round((parseD(k) - parseD(weekStart(first))) / 604800000) + 1;
      return { key: k, n: n, dates: g[k] };
    });
  }

  function calcFromDates(dates, agg) {
    var map = {};
    dates.forEach(function (d) {
      var day = pbMonthlyRecords[d] || {};
      Object.keys(day).forEach(function (o) {
        var packed = day[o].packed || 0;
        if (packed <= 0) return;
        var info = agg[o] || { status: 'DW On Call' };
        map[o] = map[o] || { value: 0, target: 0 };
        map[o].value += packed;
        map[o].target += targetOf(info.status);
      });
    });
    return map;
  }

  function calcHourly(data, from, to, agg) {
    var map = {};
    Object.keys(data || {}).forEach(function (o) {
      var hrs = data[o] || {};
      var info = agg[o] || { status: 'DW On Call' };
      var perHour = Math.round(targetOf(info.status) / 8);
      var value = 0, cnt = 0;
      // rentang jam inklusif: "h16".."h23" dibandingkan sebagai string (selalu 3 karakter)
      Object.keys(hrs).forEach(function (k) {
        if (k < from || k > to) return;
        var v = hrs[k] || 0;
        if (v > 0) { value += v; cnt++; }
      });
      if (value > 0) map[o] = { value: value, target: perHour * cnt, hours: hrs, perHour: perHour };
    });
    return map;
  }

  function rank(map, agg) {
    var rows = Object.keys(map).filter(function (o) { return map[o].value > 0; }).map(function (o) {
      var info = agg[o] || { name: o, agency: '-', status: 'DW On Call' };
      var m = map[o];
      return { opsId: o, name: info.name, agency: info.agency, status: info.status, value: m.value, target: m.target,
        pct: m.target > 0 ? Math.round(m.value / m.target * 100) : 0, hours: m.hours || null, perHour: m.perHour || 0 };
    });
    rows.sort(function (a, b) { return b.value - a.value || String(a.name).localeCompare(String(b.name)); });
    return rows.slice(0, TOP_N);
  }

  function setOptions(selectEl, opts, current) {
    selectEl.innerHTML = opts.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>'; }).join('');
    var has = opts.some(function (o) { return o.v === current; });
    selectEl.value = has ? current : (opts.length ? opts[0].v : '');
    return selectEl.value;
  }

  // deretan kotak per jam di bawah nama operator (khusus tab Hourly)
  function hoursStrip(r, hx) {
    var cells = hx.cols.map(function (k) {
      var v = (r.hours && r.hours[k]) || 0;
      var cls = v > 0 ? (v >= r.perHour ? 'ok' : 'low') : 'none';
      var tip = k.slice(1) + ':00 — ' + (v > 0 ? fmt(v) + ' ' + t('pb.unit.pcs') : '-') + ' · ' + t('pb.stat.perHourTarget') + ' ' + fmt(r.perHour);
      return '<span class="pbs-h ' + cls + (hx.selHour === k ? ' sel' : '') + '" title="' + esc(tip) + '"><em>' + k.slice(1) + ':00</em><b>' + (v > 0 ? fmt(v) : '–') + '</b></span>';
    }).join('');
    return '<div class="pbs-hours">' + cells + '</div>';
  }

  // keterangan di header kolom kiri: tanggal + rentang jam (Hourly) / tanggal / minggu / bulan -> jelas buat yang baca laporan
  function captionText(hx) {
    try {
      if (sel.tab === 'hourly') {
        var d = sel.hourlyDate ? formatTanggalId(sel.hourlyDate) : '';
        var h = '';
        if (hx && hx.from && hx.to) h = hx.from === hx.to ? hx.from.slice(1) + ':00' : hx.from.slice(1) + ':00–' + hx.to.slice(1) + ':00';
        return [d, h].filter(Boolean).join(' · ');
      }
      if (sel.tab === 'monthly') return $('pbSummaryMonth').textContent || '';
      var s1 = $('pbStatSel1');
      return (s1 && s1.selectedOptions && s1.selectedOptions[0]) ? s1.selectedOptions[0].text : '';
    } catch (e) { return ''; }
  }

  function showRows(rows, hx) {
    var list = $('pbStatList');
    var rcol = $('pbsColRight'); if (rcol) rcol.style.visibility = rows.length > 10 ? '' : 'hidden';
    var cap = $('pbsColCaption'); if (cap) cap.textContent = captionText(hx);
    if (!rows.length) {
      $('pbStatKpiTotal').textContent = '0';
      $('pbStatKpiAvg').textContent = '0';
      $('pbStatKpiTop').textContent = '-';
      $('pbStatKpiTopSub').textContent = '';
      list.innerHTML = '<li class="pbs-empty">' + esc(t('pb.stat.empty')) + '</li>';
      return;
    }
    var total = rows.reduce(function (a, r) { return a + r.value; }, 0);
    $('pbStatKpiTotal').textContent = fmt(total);
    $('pbStatKpiAvg').textContent = fmt(Math.round(total / rows.length));
    $('pbStatKpiTop').textContent = rows[0].name;
    $('pbStatKpiTopSub').textContent = fmt(rows[0].value) + ' ' + t('pb.unit.pcs');
    var max = rows[0].value;
    list.innerHTML = rows.map(function (r, i) {
      var medal = i < 3
        ? '<span class="pbx-medal pbx-m' + (i + 1) + '">' + (i + 1) + '</span>'
        : '<span class="pbx-medal pbx-medal-n">' + (i + 1) + '</span>';
      var cls = r.pct >= 100 ? 'ok' : (r.pct >= 90 ? 'mid' : 'low');
      var w = Math.max(2, Math.round(r.value / max * 100));
      return '<li class="pbs-row' + ((hx && hx.cols && hx.cols.length) ? ' has-h' : '') + '" role="button" tabindex="0" data-ops="' + esc(r.opsId) + '">' + medal +
        '<div class="pbs-who"><b title="' + esc(r.name) + '">' + esc(r.name) + '</b><small>' + (r.agency && r.agency !== '-' ? esc(r.agency) + ' · ' : '') + esc(statusLabel(r.status)) + (hx && r.perHour ? ' · ' + esc(t('pb.stat.perHourTarget')) + ' ' + fmt(r.perHour) : '') + '</small></div>' +
        '<div class="pbs-bar"><i class="' + cls + '" style="width:' + w + '%"></i></div>' +
        '<div class="pbs-num"><b>' + fmt(r.value) + '</b><small class="' + cls + '">' + r.pct + '% ' + esc(t('pb.stat.target')) + '</small></div>' +
        (hx && hx.cols && hx.cols.length ? hoursStrip(r, hx) : '') +
        '</li>';
    }).join('');
  }

  function showMessage(msg) {
    showRows([]);
    $('pbStatList').innerHTML = '<li class="pbs-empty">' + esc(msg) + '</li>';
  }

  function ensureCoverage(cb) {
    if (coverage) return cb(null);
    if (!fbDb) return cb(new Error('Belum terhubung ke database online.'));
    fbDb.ref(FB_PB_ROOT + '/hourlyCoverage').once('value').then(function (s) {
      coverage = s.val() || {};
      cb(null);
    }).catch(cb);
  }

  function loadHourlyDay(date, cb) {
    if (hourCache[date]) return cb(null, hourCache[date]);
    if (!fbDb) return cb(new Error('Belum terhubung ke database online.'));
    fbDb.ref(FB_PB_ROOT + '/hourlyRecords/' + date).once('value').then(function (s) {
      hourCache[date] = s.val() || {};
      cb(null, hourCache[date]);
    }).catch(cb);
  }

  function renderHourly(agg, my) {
    showMessage(t('pb.stat.loading'));
    ensureCoverage(function (err) {
      if (my !== reqId) return;
      if (err) { showMessage(t('pb.stat.errorLoad', { msg: err.message })); return; }
      var dates = Object.keys(coverage).filter(function (d) { return Object.keys(coverage[d] || {}).length; }).sort().reverse().slice(0, 60);
      if (!dates.length) { $('pbStatControls').style.display = 'none'; showMessage(t('pb.stat.noHourly')); return; }
      $('pbStatControls').style.display = '';
      sel.hourlyDate = setOptions($('pbStatSel1'), dates.map(function (d) { return { v: d, l: formatTanggalId(d) }; }), sel.hourlyDate);
      var hrs = Object.keys(coverage[sel.hourlyDate] || {}).sort();
      var hopts = hrs.map(function (h) { return { v: h, l: h.slice(1) + ':00' }; });
      // default = seluruh jam yang ada datanya (jam pertama s/d jam terakhir)
      sel.hourFrom = setOptions($('pbStatSel2'), hopts, sel.hourFrom);
      sel.hourTo = setOptions($('pbStatSel3'), hopts, (sel.hourTo && hrs.indexOf(sel.hourTo) !== -1) ? sel.hourTo : hrs[hrs.length - 1]);
      if (sel.hourTo < sel.hourFrom) sel.hourTo = $('pbStatSel3').value = sel.hourFrom;
      var from = sel.hourFrom, to = sel.hourTo;
      var hrsInRange = hrs.filter(function (h) { return h >= from && h <= to; });
      loadHourlyDay(sel.hourlyDate, function (err2, data) {
        if (my !== reqId) return;
        if (err2) { showMessage(t('pb.stat.errorLoad', { msg: err2.message })); return; }
        var ranked = rank(calcHourly(data, from, to, agg), agg);
        // jam yang kosong buat SEMUA operator di Top 20 gak ditampilin, biar kotak jam yang ada bisa lebih lebar
        var usedCols = hrsInRange.filter(function (h) { return ranked.some(function (r) { return r.hours && (r.hours[h] || 0) > 0; }); });
        showRows(ranked, { cols: usedCols.length ? usedCols : hrsInRange, selHour: from === to ? from : null, from: from, to: to });
      });
    });
  }

  function render() {
    if (!isOpen()) return;
    var my = ++reqId;
    var agg = computePbAggregates();
    var tab = sel.tab;
    var ctl = $('pbStatControls'), c1 = $('pbStatCtl1'), c2 = $('pbStatCtl2'), c3 = $('pbStatCtl3'), note = $('pbStatNote');
    var s1 = $('pbStatSel1');

    $('pbStatMonthChip').textContent = $('pbSummaryMonth').textContent || '-';
    Array.prototype.forEach.call(document.querySelectorAll('#pbStatModal .pbs-tab'), function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false');
    });
    ctl.style.display = '';
    c1.style.display = '';
    c2.style.display = 'none';
    c3.style.display = 'none';
    note.textContent = '';
    $('pbStatLegend').style.display = tab === 'hourly' ? '' : 'none';

    if (tab === 'daily') {
      $('pbStatLbl1').textContent = t('pb.stat.date');
      var dates = activeDates().reverse();
      sel.daily = setOptions(s1, dates.map(function (d) { return { v: d, l: formatTanggalId(d) }; }), sel.daily);
      showRows(rank(calcFromDates(sel.daily ? [sel.daily] : [], agg), agg));
    } else if (tab === 'weekly') {
      $('pbStatLbl1').textContent = t('pb.stat.week');
      var weeks = weeksOfMonth().reverse();
      sel.weekly = setOptions(s1, weeks.map(function (w) {
        return { v: w.key, l: t('pb.stat.weekLabel', { n: w.n }) + ' · ' + shortD(w.dates[0]) + ' – ' + shortD(w.dates[w.dates.length - 1]) };
      }), sel.weekly);
      var cur = weeks.filter(function (w) { return w.key === sel.weekly; })[0];
      showRows(rank(calcFromDates(cur ? cur.dates : [], agg), agg));
    } else if (tab === 'monthly') {
      c1.style.display = 'none';
      note.textContent = t('pb.stat.monthNote', { month: $('pbSummaryMonth').textContent || '-' });
      showRows(rank(calcFromDates(activeDates(), agg), agg));
    } else {
      $('pbStatLbl1').textContent = t('pb.stat.date');
      $('pbStatLbl2').textContent = t('pb.stat.hourFrom');
      $('pbStatLbl3').textContent = t('pb.stat.hourTo');
      c2.style.display = '';
      c3.style.display = '';
      renderHourly(agg, my);
    }
  }

  // ---- event ----
  Array.prototype.forEach.call(document.querySelectorAll('#pbStatModal .pbs-tab'), function (b) {
    b.addEventListener('click', function () { sel.tab = b.getAttribute('data-tab'); render(); });
  });
  $('pbStatSel1').addEventListener('change', function () {
    if (sel.tab === 'daily') sel.daily = this.value;
    else if (sel.tab === 'weekly') sel.weekly = this.value;
    else if (sel.tab === 'hourly') { sel.hourlyDate = this.value; sel.hourFrom = ''; sel.hourTo = ''; }
    render();
  });
  // "Dari Jam" digeser melewati "Sampai Jam" -> Sampai ikut maju; kebalikannya Dari ikut mundur
  $('pbStatSel2').addEventListener('change', function () {
    sel.hourFrom = this.value;
    if (sel.hourTo && sel.hourTo < sel.hourFrom) sel.hourTo = sel.hourFrom;
    render();
  });
  $('pbStatSel3').addEventListener('change', function () {
    sel.hourTo = this.value;
    if (sel.hourFrom && sel.hourFrom > sel.hourTo) sel.hourFrom = sel.hourTo;
    render();
  });

  function openDetailFrom(li) {
    if (!li) return;
    var ops = li.getAttribute('data-ops');
    window.closePbStats();
    openPbDetail(ops);
  }
  $('pbStatList').addEventListener('click', function (e) { openDetailFrom(e.target.closest('.pbs-row')); });
  $('pbStatList').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { var li = e.target.closest('.pbs-row'); if (li) { e.preventDefault(); openDetailFrom(li); } }
  });
  $('pbStatModal').addEventListener('click', function (e) { if (e.target === this) window.closePbStats(); });
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape' || e.key === 'Esc') { window.closePbStats(); return; }
    if (e.key === 'Tab') {
      var f = $('pbStatModal').querySelectorAll('button, select, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  // ---- API global (dipanggil dari HTML / modul lain) ----
  window.openPbStats = function () {
    coverage = null; hourCache = {}; // selalu baca ulang biar ikut import terbaru
    $('pbStatModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    render();
    $('pbStatModal').querySelector('.pbd-body').scrollTop = 0;
    setTimeout(function () { var b = $('pbStatCloseBtn'); if (b) b.focus(); }, 100);
  };
  window.closePbStats = function () {
    $('pbStatModal').classList.remove('active');
    var d = document.getElementById('pbDetailModal');
    if (!d || !d.classList.contains('active')) document.body.style.overflow = 'auto';
  };
  window.pbStatsRefresh = function () { if (isOpen()) render(); };
})();
