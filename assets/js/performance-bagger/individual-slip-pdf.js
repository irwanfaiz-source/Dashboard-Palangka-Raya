/**
 * assets/js/performance-bagger/individual-slip-pdf.js — Individual Performance Card (rapor digital PDF)
 * Bagian 11/13 dari performance-bagger (dulu satu file main.js). Dimuat berurutan oleh performance-bagger.html;
 * urutan script penting. Cari fungsi lewat docs/CODE-MAP.md.
 *
 */

// FITUR "INDIVIDUAL PERFORMANCE CARD" (RAPOR DIGITAL PDF) — REDESIGN v2
function downloadIndividualSlipPDF() {
  if (!currentDetailOpsId) return;
  const agg = computePbAggregates();
  const staff = agg[currentDetailOpsId];
  if (!staff) return;
  staff.opsId = currentDetailOpsId;

  const threshold = ACHIEVEMENT_THRESHOLD[staff.status] || ACHIEVEMENT_THRESHOLD['DW On Call'];
  const achRatePct = staff.days > 0 ? Math.round((staff.achievedDays / staff.days) * 100) : 0;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  // ---------- Palet & util ----------
  const C = {
    maroon: [122, 18, 36],
    maroonDark: [96, 12, 28],
    navy: [26, 35, 84],
    grey: [100, 112, 135],
    line: [215, 222, 233],
    card: [240, 244, 250],
    white: [255, 255, 255],
    green: [16, 185, 129],
    amber: [245, 158, 11],
    red: [225, 29, 72]
  };
  const fill = c => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = c => doc.setDrawColor(c[0], c[1], c[2]);
  const color = c => doc.setTextColor(c[0], c[1], c[2]);
  const font = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
  try { doc.setLineCap('round'); doc.setLineJoin('round'); } catch (e) { /* optional */ }

  // Kecilkan font sampai teks muat di lebar tertentu
  function fitText(text, style, size, minSize, maxW) {
    font(style, size);
    while (doc.getTextWidth(text) > maxW && size > minSize) { size -= 0.5; font(style, size); }
  }

  function check(cx, cy, s, col, lw) {
    stroke(col); doc.setLineWidth(lw);
    doc.line(cx - s, cy, cx - s * 0.3, cy + s * 0.7);
    doc.line(cx - s * 0.3, cy + s * 0.7, cx + s, cy - s * 0.6);
  }

  // ---------- Ikon vektor (semua digambar pakai primitif jsPDF) ----------
  function iconShield(x, y, h, col) {
    const w = h * 0.82;
    stroke(col); doc.setLineWidth(0.7);
    doc.lines([[w / 2, 0.14 * h], [0, 0.36 * h], [-w / 2, 0.5 * h], [-w / 2, -0.5 * h], [0, -0.36 * h], [w / 2, -0.14 * h]], x + w / 2, y, [1, 1], 'S', true);
    check(x + w / 2, y + h * 0.42, h * 0.2, col, 0.7);
  }
  function iconCalendar(x, y, s, col) {
    stroke(col); doc.setLineWidth(0.6);
    doc.roundedRect(x, y + 1, s, s - 1, 1, 1, 'S');
    doc.line(x, y + 4, x + s, y + 4);
    doc.line(x + s * 0.3, y, x + s * 0.3, y + 2);
    doc.line(x + s * 0.7, y, x + s * 0.7, y + 2);
    fill(col);
    doc.rect(x + s * 0.25, y + s * 0.6, 1, 1, 'F');
    doc.rect(x + s * 0.55, y + s * 0.6, 1, 1, 'F');
  }
  // Ikon bulat kecil di judul section
  function sectionIcon(type, cx, cy) {
    fill(C.maroon); doc.circle(cx, cy, 4.2, 'F');
    fill(C.white); stroke(C.white); doc.setLineWidth(0.5);
    if (type === 'person') {
      doc.circle(cx, cy - 1.3, 1.1, 'F');
      doc.ellipse(cx, cy + 2.1, 2, 1.2, 'F');
    } else if (type === 'bars') {
      doc.rect(cx - 2.1, cy, 1.1, 2.2, 'F');
      doc.rect(cx - 0.55, cy - 1.6, 1.1, 3.8, 'F');
      doc.rect(cx + 1, cy - 0.7, 1.1, 2.9, 'F');
    } else if (type === 'calendar') {
      doc.roundedRect(cx - 2.2, cy - 1.8, 4.4, 4, 0.5, 0.5, 'S');
      doc.line(cx - 2.2, cy - 0.5, cx + 2.2, cy - 0.5);
      doc.line(cx - 1, cy - 2.6, cx - 1, cy - 1.2);
      doc.line(cx + 1, cy - 2.6, cx + 1, cy - 1.2);
    } else if (type === 'cap') {
      doc.lines([[3.2, 1.5], [-3.2, 1.5], [-3.2, -1.5]], cx, cy - 2.2, [1, 1], 'F', true);
      doc.rect(cx - 1.6, cy + 0.3, 3.2, 1.6, 'F');
    }
  }
  // Ikon bulat di kartu KPI
  function kpiIcon(type, cx, cy, col) {
    fill(col); doc.circle(cx, cy, 4.2, 'F');
    stroke(C.white); fill(C.white); doc.setLineWidth(0.5);
    if (type === 'box') {
      doc.rect(cx - 2, cy - 2, 4, 4, 'S');
      doc.line(cx - 2, cy - 0.6, cx + 2, cy - 0.6);
    } else if (type === 'clock') {
      doc.circle(cx, cy, 2.4, 'S');
      doc.line(cx, cy, cx, cy - 1.5);
      doc.line(cx, cy, cx + 1.2, cy + 0.6);
    } else if (type === 'target') {
      doc.circle(cx, cy, 2.5, 'S');
      doc.circle(cx, cy, 1.2, 'S');
      doc.circle(cx, cy, 0.3, 'F');
    } else if (type === 'trophy') {
      doc.lines([[0, 2.2], [-0.6, 1], [-1.2, 0]], cx + 1.6, cy - 2.2, [1, 1], 'S', false);
      doc.lines([[3.2, 0], [0, 2], [-1.1, 1.3], [-1, 0], [-1.1, -1.3]], cx - 1.6, cy - 2.2, [1, 1], 'S', true);
      doc.line(cx, cy + 1.1, cx, cy + 1.9);
      doc.line(cx - 1.2, cy + 1.9, cx + 1.2, cy + 1.9);
    }
  }
  function sectionTitle(text, type, y) {
    sectionIcon(type, 18.2, y - 1.4);
    font('bold', 12.5); color(C.navy);
    doc.text(text, 24.5, y);
    const w = doc.getTextWidth(text);
    stroke(C.line); doc.setLineWidth(0.3);
    doc.line(24.5 + w + 3, y - 1.4, 196, y - 1.4);
  }

  // ---------- 1. HEADER ----------
  fill(C.maroon); doc.rect(0, 0, 210, 32, 'F');
  fill(C.maroonDark); doc.rect(0, 30.6, 210, 1.4, 'F');
  iconShield(14, 8.5, 15, C.white);
  stroke([255, 255, 255]); doc.setLineWidth(0.4); doc.line(34, 8.5, 34, 23.5);

  color(C.white);
  font('bold', 17); doc.text('OPERATOR PERFORMANCE SLIP', 39, 16);
  font('normal', 9.5); doc.text('Palangka Raya DC  \u00B7  Internal Rapor Digital', 39, 23);

  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  font('bold', 11);
  const dateW = doc.getTextWidth(todayStr);
  font('normal', 8);
  const lblW = doc.getTextWidth('Tanggal Cetak:');
  const blockW = Math.max(dateW, lblW);
  const bx = 196 - blockW;
  iconCalendar(bx - 10, 9.5, 7, C.white);
  color(C.white);
  font('normal', 8); doc.text('Tanggal Cetak:', 196 - lblW, 14.5);
  font('bold', 11); doc.text(todayStr, 196 - dateW, 21.5);

  // ---------- 2. PROFIL OPERATOR ----------
  sectionTitle('PROFIL OPERATOR', 'person', 46);
  const profileRows = [
    // [kolom, baris, label, value]
    [0, 0, 'Nama Operator', String(staff.name || '-')],
    [0, 2, 'Status Kerja', String(staff.status || '-')],
    [1, 0, 'Ops ID', String(staff.opsId || '-')],
    [1, 1, 'Agency', String(staff.agency || '-')],
    [1, 2, 'Daily Target', `${threshold.toLocaleString('id-ID')} pcs/hari`]
  ];
  profileRows.forEach(([col, row, label, value]) => {
    const y = 57 + row * 7.5;
    const lx = col === 0 ? 14 : 112;
    const cx = col === 0 ? 45 : 134;
    const vx = col === 0 ? 50 : 139;
    font('normal', 9.5); color(C.grey); doc.text(label, lx, y);
    doc.text(':', cx, y);
    const maxW = (col === 0 ? 108 : 196) - vx - 2;
    fitText(value, 'bold', 9.5, 7, maxW); color(C.navy);
    doc.text(value, vx, y);
  });

  // ---------- 3. RINGKASAN PERFORMA (4 KARTU KPI) ----------
  sectionTitle('RINGKASAN PERFORMA BULAN INI', 'bars', 88);
  const rateColor = achRatePct >= 80 ? C.green : (achRatePct >= 50 ? C.amber : C.red);
  const streakBad = staff.underStreak >= 3;
  const kpis = [
    { icon: 'box', iconCol: C.maroon, label: 'TOTAL BAGGING', value: `${staff.total.toLocaleString('id-ID')} pcs`, valCol: C.maroon },
    { icon: 'clock', iconCol: [90, 105, 130], label: 'RATA-RATA / HARI', value: `${staff.avg.toLocaleString('id-ID')} pcs`, valCol: C.navy },
    { icon: 'target', iconCol: rateColor, label: 'ACHIEVEMENT RATE', value: `${achRatePct}% (${staff.achievedDays}/${staff.days} Hari)`, valCol: rateColor },
    { icon: 'trophy', iconCol: [100, 112, 135], label: 'UNDER-STREAK', value: `${staff.underStreak} Hari`, valCol: streakBad ? C.red : C.navy }
  ];
  const cardW = 42.5, cardGap = 4, cardY = 95, cardH = 30;
  kpis.forEach((k, i) => {
    const x = 14 + i * (cardW + cardGap);
    fill(C.card); stroke([228, 233, 242]); doc.setLineWidth(0.2);
    doc.roundedRect(x, cardY, cardW, cardH, 2.5, 2.5, 'FD');
    kpiIcon(k.icon, x + 8, cardY + 8.5, k.iconCol);
    fitText(k.label, 'bold', 7, 5.5, cardW - 16.5); color(C.navy);
    doc.text(k.label, x + 14, cardY + 9.4);
    fitText(k.value, 'bold', 14, 8, cardW - 8); color(k.valCol);
    doc.text(k.value, x + 4.5, cardY + 22.5);
  });

  // ---------- 4. TABEL PRODUKTIVITAS HARIAN ----------
  sectionTitle('RINCIAN PRODUKTIVITAS HARIAN', 'calendar', 138);

  const dateKeys = Object.keys(pbMonthlyRecords).filter(d => {
    const rec = pbMonthlyRecords[d][currentDetailOpsId];
    if (!rec) return false;
    const stInfo = rec.statusInfo || 'Normal / Bekerja';
    return stInfo === 'Normal / Bekerja';
  }).sort();
  const tableRows = dateKeys.map(d => {
    const rec = pbMonthlyRecords[d][currentDetailOpsId];
    const packed = rec.packed || 0;
    const stInfo = rec.statusInfo || 'Normal / Bekerja';
    const avgJam = (packed / 8).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const isAch = packed >= threshold;
    return [formatTanggalId(d), stInfo, `${packed.toLocaleString('id-ID')} pcs`, `${avgJam} pcs/jam`, isAch ? 'ACHIEVED' : 'NOT ACHIEVED'];
  });

  doc.autoTable({
    startY: 145,
    margin: { left: 14, right: 14, top: 18, bottom: 20 },
    head: [['Tanggal', 'Status/Keterangan', 'Volume Packed', 'Rata-rata/Jam', 'Status Target']],
    body: tableRows,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 3.4, bottom: 3.4, left: 4, right: 4 }, textColor: C.navy, lineColor: [226, 232, 240], lineWidth: 0.2, valign: 'middle' },
    headStyles: { fillColor: C.maroon, textColor: C.white, fontStyle: 'bold', halign: 'center', lineColor: C.maroon },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: {
      0: { halign: 'left', cellWidth: 30 },
      1: { halign: 'left', cellWidth: 48 },
      2: { halign: 'center', cellWidth: 36 },
      3: { halign: 'center', cellWidth: 36 },
      4: { halign: 'center', cellWidth: 32 }
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 4) data.cell.text = [''];
    },
    didDrawCell: function (data) {
      if (data.section !== 'body' || data.column.index !== 4) return;
      const achieved = data.row.raw[4] === 'ACHIEVED';
      const pillW = achieved ? 21 : 27, pillH = 5.4;
      const px = data.cell.x + (data.cell.width - pillW) / 2;
      const py = data.cell.y + (data.cell.height - pillH) / 2;
      fill(achieved ? C.green : C.red);
      doc.roundedRect(px, py, pillW, pillH, 2.7, 2.7, 'F');
      fill(C.white); doc.circle(px + 3.4, py + pillH / 2, 1.7, 'F');
      if (achieved) check(px + 3.4, py + pillH / 2 - 0.15, 0.8, C.green, 0.35);
      else { stroke(C.red); doc.setLineWidth(0.35); doc.line(px + 2.7, py + 2, px + 4.1, py + 3.4); doc.line(px + 4.1, py + 2, px + 2.7, py + 3.4); }
      font('bold', 6.5); color(C.white);
      doc.text(achieved ? 'ACHIEVED' : 'NOT ACHIEVED', px + 6.2 + (pillW - 6.2) / 2 - 0.3, py + pillH / 2 + 0.9, { align: 'center' });
    }
  });

  // ---------- 5. EVALUASI & COACHING (PANEL KHUSUS) ----------
  let y = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 12 : 190;

  let tier, headline, recText;
  if (achRatePct >= 80) {
    tier = { bg: [236, 247, 242], border: [196, 230, 212], accent: [22, 150, 90], icon: 'check' };
    headline = 'Performa Sangat Baik! Operator menunjukkan konsistensi tinggi di atas target harian.';
    recText = 'Pertahankan ritme kerja, siap direkomendasikan untuk pembaharuan kontrak / peran Senior Operator.';
  } else if (achRatePct >= 50) {
    tier = { bg: [255, 247, 230], border: [250, 226, 172], accent: [200, 110, 5], icon: 'dash' };
    headline = 'Performa Cukup Baik, namun masih ada fluktuasi produktivitas pada beberapa hari kerja.';
    recText = 'Lakukan monitoring rutin harian dan coaching ringan untuk menjaga konsistensi pacing.';
  } else {
    tier = { bg: [254, 236, 240], border: [250, 200, 212], accent: [200, 30, 60], icon: 'warn' };
    headline = 'PERINGATAN (RED FLAG): Performa berada di bawah 50% target harian atau mengalami streak under target.';
    recText = 'Wajib 1-on-1 coaching, identifikasi kendala teknis/fisik di lapangan, dan buat action plan perbaikan 1 minggu.';
  }

  const textX = 36, textMaxW = 196 - textX - 6, lineH = 4.8;
  font('bold', 9.5);
  const headLines = doc.splitTextToSize(headline, textMaxW);

  // Susun baris "Rekomendasi:" (label bold + isi normal, wrap manual)
  font('bold', 9); const recLabel = 'Rekomendasi: ';
  const recLabelW = doc.getTextWidth(recLabel);
  font('normal', 9);
  const recLines = [];
  let cur = '', avail = textMaxW - recLabelW;
  recText.split(' ').forEach(w => {
    const test = cur ? cur + ' ' + w : w;
    if (doc.getTextWidth(test) > avail && cur) { recLines.push(cur); cur = w; avail = textMaxW; }
    else cur = test;
  });
  if (cur) recLines.push(cur);

  const panelH = 8 + headLines.length * lineH + 1.5 + recLines.length * lineH + 5;
  const sigNeed = 38;
  if (y + 14 + panelH + 14 + sigNeed > 282) { doc.addPage(); y = 22; }

  sectionTitle('EVALUASI & REKOMENDASI COACHING', 'cap', y);
  const py0 = y + 6;
  fill(tier.bg); stroke(tier.border); doc.setLineWidth(0.3);
  doc.roundedRect(14, py0, 182, panelH, 2.5, 2.5, 'FD');

  const icx = 24.5, icy = py0 + panelH / 2;
  fill(tier.accent); doc.circle(icx, icy, 5, 'F');
  if (tier.icon === 'check') check(icx, icy - 0.2, 2.1, C.white, 0.9);
  else if (tier.icon === 'dash') { stroke(C.white); doc.setLineWidth(0.9); doc.line(icx - 2, icy, icx + 2, icy); }
  else { stroke(C.white); doc.setLineWidth(0.9); doc.line(icx, icy - 2.4, icx, icy + 0.6); fill(C.white); doc.circle(icx, icy + 2, 0.55, 'F'); }

  let ty = py0 + 7.5;
  font('bold', 9.5); color(tier.accent);
  headLines.forEach(l => { doc.text(l, textX, ty); ty += lineH; });
  ty += 1.5;
  recLines.forEach((l, i) => {
    color(C.navy);
    if (i === 0) {
      font('bold', 9); doc.text(recLabel, textX, ty);
      font('normal', 9); doc.text(l, textX + recLabelW, ty);
    } else {
      font('normal', 9); doc.text(l, textX, ty);
    }
    ty += lineH;
  });

  // ---------- 6. AREA TANDA TANGAN ----------
  let sy = py0 + panelH + 14;
  font('bold', 9.5); color(C.navy);
  doc.text('Disiapkan Oleh,', 14, sy);
  doc.text('Disetujui Oleh,', 140, sy);
  stroke([120, 135, 165]); doc.setLineWidth(0.4);
  doc.line(14, sy + 20, 76, sy + 20);
  doc.line(140, sy + 20, 196, sy + 20);
  font('normal', 9); color(C.grey);
  doc.text('Team Leader / Supervisor', 14, sy + 26);
  doc.text('DC Area Manager', 140, sy + 26);

  // ---------- 7. FOOTER (semua halaman) ----------
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    stroke(C.line); doc.setLineWidth(0.3); doc.line(14, 287, 196, 287);
    font('normal', 7.5); color([140, 150, 170]);
    doc.text('Palangka Raya DC  \u00B7  Dokumen Internal', 105, 291.5, { align: 'center' });
    if (totalPages > 1) doc.text(`Hal. ${p}/${totalPages}`, 196, 291.5, { align: 'right' });
  }

  doc.save(`Performance_Slip_${staff.opsId}_${staff.name.replace(/\s+/g, '_')}.pdf`);
}

function closePbDetail() { 
  const modal = document.getElementById('pbDetailModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
  currentDetailOpsId = null;
}

