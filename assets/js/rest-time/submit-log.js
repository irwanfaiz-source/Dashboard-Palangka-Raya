/**
 * assets/js/rest-time/submit-log.js — submitLog, edit waktu, rollback, hapus log
 * Bagian 9/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    function submitLog(isAuto) {
        let inputEl = document.getElementById("inputOpsId");
        let rawInput = inputEl.value;
        let opsId = normalizeOpsId(rawInput);
        const now = new Date();
        const actualDateStr = getWorkingDateStr(now);

        if (!opsId) return;
        inputEl.value = opsId;

        let exactKey = Object.keys(masterKaryawan).find(k => k.toLowerCase() === opsId.toLowerCase());
        let foundUser = exactKey ? masterKaryawan[exactKey] : null;
        let name = document.getElementById("inputNama").value.trim();
        let dept = document.getElementById("inputDept").value;

        if (foundUser) {
            name = foundUser.name; dept = foundUser.dept || "SOC Operator";
            document.getElementById("inputNama").value = name;
            document.getElementById("inputDept").value = dept;
        } else {
            if (currentActiveModule === 'rest') {
                // Rest Time: OpsID tidak ada di Database Karyawan -> popup, scan TIDAK dicatat
                if (Object.keys(masterKaryawan).length === 0) { showToast("⚠️ Database karyawan belum termuat, coba Scan lagi sebentar.", 'info'); return; }
                // Auto-submit (debounce) jangan bunyi kalau ID masih diketik / belum lengkap; Enter tetap selalu memunculkan popup
                if (isAuto === true && !/^ops\d{6,}$/i.test(opsId)) return;
                lastSubmittedOpsId = null;
                showUnknownStaffModal(opsId);
                inputEl.value = ""; document.getElementById("inputNama").value = "";
                document.getElementById("inputNama").setAttribute("readonly", true);
                document.getElementById("predictedAction").innerText = t("predicted.scan");
                document.getElementById("predictedAction").style.background = "var(--table-header-bg)";
                return;
            }
            if (!name || name === "Belum Terdaftar") {
                document.getElementById("inputNama").removeAttribute("readonly");
                document.getElementById("inputNama").value = "";
                document.getElementById("inputNama").placeholder = "Ketik Nama Baru...";
                document.getElementById("inputNama").focus();
                showToast("⚠️ ID Baru terdeteksi! Masukkan Nama lalu Submit kembali.", 'info');
                return;
            }
        }

        let cleanOpsId = exactKey || opsId;
        let finalAgency = exactKey ? (masterKaryawan[exactKey].agency || "Dedicated Vendor") : "Dedicated Vendor";
        const timestampStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2, '0') + "-" + String(now.getDate()).padStart(2, '0') + " " + String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0') + ":" + String(now.getSeconds()).padStart(2, '0');

        if (!fbDb) { showToast("⚠️ Belum terhubung ke database online.", 'info'); openFirebaseModal(false); return; }
        lastSubmittedOpsId = cleanOpsId;

        const updates = {};
        updates[FB_ROOT + "/master/" + cleanOpsId] = { name: name, dept: dept, agency: finalAgency };

        if (currentActiveModule === 'rest') {
            let state = calculateNextState(cleanOpsId, actualDateStr);

            // ANTI DOUBLE SCAN: OpsID sama baru saja di-scan -> tolak (jangan lanjut ke Break Out / Check In baru)
            const dup = detectDoubleScan(cleanOpsId);
            if (dup) {
                lastSubmittedOpsId = null;
                playSound('warning');
                showToast("⛔ DOUBLE SCAN ditolak! " + cleanOpsId + " baru saja " + dup.type + " " + dup.secAgo + " detik lalu. Scan berikutnya baru bisa " + dup.waitSec + " detik lagi.", 'err');
                inputEl.value = ""; document.getElementById("inputNama").value = "";
                document.getElementById("inputNama").setAttribute("readonly", true);
                document.getElementById("predictedAction").innerText = t("predicted.scan");
                document.getElementById("predictedAction").style.background = "var(--table-header-bg)";
                inputEl.focus();
                return;
            }

            // BLOCKER CHECK IN: cek Pre-Work Status dulu (FIT = pass; UNFIT / Belum Submit = blok)
            if (state.action === "Check In") {
                // BLOCKER SHIFT 00.00: Check In sebelum jam 00.00 ditolak (dicek duluan, sebelum Pre-Work)
                if (isShift00EarlyCheckIn(now)) {
                    lastSubmittedOpsId = null;
                    showEarlyCheckInBlockModal(cleanOpsId, name);
                    inputEl.value = ""; document.getElementById("inputNama").value = "";
                    document.getElementById("inputNama").setAttribute("readonly", true);
                    document.getElementById("predictedAction").innerText = t("predicted.scan");
                    document.getElementById("predictedAction").style.background = "var(--table-header-bg)";
                    return;
                }
                const gate = getPreWorkGate(cleanOpsId, state.logDate, name);
                if (gate.block) {
                    lastSubmittedOpsId = null;
                    if (preWorkRefreshing) return;
                    // data sheet udah agak lama -> tarik ulang sekali sebelum ngeblok (operator baru aja isi ulang = ga perlu nunggu 60 detik)
                    if (Date.now() - preWorkLastAttemptAt > 5000) {
                        preWorkRefreshing = true;
                        showToast("🔄 Cek ulang status Pre-Work...", 'info');
                        const done = function () { preWorkRefreshing = false; submitLog(); };
                        preWorkQuickRefresh().then(done, done);
                        return;
                    }
                    showPreWorkBlockModal(cleanOpsId, name, gate);
                    inputEl.value = ""; document.getElementById("inputNama").value = "";
                    document.getElementById("inputNama").setAttribute("readonly", true);
                    document.getElementById("predictedAction").innerText = t("predicted.scan");
                    document.getElementById("predictedAction").style.background = "var(--table-header-bg)";
                    return;
                }
                if (gate.unverified) showToast("⚠️ Status Pre-Work belum bisa diverifikasi (sheet loading / gagal dimuat). Check In tetap diloloskan.", 'info');
            }

            let targetDateToSave = state.logDate;
            let existingLogs = logsArray.filter(log => log.opsId === cleanOpsId && log.workingDate === targetDateToSave);
            
            if (existingLogs.length > 0 && existingLogs[existingLogs.length - 1].breakType === state.action) {
                if(Math.round((new Date() - parseDateTime(existingLogs[existingLogs.length - 1].timestamp)) / 1000) < 15) {
                    showToast("⚠️ Data ganda! ID ini baru saja di-scan.", 'err');
                    inputEl.value = ""; document.getElementById("inputNama").value = ""; return;
                }
            }

            recentScanAt[cleanOpsId.toLowerCase()] = { t: new Date(), type: state.action };
            const newKey = fbDb.ref(FB_ROOT + "/logs").push().key;
            updates[FB_ROOT + "/logs/" + newKey] = { opsId: cleanOpsId, breakType: state.action, timestamp: timestampStr, workingDate: targetDateToSave, cycleNum: state.cycleNum };

            fbDb.ref().update(updates).then(function () { playSound('success'); });
        } else {
            let snInput = document.getElementById("inputAssetSn").value.trim();
            if (!snInput || snInput.length < 5) {
                showToast("⚠️ Masukkan 5 Digit Terakhir Serial Number PDA!", 'info');
                document.getElementById("inputAssetSn").focus();
                return;
            }

            let fullSn = findFullSerialNumber(snInput);
            if (!fullSn) {
                showToast(`❌ Serial Number dengan akhiran "${snInput}" tidak ditemukan dalam sistem!`, 'err');
                return;
            }

            let state = calculateNextAssetState(cleanOpsId, actualDateStr);

            if (state.action === "Pinjam PDA") {
                if (!hasActiveCheckIn(cleanOpsId)) {
                    showNotCheckedInAlert(cleanOpsId);
                    return;
                }

                let requiredSn = getOperatorRequiredSn(cleanOpsId);
                if (requiredSn && requiredSn.sn !== fullSn) {
                    showWrongDeviceAlert(requiredSn.last5, requiredSn.expiry);
                    return;
                }

                let activeLock = getActiveAssetLock(fullSn);
                if (activeLock && activeLock.opsId.toLowerCase() !== cleanOpsId.toLowerCase()) {
                    showLockAlert(activeLock.name, activeLock.opsId, activeLock.expiry);
                    return;
                }
            }

            syncDateFilterForScan(state.logDate);
            resetNonDateFiltersForScan();
            const newKey = fbDb.ref(FB_ROOT + "/assetLogs").push().key;
            updates[FB_ROOT + "/assetLogs/" + newKey] = { 
                opsId: cleanOpsId, 
                serialNumber: fullSn, 
                last5Sn: snInput,
                action: state.action, 
                timestamp: timestampStr, 
                workingDate: state.logDate,
                picEmail: window.__authUserEmail || "unknown"
            };

            fbDb.ref().update(updates).then(function () { 
                playSound('success'); 
                document.getElementById("inputAssetSn").value = "";
            });
        }

        inputEl.value = ""; document.getElementById("inputNama").value = "";
        document.getElementById("inputNama").setAttribute("readonly", true);
        document.getElementById("predictedAction").innerText = t("predicted.scan");
        document.getElementById("predictedAction").style.background = "var(--table-header-bg)";
        inputEl.focus();
    }

    function makeTimeEditable(element, opsId, type, dateStr) {
        let currentText = element.innerText.trim();
        if (currentText === "-") currentText = "00:00";
        let input = document.createElement("input");
        input.type = "time"; input.className = "inline-time-input"; input.value = currentText;
        element.innerHTML = ""; element.appendChild(input); input.focus();

        let saveChange = function() {
            let newTime = input.value;
            if (newTime) {
                const targetDateStr = dateStr;
                let userLogs = logsArray.filter(log => log.opsId === opsId && log.workingDate === targetDateStr);
                let targetedLog = userLogs.find(l => l.breakType === type);
                if (targetedLog) {
                    fbDb.ref(FB_ROOT + "/logs/" + targetedLog._key).update({ timestamp: `${targetDateStr} ${newTime}:00` });
                } else {
                    const newKey = fbDb.ref(FB_ROOT + "/logs").push().key;
                    fbDb.ref(FB_ROOT + "/logs/" + newKey).set({
                        opsId: opsId,
                        breakType: type,
                        timestamp: `${targetDateStr} ${newTime}:00`,
                        workingDate: targetDateStr,
                        cycleNum: 1
                    }).then(function () { showToast(`✏️ Input manual "${type}" buat ${opsId} berhasil disimpan.`, 'info'); });
                }
            } else { renderAll(); }
        };
        input.addEventListener("blur", saveChange);
        input.addEventListener("keypress", function(e) { if (e.key === 'Enter') { saveChange(); } });
    }

    function rollbackStatus(opsId, dateStr, type) {
        if (!fbDb) return;
        if (!window.__authCanDelete) { showToast("🚫 Kamu gak punya akses buat rollback status.", 'err'); return; }

        let matched = logsArray.filter(l => l.opsId === opsId && l.workingDate === dateStr && l.breakType === type);
        if (matched.length === 0) { showToast("Gak ada data buat di-rollback.", 'info'); return; }

        matched.sort((a, b) => parseDateTime(b.timestamp) - parseDateTime(a.timestamp));
        let target = matched[0];

        if (!confirm(`Rollback status "${type}" buat ${opsId} (${dateStr})?\n\nIni cuma HAPUS scan "${type}" yang paling baru — status/waktu lain di hari itu TETEP AMAN. Biasanya dipakai kalau kejadian Double Scan / salah pencet.`)) return;

        fbDb.ref(FB_ROOT + "/logs/" + target._key).remove().then(function () {
            showToast(`↩️ Status "${type}" buat ${opsId} berhasil di-rollback.`, 'info');
            playSound('success');
        });
    }

    function renderDeleteAction(opsId, dateStr) {
        if (window.__authCanDelete) {
            return `<button class="btn-action-del" onclick="removeOpsIdLog('${opsId}', '${dateStr}')">${t('btn.hapus')}</button>`;
        }
        return `<button class="btn-action-del" disabled title="${t('btn.hapusNoAccess')}" style="opacity:0.4; cursor:not-allowed;">${t('btn.hapus')}</button>`;
    }

    function removeOpsIdLog(opsId, dateStr) {
        if (!fbDb) return;
        if (!window.__authCanDelete) { showToast("🚫 Kamu gak punya akses buat hapus data. Hubungi admin kalau ini kesalahan.", 'err'); return; }
        if (confirm(`Hapus aktivitas ${opsId} tanggal ${dateStr}?`)) {
            const targetDateStr = dateStr;
            const updates = {};
            if (currentActiveModule === 'rest') {
                const matched = logsArray.filter(log => log.opsId === opsId && log.workingDate === targetDateStr);
                matched.forEach(log => { updates[FB_ROOT + "/logs/" + log._key] = null; });
            } else {
                const matched = assetLogsArray.filter(log => log.opsId === opsId && log.workingDate === targetDateStr);
                matched.forEach(log => { updates[FB_ROOT + "/assetLogs/" + log._key] = null; });
            }
            fbDb.ref().update(updates);
        }
    }

    function clearAllData() {
        if (!fbDb) return;
        if (!window.__authCanDelete) { showToast("🚫 Kamu gak punya akses buat Reset Data. Hubungi admin kalau ini kesalahan.", 'err'); return; }
        const range = getFilterDateRange();
        const rangeLabel = range.start === range.end ? range.start : `${range.start} s/d ${range.end}`;
        if (confirm(`⚠️ Hapus semua transaksi periode ${rangeLabel} di database ONLINE?`)) {
            const updates = {};
            if (currentActiveModule === 'rest') {
                const matched = logsArray.filter(log => log.workingDate >= range.start && log.workingDate <= range.end);
                matched.forEach(log => { updates[FB_ROOT + "/logs/" + log._key] = null; });
            } else {
                const matched = assetLogsArray.filter(log => log.workingDate >= range.start && log.workingDate <= range.end);
                matched.forEach(log => { updates[FB_ROOT + "/assetLogs/" + log._key] = null; });
            }
            fbDb.ref().update(updates);
        }
    }

