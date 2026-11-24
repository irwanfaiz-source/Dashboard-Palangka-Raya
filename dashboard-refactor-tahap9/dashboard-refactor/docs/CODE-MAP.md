# CODE MAP

_Dibuat otomatis oleh `node tools/codemap.mjs`. Jangan diedit manual._

Dipakai buat nyari "fungsi X ada di file apa, baris berapa" tanpa scroll ribuan baris. Deteksi fungsi berdasarkan indentasi, jadi fungsi di dalam IIFE bisa ikut/ketinggalan.

## assets/js/app-shell-bridge.js  _(56 baris)_

**(awal file)** — baris 1
`targetOrigin:25`, `hijack:29`, `init:38`

## assets/js/app-sidebar.js  _(189 baris)_

**(awal file)** — baris 1
`lang:67`, `text:70`, `esc:76`, `label:77`, `submenuItemHtml:79`, `linkHtml:86`, `groupHtml:92`, `html:102`, `refreshLabels:120`, `mount:126`, `bridgeLinks:151`

**Fungsi global (dipakai atribut onclick & kode modul — jangan diganti namanya)** — baris 163
`toggleAppSidebar:165`, `toggleSidebarGroup:170`, `setSidebarGroupCollapsed:178`, `collapseAllSidebarGroups:186`

## assets/js/common.js  _(45 baris)_

**HTML / teks** — baris 18
`escapeHtml:20`

**Toast** — baris 26
`showToast:30`

## assets/js/feedback-board.js  _(262 baris)_

**(awal file)** — baris 1
`pad2:39`, `defaultBuildEntry:43`, `el:72`, `tr:76`, `notify:86`, `createdAtToTime:92`, `userLabel:98`, `itemHtml:104`, `emptyHtml:124`, `showListMessage:126`, `render:134`, `start:145`, `open:177`, `close:187`, `submit:192`, `configure:235`, `openFeedbackBoard:259`, `closeFeedbackBoard:260`, `submitFeedback:261`

## assets/js/i18n-engine.js  _(182 baris)_

**(awal file)** — baris 1
`isValid:51`, `readStored:53`, `lang:63`, `t:68`, `each:79`, `apply:84`, `syncSelect:103`, `start:109`, `setLang:115`, `subscribe:128`, `configure:130`, `byKey:149`, `byLang:157`, `t:180`, `setAppLanguage:181`

## assets/js/inbound/app-shell-bridge.js  _(10 baris)_

## assets/js/inbound/app-sidebar-config.js  _(6 baris)_

## assets/js/inbound/feedback-config.js  _(12 baris)_

## assets/js/inbound/i18n-config.js  _(15 baris)_

## assets/js/inbound/i18n.js  _(933 baris)_

**I18N ENGINE (Bahasa, English, 日本語, 中文)** — baris 2

## assets/js/inbound/inbound-summary.js  _(529 baris)_

**INBOUND SUMMARY — baca langsung dari Google Sheet "Inbound Sea & Air" (CSV gviz)** — baris 8
`pDT:23`, `pD:27`, `pMin:33`, `fMin:34`, `pNum:35`, `rowDate:36`, `normShift:37`, `normStatus:38`, `avg:45`, `pct:46`, `ymd:47`, `setDefaultPeriod:49`, `fetchSheetCsv:62`, `loadSummary:78`, `selVal:100`, `applySumFilter:101`, `fillSel:123`, `uniqVals:128`, `fillSumSelects:129`, `sumSetStatus:134`, `renderAll:140`, `renderSumKpi:152`, `renderSumVendor:180`, `renderSumShift:204`, `renderSumDetail:222`, `durCell:234`, `fmtK:235`, `renderSumTrend:237`, `renderLeadTable:263`, `renderSumLeads:278`, `renderSumAttention:280`

**EXPORT PDF (preview dulu → pilih Status & Vendor → download)** — baris 307
`vendorOf:332`, `fmtYmd:333`, `expBaseRows:336`, `expVendorFiltered:355`, `expRows:358`, `expFilterNote:364`, `openExportPreview:373`, `closeExportPreview:381`, `renderExportPreview:383`, `pdfTxt:441`, `downloadExportPdf:443`

## assets/js/inbound/sidebar.js  _(9 baris)_

## assets/js/index/app-shell.js  _(243 baris)_

**APP-SHELL TAB SWITCHER** — baris 2

**PEMBATASAN AKSES (dipicu auth-guard.js abis login kevalidasi)** — baris 21
`sendSubmenu:70`, `showTab:76`

**Floating Odyssey Widget** — baris 122
`updateOdysseyFabVisibility:137`, `setOdysseyMode:147`, `openOdysseyPopup:157`, `closeOdysseyPopup:161`, `toggleOdysseyPopup:168`

**Bar "Ask Odyssey" di topnav: klik = buka/tutup popup chat** — baris 192

**Resize manual panel popup Odyssey lewat handle custom di pojok** — baris 195

## assets/js/inventory-control/app-shell-bridge.js  _(14 baris)_

