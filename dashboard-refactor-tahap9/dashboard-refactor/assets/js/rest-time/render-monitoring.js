/**
 * assets/js/rest-time/render-monitoring.js — Render monitoring Rest Time & Asset, tabel Belum Kembali, log aktivitas
 * Bagian 12/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    function renderRestMonitoring() {
        const range = getFilterDateRange();
        const timeFilter = getTimeFilter();
        const filterBreak = document.getElementById("filterBreakType").value;
        const filterDept = document.getElementById("filterDept").value;
        const searchQuery = document.getElementById("searchGlobal").value.toLowerCase().trim();
        const tbody = document.getElementById("tableBody"); 
        tbody.innerHTML = "";
        
        const cycleGapIdx = buildCycleGapIndex();
        let checkedInPairs = [];
        let seenPairKeys = {};
        logsArray.forEach(log => {
            if (log.workingDate < range.start || log.workingDate > range.end) return;
            let key = log.opsId + "|" + log.workingDate;
            if (!seenPairKeys[key]) { seenPairKeys[key] = true; checkedInPairs.push({ opsId: log.opsId, date: log.workingDate }); }
        });
        checkedInPairs.sort(function (a, b) { return a.date === b.date ? a.opsId.localeCompare(b.opsId) : a.date.localeCompare(b.date); });
        
        let countSOC = 0, countEHA = 0, countAdmin = 0, countNonSOC = 0, countCache = 0;
        let filteredTotalMasuk = 0;
        let actualRestCount = 0; 
        let mpDoneRestCount = 0; 
        let countBelumRest = 0;
        let totalDisiplin = 0, totalGancangMeakal = 0, totalUdahRestAtauSedangRest = 0;
        let deptViolatorMap = {}; 
        let targetRowElement = null;
        let rowsToRender = [];

        checkedInPairs.forEach(function (pair) {
            let opsId = pair.opsId;
            let targetDateStr = pair.date;
            let userRaw = masterKaryawan[opsId] || {};
            let name = userRaw.name || "Unknown"; 
            let agency = userRaw.agency || "Dedicated Vendor"; 
            let dept = userRaw.dept || "SOC Operator";
            
            let userLogs = logsArray.filter(log => log.opsId === opsId && log.workingDate === targetDateStr);
            let checkInLog = userLogs.filter(l => l.breakType === "Check In");
            let checkInTime = checkInLog.length > 0 ? parseDateTime(checkInLog[checkInLog.length - 1].timestamp) : null;
            let breakOutTime = userLogs.find(l => l.breakType === "Break Out") ? parseDateTime(userLogs.find(l => l.breakType === "Break Out").timestamp) : null;
            let breakInTime = userLogs.find(l => l.breakType === "Break In") ? parseDateTime(userLogs.find(l => l.breakType === "Break In").timestamp) : null;

            if (breakOutTime && !breakInTime) {
                checkRestOvertimeAlert(opsId, targetDateStr, breakOutTime, name, agency, dept);
            }
            
            const matchShift = matchTimeFilter(checkInTime, timeFilter);
            let currentStatus = "Belum Istirahat";
            if (breakOutTime && !breakInTime) currentStatus = "Break Out";
            if (breakOutTime && breakInTime) currentStatus = "Break In";
            
            let matchDept = false;
            if (filterDept === "All") matchDept = true;
            else if (filterDept === "Cache Operator") matchDept = dept.toLowerCase().includes("cache") || dept.toLowerCase().includes("mm operator");
            else matchDept = dept.toLowerCase() === filterDept.toLowerCase();
            
            if (!matchShift) return;
            if (filterBreak !== "All" && filterBreak !== currentStatus) return;
            if (!matchDept) return;
            if (searchQuery && !opsId.toLowerCase().includes(searchQuery) && !name.toLowerCase().includes(searchQuery)) return;
            
            if (dept.toLowerCase().includes("soc operator")) countSOC++;
            else if (dept.toLowerCase().includes("eha operator")) countEHA++;
            else if (dept.toLowerCase().includes("admin")) countAdmin++;
            else if (dept.toLowerCase().includes("non operator")) countNonSOC++;
            else if (dept.toLowerCase().includes("cache") || dept.toLowerCase().includes("mm operator")) countCache++;
            filteredTotalMasuk++;
            if (!breakOutTime) countBelumRest++;
            if (breakOutTime && !breakInTime) actualRestCount++;
            if (breakOutTime && breakInTime) mpDoneRestCount++;
            
            let estMasuk = "", durationStr = "";
            let alertBadge = '<span class="badge" style="background:var(--table-header-bg); color:var(--text-main);">Belum Istirahat</span>';
            let alertKey = "Belum Istirahat";
            let sortDurationMinutes = -1;
            let rowClass = "";
            
            if (breakOutTime) {
                totalUdahRestAtauSedangRest++;
                let estDate = new Date(breakOutTime.getTime() + (60 * 60000));
                estMasuk = formatTime(estDate);
                if (!breakInTime) {
                    let diffMinutes = Math.floor((new Date() - breakOutTime) / 60000);
                    durationStr = diffMinutes + " Min";
                    sortDurationMinutes = diffMinutes;
                    if (diffMinutes > 60) {
                        alertBadge = '<span class="badge alert-gancang">Gancang Meakal</span>'; rowClass = "row-gancang"; alertKey = "Gancang Meakal";
                        totalGancangMeakal++; deptViolatorMap[dept] = (deptViolatorMap[dept] || 0) + 1;
                    } else if (diffMinutes >= 50) {
                        alertBadge = '<span class="badge alert-reminder">Reminder (>=50m)</span>'; rowClass = "row-reminder"; alertKey = "Reminder";
                    } else {
                        alertBadge = '<span class="badge alert-istirahat">Istirahat</span>'; alertKey = "Istirahat";
                    }
                } else {
                    let diffMinutes = Math.floor((breakInTime - breakOutTime) / 60000);
                    durationStr = diffMinutes + " Min";
                    sortDurationMinutes = diffMinutes;
                    if (diffMinutes > 60) {
                        alertBadge = '<span class="badge alert-gancang">Gancang Meakal</span>'; alertKey = "Gancang Meakal";
                        totalGancangMeakal++; deptViolatorMap[dept] = (deptViolatorMap[dept] || 0) + 1;
                    } else {
                        alertBadge = '<span class="badge alert-disiplin">Disiplin</span>'; totalDisiplin++; alertKey = "Disiplin";
                    }
                }
            }
            
            let tr = document.createElement("tr");
            let isNewlySubmitted = (lastSubmittedOpsId && opsId.toLowerCase() === lastSubmittedOpsId.toLowerCase());
            if (rowClass) tr.className = rowClass + (isNewlySubmitted ? " row-highlight" : "");
            else if (isNewlySubmitted) tr.className = "row-highlight";
            
            const rollbackBtn = function (type, exists) {
                if (!exists || !window.__authCanDelete) return "";
                return `<button class="btn-rollback" title="Rollback ${type} (batalin scan ini doang)" onclick="event.stopPropagation(); rollbackStatus('${opsId}', '${targetDateStr}', '${type}')">↩</button>`;
            };

            tr.innerHTML = `
                <td>${targetDateStr}</td>
                <td><span class="badge badge-dept">${opsId}</span></td>
                <td style="text-align:left; font-weight:600;">${name}</td>
                <td><span class="badge badge-dept" style="font-weight: 500;">${agency}</span></td>
                <td><span class="badge badge-dept">${dept}</span></td>
                <td><span class="badge badge-time" ondblclick="makeTimeEditable(this, '${opsId}', 'Check In', '${targetDateStr}')">${checkInTime ? formatTime(checkInTime) : "-"}</span>${rollbackBtn('Check In', !!checkInTime)}</td>
                <td><span class="badge badge-time" ondblclick="makeTimeEditable(this, '${opsId}', 'Break Out', '${targetDateStr}')">${breakOutTime ? formatTime(breakOutTime) : "-"}</span>${rollbackBtn('Break Out', !!breakOutTime)}</td>
                <td><span class="badge badge-time" ondblclick="makeTimeEditable(this, '${opsId}', 'Break In', '${targetDateStr}')">${breakInTime ? formatTime(breakInTime) : "-"}</span>${rollbackBtn('Break In', !!breakInTime)}</td>
                <td><span class="badge badge-time" style="color:#c2410c; cursor:default; background:var(--table-header-bg);">${estMasuk || "-"}</span></td>
                <td style="font-weight:700;">${durationStr || "-"}</td>
                <td>${alertBadge}${renderCycleGapBadge(cycleGapsForRow(cycleGapIdx, opsId, targetDateStr))}</td>
                <td>${renderPreWorkBadge(opsId, targetDateStr, name)}</td>
                <td>${renderDeleteAction(opsId, targetDateStr)}</td>
            `;
            rowsToRender.push({ tr, isNewlySubmitted, sortDurationMinutes, alertSeverity: alertStatusSeverity(alertKey), checkInMs: checkInTime ? checkInTime.getTime() : -Infinity });
        });

        if (restSortCol === "duration") {
            rowsToRender.sort((a, b) => restSortDir === "desc" ? b.sortDurationMinutes - a.sortDurationMinutes : a.sortDurationMinutes - b.sortDurationMinutes);
        } else if (restSortCol === "alert") {
            rowsToRender.sort((a, b) => restSortDir === "desc" ? b.alertSeverity - a.alertSeverity : a.alertSeverity - b.alertSeverity);
        } else {
            // Default: Jam Check In terbaru (waktu lokal device) di paling atas; yang belum Check In di paling bawah
            rowsToRender.sort((a, b) => a.checkInMs === b.checkInMs ? 0 : (b.checkInMs > a.checkInMs ? 1 : -1));
        }

        rowsToRender.forEach(function (row) {
            tbody.appendChild(row.tr);
            if (row.isNewlySubmitted) targetRowElement = row.tr;
        });

        updateSortArrowsUI();

        if (targetRowElement) {
            targetRowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { lastSubmittedOpsId = null; }, 3000);
        }
        
        document.getElementById("mpTotalMasuk").innerText = filteredTotalMasuk;
        document.getElementById("actualRestCount").innerText = actualRestCount;
        document.getElementById("mpDoneRestCount").innerText = mpDoneRestCount;
        document.getElementById("mpBelumRest").innerText = countBelumRest;
        
        let maxViolations = 0, highestDept = "-";
        for (let deptName in deptViolatorMap) {
            if (deptViolatorMap[deptName] > maxViolations) { 
                maxViolations = deptViolatorMap[deptName]; highestDept = deptName; 
            }
        }
    }

    function renderAssetMonitoring() {
        const range = getFilterDateRange();
        const timeFilter = getTimeFilter();
        const filterBreak = document.getElementById("filterBreakType").value;
        const filterDept = document.getElementById("filterDept").value;
        const filterStation = document.getElementById("filterStation").value;
        const searchQuery = document.getElementById("searchGlobal").value.toLowerCase().trim();
        const tbody = document.getElementById("assetTableBody"); 
        tbody.innerHTML = "";

        let assetPairs = [];
        let seenAssetPairKeys = {};
        assetLogsArray.forEach(log => {
            if (log.workingDate < range.start || log.workingDate > range.end) return;
            let key = log.opsId + "|" + log.workingDate;
            if (!seenAssetPairKeys[key]) { seenAssetPairKeys[key] = true; assetPairs.push({ opsId: log.opsId, date: log.workingDate }); }
        });
        assetPairs.sort(function (a, b) { return a.date === b.date ? a.opsId.localeCompare(b.opsId) : a.date.localeCompare(b.date); });

        let totalPinjamCount = 0, activePinjamCount = 0, doneKembaliCount = 0;
        let assetRowsToRender = [];
        let targetRowElement = null;
        let belumKembaliList = [];
        let activityLogList = [];

        assetPairs.forEach(function (pair) {
            let opsId = pair.opsId;
            let targetDateStr = pair.date;
            let userRaw = masterKaryawan[opsId] || {};
            let name = userRaw.name || "Unknown"; 
            let dept = userRaw.dept || "SOC Operator";

            let userAssetLogs = assetLogsArray.filter(l => l.opsId === opsId && l.workingDate === targetDateStr);
            userAssetLogs.sort((a, b) => parseDateTime(a.timestamp) - parseDateTime(b.timestamp));

            userAssetLogs.forEach(function (log) {
                activityLogList.push({
                    opsId: opsId, name: name, action: log.action,
                    snFull: log.serialNumber, timestamp: parseDateTime(log.timestamp),
                    picEmail: log.picEmail || "-"
                });
            });

            let cycles = [];
            let openPinjam = null;
            userAssetLogs.forEach(log => {
                if (log.action === "Pinjam PDA") {
                    if (openPinjam) cycles.push({ pinjam: openPinjam, kembali: null });
                    openPinjam = log;
                } else if (log.action === "Kembali PDA") {
                    cycles.push({ pinjam: openPinjam, kembali: log });
                    openPinjam = null;
                }
            });
            if (openPinjam) cycles.push({ pinjam: openPinjam, kembali: null });

            cycles.forEach(function (cycle) {
                if (cycle.pinjam && !cycle.kembali) {
                    let pinjamTime = parseDateTime(cycle.pinjam.timestamp);
                    belumKembaliList.push({
                        opsId: opsId, name: name, snFull: cycle.pinjam.serialNumber,
                        pinjamTime: pinjamTime,
                        diffMins: Math.floor((new Date() - pinjamTime) / 60000)
                    });
                }
            });

            let matchDept = (filterDept === "All" || dept.toLowerCase() === filterDept.toLowerCase());
            let allSnInCycles = cycles.map(c => (c.pinjam ? c.pinjam.serialNumber : (c.kembali ? c.kembali.serialNumber : ""))).join(" ").toLowerCase();
            let allStationsInCycles = cycles.map(c => getStationForSN(c.pinjam ? c.pinjam.serialNumber : (c.kembali ? c.kembali.serialNumber : ""))).join(" ").toLowerCase();
            let matchSearch = (!searchQuery || opsId.toLowerCase().includes(searchQuery) || name.toLowerCase().includes(searchQuery) || allSnInCycles.includes(searchQuery) || allStationsInCycles.includes(searchQuery));
            if (!matchDept || !matchSearch) return;

            cycles.forEach((cycle, idx) => {
                let pinjamLog = cycle.pinjam, kembaliLog = cycle.kembali;
                let pinjamTime = pinjamLog ? parseDateTime(pinjamLog.timestamp) : null;
                let kembaliTime = kembaliLog ? parseDateTime(kembaliLog.timestamp) : null;
                let snFull = pinjamLog ? pinjamLog.serialNumber : (kembaliLog ? kembaliLog.serialNumber : "-");
                let station = getStationForSN(snFull);

                let currentStatus = pinjamTime && !kembaliTime ? "Break Out" : "Break In";
                let matchStatus = (filterBreak === "All" || filterBreak === currentStatus);
                let matchStation = (filterStation === "All" || (filterStation === "Unassigned" ? !station : station === filterStation));
                if (!matchStatus || !matchStation) return;
                if (!matchTimeFilter(pinjamTime || kembaliTime, timeFilter)) return;

                totalPinjamCount++;
                if (pinjamTime && !kembaliTime) activePinjamCount++;
                if (pinjamTime && kembaliTime) doneKembaliCount++;

                let picEmail = kembaliLog ? (kembaliLog.picEmail || "-") : (pinjamLog ? (pinjamLog.picEmail || "-") : "-");

                let durationStr = "-";
                let statusBadge = '<span class="badge alert-istirahat">Sedang Dipinjam</span>';
                if (pinjamTime && kembaliTime) {
                    let diffMins = Math.floor((kembaliTime - pinjamTime) / 60000);
                    let hours = Math.floor(diffMins / 60);
                    let mins = diffMins % 60;
                    durationStr = `${hours}j ${mins}m`;
                    statusBadge = '<span class="badge alert-disiplin">Selesai/Kembali</span>';
                } else if (pinjamTime) {
                    let diffMins = Math.floor((new Date() - pinjamTime) / 60000);
                    let hours = Math.floor(diffMins / 60);
                    let mins = diffMins % 60;
                    durationStr = `${hours}j ${mins}m`;
                }

                let tr = document.createElement("tr");
                let isNewlySubmitted = (lastSubmittedOpsId && opsId.toLowerCase() === lastSubmittedOpsId.toLowerCase() && idx === cycles.length - 1);
                if (isNewlySubmitted) tr.className = "row-highlight";

                tr.innerHTML = `
                    <td>${targetDateStr}</td>
                    <td><span class="badge badge-dept">${opsId}</span></td>
                    <td style="text-align:left; font-weight:600;">${name}</td>
                    <td><span class="badge badge-time">Sesi ${idx + 1}</span></td>
                    <td><span class="badge badge-dept">${dept}</span></td>
                    <td style="font-family:monospace; font-weight:700; color:#e67e22;">${snFull}</td>
                    <td><span class="badge ${getStationBadgeClass(station)}">${station || "Belum Diassign"}</span></td>
                    <td><span class="badge badge-time">${pinjamTime ? formatTime(pinjamTime) : "-"}</span></td>
                    <td><span class="badge badge-time">${kembaliTime ? formatTime(kembaliTime) : "-"}</span></td>
                    <td style="font-weight:700;">${durationStr}</td>
                    <td>${statusBadge}</td>
                    <td style="font-size:11px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:0;" title="${picEmail}">${picEmail}</td>
                    <td>${renderDeleteAction(opsId, targetDateStr)}</td>
                `;
                assetRowsToRender.push({ tr, isNewlySubmitted, ms: (pinjamTime || kembaliTime) ? (pinjamTime || kembaliTime).getTime() : -Infinity });
            });
        });

        // Jam Pinjam PDA terbaru (waktu lokal device) di paling atas
        assetRowsToRender.sort((a, b) => a.ms === b.ms ? 0 : (b.ms > a.ms ? 1 : -1));
        assetRowsToRender.forEach(function (row) {
            tbody.appendChild(row.tr);
            if (row.isNewlySubmitted) {
                if (!targetRowElement) targetRowElement = row.tr;          // ambil yang paling atas (terbaru)
                else row.tr.classList.remove("row-highlight");             // sisanya (tanggal lama) gak usah ikut kedip
            }
        });

        if (targetRowElement) {
            targetRowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { lastSubmittedOpsId = null; }, 3000);
        }

        document.getElementById("assetTotalPinjam").innerText = totalPinjamCount;
        document.getElementById("assetActivePinjam").innerText = activePinjamCount;
        document.getElementById("assetDoneKembali").innerText = doneKembaliCount;
        renderIdleTable();
        renderBelumKembaliTable(belumKembaliList);
        renderActivityLogTable(activityLogList);
    }

    let lastBelumKembaliList = [];

    function renderBelumKembaliTable(list) {
        const container = document.getElementById("assetBelumKembaliBody");
        if (!container) return;

        if (list.length === 0) {
            lastBelumKembaliList = [];
            container.innerHTML = '<div style="padding:8px 4px; color:var(--text-muted); text-align:center; font-size:11px;">✅ Semua PDA sudah kembali</div>';
            return;
        }

        list.sort((a, b) => b.diffMins - a.diffMins);
        lastBelumKembaliList = list;
        container.innerHTML = list.map(function (item, idx) {
            let isOverdue = item.diffMins >= 240; // >= 4 jam belum kembali dianggap overdue
            let hours = Math.floor(item.diffMins / 60), mins = item.diffMins % 60;
            let durStr = `${hours}j ${mins}m`;
            return `<div class="mini-log-row">
                <div class="belum-info" onclick="showOperatorDetail(${idx})" style="cursor:pointer;" title="Klik buat lihat detail: ${item.name} | SN: ${item.snFull} | Pinjam jam ${formatTime(item.pinjamTime)}">
                    <div class="belum-name" style="${isOverdue ? 'color:#b91c1c;' : ''}">${isOverdue ? '⚠️ ' : ''}${item.name}</div>
                    <div class="belum-opsid">${item.opsId}</div>
                </div>
                <div class="belum-dur" style="${isOverdue ? 'color:#b91c1c;' : ''}">${durStr}</div>
            </div>`;
        }).join("");
    }

    function showOperatorDetail(idx) {
        let item = lastBelumKembaliList[idx];
        if (!item) return;
        let station = getStationForSN(item.snFull);
        document.getElementById("operatorDetailName").innerText = item.name;
        document.getElementById("operatorDetailOpsId").innerText = item.opsId;
        document.getElementById("operatorDetailSn").innerText = item.snFull;
        document.getElementById("operatorDetailStation").innerText = station || "Belum Diassign";
        document.getElementById("operatorDetailModal").style.display = "flex";
    }

    function closeOperatorDetail() {
        document.getElementById("operatorDetailModal").style.display = "none";
    }

    document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape" && e.key !== "Esc") return;
        const operatorDetailModal = document.getElementById("operatorDetailModal");
        const dbAssetModal = document.getElementById("databaseAssetModal");
        const preWorkBlockModal = document.getElementById("preWorkBlockModal");
        const notCheckedModal = document.getElementById("notCheckedInModal");
        const lockModal = document.getElementById("lockAlertModal");
        const wrongDeviceModal = document.getElementById("wrongDeviceModal");
        const fbModal = document.getElementById("firebaseSetupModal");
        const fbCancelBtn = document.getElementById("firebaseModalCancelBtn");
        const sidebar = document.getElementById("appSidebar");

        if (operatorDetailModal && operatorDetailModal.style.display === "flex") { closeOperatorDetail(); return; }
        if (dbAssetModal && dbAssetModal.style.display === "flex") { closeDatabaseAssetModal(); return; }
        const attnLogModal = document.getElementById("attnImportLogModal");
        if (attnLogModal && attnLogModal.style.display === "flex") { attnCloseImportLog(); return; }
        if (preWorkBlockModal && preWorkBlockModal.style.display === "flex") { closePreWorkBlockModal(); return; }
        if (notCheckedModal && notCheckedModal.style.display === "flex") { closeNotCheckedInAlert(); return; }
        if (lockModal && lockModal.style.display === "flex") { closeLockAlert(); return; }
        if (wrongDeviceModal && wrongDeviceModal.style.display === "flex") { closeWrongDeviceAlert(); return; }
        // Modal setup Firebase cuma boleh di-ESC kalau tombol Batal-nya kelihatan (allowCancel true / bukan setup wajib pertama kali)
        if (fbModal && fbModal.style.display === "flex" && fbCancelBtn && fbCancelBtn.style.display !== "none") { closeFirebaseModal(); return; }
        if (sidebar && sidebar.classList.contains("open")) { toggleAppSidebar(); return; }
    });

    function renderActivityLogTable(list) {
        const container = document.getElementById("assetActivityLogBody");
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = '<div style="padding:8px 4px; color:var(--text-muted); text-align:center; font-size:11px;">' + t('asset.belumAdaAktivitas') + '</div>';
            return;
        }

        list.sort((a, b) => b.timestamp - a.timestamp);
        let recentItems = list.slice(0, 15);
        container.innerHTML = recentItems.map(function (item) {
            let isPinjam = item.action === "Pinjam PDA";
            let picDisplay = item.picEmail && item.picEmail !== "-" ? item.picEmail : "unknown";
            return `<div class="mini-log-row" style="flex-direction:column; align-items:stretch; gap:3px;" title="Operator: ${item.name} | SN: ${item.snFull}">
                <div class="actlog-pic-full">👤 ${picDisplay}</div>
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                    <span class="actlog-added-line">added <b style="font-family:monospace; color:var(--text-main);">${item.opsId}</b></span>
                    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                        <span class="actlog-badge" style="background:${isPinjam ? '#ffedd5' : '#d1fae5'}; color:${isPinjam ? '#c2410c' : '#047857'};">${isPinjam ? '"Pinjam"' : '"Kembali"'}</span>
                        <span class="actlog-time">${formatTime(item.timestamp)}</span>
                    </div>
                </div>
            </div>`;
        }).join("");
    }

