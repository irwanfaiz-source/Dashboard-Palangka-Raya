/**
 * assets/js/rest-time/cycle-logic.js — Aturan siklus, anti double scan, status siklus, siklus bolong
 * Bagian 7/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    // Batas umur siklus (jam), DIHITUNG DARI CHECK IN siklus berjalan. Lewat batas ini (belum Break Out / belum Break In)
    // -> siklus dianggap Expired, scan berikutnya kembali ke Check In baru.
    const REST_RESET_HOURS = 9;

    // ===== ANTI DOUBLE SCAN (Rest Time) =====
    // OpsID yang SAMA ditolak kalau di-scan lagi dalam jeda ini sejak scan terakhirnya (apa pun aksinya).
    // Tanpa ini, scan kedua otomatis jadi langkah berikutnya (Check In -> langsung Break Out). Ubah angkanya kalau perlu.
    const DOUBLE_SCAN_COOLDOWN_SEC = 120;
    const recentScanAt = {};   // cache lokal: scan yang baru dikirim tapi belum balik dari Firebase

    function getLastScanInfo(opsId) {
        const low = String(opsId).toLowerCase();
        let last = null;
        logsArray.forEach(function (l) {
            if (String(l.opsId).toLowerCase() !== low) return;
            const t = parseDateTime(l.timestamp);
            if (t && (!last || t > last.t)) last = { t: t, type: l.breakType };
        });
        const mem = recentScanAt[low];
        if (mem && (!last || mem.t > last.t)) last = mem;
        return last;
    }

    // return null kalau aman, atau { type, secAgo, waitSec } kalau terdeteksi double scan
    function detectDoubleScan(opsId) {
        const last = getLastScanInfo(opsId);
        if (!last) return null;
        const secAgo = Math.round((new Date() - last.t) / 1000);
        if (secAgo < 0 || secAgo >= DOUBLE_SCAN_COOLDOWN_SEC) return null;
        return { type: last.type, secAgo: secAgo, waitSec: DOUBLE_SCAN_COOLDOWN_SEC - secAgo };
    }

    // Status siklus DIHITUNG dari log yang ada (bukan dari angka cycleNum), jadi kalau Break Out / Break In di-rollback
    // otomatis balik ke langkah yang belum ada ("Scan Awal" langkah itu):
    //   Check In  : Clear, Break Out : Null                    -> Break Out (lewat 9 jam dari Check In = Expired -> Check In baru)
    //   Check In  : Clear, Break Out : Clear, Break In : Null  -> Break In  (lewat 9 jam dari Check In = Expired -> Check In baru)
    //   Check In  : Clear, Break Out : Clear, Break In : Clear -> langsung Next Date (Check In baru, tanggal scan sekarang)
    function calculateNextState(opsId, actualDateStr) {
        let userLogs = logsArray.filter(log => log.opsId.toLowerCase() === opsId.toLowerCase());
        userLogs.sort((a, b) => parseDateTime(a.timestamp) - parseDateTime(b.timestamp));
        const newCycle = { cycleNum: 1, action: "Check In", logDate: actualDateStr };

        if (userLogs.length === 0) return newCycle;

        let lastLog = userLogs[userLogs.length - 1];

        // Siklus berjalan = log di tanggal terakhir, mulai dari Check In terakhir
        let dayLogs = userLogs.filter(l => l.workingDate === lastLog.workingDate), startIdx = -1;
        for (let k = dayLogs.length - 1; k >= 0; k--) { if (dayLogs[k].breakType === "Check In") { startIdx = k; break; } }
        const hasCI = startIdx >= 0, cyc = hasCI ? dayLogs.slice(startIdx) : dayLogs;
        const has = function (t) { return cyc.some(l => l.breakType === t); };
        const hasBO = has("Break Out"), hasBI = has("Break In"), legacyDone = has("Selesai");

        // Umur siklus = sejak Check In siklus ini (bukan sejak scan terakhir). Lewat 9 jam = Expired.
        const hoursPassed = hasCI ? (new Date() - parseDateTime(dayLogs[startIdx].timestamp)) / (1000 * 60 * 60) : 0;

        if (!hasCI || legacyDone || (hasBO && hasBI) || hoursPassed > REST_RESET_HOURS) return newCycle;   // Check In baru = Next Date
        if (!hasBO) return { cycleNum: 2, action: "Break Out", logDate: lastLog.workingDate };
        return { cycleNum: 3, action: "Break In", logDate: lastLog.workingDate };
    }

    // ===== Penanda siklus tidak lengkap =====
    // Siklus = satu Check In + Break Out / Break In sesudahnya (sampai Check In berikutnya). Siklus dianggap BOLONG kalau:
    //   - Check In tapi tidak Break Out, atau Break Out tapi tidak Break In, DAN
    //   - umurnya sudah lewat REST_RESET_HOURS (9 jam) = Expired. Umur dihitung dari Check In sampai Check In berikutnya
    //     (siklus yang sudah diganti), atau sampai sekarang (siklus terakhir). Aturan sama dgn calculateNextState.
    // Dihitung per OpsID dari seluruh logsArray, jadi baris siklus baru juga bisa menandai siklus sebelumnya yang bolong
    // (termasuk beda tanggal). Cakupan terbatas ke log yang sudah termuat (window LOGS_WINDOW_DAYS + tanggal yang dibuka).
    function buildCycleGapIndex() {
        const byUser = {}, idx = {}, now = Date.now(), limit = REST_RESET_HOURS * 3600000;
        logsArray.forEach(function (l) {
            if (!l || !l.opsId) return;
            const k = String(l.opsId).toLowerCase();
            (byUser[k] = byUser[k] || []).push(l);
        });
        Object.keys(byUser).forEach(function (u) {
            const logs = byUser[u].map(function (l) { const d = parseDateTime(l.timestamp); return { l: l, t: d ? d.getTime() : NaN }; })
                .filter(function (x) { return !isNaN(x.t); }).sort(function (a, b) { return a.t - b.t; });
            const cycles = [];
            logs.forEach(function (x) { if (x.l.breakType === "Check In") cycles.push({ ci: x.t, date: x.l.workingDate, bo: null, bi: null, done: false, gap: null }); });
            if (!cycles.length) return;
            logs.forEach(function (x) {
                const bt = x.l.breakType; if (bt === "Check In") return;
                let c = null;
                for (let i = cycles.length - 1; i >= 0; i--) { if (cycles[i].ci <= x.t) { c = cycles[i]; break; } }
                if (!c) c = cycles.find(function (cy) { return cy.date === x.l.workingDate; }) || null;   // jam Break Out / In diedit sampai sebelum Check In
                if (!c) return;
                if (bt === "Break Out") { if (c.bo === null) c.bo = x.t; }
                else if (bt === "Break In") { if (c.bi === null) c.bi = x.t; }
                else if (bt === "Selesai") c.done = true;
            });
            cycles.forEach(function (c, i) {
                if (c.done || (c.bo !== null && c.bi !== null)) return;
                const next = cycles[i + 1], age = (next ? next.ci : now) - c.ci;
                if (age <= limit) return;   // masih dalam batas 9 jam, belum Expired
                c.gap = c.bo === null ? "noBO" : "noBI"; c.ageH = age / 3600000; c.nextCi = next ? next.ci : null;
            });
            idx[u] = cycles;
        });
        return idx;
    }

    // Siklus bolong yg relevan utk satu baris (OpsID + tanggal): siklus di tanggal itu + siklus tepat sebelumnya (kalau beda tanggal)
    function cycleGapsForRow(idx, opsId, dateStr) {
        const cycles = idx[String(opsId).toLowerCase()]; if (!cycles) return [];
        const first = cycles.findIndex(function (c) { return c.date === dateStr; }); if (first < 0) return [];
        const out = cycles.filter(function (c) { return c.date === dateStr && c.gap; }).map(function (c) { return { c: c, prev: false }; });
        const p = cycles[first - 1];
        if (p && p.gap && p.date !== dateStr) out.unshift({ c: p, prev: true });
        return out;
    }

