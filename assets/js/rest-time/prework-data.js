/**
 * assets/js/rest-time/prework-data.js — Pre-Work Status: baca Google Sheet, cocokkan nama, status badge
 * Bagian 2/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    // ===== Pre-Work Status (Google Sheet "PreWork Helper") =====
    // Sheet harus bisa dibaca via link ("Anyone with the link can view").
    // - "Pre-Work Operator": A (Timestamp), D (Ops ID), E (Nama), J (DATE), K (OpsXXX), M (Status)
    // - "Raw Data" (master): A (OPS ID), B (Staff Name)
    const PREWORK_SHEET_ID = "1vuJf4-_9sVpWI2WnokZxVCcOyIrnci-qQckxoabNQ8w";
    const PREWORK_SHEET_NAME = "Pre-Work Operator";
    const PREWORK_RAW_SHEET_NAME = "Raw Data";
    const PREWORK_REFRESH_MS = 60000;
    let preWorkIndex = {};        // { opsLower: { "YYYY-MM-DD": [ { ts, status, nm } ] } }  (semua entri, dipilih pas render)
    let preWorkNameIndex = {};    // { namaNormal: { "YYYY-MM-DD": { ts, ops, status } } }
    let rawByOps = {};            // { opsLower: namaNormal }  (Raw Data)
    let rawByName = {};           // { namaNormal: "OpsXXXX" | null (null = nama dobel dgn OpsID beda) }  (Raw Data)
    let rawDataReady = false;
    let preWorkState = "loading"; // "loading" | "ready" | "error"
    let preWorkCbSeq = 0;

    function preWorkYMD(d) {
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function preWorkNormName(n) {
        return String(n || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    }

    // Terima cell gviz ({v, f}). Return Date atau null. order: "dmy" (Timestamp) / "mdy" (kolom DATE).
    function preWorkParseDate(cell, order) {
        if (!cell || cell.v === null || cell.v === undefined) return null;
        const v = cell.v;
        if (v instanceof Date) return v;
        // serial number Google Sheets (mis. 46337 = 2026-11-11), kolom DATE kadang kebaca angka
        if (typeof v === "number" && v > 20000 && v < 80000) {
            return new Date(1899, 11, 30 + Math.floor(v));
        }
        if (typeof v === "string") {
            let m = v.match(/^Date\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+),\s*(\d+))?/);
            if (m) return new Date(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
            m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
            if (m) {
                const a = +m[1], b = +m[2];
                const day = order === "mdy" ? b : a;
                const mon = order === "mdy" ? a : b;
                const dt = new Date(+m[3], mon - 1, day, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
                // tolak tanggal ngaco (bulan >12 / hari ga valid) biar ga rollover diam-diam
                if (mon < 1 || mon > 12 || dt.getMonth() !== mon - 1 || dt.getDate() !== day) return null;
                return dt;
            }
        }
        return null;
    }

    function preWorkBuildIndex(resp) {
        const rows = (resp && resp.table && resp.table.rows) || [];
        const idx = {};
        const nameIdx = {};
        rows.forEach(function (row) {
            const c = row.c || [];
            const val = function (i) { return c[i] && c[i].v !== null && c[i].v !== undefined ? String(c[i].v).trim() : ""; };
            // urutan select: A(0) Timestamp, D(1) Ops ID, E(2) Nama, J(3) DATE, K(4) OpsXXX, M(5) Status
            const opsOrig = val(4) || (val(1) ? "Ops" + val(1) : "");
            if (!opsOrig) return;
            const ops = opsOrig.toLowerCase();
            const tsDate = preWorkParseDate(c[0], "dmy");
            if (!tsDate) return; // baris header / baris rusak
            const dayDate = preWorkParseDate(c[3], "mdy") || tsDate;
            const dateStr = preWorkYMD(dayDate);
            const status = val(5).toUpperCase();
            const ts = tsDate.getTime();
            const nm = preWorkNormName(val(2));
            if (!idx[ops]) idx[ops] = {};
            if (!idx[ops][dateStr]) idx[ops][dateStr] = [];
            idx[ops][dateStr].push({ ts: ts, status: status, nm: nm });
            if (nm) {
                if (!nameIdx[nm]) nameIdx[nm] = {};
                const prevN = nameIdx[nm][dateStr];
                if (!prevN || ts >= prevN.ts) nameIdx[nm][dateStr] = { ts: ts, ops: opsOrig, status: status };
            }
        });
        return { idx: idx, nameIdx: nameIdx };
    }

    function preWorkBuildRaw(resp) {
        const rows = (resp && resp.table && resp.table.rows) || [];
        const byOps = {}, byName = {};
        rows.forEach(function (row) {
            const c = row.c || [];
            const ops = c[0] && c[0].v !== null && c[0].v !== undefined ? String(c[0].v).trim() : "";
            const nm = preWorkNormName(c[1] && c[1].v);
            if (!/^ops\d+$/i.test(ops) || !nm) return; // skip header / baris kosong
            byOps[ops.toLowerCase()] = nm;
            if (byName[nm] === undefined) byName[nm] = ops;
            else if (byName[nm] !== null && byName[nm].toLowerCase() !== ops.toLowerCase()) byName[nm] = null;
        });
        return { byOps: byOps, byName: byName };
    }

    // Levenshtein distance (buat toleransi typo / beda pemisah kata di nama)
    function preWorkLev(a, b) {
        const m = a.length, n = b.length;
        if (!m) return n;
        if (!n) return m;
        let prev = [];
        for (let j = 0; j <= n; j++) prev[j] = j;
        for (let i = 1; i <= m; i++) {
            const cur = [i];
            for (let j = 1; j <= n; j++) {
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
            prev = cur;
        }
        return prev[n];
    }

    // Kemiripan huruf (spasi dibuang), 0..1
    function preWorkSimilarity(a, b) {
        const sa = a.replace(/ /g, ""), sb = b.replace(/ /g, "");
        if (!sa || !sb) return 0;
        if (sa === sb) return 1;
        return 1 - preWorkLev(sa, sb) / Math.max(sa.length, sb.length);
    }

    // Cocokin nama Pre-Work vs nama yg diharapkan (Raw Data / web). Toleran buat singkatan, urutan, typo, & beda spasi.
    // Kalau salah satu kosong -> dianggap cocok (ga bisa diverifikasi, jangan buang data).
    function preWorkNameMatch(a, b) {
        if (!a || !b) return true;
        if (a === b) return true;
        const ta = a.split(" "), tb = b.split(" ");
        const small = ta.length <= tb.length ? ta : tb;
        const big = ta.length <= tb.length ? tb : ta;
        const hit = small.filter(function (w) { return big.indexOf(w) !== -1; }).length;
        if (hit >= Math.max(1, Math.ceil(small.length * 0.6))) return true;
        // fallback: bandingin kemiripan huruf (toleran typo / "risa latul" vs "risalatul")
        return preWorkSimilarity(a, b) >= 0.75;
    }

    // Cari entri Pre-Work by nama di tanggal tertentu: exact dulu, lalu fuzzy (lebih ketat, cuma kemiripan huruf >= 0.8)
    function preWorkFindByName(nm, dateStr) {
        if (!nm) return null;
        if (preWorkNameIndex[nm] && preWorkNameIndex[nm][dateStr]) return preWorkNameIndex[nm][dateStr];
        let best = null;
        Object.keys(preWorkNameIndex).forEach(function (k) {
            const e = preWorkNameIndex[k][dateStr];
            if (!e) return;
            if (preWorkSimilarity(k, nm) >= 0.8 && (!best || e.ts > best.ts)) best = e;
        });
        return best;
    }

    function preWorkParseText(text) {
        const m = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
        if (!m) throw new Error("Respon sheet tidak valid (sheet private / bukan JSON)");
        return JSON.parse(m[1]);
    }

    function preWorkUrl(sheetName, select, handlerName) {
        return "https://docs.google.com/spreadsheets/d/" + PREWORK_SHEET_ID + "/gviz/tq?tqx=out:json" + (handlerName ? ";responseHandler:" + handlerName : "")
            + "&sheet=" + encodeURIComponent(sheetName) + "&tq=" + encodeURIComponent(select);
    }

    // Fallback kalau fetch diblok CORS: pakai tag <script> (JSONP)
    function preWorkFetchViaScript(sheetName, select, timeoutMs) {
        return new Promise(function (resolve, reject) {
            const cbName = "__preWorkCb" + (++preWorkCbSeq);
            const s = document.createElement("script");
            const cleanup = function () { delete window[cbName]; if (s.parentNode) s.parentNode.removeChild(s); };
            const timer = setTimeout(function () { cleanup(); reject(new Error("Timeout")); }, timeoutMs || 15000);
            window[cbName] = function (resp) { clearTimeout(timer); cleanup(); resolve(resp); };
            s.onerror = function () { clearTimeout(timer); cleanup(); reject(new Error("Gagal load sheet")); };
            s.src = preWorkUrl(sheetName, select, cbName);
            document.head.appendChild(s);
        });
    }

    // Ingat jalur yg terakhir berhasil ("fetch" / "script"): kalau fetch ke-blok CORS, request berikutnya
    // langsung lewat <script>, ga perlu nunggu fetch gagal dulu (itu bikin lambat 2x lipat).
    let preWorkTransport = null;

    function preWorkFetchGviz(sheetName, select, timeoutMs) {
        const ms = timeoutMs || 15000;
        const viaScript = function () {
            return preWorkFetchViaScript(sheetName, select, ms).then(function (resp) { preWorkTransport = "script"; return resp; });
        };
        if (preWorkTransport === "script") return viaScript();
        const ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
        const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms) : null;
        return fetch(preWorkUrl(sheetName, select, ""), ctrl ? { signal: ctrl.signal } : undefined)
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
            .then(function (text) { if (timer) clearTimeout(timer); const resp = preWorkParseText(text); preWorkTransport = "fetch"; return resp; })
            .catch(function () { if (timer) clearTimeout(timer); return viaScript(); });
    }

    // Tarik ulang CEPAT sebelum ngeblok Check In: cuma baris Pre-Work 2 hari terakhir (kolom Timestamp),
    // tanpa Raw Data (jarang berubah) dan tanpa renderAll(). Payload kecil = jauh lebih cepat dari full load.
    // Gagal / belum siap -> otomatis jatuh ke full load biasa.
    function preWorkQuickRefresh() {
        if (!rawDataReady || preWorkState !== "ready") return loadPreWorkSheet();
        preWorkLastAttemptAt = Date.now();
        const since = new Date();
        since.setDate(since.getDate() - 1);
        since.setHours(0, 0, 0, 0);
        const sinceTs = since.getTime();
        const q = "select A,D,E,J,K,M where A >= datetime '" + preWorkYMD(since) + " 00:00:00'";
        return preWorkFetchGviz(PREWORK_SHEET_NAME, q, 6000)
            .then(function (resp) {
                const built = preWorkBuildIndex(resp);
                // buang entri lama yg masuk jendela 2 hari ini (nanti diganti data baru), hari2 sebelumnya tetap dari full load
                Object.keys(preWorkIndex).forEach(function (ops) {
                    Object.keys(preWorkIndex[ops]).forEach(function (d) {
                        preWorkIndex[ops][d] = preWorkIndex[ops][d].filter(function (e) { return e.ts < sinceTs; });
                        if (!preWorkIndex[ops][d].length) delete preWorkIndex[ops][d];
                    });
                    if (!Object.keys(preWorkIndex[ops]).length) delete preWorkIndex[ops];
                });
                Object.keys(built.idx).forEach(function (ops) {
                    if (!preWorkIndex[ops]) preWorkIndex[ops] = {};
                    Object.keys(built.idx[ops]).forEach(function (d) {
                        preWorkIndex[ops][d] = (preWorkIndex[ops][d] || []).concat(built.idx[ops][d]);
                    });
                });
                Object.keys(built.nameIdx).forEach(function (nm) {
                    if (!preWorkNameIndex[nm]) preWorkNameIndex[nm] = {};
                    Object.keys(built.nameIdx[nm]).forEach(function (d) {
                        const prev = preWorkNameIndex[nm][d], e = built.nameIdx[nm][d];
                        if (!prev || e.ts >= prev.ts) preWorkNameIndex[nm][d] = e;
                    });
                });
            })
            .catch(function (err) {
                console.warn("Quick refresh Pre-Work gagal, fallback full load:", err);
                return loadPreWorkSheet();
            });
    }

    function loadPreWorkSheet() {
        preWorkLastAttemptAt = Date.now();
        const pPre = preWorkFetchGviz(PREWORK_SHEET_NAME, "select A,D,E,J,K,M")
            .then(function (resp) {
                const built = preWorkBuildIndex(resp);
                preWorkIndex = built.idx;
                preWorkNameIndex = built.nameIdx;
                preWorkState = "ready";
            })
            .catch(function (err) {
                console.warn("Pre-Work sheet gagal dimuat:", err);
                if (preWorkState !== "ready") preWorkState = "error"; // kalau sebelumnya sukses, pakai data lama
            });
        const pRaw = preWorkFetchGviz(PREWORK_RAW_SHEET_NAME, "select A,B")
            .then(function (resp) {
                const raw = preWorkBuildRaw(resp);
                rawByOps = raw.byOps;
                rawByName = raw.byName;
                rawDataReady = true;
            })
            .catch(function (err) { console.warn("Sheet Raw Data gagal dimuat:", err); });
        return Promise.all([pPre, pRaw]).then(function () { if (currentActiveModule === "rest" || currentActiveModule === "attn" || currentActiveModule === "sum") renderAll(); });
    }

    function preWorkSafe(t) { return String(t).replace(/[<>&"]/g, ""); }

    function preWorkStatusBadge(status) {
        if (!status) return '<span class="badge alert-reminder" style="white-space:nowrap;" title="Baris Pre-Work ada tapi kolom Status kosong">Status Kosong</span>';
        if (status === "FIT") return '<span class="badge alert-disiplin">FIT</span>';
        if (status === "UNFIT") return '<span class="badge alert-gancang">UNFIT</span>';
        return '<span class="badge alert-reminder">' + preWorkSafe(status) + '</span>';
    }

    // Aturan (berdasarkan tanggal scan di web), key pencarian = OpsID saja:
    // 1. Ada input OpsID di Pre-Work Operator pada tanggal scan -> FIT / UNFIT sesuai kolom Status
    // 2. Tidak ada -> Belum Submit
    //
    // getPreWorkStatus() = SUMBER KEBENARAN status (dipakai badge tabel DAN blocker Check In, biar ga pernah beda).
    // Return { code, status, ts }
    // code: LOADING | ERROR | FIT | UNFIT | EMPTY | OTHER | BELUM_SUBMIT
    function preWorkStatusResult(status, ts) {
        if (!status) return { code: "EMPTY", status: "", ts: ts };
        if (status === "FIT") return { code: "FIT", status: status, ts: ts };
        if (status === "UNFIT") return { code: "UNFIT", status: status, ts: ts };
        return { code: "OTHER", status: status, ts: ts };
    }

    function getPreWorkStatus(opsId, dateStr, opName) {
        if (preWorkState === "loading") return { code: "LOADING" };
        if (preWorkState === "error") return { code: "ERROR" };
        // Key pencarian = OpsID saja (nama & Raw Data tidak dipakai). Ambil submit terbaru di tanggal tsb.
        const opsKey = String(opsId).toLowerCase();
        const byDate = preWorkIndex[opsKey];
        const rec = ((byDate && byDate[dateStr]) || []).slice().sort(function (a, b) { return b.ts - a.ts; })[0] || null;
        if (rec) return preWorkStatusResult(rec.status, rec.ts);
        return { code: "BELUM_SUBMIT" };
    }

    function renderPreWorkBadge(opsId, dateStr, opName) {
        const r = getPreWorkStatus(opsId, dateStr, opName);
        switch (r.code) {
            case "LOADING": return '<span class="badge" style="background:var(--table-header-bg); color:var(--text-main);">...</span>';
            case "ERROR": return '<span class="badge" style="background:var(--table-header-bg); color:var(--text-main);" title="Sheet Pre-Work gagal dimuat">N/A</span>';
            case "BELUM_SUBMIT":
                return '<span class="badge alert-istirahat" style="white-space:nowrap;">Belum Submit</span>';
            default: return preWorkStatusBadge(r.status); // FIT / UNFIT / EMPTY / OTHER
        }
    }

