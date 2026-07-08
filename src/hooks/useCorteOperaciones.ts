import { useMemo } from 'react';
import type { Corte, Color, MovimientoTela, SeguimientoFila, SeguimientoAsignacion, TarifaOperacion, CorteColorDetalle } from '../types';

// Calcula el stock actual por tela+color a partir de los movimientos (sin depender de stockRollosDespues)
export function useStockActualTelas(movimientosTela: MovimientoTela[]) {
  return useMemo(() => {
    const POSITIVOS = ['INGRESO', 'DE_REPROCESO', 'AJUSTE_POS'];
    const NEGATIVOS = ['A_CORTE', 'A_REPROCESO', 'MUESTRA', 'AJUSTE_NEG'];
    const map = new Map<string, number>();
    for (const m of movimientosTela) {
      const key = `${m.telaId}|${m.colorId}`;
      const prev = map.get(key) ?? 0;
      const delta = POSITIVOS.includes(m.tipo)
        ? m.rollos
        : NEGATIVOS.includes(m.tipo)
        ? -m.rollos
        : 0;
      map.set(key, prev + delta);
    }
    return map;
  }, [movimientosTela]);
}

// Resuelve el nombre canónico de un color (quita prefijo _dup_NOMBRE_id)
function resolveNombreCanonicoColor(nombre: string): string {
  const m = nombre.match(/^_dup_(.+?)_[\w-]+$/);
  return m ? m[1] : nombre;
}

// Agrupa colores por nombre canónico — los _dup_NOMBRE_* se agrupan bajo NOMBRE
export function useColoresAgrupados(colores: Color[]) {
  return useMemo(() => {
    const grupos = new Map<string, { id: string; prioridad: number }[]>();
    for (const c of colores) {
      const clave = resolveNombreCanonicoColor(c.nombre);
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave)!.push({ id: c.id, prioridad: c.prioridad ?? 999 });
    }
    // Ordenar cada grupo: el canónico primero (sin _dup_), luego por prioridad
    for (const [, arr] of grupos) {
      arr.sort((a, b) => {
        const aEsDup = colores.find(c => c.id === a.id)?.nombre.startsWith('_dup_') ? 1 : 0;
        const bEsDup = colores.find(c => c.id === b.id)?.nombre.startsWith('_dup_') ? 1 : 0;
        return aEsDup - bEsDup || a.prioridad - b.prioridad;
      });
    }
    return grupos;
  }, [colores]);
}

export const TONALIDADES = ['1', '2', '3', '4'] as const;

export function makeDescontarInventario(
  movimientosTela: MovimientoTela[],
  stockActualTelas: Map<string, number>,
  colores: Color[],
  addMovimientoTela: (m: MovimientoTela) => void,
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void,
) {
  return (corte: Corte): boolean => {
    if (!corte.telaId) return true;

    const yaDescontado = movimientosTela.some(
      m => m.corteId === corte.id && m.tipo === 'A_CORTE',
    );
    if (yaDescontado) {
      addToast(`El corte ${corte.nCorte} ya fue descontado del inventario`, 'error');
      return false;
    }

    const detalles: CorteColorDetalle[] =
      corte.coloresDetalle && corte.coloresDetalle.length > 0
        ? corte.coloresDetalle
        : [{ colorId: corte.colorId, rollosUsados: corte.rollosUsados, kgUsados: corte.kgUsados } as CorteColorDetalle];

    // Verificar stock primero
    for (const det of detalles) {
      if (!det.colorId || det.rollosUsados <= 0) continue;
      const key = `${corte.telaId}|${det.colorId}`;
      const stockAntes = stockActualTelas.get(key) ?? 0;
      if (stockAntes - det.rollosUsados < 0) {
        const color = colores.find(c => c.id === det.colorId);
        addToast(
          `Stock insuficiente para ${color?.nombre ?? det.colorId}: se necesitan ${det.rollosUsados} rollos pero hay ${stockAntes}`,
          'error',
        );
        return false;
      }
    }

    // Crear movimientos
    for (const det of detalles) {
      if (!det.colorId || det.rollosUsados <= 0) continue;
      const key = `${corte.telaId}|${det.colorId}`;
      const stockAntes = stockActualTelas.get(key) ?? 0;
      const color = colores.find(c => c.id === det.colorId);
      addMovimientoTela({
        id: crypto.randomUUID(),
        fecha: corte.fecha,
        tipo: 'A_CORTE',
        clienteId: corte.clienteId,
        telaId: corte.telaId!,
        colorId: det.colorId,
        rollos: det.rollosUsados,
        kgTotal: det.kgUsados || 0,
        categoriaColor: color?.categoria ?? 'OSCURO',
        precioKg: 0,
        totalSoles: 0,
        stockRollosAntes: stockAntes,
        stockRollosDespues: stockAntes - det.rollosUsados,
        responsable: corte.cortador,
        corteId: corte.id,
        nCorte: corte.nCorte,
        notas: `Auto-descuento por corte ${corte.nCorte}${det.tonalidad ? ` Tn-${det.tonalidad}` : ''}`,
      });
    }
    return true;
  };
}

export function makeCrearFilasSeguimiento(
  tarifasOperaciones: TarifaOperacion[],
  seguimientoFilas: SeguimientoFila[],
  addSeguimientoFila: (f: SeguimientoFila) => void,
) {
  return (corte: Corte): void => {
    const tarifas = tarifasOperaciones
      .filter(t => t.productoId === corte.productoId)
      .sort((a, b) => a.orden - b.orden);

    const detalles: CorteColorDetalle[] =
      corte.coloresDetalle && corte.coloresDetalle.length > 0
        ? corte.coloresDetalle
        : [{ colorId: corte.colorId, cantS: corte.cantS, cantM: corte.cantM, cantL: corte.cantL, cantXL: corte.cantXL } as CorteColorDetalle];

    for (const det of detalles) {
      const tallasMap: { talla: 'S' | 'M' | 'L' | 'XL'; cantidad: number }[] = [
        { talla: 'S',  cantidad: det.cantS },
        { talla: 'M',  cantidad: det.cantM },
        { talla: 'L',  cantidad: det.cantL },
        { talla: 'XL', cantidad: det.cantXL },
      ];
      for (const { talla, cantidad } of tallasMap) {
        if (cantidad <= 0) continue;
        const yaExiste = seguimientoFilas.some(
          f => f.corteId === corte.id && f.talla === talla && f.colorId === det.colorId,
        );
        if (yaExiste) continue;

        const asignaciones: SeguimientoAsignacion[] = tarifas.map(t => ({
          tarifaId: t.id,
          operacion: t.operacion,
          orden: t.orden,
          operarioId: '',
          pago: 0,
        }));

        addSeguimientoFila({
          id: crypto.randomUUID(),
          corteId: corte.id,
          nCorte: corte.nCorte,
          productoId: corte.productoId,
          fecha: corte.fecha,
          colorId: det.colorId,
          talla,
          cantidad,
          asignaciones,
          pctAvance: 0,
          estado: 'PENDIENTE',
          totalPago: 0,
        });
      }
    }
  };
}