## assets/js/inventory-control/app-sidebar-config.js  _(17 baris)_

## assets/js/inventory-control/asset-it-nca-tools.js  _(202 baris)_

**QR CODE / LABEL (khusus Asset NCA)** — baris 8
`openQrLabelModal:10`, `closeQrLabelModal:26`, `printQrLabel:31`

**EXPORT / IMPORT / BULK TEMPLATE ASSET IT & NCA (Excel)** — baris 49
`exportAssetItNcaExcel:53`, `downloadAssetItNcaBulkTemplate:96`, `handleAssetItNcaImportFile:129`

## assets/js/inventory-control/asset-it-nca.js  _(295 baris)_

**DATABASE ASSET IT & NCA (SUBMENU 4)** — baris 8
`statusBadgeHtml:12`, `renderAssetItNcaTable:23`, `applyAssetItNcaFilter:90`, `resetAssetItNcaFilter:96`, `openAssetItNcaModal:103`, `toggleAssetItNcaJumlahField:141`

**FOTO KONDISI ASSET (upload + kompres client-side)** — baris 146
`showAssetItNcaPhotoPreview:147`, `removeAssetItNcaPhoto:154`, `handleAssetItNcaPhotoPick:162`, `openPhotoLightbox:188`, `closePhotoLightbox:194`, `closeAssetItNcaModal:198`, `saveAssetItNca:202`, `deleteAssetItNca:254`

**RIWAYAT MUTASI ASSET (modal)** — baris 265
`openAssetHistoryModal:266`, `closeAssetHistoryModal:291`

## assets/js/inventory-control/asset-master.js  _(279 baris)_

**MASTER NAMA ASSET** — baris 8
`getAssetMasterData:30`, `findMasterByName:32`, `masterSortedNames:40`, `masterSampleName:45`, `countStockByNormName:48`, `populateAssetNameSelect:60`, `renderAssetMasterTable:76`, `openAssetMasterModal:137`, `closeAssetMasterModal:157`, `saveAssetMaster:162`, `deleteAssetMaster:204`, `seedAssetMaster:220`, `addMasterFromStockName:243`, `deleteAsset:269`

## assets/js/inventory-control/audit-log.js  _(80 baris)_

**AUDIT LOG (SUBMENU 5)** — baris 8
`logAudit:11`, `getAuditLogArr:22`, `auditActionBadgeHtml:27`, `renderAuditLogTable:32`, `applyAuditLogFilter:67`, `resetAuditLogFilter:73`

## assets/js/inventory-control/dialogs-and-shortcuts.js  _(105 baris)_

**(awal file)** — baris 1
`showConfirmModal:11`, `formatDateTimeShort:100`

## assets/js/inventory-control/feedback-config.js  _(13 baris)_

## assets/js/inventory-control/firebase-sync.js  _(53 baris)_

**FIREBASE SYNC** — baris 8
`initInventoryFirebaseSync:12`

## assets/js/inventory-control/i18n-config.js  _(15 baris)_

## assets/js/inventory-control/i18n.js  _(345 baris)_

**I18N ENGINE (Bahasa, English, 日本語, 中文) — sama persis pola & key sidebar/feedback** — baris 2

## assets/js/inventory-control/init.js  _(46 baris)_

**INIT** — baris 8

## assets/js/inventory-control/item-history-and-low-stock.js  _(103 baris)_

**RIWAYAT PEMAKAIAN PER ITEM (Stock)** — baris 8
`openItemHistoryModal:12`, `closeItemHistoryModal:56`

**LOW-STOCK BANNER (global)** — baris 60
`renderLowStockBanner:63`, `dismissLowStockBanner:98`

## assets/js/inventory-control/layout-and-submenu.js  _(61 baris)_

**(awal file)** — baris 1
`fitTableToBottom:4`, `switchInvSubmenu:22`, `renderForCurrentFacility:47`, `capitalize:59`

## assets/js/inventory-control/reports.js  _(191 baris)_

**Export Laporan ke Excel (Top Asset + Chart Daily Usage + Trend Bulanan)** — baris 8
`exportUsageExcelReport:9`

**EXPORT LAPORAN KE PDF** — baris 56
`exportDashboardPdfReport:57`, `exportAssetItNcaPdf:102`, `formatDateID:136`, `applyDailyUsageDateRange:143`, `renderUsageLogTable:153`

## assets/js/inventory-control/state-and-devisi.js  _(77 baris)_

**STATE & FIREBASE** — baris 8
`getStockData:35`, `getAssetItNcaData:36`, `getLogsArr:37`

**Devisi otomatis (SOC / EHA) berdasarkan email yang lagi login** — baris 42
`getDevisiForEmail:53`, `getCurrentUserDevisi:57`, `getDevisiLabel:61`, `updateUsageFormVisibility:65`, `todayStr:72`

## assets/js/inventory-control/stock-import.js  _(127 baris)_

**IMPORT / BULK TEMPLATE STOCK (Excel)** — baris 8
`downloadStockBulkTemplate:11`, `handleStockImportFile:46`

