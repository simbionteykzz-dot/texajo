import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerFont } from './fonts';
import type { PdfFont } from './fonts';

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

// Paleta Texajo — versión suavizada para documentos (menos contraste duro que la UI):
// verde profundo pero no negro, cobre atenuado, crema en vez de blanco puro.
const TX_G_DARK  = [42, 74, 54]   as [number, number, number]; // verde suavizado
const TX_G_SOFT  = [232, 238, 233] as [number, number, number]; // verde muy pálido (fondos)
const TX_G_TEXT  = [186, 210, 193] as [number, number, number]; // texto verde claro sobre oscuro
const TX_COPPER  = [176, 148, 104] as [number, number, number]; // cobre atenuado
const TX_INK     = [58, 54, 48]   as [number, number, number]; // casi-negro cálido, no #000
const TX_MUTED   = [140, 130, 120] as [number, number, number];
const TX_CREAM   = [250, 248, 244] as [number, number, number];

// Monograma tipográfico "T" — reemplaza el logo de imagen por algo más discreto y editorial.
function drawMonograma(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(...TX_G_SOFT);
  doc.circle(x + size / 2, y + size / 2, size / 2, 'F');
  doc.setDrawColor(...TX_COPPER);
  doc.setLineWidth(0.35);
  doc.circle(x + size / 2, y + size / 2, size / 2, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(size * 1.55);
  doc.setTextColor(...TX_G_DARK);
  doc.text('T', x + size / 2, y + size / 2 + size * 0.32, { align: 'center' });
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const H = 24;
  const MONO_SIZE = 13;
  const MONO_X = 8;
  const MONO_Y = (H - MONO_SIZE) / 2;

  doc.setFillColor(...TX_CREAM);
  doc.rect(0, 0, pageW, H, 'F');

  drawMonograma(doc, MONO_X, MONO_Y, MONO_SIZE);

  const tx = MONO_X + MONO_SIZE + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...TX_MUTED);
  doc.text('TEXAJO · SISTEMA DE GESTIÓN TEXTIL', tx, 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...TX_G_DARK);
  doc.text(title.toUpperCase(), tx, 16);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...TX_COPPER);
    doc.text(subtitle, tx, 21);
  }

  const dateStr = new Date().toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...TX_MUTED);
  doc.text(dateStr, pageW - 8, H - 5, { align: 'right' });

  // Línea inferior fina, un solo tono cobre — sin la doble línea de alto contraste
  doc.setDrawColor(...TX_COPPER);
  doc.setLineWidth(0.5);
  doc.line(0, H, pageW, H);
  doc.setLineWidth(0.2);

  doc.setTextColor(0, 0, 0);
  return H + 4;
}

function addFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const H = 8;
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...TX_G_SOFT);
    doc.rect(0, pageH - H, pageW, H, 'F');
    doc.setDrawColor(...TX_COPPER);
    doc.setLineWidth(0.4);
    doc.line(0, pageH - H, pageW, pageH - H);
    doc.setLineWidth(0.2);
    doc.setTextColor(...TX_MUTED);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento generado por el sistema Texajo', 8, pageH - 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TX_G_DARK);
    doc.text(`Pág. ${i} / ${totalPages}`, pageW - 8, pageH - 3, { align: 'right' });
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
  /** Filas de pie de tabla (se muestran con fondo crema y negrita) */
  footerRows?: Record<string, unknown>[];
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
  footerRows,
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
    foot: footerRows && footerRows.length > 0
      ? footerRows.map(r => columns.map(c => r[c.dataKey] ?? ''))
      : undefined,
    theme: 'grid',
    headStyles: {
      fillColor: TX_G_DARK,
      textColor: TX_CREAM,
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: TX_G_DARK,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: TX_INK,
      lineColor: [225, 221, 213],
    },
    alternateRowStyles: {
      fillColor: TX_CREAM,
    },
    footStyles: {
      fillColor: TX_G_SOFT,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
      textColor: TX_G_DARK,
      lineColor: TX_COPPER,
      lineWidth: { top: 0.5, bottom: 0, left: 0, right: 0 },
    },
    columnStyles: colStyles,
    margin: { top: startY, left: 8, right: 8, bottom: 12 },
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
  /** Suma de descuentos manuales (override del 1% fijo). Si se omite se usa 1% del bruto. */
  descuentoOverride?: number;
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

// Paleta Texajo — misma identidad que la boleta HTML (BoletaOperario.tsx)
const G_DARK   = [23,  58,  37]  as [number, number, number]; // #173A25 verde oscuro (identidad)
const G_DEEP   = [15,  36,  24]  as [number, number, number]; // #0F2418 verde profundo (pie institucional)
const G_TEXT   = [126, 170, 138] as [number, number, number]; // texto verde claro sobre fondo oscuro
const CREAM    = [245, 242, 234] as [number, number, number]; // #F5F2EA
const COPPER   = [184, 155,  94] as [number, number, number]; // #B89B5E — único acento vivo del documento
const INK      = [33,  29,  24]  as [number, number, number]; // negro cálido, no #000 puro
const MUTED    = [138, 127, 116] as [number, number, number]; // gris cálido para labels/secundario
const BORDER   = [220, 213, 198] as [number, number, number]; // filete fino
const PALE     = [250, 248, 244] as [number, number, number]; // fila alterna
const ALERT    = [163,  67,  40] as [number, number, number]; // terracota (descuentos/merma)
const AMBER    = [138,  90,  30] as [number, number, number]; // ámbar oscuro (pendiente)

