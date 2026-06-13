import type { jsPDF } from 'jspdf';

export type PdfFont = 'oswald';

const BUILTIN: PdfFont[] = [];

const loaders: Record<string, () => Promise<string>> = {
  oswald: () => import('./oswald').then(m => m.default),
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