## assets/js/inventory-control/stock.js  _(203 baris)_

**STOCK TABLE (SUBMENU 2)** — baris 8
`renderStockTable:9`, `openAssetModal:53`, `closeAssetModal:94`

**AUTO-FILL MIN STOCK (35% dari Qty)** — baris 98
`calcSuggestedMinStock:103`, `updateMinStockHint:108`, `normalizeAssetName:134`, `cleanAssetName:137`, `saveAsset:148`

## assets/js/inventory-control/usage-dashboard.js  _(249 baris)_

**(awal file)** — baris 1
`renderUsageDashboard:12`, `applyDashboardDevisiFilter:21`, `renderUsageHighlight:26`

**Trend Bulanan Usage (6 bulan terakhir) — buat lihat pola musiman** — baris 198

## assets/js/inventory-control/usage-log.js  _(377 baris)_

**LOG ACTIVITY USAGE (SUBMENU 1)** — baris 8
`buildAssetOptionsHtml:9`

**Dropdown Asset yang bisa dicari (ngetik buat filter, klik buat pilih)** — baris 24
`enhanceAssetCombo:26`, `populateAssetSelect:103`

**MULTI-INPUT: baris Asset & Qty di form "Input Penggunaan"** — baris 121
`usageItemRowHtml:124`, `addUsageItemRow:132`, `removeUsageItemRow:143`, `updateUsageItemRemoveButtons:150`, `initUsageItemRows:158`, `submitUsageLog:165`, `proceedSubmitUsageLog:198`, `deleteUsageLog:236`

**EDIT LOG (modal)** — baris 268
`openEditLogModal:269`, `closeLogModal:290`, `saveEditLog:294`

**SEARCH/FILTER RIWAYAT LOG** — baris 353
`applyLogFilter:358`, `resetLogFilter:369`

## assets/js/login/login.js  _(221 baris)_

**(awal file)** — baris 1
`initFirebaseAndShowLogin:21`, `doLogin:64`

**LUPA PASSWORD** — baris 88
`showForgotStep:92`, `showLoginStep:107`

**GANTI PASSWORD (pakai password lama)** — baris 116
`showChangeStep:119`, `doChangePassword:131`, `doForgotPassword:185`

## assets/js/outbound/app-shell-bridge.js  _(14 baris)_

## assets/js/outbound/app-sidebar-config.js  _(12 baris)_

## assets/js/outbound/charts.js  _(148 baris)_

**(awal file)** — baris 1
`getChartThemeColors:8`, `renderBacklogCharts:18`, `renderShiftVolumeChart:58`, `renderTrendChart:93`

## assets/js/outbound/dashboard-render.js  _(431 baris)_

**(awal file)** — baris 1
`renderDashboard:8`, `renderExecutiveSummary:304`, `downloadReportImage:416`

## assets/js/outbound/data-processing.js  _(113 baris)_

**(awal file)** — baris 1
`formatDateTime:20`, `formatDateTimeShort:26`, `getFieldValue:33`, `processData:44`, `applyFilters:107`

## assets/js/outbound/drilldown-and-history.js  _(287 baris)_

**(awal file)** — baris 1
`computeDestinationStats:8`, `showDestinationDrilldown:41`, `closeDestModal:108`, `showRouteDrilldown:113`, `openHubFromRoute:144`, `backToRouteFromDest:149`, `closeRouteModal:156`, `saveHistorySnapshot:161`, `getDCHistorySeries:196`, `getPrevDCSnapshot:207`, `deltaBadgeHtml:212`, `calcOnTimeDepartureRate:224`, `getDestinationHistory:240`, `renderDestinationTrend:254`

## assets/js/outbound/feedback-config.js  _(12 baris)_

## assets/js/outbound/firebase-sync.js  _(97 baris)_

**(awal file)** — baris 1
`initOutboundFirebaseSync:8`, `pushImportToFirebase:64`

## assets/js/outbound/grid-state-and-sla.js  _(141 baris)_

**(awal file)** — baris 1
`setMaxStagingCapacity:36`, `setSLATarget:51`, `getOccupancyPct:60`, `getOccupancyLevel:64`, `occupancyBadgeHtml:70`, `getAgingStatus:79`, `agingStatusDisplayLabel:89`, `statusBadgeHtml:95`, `setDestinationCapacity:103`, `focusGridSearchInput:131`

## assets/js/outbound/grids.js  _(173 baris)_

**(awal file)** — baris 1
`onGridSearchInput:8`, `onGridPageSizeChange:14`, `changeGridPage:20`, `setGridSort:25`, `updateGridSortIcons:36`, `renderGrids:48`, `exportGridToExcel:120`, `getRouteAlert:166`

## assets/js/outbound/hub-sort-and-packer.js  _(264 baris)_

**(awal file)** — baris 1
`copyToClipboard:8`, `getSortCode:76`, `normalizeHubName:80`, `packerNameHtml:84`, `togglePackerShowAll:91`, `updatePackerShowMoreBar:96`, `renderPackerLeaderboard:116`

