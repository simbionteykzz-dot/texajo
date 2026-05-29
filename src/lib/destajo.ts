import { Operario, BoletaLinea, Corte, Cliente, Producto, Color } from '../types';

export const TARIFA_CORTADOR = 0.35;
export const TARIFA_CONFECCIONISTA = 0.85;

export function tarifaPorModulo(modulo: string): number {
  return modulo === 'CORTADOR' ? TARIFA_CORTADOR : TARIFA_CONFECCIONISTA;
}

export function cortesDelOperario(cortes: Corte[], operarioId: string): Corte[] {
  return cortes
    .filter(c => c.cortador === operarioId || c.ayudante === operarioId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function filtrarPorMes(cortes: Corte[], mes: string): Corte[] {
  if (mes === 'TODOS') return cortes;
  return cortes.filter(c => c.fecha.startsWith(mes));
}

export function mesActualISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function lineasDelOperario(
  lineas: BoletaLinea[],
  operarioId: string,
  cortes: Corte[],
  clientes: Cliente[],
  productos: Producto[],
  colores: Color[]
): BoletaLinea[] {
  const labelCliente = (id: string) => clientes.find(c => c.id === id)?.nombre ?? id;
  const labelProducto = (id: string) => productos.find(p => p.id === id)?.nombre ?? id;
  const labelColor = (id: string) => colores.find(c => c.id === id)?.nombre ?? id;
  void labelCliente; void labelProducto; void labelColor;

  return lineas
    .filter(l => l.operarioId === operarioId && l.estadoPago !== 'PAGADO')
    .sort((a, b) => b.periodo.localeCompare(a.periodo) || a.orden - b.orden);
}

export function totalesBoleta(lineas: BoletaLinea[]) {
  const cortesUnicos = new Set(lineas.map(l => l.corteId));
  const lineasPendientes = lineas.filter(l => l.estadoPago !== 'PAGADO');
  return {
    cortes: cortesUnicos.size,
    operaciones: lineas.length,
    prendas: lineas.reduce((s, l) => s + l.cantPrendas, 0),
    importe: lineas.reduce((s, l) => s + l.importe, 0),
    pendiente: lineasPendientes.reduce((s, l) => s + l.importe, 0),
    operacionesPendientes: lineasPendientes.length,
  };
}

export function nombreOperario(operarios: Operario[], id: string): string {
  return operarios.find(o => o.id === id)?.nombre ?? id;
}
