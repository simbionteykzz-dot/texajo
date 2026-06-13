import { useMemo } from 'react';
import type { BoletaLinea, SeguimientoFila } from '../types';

export interface FiltrosBoleta {
  operarioId: string;
  periodo: string;
  desde?: string;
  hasta?: string;
  corteId?: string;
  estado?: '' | 'PENDIENTE' | 'PAGADO';
}

export interface FiltrosGenerales {
  operarioId?: string;
  operacion?: string;
  periodo?: string;
  estado?: '' | 'PENDIENTE' | 'PAGADO';
  corteId?: string;
}

export interface FiltrosResumen {
  periodo: string;
  desde?: string;
  hasta?: string;
}

export function useBoletaLineas(
  boletaLineas: BoletaLinea[],
  filtros: FiltrosBoleta,
) {
  const lineasFiltradas = useMemo(() =>
    boletaLineas
      .filter(b => {
        if (b.operarioId !== filtros.operarioId) return false;
        if (filtros.corteId && b.corteId !== filtros.corteId) return false;
        if (filtros.estado && b.estadoPago !== filtros.estado) return false;
        if (filtros.desde || filtros.hasta) {
          const fecha = b.fechaRegistro ?? b.periodo + '-01';
          if (filtros.desde && fecha < filtros.desde) return false;
          if (filtros.hasta && fecha > filtros.hasta) return false;
          return true;
        }
        return b.periodo === filtros.periodo;
      })
      .sort((a, b) =>
        String(a.nCorte).localeCompare(String(b.nCorte)) || a.orden - b.orden
      ),
    [boletaLineas, filtros],
  );

  const totalBruto = useMemo(
    () => lineasFiltradas.reduce((s, b) => s + b.importe, 0),
    [lineasFiltradas],
  );

  return { lineasFiltradas, totalBruto };
}

export function useResumenPorOperario(
  boletaLineas: BoletaLinea[],
  filtros: FiltrosResumen,
) {
  return useMemo(() => {
    const usaRango = filtros.desde || filtros.hasta;
    const lineasPeriodo = boletaLineas.filter(b => {
      if (usaRango) {
        if (filtros.desde && b.periodo < filtros.desde.slice(0, 7)) return false;
        if (filtros.hasta && b.periodo > filtros.hasta.slice(0, 7)) return false;
        return true;
      }
      return b.periodo === filtros.periodo;
    });

    const map = new Map<
      string,
      { total: number; prendas: number; pagado: number; pendiente: number; nLineas: number }
    >();
    for (const b of lineasPeriodo) {
      const prev = map.get(b.operarioId) ?? {
        total: 0, prendas: 0, pagado: 0, pendiente: 0, nLineas: 0,
      };
      map.set(b.operarioId, {
        total:     prev.total + b.importe,
        prendas:   prev.prendas + b.cantPrendas,
        pagado:    prev.pagado + (b.estadoPago === 'PAGADO' ? b.importe : 0),
        pendiente: prev.pendiente + (b.estadoPago === 'PENDIENTE' ? b.importe : 0),
        nLineas:   prev.nLineas + 1,
      });
    }

    return Array.from(map.entries())
      .map(([operarioId, stats]) => ({ operarioId, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [boletaLineas, filtros]);
}

export function useBoletasHuerfanas(
  boletaLineas: BoletaLinea[],
  seguimientoFilas: SeguimientoFila[],
) {
  return useMemo(
    () =>
      boletaLineas.filter(b => {
        const filaConfirmada = seguimientoFilas.some(f =>
          f.corteId === b.corteId &&
          f.asignaciones.some(
            a =>
              a.tarifaId === b.tarifaId &&
              a.confirmado === true &&
              (a.operarioId === b.operarioId ||
                (a.operarioIds ?? []).includes(b.operarioId)),
          ),
        );
        return !filaConfirmada;
      }),
    [boletaLineas, seguimientoFilas],
  );
}

export function useLineasGenerales(
  boletaLineas: BoletaLinea[],
  filtros: FiltrosGenerales,
) {
  return useMemo(
    () =>
      boletaLineas
        .filter(b => {
          if (filtros.operarioId && b.operarioId !== filtros.operarioId) return false;
          if (filtros.operacion && b.operacion !== filtros.operacion) return false;
          if (filtros.periodo && b.periodo !== filtros.periodo) return false;
          if (filtros.estado && b.estadoPago !== filtros.estado) return false;
          if (filtros.corteId && b.corteId !== filtros.corteId) return false;
          return true;
        })
        .sort(
          (a, b) =>
            b.periodo.localeCompare(a.periodo) ||
            String(a.nCorte).localeCompare(String(b.nCorte)) ||
            a.orden - b.orden,
        ),
    [boletaLineas, filtros],
  );
}
