// Punto de entrada para funciones de exportación PDF.
// Importar desde aquí en código nuevo; export.ts sigue disponible para compatibilidad.
export {
  exportTableToPdf,
  exportBoletaToPdf,
  exportReporteCorte,
  exportReportesCorte,
} from './export';
export type { PdfTableOptions, BoletaPdfData, ReporteCorteData } from './export';
