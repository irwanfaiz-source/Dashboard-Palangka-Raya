/**
 * assets/js/rest-time/database-asset.js — Database Asset PDA (modal, entri station), export Excel
 * Bagian 10/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    function applyDeletePermissionUI() {
        const btn = document.getElementById("btnResetData");
        if (!btn) return;
        if (window.__authCanDelete) {
            btn.disabled = false; btn.style.opacity = ""; btn.style.cursor = ""; btn.title = "";
        } else {
            btn.disabled = true; btn.style.opacity = "0.4"; btn.style.cursor = "not-allowed";
            btn.title = "Kamu gak punya akses buat Reset Data";
        }
    }

    function openDatabaseAssetModal() {
        const canEdit = !!window.__authCanDelete;
        document.getElementById("databaseAssetAddForm").style.display = canEdit ? "flex" : "none";
        document.getElementById("databaseAssetPermNote").innerText = canEdit
            ? t('dbAsset.permNoteEdit')
            : t('dbAsset.permNoteReadonly');

        const stationSel = document.getElementById("newAssetStation");
        stationSel.innerHTML = STATION_LIST.map(st => `<option value="${st}">${st}</option>`).join("");

        document.getElementById("databaseAssetError").innerText = "";
        renderDatabaseAssetTable();
        document.getElementById("databaseAssetModal").style.display = "flex";
    }

    function closeDatabaseAssetModal() {
        document.getElementById("databaseAssetModal").style.display = "none";
    }

    function renderDatabaseAssetTable() {
        const tbody = document.getElementById("databaseAssetTableBody");
        if (!tbody) return;
        const canEdit = !!window.__authCanDelete;
        const sortedSN = Object.keys(pdaStationMap).sort();

        if (sortedSN.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:16px; color:var(--text-muted);">${t('dbAsset.noData')}</td></tr>`;
            return;
        }

        tbody.innerHTML = sortedSN.map(function (sn) {
            const station = pdaStationMap[sn];
            const stationCell = canEdit
                ? `<select onchange="updatePdaStationEntry('${sn}', this.value)" style="width:100%; font-size:12px; padding:4px;">
                       ${STATION_LIST.map(st => `<option value="${st}" ${st === station ? "selected" : ""}>${st}</option>`).join("")}
                   </select>`
                : `<span class="badge ${getStationBadgeClass(station)}">${station || t('dbAsset.notAssigned')}</span>`;
            const actionCell = canEdit
                ? `<button class="btn-action-del" onclick="deletePdaStationEntry('${sn}')">${t('btn.hapus')}</button>`
                : "";
            return `<tr>
                <td style="padding:6px 8px; font-family:monospace;">${sn}</td>
                <td style="padding:6px 8px;">${stationCell}</td>
                <td style="padding:6px 8px; text-align:center;">${actionCell}</td>
            </tr>`;
        }).join("");
    }

    function addPdaStationEntry() {
        if (!fbDb) return;
        if (!window.__authCanDelete) { showToast("🚫 Kamu gak punya akses buat ubah Database Asset.", 'err'); return; }
        const errEl = document.getElementById("databaseAssetError");
        errEl.innerText = "";
        const snInput = document.getElementById("newAssetSn");
        const sn = snInput.value.trim().toUpperCase();
        const station = document.getElementById("newAssetStation").value;
        if (!sn) { errEl.innerText = "Isi Serial Number dulu bro."; return; }
        if (pdaStationMap[sn]) { errEl.innerText = "SN ini udah terdaftar — edit langsung di tabel di bawah."; return; }

        fbDb.ref(FB_ROOT + "/pdaStationMap/" + sn).set(station).then(function () {
            snInput.value = "";
        });
    }

    function updatePdaStationEntry(sn, newStation) {
        if (!fbDb) return;
        if (!window.__authCanDelete) { showToast("🚫 Kamu gak punya akses buat ubah Database Asset.", 'err'); return; }
        fbDb.ref(FB_ROOT + "/pdaStationMap/" + sn).set(newStation);
    }

    function deletePdaStationEntry(sn) {
        if (!fbDb) return;
        if (!window.__authCanDelete) { showToast("🚫 Kamu gak punya akses buat ubah Database Asset.", 'err'); return; }
        if (confirm(`Hapus SN ${sn} dari Database Asset?`)) {
            fbDb.ref(FB_ROOT + "/pdaStationMap/" + sn).remove();
        }
    }

    function formatTime(dateObj) { 
        return (dateObj && !isNaN(dateObj.getTime())) ? String(dateObj.getHours()).padStart(2, '0') + ":" + String(dateObj.getMinutes()).padStart(2, '0') : ""; 
    }

    function exportToExcel() {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        let targetTable = currentActiveModule === 'rest' ? "#dataTableToExport" : "#assetDataTableToExport";
        document.querySelectorAll(targetTable + " tr").forEach(row => {
            let rowData = []; const cols = row.querySelectorAll("th, td");
            for (let i = 0; i < cols.length - 1; i++) rowData.push('"' + cols[i].innerText.replace(/,/g, ";").trim() + '"');
            csvContent += rowData.join(",") + "\r\n";
        });
        const range = getFilterDateRange();
        const rangeLabel = range.start === range.end ? range.start : `${range.start}_sd_${range.end}`;
        const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `${currentActiveModule.toUpperCase()}_Monitoring_${rangeLabel}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

