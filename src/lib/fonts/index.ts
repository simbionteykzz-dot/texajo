import type { jsPDF } from 'jspdf';

export type PdfFont =
  | 'helvetica'
  | 'times'
  | 'courier'
  | 'roboto'
  | 'opensans'
  | 'lato'
  | 'montserrat'
  | 'oswald'
  | 'raleway'
  | 'playfair'
  | 'ubuntu';

// jsPDF built-ins — no registration needed
const BUILTIN: PdfFont[] = ['helvetica', 'times', 'courier'];

const loaders: Record<string, () => Promise<string>> = {
  roboto:     () => import('./roboto').then(m => m.default),
  opensans:   () => import('./opensans').then(m => m.default),
  lato:       () => import('./lato').then(m => m.default),
  montserrat: () => import('./montserrat').then(m => m.default),
  oswald:     () => import('./oswald').then(m => m.default),
  raleway:    () => import('./raleway').then(m => m.default),
  playfair:   () => import('./playfair').then(m => m.default),
  ubuntu:     () => import('./ubuntu').then(m => m.default),
};

const registered = new Set<string>();

export async function registerFont(doc: jsPDF, font: PdfFont): Promise<void> {
  if (BUILTIN.includes(font)) return;
  if (!registered.has(font)) {
    const b64 = await loaders[font]();
    const filename = `${font}.ttf`;
    doc.addFileToVFS(filename, b64);
    doc.addFont(filename, font, 'normal');
    registered.add(font);
  } else {
    // Re-register on new doc instance
    const b64 = await loaders[font]();
    const filename = `${font}.ttf`;
    doc.addFileToVFS(filename, b64);
    doc.addFont(filename, font, 'normal');
  }
}

export function resolveFont(font: PdfFont): string {
  return font; // jsPDF uses the registered name directly
}
