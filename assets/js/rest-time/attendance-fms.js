// ===== Modul: Pre-Work by Attendance FMS =====
// Input: Raw Attendance FMS. Yang dicek hanya operator yang sudah Clock In; statusnya dari getPreWorkStatus() (sumber sama dengan modul Rest Time).
let attnRows = [];
const ATTN_DEPTS = ["soc operator", "eha operator", "cache operator"];
// Dept yang dihitung: SOC / EHA Operator persis, atau Cache Operator (nama dept yang mengandung "cache", sama seperti filter di Rest Time Monitoring)
function attnDeptAllowed(d) { d = String(d || "").trim().toLowerCase(); return ATTN_DEPTS.indexOf(d) >= 0 || d.indexOf("cache") >= 0; }
const ATTN_ORDER = { BELUM_SUBMIT: 0, UNFIT: 1, EMPTY: 3, OTHER: 3, LOADING: 4, ERROR: 4, FIT: 5 };

function attnNorm(h) { return String(h == null ? "" : h).replace(/^\uFEFF/, "").trim().toLowerCase(); }

function attnParseCsv(text) {
    text = text.replace(/^\uFEFF/, "");
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
        else if (c === '"') q = true;
        else if (c === ",") { row.push(cell); cell = ""; }
        else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
        else if (c !== "\r") cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
}

// Validasi tanggal: kalau "bulan" > 12 tapi "hari" <= 12 berarti urutannya kebalik (yyyy-dd-mm), ditukar otomatis
function attnFixYmd(y, m, d) {
    if (+m > 12 && +d <= 12) { const t = m; m = d; d = t; }
    if (+m < 1 || +m > 12 || +d < 1 || +d > 31) return "";
    return y + "-" + m + "-" + d;
}

// Urutan tanggal format slash ("11/27/2026"): "mdy" (bulan/hari, default export FMS) atau "dmy" (hari/bulan).
// Dideteksi per file dari kolom Clock In Date: ada angka pertama > 12 -> dmy; ada angka kedua > 12 -> mdy; kalau ambigu -> mdy.
function attnDetectDateOrder(values) {
    let a12 = 0, b12 = 0;
    values.forEach(function (v) {
        const m = String(v || "").trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (!m) return;
        if (+m[1] > 12) a12++; if (+m[2] > 12) b12++;
    });
    return a12 > b12 ? "dmy" : "mdy";
}

function attnYmd(s, order) {
    s = String(s || "").trim(); if (!s) return "";
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return attnFixYmd(m[1], m[2], m[3]);
    m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (m) {
        const y = m[3].length === 2 ? "20" + m[3] : m[3];
        const mo = order === "dmy" ? m[2] : m[1], dy = order === "dmy" ? m[1] : m[2];
        return attnFixYmd(y, mo.padStart(2, "0"), dy.padStart(2, "0"));
    }
    const d = new Date(s); return isNaN(d) ? "" : getWorkingDateStr(d);
}

function attnShiftBucket(startTime) {
    const m = String(startTime || "").match(/(\d{1,2}):\d{2}/); if (!m) return "";
    const h = +m[1]; return h <= 7 ? "1" : (h <= 15 ? "2" : "3");
}

// Murni data (tanpa DOM): satu baris per OpsID per Clock In Date (ambil clock in paling awal). Baris tanpa Clock In dibuang.
function attnBuildRows(rows) {
    if (!rows.length) return { error: "File kosong." };
    const head = rows[0].map(attnNorm), ix = function (n) { return head.indexOf(n); };
    const iId = ix("staff id"), iName = ix("staff name"), iCd = ix("clock in date"), iCt = ix("clock in time");
    const missing = [["Staff ID", iId], ["Staff Name", iName], ["Clock In Date", iCd], ["Clock In Time", iCt]].filter(function (p) { return p[1] < 0; }).map(function (p) { return p[0]; });
    if (missing.length) return { error: "Kolom tidak ditemukan: " + missing.join(", ") + ". Pastikan ini file Raw Attendance dari FMS." };
    const iAg = ix("agency"), iShift = ix("shift name"), iStart = ix("start time"), iSt = ix("clock in status");
    let iDept = ix("event department"); if (iDept < 0) iDept = ix("profile department");
    const get = function (r, i) { return i < 0 ? "" : String(r[i] == null ? "" : r[i]).trim(); };
    const order = attnDetectDateOrder(rows.slice(1).map(function (r) { return get(r, iCd); }));
    const map = {}; let skipped = 0, excluded = 0, totalRows = 0;
    rows.slice(1).forEach(function (r) {
        const id = normalizeOpsId(get(r, iId)); if (!id) return;
        totalRows++;
        const cd = attnYmd(get(r, iCd), order), ct = get(r, iCt);
        if (!cd || !ct) { skipped++; return; }
        if (!attnDeptAllowed(get(r, iDept))) { excluded++; return; }  // auto filter: hanya SOC, EHA & Cache Operator
        const rec = { opsId: id, name: get(r, iName), agency: get(r, iAg), dept: get(r, iDept), start: get(r, iStart), shiftName: get(r, iShift), shift: attnShiftBucket(get(r, iStart)), date: cd, time: ct, status: get(r, iSt) };
        const key = id.toLowerCase() + "|" + cd;
        if (!map[key] || rec.time < map[key].time) map[key] = rec;
    });
    const list = Object.keys(map).map(function (k) { return map[k]; });
    const dates = list.map(function (r) { return r.date; }).sort();
    return { list: list, skipped: skipped, excluded: excluded, totalRows: totalRows, min: dates[0] || "", max: dates[dates.length - 1] || "" };
}

// ----- Preview sebelum import disimpan: file dibaca & dihitung dulu. Belum ada yang ditulis ke data / Firebase sampai klik Simpan. -----
let attnPending = null;   // { fileName, res } hasil parse file yang menunggu Simpan / Batal

function attnHandleFile(input) {
    const file = input.files[0]; if (!file) return;
    const isXlsx = /\.xlsx?$/i.test(file.name), reader = new FileReader();
    reader.onload = function (e) {
        try {
            let rows;
            if (isXlsx) {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
                rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
            } else rows = attnParseCsv(e.target.result);
            const res = attnBuildRows(rows);
            if (res.error) { showToast("❌ " + res.error, "err"); input.value = ""; return; }
            if (!res.list.length) { showToast("⚠️ Tidak ada absen valid di file ini (butuh SOC / EHA / Cache Operator dengan Clock In). Import dibatalkan.", "info"); input.value = ""; return; }
            attnPending = { fileName: file.name, res: res };
            attnShowPreview();
        } catch (err) { console.error(err); showToast("❌ Gagal membaca file attendance.", "err"); }
        input.value = "";
    };
    if (isXlsx) reader.readAsArrayBuffer(file); else reader.readAsText(file);
}