## assets/js/outbound/i18n-config.js  _(19 baris)_

## assets/js/outbound/i18n.js  _(289 baris)_

## assets/js/outbound/init.js  _(17 baris)_

## assets/js/outbound/layout-and-theme.js  _(93 baris)_

**(awal file)** — baris 1
`setActiveSection:8`, `switchSubmenu:18`, `setThemeMode:50`, `toggleThemeMode:71`, `updateClock:75`

## assets/js/outbound/linehaul-schedule.js  _(146 baris)_

**(awal file)** — baris 1
`getShiftFromTimeStr:63`, `hubKey:89`, `routeHasHub:90`, `rebuildLinehaulRoutesFromSchedule:94`, `timeStrToMinutes:117`, `getDeliveryShiftForItem:132`

## assets/js/outbound/log-update.js  _(97 baris)_

**(awal file)** — baris 1
`initLogUpdateSync:10`, `renderLogUpdateList:24`, `deleteLogUpdateEntry:47`, `openLogUpdateModal:77`, `closeLogUpdateModal:83`

## assets/js/outbound/occupancy-table.js  _(134 baris)_

**Next Slot & Next Depart (tabel Occupancy Inner Island)** — baris 8
`updateNextDepartCells:10`, `info:12`

**Tabel Occupancy Inner Island: filter, sort, pencarian** — baris 55
`occRouteChainHtml:59`, `applyRouteTableView:64`

## assets/js/outbound/odyssey-label.js  _(35 baris)_

**(awal file)** — baris 1
`findLabel:3`, `outerPinned:11`, `relocate:21`, `start:27`

## assets/js/outbound/schedule-backup.js  _(327 baris)_

**Backup & Riwayat Perubahan Schedule Outbound (Firebase)** — baris 2
`normTime:15`, `normDays:16`, `normRow:21`, `hashRows:25`, `sortRows:31`, `diffRows:37`, `toast:65`, `commit:67`, `showGuard:119`, `hideGuard:127`, `chip:142`, `describe:144`, `getVersion:156`, `alignRoute:164`, `sideCells:184`, `buildCompareHtml:197`, `loadCompare:222`, `renderHistory:237`, `attachListener:294`, `maybeRun:315`

## assets/js/outbound/schedule-outbound.js  _(233 baris)_

**Schedule Outbound (Google Sheet: Schedule V.5)** — baris 2
`parseCSV:12`, `esc:28`, `isActiveToday:33`

**Next Slot & Next Depart: ETD Origin terdekat (>= jam lokal device) per route** — baris 41
`activeOnDate:42`, `destOf:49`, `hubsOfDest:50`, `parseEtd:51`

**end Next Slot & Next Depart** — baris 77
`renderDays:79`, `cotBadge:86`, `indBadge:95`, `renderSchedule:105`, `setMsg:134`, `fetchRowsCsv:142`, `fetchRowsJsonp:161`, `loadSchedule:180`

## assets/js/outbound/state-and-compression.js  _(67 baris)_

**(awal file)** — baris 1
`nz:11`, `toColumnar:19`, `fromColumnar:27`, `uint8ToBase64:39`, `base64ToUint8:48`, `compressToBase64:55`, `decompressFromBase64:61`

## assets/js/outbound/tailwind-config.js  _(21 baris)_

## assets/js/outbound/to-modal-and-alerts.js  _(331 baris)_

**(awal file)** — baris 1
`triggerFunnyAlert:30`, `hideFunnyAlert:55`, `classifyToType:67`, `toTypeBadgeHtml:84`, `agingLabelFromDays:105`, `modalAgingTypeLabel:107`, `agingPillClass:111`, `agingBorderClass:118`, `modalOperatorHtml:125`, `modalPackTimeHtml:133`, `getModalVisibleRows:156`, `renderModalRows:167`, `onModalSearch:196`, `onModalSort:197`, `copyOneTO:199`, `copyModalTable:210`, `renderTOModal:223`, `showTONumbers:281`, `showRouteTONumbers:296`, `showPackerTONumbers:310`, `closeModal:329`

## assets/js/performance-bagger/agency-and-detail.js  _(177 baris)_

**AGENCY BREAKDOWN (proportional bars)** — baris 8
`renderAgencyChart:9`

**POPUP DETAIL HARIAN & CHART** — baris 35
`formatTanggalId:36`, `openPbDetail:42`

## assets/js/performance-bagger/app-shell-bridge.js  _(10 baris)_

## assets/js/performance-bagger/app-sidebar-config.js  _(6 baris)_

## assets/js/performance-bagger/chart-helpers.js  _(94 baris)_

**HELPER MODAL DETAIL: garis target, tema, chart per jam** — baris 34
`pbdTheme:52`, `pbdTip:56`, `pbdEsc:59`, `pbdDotCls:60`, `pbdStatusDot:64`, `renderPbHourChart:68`

## assets/js/performance-bagger/daily-status.js  _(40 baris)_

