/**
 * assets/js/rest-time/pda-data.js — Daftar SN PDA, peta station default, helper station, state awal
 * Bagian 1/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    const PDA_SERIAL_NUMBERS = [
        "MT6552GL2WEXBJ01455", "MT6552GL2WEXBM01872", "MT6552GL2WEXCA00114", "MT6552GL2WEXCA00189",
        "MT6552GL2WEXCA00218", "MT6552GL2WEXCA00863", "MT6552GL2WEXCA00870", "MT6552GL2WEXCA00875",
        "MT6552GL2WEXCC00112", "MT6552GL2WEXCC00252", "MT6552GL2WEXCC00552", "MT6552GL2WEXCC00784",
        "MT6555W4DJ02441", "MT6555W4DK00700", "MT6555W4EA00566", "MT6555W4EA01119", "MT6555W4EJ00072",
        "MT9055GL2WEXDD00653", "MT93LHSGSEFG02076", "MT93LHSGSEFG02081", "MT93LHSGSEFG02093",
        "MT93LHSGSEFG02097", "MT93LHSGSEFG02098", "MT93LHSGSEFG02099", "MT93LHSGSEFG02100",
        "MT93LHSGSEFG02109", "MT93LHSGSEFG02134", "MT93LHSGSEFG02136", "MT93LHSGSEFG02137",
        "MT93LHSGSEFG02461", "MT93LHSGSEFG02462", "MT93LHSGSEFG02492", "MT93LHSGSEFG02504",
        "MT93LHSGSEFK00986", "MT93LHSGSEFK01007", "MT93LHSGSEFK01032", "MT93LHSGSEFK01034",
        "MT93LHSGSEFK01036", "MT93LHSGSEFK01064", "MT93LHSGSEFK01065", "MT93LHSGSEFK01066",
        "MT93LHSGSEFK01067", "MT93LHSGSEFK01071", "MT93LHSGSEFK01074", "MT93LHSGSEFK01076",
        "MT93LHSGSEFK01077", "MT93LHSGSEFK01146", "MT93LHSGSEFL05754", "MT93LHSGSEFL05759",
        "MT93LHSGSEFL05889", "MT93LHSGSEFL05898", "MT93LHSGSEFL05955", "MT93LHSGSEFM00302",
        "MT93LHSGSEFM00304", "MT93LHSGSEFM00305", "MT93LHSGSEFM00306", "MT93LHSGSEFM00307",
        "MT93LHSGSEFM00308", "MT93LHSGSEFM00309", "MT93LHSGSEFM00311", "MT93LHSGSEFM00312",
        "MT93LHSGSEFM00313", "MT93LHSGSEFM00314", "MT93LHSGSEFM00315", "MT93LHSGSEFM00316",
        "MT93LHSGSEFM00317", "MT93LHSGSEFM00319", "MT93LHSGSEFM00320", "MT93LHSGSEFM00321",
        "MT93LHSGSEFM00342", "MT93LHSGSEFM00344", "MT93LHSGSEFM00350", "MT93LHSGSEGA00222",
        "MT93LHSGSEGA00243", "MT93LHSGSEGA00244", "MT93LHSGSEGA00262", "MT93LHSGSEGA00269",
        "MT93LHSGSEGA00270", "MT93LHSGSEGA00271", "MT93LHSGSEGA00272", "MT93LHSGSEGA00273",
        "MT93LHSGSEGA00274", "MT93LHSGSEGA00276", "MT93LHSGSEGA00277", "MT93LHSGSEGA00279",
        "MT93LHSGSEGA00280", "MT93LHSGSEGA00284", "MT93LHSGSEGA00285", "MT93LHSGSEGA00286",
        "MT93LHSGSEGA00287", "MT93LHSGSEGA00295", "MT93LHSGSEGA00301", "MT93LHSGSEGA00650",
        "MT93LHSGSEGA00655", "MT93LHSGSEGA00674", "MT93LHSGSEGA00677", "MT93LHSGSEGA00683",
        "MT93LHSGSEGA00685", "MT93LHSGSEGA00697", "MT93LHSGSEGA00707", "MT93LHSGSEGA00708",
        "MT93LHSGSEGA00719", "MT93LHSGSEGA00721", "MT93LHSGSEGA00722", "MT93LHSGSEGA00725",
        "MT93LHSGSEGA00726", "MT93LHSGSEGA00742", "MT93LHSGSEGA00746", "MT93LHSGSEGA00747",
        "MT93LHSGSEGA00749", "MT93LHSGSEGA00755", "MT93LHSGSEGA00756", "MT93LHSGSEGA01195",
        "MT93LHSGSEGA01205", "MT93LHSGSEGA01613", "MT93LHSGSEGA01615", "MT93LHSGSEGA01618",
        "MT93LHSGSEGA01643", "MT93LHSGSEGA01644", "MT93LHSGSEGA01650", "MT93LHSGSEGA01651",
        "MT93LHSGSEGA01660", "MT93LHSGSEGA01663", "MT93LHSGSEGA01705", "MT93LHSGSEGA01832",
        "MT93LHSGSEGA01842", "MT93LHSGSEGA01864", "MT93LHSGSEGA01865"
    ];

    const DEFAULT_PDA_STATION_MAP = {
        // Inbound
        "MT93LHSGSEFK01064": "Inbound",
        "MT93LHSGSEFG02504": "Inbound",
        "MT93LHSGSEFK01074": "Inbound",
        "MT93LHSGSEGA00674": "Inbound",
        "MT93LHSGSEFG02081": "Inbound",
        // Sec Sort
        "MT93LHSGSEGA00287": "Sec Sort",
        "MT93LHSGSEFL05754": "Sec Sort",
        "MT93LHSGSEGA00273": "Sec Sort",
        // Bulky
        "MT93LHSGSEGA00222": "Bulky",
        "MT93LHSGSEGA00697": "Bulky",
        "MT93LHSGSEFK01032": "Bulky",
        "MT93LHSGSEFK01071": "Bulky",
        "MT93LHSGSEFK01066": "Bulky",
        // Assisted Sorting
        "MT93LHSGSEFK01077": "Assisted Sorting",
        "MT93LHSGSEFG02492": "Assisted Sorting",
        "MT93LHSGSEGA00269": "Assisted Sorting",
        "MT93LHSGSEFM00309": "Assisted Sorting",
        "MT93LHSGSEFK00986": "Assisted Sorting",
        "MT93LHSGSEGA00747": "Assisted Sorting",
        // Outbound
        "MT93LHSGSEFL05898": "Outbound",
        "MT93LHSGSEFK01076": "Outbound",
        "MT93LHSGSEGA00286": "Outbound",
        "MT93LHSGSEGA01663": "Outbound",
        // Runner
        "MT93LHSGSEFG02093": "Runner",
        "MT93LHSGSEFM00316": "Runner",
        "MT93LHSGSEFK01034": "Runner",
        "MT93LHSGSEGA00276": "Runner",
    };
    const STATION_LIST = ["Inbound", "Sec Sort", "Bulky", "Assisted Sorting", "Outbound", "Runner"];

    let pdaStationMap = Object.assign({}, DEFAULT_PDA_STATION_MAP);

    function getStationForSN(snFull) {
        return pdaStationMap[snFull] || "";
    }

    function getStationBadgeClass(station) {
        switch (station) {
            case "Inbound": return "badge-station-inbound";
            case "Sec Sort": return "badge-station-secsort";
            case "Bulky": return "badge-station-bulky";
            case "Assisted Sorting": return "badge-station-assisted";
            case "Outbound": return "badge-station-outbound";
            case "Runner": return "badge-station-return";
            default: return "badge-dept";
        }
    }

    function computeStationIdleCounts(startStr, endStr) {
        let snLastAction = {};
        assetLogsArray.forEach(function (log) {
            if (log.workingDate < startStr || log.workingDate > endStr || !log.serialNumber) return;
            let prev = snLastAction[log.serialNumber];
            if (!prev || parseDateTime(log.timestamp) > parseDateTime(prev.timestamp)) {
                snLastAction[log.serialNumber] = log;
            }
        });

        let idleCounts = {};
        STATION_LIST.forEach(function (st) { idleCounts[st] = 0; });

        Object.keys(pdaStationMap).forEach(function (sn) {
            let station = pdaStationMap[sn];
            let last = snLastAction[sn];
            let isBorrowedNow = last && last.action === "Pinjam PDA";
            if (!isBorrowedNow) idleCounts[station] = (idleCounts[station] || 0) + 1;
        });

        return idleCounts;
    }

    function renderIdleTable() {
        const tbody = document.getElementById("assetIdleTableBody");
        if (!tbody) return;
        const range = getFilterDateRange();
        const idleCounts = computeStationIdleCounts(range.start, range.end);

        tbody.innerHTML = STATION_LIST.map(function (st) {
            return `<tr>
                <td style="padding:2px 4px;"><span class="badge ${getStationBadgeClass(st)}" style="font-size:10.5px;">${st}</span></td>
                <td style="padding:2px 4px; text-align:right; font-weight:700;">${idleCounts[st]}</td>
            </tr>`;
        }).join("");
    }

    function populateStationFilterOptions() {
        const sel = document.getElementById("filterStation");
        if (!sel) return;
        STATION_LIST.forEach(function (st) {
            const opt = document.createElement("option");
            opt.value = st; opt.textContent = st;
            sel.appendChild(opt);
        });
        const optUnassigned = document.createElement("option");
        optUnassigned.value = "Unassigned"; optUnassigned.textContent = "Belum Diassign";
        sel.appendChild(optUnassigned);
    }

    let currentActiveModule = "rest";
    let masterKaryawan = {};   
    let logsArray = [];        
    let assetLogsArray = [];

