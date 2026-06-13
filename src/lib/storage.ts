export const STORAGE_KEY = 'modulo_texajo_clean_state_v1';

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const newId = (): string => crypto.randomUUID();

export function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}
