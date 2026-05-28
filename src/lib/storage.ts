export const STORAGE_KEY = 'modulo_texajo_clean_state_v1';

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

export function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}