// ──────────────────────────────────────────────────────────────────────────────
// Header de boleta — "sello" tipográfico circular + identidad institucional.
// Composición idéntica en espíritu al header HTML de BoletaOperario.tsx:
// sello a la izquierda, título Playfair al centro-izquierda, doc/fecha a la derecha,
// filete cobre como cierre inferior del header.
// ──────────────────────────────────────────────────────────────────────────────
function drawMonogramaBoleta(doc: jsPDF, x: number, y: number, size: number) {
  const r = size / 2;
  // Fondo con leve degradado simulado (dos círculos concéntricos, blanco -> crema)
  doc.setFillColor(255, 255, 255);
  doc.circle(x + r, y + r, r, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.circle(x + r, y + r, r - 0.6, 'S');
  doc.setDrawColor(...COPPER);
  doc.setLineWidth(0.55);
  doc.circle(x + r, y + r, r, 'S');
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(size * 1.5);
  doc.setTextColor(...G_DARK);
  doc.text('T', x + r, y + r + size * 0.32, { align: 'center' });
}

function boletaHeader(doc: jsPDF, data: BoletaPdfData, pageW: number) {
  const H       = 34;
  const MONO_S  = 15;
  const MONO_X  = 12;
  const MONO_Y  = (H - MONO_S) / 2 - 1;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, H, 'F');

  drawMonogramaBoleta(doc, MONO_X, MONO_Y, MONO_S);

  const tx = MONO_X + MONO_S + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...COPPER);
  doc.text('TEXAJO  ·  SISTEMA DE GESTIÓN TEXTIL', tx, 10.5);

  doc.setFont('times', 'bold');
  doc.setFontSize(15.5);
  doc.setTextColor(...INK);
  doc.text('Boleta de Destajo', tx, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Liquidación de pago por trabajo a destajo', tx, 25);

  // ── Bloque N°/Fecha/Período (derecha) ──
  const rx = pageW - 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...G_DARK);
  doc.text(data.docId, rx, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  doc.text(`Emitido: ${data.emitido}`, rx, 18, { align: 'right' });
  doc.text(`Período: ${data.periodoLabel}`, rx, 24.5, { align: 'right' });

  // ── Cierre del header: filete fino gris + acento cobre corto ──
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(0, H, pageW, H);
  doc.setDrawColor(...COPPER);
  doc.setLineWidth(0.9);
  doc.line(0, H, 26, H);
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
  const HEADER_H = 36;
  const FOOTER_H = 9;

  boletaHeader(doc, data, pageW);

  // ══════════════════════════════════════════════════════════
  // BLOQUE DE IDENTIDAD DEL TRABAJADOR — pieza central del documento.
  // Fondo crema cálido, nombre en Playfair a gran tamaño (protagonismo real),
  // el pendiente de cobro es el único valor tratado con color vivo (ámbar/cobre).
  // ══════════════════════════════════════════════════════════
  let y = HEADER_H + 4;
  const BLOCK_H = 34;

  doc.setFillColor(...CREAM);
  doc.rect(L, y, W, BLOCK_H, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(L, y, W, BLOCK_H, 'S');

  // Etiqueta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(154, 143, 128);
  doc.text('TRABAJADOR', L + 7, y + 8);

  // Nombre — protagonista tipográfico del documento
  const nombreFit = doc.splitTextToSize(data.operarioNombre, W * 0.62);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(19);
  doc.setTextColor(...INK);
  doc.text(nombreFit[0], L + 7, y + 18);

  // Código + badge de estado, en línea
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`Código  ${data.operarioCodigo}`, L + 7, y + 25.5);
  const codigoW = doc.getTextWidth(`Código  ${data.operarioCodigo}`);

  const estadoActivo = data.estado.toUpperCase().includes('ACTIV');
  const estadoColor: [number, number, number] = estadoActivo ? [29, 91, 58] : ALERT;
  const estadoBg: [number, number, number] = estadoActivo ? [231, 240, 229] : [246, 229, 223];
  const badgeX = L + 7 + codigoW + 6;
  const badgeW = 22;
  doc.setFillColor(...estadoBg);
  doc.setDrawColor(...estadoColor);
  doc.setLineWidth(0.25);
  doc.roundedRect(badgeX, y + 22, badgeW, 5, 0.8, 0.8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.3);
  doc.setTextColor(...estadoColor);
  doc.text(data.estado.toUpperCase(), badgeX + badgeW / 2, y + 25.3, { align: 'center' });

  // Pendiente de cobro — bloque derecho, único valor con color vivo
  const pendX = L + W - 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(154, 143, 128);
  doc.text('PENDIENTE DE COBRO', pendX, y + 8, { align: 'right' });
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(16);
  doc.setTextColor(...(data.totalesPendiente > 0 ? AMBER : INK));
  doc.text(fSoles(data.totalesPendiente), pendX, y + 20, { align: 'right' });

  // Filete separador entre identidad y stats
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(L + 7, y + BLOCK_H - 8, L + W - 7, y + BLOCK_H - 8);

  // ── 3 métricas discretas (sin bloques de color, solo tipografía + filetes) ──
  const statsY = y + BLOCK_H - 3;
  const stats = [
    { label: 'Cortes trabajados',        value: String(data.totalesCortes),      align: 'left' as const },
    { label: 'Operaciones registradas',  value: String(data.totalesOperaciones), align: 'center' as const },
    { label: 'Prendas producidas',       value: String(data.totalesPrendas),     align: 'right' as const },
  ];
  const statW = (W - 14) / 3;
  stats.forEach((s, i) => {
    const sx = s.align === 'left' ? L + 7
             : s.align === 'right' ? L + W - 7
             : L + 7 + statW * i + statW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.3);
    doc.setTextColor(154, 143, 128);
    doc.text(s.label.toUpperCase(), sx, statsY, { align: s.align });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...G_DARK);
    doc.text(s.value, sx, statsY + 4.2, { align: s.align });
  });

  y += BLOCK_H + 7;

  // ══════════════════════════════════════════════════════════
  // TÍTULO DE SECCIÓN — TABLA
  // ══════════════════════════════════════════════════════════
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(...G_DARK);
  doc.text('DETALLE DE OPERACIONES LIQUIDADAS', L, y);
  y += 3.5;

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
      { content: `${pendCount} pendiente${pendCount !== 1 ? 's' : ''}`, styles: { halign: 'center', fontSize: 6.5, fontStyle: 'bold', textColor: pendCount > 0 ? AMBER : G_DARK } },
      { content: '—', styles: { halign: 'right', textColor: MUTED } },
      { content: fSoles(data.totalesImporte), styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 } },
    ]] : undefined,
    theme: 'plain',
    headStyles: {
      fillColor: G_DARK,
      textColor: CREAM,
      fontStyle: 'bold',
      fontSize: 6.8,
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
      lineColor: COPPER,
      lineWidth: { top: 0.7, bottom: 0, left: 0, right: 0 },
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
    margin: { top: HEADER_H + 4, left: L, right: 12, bottom: FOOTER_H + 4 },
    didDrawPage: () => {
      boletaHeader(doc, data, pageW);
    },
  });

  // ══════════════════════════════════════════════════════════
  // RESUMEN FINANCIERO
  // ══════════════════════════════════════════════════════════
  const totalBruto      = data.totalesImporte;
  const mermaAmount     = totalBruto * 0.01;
  const descuentosExtra = data.descuentoOverride ?? 0;
  const totalNeto       = totalBruto - mermaAmount - descuentosExtra;

  let fy = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  const BOX_W = 100;
  const BOX_X = R - BOX_W;
  const ROW_H = 8;

  const drawRow = (label: string, valueText: string, color: [number, number, number], bold = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    doc.setTextColor(...color);
    doc.text(label, BOX_X, fy + ROW_H / 2 + 1);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...color);
    doc.text(valueText, R, fy + ROW_H / 2 + 1, { align: 'right' });
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.line(BOX_X, fy + ROW_H, R, fy + ROW_H);
    fy += ROW_H;
  };

  // Fila Bruto
  drawRow('TOTAL BRUTO', fSoles(totalBruto), MUTED);

  // Fila Merma 1%
  drawRow('MERMA (1%)', `− ${fSoles(mermaAmount)}`, ALERT);

  // Fila descuentos manuales (si los hay)
  if (descuentosExtra > 0) drawRow('DESCUENTOS', `− ${fSoles(descuentosExtra)}`, ALERT);

  // Fila Neto — tratada como sello de cierre: doble filete cobre, tipografía serif itálica,
  // sin bloque de color sólido (coherente con el HTML: único acento fuerte reservado a este dato).
  fy += 4;
  const NETO_H = 15;
  doc.setDrawColor(...COPPER);
  doc.setLineWidth(0.8);
  doc.line(BOX_X, fy, R, fy);
  doc.line(BOX_X, fy + NETO_H, R, fy + NETO_H);
  doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...G_DARK);
  doc.text('NETO A PAGAR', BOX_X, fy + NETO_H / 2 + 1.5);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(15);
  doc.setTextColor(...G_DARK);
  doc.text(fSoles(totalNeto), R, fy + NETO_H / 2 + 2.3, { align: 'right' });
  fy += NETO_H + 9;

  // ══════════════════════════════════════════════════════════
  // FIRMAS
  // ══════════════════════════════════════════════════════════
  if (fy + 24 < pageH - FOOTER_H - 4) {
    const FIR_H = 24;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(L, fy, R, fy);

    const half = W / 2;
    const gap  = 10;

    // Firma izquierda
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.35);
    doc.line(L, fy + 16, L + half - gap, fy + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(...MUTED);
    doc.text('FIRMA DEL TRABAJADOR', L, fy + 20.5);
    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    doc.text(data.operarioNombre, L, fy + 24.5);

    // Firma derecha
    doc.line(L + half + gap, fy + 16, R, fy + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(...MUTED);
    doc.text('VISTO BUENO — GERENCIA', L + half + gap, fy + 20.5);
    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    doc.text('Módulo Texajo', L + half + gap, fy + 24.5);

    fy += FIR_H + 8;
  }

  // ══════════════════════════════════════════════════════════
  // FOOTER en todas las páginas — banda verde profunda, coherente con el
  // pie institucional del documento HTML (BoletaOperario.tsx)
  // ══════════════════════════════════════════════════════════
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...G_DEEP);
    doc.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(...G_TEXT);
    doc.text('Documento generado por el sistema Texajo · Los montos corresponden a destajo según cortes registrados', L, pageH - 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COPPER);
    doc.text(`Pág. ${i} / ${totalPages}`, R, pageH - 3, { align: 'right' });
  }

  doc.save(`boleta_${data.operarioCodigo}_${data.docId}.pdf`);
}

