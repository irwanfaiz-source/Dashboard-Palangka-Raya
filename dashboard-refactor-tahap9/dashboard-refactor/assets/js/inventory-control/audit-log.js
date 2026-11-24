/**
 * assets/js/inventory-control/audit-log.js — Sub Menu Audit Log
 * Bagian 4/15 dari inventory-control (dulu satu file main.js). Dimuat berurutan oleh inventory-control.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

  // ================= AUDIT LOG (SUBMENU 5) =================
  // Dipanggil tiap ada Tambah/Edit/Hapus data di Stock, Asset IT & NCA, atau Log Usage.
  // Catatan otomatis, gak bisa diedit/dihapus manual dari UI.
  function logAudit(module, action, itemName, detail) {
    if (!fbDb) return;
    const payload = {
      module: module, action: action, itemName: itemName || '-', detail: detail || '',
      changedAt: Date.now(), changedBy: window.__authUserEmail || '-'
    };
    fbDb.ref(FB_ROOT + '/' + currentFacility + '/auditLog').push().set(payload).catch(function (e) {
      console.error('Gagal catat Audit Log:', e);
    });
  }

  function getAuditLogArr() {
    const data = auditLogByFacility[currentFacility] || {};
    return Object.keys(data).map(function (id) { return Object.assign({ _key: id }, data[id]); });
  }

  function auditActionBadgeHtml(action) {
    const map = { create: t('inv.audit.action.create'), update: t('inv.audit.action.update'), delete: t('inv.audit.action.delete') };
    return '<span class="audit-action-badge ' + (action || '') + '">' + (map[action] || action || '-') + '</span>';
  }

  function renderAuditLogTable() {
    const tbody = document.getElementById('auditLogBody');
    if (!tbody) return;
    let rows = getAuditLogArr();

    const q = auditLogFilterQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(function (r) {
        return (r.itemName || '').toLowerCase().indexOf(q) !== -1 || (r.changedBy || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (auditLogFilterModule) {
      rows = rows.filter(function (r) { return r.module === auditLogFilterModule; });
    }

    rows.sort(function (a, b) { return (b.changedAt || 0) - (a.changedAt || 0); });

    if (!rows.length) {
      const isFiltering = !!(q || auditLogFilterModule);
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">' + (isFiltering ? t('inv.audit.emptyFiltered') : t('inv.audit.emptyFacility', { facility: currentFacility })) + '</td></tr>';
      return;
    }

    tbody.innerHTML = rows.slice(0, 300).map(function (r) {
      return '<tr>' +
        '<td>' + (r.changedAt ? formatDateTimeShort(new Date(r.changedAt)) : '-') + '</td>' +
        '<td>' + escapeHtml(r.module || '-') + '</td>' +
        '<td>' + auditActionBadgeHtml(r.action) + '</td>' +
        '<td style="text-align:left;">' + escapeHtml(r.itemName || '-') + '</td>' +
        '<td style="text-align:left; white-space:normal;">' + escapeHtml(r.detail || '-') + '</td>' +
        '<td>' + escapeHtml(r.changedBy || '-') + '</td>' +
        '</tr>';
    }).join('');
  }

  function applyAuditLogFilter() {
    auditLogFilterQuery = document.getElementById('auditLogFilterInput').value;
    auditLogFilterModule = document.getElementById('auditLogModuleFilter').value;
    renderAuditLogTable();
  }

  function resetAuditLogFilter() {
    document.getElementById('auditLogFilterInput').value = '';
    document.getElementById('auditLogModuleFilter').value = '';
    auditLogFilterQuery = ''; auditLogFilterModule = '';
    renderAuditLogTable();
  }

