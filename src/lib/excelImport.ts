import { TexajoImportPayload } from '../types';

// Este módulo era usado para importar datos desde Excel/Google Sheets.
// La funcionalidad fue reemplazada por importación JSON nativa en ConfiguracionAvanzada.
// Se mantiene como stub para compatibilidad de compilación.

export const TEXAJO_GOOGLE_SHEET_CSV_URLS: readonly string[] = [];

export async function importarDesdeGoogleSheets(): Promise<TexajoImportPayload> {
  throw new Error('importarDesdeGoogleSheets: funcionalidad no disponible. Use importación JSON.');
}

export async function importarDesdeExcel(_file: File): Promise<TexajoImportPayload> {
  throw new Error('importarDesdeExcel: funcionalidad no disponible. Use importación JSON.');
}