// MODE TUMPUK: data lama tetap dipertahankan. Kunci = OpsID + Clock In Date.
// Kalau kunci yang sama ada di file baru, baris lama diganti yang baru; kunci yang tidak ada di file baru tetap aman.
// Murni hitungan (tanpa DOM / tulis data), dipakai preview dan simpan supaya angkanya konsisten.
function attnComputeMerge(list) {
    const map = {}; let added = 0, updated = 0, changed = 0;
    attnRows.forEach(function (r) { map[r.opsId.toLowerCase() + "|" + r.date] = r; });
    const hadOld = attnRows.length > 0, sig = function (r) { return attnRowToArr(r).join("\u0001"); };
    list.forEach(function (r) {
        const k = r.opsId.toLowerCase() + "|" + r.date;
        if (map[k]) { updated++; if (sig(map[k]) !== sig(r)) changed++; } else added++;
        map[k] = r;
    });
    return { merged: Object.keys(map).map(function (k) { return map[k]; }), added: added, updated: updated, changed: changed, hadOld: hadOld };
}

// OpsID di file yang belum terdaftar di master karyawan (cek tanpa beda huruf besar/kecil). loaded=false kalau master belum termuat.
function attnMasterMissing(list) {
    const keys = Object.keys(masterKaryawan || {});
    if (!keys.length) return { loaded: false, missing: [] };
    const have = {}, seen = {}, missing = [];
    keys.forEach(function (k) { have[k.toLowerCase()] = 1; });
    list.forEach(function (r) {
        const k = r.opsId.toLowerCase();
        if (!have[k] && !seen[k]) { seen[k] = 1; missing.push({ opsId: r.opsId, name: r.name }); }
    });
    return { loaded: true, missing: missing };
}

function attnPvDate(ymd) { const p = String(ymd || "").split("-"); return p.length === 3 ? (+p[2]) + " " + ATTN_MON[+p[1] - 1] + " " + p[0] : "-"; }
function attnPvRange(a, b) {
    if (!a) return "-";
    if (a === b) return attnPvDate(a);
    return a.slice(0, 7) === b.slice(0, 7) ? (+a.slice(8)) + "–" + attnPvDate(b) : attnPvDate(a) + " – " + attnPvDate(b);
}

function attnShowPreview() {
    const p = attnPending, res = p.res, m = attnComputeMerge(res.list), mm = attnMasterMissing(res.list);
    const esc = escapeHtml, b = function (t) { return "<b>" + t + "</b>"; }, ln = function (t) { return '<div class="attn-pv-line">' + t + "</div>"; };
    document.getElementById("attnPvFile").innerText = "📄 " + p.fileName;
    document.getElementById("attnPvHead").innerHTML = b(m.added) + " baru · " + b(m.updated) + " diperbarui · rentang " + b(esc(attnPvRange(res.min, res.max))) +
        (mm.loaded ? " · " + b(mm.missing.length) + " OpsID belum ada di master" : "");

    const warns = [];
    if (m.hadOld) {   // salah file / salah bulan: rentang file terpaut jauh dari data yang sudah ada
        const dates = attnRows.map(function (r) { return r.date; }).sort(), exMin = dates[0], exMax = dates[dates.length - 1];
        const day = 86400000, gap = res.min > exMax ? Math.round((attnUtc(res.min) - attnUtc(exMax)) / day) : (res.max < exMin ? Math.round((attnUtc(exMin) - attnUtc(res.max)) / day) : 0);
        if (gap > 7) warns.push("⚠️ Rentang file (" + attnPvRange(res.min, res.max) + ") terpaut " + gap + " hari dari data yang sudah ada (" + attnPvRange(exMin, exMax) + "). Pastikan ini file yang benar.");
    }
    if (!mm.loaded) warns.push("ℹ️ Data master karyawan belum termuat, jadi pengecekan OpsID belum bisa dilakukan.");
    document.getElementById("attnPvWarn").innerHTML = warns.map(function (w) { return '<div class="attn-pv-warn">' + esc(w) + "</div>"; }).join("");

    const rows = [];
    rows.push(ln("🆕 " + b("Baru: " + m.added + " absen") + " akan ditambahkan."));
    rows.push(ln("🔄 " + b("Diperbarui: " + m.updated + " absen") + (m.updated
        ? " — baris lama dengan OpsID + tanggal yang sama akan <u>ditimpa</u> (" + m.changed + " isinya berubah, " + (m.updated - m.changed) + " sama persis)."
        : " — tidak ada baris lama yang ditimpa.")));
    rows.push(ln("📅 " + b("Rentang file:") + " " + esc(res.min) + " s/d " + esc(res.max) + (m.hadOld ? "<br><span style=\"color:var(--text-muted);\">Total setelah digabung: " + m.merged.length + " absen.</span>" : "")));
    if (mm.loaded) {
        const show = mm.missing.slice(0, 10).map(function (x) { return esc(x.opsId) + (x.name ? " (" + esc(x.name) + ")" : ""); }).join(", ");
        rows.push(ln("👤 " + b("OpsID belum ada di master: " + mm.missing.length) + (mm.missing.length
            ? "<br><span style=\"color:var(--text-muted);\">" + show + (mm.missing.length > 10 ? ", dan " + (mm.missing.length - 10) + " lainnya" : "") + "</span>"
            : " — semua sudah terdaftar.")));
    }
    if (res.skipped || res.excluded) rows.push(ln("ℹ️ " + [res.skipped ? res.skipped + " baris tanpa Clock In diabaikan" : "", res.excluded ? res.excluded + " absen dept lain diabaikan (hanya SOC, EHA & Cache Operator)" : ""].filter(Boolean).join(" · ")));
    document.getElementById("attnPvDetail").innerHTML = rows.join("");
    document.getElementById("attnPreviewModal").style.display = "flex";
}

function attnPreviewClose() { attnPending = null; document.getElementById("attnPreviewModal").style.display = "none"; }
function attnPreviewCancel() { attnPreviewClose(); showToast("Import dibatalkan. Data tidak berubah.", "info"); }

function attnPreviewConfirm() {
    const p = attnPending; if (!p) return;
    attnPreviewClose();
    const res = p.res, m = attnComputeMerge(res.list);   // dihitung ulang thd data terbaru (bisa berubah kalau orang lain import saat preview terbuka)
    const mergedList = m.merged, added = m.added, updated = m.updated, hadOld = m.hadOld;
    const mDates = mergedList.map(function (r) { return r.date; }).sort();
    const meta = { fileName: p.fileName + (hadOld ? " (digabung dgn data lama)" : ""), count: mergedList.length, min: mDates[0] || res.min, max: mDates[mDates.length - 1] || res.max, skipped: res.skipped, excluded: res.excluded, importedBy: window.__authUserEmail || "unknown", importedAt: getWorkingDateStr(new Date()) + " " + new Date().toTimeString().slice(0, 5) };
    const logEntry = { ts: Date.now(), at: meta.importedAt, by: meta.importedBy, file: p.fileName, added: added, updated: updated, total: mergedList.length, min: meta.min, max: meta.max, inFile: res.list.length, skipped: res.skipped, excluded: res.excluded };
    attnApplyData(mergedList, meta, true);
    attnSaveToFirebase(mergedList, meta, logEntry);
    if (hadOld) showToast("➕ " + added + " absen baru, 🔄 " + updated + " diperbarui. Total sekarang " + mergedList.length + ".", "ok");
}

