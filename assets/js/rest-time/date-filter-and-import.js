/**
 * assets/js/rest-time/date-filter-and-import.js — Filter tanggal saat scan, ringkasan, import file, onload, jam
 * Bagian 6/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    // Setelah scan Asset: pastikan filter tanggal tabel mencakup TANGGAL LOCAL DEVICE (hari ini) dan tanggal baris yang
    // baru disimpan (Kembali PDA ikut tanggal Pinjam, bisa kemarin kalau lewat tengah malam). Kalau belum tercakup,
    // range disesuaikan supaya baris yang barusan di-scan pasti ketemu & ke-highlight.
    function syncDateFilterForScan(rowDateStr) {
        const sEl = document.getElementById("filterTanggalStart"), eEl = document.getElementById("filterTanggalEnd");
        if (!sEl || !eEl) return;
        const today = getWorkingDateStr(new Date());
        const rowDate = rowDateStr || today;
        const range = getFilterDateRange();
        const covers = function (d) { return d >= range.start && d <= range.end; };
        if (covers(today) && covers(rowDate)) return;
        const newStart = rowDate < today ? rowDate : today;
        sEl.value = newStart; eEl.value = today;
        followToday = (newStart === today);
        lastCheckedCalendarDate = today;
        ensureLogsLoadedForRange(newStart, today);
        showToast("📅 Filter tanggal disesuaikan ke tanggal device (" + (newStart === today ? today : newStart + " s.d " + today) + ").", 'info');
    }

    // Setelah scan Asset: filter Dept / Status / Station / Jam / Cari yang masih aktif ikut di-reset (tanggal tidak disentuh),
    // supaya baris yang barusan di-scan gak ketutup filter dan auto highlight selalu ketemu.
    function resetNonDateFiltersForScan() {
        const val = function (id) { const el = document.getElementById(id); return el ? el.value : ""; };
        const active = !!val("filterTimeFrom") || !!val("filterTimeTo") || !!val("searchGlobal")
            || (val("filterBreakType") && val("filterBreakType") !== "All")
            || (val("filterDept") && val("filterDept") !== "All")
            || (val("filterStation") && val("filterStation") !== "All");
        if (!active) return;
        resetTableFilters();
        showToast("🔄 Filter (Dept/Status/Station/Jam/Cari) di-reset otomatis biar hasil scan kelihatan.", 'info');
    }

    const SUMMARY_COLLAPSE_KEY = "pr_dc_summary_collapsed";

    function applySummaryBoxesState(collapsed) {
        const area = document.getElementById("summaryBoxesArea");
        const btn = document.getElementById("summaryToggleBtn");
        if (!area || !btn) return;
        area.style.display = collapsed ? "none" : "block";
        btn.innerHTML = collapsed ? ("🔽 " + t('summary.show')) : ("🔼 " + t('summary.hide'));
    }

    function toggleSummaryBoxes() {
        const area = document.getElementById("summaryBoxesArea");
        const isCurrentlyCollapsed = area.style.display === "none";
        const nextCollapsed = !isCurrentlyCollapsed;
        applySummaryBoxesState(nextCollapsed);
        localStorage.setItem(SUMMARY_COLLAPSE_KEY, nextCollapsed ? "1" : "0");
    }

    function handleFileImport(input) {
        const file = input.files[0]; 
        if (!file) return;
        
        const fileName = file.name.toLowerCase();
        const reader = new FileReader();
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
                    if (rows.length === 0) return;
                    let headers = rows[0].map(h => String(h).trim().toLowerCase());
                    processImportedData(headers, rows.slice(1));
                } catch (err) { showToast("❌ Gagal memproses file Excel.", 'err'); }
                input.value = "";
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = function(e) {
                let lines = e.target.result.split("\n"); if(!lines.length) return;
                let delimiter = lines[0].includes("\t") ? "\t" : (lines[0].includes(";") ? ";" : ",");
                let headers = lines[0].split(delimiter).map(h => h.replace(/"/g, "").trim().toLowerCase());
                let dataRows = lines.slice(1).map(l => l.split(delimiter).map(c => c.replace(/"/g, "").trim()));
                processImportedData(headers, dataRows);
                input.value = "";
            };
            reader.readAsText(file);
        }
    }

    function processImportedData(headers, rows) {
        let idxOpsId = headers.findIndex(h => h.includes("ops id") || h.includes("opsid"));
        let idxName = headers.findIndex(h => h.includes("name") || h.includes("nama"));
        let idxAgency = headers.findIndex(h => h.includes("agency") || h.includes("vendor"));
        let idxDept = headers.findIndex(h => h.includes("departement") || h.includes("department"));
        
        if(idxOpsId === -1 || idxName === -1) {
            showToast("❌ Format kolom file tidak dikenali!", 'err'); 
            return;
        }
        
        const updates = {};
        for(let i = 0; i < rows.length; i++) {
            let cols = rows[i];
            let rawId = cols[idxOpsId] ? String(cols[idxOpsId]).trim() : "";
            let name = cols[idxName] ? String(cols[idxName]).trim() : "";
            let agency = idxAgency !== -1 && cols[idxAgency] ? String(cols[idxAgency]).trim() : "Dedicated Vendor";
            let dept = idxDept !== -1 && cols[idxDept] ? String(cols[idxDept]).trim() : "SOC Operator";
            
            if (!rawId) continue;
            let formattedId = normalizeOpsId(rawId);
            updates[FB_ROOT + "/master/" + formattedId] = { name: name, dept: dept, agency: agency };
        }
        fbDb.ref().update(updates).then(() => showToast("📥 Impor Master Karyawan Sukses!", 'ok'));
    }

    window.onload = function() {
        const savedTheme = localStorage.getItem("global_theme");
        if(savedTheme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            const themeBtnEl = document.getElementById("themeBtn");
            if (themeBtnEl) themeBtnEl.innerHTML = "☀️ <span>Light Mode</span>";
        }
        
        lastCheckedCalendarDate = getWorkingDateStr(new Date());
        document.getElementById("filterTanggalStart").value = lastCheckedCalendarDate;
        document.getElementById("filterTanggalEnd").value = lastCheckedCalendarDate;
        populateStationFilterOptions();
        applySummaryBoxesState(localStorage.getItem(SUMMARY_COLLAPSE_KEY) === "1");
        setInterval(updateClock, 1000); updateClock(); renderAll();
        loadPreWorkSheet(); setInterval(loadPreWorkSheet, PREWORK_REFRESH_MS);
        
        document.getElementById("inputOpsId").addEventListener("keypress", function(e) { 
            if (e.key === 'Enter') { e.preventDefault(); clearTimeout(debounceInputTimer); submitLog(); }
        });
        document.getElementById("inputAssetSn").addEventListener("keypress", function(e) { 
            if (e.key === 'Enter') { e.preventDefault(); clearTimeout(debounceInputTimer); submitLog(); }
        });
        document.getElementById("inputAssetSn").addEventListener("input", handleOpsIdInputAutomated);
        document.getElementById("inputOpsId").addEventListener("input", handleOpsIdInputAutomated);
        // Start/End dijaga biar gak kebalik (mis. Start 14, End 13 -> sebelumnya diam-diam ditukar & nampilin 2 hari)
        function onFilterDateChanged(changed) {
            const sEl = document.getElementById("filterTanggalStart"), eEl = document.getElementById("filterTanggalEnd");
            if (sEl.value && eEl.value && eEl.value < sEl.value) { if (changed === "start") eEl.value = sEl.value; else sEl.value = eEl.value; }
            const today = getWorkingDateStr(new Date());
            followToday = (sEl.value === today && eEl.value === today);
            lastCheckedCalendarDate = today;
            let range = getFilterDateRange();
            ensureLogsLoadedForRange(range.start, range.end);
            renderAll();
        }
        document.getElementById("filterTanggalStart").addEventListener("change", function () { onFilterDateChanged("start"); });
        document.getElementById("filterTanggalEnd").addEventListener("change", function () { onFilterDateChanged("end"); });
        document.getElementById("inputOpsId").focus();

        function startFbConnection() {
            const savedConfig = localStorage.getItem(FB_CONFIG_KEY);
            if (savedConfig) {
                try { connectToFirebase(JSON.parse(savedConfig)); }
                catch (e) { connectToFirebase(DEFAULT_FB_CONFIG); }
            } else {
                connectToFirebase(DEFAULT_FB_CONFIG);
            }
        }
        if (window.firebase && firebase.auth) {
            firebase.auth().onAuthStateChanged(function (user) {
                if (user) { startFbConnection(); applyDeletePermissionUI(); }
            });
        } else {
            startFbConnection();
        }
    };

    function updateClock() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById("clockDisplay").innerText = now.toLocaleDateString('id-ID', options) + ' | ' + now.toTimeString().split(' ')[0];
        
        let currentCalendarDate = getWorkingDateStr(now);
        let startEl = document.getElementById("filterTanggalStart");
        let endEl = document.getElementById("filterTanggalEnd");
        let isDateInputFocused = (document.activeElement === startEl || document.activeElement === endEl);
        // Ikut tanggal device kalau range-nya memang "hari ini" (followToday) ATAU keduanya masih di tanggal acuan lama
        let isDefaultTodayRange = followToday || (startEl.value === lastCheckedCalendarDate && endEl.value === lastCheckedCalendarDate);
        if (currentCalendarDate !== lastCheckedCalendarDate && isDefaultTodayRange && !isDateInputFocused) {
            followToday = true;
            lastCheckedCalendarDate = currentCalendarDate;
            startEl.value = currentCalendarDate;
            endEl.value = currentCalendarDate;
            if (fbDb) attachLogsListener();
            renderAll();
        } else if (now.getSeconds() % 30 === 0) {
            renderAll();
        }
        handleRestTimeModuleVisibilityChange();
        if (restOvertimeModalShowing) renderRestOvertimeList();
    }

    function parseDateTime(str) {
        if (!str) return null;
        let t = str.split(/[- :]/);
        return new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);
    }

