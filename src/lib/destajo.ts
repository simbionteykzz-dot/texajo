import { Corte, Operario, Cliente, Producto, Color, AsignacionOperacion } from '../types';

export const TARIFA_CORTADOR = 0.35;
export const TARIFA_CONFECCIONISTA = 0.85;

export function tarifaPorModulo(modulo: string): number {
  return modulo === 'CORTADOR' ? TARIFA_CORTADOR : TARIFA_CONFECCIONISTA;
}

export interface BoletaLinea {
  corteId: string;
  fecha: string;
  nCorte: string;
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
  telaKg: number;
  rendimiento: number;
  estadoCorte: string;
  tarifa: number;
  importe: number;
  estadoPago: 'PENDIENTE' | 'PAGADO' | 'ANULADO';
  fechaPago?: string;
}

export function cortesDelOperario(cortes: Corte[], operarioId: string): Corte[] {
  return cortes
    .filter(c => c.cortadorId === operarioId || c.ayudanteId === operarioId)
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

export function construirLineasBoleta(
  operario: Operario,
  cortes: Corte[],
  asignaciones: AsignacionOperacion[],
  clientes: Cliente[],
  productos: Producto[],
  colores: Color[]
): BoletaLinea[] {
  const cortesMap = new Map(cortes.map(c => [c.id, c]));
  const labelCliente = (id: string) => clientes.find(c => c.id === id)?.nombre ?? id;
  const labelProducto = (id: string) => productos.find(p => p.id === id)?.nombre ?? id;
  const labelColor = (id: string) => colores.find(c => c.id === id)?.nombre ?? id;

  const lineas: BoletaLinea[] = [];
  asignaciones
    .filter(a => a.operarioId === operario.id && a.estadoPago !== 'ANULADO')
    .forEach(asignacion => {
      const corte = cortesMap.get(asignacion.corteId);
      if (!corte) return;
      lineas.push({
        corteId: corte.id,
        fecha: corte.fecha,
        nCorte: corte.nCorte,
        cliente: labelCliente(corte.clienteId),
        producto: labelProducto(corte.productoId),
        color: labelColor(corte.colorId),
        operacion: asignacion.operacion,
        orden: asignacion.orden,
        cantS: asignacion.cantS,
        cantM: asignacion.cantM,
        cantL: asignacion.cantL,
        cantXL: asignacion.cantXL,
        totalPrendas: asignacion.totalPrendas,
        telaKg: corte.telaUsada,
        rendimiento: corte.rendimiento,
        estadoCorte: corte.estado,
        tarifa: asignacion.tarifa,
        importe: asignacion.importe,
        estadoPago: asignacion.estadoPago ?? 'PENDIENTE',
        fechaPago: asignacion.fechaPago,
      });
    });

  return lineas.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.orden - b.orden);
}

export function totalesBoleta(lineas: BoletaLinea[]) {
  const cortesUnicos = new Set(lineas.map(l => l.corteId));
  const lineasPendientes = lineas.filter(l => l.estadoPago !== 'PAGADO' && l.estadoPago !== 'ANULADO');
  return {
    cortes: cortesUnicos.size,
    operaciones: lineas.length,
    prendas: lineas.reduce((s, l) => s + l.totalPrendas, 0),
    telaKg: lineas.reduce((s, l) => s + l.telaKg, 0),
    importe: lineas.reduce((s, l) => s + l.importe, 0),
    pendiente: lineasPendientes.reduce((s, l) => s + l.importe, 0),
    operacionesPendientes: lineasPendientes.length,
  };
}