// ----- Simpan & muat dari Firebase: <FB_ROOT>/attendanceFms { fileName, count, min, max, skipped, excluded, importedBy, importedAt, rows: [[...], ...] }
// Baris disimpan sebagai array pendek (urutan kolom di bawah) supaya ukuran kecil; import baru DIGABUNG dgn data lama (kunci OpsID+tanggal; kunci sama = diganti data baru).
let attnListenerRef = null;
function attnRowToArr(r) { return [r.opsId, r.name, r.agency, r.dept, r.shiftName, r.shift, r.date, r.time, r.status, r.start]; }
function attnRowFromArr(a) {
    const raw = a[6] || "", p = raw.split("-");   // bersihkan tanggal kebalik dari data lama di Firebase
    const date = p.length === 3 ? attnFixYmd(p[0], p[1], p[2]) : raw;
    return { opsId: a[0] || "", name: a[1] || "", agency: a[2] || "", dept: a[3] || "", shiftName: a[4] || "", shift: a[5] || "", date: date, time: a[7] || "", status: a[8] || "", start: a[9] || "" };
}

function attnInfoText(m) {
    return m.fileName + " · " + m.count + " absen (" + m.min + " s/d " + m.max + ")" + (m.skipped ? " · " + m.skipped + " baris tanpa Clock In diabaikan" : "") +
        (m.excluded ? " · " + m.excluded + " absen dept lain diabaikan (hanya SOC, EHA & Cache Operator)" : "") + (m.importedBy ? " · diimport " + m.importedBy + " " + m.importedAt : "");
}