// ─── Hoja de Seguimiento por Corte ───────────────────────────────────────────

export interface HojaSeguimientoData {
  nCorte: string;
  producto: string;
  cliente: string;
  fecha: string; // YYYY-MM-DD
  operaciones: string[]; // nombres en orden
  filas: {
    color: string;
    colorHex?: string; // color de fondo para la celda COLOR (ej: "#E91E63")
    talla: string;
    cantidad: number;
    operariosPorOp: string[]; // nombre por cada operación (mismo índice)
  }[];
}

const YELLOW_HDR  = [255, 200,   0] as [number, number, number];
const YELLOW_SOFT = [255, 230, 100] as [number, number, number];
const BLK         = [  0,   0,   0] as [number, number, number];
const GRAY_ALT    = [250, 250, 250] as [number, number, number];

export async function exportHojaSeguimientoPdf(data: HojaSeguimientoData, font: PdfFont = 'oswald') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // 297 mm
  const pageH = doc.internal.pageSize.getHeight(); // 210 mm
  const L = 6, R = pageW - 6;
  const usableW = R - L;

  // Usar helvetica para estética más suave y redondeada
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);

  // Paleta refinada
  const AMBER:    [number,number,number] = [251, 191,  36];
  const AMBER_LT: [number,number,number] = [254, 243, 199];
  const SLATE:    [number,number,number] = [ 71,  85, 105];
  const SLATE_LT: [number,number,number] = [241, 245, 249];
  const WHITE:    [number,number,number] = [255, 255, 255];
  const INK:      [number,number,number] = [ 30,  41,  59];
  const GRAY_ROW: [number,number,number] = [248, 250, 252];

  // ── Helper: celda con borde suave ────────────────────────────────────────
  const rowH  = 6.5;
  const tblHdrH = 8;
  const fontSize = 6;
  const fontMm = fontSize * 0.352;

  const drawCell = (
    x: number, y2: number, w: number, h: number,
    text: string, opts: {
      fill?: [number,number,number],
      textColor?: [number,number,number],
      bold?: boolean,
      italic?: boolean,
      align?: 'left'|'center'|'right',
      fs?: number,
      border?: boolean,
    } = {}
  ) => {
    const fill = opts.fill ?? WHITE;
    doc.setFillColor(...fill);
    doc.setDrawColor(210, 214, 220);
    doc.setLineWidth(0.18);
    if (opts.border === false) {
      doc.rect(x, y2, w, h, 'F');
    } else {
      doc.rect(x, y2, w, h, 'FD');
    }
    if (text) {
      const style = opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal';
      doc.setFont('helvetica', style);
      doc.setFontSize(opts.fs ?? fontSize);
      doc.setTextColor(...(opts.textColor ?? INK));
      const tx = opts.align === 'right' ? x + w - 1.5
               : opts.align === 'center' ? x + w / 2
               : x + 2;
      doc.text(text, tx, y2 + h / 2 + fontMm / 2, { align: opts.align ?? 'left' });
    }
  };

  // ── Helper: dibujar cabecera en cualquier página ──────────────────────────
  const hdrH = 14; // altura total cabecera (2 filas)
  const drawPageHeader = (startY: number) => {
    const hdr1H = 8.5, hdr2H = 5.5;
    const nCorteW = 22, fLabelW = 18, fechaW = 28;
    const midStart = L + nCorteW;
    const midEnd   = R - fLabelW - fechaW;
    const midW     = midEnd - midStart;
    const prodW    = Math.min(100, midW * 0.7);
    const prodX    = midStart + (midW - prodW) / 2;

    const fechaLabel = new Date(data.fecha + 'T00:00:00')
      .toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
      .replace('.', '');

    // Fondo blanco fila 1
    doc.setFillColor(...WHITE);
    doc.rect(L, startY, usableW, hdr1H, 'F');

    // Caja N° — amber redondeada
    doc.setFillColor(...AMBER);
    doc.setDrawColor(209, 157, 20);
    doc.setLineWidth(0.3);
    doc.roundedRect(L, startY, nCorteW, hdr1H, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(...INK);
    doc.text('CORTE N°', L + nCorteW / 2, startY + 2.8, { align: 'center' });
    doc.setFontSize(14);
    doc.text(String(data.nCorte), L + nCorteW / 2, startY + 7.2, { align: 'center' });

    // Caja PRODUCTO — amber redondeada
    doc.setFillColor(...AMBER);
    doc.setDrawColor(209, 157, 20);
    doc.roundedRect(prodX, startY, prodW, hdr1H, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(String(data.producto).toUpperCase(), prodX + prodW / 2, startY + 5.8, { align: 'center' });

    // Caja F.CORTE — slate suave
    doc.setFillColor(...SLATE_LT);
    doc.setDrawColor(200, 210, 220);
    doc.roundedRect(R - fLabelW - fechaW, startY, fLabelW, hdr1H, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...SLATE);
    doc.text('F. CORTE', R - fLabelW - fechaW + fLabelW / 2, startY + 5.2, { align: 'center' });

    // Caja fecha — amber
    doc.setFillColor(...AMBER);
    doc.setDrawColor(209, 157, 20);
    doc.roundedRect(R - fechaW, startY, fechaW, hdr1H, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(fechaLabel, R - fechaW / 2, startY + 6, { align: 'center' });

    // Fila 2: badge cliente
    doc.setFillColor(...WHITE);
    doc.rect(L, startY + hdr1H, usableW, hdr2H, 'F');
    doc.setFillColor(...AMBER_LT);
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.25);
    doc.roundedRect(L, startY + hdr1H, nCorteW + 38, hdr2H, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(...SLATE);
    doc.text('CLIENTE', L + 2, startY + hdr1H + 3.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...INK);
    doc.text(String(data.cliente), L + 16, startY + hdr1H + 3.8);

    return startY + hdr1H + hdr2H + 2;
  };

  // ── Columnas ─────────────────────────────────────────────────────────────
  const spanW = 6, colorW = 24, tallaW = 8, cantW = 10;
  const mermaW = 14, entregadoW = 18;
  const nOps = data.operaciones.length;
  const opW = Math.max(12, (usableW - spanW - colorW - tallaW - cantW - mermaW - entregadoW) / Math.max(nOps, 1));

  const drawTableHeader = (ty: number) => {
    let cx = L;
    const ho = { fill: AMBER, bold: true, align: 'center' as const, fs: 6, textColor: INK };
    drawCell(cx, ty, spanW, tblHdrH, '§', ho); cx += spanW;
    drawCell(cx, ty, colorW, tblHdrH, 'COLOR', ho); cx += colorW;
    drawCell(cx, ty, tallaW, tblHdrH, 'T', ho); cx += tallaW;
    drawCell(cx, ty, cantW, tblHdrH, 'CANT', ho); cx += cantW;
    for (const op of data.operaciones) {
      drawCell(cx, ty, opW, tblHdrH, op, { ...ho, fs: 5.5 }); cx += opW;
    }
    drawCell(cx, ty, mermaW, tblHdrH, 'MERMA', ho); cx += mermaW;
    drawCell(cx, ty, entregadoW, tblHdrH, 'ENTREGADO', ho);
  };

  // ── Agrupar filas por color ──────────────────────────────────────────────
  const grupos: { colorNombre: string; colorHex?: string; filas: typeof data.filas }[] = [];
  for (const f of data.filas) {
    const last = grupos[grupos.length - 1];
    if (last && last.colorNombre === f.color) last.filas.push(f);
    else grupos.push({ colorNombre: f.color, colorHex: f.colorHex, filas: [f] });
  }

  const hexToRgb = (hex: string): [number,number,number] => {
    const h = hex.replace('#', '');
    return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)];
  };
  const isDark = (rgb: [number,number,number]) => (rgb[0]*299 + rgb[1]*587 + rgb[2]*114) / 1000 < 128;

  // ── Paginación ───────────────────────────────────────────────────────────
  const bottomMargin = 6;
  let pageY = drawPageHeader(4);
  let tableStartY = pageY;
  drawTableHeader(tableStartY);
  let rowY = tableStartY + tblHdrH;
  let rowIdx = 0;
  let totalCant = 0;

  const checkPageBreak = (neededH: number) => {
    if (rowY + neededH > pageH - bottomMargin) {
      doc.addPage();
      pageY = drawPageHeader(4);
      tableStartY = pageY;
      drawTableHeader(tableStartY);
      rowY = tableStartY + tblHdrH;
      rowIdx = 0;
    }
  };

  for (const grupo of grupos) {
    const colorRgb: [number,number,number] = grupo.colorHex ? hexToRgb(grupo.colorHex) : [180,190,200];
    const textColor: [number,number,number] = isDark(colorRgb) ? WHITE : INK;
    const spanH = rowH * grupo.filas.length;
    const totalGrupo = grupo.filas.reduce((s, f) => s + f.cantidad, 0);

    // Si todo el grupo no cabe en la página y es pequeño, saltar de página
    if (grupo.filas.length <= 6 && rowY + spanH > pageH - bottomMargin) {
      doc.addPage();
      pageY = drawPageHeader(4);
      tableStartY = pageY;
      drawTableHeader(tableStartY);
      rowY = tableStartY + tblHdrH;
      rowIdx = 0;
    }

    const groupStartY = rowY;

    for (let fi = 0; fi < grupo.filas.length; fi++) {
      checkPageBreak(rowH);
      const fila = grupo.filas[fi];
      const altFill: [number,number,number] = rowIdx % 2 === 0 ? WHITE : GRAY_ROW;
      let cx = L + spanW + colorW;

      // Columnas de la fila (talla, cant, ops, merma, entregado)
      drawCell(cx, rowY, tallaW, rowH, fila.talla, { fill: altFill, align: 'center', bold: true, fs: 6.5 }); cx += tallaW;
      drawCell(cx, rowY, cantW, rowH, String(fila.cantidad), { fill: altFill, align: 'center', fs: 6 }); cx += cantW;
      totalCant += fila.cantidad;
      for (const opNombre of fila.operariosPorOp) {
        drawCell(cx, rowY, opW, rowH, opNombre, { fill: altFill, align: 'center', fs: 5.5 }); cx += opW;
      }
      drawCell(cx, rowY, mermaW, rowH, '', { fill: altFill }); cx += mermaW;
      drawCell(cx, rowY, entregadoW, rowH, '', { fill: altFill });

      rowY += rowH;
      rowIdx++;
    }

    // Celda § y COLOR sobre el grupo completo (dibujadas después para no ser tapadas)
    const actualSpanH = rowY - groupStartY;
    drawCell(L, groupStartY, spanW, actualSpanH, String(totalGrupo), {
      fill: SLATE_LT, bold: true, align: 'center', fs: 5.5, textColor: SLATE,
    });
    drawCell(L + spanW, groupStartY, colorW, actualSpanH, grupo.colorNombre, {
      fill: colorRgb, textColor, bold: true, align: 'center', fs: fontSize,
    });
  }

  // Fila TOTAL
  checkPageBreak(rowH + 2);
  let cx = L;
  drawCell(cx, rowY, spanW, rowH, '', { fill: AMBER_LT }); cx += spanW;
  drawCell(cx, rowY, colorW + tallaW, rowH, 'TOTAL', { fill: AMBER_LT, bold: true, align: 'center', fs: 7, textColor: INK }); cx += colorW + tallaW;
  drawCell(cx, rowY, cantW, rowH, String(totalCant), { fill: AMBER, bold: true, align: 'center', fs: 7, textColor: INK }); cx += cantW;
  for (let i = 0; i < nOps; i++) { drawCell(cx, rowY, opW, rowH, '', { fill: AMBER_LT }); cx += opW; }
  drawCell(cx, rowY, mermaW, rowH, '', { fill: AMBER_LT }); cx += mermaW;
  drawCell(cx, rowY, entregadoW, rowH, '', { fill: AMBER_LT });

  doc.save(`hoja_seguimiento_${data.nCorte}_${data.fecha}.pdf`);
}

