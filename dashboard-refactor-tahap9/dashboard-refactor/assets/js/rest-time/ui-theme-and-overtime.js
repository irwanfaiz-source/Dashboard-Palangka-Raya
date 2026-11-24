

    function toggleTheme() {
        const html = document.documentElement;
        const themeBtn = document.getElementById("themeBtn");
        if (html.getAttribute("data-theme") === "light") {
            html.setAttribute("data-theme", "dark");
            if (themeBtn) themeBtn.innerHTML = "☀️ <span>Light Mode</span>";
            localStorage.setItem("global_theme", "dark");
        } else {
            html.setAttribute("data-theme", "light");
            if (themeBtn) themeBtn.innerHTML = "🌙 <span>Dark Mode</span>";
            localStorage.setItem("global_theme", "light");
        }
    }

    function playSound(type) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            if (type === 'success') {
                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.start(); osc.stop(ctx.currentTime + 0.25);
            } else if (type === 'warning') {
                osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                osc.start(); osc.stop(ctx.currentTime + 0.4);
            }
        } catch (e) {}
    }

    let restOvertimeNotifiedKeys = new Set();
    let restOvertimeActiveItems = [];
    let restOvertimePendingItems = [];
    let restOvertimeModalShowing = false;
    let restOvertimeAudioUnlocked = false;
    let restTimeModuleWasVisible = true;

    let shellReportedVisible = null;

    function unlockRestOvertimeAudio() {
        if (restOvertimeAudioUnlocked) return;
        const audio = document.getElementById("restOvertimeAudio");
        if (!audio) return;
        audio.play().then(function () {
            audio.pause();
            audio.currentTime = 0;
            restOvertimeAudioUnlocked = true;
        }).catch(function () { /* belum ke-unlock, coba lagi di interaksi berikutnya */ });
    }
    document.addEventListener("click", unlockRestOvertimeAudio);
    document.addEventListener("keydown", unlockRestOvertimeAudio);

    function isRestTimeModuleVisible() {
        if (document.visibilityState !== "visible") return false;
        if (shellReportedVisible !== null) return shellReportedVisible;
        try {
            var fe = window.frameElement;
            if (fe && window.top && window.top.getComputedStyle) {
                var style = window.top.getComputedStyle(fe);
                if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) return false;
                var rect = fe.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return false;
                if (fe.offsetParent === null && style.position !== "fixed") return false;
                return true;
            }
        } catch (e) {
        }
        return document.documentElement.clientWidth > 0 && document.documentElement.clientHeight > 0;
    }

    function checkRestOvertimeAlert(opsId, dateStr, breakOutTime, name, agency, dept) {
        let diffMinutes = Math.floor((new Date() - breakOutTime) / 60000);
        if (diffMinutes <= 60) return;
        let key = opsId + "|" + dateStr + "|" + breakOutTime.getTime();
        if (restOvertimeNotifiedKeys.has(key)) return;
        restOvertimeNotifiedKeys.add(key);
        let item = { key: key, opsId: opsId, dateStr: dateStr, breakOutTime: breakOutTime, name: name, agency: agency, dept: dept };
        if (!isRestTimeModuleVisible()) {
            restOvertimePendingItems.push(item);
            return;
        }
        addRestOvertimeItem(item);
    }

    function addRestOvertimeItem(item) {
        restOvertimeActiveItems.push(item);
        renderRestOvertimeList();
        if (!restOvertimeModalShowing) {
            restOvertimeModalShowing = true;
            document.getElementById("restOvertimeModal").style.display = "flex";
        }
        playRestOvertimeSoundLoop();
    }

    function renderRestOvertimeList() {
        const container = document.getElementById("restOvertimeListBody");
        if (!container) return;
        container.innerHTML = restOvertimeActiveItems.map(function (item) {
            let diffMinutes = Math.floor((new Date() - item.breakOutTime) / 60000);
            return '<div style="text-align:left; background:var(--table-header-bg); border-radius:8px; padding:12px 14px;">'
                + '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">'
                + '<div><div style="font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Nama</div>'
                + '<div style="font-size:15px; font-weight:700;">' + item.name + '</div></div>'
                + '<div style="text-align:right;"><div style="font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Durasi</div>'
                + '<div style="font-size:14px; font-weight:700; color:#b91c1c;">' + diffMinutes + ' Menit</div></div>'
                + '</div>'
                + '<div style="display:flex; flex-wrap:wrap; gap:14px; margin-top:8px;">'
                + '<div><div style="font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">OpsID</div>'
                + '<div style="font-size:13px; font-weight:600; font-family:monospace;">' + item.opsId + '</div></div>'
                + '<div><div style="font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Dept / Agency</div>'
                + '<div style="font-size:13px; font-weight:600;">' + item.dept + ' · ' + item.agency + '</div></div>'
                + '<div><div style="font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Break Out</div>'
                + '<div style="font-size:13px; font-weight:700;">' + formatTime(item.breakOutTime) + '</div></div>'
                + '</div></div>';
        }).join("");
        const countEl = document.getElementById("restOvertimeCount");
        if (countEl) countEl.innerText = restOvertimeActiveItems.length > 1 ? "(" + restOvertimeActiveItems.length + " karyawan)" : "";
    }

    function playRestOvertimeSoundLoop() {
        try {
            const audio = document.getElementById("restOvertimeAudio");
            audio.loop = true;
            audio.currentTime = 0;
            audio.play().catch(function (e) { console.warn("Sound alert diblokir autoplay browser (klik/ketik dulu di halaman ini buat unlock):", e.message); });
        } catch (e) {}
    }

    function stopRestOvertimeSound() {
        try {
            const audio = document.getElementById("restOvertimeAudio");
            audio.loop = false;
            audio.pause();
            audio.currentTime = 0;
        } catch (e) {}
    }

    function closeRestOvertimeModal() {
        document.getElementById("restOvertimeModal").style.display = "none";
        restOvertimeModalShowing = false;
        restOvertimeActiveItems = [];
        stopRestOvertimeSound();
    }

    function handleRestTimeModuleVisibilityChange() {
        let nowVisible = isRestTimeModuleVisible();
        if (nowVisible === restTimeModuleWasVisible) return;
        restTimeModuleWasVisible = nowVisible;
        if (nowVisible) {
            if (restOvertimePendingItems.length > 0) {
                restOvertimePendingItems.forEach(function (item) { addRestOvertimeItem(item); });
                restOvertimePendingItems = [];
            }
            if (restOvertimeModalShowing) playRestOvertimeSoundLoop();
        } else {
            stopRestOvertimeSound();
        }
    }

    document.addEventListener("visibilitychange", handleRestTimeModuleVisibilityChange);

    function getWorkingDateStr(dateObj) {
        return dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');
    }

    function getFilterDateRange() {
        let startEl = document.getElementById("filterTanggalStart");
        let endEl = document.getElementById("filterTanggalEnd");
        let todayStr = getWorkingDateStr(new Date());
        let start = (startEl && startEl.value) ? startEl.value : todayStr;
        let end = (endEl && endEl.value) ? endEl.value : start;
        if (end < start) { let tmp = start; start = end; end = tmp; } // jaga2 kalau kebalik
        return { start: start, end: end };
    }

    function isDateInFilterRange(dateStr) {
        let range = getFilterDateRange();
        return dateStr >= range.start && dateStr <= range.end;
    }

    function setDateRangeToday() {
        let todayStr = getWorkingDateStr(new Date());
        document.getElementById("filterTanggalStart").value = todayStr;
        document.getElementById("filterTanggalEnd").value = todayStr;
        followToday = true; lastCheckedCalendarDate = todayStr;
        ensureLogsLoadedForRange(todayStr, todayStr);
        renderAll();
    }