**UPDATE STATUS HARIAN OPERATOR (MANUAL VIA POPUP)** — baris 8
`updateDailyStatusInfo:9`, `updateDailyStatusCustom:23`, `saveDailyStatusToFirebase:29`

## assets/js/performance-bagger/events-and-export.js  _(128 baris)_

**HANDLER EVENT POPUP** — baris 8
`getFilteredExportData:44`, `exportToExcel:68`, `exportToPDF:89`, `toggleDarkMode:115`

## assets/js/performance-bagger/feedback-config.js  _(10 baris)_

## assets/js/performance-bagger/i18n-config.js  _(35 baris)_

## assets/js/performance-bagger/i18n.js  _(502 baris)_

**(awal file)** — baris 1
`statusLabel:485`, `getMonthNames:497`

## assets/js/performance-bagger/import-daily-and-hourly.js  _(182 baris)_

**IMPORT EXCEL HARIAN (PDVT)** — baris 8
`getPbFieldValue:9`, `detectPbDateColumns:20`, `parsePbOpsIdName:25`

**IMPORT PER JAM (export PDVT 12 jam terakhir, kolom "YYYY-MM-DD HH:00")** — baris 68
`detectPbHourColumns:70`, `processPbHourlyImport:75`, `pushPbHourlyToFirebase:112`

## assets/js/performance-bagger/import-indicator.js  _(17 baris)_

**(awal file)** — baris 1
`sync:7`

## assets/js/performance-bagger/import-roster.js  _(128 baris)_

**IMPORT ROSTER (NEW)** — baris 8
`processRosterImport:29`

## assets/js/performance-bagger/individual-slip-pdf.js  _(338 baris)_

**(awal file)** — baris 1
`downloadIndividualSlipPDF:9`

**Palet & util** — baris 22
`fitText:42`, `check:47`

**Ikon vektor (semua digambar pakai primitif jsPDF)** — baris 53
`iconShield:54`, `iconCalendar:60`, `sectionIcon:71`, `kpiIcon:92`, `sectionTitle:113`

**1. HEADER** — baris 122

**2. PROFIL OPERATOR** — baris 144

**3. RINGKASAN PERFORMA (4 KARTU KPI)** — baris 166

**4. TABEL PRODUKTIVITAS HARIAN** — baris 188

**5. EVALUASI & COACHING (PANEL KHUSUS)** — baris 241

**6. AREA TANDA TANGAN** — baris 306

**7. FOOTER (semua halaman)** — baris 318
`closePbDetail:331`

## assets/js/performance-bagger/init.js  _(18 baris)_

**INITIALIZATION** — baris 8

## assets/js/performance-bagger/log-update.js  _(184 baris)_

**LOG UPDATE (riwayat import file: nama file + jam + siapa yang import)** — baris 8
`pbLogType:31`, `pbLogFormatTime:39`, `pbLogCanDelete:45`, `renderPbLogList:49`, `attachPbLogListener:109`, `detachPbLogListener:130`, `deletePbLogEntry:135`, `openPbLogModal:147`, `closePbLogModal:158`

## assets/js/performance-bagger/reset-and-raw-import.js  _(245 baris)_

**RESET DATA (hapus semua data Performance Bagger di dashboard + RTDB)** — baris 8
`isPbResetAllowed:13`, `applyPbResetPermission:19`, `resetPbData:38`, `refreshPbHourSelect:71`, `loadPbHourly:80`, `processPbRawImport:117`, `pushPbRawImportToFirebase:160`, `processPbImport:190`, `pushPbImportToFirebase:220`

## assets/js/performance-bagger/roster-and-firebase.js  _(191 baris)_

**ROSTER STAFF** — baris 8
`pad2:138`, `getYesterdayDateStr:140`, `currentMonthRange:146`, `loadPbMonth:167`, `initPbFirebaseSync:183`

## assets/js/performance-bagger/table-and-aggregates.js  _(340 baris)_

**AGGREGASI & RENDER TABEL** — baris 8
`computePbAggregates:9`, `statusBadgeClass:96`, `pbxEsc:103`, `pbxStatusMeta:107`, `sortPbTable:116`, `updatePbSortIcons:126`, `generateSparklineSVG:135`, `renderLeaderboard:154`, `renderThTotalHeader:174`, `toggleD1ViewFilter:184`, `setQuickDateRange:193`, `toggleRedFlagFilter:202`, `renderPbTable:210`, `updatePbSummary:317`

## assets/js/performance-bagger/tailwind-config.js  _(13 baris)_

## assets/js/performance-bagger/top20-stats.js  _(318 baris)_

**STATISTIK PACKED OPERATOR (TOP 20) — dibuka dari klik Hall of Fame** — baris 2
`$:12`, `fmt:13`, `esc:14`, `p2:19`, `parseD:20`, `shortD:21`, `weekStart:22`, `targetOf:27`, `isOpen:28`, `activeDates:31`, `weeksOfMonth:39`, `calcFromDates:49`, `calcHourly:65`, `rank:83`, `setOptions:94`, `hoursStrip:102`, `captionText:113`, `showRows:127`, `showMessage:160`, `ensureCoverage:165`, `loadHourlyDay:174`, `renderHourly:183`, `render:211`

