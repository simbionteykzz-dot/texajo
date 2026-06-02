// Niveles de alerta de stock — editar aquí para cambiar los umbrales globalmente

export interface StockLevel {
  label: string;
  description: string;
  color: string;      // Tailwind badge classes
  dotColor: string;   // color del indicador puntual
}

export const STOCK_LEVELS = {
  ok:      { label: 'Sobre stock',  description: 'Más de 200 prendas',       color: 'bg-green-100  text-green-700',  dotColor: '#16a34a' },
  warning: { label: 'Por acabar',   description: 'Entre 50 y 80 prendas',    color: 'bg-yellow-100 text-yellow-700', dotColor: '#ca8a04' },
  danger:  { label: 'Stock crítico',description: 'Menos de 50 unidades',     color: 'bg-red-100    text-red-700',    dotColor: '#dc2626' },
} satisfies Record<string, StockLevel>;

// Umbrales configurables
export const STOCK_THRESHOLDS = {
  OK_MIN:   200,  // >= 200       → Sobre stock (verde)
  WARN_MAX:  80,  // 50–80        → Por acabar (amarillo)
  WARN_MIN:  50,  // < 50         → Stock crítico (rojo)
} as const;

export function getStockLevel(qty: number): StockLevel {
  if (qty > STOCK_THRESHOLDS.OK_MIN)  return STOCK_LEVELS.ok;
  if (qty >= STOCK_THRESHOLDS.WARN_MIN && qty <= STOCK_THRESHOLDS.WARN_MAX) return STOCK_LEVELS.warning;
  if (qty < STOCK_THRESHOLDS.WARN_MIN) return STOCK_LEVELS.danger;
  // entre 80 y 200 → sin alerta especial, se trata como ok
  return STOCK_LEVELS.ok;
}

export function stockBadgeClass(qty: number): string {
  return getStockLevel(qty).color;
}
