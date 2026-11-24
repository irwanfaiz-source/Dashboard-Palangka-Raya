/**
 * assets/js/rest-time/checkin-blockers.js — Blocker Check In (Pre-Work, shift 00.00) & popup karyawan baru
 * Bagian 3/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    // ===== BLOCKER CHECK IN (berdasarkan Pre-Work Status) =====
    // FIT                      -> Pass
    // UNFIT                    -> Block Check In - Take Out / Dipulangkan
    // Belum Submit             -> Block Check In - Wajib Melakukan Pengisian Ulang
    // Status Kosong / ga valid -> Block (perlakuan sama kayak Belum Submit: status ga bisa dipastiin = isi ulang)
    // Sheet loading / gagal dimuat (LOADING / ERROR) -> JANGAN ngeblok semua operator gara2 sheet down: loloskan + toast warning
    // Umur maksimal Pre-Work (jam) dihitung dari jam submit sampai jam Check In
    const PREWORK_MAX_AGE_HOURS = 3;
    function getPreWorkGate(opsId, dateStr, opName) {
        // Pengaman: tanggal acuan minimal = tanggal kalender scan sekarang (hindari mismatch kalau dateStr basi, mis. masih 13 padahal sudah 14)
        const todayStr = getWorkingDateStr(new Date());
        if (!dateStr || dateStr < todayStr) dateStr = todayStr;
        let r = getPreWorkStatus(opsId, dateStr, opName);
        // Antisipasi miss match tanggal: Pre-Work harus disubmit di tanggal yang sama dengan Check In (jam 00.00 ke atas).
        // Isian Pre-Work yang jamnya sebelum 00.00 tanggal Check In (mis. 23.35 kemarin) tidak dianggap -> wajib isi ulang.
        if (r.code !== "LOADING" && r.code !== "ERROR") {
            const midnight = new Date(dateStr + "T00:00:00").getTime();
            const prevDate = getWorkingDateStr(new Date(midnight - 86400000));
            const byDate = preWorkIndex[String(opsId).toLowerCase()] || {};
            const all = (byDate[dateStr] || []).concat(byDate[prevDate] || []);
            const valid = all.filter(function (e) { return e.ts >= midnight; }).sort(function (a, b) { return b.ts - a.ts; })[0];
            if (valid) {
                r = preWorkStatusResult(valid.status, valid.ts);
            } else {
                const early = all.filter(function (e) { return e.ts < midnight; }).sort(function (a, b) { return b.ts - a.ts; })[0];
                r = early ? { code: "BEFORE_MIDNIGHT", status: early.status, ts: early.ts } : { code: "BELUM_SUBMIT" };
            }
        }
        // Pre-Work Expired: submit lebih dari 3 jam sebelum jam Check In (UNFIT tetap diprioritaskan: Take Out / Dipulangkan)
        if (r.ts && r.code !== "UNFIT" && (Date.now() - r.ts) > PREWORK_MAX_AGE_HOURS * 3600000) {
            r = { code: "EXPIRED", status: r.status, ts: r.ts };
        }
        if (r.code === "FIT") return { block: false, r: r };
        if (r.code === "LOADING" || r.code === "ERROR") return { block: false, unverified: true, r: r };
        return { block: true, r: r };
    }

    // ===== BLOCKER CHECK IN SHIFT 00.00 (terlalu awal / sebelum jam 00.00) =====
    // Operator Shift 00.00 sering scan duluan di 23.40-23.59 (beda tanggal). Check In wajib setelah jam 00.00.
    // Cuma berlaku untuk aksi Check In beneran (Break Out / Break In / Selesai tidak disentuh).
    // Batas awal jendela blokir (menit dari 00:00). 23:30 = 1410. Ubah di sini kalau mau lebih awal / lebih telat.
    const SHIFT0_BLOCK_FROM_MIN = 23 * 60 + 30;
    function isShift00EarlyCheckIn(dateObj) {
        return (dateObj.getHours() * 60 + dateObj.getMinutes()) >= SHIFT0_BLOCK_FROM_MIN;
    }

    function showEarlyCheckInBlockModal(opsId, name) {
        const who = '<b style="font-family:monospace; color:var(--text-main);">' + preWorkSafe(opsId) + '</b>' + (name ? ' - ' + preWorkSafe(name) : '');
        document.getElementById("preWorkBlockIcon").innerText = "⏰";
        document.getElementById("preWorkBlockTitle").innerText = "Check In Terlalu Awal!";
        document.getElementById("preWorkBlockMain").innerHTML = '<b style="color:var(--text-main);">Check In Wajib di atas Jam 00.00</b>';
        document.getElementById("preWorkBlockSub").innerHTML = 'OpsID ' + who + ' (Shift 00.00) belum boleh Check In sebelum jam 00.00. Silakan Scan lagi setelah jam 00.00.';
        document.getElementById("preWorkBlockModal").style.display = "flex";
        playSound('warning');
    }

    // ===== POPUP KARYAWAN BARU (Rest Time): OpsID yang di-scan belum ada di Database Karyawan =====
    function showUnknownStaffModal(opsId) {
        const who = '<b style="font-family:monospace; color:var(--text-main);">' + preWorkSafe(opsId) + '</b>';
        document.getElementById("preWorkBlockIcon").innerText = "🆕";
        document.getElementById("preWorkBlockTitle").innerText = "Karyawan Baru";
        document.getElementById("preWorkBlockMain").innerHTML = '<b style="color:var(--text-main);">Tolong Update Raw Staff Profile</b>';
        document.getElementById("preWorkBlockSub").innerHTML = 'OpsID ' + who + ' belum ada di Database Karyawan. Scan belum tercatat. Update Raw Staff Profile dulu, lalu Scan lagi.';
        document.getElementById("preWorkBlockModal").style.display = "flex";
        playSound('warning');
    }

    let preWorkLastAttemptAt = 0;
    let preWorkRefreshing = false;

    function showPreWorkBlockModal(opsId, name, gate) {
        const r = gate.r;
        const strong = function (v) { return '<b style="color:var(--text-main);">' + v + '</b>'; };
        const mono = function (v) { return '<b style="font-family:monospace; color:var(--text-main);">' + preWorkSafe(v) + '</b>'; };
        const who = mono(opsId) + (name ? ' - ' + preWorkSafe(name) : '');
        let icon, title, main, sub;
        switch (r.code) {
            case "UNFIT":
                icon = "🚫"; title = "Status Pre-Work UNFIT!";
                main = 'Check In diblokir. ' + strong('Take Out / Dipulangkan') + ', gak boleh masuk area kerja.';
                sub = 'OpsID ' + who + ' berstatus UNFIT di Pre-Work hari ini.';
                break;
            case "EXPIRED":
                icon = "⌛"; title = "Pre-Work Expired!";
                main = 'Check In diblokir. ' + strong('Pre-Work Expired') + ' : Silahkan melakukan ' + strong('pengisian Ulang') + ', lalu Scan lagi.';
                sub = 'OpsID ' + who + ' submit Pre-Work jam ' + preWorkSafe(new Date(r.ts).toTimeString().slice(0, 5)) + ', lebih dari ' + PREWORK_MAX_AGE_HOURS + ' jam sebelum Check In.';
                break;
            case "BEFORE_MIDNIGHT":
                icon = "📝"; title = "Pre-Work Disubmit Sebelum Jam 00.00!";
                main = 'Check In diblokir. ' + strong('Submitten PreWork Wajib diatas Jam 00.00') + ' : Silahkan melakukan ' + strong('Pengisian Ulang') + ', lalu Scan lagi.';
                sub = 'OpsID ' + who + ' submit Pre-Work jam ' + preWorkSafe(new Date(r.ts).toTimeString().slice(0, 5)) + ' (sebelum 00.00 tanggal Check In).';
                break;
            case "BELUM_SUBMIT":
                icon = "📝"; title = "Pre-Work Belum Disubmit!";
                main = 'Check In diblokir. ' + strong('Wajib Melakukan Pengisian Ulang') + ' Pre-Work, lalu Scan lagi.';
                sub = 'OpsID ' + who + ' belum ada Pre-Work yang kebaca untuk hari ini.';
                break;
            default: // EMPTY / OTHER (status kosong / ga valid) -> perlakuan sama kayak Belum Submit
                icon = "📝"; title = "Status Pre-Work Tidak Valid!";
                main = 'Check In diblokir. ' + strong('Wajib Melakukan Pengisian Ulang') + ' Pre-Work, lalu Scan lagi.';
                sub = 'Pre-Work OpsID ' + who + ' kebaca, tapi kolom Status-nya ' + (r.status ? 'tidak valid (' + strong(preWorkSafe(r.status)) + ')' : 'kosong') + '.';
        }
        document.getElementById("preWorkBlockIcon").innerText = icon;
        document.getElementById("preWorkBlockTitle").innerText = title;
        document.getElementById("preWorkBlockMain").innerHTML = main;
        document.getElementById("preWorkBlockSub").innerHTML = sub;
        document.getElementById("preWorkBlockModal").style.display = "flex";
        playSound('warning');
    }

    function closePreWorkBlockModal() {
        document.getElementById("preWorkBlockModal").style.display = "none";
        let inputEl = document.getElementById("inputOpsId");
        if (inputEl) { inputEl.value = ""; inputEl.focus(); }
    }

    let debounceInputTimer = null;
    let lastCheckedCalendarDate = "";
    let followToday = true;   // true = filter tanggal otomatis ikut tanggal device (pindah sendiri pas lewat tengah malam)