**event** — baris 257
`openDetailFrom:279`

**API global (dipanggil dari HTML / modul lain)** — baris 302

## assets/js/performance-bagger/ui-helpers.js  _(21 baris)_

**(awal file)** — baris 1
`triggerPrintView:3`, `logoutApp:9`

## assets/js/report-agent/agent-api.js  _(192 baris)_

**(awal file)** — baris 1
`toGeminiParts:16`, `buildContentsForApi:33`, `buildRequestBodyBase:42`, `callGeminiProxy:58`, `extractModelText:78`, `parseModelJson:106`, `recoverRepliesFromBrokenJson:130`, `requestModelReply:146`

**Loop retry sisi klien** — baris 147

## assets/js/report-agent/agent-helpers.js  _(117 baris)_

**(awal file)** — baris 1
`simplifyErrorMessage:10`, `getLocalDateStr:48`

**KLASIFIKASI MODUL PAKAI AI (BARU) — fallback kalau regex kosakata di** — baris 56
`classifyModulesWithAI:69`

## assets/js/report-agent/agent-prompt-assemble.js  _(77 baris)_

**(awal file)** — baris 1
`buildSystemPrompt:9`, `buildModulesPrompt:18`, `buildLightPrompt:53`, `buildFullPrompt:69`

## assets/js/report-agent/agent-prompt-common.js  _(24 baris)_

## assets/js/report-agent/agent-prompt-dw.js  _(72 baris)_

**(awal file)** — baris 1
`buildDwReportPrompt:7`

## assets/js/report-agent/agent-prompt-inbound.js  _(100 baris)_

**(awal file)** — baris 1
`buildInboundModuleText:11`

## assets/js/report-agent/agent-prompt-inventory.js  _(93 baris)_

**(awal file)** — baris 1
`buildInventoryBlock:7`

## assets/js/report-agent/agent-prompt-outbound.js  _(69 baris)_

**(awal file)** — baris 1
`buildOutboundBlock:7`

## assets/js/report-agent/agent-prompt-performance-bagger.js  _(68 baris)_

**(awal file)** — baris 1
`buildPerformanceBaggerBlock:7`

## assets/js/report-agent/agent-prompt-queue.js  _(79 baris)_

**(awal file)** — baris 1
`buildQueueReportPrompt:7`

## assets/js/report-agent/agent-prompt-rest-asset.js  _(128 baris)_

**(awal file)** — baris 1
`buildRestAssetBlock:7`

**PANDUAN OPERASIONAL (BARU) — lihat REST_TIME_GUIDE di atas** — baris 22

## assets/js/report-agent/agent-prompt-rest-guide.js  _(166 baris)_

**PANDUAN OPERASIONAL rest-time.html (BARU)** — baris 7

## assets/js/report-agent/agent-reply.js  _(43 baris)_

**(awal file)** — baris 1
`renderAgentReply:9`

## assets/js/report-agent/agent-topics.js  _(116 baris)_

**(awal file)** — baris 1
`detectTopics:8`, `resolveMatchedModules:89`

**GABUNGAN MODUL (BARU)** — baris 91

## assets/js/report-agent/ask-agent.js  _(52 baris)_

**(awal file)** — baris 1
`askAgent:10`

## assets/js/report-agent/chat-messages.js  _(199 baris)_

**(awal file)** — baris 1
`addMessage:11`, `addTyping:168`, `removeTyping:178`

**Lightbox gambar in-app (ganti window.open tab baru)** — baris 183
`openLightbox:184`, `closeLightbox:189`

## assets/js/report-agent/chat-sessions.js  _(145 baris)_

**Simpen & muat histori chat per-user ke/dari Firebase** — baris 8
`getCurrentUid:11`, `getCurrentUserLabel:20`, `newSessionId:33`, `sanitizeMessagesForSave:39`, `scheduleSaveSession:48`, `saveSessionNow:54`, `refreshSessionsList:75`, `renderSessionsList:96`, `loadSession:123`

## assets/js/report-agent/chat-ui-controls.js  _(99 baris)_

**Quick-reply shortcut chips** — baris 8
`addQuickReplies:18`

**New Chat / reset percakapan** — baris 35
`startNewChat:36`

**Toggle sidebar riwayat chat** — baris 48

**Popover Setting (ukuran font & lebar chat)** — baris 59
`applyFontSize:76`, `applyChatWidth:79`

## assets/js/report-agent/command-palette.js  _(121 baris)_

**Command Bar / AI Command Palette** — baris 8
`renderCmdPalette:30`, `hideCmdPalette:51`, `isCmdPaletteOpen:58`, `highlightCmdPaletteIndex:61`, `updateCmdPalette:67`, `runSlashCommand:76`, `handleCmdPaletteKeydown:84`

## assets/js/report-agent/explain-panels.js  _(130 baris)_

**Fitur "Explain Why?" & "Details" (fitur baru)** — baris 8
`buildExplainData:16`, `buildExplainPanel:85`, `buildDetailsPanel:112`

