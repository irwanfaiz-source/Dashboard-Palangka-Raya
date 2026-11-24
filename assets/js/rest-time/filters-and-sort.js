/**
 * assets/js/rest-time/filters-and-sort.js — Filter jam, render semua, reset filter, sortir tabel
 * Bagian 11/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    // ===== Filter Jam (HH:mm s.d HH:mm) - sama kayak Pre-Work by Attendance FMS =====
    // Kosong = ga difilter. Kalau "Dari" > "s.d" dianggap lewat tengah malam (mis. 22:00 s.d 06:00).
    function filterTimeMask(el) {
        let d = el.value.replace(/\D/g, "");
        if (d.length && +d[0] > 2) d = "0" + d;
        d = d.slice(0, 4);
        if (d.length >= 2 && +d.slice(0, 2) > 23) d = "23" + d.slice(2);
        if (d.length === 4 && +d.slice(2) > 59) d = d.slice(0, 2) + "59";
        el.value = d.length >= 3 ? d.slice(0, 2) + ":" + d.slice(2) : d;
        renderAll();
    }
    function filterTimeFix(el) {
        const d = el.value.replace(/\D/g, "");
        if (!d) { el.value = ""; }
        else if (d.length <= 2) { el.value = d.padStart(2, "0") + ":00"; }
        else if (d.length === 3) { el.value = d.slice(0, 2) + ":" + d.slice(2) + "0"; }
        else { el.value = d.slice(0, 2) + ":" + d.slice(2, 4); }
        renderAll();
    }
    function filterTimeReset() {
        document.getElementById("filterTimeFrom").value = ""; document.getElementById("filterTimeTo").value = "";
        renderAll();
    }
    function getTimeFilter() {
        const toMin = function (t) { const m = String(t || "").match(/^(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : null; };
        return { from: toMin(document.getElementById("filterTimeFrom").value), to: toMin(document.getElementById("filterTimeTo").value) };
    }
    // true kalau jam (Date) lolos filter. Tanpa filter -> selalu true; filter aktif tapi jam kosong -> false.
    function matchTimeFilter(dateObj, tf) {
        if (tf.from === null && tf.to === null) return true;
        if (!dateObj || isNaN(dateObj)) return false;
        const t = dateObj.getHours() * 60 + dateObj.getMinutes();
        if (tf.from !== null && tf.to !== null) return tf.from <= tf.to ? (t >= tf.from && t <= tf.to) : (t >= tf.from || t <= tf.to);
        return tf.from !== null ? t >= tf.from : t <= tf.to;
    }

    function renderAll() {
        const lbl = document.getElementById("filterTimeLabel");
        if (lbl) lbl.innerText = currentActiveModule === "asset" ? "🕐 Filter Jam Pinjam PDA :" : "🕐 Filter Jam Check In :";
        if (currentActiveModule === 'attn') { renderAttnPreWork(); return; }
        if (currentActiveModule === 'sum') { attnRenderSummary(); return; }
        if (currentActiveModule === 'rest') {
            renderRestMonitoring();
        } else {
            renderAssetMonitoring();
        }
    }

    function resetTableFilters() {
        document.getElementById("filterTimeFrom").value = ""; document.getElementById("filterTimeTo").value = "";
        document.getElementById("filterBreakType").value = "All";
        document.getElementById("filterDept").value = "All";
        const stationEl = document.getElementById("filterStation");
        if (stationEl) stationEl.value = "All";
        document.getElementById("searchGlobal").value = "";
        renderAll();
    }

    function sortRestTable(col) {
        if (restSortCol !== col) { restSortCol = col; restSortDir = "desc"; }
        else if (restSortDir === "desc") { restSortDir = "asc"; }
        else { restSortCol = null; restSortDir = "desc"; }
        renderAll();
    }

    function updateSortArrowsUI() {
        ["Duration", "Alert"].forEach(function (label) {
            let th = document.getElementById("thSort" + label);
            let arrow = document.getElementById("sortArrow" + label);
            if (!th || !arrow) return;
            let colKey = label.toLowerCase();
            if (restSortCol === colKey) {
                th.classList.add("sort-active");
                arrow.innerText = restSortDir === "desc" ? "▼" : "▲";
            } else {
                th.classList.remove("sort-active");
                arrow.innerText = "⇅";
            }
        });
    }

    function alertStatusSeverity(alertKey) {
        switch (alertKey) {
            case "Gancang Meakal": return 4;
            case "Reminder": return 3;
            case "Istirahat": return 2;
            case "Disiplin": return 1;
            default: return 0; // Belum Istirahat
        }
    }