// ─── Reporte de Corte (formulario físico) ────────────────────────────────────

export interface ReporteCorteData {
  nCorte: string;
  fecha: string;       // YYYY-MM-DD
  horaInicio?: string; // ISO timestamp del inicio del corte físico
  horaFin?: string;    // ISO timestamp de finalización del corte físico
  tela: string;
  producto: string;
  cortador: string;
  ayudante: string;
  tendedor: string;
  ancho: number;       // metros
  mtsPorTendida: number;
  propS?: number;
  propM?: number;
  propL?: number;
  propXL?: number;
  colores: {
    nombre: string;
    kgUsados: number;
    rollosUsados: number;
    tendidas: number;
    cantS: number;
    cantM: number;
    cantL: number;
    cantXL: number;
  }[];
}

function _dibujarReporteCorte(doc: jsPDF, data: ReporteCorteData) {
  const pageW = doc.internal.pageSize.getWidth(); // 210
  const L = 12, R = pageW - 12;
  const W = R - L;

  const BLK: [number,number,number] = [0, 0, 0];
  const LIGHT: [number,number,number] = [245, 245, 245];
  const MID: [number,number,number] = [200, 200, 200];

  doc.setDrawColor(...BLK);
  doc.setLineWidth(0.3);
  doc.setTextColor(...BLK);

  // ── TÍTULO ──────────────────────────────────────────────────────────────────
  let y = 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('REPORTE DE CORTE', pageW / 2, y, { align: 'center' });
  // Subrayado del título
  const titleW = doc.getTextWidth('REPORTE DE CORTE');
  doc.setLineWidth(0.6);
  doc.line(pageW / 2 - titleW / 2, y + 1, pageW / 2 + titleW / 2, y + 1);
  doc.setLineWidth(0.3);

  // N° corte (derecha)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Nro : ..............................', R, y, { align: 'right' });
  // Valor encima de los puntos, alineado a la izquierda desde donde comienzan los puntos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const nroX = R - doc.getTextWidth('..............................');
  doc.text(String(data.nCorte), nroX, y);

  y += 8;

  // ── FILA 1: FECHA INICIO | TELA | FECHA TERMINO ─────────────────────────────
  const drawLabelValue = (lx: number, ly: number, label: string, value: string, maxW: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label, lx, ly);
    const labelW = doc.getTextWidth(label);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(value, lx + labelW + 1, ly);
    // Línea bajo el valor
    doc.setLineWidth(0.2);
    doc.line(lx + labelW + 1, ly + 0.8, lx + maxW, ly + 0.8);
    doc.setLineWidth(0.3);
  };

  const col1W = W * 0.28;
  const col2W = W * 0.42;
  const col3W = W * 0.28;

  const fmtFecha = (iso?: string) => iso ? iso.slice(0, 10) : '';
  const fmtHora  = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  drawLabelValue(L, y, 'FECHA DE INICIO : ', fmtFecha(data.horaInicio) || data.fecha, col1W - 2);
  drawLabelValue(L + col1W, y, 'TELA : ', data.tela, col1W + col2W - 2);
  drawLabelValue(L + col1W + col2W, y, 'FECHA DE TERMINO : ', fmtFecha(data.horaFin), col3W - 2);

  y += 7;

  // ── FILA 2: HORA INICIO | PRODUCTO | HORA TERMINO ───────────────────────────
  drawLabelValue(L, y, 'HORA DE INICIO : ', fmtHora(data.horaInicio), col1W - 2);
  drawLabelValue(L + col1W, y, 'PRODUCTO : ', data.producto, col1W + col2W - 2);
  drawLabelValue(L + col1W + col2W, y, 'HORA DE TERMINO : ', fmtHora(data.horaFin), col3W - 2);

  y += 7;

  // ── BLOQUE PERSONAL (TENDEDOR / CORTADOR / DESOJADOR) ───────────────────────
  const CELL_H = 8;
  const LABEL_COL_W = 28;
  const H_INICIO_W  = 40;
  const H_TERMINO_W = 40;
  const reste = W - LABEL_COL_W - H_INICIO_W - H_TERMINO_W;

  const drawPersonRow = (rowY: number, personLabel: string, isFirst: boolean) => {
    // Columna etiqueta (borde completo)
    doc.setFillColor(...LIGHT);
    doc.rect(L, rowY, LABEL_COL_W, CELL_H, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BLK);
    doc.text(personLabel, L + 2, rowY + CELL_H / 2 + 1.5);

    // Espacio nombre (sin fondo)
    doc.rect(L + LABEL_COL_W, rowY, reste, CELL_H, 'D');

    // Sub-headers H.Inicio / H.Termino solo en la primera fila
    if (isFirst) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text('H. Inicio', L + LABEL_COL_W + reste + 2, rowY + 3.5);
      doc.text('H. Termino', L + LABEL_COL_W + reste + H_INICIO_W + 2, rowY + 3.5);
    }
    doc.rect(L + LABEL_COL_W + reste, rowY, H_INICIO_W, CELL_H, 'D');
    doc.rect(L + LABEL_COL_W + reste + H_INICIO_W, rowY, H_TERMINO_W, CELL_H, 'D');
  };

  drawPersonRow(y, 'TENDEDOR', true);       y += CELL_H;
  drawPersonRow(y, 'CORTADOR', false);      y += CELL_H;
  drawPersonRow(y, 'DESOJADOR', false);     y += CELL_H;

  // Rellenar tendedor, cortador y ayudante en sus celdas
  if (data.tendedor) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const tendedorY = y - CELL_H * 3 + CELL_H / 2 + 1.5;
    doc.text(data.tendedor, L + LABEL_COL_W + 2, tendedorY);
  }
  if (data.cortador) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const cortadorY = y - CELL_H * 2 + CELL_H / 2 + 1.5;
    doc.text(data.cortador, L + LABEL_COL_W + 2, cortadorY);
  }
  if (data.ayudante) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const ayudanteY = y - CELL_H + CELL_H / 2 + 1.5;
    doc.text(data.ayudante, L + LABEL_COL_W + 2, ayudanteY);
  }

  y += 2;

  // ── FILA ANCHO / LARGO ───────────────────────────────────────────────────────
  const anchoW = W / 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setFillColor(...LIGHT);
  doc.rect(L, y, anchoW * 0.4, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.text('ANCHO DE TELA : ', L + 2, y + 4.5);
  doc.rect(L + anchoW * 0.4, y, anchoW * 0.6, 7, 'D');
  if (data.ancho > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${data.ancho} m`, L + anchoW * 0.4 + 2, y + 4.5);
  }

  const lgX = L + anchoW;
  doc.setFillColor(...LIGHT);
  doc.rect(lgX, y, anchoW * 0.5, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('LARGO DE TENDIDO : ', lgX + 2, y + 4.5);
  doc.rect(lgX + anchoW * 0.5, y, anchoW * 0.5, 7, 'D');
  if (data.mtsPorTendida > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${data.mtsPorTendida} m`, lgX + anchoW * 0.5 + 2, y + 4.5);
  }

  y += 9;

  // ── TABLA COLORES ────────────────────────────────────────────────────────────
  // Anchos: COLOR | KILOS O METROS | TENDIDAS | S | M | L | XL | TOTAL
  const nTallas = 4;
  const COL_W   = W * 0.22;
  const KM_W    = W * 0.18;
  const TEN_W   = W * 0.12;
  const tallaW  = (W - COL_W - KM_W - TEN_W - W * 0.10) / nTallas;
  const TOT_W   = W * 0.10;

  // Totales generales
  const contS      = data.colores.reduce((s, c) => s + c.cantS, 0);
  const contM      = data.colores.reduce((s, c) => s + c.cantM, 0);
  const contL      = data.colores.reduce((s, c) => s + c.cantL, 0);
  const contXL     = data.colores.reduce((s, c) => s + c.cantXL, 0);
  const totalKg    = data.colores.reduce((s, c) => s + c.kgUsados, 0);
  const totalRollos= data.colores.reduce((s, c) => s + (
    data.colores.findIndex(x => x.nombre === c.nombre) === data.colores.indexOf(c) ? c.rollosUsados : 0
  ), 0);
  const totalTend  = data.colores.reduce((s, c) => s + c.tendidas, 0);

  // Grupos de colores consecutivos con mismo nombre → para fusionar KILOS O METROS
  interface KmGroup { nombre: string; spanCount: number; firstBodyRow: number; totalKg: number; rollos: number; }
  const kmGroups: KmGroup[] = [];
  data.colores.forEach((c, i) => {
    const prev = kmGroups[kmGroups.length - 1];
    if (prev && prev.nombre === c.nombre) {
      prev.spanCount++;
      prev.totalKg += c.kgUsados;
    } else {
      kmGroups.push({ nombre: c.nombre, spanCount: 1, firstBodyRow: i, totalKg: c.kgUsados, rollos: c.rollosUsados });
    }
  });

  const rowMeta: { y: number; h: number; page: number }[] = [];

  const THR_H = 8;

  autoTable(doc, {
    startY: y,
    head: [[
      'COLOR',
      'KILOS O METROS',
      'TENDIDAS',
      data.propS != null ? `S  (${data.propS})` : `S  (${contS})`,
      data.propM != null ? `M  (${data.propM})` : `M  (${contM})`,
      data.propL != null ? `L  (${data.propL})` : `L  (${contL})`,
      data.propXL != null ? `XL  (${data.propXL})` : `XL  (${contXL})`,
      'TOTAL',
    ]],
    body: [
      ...data.colores.map(c => [
        c.nombre,
        '',   // col 1: KILOS O METROS — dibujado manualmente con rowspan
        c.tendidas > 0 ? String(c.tendidas) : '',
        c.cantS > 0 ? String(c.cantS) : '',
        c.cantM > 0 ? String(c.cantM) : '',
        c.cantL > 0 ? String(c.cantL) : '',
        c.cantXL > 0 ? String(c.cantXL) : '',
        String(c.cantS + c.cantM + c.cantL + c.cantXL || ''),
      ]),
      // Filas vacías para completar si hay pocos colores
      ...Array.from({ length: Math.max(0, 6 - data.colores.length) }, () => ['', '', '', '', '', '', '', '']),
    ],
    foot: [[
      { content: 'TOTAL', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `${totalKg.toFixed(1)} kg / ${totalRollos} rol`, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(totalTend), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(contS), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(contM), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(contL), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(contXL), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(contS + contM + contL + contXL), styles: { halign: 'center', fontStyle: 'bold' } },
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: BLK,
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: BLK,
      lineWidth: 0.3,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: BLK,
      lineColor: BLK,
      lineWidth: 0.3,
      minCellHeight: 8,
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: BLK,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: BLK,
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: COL_W, halign: 'left' },
      1: { cellWidth: KM_W, halign: 'center' },
      2: { cellWidth: TEN_W, halign: 'center' },
      3: { cellWidth: tallaW, halign: 'center' },
      4: { cellWidth: tallaW, halign: 'center' },
      5: { cellWidth: tallaW, halign: 'center' },
      6: { cellWidth: tallaW, halign: 'center' },
      7: { cellWidth: TOT_W, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: L, right: 12, bottom: 15 },
    didDrawCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 1) {
        rowMeta[hookData.row.index] = {
          y: hookData.cell.y,
          h: hookData.cell.height,
          page: doc.getCurrentPageInfo().pageNumber,
        };
      }
    },
  });

  // ── Post-render: dibujar KILOS O METROS con rowspan por grupo de color ────────
  const KM_X = L + COL_W;
  const FONT_SZ = 8;

  kmGroups.forEach(g => {
    const firstMeta = rowMeta[g.firstBodyRow];
    if (!firstMeta) return;

    const kmText = g.totalKg > 0 ? `${g.totalKg.toFixed(1)} kg / ${g.rollos} rollos` : '';

    // Un grupo puede cruzar páginas: agrupar filas del span por página
    const rowsByPage = new Map<number, { y: number; h: number }[]>();
    for (let ri = g.firstBodyRow; ri < g.firstBodyRow + g.spanCount; ri++) {
      const m = rowMeta[ri];
      if (!m) continue;
      if (!rowsByPage.has(m.page)) rowsByPage.set(m.page, []);
      rowsByPage.get(m.page)!.push(m);
    }

    rowsByPage.forEach((rows, pageNum) => {
      doc.setPage(pageNum);
      const topY   = rows[0].y;
      const botRow = rows[rows.length - 1];
      const spanH  = (botRow.y + botRow.h) - topY;

      doc.setFillColor(255, 255, 255);
      doc.rect(KM_X, topY, KM_W, spanH, 'F');
      doc.setDrawColor(...BLK);
      doc.setLineWidth(0.3);
      doc.rect(KM_X, topY, KM_W, spanH, 'D');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_SZ);
      doc.setTextColor(...BLK);
      // Solo escribir el texto en la página donde está la mayoría de las filas del grupo
      if (pageNum === firstMeta.page) {
        doc.text(kmText, KM_X + KM_W / 2, topY + spanH / 2, { align: 'center', baseline: 'middle' });
      }
    });
  });

  // ── FOOTER sencillo ──────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(130, 130, 130);
  doc.text('Módulo Texajo — Sistema de Gestión Textil', L, pageH - 6);
  doc.text(`Emitido: ${new Date().toLocaleDateString('es-PE')}`, R, pageH - 6, { align: 'right' });

}