## assets/js/report-agent/inbound-logic.js  _(231 baris)_

**Replikasi persis logic status di inbound.html** — baris 8
`computeStatus:9`, `formatDateYYYYMMDDLocal:35`, `normalizeTrip:40`

**Deteksi "Convoy" (fitur baru)** — baris 62
`computeConvoyGroups:71`

**AI "Daily Briefing" (fitur baru)** — baris 111
`greetingSalutation:119`, `detectVendorLateRateAnomaly:131`, `rateByVendor:132`, `rankPriorityTrips:164`, `buildDailyBriefingText:177`, `maybeShowDailyBriefing:224`

## assets/js/report-agent/init.js  _(30 baris)_

## assets/js/report-agent/input-and-shell-handlers.js  _(90 baris)_

**Attach gambar via paste (Ctrl+V)** — baris 31
`setPendingImage:34`, `clearPendingImage:41`, `handlePasteEvent:47`, `commitSend:68`

## assets/js/report-agent/inventory-actions.js  _(180 baris)_

**INVENTORY CONTROL - AKSI TULIS (Update Stock & Submit Usage Log)** — baris 8
`invLogAudit:15`, `invUpdateStockQty:27`, `invSubmitUsageLog:51`, `renderInventoryActionConfirmCard:78`

## assets/js/report-agent/inventory-data.js  _(210 baris)_

