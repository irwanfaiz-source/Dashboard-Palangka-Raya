/**
 * assets/js/rest-time/scan-and-alerts.js — Asset lock, alert perangkat/belum check-in, input OpsID otomatis
 * Bagian 8/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    function renderCycleGapBadge(gaps) {
        if (!gaps.length) return "";
        const p2 = function (n) { return String(n).padStart(2, "0"); };
        const fmt = function (ms) { const d = new Date(ms); return p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + " " + p2(d.getHours()) + ":" + p2(d.getMinutes()); };
        const tip = gaps.map(function (g) {
            const c = g.c, what = c.gap === "noBO" ? "Check In tapi tidak Break Out" : "Break Out tapi tidak Break In";
            const why = c.nextCi ? "lalu Check In baru " + fmt(c.nextCi) + " (" + Math.floor(c.ageH) + " jam sejak Check In)" : "sudah " + Math.floor(c.ageH) + " jam sejak Check In";
            return (g.prev ? "Siklus sebelumnya " : "Siklus ") + fmt(c.ci) + ": " + what + ", " + why + ". Batas " + REST_RESET_HOURS + " jam = Expired.";
        }).join("\n");
        const g0 = gaps[gaps.length - 1], label = (g0.c.gap === "noBO" ? "Tanpa Break Out" : "Tanpa Break In");
        const txt = "⌛ Expired" + (g0.prev ? " (siklus lalu)" : "") + " · " + label + (gaps.length > 1 ? " +" + (gaps.length - 1) : "");
        return '<span class="badge badge-cycle-gap" title="' + escapeHtml(tip).replace(/\n/g, "&#10;") + '">' + escapeHtml(txt) + "</span>";
    }

    function calculateNextAssetState(opsId, actualDateStr) {
        let userLogs = assetLogsArray.filter(log => log.opsId.toLowerCase() === opsId.toLowerCase());
        userLogs.sort((a, b) => parseDateTime(a.timestamp) - parseDateTime(b.timestamp));

        if (userLogs.length === 0) {
            return { action: "Pinjam PDA", logDate: actualDateStr };
        }

        let lastLog = userLogs[userLogs.length - 1];
        let hoursPassed = (new Date() - parseDateTime(lastLog.timestamp)) / (1000 * 60 * 60);

        if (hoursPassed > 12) {
            return { action: "Pinjam PDA", logDate: actualDateStr };
        }

        if (lastLog.action === "Pinjam PDA") {
            return { action: "Kembali PDA", logDate: lastLog.workingDate };
        } else {
            return { action: "Pinjam PDA", logDate: actualDateStr };
        }
    }

    function getShiftCheckInTime(opsId, referenceTime) {
        let checkIns = logsArray
            .filter(function (log) { return log.opsId.toLowerCase() === opsId.toLowerCase() && log.breakType === "Check In"; })
            .map(function (log) { return parseDateTime(log.timestamp); })
            .filter(Boolean)
            .sort(function (a, b) { return a - b; });

        let candidate = null;
        checkIns.forEach(function (t) { if (t <= referenceTime) candidate = t; });
        return candidate;
    }

    function getActiveAssetLock(fullSn) {
        let snLogs = assetLogsArray.filter(function (log) { return log.serialNumber === fullSn; });
        if (snLogs.length === 0) return null;
        snLogs.sort(function (a, b) { return parseDateTime(a.timestamp) - parseDateTime(b.timestamp); });

        let lastLog = snLogs[snLogs.length - 1];
        let holderOpsId, pinjamLog;

        if (lastLog.action === "Pinjam PDA") {
            holderOpsId = lastLog.opsId;
            pinjamLog = lastLog;
        } else {
            let kembaliKeCount = assetLogsArray.filter(function (log) {
                return log.opsId.toLowerCase() === lastLog.opsId.toLowerCase()
                    && log.workingDate === lastLog.workingDate
                    && log.action === "Kembali PDA"
                    && parseDateTime(log.timestamp) <= parseDateTime(lastLog.timestamp);
            }).length;

            if (kembaliKeCount >= 2) return null;

            holderOpsId = lastLog.opsId;
            let priorPinjams = assetLogsArray.filter(function (log) {
                return log.serialNumber === fullSn
                    && log.opsId.toLowerCase() === lastLog.opsId.toLowerCase()
                    && log.action === "Pinjam PDA"
                    && parseDateTime(log.timestamp) <= parseDateTime(lastLog.timestamp);
            }).sort(function (a, b) { return parseDateTime(b.timestamp) - parseDateTime(a.timestamp); });
            pinjamLog = priorPinjams[0];
            if (!pinjamLog) return null;
        }

        let pinjamTime = parseDateTime(pinjamLog.timestamp);
        let checkInTime = getShiftCheckInTime(holderOpsId, pinjamTime);
        let lockBaseTime = checkInTime || pinjamTime;
        let lockExpiry = new Date(lockBaseTime.getTime() + (9 * 60 * 60 * 1000));

        if (new Date() >= lockExpiry) return null;

        let userRaw = masterKaryawan[holderOpsId] || {};
        return { opsId: holderOpsId, name: userRaw.name || "Unknown", expiry: lockExpiry };
    }

    function getOperatorRequiredSn(opsId) {
        let userLogs = assetLogsArray.filter(function (log) { return log.opsId.toLowerCase() === opsId.toLowerCase(); });
        if (userLogs.length === 0) return null;
        userLogs.sort(function (a, b) { return parseDateTime(a.timestamp) - parseDateTime(b.timestamp); });

        let lastLog = userLogs[userLogs.length - 1];

        if (lastLog.action === "Kembali PDA") {
            let kembaliKeCount = userLogs.filter(function (log) {
                return log.workingDate === lastLog.workingDate
                    && log.action === "Kembali PDA"
                    && parseDateTime(log.timestamp) <= parseDateTime(lastLog.timestamp);
            }).length;
            if (kembaliKeCount >= 2) return null;
        }

        let pinjamLog = lastLog.action === "Pinjam PDA" ? lastLog :
            userLogs.filter(function (log) {
                return log.action === "Pinjam PDA" && parseDateTime(log.timestamp) <= parseDateTime(lastLog.timestamp);
            }).sort(function (a, b) { return parseDateTime(b.timestamp) - parseDateTime(a.timestamp); })[0];
        if (!pinjamLog) return null;

        let pinjamTime = parseDateTime(pinjamLog.timestamp);
        let checkInTime = getShiftCheckInTime(opsId, pinjamTime);
        let baseTime = checkInTime || pinjamTime;
        let expiry = new Date(baseTime.getTime() + (9 * 60 * 60 * 1000));

        if (new Date() >= expiry) return null;

        return { sn: pinjamLog.serialNumber, last5: pinjamLog.last5Sn || pinjamLog.serialNumber.slice(-5), expiry: expiry };
    }

    function showWrongDeviceAlert(requiredLast5, expiryDate) {
        document.getElementById("wrongDeviceSn").innerText = requiredLast5;
        document.getElementById("wrongDeviceExpiry").innerText = formatTime(expiryDate);
        document.getElementById("wrongDeviceModal").style.display = "flex";
        playSound('warning');
    }

    function closeWrongDeviceAlert() {
        document.getElementById("wrongDeviceModal").style.display = "none";
        let snInput = document.getElementById("inputAssetSn");
        if (snInput) { snInput.value = ""; snInput.focus(); }
    }

    function showLockAlert(name, opsId, expiryDate) {
        document.getElementById("lockAlertName").innerText = name;
        document.getElementById("lockAlertOpsId").innerText = opsId;
        document.getElementById("lockAlertExpiry").innerText = formatTime(expiryDate);
        document.getElementById("lockAlertModal").style.display = "flex";
        playSound('warning');
    }

    function closeLockAlert() {
        document.getElementById("lockAlertModal").style.display = "none";
        let snInput = document.getElementById("inputAssetSn");
        if (snInput) { snInput.value = ""; snInput.focus(); }
    }

    function hasActiveCheckIn(opsId) {
        let checkInTime = getShiftCheckInTime(opsId, new Date());
        if (!checkInTime) return false;
        let hoursPassed = (new Date() - checkInTime) / (1000 * 60 * 60);
        return hoursPassed <= 12;
    }

    function showNotCheckedInAlert(opsId) {
        document.getElementById("notCheckedInOpsId").innerText = opsId;
        document.getElementById("notCheckedInModal").style.display = "flex";
        playSound('warning');
    }

    function closeNotCheckedInAlert() {
        document.getElementById("notCheckedInModal").style.display = "none";
        let snInput = document.getElementById("inputAssetSn");
        if (snInput) { snInput.value = ""; snInput.focus(); }
    }

    function normalizeOpsId(rawId) {
        let cleaned = String(rawId == null ? "" : rawId).trim();
        if (!cleaned) return "";
        // Hasil scan format "Ops289900_Irwan" / "Ops289900 Irwan" / "289900_Irwan" -> ambil OpsID-nya aja, nama dibuang
        const scanMatch = cleaned.match(/^(?:ops)?(\d+)[\s_\-]+/i);
        if (scanMatch) return "Ops" + scanMatch[1];
        if (/^\d+$/.test(cleaned)) return "Ops" + cleaned;
        if (cleaned.toLowerCase().startsWith("ops")) return "Ops" + cleaned.replace(/^[Oo][Pp][Ss]/, '');
        return cleaned;
    }

    function handleOpsIdInputAutomated() {
        let inputEl = document.getElementById("inputOpsId");
        let rawInput = inputEl.value;
        let formattedOpsId = normalizeOpsId(rawInput);
        let badge = document.getElementById("predictedAction");

        if (!formattedOpsId) {
            badge.innerText = t("predicted.scan");
            badge.style.background = "var(--table-header-bg)";
            badge.style.color = "var(--text-main)";
            return;
        }
        
        const now = new Date();
        const actualDateStr = getWorkingDateStr(now);
        let exactKey = Object.keys(masterKaryawan).find(k => k.toLowerCase() === formattedOpsId.toLowerCase());

        if (currentActiveModule === 'rest') {
            let state = calculateNextState(exactKey || formattedOpsId, actualDateStr);
            badge.innerText = state.action;
            if(state.action === "Check In") { badge.style.background = "#ccfbf1"; badge.style.color="#0f766e"; }
            else if(state.action === "Break Out") { badge.style.background = "#ffedd5"; badge.style.color="#c2410c"; }
            else if(state.action === "Break In") { badge.style.background = "#d1fae5"; badge.style.color="#047857"; }

            clearTimeout(debounceInputTimer);
            if (rawInput.trim().length >= 5) { 
                debounceInputTimer = setTimeout(function() { submitLog(true); }, 400); 
            }
        } else {
            let state = calculateNextAssetState(exactKey || formattedOpsId, actualDateStr);
            badge.innerText = state.action;
            if(state.action === "Pinjam PDA") { badge.style.background = "#ffedd5"; badge.style.color="#c2410c"; }
            else { badge.style.background = "#d1fae5"; badge.style.color="#047857"; }

            let snInputVal = document.getElementById("inputAssetSn").value.trim();
            clearTimeout(debounceInputTimer);
            if (snInputVal.length === 5) {
                debounceInputTimer = setTimeout(function() { submitLog(); }, 300);
            }
        }
    }