export function exportReporteCorte(data: ReporteCorteData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  _dibujarReporteCorte(doc, data);
  doc.save(`reporte_corte_${data.nCorte}.pdf`);
}

export function exportReportesCorte(dataList: ReporteCorteData[]) {
  if (dataList.length === 0) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  dataList.forEach((data, i) => {
    if (i > 0) doc.addPage();
    _dibujarReporteCorte(doc, data);
  });
  const fecha = new Date().toISOString().slice(0, 10);
  doc.save(`reportes_corte_${fecha}.pdf`);
}

export function exportHojaSeguimientoXlsx(data: HojaSeguimientoData) {
  const wb = XLSX.utils.book_new();
  const rows: unknown[][] = [];

  // Cabecera
  rows.push([`N° ${data.nCorte}`, '', data.producto.toUpperCase(), '', '', '', `Cliente: ${data.cliente}`, '', `F.CORTE: ${data.fecha}`]);
  rows.push([]);

  // Encabezado tabla
  rows.push(['COLOR', 'T', 'CANT', ...data.operaciones, 'MERMA', 'ENTREGADO']);

  // Filas
  for (const f of data.filas) {
    rows.push([f.color, f.talla, f.cantidad, ...f.operariosPorOp, '', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 5 },
    { wch: 7 },
    ...data.operaciones.map(() => ({ wch: 18 })),
    { wch: 10 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Corte ${data.nCorte}`);
  XLSX.writeFile(wb, `hoja_seguimiento_${data.nCorte}_${data.fecha}.xlsx`);
}