**Devisi otomatis (SOC/EHA) modul Inventory Control — di-COPY PERSIS dari EHA_EMAILS/** — baris 8
`invGetDevisiForEmail:22`, `invTodayStrLocal:28`, `fetchInventoryControlData:36`, `buildInventoryControlSummary:70`

## assets/js/report-agent/live-trips-fetch.js  _(42 baris)_

**Mock data (dipakai kalau live toggle mati / firebase belum siap)** — baris 8
`generateMockData:9`, `iso:11`

**Firebase live fetch** — baris 21
`fetchLiveTrips:22`

## assets/js/report-agent/load-data.js  _(125 baris)_

**(awal file)** — baris 1
`loadData:8`, `fmtTime:94`, `badgeClassFor:100`, `renderAttachCard:107`

## assets/js/report-agent/outbound-data.js  _(351 baris)_

**Path Firebase modul OUTBOUND (outbound.html) — Aging & Packer Backlog + Occupancy & Shift.** — baris 8

**Modul PERFORMANCE BAGGER (monitoring produktivitas packer/bagger harian, sumber import PDVT)** — baris 15

**Modul INVENTORY CONTROL (Stock, Log Activity Usage & Highlight, Asset IT & NCA, Audit Log)** — baris 20
`outboundBase64ToUint8:33`, `outboundDecompressFromBase64:39`, `outboundFromColumnar:44`, `fetchOutboundData:56`

**Jadwal keberangkatan Linehaul modul Outbound (Occupancy & Shift Departure Schedule) — config** — baris 88
`outboundShiftFromTimeStr:146`, `outboundTimeStrToMinutes:160`, `outboundDeliveryShiftForItem:176`, `outboundDepartureStatusText:188`, `outboundRouteAlert:198`, `outboundGetNum:209`, `outboundGetSettings:213`, `buildOutboundSummary:228`

## assets/js/report-agent/performance-bagger-data.js  _(334 baris)_

**Roster staff & target achievement modul Performance Bagger — di-COPY PERSIS dari konstanta** — baris 8
`pbPad2:128`, `pbYesterdayLocal:132`, `pbCurrentMonthRangeLocal:140`, `fetchPerformanceBaggerData:156`, `computePbAggregatesForAgent:187`, `buildPerformanceBaggerSummary:265`

## assets/js/report-agent/render-helpers.js  _(96 baris)_

**(awal file)** — baris 1
`renderMarkdownInto:21`, `typewriterInto:35`, `friendlyModelName:73`

## assets/js/report-agent/rest-time-data.js  _(247 baris)_

**Firebase live fetch — Rest Time & Asset Usage (prDcMonitoring)** — baris 8
`getMonWindowStartDate:13`, `fetchRestAssetData:18`

**REST TIME & ASSET USAGE - HELPER & AKSI TULIS (dari Odyssey)** — baris 52
`monParseDateTime:55`, `computeRestAssetLiveStatus:64`

**Operator yang lagi Break Out & udah >60 menit** — baris 67

**PDA yang aksi terakhirnya "Pinjam PDA" (belum "Kembali PDA")** — baris 88
`monUpdateLogTime:118`, `monDeleteActivity:134`, `renderRestActionConfirmCard:151`

## assets/js/report-agent/sound.js  _(62 baris)_

**(awal file)** — baris 1
`ensureAudioCtx:13`, `playChatSound:20`, `applySoundToggleIcon:49`

## assets/js/report-agent/state-and-config.js  _(46 baris)_

**Path Firebase modul Rest Time & Asset Usage (rest-time.html)** — baris 11

**Path Firebase buat histori chat per-user (fitur "simpen histori** — baris 31

**Sound effect halus pas kirim/terima pesan (Web Audio API, gak butuh** — baris 40

## assets/js/rest-time/app-shell-bridge.js  _(22 baris)_

## assets/js/rest-time/app-sidebar-config.js  _(6 baris)_

## assets/js/rest-time/attendance-fms.js  _(686 baris)_

**Modul: Pre-Work by Attendance FMS** — baris 2
`attnDeptAllowed:7`, `attnNorm:10`, `attnParseCsv:12`, `attnYmd:27`, `attnShiftBucket:34`, `attnBuildRows:40`

**Preview sebelum import disimpan: file dibaca & dihitung dulu. Belum ada yang ditulis ke data / Firebase sampai klik Simpan.** — baris 65
`attnHandleFile:68`, `attnComputeMerge:92`, `attnMasterMissing:105`, `attnPvDate:117`, `attnPvRange:118`, `attnShowPreview:124`, `attnPreviewClose:157`, `attnPreviewCancel:158`, `attnPreviewConfirm:160`

**Simpan & muat dari Firebase: <FB_ROOT>/attendanceFms { fileName, count, min, max, skipped, excluded, importedBy, importedAt, rows: [[...], ...] }** — baris 173
`attnRowToArr:176`, `attnRowFromArr:177`, `attnInfoText:179`, `attnApplyData:184`, `attnSaveToFirebase:207`, `attnLogRange:225`, `attnLogCell:226`, `attnOpenImportLog:229`, `attnCloseImportLog:248`, `attnAttachListener:251`, `attnPickFile:264`, `attnTimeMask:270`, `attnTimeFix:279`, `attnResetTime:288`, `attnSetToday:293`, `attnPwDate:302`, `attnClockInMs:313`, `attnPwFor:322`, `attnPwBadge:332`, `attnGroupOf:337`, `attnSubmitCell:343`, `attnSubmitText:351`, `attnStatusLabel:357`, `attnVisibleRows:365`, `renderAttnPreWork:395`, `attnExportCsv:428`

**Tab Summary Pre-Work per Vendor: Achievement Daily / Weekly / Monthly Submission** — baris 439
`attnUtc:447`, `attnUtcYmd:448`, `attnPeriodKey:449`, `attnPeriodBounds:454`, `attnPeriodLabel:459`, `attnSumVisible:471`, `attnSumClass:476`, `attnSumPct:477`, `attnSumQuick:479`, `attnSumBase:489`, `attnSummaryData:503`, `attnSumCell:523`, `attnSumFillTable:529`, `attnRenderSummary:544`, `attnSumExportCsv:573`

**Drill-down: klik angka % -> daftar operator Sudah / Belum submit Pre-Work** — baris 590
`attnSumVendorOf:592`, `attnSumDrill:593`, `attnDrillClose:608`, `attnDrillSetFilter:609`, `attnDrillVisible:619`, `attnDrillRender:626`, `attnDrillExportCsv:638`

**Kartu angka diklik = filter tabel (sama dgn dropdown Status Pre-Work). Klik kartu yang sedang aktif = balik ke All Status** — baris 654
`attnCardFilter:655`, `attnApplyModuleVisibility:673`

## assets/js/rest-time/checkin-blockers.js  _(127 baris)_

**BLOCKER CHECK IN (berdasarkan Pre-Work Status)** — baris 8

**BLOCKER CHECK IN SHIFT 00.00 (terlalu awal / sebelum jam 00.00)** — baris 45

**POPUP KARYAWAN BARU (Rest Time): OpsID yang di-scan belum ada di Database Karyawan** — baris 64

## assets/js/rest-time/cycle-logic.js  _(120 baris)_

**ANTI DOUBLE SCAN (Rest Time)** — baris 12

**Penanda siklus tidak lengkap** — baris 69

## assets/js/rest-time/database-asset.js  _(116 baris)_

## assets/js/rest-time/date-filter-and-import.js  _(204 baris)_

## assets/js/rest-time/feedback-config.js  _(10 baris)_

## assets/js/rest-time/filters-and-sort.js  _(99 baris)_

**Filter Jam (HH:mm s.d HH:mm) - sama kayak Pre-Work by Attendance FMS** — baris 8

## assets/js/rest-time/i18n-config.js  _(14 baris)_

## assets/js/rest-time/i18n-dict.js  _(523 baris)_

## assets/js/rest-time/i18n-refresh-and-start.js  _(36 baris)_

## assets/js/rest-time/pda-data.js  _(153 baris)_

## assets/js/rest-time/prework-data.js  _(309 baris)_

**Pre-Work Status (Google Sheet "PreWork Helper")** — baris 8

## assets/js/rest-time/render-monitoring.js  _(425 baris)_

## assets/js/rest-time/scan-and-alerts.js  _(230 baris)_

## assets/js/rest-time/state-and-firebase.js  _(291 baris)_

## assets/js/rest-time/submit-log.js  _(279 baris)_

## assets/js/rest-time/ui-theme-and-overtime.js  _(194 baris)_
