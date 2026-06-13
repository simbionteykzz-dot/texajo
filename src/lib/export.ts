import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoPdf from '../assets/branding/logo-pdf.png';
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
  const descuento  = data.descuentoOverride !== undefined ? data.descuentoOverride : totalBruto * 0.01;
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
  doc.text(data.descuentoOverride !== undefined ? 'DESCUENTOS' : 'DESC. 1%', BOX_X + 5, fy + ROW_H / 2 + 1.5);
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
  const L = 5, R = pageW - 5;
  const usableW = R - L;

  await registerFont(doc, font);
  doc.setFont(font, 'normal');
  doc.setDrawColor(...BLK);
  doc.setLineWidth(0.3);

  // ── CABECERA ────────────────────────────────────────────────────────────────
  // Fila 1: [N°58 amarillo] [vacío] [PRODUCTO amarillo centrado] [vacío] [F.CORTE gris] [02-jun amarillo]
  // Fila 2: [Cliente: OverShark amarillo suave] [resto vacío/blanco]
  const hdrY  = 4;
  const hdr1H = 8;
  const hdr2H = 6;

  // Anchos fijos
  const nCorteW = 20;   // caja N°
  const fLabelW = 20;   // "F.CORTE" gris
  const fechaW  = 30;   // valor fecha amarillo
  // Producto: caja de ancho fijo centrada en el espacio medio
  const midStart = L + nCorteW;
  const midEnd   = R - fLabelW - fechaW;
  const midW     = midEnd - midStart;
  const prodW    = Math.min(90, midW * 0.65); // caja producto ~65% del espacio medio
  const prodX    = midStart + (midW - prodW) / 2;

  const fechaLabel = new Date(data.fecha + 'T00:00:00')
    .toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
    .replace('.', '');

  // Fila 1 fondo blanco completo (para que vacíos sean blancos)
  doc.setFillColor(255, 255, 255);
  doc.rect(L, hdrY, usableW, hdr1H, 'F');

  // Caja N° (amarillo, borde)
  doc.setFillColor(...YELLOW_HDR);
  doc.rect(L, hdrY, nCorteW, hdr1H, 'FD');
  doc.setFont(font, 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...BLK);
  doc.text('N°', L + 1.5, hdrY + 3);
  doc.setFontSize(13);
  doc.text(String(data.nCorte), L + nCorteW / 2, hdrY + 7, { align: 'center' });

  // Caja PRODUCTO (amarillo, centrada en el espacio medio)
  doc.setFillColor(...YELLOW_HDR);
  doc.rect(prodX, hdrY, prodW, hdr1H, 'FD');
  doc.setFont(font, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BLK);
  doc.text(String(data.producto).toUpperCase(), prodX + prodW / 2, hdrY + 5.5, { align: 'center' });

  // Caja F.CORTE (gris)
  doc.setFillColor(200, 200, 200);
  doc.rect(R - fLabelW - fechaW, hdrY, fLabelW, hdr1H, 'FD');
  doc.setFont(font, 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...BLK);
  doc.text('F.CORTE', R - fLabelW - fechaW + fLabelW / 2, hdrY + 5.5, { align: 'center' });

  // Caja fecha (amarillo grande)
  doc.setFillColor(...YELLOW_HDR);
  doc.rect(R - fechaW, hdrY, fechaW, hdr1H, 'FD');
  doc.setFont(font, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLK);
  doc.text(fechaLabel, R - fechaW / 2, hdrY + 6, { align: 'center' });

  // Fila 2: solo caja Cliente (amarillo suave), resto blanco
  doc.setFillColor(255, 255, 255);
  doc.rect(L, hdrY + hdr1H, usableW, hdr2H, 'F');
  doc.setFillColor(...YELLOW_SOFT);
  doc.rect(L, hdrY + hdr1H, nCorteW + 30, hdr2H, 'FD');
  doc.setFont(font, 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...BLK);
  doc.text('Cliente:', L + 1.5, hdrY + hdr1H + 4);
  doc.setFont(font, 'normal');
  doc.setFontSize(6.5);
  doc.text(String(data.cliente), L + 14, hdrY + hdr1H + 4.5);

  const tableY = hdrY + hdr1H + hdr2H + 1;

  // ── TABLA manual con rowspan por color ─────────────────────────────────────
  // Columnas: § (span) | COLOR | T | CANT | ops... | MERMA | ENTREGADO
  const spanW = 5, colorW = 22, tallaW = 7, cantW = 9;
  const trailW = 13 + 16; // MERMA + ENTREGADO
  const nOps = data.operaciones.length;
  const opW = Math.max(10, (usableW - spanW - colorW - tallaW - cantW - trailW) / Math.max(nOps, 1));
  const mermaW = 13, entregadoW = 16;

  // Anchos por columna en orden
  const cols = [spanW, colorW, tallaW, cantW, ...data.operaciones.map(() => opW), mermaW, entregadoW];
  const totalW = cols.reduce((s, w) => s + w, 0);

  // Calcular altura de fila para que todo quepa
  const nDataRows = data.filas.length + 1; // +1 fila TOTAL
  const tblHdrH = 7;
  const availH = pageH - tableY - 5;
  const rowH = Math.max(3.8, (availH - tblHdrH) / Math.max(nDataRows, 1));
  const fontSize = rowH < 4.5 ? 5 : 5.5;
  const fontMm = fontSize * 0.352;
  const pad = Math.max(0.3, (rowH - fontMm) / 2);

  // Helper: dibujar celda
  const drawCell = (
    x: number, y2: number, w: number, h: number,
    text: string, opts: {
      fill?: [number,number,number],
      textColor?: [number,number,number],
      bold?: boolean,
      align?: 'left'|'center'|'right',
      fs?: number,
    } = {}
  ) => {
    if (opts.fill) {
      doc.setFillColor(...opts.fill);
      doc.rect(x, y2, w, h, 'FD');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y2, w, h, 'FD');
    }
    if (text) {
      doc.setFont(font, opts.bold ? 'bold' : 'normal');
      doc.setFontSize(opts.fs ?? fontSize);
      doc.setTextColor(...(opts.textColor ?? BLK));
      const tx = opts.align === 'right' ? x + w - 1
               : opts.align === 'center' ? x + w / 2
               : x + 1;
      doc.text(text, tx, y2 + h / 2 + fontMm / 2, { align: opts.align ?? 'left' });
    }
  };

  // Encabezado tabla
  let cx = L;
  const hdrFill = YELLOW_HDR;
  const hdrOpts = { fill: hdrFill, bold: true, align: 'center' as const, fs: 6 };
  drawCell(cx, tableY, spanW, tblHdrH, '§', hdrOpts); cx += spanW;
  drawCell(cx, tableY, colorW, tblHdrH, 'COLOR', hdrOpts); cx += colorW;
  drawCell(cx, tableY, tallaW, tblHdrH, 'T', hdrOpts); cx += tallaW;
  drawCell(cx, tableY, cantW, tblHdrH, 'CANT', hdrOpts); cx += cantW;
  for (const op of data.operaciones) {
    drawCell(cx, tableY, opW, tblHdrH, op, hdrOpts); cx += opW;
  }
  drawCell(cx, tableY, mermaW, tblHdrH, 'MERMA', hdrOpts); cx += mermaW;
  drawCell(cx, tableY, entregadoW, tblHdrH, 'ENTREGADO', hdrOpts);

  // Agrupar filas por color para rowspan
  const grupos: { colorNombre: string; colorHex?: string; filas: typeof data.filas }[] = [];
  for (const f of data.filas) {
    const last = grupos[grupos.length - 1];
    if (last && last.colorNombre === f.color) {
      last.filas.push(f);
    } else {
      grupos.push({ colorNombre: f.color, colorHex: f.colorHex, filas: [f] });
    }
  }

  // Parsear hex a RGB
  const hexToRgb = (hex: string): [number,number,number] => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0,2), 16);
    const g = parseInt(h.substring(2,4), 16);
    const b = parseInt(h.substring(4,6), 16);
    return [r, g, b];
  };

  // Determinar si color es oscuro (texto blanco)
  const isDark = (rgb: [number,number,number]) => (rgb[0]*299 + rgb[1]*587 + rgb[2]*114) / 1000 < 128;

  let rowY = tableY + tblHdrH;
  let rowIdx = 0;
  let totalCant = 0;

  for (const grupo of grupos) {
    const colorRgb: [number,number,number] = grupo.colorHex ? hexToRgb(grupo.colorHex) : [220, 220, 220];
    const textColor: [number,number,number] = isDark(colorRgb) ? [255,255,255] : BLK;
    const spanH = rowH * grupo.filas.length;

    // Celda § (total prendas del color, abarca todas sus tallas)
    const totalGrupo = grupo.filas.reduce((s, f) => s + f.cantidad, 0);
    drawCell(L, rowY, spanW, spanH, String(totalGrupo), {
      fill: [240,240,240], bold: true, align: 'center', fs: 5,
    });

    // Celda COLOR (span del grupo, con color de fondo)
    drawCell(L + spanW, rowY, colorW, spanH, grupo.colorNombre, {
      fill: colorRgb, textColor, bold: true, align: 'center', fs: fontSize,
    });

    for (const fila of grupo.filas) {
      const altFill: [number,number,number] = rowIdx % 2 === 0 ? [255,255,255] : [248,248,248];
      cx = L + spanW + colorW;

      drawCell(cx, rowY, tallaW, rowH, fila.talla, { fill: altFill, align: 'center', bold: true }); cx += tallaW;
      drawCell(cx, rowY, cantW, rowH, String(fila.cantidad), { fill: altFill, align: 'center' }); cx += cantW;
      totalCant += fila.cantidad;

      for (const opNombre of fila.operariosPorOp) {
        drawCell(cx, rowY, opW, rowH, opNombre, { fill: altFill, align: 'center' }); cx += opW;
      }
      drawCell(cx, rowY, mermaW, rowH, '', { fill: altFill }); cx += mermaW;
      drawCell(cx, rowY, entregadoW, rowH, '', { fill: altFill });

      rowY += rowH;
      rowIdx++;
    }
  }

  // Fila TOTAL
  cx = L;
  const totalFill: [number,number,number] = [255, 230, 100];
  drawCell(cx, rowY, spanW, rowH, '', { fill: totalFill }); cx += spanW;
  drawCell(cx, rowY, colorW + tallaW, rowH, 'TOTAL', { fill: totalFill, bold: true, align: 'center', fs: 6 }); cx += colorW + tallaW;
  drawCell(cx, rowY, cantW, rowH, String(totalCant), { fill: totalFill, bold: true, align: 'center', fs: 6 }); cx += cantW;
  for (let i = 0; i < nOps; i++) { drawCell(cx, rowY, opW, rowH, '', { fill: totalFill }); cx += opW; }
  drawCell(cx, rowY, mermaW, rowH, '', { fill: totalFill }); cx += mermaW;
  drawCell(cx, rowY, entregadoW, rowH, '', { fill: totalFill });

  doc.save(`hoja_seguimiento_${data.nCorte}_${data.fecha}.pdf`);
}

// ─── Reporte de Corte (formulario físico) ────────────────────────────────────

export interface ReporteCorteData {
  nCorte: string;
  fecha: string;       // YYYY-MM-DD
  tela: string;
  producto: string;
  cortador: string;
  ayudante: string;
  tendedor: string;
  ancho: number;       // metros
  mtsPorTendida: number;
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

  drawLabelValue(L, y, 'FECHA DE INICIO : ', data.fecha, col1W - 2);
  drawLabelValue(L + col1W, y, 'TELA : ', data.tela, col1W + col2W - 2);
  drawLabelValue(L + col1W + col2W, y, 'FECHA DE TERMINO : ', '', col3W - 2);

  y += 7;

  // ── FILA 2: HORA INICIO | PRODUCTO | HORA TERMINO ───────────────────────────
  drawLabelValue(L, y, 'HORA DE INICIO : ', '', col1W - 2);
  drawLabelValue(L + col1W, y, 'PRODUCTO : ', data.producto, col1W + col2W - 2);
  drawLabelValue(L + col1W + col2W, y, 'HORA DE TERMINO : ', '', col3W - 2);

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
      `S  (${contS})`,
      `M  (${contM})`,
      `L  (${contL})`,
      `XL  (${contXL})`,
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
