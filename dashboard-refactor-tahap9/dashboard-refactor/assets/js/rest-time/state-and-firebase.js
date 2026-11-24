/**
 * assets/js/rest-time/state-and-firebase.js — State tabel, konfigurasi & koneksi Firebase, listener, backup JSON
 * Bagian 4/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    let lastSubmittedOpsId = null; 

    let restSortCol = null;
    let restSortDir = "desc";

    let fbApp = null, fbDb = null;
    const FB_ROOT = "prDcMonitoring"; 

    const LOGS_WINDOW_DAYS = 3; 
    let logsArrayWindowRaw = []; 
    let logsArrayExtraRaw = [];  
    let assetLogsWindowRaw = [];
    let logsListenerRef = null;
    let assetListenerRef = null;

    function getLogsWindowStartDate() {
        let d = new Date();
        d.setDate(d.getDate() - LOGS_WINDOW_DAYS);
        return getWorkingDateStr(d);
    }

    function rebuildLogsArray() {
        logsArray = logsArrayWindowRaw.concat(logsArrayExtraRaw);
        logsArray.sort(function (a, b) { return parseDateTime(a.timestamp) - parseDateTime(b.timestamp); });
    }

    function ensureLogsLoadedForDate(dateStr) {
        if (!dateStr || dateStr >= getLogsWindowStartDate()) return; 
        if (logsArrayExtraRaw.some(function (l) { return l.workingDate === dateStr; })) return; 
        fbDb.ref(FB_ROOT + "/logs").orderByChild("workingDate").equalTo(dateStr).once("value")
            .then(function (snap) {
                const val = snap.val() || {};
                const fetched = Object.keys(val).map(function (k) { return Object.assign({}, val[k], { _key: k }); });
                if (fetched.length) {
                    logsArrayExtraRaw = logsArrayExtraRaw.concat(fetched);
                    rebuildLogsArray();
                    renderAll();
                }
            })
            .catch(function (err) { console.error("Gagal load logs tanggal lampau:", err); });
    }

    function ensureLogsLoadedForRange(startStr, endStr) {
        if (!startStr || !endStr || !fbDb) return;
        let cursor = new Date(startStr + "T00:00:00");
        let endDate = new Date(endStr + "T00:00:00");
        let guard = 0;
        while (cursor <= endDate && guard < 366) {
            ensureLogsLoadedForDate(getWorkingDateStr(cursor));
            cursor.setDate(cursor.getDate() + 1);
            guard++;
        }
    }

    const DEFAULT_FB_CONFIG = {
        apiKey: "AIzaSyBn1bdUH8uRc_hFq0h4liWd8vLDOLYZFMA",
        authDomain: "dashboardpalangkarayadc.firebaseapp.com",
        databaseURL: "https://dashboardpalangkarayadc-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "dashboardpalangkarayadc",
        storageBucket: "dashboardpalangkarayadc.firebasestorage.app",
        messagingSenderId: "796202356400",
        appId: "1:796202356400:web:d5360896e59dcbba66f575"
    };
    const FB_CONFIG_KEY = "firebase_config_pr_dc"; 

    let lastConnState = null, lastConnKey = null;
    function setConnStatus(state, textOrKey) {
        const el = document.getElementById("connStatus");
        const txt = document.getElementById("connStatusText");
        if (!el) return;
        el.className = "conn-status " + (state === "online" ? "conn-online" : state === "offline" ? "conn-offline" : "conn-connecting");
        const knownKeys = ["conn.menghubungkan", "conn.gagalConfig", "conn.online", "conn.offlineReconnect"];
        lastConnState = state; lastConnKey = textOrKey;
        txt.innerText = knownKeys.indexOf(textOrKey) !== -1 ? t(textOrKey) : textOrKey;
    }
    function refreshConnStatusLabel() {
        if (lastConnState && lastConnKey) setConnStatus(lastConnState, lastConnKey);
    }

    function openFirebaseModal(allowCancel) {
        const modal = document.getElementById("firebaseSetupModal");
        const cancelBtn = document.getElementById("firebaseModalCancelBtn");
        const savedConfig = localStorage.getItem(FB_CONFIG_KEY);
        const activeConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_FB_CONFIG;
        document.getElementById("firebaseConfigInput").value = JSON.stringify(activeConfig, null, 2);
        document.getElementById("firebaseConfigError").innerText = "";
        cancelBtn.style.display = allowCancel ? "inline-block" : "none";
        modal.style.display = "flex";
    }
    function closeFirebaseModal() {
        document.getElementById("firebaseSetupModal").style.display = "none";
    }
    function extractFirebaseConfigObject(raw) {
        const start = raw.indexOf("{");
        if (start === -1) throw new Error("no object found");
        let depth = 0, end = -1;
        for (let i = start; i < raw.length; i++) {
            if (raw[i] === "{") depth++;
            else if (raw[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
        }
        if (end === -1) throw new Error("unbalanced braces");
        const objText = raw.slice(start, end + 1);
        const obj = Function('"use strict"; return (' + objText + ');')();
        return obj;
    }

    function saveFirebaseConfig() {
        const raw = document.getElementById("firebaseConfigInput").value.trim();
        const errEl = document.getElementById("firebaseConfigError");
        let parsed;
        try {
            parsed = extractFirebaseConfigObject(raw);
            if (!parsed.databaseURL || !parsed.apiKey) throw new Error("kurang field");
        } catch (e) {
            errEl.innerText = "❌ Config gak valid / kurang field databaseURL & apiKey.";
            return;
        }
        localStorage.setItem(FB_CONFIG_KEY, JSON.stringify(parsed));
        closeFirebaseModal();
        connectToFirebase(parsed);
    }

    function connectToFirebase(config) {
        try {
            if (fbApp) { firebase.app().delete().then(() => startFirebaseApp(config)); return; }
            startFirebaseApp(config);
        } catch (e) {
            setConnStatus("offline", "conn.gagalConfig");
            console.error(e);
        }
    }

    function startFirebaseApp(config) {
        setConnStatus("connecting", "conn.menghubungkan");
        fbApp = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
        fbDb = firebase.database();

        fbDb.ref(".info/connected").on("value", function (snap) {
            if (snap.val() === true) setConnStatus("online", "conn.online");
            else setConnStatus("offline", "conn.offlineReconnect");
        });

        fbDb.ref(FB_ROOT + "/master").on("value", function (snap) {
            masterKaryawan = snap.val() || {};
            renderAll();
        });

        fbDb.ref(FB_ROOT + "/pdaStationMap").once("value").then(function (snap) {
            if (!snap.exists()) fbDb.ref(FB_ROOT + "/pdaStationMap").set(DEFAULT_PDA_STATION_MAP);
        });
        fbDb.ref(FB_ROOT + "/pdaStationMap").on("value", function (snap) {
            pdaStationMap = snap.val() || Object.assign({}, DEFAULT_PDA_STATION_MAP);
            renderAll();
            renderDatabaseAssetTable();
        });

        attachLogsListener();
        attachAssetLogsListener();
    }

    function attachLogsListener() {
        if (logsListenerRef) logsListenerRef.off();
        logsListenerRef = fbDb.ref(FB_ROOT + "/logs").orderByChild("workingDate").startAt(getLogsWindowStartDate());
        logsListenerRef.on("value", function (snap) {
            const val = snap.val() || {};
            logsArrayWindowRaw = Object.keys(val).map(function (k) { return Object.assign({}, val[k], { _key: k }); });
            rebuildLogsArray();
            renderAll();
        });
    }

    function attachAssetLogsListener() {
        if (assetListenerRef) assetListenerRef.off();
        assetListenerRef = fbDb.ref(FB_ROOT + "/assetLogs").orderByChild("workingDate").startAt(getLogsWindowStartDate());
        assetListenerRef.on("value", function (snap) {
            const val = snap.val() || {};
            assetLogsArray = Object.keys(val).map(function (k) { return Object.assign({}, val[k], { _key: k }); });
            assetLogsArray.sort((a, b) => parseDateTime(a.timestamp) - parseDateTime(b.timestamp));
            renderAll();
        });
    }

    function switchModule(moduleType) {
        currentActiveModule = moduleType;
        attnApplyModuleVisibility(moduleType);
        if (moduleType === 'attn' || moduleType === 'sum') { renderAll(); return; }
        const btnRest = document.getElementById("tabRestBtn");
        const btnAsset = document.getElementById("tabAssetBtn");
        const restContainer = document.getElementById("restTableContainer");
        const assetContainer = document.getElementById("assetTableContainer");
        const restBoxWrapper = document.getElementById("restBoxWrapper");
        const assetBoxWrapper = document.getElementById("assetBoxWrapper");
        const groupAssetSn = document.getElementById("groupAssetSn");
        const formTitle = document.getElementById("formTitle");
        const subHeaderTitle = document.getElementById("subHeaderTitle");
        const filterStationGroup = document.getElementById("filterStationGroup");
        const searchGlobal = document.getElementById("searchGlobal");
        const btnDatabaseAsset = document.getElementById("btnDatabaseAsset");

        if (moduleType === 'rest') {
            btnRest.classList.add("active");
            btnAsset.classList.remove("active");
            restContainer.style.display = "block";
            assetContainer.style.display = "none";
            restBoxWrapper.style.display = "flex";
            assetBoxWrapper.style.display = "none";
            groupAssetSn.style.display = "none";
            filterStationGroup.style.display = "none";
            searchGlobal.placeholder = t('filter.cariPlaceholder');
            btnDatabaseAsset.style.display = "none";
            formTitle.innerText = t('form.titleRest');
            subHeaderTitle.innerText = t('header.subtitleRest');
        } else {
            btnAsset.classList.add("active");
            btnRest.classList.remove("active");
            restContainer.style.display = "none";
            assetContainer.style.display = "block";
            restBoxWrapper.style.display = "none";
            assetBoxWrapper.style.display = "flex";
            groupAssetSn.style.display = "flex";
            filterStationGroup.style.display = "flex";
            searchGlobal.placeholder = t('filter.cariPlaceholderAsset');
            btnDatabaseAsset.style.display = "flex";
            formTitle.innerText = t('form.titleAsset');
            subHeaderTitle.innerText = t('header.subtitleAsset');
        }
        handleOpsIdInputAutomated();
        renderAll();
    }

    function findFullSerialNumber(last5) {
        if (!last5 || last5.length < 5) return null;
        const extraSN = Object.keys(pdaStationMap).filter(sn => PDA_SERIAL_NUMBERS.indexOf(sn) === -1);
        return PDA_SERIAL_NUMBERS.concat(extraSN).find(sn => sn.endsWith(last5.trim())) || null;
    }

    function downloadBackupJSON() {
        if (!fbDb) { showToast("❌ Belum konek ke database, bro.", 'err'); return; }
        fbDb.ref(FB_ROOT).once("value").then(function (snap) {
            const val = snap.val() || {};
            let backupData = { logs: val.logs || {}, assetLogs: val.assetLogs || {}, master: masterKaryawan };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `SECURITY_BACKUP_PR_DC_${getWorkingDateStr(new Date())}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        }).catch(function (err) {
            showToast("❌ Gagal ambil data buat backup: " + err.message, 'err');
        });
    }

    function importBackupJSON(input) {
        const file = input.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.logs || importedData.assetLogs) {
                    if (!confirm("⚠️ Ini bakal MENIMPA data di database online. Lanjut restore?")) { input.value = ""; return; }
                    const updates = {};
                    if(importedData.logs) updates[FB_ROOT + "/logs"] = importedData.logs;
                    if(importedData.assetLogs) updates[FB_ROOT + "/assetLogs"] = importedData.assetLogs;
                    if(importedData.master) updates[FB_ROOT + "/master"] = importedData.master;

                    fbDb.ref().update(updates).then(function () {
                        showToast("🛡️ RESTORE BERHASIL! Data sudah sinkron.", 'ok');
                    });
                } else {
                    showToast("❌ File JSON bukan format backup resmi!", 'err');
                }
            } catch (err) {
                showToast("❌ Gagal membaca file backup.", 'err');
                console.error(err);
            }
            input.value = "";
        };
        reader.readAsText(file);
    }



