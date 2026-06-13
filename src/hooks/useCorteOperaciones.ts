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

// Agrupa colores por nombre base con sus tonalidades
export function useColoresAgrupados(colores: Color[]) {
  return useMemo(() => {
    const grupos = new Map<string, { id: string; tonalidad: string | null; prioridad: number }[]>();
    for (const c of colores) {
      const m = c.nombre.match(/^(.+?)\s+(\d+)$/);
      const base = m ? m[1] : c.nombre;
      const ton = m ? m[2] : null;
      if (!grupos.has(base)) grupos.set(base, []);
      grupos.get(base)!.push({ id: c.id, tonalidad: ton, prioridad: c.prioridad ?? 999 });
    }
    for (const arr of grupos.values())
      arr.sort((a, b) => parseInt(a.tonalidad ?? '0') - parseInt(b.tonalidad ?? '0'));
    return grupos;
  }, [colores]);
}

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
