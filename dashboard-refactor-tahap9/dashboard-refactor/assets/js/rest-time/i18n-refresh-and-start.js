/**
 * assets/js/rest-time/i18n-refresh-and-start.js — Render ulang teks dinamis saat ganti bahasa + I18n.start()
 * Bagian 14/14 dari rest-time (dulu satu file main.js). Dimuat berurutan oleh rest-time.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

    function refreshDynamicModuleTexts() {
      const searchGlobal = document.getElementById("searchGlobal");
      if (searchGlobal) searchGlobal.placeholder = t(currentActiveModule === 'rest' ? 'filter.cariPlaceholder' : 'filter.cariPlaceholderAsset');
      const formTitle = document.getElementById("formTitle");
      if (formTitle) formTitle.innerText = t(currentActiveModule === 'rest' ? 'form.titleRest' : 'form.titleAsset');
      const subHeaderTitle = document.getElementById("subHeaderTitle");
      if (subHeaderTitle) subHeaderTitle.innerText = t(currentActiveModule === 'rest' ? 'header.subtitleRest' : 'header.subtitleAsset');

      if (typeof refreshConnStatusLabel === 'function') refreshConnStatusLabel();

      const badge = document.getElementById("predictedAction");
      if (badge && !document.getElementById("inputOpsId").value.trim()) badge.innerText = t('predicted.scan');

      const collapsed = localStorage.getItem(SUMMARY_COLLAPSE_KEY) === "1";
      if (typeof applySummaryBoxesState === 'function') applySummaryBoxesState(collapsed);

      const dbModal = document.getElementById("databaseAssetModal");
      if (dbModal && dbModal.style.display !== "none" && typeof renderDatabaseAssetTable === 'function') {
        const canEdit = !!window.__authCanDelete;
        document.getElementById("databaseAssetPermNote").innerText = canEdit ? t('dbAsset.permNoteEdit') : t('dbAsset.permNoteReadonly');
        renderDatabaseAssetTable();
      }

      if (typeof renderAll === 'function') renderAll();
    }

    I18n.start();