// Satu baris per OpsID + tanggal (ambil Clock In paling awal), jadi baris dobel akibat pembersihan tanggal tidak ikut tampil
function attnDedupeRows(list) {
    const map = {};
    list.forEach(function (r) {
        const k = String(r.opsId).toLowerCase() + "|" + r.date;
        if (!map[k] || r.time < map[k].time) map[k] = r;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
}

function attnApplyData(list, meta, forceDates) {
    list = attnDedupeRows(list.filter(function (r) { return r.date; }));
    attnRows = list;
    const cleanDates = list.map(function (r) { return r.date; }).filter(Boolean).sort();   // min/max dihitung ulang dari data yang sudah bersih
    meta = Object.assign({}, meta, { min: cleanDates[0] || "", max: cleanDates[cleanDates.length - 1] || "" });
    const depts = Array.from(new Set(list.map(function (r) { return r.dept; }).filter(Boolean))).sort();
    const sel = document.getElementById("attnFilterDept"), prev = sel.value;
    sel.innerHTML = '<option value="All">All Dept</option>' + depts.map(function (d) { return '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + '</option>'; }).join("");
    sel.value = depts.indexOf(prev) >= 0 ? prev : "All";
    const ds = document.getElementById("attnDateStart"), de = document.getElementById("attnDateEnd");
    if (forceDates || !ds.value) {
        const today = getWorkingDateStr(new Date()), d = (today >= meta.min && today <= meta.max) ? today : meta.max;
        ds.value = d; de.value = d;
    }
    document.getElementById("attnFileInfo").innerText = attnInfoText(meta);
    if (currentActiveModule === "attn") renderAttnPreWork();
    else if (currentActiveModule === "sum") attnRenderSummary();
}

// Riwayat import disimpan di <FB_ROOT>/attendanceFms/importLog/<pushKey> (satu entri per import, maks ATTN_LOG_MAX).
// Data utama (meta + rows) pakai update per-field (bukan set) supaya importLog tidak ikut terhapus. Log ditulis TERPISAH
// dari data, jadi kalau Security Rules menolak importLog, import data tetap berhasil.
const ATTN_LOG_MAX = 200;
let attnImportLog = [];   // [{ key, ts, at, by, file, added, updated, total, min, max, inFile, skipped, excluded }] terbaru di atas
let attnLegacyMeta = null;

function attnSaveToFirebase(list, meta, logEntry) {
    if (!fbDb) { showToast("⚠️ Belum terhubung ke Firebase. Data hanya sementara di halaman ini.", "info"); return; }
    const base = FB_ROOT + "/attendanceFms/", up = {};
    Object.keys(meta).forEach(function (k) { up[base + k] = meta[k]; });
    up[base + "rows"] = list.map(attnRowToArr);
    fbDb.ref().update(up)
        .then(function () {
            showToast("✅ " + list.length + " data absen FMS disimpan ke Firebase.", "ok");
            if (!logEntry) return;
            const lu = {}, key = fbDb.ref(base + "importLog").push().key;
            lu[base + "importLog/" + key] = logEntry;
            const over = attnImportLog.length + 1 - ATTN_LOG_MAX;   // buang entri paling lama kalau melebihi batas
            if (over > 0) attnImportLog.slice(-over).forEach(function (e) { lu[base + "importLog/" + e.key] = null; });
            return fbDb.ref().update(lu).catch(function (err) { console.error(err); showToast("⚠️ Data tersimpan, tapi Update Log gagal dicatat. Cek Security Rules path attendanceFms/importLog.", "info"); });
        })
        .catch(function (err) { console.error(err); showToast("❌ Gagal simpan ke Firebase. Cek Security Rules untuk path attendanceFms.", "err"); });
}

function attnLogRange(e) { return e.min ? (e.min === e.max ? e.min : e.min + " s/d " + e.max) : "-"; }
function attnLogCell(txt, extra, title) {
    return '<td style="padding:7px 10px; border-top:1px solid var(--border-color); color:var(--text-main);' + (extra || "") + '"' + (title ? ' title="' + escapeHtml(title) + '"' : "") + ">" + escapeHtml(String(txt)) + "</td>";
}
function attnOpenImportLog() {
    const body = document.getElementById("attnImportLogBody"), note = document.getElementById("attnImportLogNote");
    const num = function (v) { return v == null ? "-" : v; };
    const row = function (e) {
        return "<tr>" + attnLogCell(e.at || "-", " white-space:nowrap;") + attnLogCell(e.by || "-") + attnLogCell(e.file || "-", " word-break:break-all;", e.file) +
            attnLogCell(num(e.added), " text-align:center;") + attnLogCell(num(e.updated), " text-align:center;") + attnLogCell(num(e.total), " text-align:center;") +
            attnLogCell(attnLogRange(e), " white-space:nowrap;") + "</tr>";
    };
    let html = attnImportLog.map(row).join("");
    if (!attnImportLog.length && attnLegacyMeta && attnLegacyMeta.importedBy) {
        const m = attnLegacyMeta;
        html = row({ at: m.importedAt, by: m.importedBy, file: m.fileName, total: m.count, min: m.min, max: m.max });
        note.innerText = "Baru import terakhir yang tercatat (import sebelum fitur Update Log belum punya riwayat).";
    } else {
        note.innerText = "Riwayat siapa saja yang meng-import Raw Attendance FMS (terbaru di atas, maks " + ATTN_LOG_MAX + " entri).";
    }
    body.innerHTML = html || '<tr><td colspan="7" style="padding:24px; text-align:center; color:var(--text-muted);">Belum ada riwayat import.</td></tr>';
    document.getElementById("attnImportLogModal").style.display = "flex";
}
function attnCloseImportLog() { document.getElementById("attnImportLogModal").style.display = "none"; }

// Listener dipasang sekali, baru saat tab ini pertama dibuka (biar page load Rest Time nggak ikut narik datanya).
function attnAttachListener() {
    if (attnListenerRef || !fbDb) return;
    attnListenerRef = fbDb.ref(FB_ROOT + "/attendanceFms");
    attnListenerRef.on("value", function (snap) {
        const v = snap.val(); if (!v || !v.rows) return;
        const meta = { fileName: v.fileName || "", count: v.count || 0, min: v.min || "", max: v.max || "", skipped: v.skipped || 0, excluded: v.excluded || 0, importedBy: v.importedBy || "", importedAt: v.importedAt || "" };
        attnLegacyMeta = meta;
        attnImportLog = Object.keys(v.importLog || {}).map(function (k) { return Object.assign({ key: k }, v.importLog[k]); }).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        if (document.getElementById("attnImportLogModal").style.display === "flex") attnOpenImportLog();
        attnApplyData(Object.keys(v.rows).map(function (k) { return attnRowFromArr(v.rows[k]); }), meta, false);
    });
}

function attnPickFile() {
    if (!window.__authCanDelete) { showToast("🚫 Kamu gak punya akses buat import data attendance. Hubungi admin kalau ini kesalahan.", "err"); return; }
    document.getElementById("attnFilePicker").click();
}

// Input jam format 24 jam (HH:mm) - sengaja pakai text biar ga ikut setting AM/PM browser. Ketik angka aja, ":" otomatis.
function attnTimeMask(el) {
    let d = el.value.replace(/\D/g, "");
    if (d.length && +d[0] > 2) d = "0" + d;   // ketik "5" langsung jadi "05"
    d = d.slice(0, 4);
    if (d.length >= 2 && +d.slice(0, 2) > 23) d = "23" + d.slice(2);
    if (d.length === 4 && +d.slice(2) > 59) d = d.slice(0, 2) + "59";
    el.value = d.length >= 3 ? d.slice(0, 2) + ":" + d.slice(2) : d;
    renderAttnPreWork();
}
function attnTimeFix(el) {
    const d = el.value.replace(/\D/g, "");
    if (!d) { el.value = ""; }
    else if (d.length <= 2) { el.value = d.padStart(2, "0") + ":00"; }
    else if (d.length === 3) { el.value = d.slice(0, 2) + ":" + d.slice(2) + "0"; }
    else { el.value = d.slice(0, 2) + ":" + d.slice(2, 4); }
    renderAttnPreWork();
}

function attnResetTime() {
    document.getElementById("attnTimeFrom").value = ""; document.getElementById("attnTimeTo").value = "";
    renderAttnPreWork();
}

function attnSetToday() {
    const t = getWorkingDateStr(new Date());
    document.getElementById("attnDateStart").value = t; document.getElementById("attnDateEnd").value = t;
    renderAttnPreWork();
}

// Pre-Work biasanya diisi sekitar 1 jam sebelum shift mulai, jadi untuk shift lewat tengah malam tanggalnya bisa hari sebelumnya.
// Cari isian Pre-Work yang timestamp-nya jatuh di jendela [Start - 3 jam, Start + 2 jam] (apa pun isi kolom DATE-nya);
// kalau nggak ada, cek tanggal (Start - 1 jam). Tanpa Start Time, pakai Clock In Date.
function attnPwDate(r) {
    const s = r.start ? new Date(r.start.replace(" ", "T")) : null;
    if (!s || isNaN(s)) return r.date;
    const byDate = preWorkIndex[r.opsId.toLowerCase()] || {}, lo = s.getTime() - 3 * 3600000, hi = s.getTime() + 2 * 3600000;
    let hit = null;
    Object.keys(byDate).forEach(function (d) { byDate[d].forEach(function (e) { if (e.ts >= lo && e.ts <= hi && (!hit || e.ts > hit.ts)) hit = { d: d, ts: e.ts }; }); });
    return hit ? hit.d : preWorkYMD(new Date(s.getTime() - 3600000));
}

// Waktu Clock In FMS (ms) = kolom "Clock In Date" + "Clock In Time" (BUKAN r.start, itu jam mulai shift).
// Dipakai sebagai acuan umur Pre-Work (bukan jam sekarang), jadi data lama yang sudah terlanjur masuk ikut dihitung ulang tiap render.
function attnClockInMs(r) {
    const m = String(r.time || "").match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!r.date || !m) return null;
    const d = new Date(r.date + "T" + m[1].padStart(2, "0") + ":" + m[2] + ":" + (m[3] || "00"));
    return isNaN(d) ? null : d.getTime();
}

// Status Pre-Work utk 1 baris attendance. Aturan sama dgn blocker Check In: submit lebih dari PREWORK_MAX_AGE_HOURS (3 jam)
// sebelum Clock In FMS = EXPIRED (harus submit ulang sebelum Clock In). UNFIT tetap diprioritaskan.
function attnPwFor(r) {
    const pwDate = attnPwDate(r);
    let pw = getPreWorkStatus(r.opsId, pwDate, r.name);
    const ci = attnClockInMs(r);
    if (ci !== null && pw.ts && pw.code !== "UNFIT" && (ci - pw.ts) > PREWORK_MAX_AGE_HOURS * 3600000) {
        pw = { code: "EXPIRED", status: pw.status, ts: pw.ts };
    }
    return { pwDate: pwDate, pw: pw };
}

function attnPwBadge(x) {
    if (x.pw.code === "EXPIRED") return '<span class="badge alert-reminder" style="white-space:nowrap;" title="Submit Pre-Work lebih dari ' + PREWORK_MAX_AGE_HOURS + ' jam sebelum Clock In. Wajib submit ulang sebelum Clock In.">⌛ Expired</span>';
    return renderPreWorkBadge(x.r.opsId, x.pwDate, x.r.name);
}

function attnGroupOf(code) {
    if (code === "FIT" || code === "UNFIT" || code === "EMPTY" || code === "OTHER") return "sudah";
    return (code === "BELUM_SUBMIT" || code === "EXPIRED") ? "belum" : "na";
}

// Jam actual submit Pre-Work = kolom A (Timestamp) sheet "Pre-Work Operator". Kalau beda hari dgn tanggal Clock In, tanggalnya ikut ditampilkan.
function attnSubmitCell(ts, refDate) {
    if (!ts) return '<span style="color:var(--text-muted);">-</span>';
    const d = new Date(ts), p2 = function (n) { return String(n).padStart(2, "0"); };
    const jam = p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds());
    const tgl = p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear();
    const beda = preWorkYMD(d) !== refDate;
    return '<span class="badge badge-time" style="cursor:default;" title="Submit: ' + tgl + ' ' + jam + '">' + jam + (beda ? ' <small style="opacity:.7;">(' + p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + ")</small>" : "") + "</span>";
}
function attnSubmitText(ts) {
    if (!ts) return "";
    const d = new Date(ts), p2 = function (n) { return String(n).padStart(2, "0"); };
    return p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds());
}

function attnStatusLabel(pw) {
    switch (pw.code) {
        case "FIT": return "FIT"; case "UNFIT": return "UNFIT"; case "BELUM_SUBMIT": return "Belum Submit"; case "EXPIRED": return "Expired";
        case "EMPTY": return "Status Kosong"; case "OTHER": return pw.status;
        default: return "N/A";
    }
}

function attnVisibleRows() {
    let start = document.getElementById("attnDateStart").value, end = document.getElementById("attnDateEnd").value || start;
    if (!start) start = end = getWorkingDateStr(new Date());
    if (end < start) { const x = start; start = end; end = x; }
    const fDept = document.getElementById("attnFilterDept").value;
    // Filter jam Clock In (HH:mm). Kosong = ga difilter. Kalau "Dari" > "s.d" dianggap lewat tengah malam (mis. 22:00 s.d 06:00).
    const attnMin = function (t) { const m = String(t || "").match(/^(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; };
    const mFrom = attnMin(document.getElementById("attnTimeFrom").value), mTo = attnMin(document.getElementById("attnTimeTo").value);
    const fStatus = document.getElementById("attnFilterStatus").value, q = document.getElementById("attnSearch").value.toLowerCase().trim();
    const base = [];
    attnRows.forEach(function (r) {
        if (r.date < start || r.date > end) return;
        if (mFrom !== null || mTo !== null) {
            const t = attnMin(r.time); if (t === null) return;
            if (mFrom !== null && mTo !== null) { if (!(mFrom <= mTo ? (t >= mFrom && t <= mTo) : (t >= mFrom || t <= mTo))) return; }
            else if (mFrom !== null) { if (t < mFrom) return; }
            else if (t > mTo) return;
        }
        if (fDept !== "All" && r.dept !== fDept) return;
        if (q && r.opsId.toLowerCase().indexOf(q) < 0 && r.name.toLowerCase().indexOf(q) < 0) return;
        const pwx = attnPwFor(r), pwDate = pwx.pwDate, pw = pwx.pw;
        base.push({ r: r, pw: pw, pwDate: pwDate, group: attnGroupOf(pw.code) });
    });
    const shown = base.filter(function (x) { return fStatus === "All" || fStatus === x.group || (fStatus === "unfit" && x.pw.code === "UNFIT"); });
    // Urut berdasarkan Clock In: terbaru (jam paling akhir) di atas -> terlama di bawah
    const attnTimeKey = function (r) { const t = String(r.time || "").split(":"); return r.date + " " + (t[0] || "0").padStart(2, "0") + ":" + (t[1] || "0").padStart(2, "0") + ":" + (t[2] || "0").padStart(2, "0"); };
    shown.sort(function (a, b) { return attnTimeKey(b.r).localeCompare(attnTimeKey(a.r)); });
    return { base: base, shown: shown };
}

function renderAttnPreWork() {
    const v = attnVisibleRows(), tbody = document.getElementById("attnTableBody");
    const cnt = function (f) { return v.base.filter(f).length; };
    document.getElementById("attnTotal").innerText = v.base.length;
    document.getElementById("attnSudah").innerText = cnt(function (x) { return x.group === "sudah"; });
    document.getElementById("attnBelum").innerText = cnt(function (x) { return x.group === "belum"; });
    document.getElementById("attnUnfit").innerText = cnt(function (x) { return x.pw.code === "UNFIT"; });
    // Kartu yang sesuai filter Status Pre-Work aktif diberi highlight (sinkron dgn dropdown, dua arah)
    const fSel = document.getElementById("attnFilterStatus").value;
    document.querySelectorAll("#attnCards .center-box[data-f]").forEach(function (c) {
        const on = fSel !== "All" && c.dataset.f === fSel;
        c.classList.toggle("attn-card-active", on); c.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const na = cnt(function (x) { return x.group === "na"; }), note = document.getElementById("attnNote");
    note.style.display = na ? "block" : "none";
    note.innerText = na ? "⚠️ " + na + " operator belum bisa dicek: sheet Pre-Work masih dimuat atau gagal dimuat. Statusnya tampil N/A." : "";
    if (!v.shown.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="padding:28px; color:var(--text-muted);">' + (attnRows.length ? "Tidak ada operator yang cocok dengan filter dan tanggal ini." : "Import Raw Attendance dari FMS untuk mulai mengecek Pre-Work.") + '</td></tr>';
        return;
    }
    const stCls = { "On Time": "alert-disiplin", "Late In": "alert-istirahat", "Early In": "badge-dept" };
    tbody.innerHTML = v.shown.map(function (x) {
        const r = x.r, rowCls = (x.group === "belum" || x.pw.code === "UNFIT") ? ' class="row-gancang"' : "";
        return '<tr' + rowCls + '><td>' + escapeHtml(r.date) + '</td><td><span class="badge badge-dept">' + escapeHtml(r.opsId) + '</span></td>' +
            '<td style="text-align:left; font-weight:600;">' + escapeHtml(r.name) + '</td><td><span class="badge badge-dept" style="font-weight:500;">' + escapeHtml(r.agency) + '</span></td>' +
            '<td><span class="badge badge-dept">' + escapeHtml(r.dept) + '</span></td><td>' + escapeHtml(r.shiftName) + '</td>' +
            '<td><span class="badge badge-time" style="cursor:default;">' + escapeHtml(r.time.slice(0, 5)) + '</span></td>' +
            '<td><span class="badge ' + (stCls[r.status] || "badge-dept") + '">' + escapeHtml(r.status || "-") + '</span></td>' +
            '<td>' + attnPwBadge(x) + '</td>' +
            '<td>' + attnSubmitCell(x.pw.ts, r.date) + '</td></tr>';
    }).join("");
}

function attnExportCsv() {
    const v = attnVisibleRows(); if (!v.shown.length) { showToast("⚠️ Tidak ada data untuk diexport.", "info"); return; }
    const q = function (s) { return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; };
    const lines = [["Date", "OpsID", "Name", "Agency", "Departement", "Shift", "Clock In FMS", "Status Absen", "Pre-Work Status", "Jam Submit Pre-Work"].map(q).join(",")];
    v.shown.forEach(function (x) { const r = x.r; lines.push([r.date, r.opsId, r.name, r.agency, r.dept, r.shiftName, r.time, r.status, attnStatusLabel(x.pw), attnSubmitText(x.pw.ts)].map(q).join(",")); });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "PreWork_by_Attendance_" + document.getElementById("attnDateStart").value + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ===== Tab Summary Pre-Work per Vendor: Achievement Daily / Weekly / Monthly Submission =====
// Achievement = Sudah Isi (FIT/UNFIT/Status Kosong/Lainnya) / Total Clock In FMS, per periode & per Agency (vendor).
// Sumber data sama dgn tab Pre-Work by Attendance FMS (attnRows + getPreWorkStatus), jadi angkanya selalu konsisten.
const ATTN_SUM_GREEN = 95, ATTN_SUM_YELLOW = 80;   // ambang warna (%): >= GREEN hijau, >= YELLOW kuning, di bawahnya merah
const ATTN_MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const ATTN_DAY = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const ATTN_SUM_MODES = [["daily", "attnSumTblDaily", "Daily"], ["weekly", "attnSumTblWeekly", "Weekly"], ["monthly", "attnSumTblMonthly", "Monthly"]];

function attnUtc(ymd) { const p = ymd.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
function attnUtcYmd(d) { return d.toISOString().slice(0, 10); }
function attnPeriodKey(ymd, mode) {
    if (mode === "monthly") return ymd.slice(0, 7);
    if (mode === "weekly") { const d = attnUtc(ymd); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return attnUtcYmd(d); } // Senin minggu tsb
    return ymd;
}
function attnPeriodBounds(key, mode) {   // awal & akhir periode, buat deteksi periode yg terpotong rentang tanggal
    if (mode === "monthly") { const y = +key.slice(0, 4), m = +key.slice(5, 7); return [key + "-01", attnUtcYmd(new Date(Date.UTC(y, m, 0)))]; }
    if (mode === "weekly") { const d = attnUtc(key); d.setUTCDate(d.getUTCDate() + 6); return [key, attnUtcYmd(d)]; }
    return [key, key];
}
function attnPeriodLabel(key, mode) {
    const p2 = function (n) { return String(n).padStart(2, "0"); };
    if (mode === "monthly") return ATTN_MON[+key.slice(5, 7) - 1] + " " + key.slice(0, 4);
    const d = attnUtc(key);
    if (mode === "daily") return ATTN_DAY[d.getUTCDay()] + ", " + p2(d.getUTCDate()) + " " + ATTN_MON[d.getUTCMonth()] + " " + d.getUTCFullYear();
    const e = attnUtc(key); e.setUTCDate(e.getUTCDate() + 6);
    const th = attnUtc(key); th.setUTCDate(th.getUTCDate() + 3);                   // minggu ISO ditentukan hari Kamis
    const wk = Math.ceil(((th - Date.UTC(th.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
    return "W" + wk + " · " + p2(d.getUTCDate()) + " " + ATTN_MON[d.getUTCMonth()] + " – " + p2(e.getUTCDate()) + " " + ATTN_MON[e.getUTCMonth()] + " " + e.getUTCFullYear();
}
// Weekly baru tampil kalau rentang tanggal >= 7 hari, Monthly kalau >= 28 hari (Daily selalu tampil)
const ATTN_SUM_MIN_DAYS = { daily: 1, weekly: 7, monthly: 28 };
function attnSumVisible(mode, b) {
    if (!b.start) return mode === "daily";
    const span = Math.round((attnUtc(b.end) - attnUtc(b.start)) / 86400000) + 1;
    return span >= ATTN_SUM_MIN_DAYS[mode];
}
function attnSumClass(pct) { return pct >= ATTN_SUM_GREEN ? "sum-g" : (pct >= ATTN_SUM_YELLOW ? "sum-y" : "sum-r"); }
function attnSumPct(c) { return c && c.t ? (c.s / c.t) * 100 : null; }

function attnSumQuick(kind) {
    const today = getWorkingDateStr(new Date()), ds = document.getElementById("attnSumStart"), de = document.getElementById("attnSumEnd");
    if (kind === "today") { ds.value = today; de.value = today; }
    else if (kind === "7d") { const d = attnUtc(today); d.setUTCDate(d.getUTCDate() - 6); ds.value = attnUtcYmd(d); de.value = today; }
    else if (kind === "month") { ds.value = today.slice(0, 8) + "01"; de.value = today; }
    else { const dates = attnRows.map(function (r) { return r.date; }).sort(); ds.value = dates[0] || ""; de.value = dates[dates.length - 1] || ""; }
    attnRenderSummary();
}

// Murni data (tanpa tabel): baris attendance dalam rentang + dept, lengkap dgn status Pre-Work
function attnSumBase() {
    let start = document.getElementById("attnSumStart").value, end = document.getElementById("attnSumEnd").value || start;
    if (!start) start = end;
    if (end < start) { const x = start; start = end; end = x; }
    const fDept = document.getElementById("attnSumDept").value, base = [];
    if (start) attnRows.forEach(function (r) {
        if (r.date < start || r.date > end) return;
        if (fDept !== "All" && r.dept !== fDept) return;
        const pwx = attnPwFor(r), pwDate = pwx.pwDate, pw = pwx.pw;
        base.push({ r: r, pw: pw, pwDate: pwDate, group: attnGroupOf(pw.code) });
    });
    return { base: base, start: start, end: end };
}

function attnSummaryData(mode, b) {
    const per = {}, vSet = {}, grand = {}, grandAll = { t: 0, s: 0, b: 0, u: 0 };
    const tally = function (c, x) { c.t++; if (x.group === "sudah") c.s++; else if (x.group === "belum") c.b++; if (x.pw.code === "UNFIT") c.u++; };
    b.base.forEach(function (x) {
        const ag = String(x.r.agency || "").trim() || "(Tanpa Agency)", k = attnPeriodKey(x.r.date, mode);
        vSet[ag] = (vSet[ag] || 0) + 1;
        const o = per[k] || (per[k] = { cells: {}, tot: { t: 0, s: 0, b: 0, u: 0 } });
        tally(o.cells[ag] || (o.cells[ag] = { t: 0, s: 0, b: 0, u: 0 }), x);
        tally(o.tot, x);
        tally(grand[ag] || (grand[ag] = { t: 0, s: 0, b: 0, u: 0 }), x);
        tally(grandAll, x);
    });
    const vendors = Object.keys(vSet).sort(function (a, c) { return vSet[c] - vSet[a] || a.localeCompare(c); });
    const periods = Object.keys(per).sort().reverse().map(function (k) {   // terbaru di atas
        const bd = attnPeriodBounds(k, mode);
        return { key: k, label: attnPeriodLabel(k, mode), partial: bd[0] < b.start || bd[1] > b.end, cells: per[k].cells, tot: per[k].tot };
    });
    return { periods: periods, vendors: vendors, grand: grand, grandAll: grandAll };
}

function attnSumCell(c, m, k, v) {   // m=mode, k=kunci periode ("*"=semua periode), v=vendor ("*"=semua vendor)
    if (!c || !c.t) return '<td class="sum-cell" style="color:var(--text-muted);">-</td>';
    const pct = attnSumPct(c);
    return '<td class="sum-cell ' + attnSumClass(pct) + '" data-m="' + m + '" data-k="' + escapeHtml(k) + '" data-v="' + escapeHtml(v) + '" title="Klik untuk lihat operator yang sudah / belum submit"><b>' + pct.toFixed(1) + '%</b><small>' + c.s + ' / ' + c.t + '</small>' + (c.u ? '<small style="font-weight:700;">⚠️ Un-Fit ' + c.u + '</small>' : '') + '</td>';
}

function attnSumFillTable(tblId, d, mode) {
    const tbl = document.getElementById(tblId), thead = tbl.tHead, tbody = tbl.tBodies[0];
    if (!d.periods.length) {
        thead.innerHTML = ""; tbody.innerHTML = '<tr><td style="padding:22px; color:var(--text-muted);">' + (attnRows.length ? "Tidak ada data absen pada rentang tanggal / dept ini." : "Import Raw Attendance dari FMS (tab Pre-Work by Attendance FMS) untuk melihat summary.") + "</td></tr>";
        return;
    }
    thead.innerHTML = '<tr><th style="text-align:left;">Periode</th>' + d.vendors.map(function (a) { return "<th>" + escapeHtml(a) + "</th>"; }).join("") + "<th>Total</th></tr>";
    const rows = d.periods.map(function (p) {
        return '<tr><td class="sum-period"' + (p.partial ? ' title="Periode terpotong rentang tanggal"' : "") + ">" + escapeHtml(p.label) + (p.partial ? " *" : "") + "</td>" +
            d.vendors.map(function (a) { return attnSumCell(p.cells[a], mode, p.key, a); }).join("") + attnSumCell(p.tot, mode, p.key, "*") + "</tr>";
    });
    rows.push('<tr class="sum-total"><td class="sum-period">TOTAL (rentang tanggal)</td>' + d.vendors.map(function (a) { return attnSumCell(d.grand[a], mode, "*", a); }).join("") + attnSumCell(d.grandAll, mode, "*", "*") + "</tr>");
    tbody.innerHTML = rows.join("");
}

function attnRenderSummary() {
    const ds = document.getElementById("attnSumStart"), de = document.getElementById("attnSumEnd"), sel = document.getElementById("attnSumDept");
    if (!ds.value && !de.value && attnRows.length) {       // pertama kali dibuka: default = seluruh data yang sudah diimport
        const dates = attnRows.map(function (r) { return r.date; }).sort(); ds.value = dates[0]; de.value = dates[dates.length - 1];
    }
    const depts = Array.from(new Set(attnRows.map(function (r) { return r.dept; }).filter(Boolean))).sort(), sig = depts.join("|");
    if (sel.dataset.sig !== sig) {
        const prev = sel.value;
        sel.innerHTML = '<option value="All">All Dept</option>' + depts.map(function (x) { return '<option value="' + escapeHtml(x) + '">' + escapeHtml(x) + "</option>"; }).join("");
        sel.value = depts.indexOf(prev) >= 0 ? prev : "All"; sel.dataset.sig = sig;
    }
    const b = attnSumBase(), dd = {};
    ATTN_SUM_MODES.forEach(function (m) {
        const vis = attnSumVisible(m[0], b), panel = document.getElementById(m[1]).closest(".input-panel");
        panel.style.display = vis ? "" : "none";
        dd[m[0]] = attnSummaryData(m[0], b);
        if (vis) attnSumFillTable(m[1], dd[m[0]], m[0]);
    });
    document.getElementById("attnSumInfo").innerText = b.start ? (b.start + " s/d " + b.end + " · " + b.base.length + " absen") : "Belum ada data. Import Raw Attendance di tab Pre-Work by Attendance FMS.";
    const g = dd.daily, cards = g.vendors.map(function (a) { return [a, g.grand[a]]; }); if (g.vendors.length) cards.push(["Total", g.grandAll]);
    document.getElementById("attnSumCards").innerHTML = cards.map(function (x) {
        const pct = attnSumPct(x[1]);
        return '<div class="attn-sum-card ' + attnSumClass(pct) + '"><div class="nm">' + escapeHtml(x[0]) + '</div><div class="pc">' + pct.toFixed(1) + '%</div><div class="ct">' + x[1].s + ' / ' + x[1].t + " submit</div>" + (x[1].u ? '<div class="ct" style="font-weight:800;">⚠️ Un-Fit ' + x[1].u + "</div>" : "") + "</div>";
    }).join("");
    const na = b.base.filter(function (x) { return x.group === "na"; }).length, note = document.getElementById("attnSumNote");
    note.style.display = na ? "block" : "none";
    note.innerText = na ? "⚠️ " + na + " operator belum bisa dicek: sheet Pre-Work masih dimuat atau gagal dimuat. Dihitung belum submit sementara." : "";
}

function attnSumExportCsv() {
    const b = attnSumBase(); if (!b.base.length) { showToast("⚠️ Tidak ada data untuk diexport.", "info"); return; }
    const q = function (s) { return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; };
    const lines = [["Level", "Periode", "Vendor", "Total Clock In", "Sudah Isi", "Belum Isi", "Un-Fit", "Achievement (%)"].map(q).join(",")];
    ATTN_SUM_MODES.forEach(function (m) {
        if (!attnSumVisible(m[0], b)) return;
        const d = attnSummaryData(m[0], b);
        const push = function (label, vendor, c) { if (c && c.t) lines.push([m[2], label, vendor, c.t, c.s, c.b, c.u, attnSumPct(c).toFixed(1)].map(q).join(",")); };
        d.periods.forEach(function (p) { d.vendors.forEach(function (a) { push(p.label, a, p.cells[a]); }); push(p.label, "TOTAL", p.tot); });
        d.vendors.forEach(function (a) { push("TOTAL (rentang tanggal)", a, d.grand[a]); }); push("TOTAL (rentang tanggal)", "TOTAL", d.grandAll);
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "PreWork_Achievement_per_Vendor_" + b.start + "_" + b.end + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ===== Drill-down: klik angka % -> daftar operator Sudah / Belum submit Pre-Work =====
let attnDrillItems = [], attnDrillFilter = "all", attnDrillMeta = "";
function attnSumVendorOf(r) { return String(r.agency || "").trim() || "(Tanpa Agency)"; }
function attnSumDrill(mode, key, vendor) {
    const b = attnSumBase();
    attnDrillItems = b.base.filter(function (x) {
        return (key === "*" || attnPeriodKey(x.r.date, mode) === key) && (vendor === "*" || attnSumVendorOf(x.r) === vendor);
    }).sort(function (a, c) {   // Belum submit dulu, lalu urut nama
        const ga = a.group === "sudah" ? 1 : 0, gc = c.group === "sudah" ? 1 : 0;
        return ga - gc || a.r.date.localeCompare(c.r.date) || String(a.r.name).localeCompare(String(c.r.name));
    });
    const pl = key === "*" ? "Seluruh rentang " + b.start + " s/d " + b.end : attnPeriodLabel(key, mode);
    attnDrillMeta = (vendor === "*" ? "Semua Vendor" : vendor) + " · " + pl;
    document.getElementById("attnDrillTitle").innerText = "📋 Detail Submit Pre-Work — " + (vendor === "*" ? "Semua Vendor" : vendor);
    document.getElementById("attnDrillSub").innerText = "Periode: " + pl + " (" + mode + ")";
    attnDrillSetFilter("all");
    document.getElementById("attnDrillModal").style.display = "flex";
}
function attnDrillClose() { document.getElementById("attnDrillModal").style.display = "none"; }
function attnDrillSetFilter(f) {
    attnDrillFilter = f;
    ["all", "belum", "sudah", "unfit"].forEach(function (x) { document.getElementById("attnDrillTab_" + x).classList.toggle("active", x === f); });
    const n = function (g) { return attnDrillItems.filter(function (x) { return g === "unfit" ? x.pw.code === "UNFIT" : (g === "belum" ? x.group !== "sudah" : x.group === "sudah"); }).length; };
    document.getElementById("attnDrillTab_all").innerText = "Semua (" + attnDrillItems.length + ")";
    document.getElementById("attnDrillTab_belum").innerText = "❌ Belum Submit (" + n("belum") + ")";
    document.getElementById("attnDrillTab_sudah").innerText = "✅ Sudah Submit (" + n("sudah") + ")";
    document.getElementById("attnDrillTab_unfit").innerText = "⚠️ Un-Fit (" + n("unfit") + ")";
    attnDrillRender();
}
function attnDrillVisible() {
    return attnDrillItems.filter(function (x) {
        if (attnDrillFilter === "all") return true;
        if (attnDrillFilter === "unfit") return x.pw.code === "UNFIT";
        return attnDrillFilter === "sudah" ? x.group === "sudah" : x.group !== "sudah";
    });
}
function attnDrillRender() {
    const list = attnDrillVisible(), tb = document.getElementById("attnDrillBody");
    if (!list.length) { tb.innerHTML = '<tr><td colspan="9" style="padding:22px; color:var(--text-muted);">Tidak ada data.</td></tr>'; return; }
    tb.innerHTML = list.map(function (x) {
        const r = x.r;
        return '<tr' + (x.group !== "sudah" || x.pw.code === "UNFIT" ? ' class="row-gancang"' : "") + "><td>" + escapeHtml(r.date) + '</td><td><span class="badge badge-dept">' + escapeHtml(r.opsId) + "</span></td>" +
            '<td style="text-align:left; font-weight:600;">' + escapeHtml(r.name) + '</td><td><span class="badge badge-dept" style="font-weight:500;">' + escapeHtml(r.agency) + "</span></td>" +
            '<td><span class="badge badge-dept">' + escapeHtml(r.dept) + "</span></td><td>" + escapeHtml(r.shiftName) + "</td>" +
            '<td><span class="badge badge-time" style="cursor:default;">' + escapeHtml(String(r.time || "").slice(0, 5)) + "</span></td>" +
            "<td>" + attnPwBadge(x) + "</td><td>" + attnSubmitCell(x.pw.ts, r.date) + "</td></tr>";
    }).join("");
}
function attnDrillExportCsv() {
    const list = attnDrillVisible(); if (!list.length) { showToast("⚠️ Tidak ada data untuk diexport.", "info"); return; }
    const q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    const lines = [["Date", "OpsID", "Name", "Agency", "Departement", "Shift", "Clock In FMS", "Status Absen", "Pre-Work Status", "Jam Submit Pre-Work"].map(q).join(",")];
    list.forEach(function (x) { const r = x.r; lines.push([r.date, r.opsId, r.name, r.agency, r.dept, r.shiftName, String(r.time || "").slice(0, 5), r.status, attnStatusLabel(x.pw), attnSubmitText(x.pw.ts)].map(q).join(",")); });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "PreWork_Detail_" + attnDrillMeta.replace(/[^A-Za-z0-9]+/g, "_") + "_" + attnDrillFilter + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
document.addEventListener("click", function (e) {
    const td = e.target.closest && e.target.closest("#attnSumModule td.sum-cell[data-m]");
    if (td) attnSumDrill(td.dataset.m, td.dataset.k, td.dataset.v);
});
document.addEventListener("keydown", function (e) { if (e.key === "Escape") attnDrillClose(); });

// ===== Kartu angka diklik = filter tabel (sama dgn dropdown Status Pre-Work). Klik kartu yang sedang aktif = balik ke All Status =====
function attnCardFilter(f) {
    const sel = document.getElementById("attnFilterStatus");
    sel.value = (f !== "All" && sel.value === f) ? "All" : f;
    renderAttnPreWork();
}
document.addEventListener("click", function (e) {
    const c = e.target.closest && e.target.closest("#attnCards .center-box[data-f]");
    if (c) attnCardFilter(c.dataset.f);
});
document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    const c = e.target.closest && e.target.closest("#attnCards .center-box[data-f]");
    if (c) { e.preventDefault(); attnCardFilter(c.dataset.f); }
});
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && attnPending && document.getElementById("attnPreviewModal").style.display === "flex") attnPreviewCancel();
});

function attnApplyModuleVisibility(mod) {
    const isAttn = mod === "attn", isSum = mod === "sum", other = isAttn || isSum, $ = function (id) { return document.getElementById(id); };
    const panel = document.querySelector("main.main-content > .input-panel"), layout = document.querySelector("main.main-content > .main-layout:not(#attnModule):not(#attnSumModule)");
    if (panel) panel.style.display = other ? "none" : "";
    if (layout) layout.style.display = other ? "none" : "";
    $("attnModule").style.display = isAttn ? "flex" : "none";
    $("attnSumModule").style.display = isSum ? "flex" : "none";
    $("tabAttnBtn").classList.toggle("active", isAttn);
    $("tabSumBtn").classList.toggle("active", isSum);
    $("btnImportMaster").style.display = other ? "none" : "";
    if (other) attnAttachListener();
    if (other) { $("tabRestBtn").classList.remove("active"); $("tabAssetBtn").classList.remove("active"); }
}
