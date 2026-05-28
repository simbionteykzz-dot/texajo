import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoPdf from '../assets/branding/logo-pdf.png';

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportRowsToXlsx(
  rows: Record<string, unknown>[],
  fileName: string,
  sheetName = 'Registros',
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

const BRAND_DARK = [26, 26, 26] as [number, number, number];
const BRAND_LIGHT = [244, 242, 238] as [number, number, number];
const BRAND_MID = [229, 226, 218] as [number, number, number];

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, pageW, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MODULO TEXAJO', 10, 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Sistema de Gestión Textil', 10, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), pageW / 2, 9, { align: 'center' });

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(subtitle, pageW / 2, 14, { align: 'center' });
  }

  const dateStr = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.setFontSize(7);
  doc.text(dateStr, pageW - 10, 12, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  return 22;
}

function addFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND_MID);
    doc.rect(0, pageH - 8, pageW, 8, 'F');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento generado por el sistema Modulo Texajo', 10, pageH - 3);
    doc.text(`Pág. ${i} / ${totalPages}`, pageW - 10, pageH - 3, { align: 'right' });
  }
}

// ─── Tabla genérica PDF ───────────────────────────────────────────────────────

export interface PdfTableOptions {
  title: string;
  subtitle?: string;
  fileName: string;
  columns: { header: string; dataKey: string }[];
  rows: Record<string, unknown>[];
  orientation?: 'portrait' | 'landscape';
  /** Columnas que se alinean a la derecha */
  rightCols?: string[];
  /** Columnas que se alinean al centro */
  centerCols?: string[];
}

export function exportTableToPdf({
  title,
  subtitle,
  fileName,
  columns,
  rows,
  orientation = 'landscape',
  rightCols = [],
  centerCols = [],
}: PdfTableOptions) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const startY = addHeader(doc, title, subtitle);

  const colStyles: Record<string, { halign: 'left' | 'center' | 'right' }> = {};
  columns.forEach(col => {
    if (rightCols.includes(col.dataKey)) colStyles[col.dataKey] = { halign: 'right' };
    else if (centerCols.includes(col.dataKey)) colStyles[col.dataKey] = { halign: 'center' };
  });

  autoTable(doc, {
    startY,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => r[c.dataKey] ?? '')),
    theme: 'grid',
    headStyles: {
      fillColor: BRAND_DARK,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [26, 26, 26],
    },
    alternateRowStyles: {
      fillColor: BRAND_LIGHT,
    },
    columnStyles: colStyles,
    margin: { top: startY, left: 10, right: 10, bottom: 12 },
    didDrawPage: () => {
      addHeader(doc, title, subtitle);
    },
  });

  addFooter(doc);
  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

// ─── Boleta de destajo PDF ────────────────────────────────────────────────────

export interface BoletaPdfData {
  docId: string;
  emitido: string;
  periodoLabel: string;
  operarioNombre: string;
  operarioCodigo: string;
  operarioDni?: string;
  modulo: string;
  fechaIngreso: string;
  estado: string;
  totalesCortes: number;
  totalesOperaciones: number;
  totalesPrendas: number;
  totalesPendiente: number;
  totalesImporte: number;
  lineas: {
    fecha: string;
    nCorte: string;
    estadoCorte: string;
    cliente: string;
    producto: string;
    color: string;
    operacion: string;
    orden: number;
    cantS: number;
    cantM: number;
    cantL: number;
    cantXL: number;
    totalPrendas: number;
    estadoPago: string;
    tarifa: number;
    importe: number;
  }[];
}

function fSoles(n: number) {
  return `S/. ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Paleta Texajo
const G_DARK   = [23,  58,  37]  as [number, number, number]; // #173A25 verde oscuro
const G_MID    = [37,  80,  54]  as [number, number, number]; // verde medio para sidebar
const G_TEXT   = [140, 185, 155] as [number, number, number]; // texto verde claro
const CREAM    = [245, 242, 234] as [number, number, number]; // #F5F2EA
const COPPER   = [184, 155,  94] as [number, number, number]; // #B89B5E
const INK      = [26,  26,  26]  as [number, number, number]; // #1A1A1A
const MUTED    = [122, 111, 103] as [number, number, number]; // #7A6F67
const BORDER   = [221, 216, 207] as [number, number, number]; // #DDD8CF
const PALE     = [250, 248, 244] as [number, number, number]; // fila alterna

// ──────────────────────────────────────────────────────────────────────────────
// Header de boleta
// Layout: [LOGO CARD blanco | banda verde con título + doc info]
// El logo tiene fondo blanco — lo usamos como una "tarjeta" intencionalmente.
// ──────────────────────────────────────────────────────────────────────────────
function boletaHeader(doc: jsPDF, data: BoletaPdfData, pageW: number) {
  // El logo tiene fondo blanco — todo el header es blanco para que case perfectamente
  const H      = 40;
  const LOGO_W = 48;
  const LOGO_H = 30;
  const LOGO_X = 10;
  const LOGO_Y = (H - LOGO_H) / 2;

  // ── Fondo blanco completo ──
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, H, 'F');

  // ── Logo (encaja perfectamente sobre blanco) ──
  doc.addImage(logoPdf, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H);

  // ── Separador vertical cobre tras el logo ──
  const divX = LOGO_X + LOGO_W + 8;
  doc.setDrawColor(...COPPER);
  doc.setLineWidth(0.6);
  doc.line(divX, 6, divX, H - 6);
  doc.setLineWidth(0.2);

  // ── Textos del documento (sobre blanco → colores oscuros) ──
  const tx = divX + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...MUTED);
  doc.text('SISTEMA DE GESTIÓN TEXTIL  ·  MÓDULO TEXAJO', tx, 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...G_DARK);
  doc.text('BOLETA DE DESTAJO', tx, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COPPER);
  doc.text('Liquidación de pago por destajo', tx, 31);

  // ── Bloque N°/Fecha/Período (derecha) ──
  const rx = pageW - 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...G_DARK);
  doc.text(data.docId, rx, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(`Emitido: ${data.emitido}`, rx, 20, { align: 'right' });
  doc.text(`Período: ${data.periodoLabel}`, rx, 28, { align: 'right' });

  // ── Línea inferior cobre (separa header del cuerpo) ──
  doc.setDrawColor(...COPPER);
  doc.setLineWidth(1);
  doc.line(0, H, pageW, H);
  // Línea verde más fina encima
  doc.setDrawColor(...G_DARK);
  doc.setLineWidth(0.3);
  doc.line(0, H - 1.5, pageW, H - 1.5);
  doc.setLineWidth(0.2);

  doc.setTextColor(0, 0, 0);
}

export function exportBoletaToPdf(data: BoletaPdfData) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();   // 210 mm
  const pageH  = doc.internal.pageSize.getHeight();  // 297 mm
  const L      = 12;   // margen izquierdo
  const R      = pageW - 12; // margen derecho
  const W      = R - L;     // ancho útil (186 mm)
  const HEADER_H = 40;
  const FOOTER_H = 9;

  boletaHeader(doc, data, pageW);

  // ══════════════════════════════════════════════════════════
  // SECCIÓN OPERARIO
  // ══════════════════════════════════════════════════════════
  let y = HEADER_H + 5;

  // ── Info trabajador (izquierda, cream) ──
  const INFO_W  = W * 0.56;
  const INFO_H  = 32;

  // Acento verde izquierdo
  doc.setFillColor(...G_DARK);
  doc.rect(L, y, 3, INFO_H, 'F');

  doc.setFillColor(...CREAM);
  doc.setDrawColor(...BORDER);
  doc.rect(L + 3, y, INFO_W - 3, INFO_H, 'FD');

  // Etiqueta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...MUTED);
  doc.text('TRABAJADOR', L + 8, y + 6);

  // Nombre grande
  const nombreFit = doc.splitTextToSize(data.operarioNombre.toUpperCase(), INFO_W - 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(nombreFit[0], L + 8, y + 16);

  // Código
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`Cód. ${data.operarioCodigo}`, L + 8, y + 23);

  // Badge de estado
  const estadoColor = data.estado.toUpperCase().includes('ACTIV') ? G_DARK : [120, 40, 20] as [number,number,number];
  doc.setFillColor(...estadoColor);
  doc.roundedRect(L + 8, y + 25.5, 22, 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(255, 255, 255);
  doc.text(data.estado.toUpperCase(), L + 19, y + 28.5, { align: 'center' });

  // ── 4 Stats (derecha) ──
  const STATS_X  = L + INFO_W;
  const STAT_W   = (W - INFO_W) / 4;
  const STAT_H   = INFO_H;

  const stats = [
    { label: 'Cortes',      value: String(data.totalesCortes),      accent: false, dark: false },
    { label: 'Operaciones', value: String(data.totalesOperaciones), accent: false, dark: false },
    { label: 'Prendas',     value: String(data.totalesPrendas),     accent: false, dark: false },
    { label: 'Pendiente',   value: fSoles(data.totalesPendiente),   accent: false, dark: true  },
  ];

  stats.forEach((s, i) => {
    const sx = STATS_X + i * STAT_W;
    if (s.dark) {
      doc.setFillColor(...G_DARK);
      doc.rect(sx, y, STAT_W, STAT_H, 'F');
      // Línea superior cobre
      doc.setDrawColor(...COPPER);
      doc.setLineWidth(1);
      doc.line(sx, y, sx + STAT_W, y);
      doc.setLineWidth(0.2);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.rect(sx, y, STAT_W, STAT_H, 'FD');
    }

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(s.dark ? G_TEXT[0] : MUTED[0], s.dark ? G_TEXT[1] : MUTED[1], s.dark ? G_TEXT[2] : MUTED[2]);
    doc.text(s.label.toUpperCase(), sx + STAT_W / 2, y + 8, { align: 'center' });

    // Valor
    const isMonetary = s.value.startsWith('S/.');
    const valFontSize = isMonetary ? 8 : 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(valFontSize);
    doc.setTextColor(s.dark ? 245 : INK[0], s.dark ? 242 : INK[1], s.dark ? 234 : INK[2]);
    const valLines = doc.splitTextToSize(s.value, STAT_W - 3);
    const valY = isMonetary ? y + 18 : y + 21;
    doc.text(valLines, sx + STAT_W / 2, valY, { align: 'center' });
  });

  y += STAT_H + 7;

  // ══════════════════════════════════════════════════════════
  // LÍNEA SEPARADORA DECORATIVA
  // ══════════════════════════════════════════════════════════
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(L, y, R, y);
  // Acento cobre
  doc.setDrawColor(...COPPER);
  doc.setLineWidth(0.8);
  doc.line(L, y, L + 20, y);
  doc.setLineWidth(0.2);

  y += 5;

  // ══════════════════════════════════════════════════════════
  // TABLA DE LÍNEAS
  // ══════════════════════════════════════════════════════════
  const pendCount = data.lineas.filter(l => l.estadoPago === 'PENDIENTE').length;

  autoTable(doc, {
    startY: y,
    head: [[
      'N° Corte', 'Producto', 'Operación', 'Prendas', 'Estado pago', 'Tarifa', 'Importe',
    ]],
    body: data.lineas.map(ln => [
      ln.nCorte,
      ln.producto,
      `${ln.orden}. ${ln.operacion}`,
      ln.totalPrendas,
      ln.estadoPago,
      `S/. ${ln.tarifa.toFixed(3)}`,
      fSoles(ln.importe),
    ]),
    foot: data.lineas.length > 0 ? [[
      { content: 'TOTAL PERÍODO', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 7 } },
      { content: String(data.totalesPrendas), styles: { halign: 'center', fontStyle: 'bold', fontSize: 8 } },
      { content: `${pendCount} pendiente${pendCount !== 1 ? 's' : ''}`, styles: { halign: 'center', fontSize: 6.5, textColor: [146, 64, 14] as [number,number,number] } },
      { content: '—', styles: { halign: 'right', textColor: MUTED } },
      { content: fSoles(data.totalesImporte), styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 } },
    ]] : undefined,
    theme: 'plain',
    headStyles: {
      fillColor: G_DARK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      lineWidth: 0,
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 },
      textColor: INK,
      lineColor: BORDER,
      lineWidth: { bottom: 0.2, top: 0, left: 0, right: 0 },
    },
    alternateRowStyles: { fillColor: PALE },
    footStyles: {
      fillColor: CREAM,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      lineColor: BORDER,
      lineWidth: { top: 0.6, bottom: 0, left: 0, right: 0 },
      textColor: INK,
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', textColor: INK },
      1: { cellWidth: 'auto', textColor: MUTED },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 22, halign: 'right', textColor: MUTED },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { top: HEADER_H + 5, left: L, right: 12, bottom: FOOTER_H + 4 },
    didDrawPage: () => {
      boletaHeader(doc, data, pageW);
    },
  });

  // ══════════════════════════════════════════════════════════
  // RESUMEN FINANCIERO
  // ══════════════════════════════════════════════════════════
  const totalBruto = data.totalesImporte;
  const descuento  = totalBruto * 0.01;
  const totalNeto  = totalBruto - descuento;

  let fy = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  const BOX_W = 95;
  const BOX_X = R - BOX_W;
  const ROW_H = 9;

  // Fila Bruto
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.rect(BOX_X, fy, BOX_W, ROW_H, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('BRUTO', BOX_X + 5, fy + ROW_H / 2 + 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(fSoles(totalBruto), R - 5, fy + ROW_H / 2 + 1.5, { align: 'right' });
  fy += ROW_H;

  // Fila Descuento
  doc.setFillColor(255, 249, 245);
  doc.rect(BOX_X, fy, BOX_W, ROW_H, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(196, 72, 18);
  doc.text('DESC. 1%', BOX_X + 5, fy + ROW_H / 2 + 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(196, 72, 18);
  doc.text(`-${fSoles(descuento)}`, R - 5, fy + ROW_H / 2 + 1.5, { align: 'right' });
  fy += ROW_H;

  // Fila Neto — verde oscuro, tipografía grande
  const NETO_H = 12;
  doc.setFillColor(...G_DARK);
  doc.rect(BOX_X, fy, BOX_W, NETO_H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...G_TEXT);
  doc.text('NETO A PAGAR', BOX_X + 5, fy + NETO_H / 2 + 1.5);
  doc.setFontSize(10);
  doc.setTextColor(...CREAM);
  doc.text(fSoles(totalNeto), R - 5, fy + NETO_H / 2 + 2, { align: 'right' });
  fy += NETO_H + 8;

  // ══════════════════════════════════════════════════════════
  // FIRMAS
  // ══════════════════════════════════════════════════════════
  if (fy + 26 < pageH - FOOTER_H - 4) {
    const FIR_H = 26;
    doc.setFillColor(...CREAM);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.rect(L, fy, W, FIR_H, 'FD');

    // Línea acento cobre arriba
    doc.setDrawColor(...COPPER);
    doc.setLineWidth(0.8);
    doc.line(L, fy, L + 30, fy);
    doc.setLineWidth(0.2);

    const half = W / 2;

    // Firma izquierda
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text('FIRMA TRABAJADOR', L + 6, fy + 6);
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.4);
    doc.line(L + 6, fy + 19, L + half - 8, fy + 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(data.operarioNombre, L + 6, fy + 24);

    // Firma derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text('FIRMA / VISTO BUENO GERENCIA', L + half + 6, fy + 6);
    doc.line(L + half + 6, fy + 19, R - 6, fy + 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Modulo Texajo — Gerencia', L + half + 6, fy + 24);

    fy += FIR_H + 4;
  }

  // ══════════════════════════════════════════════════════════
  // FOOTER en todas las páginas
  // ══════════════════════════════════════════════════════════
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Banda inferior verde medio
    doc.setFillColor(...G_DARK);
    doc.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, 'F');
    // Línea acento cobre
    doc.setDrawColor(...COPPER);
    doc.setLineWidth(0.5);
    doc.line(0, pageH - FOOTER_H, 25, pageH - FOOTER_H);
    doc.setLineWidth(0.2);
    // Texto
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...G_TEXT);
    doc.text('Documento generado por Modulo Texajo · Los montos corresponden a destajo según cortes registrados', L, pageH - 3);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pág. ${i} / ${totalPages}`, R, pageH - 3, { align: 'right' });
  }

  doc.save(`boleta_${data.operarioCodigo}_${data.docId}.pdf`);
}
