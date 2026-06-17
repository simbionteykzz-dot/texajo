import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, FileText, Receipt, Users, BarChart2, AlertTriangle, ChevronDown, ChevronRight, Trash2, Scissors } from 'lucide-react';
import { BoletaLinea, TipoDescuentoBoleta } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';
import { BoletaOperario } from '../components/BoletaOperario';
import { newId } from '../lib/storage';
import { useEsAdmin } from '../lib/useEsAdmin';
import {
  useBoletaLineas,
  useResumenPorOperario,
  useLineasGenerales,
  useBoletasHuerfanas,
} from '../hooks/useBoletaLineas';

const PERIODOS = (() => {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
})();

export function Destajo() {
  const {
    boletaLineas, operarios, cortes, productos, tarifasOperaciones, colores,
    addBoletaLinea, addBoletaLineas, updateBoletaLinea, deleteBoletaLinea,
    descuentosBoleta, addDescuentoBoleta, deleteDescuentoBoleta,
    seguimientoFilas, updateSeguimientoFila,
  } = useAppContext();
  const { addToast } = useToast();
  const esAdmin = useEsAdmin();

  const [activeTab, setActiveTab] = useState<'boleta' | 'resumen' | 'general' | 'porcorte'>('boleta');

  // ── Tab: Mi Boleta ──
  const [selectedOperario, setSelectedOperario] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState(PERIODOS[0]);
  const [bDesde, setBDesde] = useState('');
  const [bHasta, setBHasta] = useState('');
  const [bCorteId, setBCorteId] = useState('');
  const [bEstado, setBEstado] = useState<'' | 'PENDIENTE' | 'PAGADO'>('');
  const [showForm, setShowForm] = useState(false);
  const [bulkCorteId, setBulkCorteId] = useState('');
  const [showBoleta, setShowBoleta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Descuentos boleta ──
  const [showDescForm, setShowDescForm] = useState(false);
  const [descForm, setDescForm] = useState<{ tipo: TipoDescuentoBoleta; monto: string; notas: string }>({ tipo: 'ADELANTO', monto: '', notas: '' });

  // ── Tab: Resumen ──
  const [rPeriodo, setRPeriodo] = useState(PERIODOS[0]);
  const [rDesde, setRDesde] = useState('');
  const [rHasta, setRHasta] = useState('');
  const [detalleOperarioId, setDetalleOperarioId] = useState<string | null>(null);
  const [expandedLineaId, setExpandedLineaId] = useState<string | null>(null);

  // ── Tab: Vista General ──
  const [gOperarioId, setGOperarioId] = useState('');
  const [gOperacion, setGOperacion] = useState('');
  const [gPeriodo, setGPeriodo] = useState('');
  const [gEstado, setGEstado] = useState<'' | 'PENDIENTE' | 'PAGADO'>('');
  const [gCorteId, setGCorteId] = useState('');

  // ── Tab: Por Corte ──
  const [pcCorteId, setPcCorteId] = useState('');
  const [pcOperacion, setPcOperacion] = useState('');
  const [pcOperarioId, setPcOperarioId] = useState('');
  const [pcEstado, setPcEstado] = useState<'' | 'PENDIENTE' | 'PAGADO'>('');

  // Modal multi-operario: cada sección tiene su propio array de líneas draft
  type DraftLinea = { id: string; corteId: string; tarifaId: string; cantPrendas: string };
  type DraftSeccion = { operarioId: string; lineas: DraftLinea[] };

  const emptyLinea = (): DraftLinea => ({ id: newId(), corteId: '', tarifaId: '', cantPrendas: '' });
  const emptySeccion = (opId: string): DraftSeccion => ({ operarioId: opId, lineas: [emptyLinea()] });

  const [draftSecciones, setDraftSecciones] = useState<DraftSeccion[]>([]);

  const resetDraft = () => setDraftSecciones([emptySeccion(selectedOperario)]);

  // helpers por sección
  const addRowToSeccion = (opId: string) =>
    setDraftSecciones(prev => prev.map(s => s.operarioId === opId ? { ...s, lineas: [...s.lineas, emptyLinea()] } : s));

  const removeRowFromSeccion = (opId: string, rowId: string) =>
    setDraftSecciones(prev => prev.map(s =>
      s.operarioId === opId ? { ...s, lineas: s.lineas.filter(r => r.id !== rowId) } : s
    ));

  const updateRowInSeccion = (opId: string, rowId: string, patch: Partial<DraftLinea>) =>
    setDraftSecciones(prev => prev.map(s =>
      s.operarioId === opId
        ? { ...s, lineas: s.lineas.map(r => r.id === rowId ? { ...r, ...patch } : r) }
        : s
    ));

  const addExtraSeccion = (opId: string) => {
    if (!opId || draftSecciones.some(s => s.operarioId === opId)) return;
    setDraftSecciones(prev => [...prev, emptySeccion(opId)]);
  };

  const removeSeccion = (opId: string) =>
    setDraftSecciones(prev => prev.filter(s => s.operarioId !== opId));

  const operarioMap = useMemo(() => new Map(operarios.map(o => [o.id, o])), [operarios]);
  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const corteMap = useMemo(() => new Map(cortes.map(c => [c.id, c])), [cortes]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c.nombre])), [colores]);

  const tarifasPorCorte = useMemo(() => {
    const map = new Map<string, typeof tarifasOperaciones>();
    cortes.forEach(c => {
      map.set(c.id, tarifasOperaciones.filter(t => t.productoId === c.productoId).sort((a, b) => a.orden - b.orden));
    });
    return map;
  }, [cortes, tarifasOperaciones]);

  const { lineasFiltradas } = useBoletaLineas(boletaLineas, {
    operarioId: selectedOperario,
    periodo: selectedPeriodo,
    desde: bDesde,
    hasta: bHasta,
    corteId: bCorteId,
    estado: bEstado,
  });

  // totalBruto usando cantPrendas real por operario (solo tallas asignadas a este operario)
  const totalBruto = useMemo(() => lineasFiltradas.reduce((sum, b) => {
    if (b.talla) return sum + b.importe;
    const filasSeg = seguimientoFilas.filter(f => {
      if (f.corteId !== b.corteId) return false;
      if (b.colorId && f.colorId !== b.colorId) return false;
      const asig = f.asignaciones.find(a => a.tarifaId === b.tarifaId && a.confirmado === true);
      if (!asig) return false;
      const ids = asig.operarioIds?.filter(Boolean).length
        ? asig.operarioIds!.filter(Boolean)
        : (asig.operarioId ? [asig.operarioId] : []);
      return ids.includes(b.operarioId);
    });
    if (filasSeg.length === 0) return sum + b.importe;
    const cantReal = filasSeg.reduce((s, fila) => {
      const asig = fila.asignaciones.find(a => a.tarifaId === b.tarifaId && a.confirmado === true);
      const ids = asig?.operarioIds?.filter(Boolean).length
        ? asig!.operarioIds!.filter(Boolean)
        : (asig?.operarioId ? [asig.operarioId] : []);
      return s + (ids.length > 1 ? Math.round(fila.cantidad / ids.length) : fila.cantidad);
    }, 0);
    return sum + cantReal * b.tarifa;
  }, 0), [lineasFiltradas, seguimientoFilas]);

  // Vista general: todas las líneas con filtros opcionales
  const todasOperaciones = useMemo(() => {
    const ops = new Set<string>();
    boletaLineas.forEach(b => ops.add(b.operacion));
    return Array.from(ops).sort();
  }, [boletaLineas]);

  const lineasGenerales = useLineasGenerales(boletaLineas, {
    operarioId: gOperarioId,
    operacion: gOperacion,
    periodo: gPeriodo,
    estado: gEstado,
    corteId: gCorteId,
  });

  const totalGeneral = lineasGenerales.reduce((s, b) => s + b.importe, 0);

  const TALLA_ORDER: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5, XXXL: 6 };
  const tallaCmp = (a: string, b: string) =>
    (TALLA_ORDER[a] ?? 99) - (TALLA_ORDER[b] ?? 99) || a.localeCompare(b);

  // ── Tab: Por Corte — operarios asignados con sus operaciones confirmadas ──
  const pcCorte = useMemo(() => cortes.find(c => c.id === pcCorteId) ?? null, [cortes, pcCorteId]);

  // Operaciones disponibles para el corte seleccionado (desde tarifas del producto)
  const pcOperaciones = useMemo(() => {
    if (!pcCorte) return [];
    return tarifasOperaciones
      .filter(t => t.productoId === pcCorte.productoId)
      .sort((a, b) => a.orden - b.orden);
  }, [pcCorte, tarifasOperaciones]);

  // Filas de seguimiento del corte filtradas por operación si aplica
  type PcFila = {
    operarioId: string;
    operacion: string;
    orden: number;
    tarifaId: string;
    tarifa: number;
    colorId: string;
    talla: string;
    cantidad: number;
  };

  const pcFilas = useMemo((): PcFila[] => {
    if (!pcCorteId) return [];
    const result: PcFila[] = [];
    const filasCorte = seguimientoFilas.filter(f => f.corteId === pcCorteId);
    for (const fila of filasCorte) {
      for (const asig of fila.asignaciones) {
        if (!asig.confirmado) continue;
        const tarifa = tarifasOperaciones.find(t => t.id === asig.tarifaId);
        if (!tarifa) continue;
        if (pcOperacion && tarifa.operacion !== pcOperacion) continue;
        const opIds = asig.operarioIds?.filter(Boolean).length
          ? asig.operarioIds!.filter(Boolean)
          : asig.operarioId ? [asig.operarioId] : [];
        for (const opId of opIds) {
          result.push({
            operarioId: opId,
            operacion: tarifa.operacion,
            orden: tarifa.orden,
            tarifaId: tarifa.id,
            tarifa: tarifa.tarifa,
            colorId: fila.colorId,
            talla: fila.talla,
            cantidad: opIds.length > 1 ? Math.round(fila.cantidad / opIds.length) : fila.cantidad,
          });
        }
      }
    }
    return result;
  }, [pcCorteId, seguimientoFilas, tarifasOperaciones, pcOperacion]);

  // Agrupar por operario → operaciones → colores/tallas
  type PcOperarioRow = {
    operarioId: string;
    operaciones: {
      operacion: string;
      orden: number;
      tarifaId: string;
      tarifa: number;
      totalPrendas: number;
      totalImporte: number;
      detalle: { colorId: string; talla: string; cantidad: number }[];
    }[];
    totalPrendas: number;
    totalImporte: number;
  };

  const pcResumen = useMemo((): PcOperarioRow[] => {
    const byOp = new Map<string, PcOperarioRow>();

    // Primero: operarios con asignaciones confirmadas en seguimiento
    for (const f of pcFilas) {
      if (!byOp.has(f.operarioId)) {
        byOp.set(f.operarioId, { operarioId: f.operarioId, operaciones: [], totalPrendas: 0, totalImporte: 0 });
      }
      const opRow = byOp.get(f.operarioId)!;
      let opEntry = opRow.operaciones.find(o => o.tarifaId === f.tarifaId);
      if (!opEntry) {
        opEntry = { operacion: f.operacion, orden: f.orden, tarifaId: f.tarifaId, tarifa: f.tarifa, totalPrendas: 0, totalImporte: 0, detalle: [] };
        opRow.operaciones.push(opEntry);
      }
      opEntry.detalle.push({ colorId: f.colorId, talla: f.talla, cantidad: f.cantidad });
      opEntry.totalPrendas += f.cantidad;
      opEntry.totalImporte += f.cantidad * f.tarifa;
      opRow.totalPrendas += f.cantidad;
      opRow.totalImporte += f.cantidad * f.tarifa;
    }

    // Segundo: operarios que tienen líneas de boleta para este corte pero no están en seguimiento
    // (ej: asignaciones desconfirmadas después de pagar, o carga manual)
    if (pcCorteId) {
      const lineasCorte = boletaLineas.filter(b => b.corteId === pcCorteId && b.importe > 0);
      for (const b of lineasCorte) {
        if (byOp.has(b.operarioId)) continue; // ya está desde seguimiento
        if (!byOp.has(b.operarioId)) {
          byOp.set(b.operarioId, { operarioId: b.operarioId, operaciones: [], totalPrendas: 0, totalImporte: 0 });
        }
        const opRow = byOp.get(b.operarioId)!;
        let opEntry = opRow.operaciones.find(o => o.tarifaId === b.tarifaId);
        if (!opEntry) {
          opEntry = { operacion: b.operacion, orden: b.orden, tarifaId: b.tarifaId, tarifa: b.tarifa, totalPrendas: 0, totalImporte: 0, detalle: [] };
          opRow.operaciones.push(opEntry);
        }
        opEntry.detalle.push({ colorId: b.colorId ?? '', talla: b.talla ?? '', cantidad: b.cantPrendas });
        opEntry.totalPrendas += b.cantPrendas;
        opEntry.totalImporte += b.importe;
        opRow.totalPrendas += b.cantPrendas;
        opRow.totalImporte += b.importe;
      }
    }

    return Array.from(byOp.values()).sort((a, b) => {
      const na = operarioMap.get(a.operarioId)?.nombre ?? '';
      const nb = operarioMap.get(b.operarioId)?.nombre ?? '';
      return na.localeCompare(nb);
    }).map(r => ({
      ...r,
      operaciones: r.operaciones.sort((a, b) => a.orden - b.orden).map(op => ({
        ...op,
        detalle: [...op.detalle].sort((a, b) => {
          const ca = colorMap.get(a.colorId) ?? a.colorId;
          const cb = colorMap.get(b.colorId) ?? b.colorId;
          return ca.localeCompare(cb) || tallaCmp(a.talla, b.talla);
        }),
      })),
    }));
  }, [pcFilas, pcCorteId, boletaLineas, operarioMap, colorMap, tallaCmp]);

  const pcResumenFiltrado = useMemo(() => {
    let result = pcOperarioId ? pcResumen.filter(r => r.operarioId === pcOperarioId) : pcResumen;
    if (pcEstado) {
      result = result.filter(r => {
        const tarifaIds = new Set(r.operaciones.map(o => o.tarifaId));
        const lineasOp = boletaLineas.filter(
          b => b.operarioId === r.operarioId &&
               b.corteId === pcCorteId &&
               tarifaIds.has(b.tarifaId) &&
               b.importe > 0
        );
        if (lineasOp.length === 0) return pcEstado === 'PENDIENTE';
        const hayPendiente = lineasOp.some(b => b.estadoPago === 'PENDIENTE');
        return pcEstado === 'PAGADO' ? !hayPendiente : hayPendiente;
      });
    }
    return result;
  }, [pcResumen, pcOperarioId, pcEstado, boletaLineas, pcCorteId]);

  // Resumen por operario en un período dado (o rango libre)
  const resumenPorOperario = useResumenPorOperario(boletaLineas, {
    periodo: rPeriodo,
    desde: rDesde,
    hasta: rHasta,
  });

  const lineasDetalle = useMemo(() => {
    if (!detalleOperarioId) return [];
    const usaRango = rDesde || rHasta;
    return boletaLineas
      .filter(b => {
        if (b.operarioId !== detalleOperarioId) return false;
        if (usaRango) {
          if (rDesde && b.periodo.slice(0, 7) < rDesde.slice(0, 7)) return false;
          if (rHasta && b.periodo.slice(0, 7) > rHasta.slice(0, 7)) return false;
          return true;
        }
        return b.periodo.slice(0, 7) === rPeriodo.slice(0, 7);
      })
      .sort((a, b) => String(a.nCorte).localeCompare(String(b.nCorte)) || a.orden - b.orden);
  }, [boletaLineas, detalleOperarioId, rPeriodo, rDesde, rHasta]);

  const descuentosFiltrados = useMemo(() =>
    descuentosBoleta.filter(d => d.operarioId === selectedOperario && d.periodo === selectedPeriodo),
    [descuentosBoleta, selectedOperario, selectedPeriodo]
  );
  const totalDescuentos = descuentosFiltrados.reduce((s, d) => s + d.monto, 0);
  const descuentoFijo = totalBruto * 0.01;
  const totalNeto = totalBruto - descuentoFijo - totalDescuentos;

  const pendientes = lineasFiltradas.filter(b => b.estadoPago === 'PENDIENTE');
  const pagadas = lineasFiltradas.filter(b => b.estadoPago === 'PAGADO');

  const buildLineasParaOperario = (opId: string, lineas: DraftLinea[]): BoletaLinea[] => {
    const result: BoletaLinea[] = [];
    for (const r of lineas) {
      if (!r.corteId || !r.tarifaId || !r.cantPrendas) continue;
      const tarifa = tarifasOperaciones.find(t => t.id === r.tarifaId);
      const corte = corteMap.get(r.corteId);
      if (!tarifa || !corte) continue;
      const cant = parseInt(r.cantPrendas) || 0;
      result.push({
        id: newId(),
        operarioId: opId,
        corteId: r.corteId,
        nCorte: corte.nCorte,
        productoId: corte.productoId,
        tarifaId: tarifa.id,
        operacion: tarifa.operacion,
        orden: tarifa.orden,
        tarifa: tarifa.tarifa,
        cantPrendas: cant,
        importe: cant * tarifa.tarifa,
        periodo: selectedPeriodo,
        fechaRegistro: new Date().toISOString().slice(0, 10),
        estadoPago: 'PENDIENTE',
      });
    }
    return result;
  };

  const handleAddLineas = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevas: BoletaLinea[] = draftSecciones.flatMap(s => buildLineasParaOperario(s.operarioId, s.lineas));
    if (nuevas.length === 0) {
      addToast('Completa al menos una línea con corte, operación y cantidad', 'error');
      return;
    }
    const conTarifaCero = nuevas.filter(l => l.tarifa === 0).length;
    if (conTarifaCero > 0) {
      addToast(`${conTarifaCero} línea${conTarifaCero > 1 ? 's' : ''} con tarifa S/ 0.00 — verifica las tarifas antes de confirmar`, 'info');
    }
    addBoletaLineas(nuevas);
    const nOps = draftSecciones.filter(s => buildLineasParaOperario(s.operarioId, s.lineas).length > 0).length;
    addToast(`${nuevas.length} línea${nuevas.length !== 1 ? 's' : ''} guardada${nuevas.length !== 1 ? 's' : ''} para ${nOps} operario${nOps > 1 ? 's' : ''}`, 'success');
    setShowForm(false);
    resetDraft();
  };

  const handleBulkAdd = () => {
    if (!selectedOperario || !bulkCorteId) {
      addToast('Selecciona operario y corte', 'error');
      return;
    }
    const corte = corteMap.get(bulkCorteId);
    if (!corte) return;

    // Recolectar combinaciones (tarifaId, colorId) asignadas a este operario en las filas del corte
    const filasCorte = seguimientoFilas.filter(f => f.corteId === bulkCorteId);
    // Map: tarifaId → Set<colorId>
    const asignaciones = new Map<string, Set<string>>();
    for (const fila of filasCorte) {
      for (const asig of fila.asignaciones) {
        const esEsteOp = asig.operarioId === selectedOperario || (asig.operarioIds ?? []).includes(selectedOperario);
        if (esEsteOp && asig.confirmado === true) {
          if (!asignaciones.has(asig.tarifaId)) asignaciones.set(asig.tarifaId, new Set());
          asignaciones.get(asig.tarifaId)!.add(fila.colorId);
        }
      }
    }

    const todasTarifas = tarifasOperaciones.filter(t => t.productoId === corte.productoId).sort((a, b) => a.orden - b.orden);

    const lineas: BoletaLinea[] = [];
    const hoy = new Date().toISOString().slice(0, 10);

    if (asignaciones.size > 0) {
      // Generar una línea por cada (tarifa, color) asignado
      for (const t of todasTarifas) {
        const coloresAsig = asignaciones.get(t.id);
        if (!coloresAsig) continue;
        for (const colorId of coloresAsig) {
          lineas.push({
            id: newId(),
            operarioId: selectedOperario,
            corteId: bulkCorteId,
            nCorte: corte.nCorte,
            productoId: corte.productoId,
            colorId,
            tarifaId: t.id,
            operacion: t.operacion,
            orden: t.orden,
            tarifa: t.tarifa,
            cantPrendas: 0,
            importe: 0,
            periodo: selectedPeriodo,
            fechaRegistro: hoy,
            estadoPago: 'PENDIENTE',
          });
        }
      }
    } else {
      // Sin asignaciones confirmadas para este operario en este corte — no cargar nada
      addToast('Este operario no tiene operaciones asignadas en ese corte', 'error');
      return;
    }

    if (lineas.length === 0) {
      addToast('No hay tarifas para ese producto', 'error');
      return;
    }

    // Filtrar las que ya existen para ese operario+corte+período (evita duplicados)
    const nuevas = lineas.filter(l =>
      !boletaLineas.some(
        b => b.operarioId === l.operarioId &&
             b.corteId === l.corteId &&
             b.tarifaId === l.tarifaId &&
             b.periodo === l.periodo &&
             (l.colorId ? b.colorId === l.colorId : !b.colorId)
      )
    );

    if (nuevas.length === 0) {
      addToast('Esas operaciones ya están cargadas', 'info');
      return;
    }
    addBoletaLineas(nuevas);
    addToast(`${nuevas.length} operacion${nuevas.length !== 1 ? 'es' : ''} cargada${nuevas.length !== 1 ? 's' : ''}`, 'success');
    setBulkCorteId('');
  };

  const handleDeleteBoletaLinea = (b: BoletaLinea) => {
    // Limpiar la asignación del operario en las filas de seguimiento que corresponden
    const filasAfectadas = seguimientoFilas.filter(
      f => f.corteId === b.corteId && (!b.colorId || f.colorId === b.colorId)
    );
    for (const fila of filasAfectadas) {
      const nuevasAsignaciones = fila.asignaciones.map(a =>
        a.tarifaId === b.tarifaId && a.operarioId === b.operarioId
          ? { ...a, operarioId: '', pago: 0 }
          : a
      );
      const totalPago = nuevasAsignaciones.reduce((s, a) => s + a.pago, 0);
      const assignedCount = nuevasAsignaciones.filter(a => a.operarioId).length;
      const pctAvance = nuevasAsignaciones.length > 0
        ? Math.round((assignedCount / nuevasAsignaciones.length) * 100)
        : 0;
      updateSeguimientoFila(fila.id, { asignaciones: nuevasAsignaciones, totalPago, pctAvance });
    }
    deleteBoletaLinea(b.id);
  };

  const handleMarcarPagado = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    pendientes.forEach(b => updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: hoy }));
    addToast('Boleta marcada como pagada', 'success');
  };

  const buildDestajoRows = () => lineasFiltradas.map((b) => ({
    NCorte: b.nCorte,
    Color: b.colorId ? (colorMap.get(b.colorId) ?? b.colorId) : '',
    Operacion: b.operacion,
    Tarifa: b.tarifa.toFixed(2),
    Prendas: b.cantPrendas,
    Importe: b.importe.toFixed(2),
    EstadoPago: b.estadoPago,
    FechaPago: b.fechaPago ?? '',
    Periodo: b.periodo,
  }));

  const exportarDestajo = () => {
    exportRowsToXlsx(buildDestajoRows(), `destajo_${selectedPeriodo}.xlsx`, 'Destajo');
    addToast('Excel exportado', 'success');
  };

  const exportarDestajoPdf = () => {
    const operario = operarioMap.get(selectedOperario);
    exportTableToPdf({
      title: 'Destajo',
      subtitle: `${operario?.nombre ?? selectedOperario} — Período ${selectedPeriodo}`,
      fileName: `destajo_${operario?.codigo ?? selectedOperario}_${selectedPeriodo}`,
      columns: [
        { header: 'N° Corte', dataKey: 'NCorte' },
        { header: 'Color', dataKey: 'Color' },
        { header: 'Operación', dataKey: 'Operacion' },
        { header: 'Tarifa', dataKey: 'Tarifa' },
        { header: 'Prendas', dataKey: 'Prendas' },
        { header: 'Importe S/.', dataKey: 'Importe' },
        { header: 'Estado Pago', dataKey: 'EstadoPago' },
        { header: 'Fecha Pago', dataKey: 'FechaPago' },
        { header: 'Período', dataKey: 'Periodo' },
      ],
      rows: buildDestajoRows(),
      rightCols: ['Tarifa', 'Importe'],
      centerCols: ['Prendas', 'EstadoPago'],
      orientation: 'portrait',
    });
    addToast('PDF exportado', 'success');
  };

  // ── Boletas huérfanas: líneas sin respaldo en seguimiento_filas confirmado ──
  const [huerfanasExpanded, setHuerfanasExpanded] = useState(false);

  const boletasHuerfanas = useBoletasHuerfanas(boletaLineas, seguimientoFilas);

  const eliminarHuerfanas = () => {
    boletasHuerfanas.forEach(b => deleteBoletaLinea(b.id));
    addToast(`${boletasHuerfanas.length} línea${boletasHuerfanas.length !== 1 ? 's' : ''} huérfana${boletasHuerfanas.length !== 1 ? 's' : ''} eliminada${boletasHuerfanas.length !== 1 ? 's' : ''}`, 'success');
    setHuerfanasExpanded(false);
  };

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {/* Encabezado + tabs */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Destajo</h2>
            <p className="text-xs text-gray-500 mt-1">Pago por destajo — prendas × tarifa con descuentos configurables por operario</p>
          </div>
          <ModuleInfoBox
            accent="#3E8C5F"
            titulo="Destajo"
            descripcion="Liquida el pago de cada operario por período. Calcula el importe como prendas × tarifa, aplica descuentos (adelantos, préstamos, faltas) y genera una boleta imprimible por operario."
            items={[
              { label: 'Mi Boleta', detail: 'Líneas de pago por operario y período con descuentos desglosados' },
              { label: 'Resumen', detail: 'Totales por período con rango de fechas libre y ranking de pago' },
              { label: 'Vista General', detail: 'Tabla consolidada de todas las boletas con estado PENDIENTE/PAGADO' },
              { label: 'Boleta imprimible', detail: 'PDF con detalle de operaciones, tarifas, descuentos y neto a pagar' },
            ]}
          />
        </div>
        {/* Sección boletas huérfanas */}
        {boletasHuerfanas.length > 0 && (
          <div className="mt-4 border border-amber-200 bg-amber-50 rounded">
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
              onClick={() => setHuerfanasExpanded(v => !v)}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-[11px] font-bold text-amber-800 flex-1">
                {boletasHuerfanas.length} línea{boletasHuerfanas.length !== 1 ? 's' : ''} sin respaldo en seguimiento
              </span>
              <span className="text-[10px] text-amber-600 mr-2">Estas boletas no tienen una operación confirmada en Confección</span>
              {huerfanasExpanded ? <ChevronDown className="h-3.5 w-3.5 text-amber-500" /> : <ChevronRight className="h-3.5 w-3.5 text-amber-500" />}
            </button>
            {huerfanasExpanded && (
              <div className="px-4 pb-3 space-y-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-widest text-amber-700 border-b border-amber-200">
                        <th className="text-left py-1 pr-3">N° Corte</th>
                        <th className="text-left py-1 pr-3">Operario</th>
                        <th className="text-left py-1 pr-3">Color</th>
                        <th className="text-left py-1 pr-3">Operación</th>
                        <th className="text-right py-1 pr-3">Prendas</th>
                        <th className="text-right py-1 pr-3">Importe</th>
                        <th className="text-left py-1">Período</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boletasHuerfanas.map(b => {
                        const op = operarioMap.get(b.operarioId);
                        return (
                          <tr key={b.id} className="border-b border-amber-100 last:border-0">
                            <td className="py-1 pr-3 font-mono">{b.nCorte}</td>
                            <td className="py-1 pr-3">{op?.nombre ?? op?.codigo ?? b.operarioId}</td>
                            <td className="py-1 pr-3">{colorMap.get(b.colorId) ?? b.colorId}</td>
                            <td className="py-1 pr-3">{b.operacion}</td>
                            <td className="py-1 pr-3 text-right font-mono">{b.cantPrendas}</td>
                            <td className="py-1 pr-3 text-right font-mono">S/ {b.importe.toFixed(2)}</td>
                            <td className="py-1 text-gray-500">{b.periodo}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {esAdmin && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={eliminarHuerfanas}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 border border-red-200 bg-white hover:bg-red-50 px-3 py-1.5 rounded"
                    >
                      <Trash2 className="h-3 w-3" /> Eliminar todas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-1 mt-4 border-b border-[#DDD8CF]">
          {([
            { key: 'boleta', label: 'Mi Boleta', icon: Receipt },
            { key: 'resumen', label: 'Resumen', icon: BarChart2 },
            { key: 'general', label: 'Vista General', icon: Users },
            { key: 'porcorte', label: 'Por Corte', icon: Scissors },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors ${
                activeTab === key
                  ? 'border-[#B66F35] text-[#1a1a1a]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ TAB: RESUMEN ══════════════ */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Período</label>
              <select value={rPeriodo} onChange={e => { setRPeriodo(e.target.value); setRDesde(''); setRHasta(''); }} className="input-base w-36">
                {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">o rango</span>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Desde</label>
              <input type="month" value={rDesde} onChange={e => setRDesde(e.target.value)} className="input-base w-36" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Hasta</label>
              <input type="month" value={rHasta} onChange={e => setRHasta(e.target.value)} className="input-base w-36" />
            </div>
            {(rDesde || rHasta) && (
              <button onClick={() => { setRDesde(''); setRHasta(''); }} className="text-[10px] font-bold uppercase text-gray-400 border border-gray-200 px-2 py-1 hover:bg-gray-50">
                Limpiar rango
              </button>
            )}
          </div>
          {resumenPorOperario.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin datos para este período.</p>
          ) : (
            <div className="bg-white border border-gray-200 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Operario', 'Prendas', 'Líneas', 'Total Bruto', 'Pagado', 'Pendiente', 'Acción'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-3 py-2 text-[10px] text-gray-400 font-normal normal-case tracking-normal">← clic fila para ver detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resumenPorOperario.map(r => {
                    const op = operarioMap.get(r.operarioId);
                    return (
                      <tr key={r.operarioId} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDetalleOperarioId(r.operarioId)}>
                        <td className="px-3 py-2">
                          <div className="font-bold">{op?.nombre ?? r.operarioId}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{op?.codigo}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-right">{r.prendas.toLocaleString()}</td>
                        <td className="px-3 py-2 font-mono text-right">{r.nLineas}</td>
                        <td className="px-3 py-2 font-mono text-right font-bold">S/ {r.total.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-right text-green-700">S/ {r.pagado.toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono text-right text-yellow-700">S/ {r.pendiente.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          {r.pendiente > 0 && (
                            <button
                              onClick={() => {
                                const hoy = new Date().toISOString().slice(0, 10);
                                const usaRango = rDesde || rHasta;
                                boletaLineas
                                  .filter(b => {
                                    if (b.operarioId !== r.operarioId || b.estadoPago !== 'PENDIENTE') return false;
                                    if (usaRango) {
                                      if (rDesde && b.periodo.slice(0, 7) < rDesde.slice(0, 7)) return false;
                                      if (rHasta && b.periodo.slice(0, 7) > rHasta.slice(0, 7)) return false;
                                      return true;
                                    }
                                    return b.periodo.slice(0, 7) === rPeriodo.slice(0, 7);
                                  })
                                  .forEach(b => updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: hoy }));
                                addToast(`${op?.nombre ?? r.operarioId} marcado como pagado`, 'success');
                              }}
                              className="text-[10px] font-bold uppercase text-green-700 border border-green-300 px-2 py-0.5 hover:bg-green-50 whitespace-nowrap"
                            >Marcar Pagado</button>
                          )}
                          {r.pendiente === 0 && r.total > 0 && (
                            <span className="text-[10px] font-bold uppercase text-green-700">✓ Pagado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</td>
                    <td className="px-3 py-2 font-mono text-right font-bold">{resumenPorOperario.reduce((s, r) => s + r.prendas, 0).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-right">{resumenPorOperario.reduce((s, r) => s + r.nLineas, 0)}</td>
                    <td className="px-3 py-2 font-mono text-right font-black">S/ {resumenPorOperario.reduce((s, r) => s + r.total, 0).toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-right font-bold text-green-700">S/ {resumenPorOperario.reduce((s, r) => s + r.pagado, 0).toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-right font-bold text-yellow-700">S/ {resumenPorOperario.reduce((s, r) => s + r.pendiente, 0).toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal detalle operario desde Resumen */}
      {detalleOperarioId && (() => {
        const op = operarioMap.get(detalleOperarioId);
        const pendientesDetalle = lineasDetalle.filter(b => b.estadoPago === 'PENDIENTE');
        const totalDetalleNeto = lineasDetalle.reduce((s, b) => s + b.importe, 0);

        const pagarTalla = (linea: (typeof lineasDetalle)[0], talla: 'S' | 'M' | 'L' | 'XL', cantTalla: number) => {
          const hoy = new Date().toISOString().slice(0, 10);
          // Buscar si ya existe sub-línea con esta talla para esta boleta
          const yaExiste = boletaLineas.find(
            b => b.operarioId === linea.operarioId &&
                 b.corteId === linea.corteId &&
                 b.tarifaId === linea.tarifaId &&
                 b.colorId === linea.colorId &&
                 b.talla === talla
          );
          if (yaExiste) {
            // Solo marcar pagado
            updateBoletaLinea(yaExiste.id, { estadoPago: 'PAGADO', fechaPago: hoy });
          } else {
            // Crear sub-línea con la talla y marcarla pagada
            const subLinea = {
              id: newId(),
              operarioId: linea.operarioId,
              corteId: linea.corteId,
              nCorte: linea.nCorte,
              productoId: linea.productoId,
              colorId: linea.colorId,
              talla,
              tarifaId: linea.tarifaId,
              operacion: linea.operacion,
              orden: linea.orden,
              tarifa: linea.tarifa,
              cantPrendas: cantTalla,
              importe: cantTalla * linea.tarifa,
              periodo: linea.periodo,
              fechaRegistro: linea.fechaRegistro,
              estadoPago: 'PAGADO' as const,
              fechaPago: hoy,
            };
            addBoletaLinea(subLinea);
            // Reducir la línea original en las prendas pagadas por talla
            const nuevaCant = linea.cantPrendas - cantTalla;
            if (nuevaCant <= 0) {
              updateBoletaLinea(linea.id, { cantPrendas: 0, importe: 0, estadoPago: 'PAGADO', fechaPago: hoy });
            } else {
              updateBoletaLinea(linea.id, { cantPrendas: nuevaCant, importe: nuevaCant * linea.tarifa });
            }
          }
          addToast(`Talla ${talla} marcada como pagada`, 'success');
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setDetalleOperarioId(null); setExpandedLineaId(null); }}>
            <div className="bg-white w-full max-w-4xl rounded shadow-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="font-black text-sm">{op?.nombre ?? detalleOperarioId}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {op?.codigo} · Período {rDesde || rHasta ? `${rDesde || '…'} → ${rHasta || '…'}` : rPeriodo} · {lineasDetalle.length} líneas
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {pendientesDetalle.length > 0 && (
                    <button
                      onClick={() => {
                        const hoy = new Date().toISOString().slice(0, 10);
                        pendientesDetalle.forEach(b => updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: hoy }));
                        addToast(`${op?.nombre ?? detalleOperarioId} marcado como pagado`, 'success');
                        setDetalleOperarioId(null);
                        setExpandedLineaId(null);
                      }}
                      className="text-[11px] font-bold uppercase text-green-700 border border-green-300 px-3 py-1.5 hover:bg-green-50"
                    >
                      Marcar todo pagado · S/ {pendientesDetalle.reduce((s, b) => s + b.importe, 0).toFixed(2)}
                    </button>
                  )}
                  <button onClick={() => { setDetalleOperarioId(null); setExpandedLineaId(null); }} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Tabla */}
              <div className="overflow-y-auto flex-1">
                {lineasDetalle.length === 0 ? (
                  <p className="text-sm text-gray-400 italic p-6">Sin líneas para este período.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#1C1915]">
                      <tr>
                        <th className="w-6" />
                        {['N° Corte', 'Color', 'Talla', 'Operación', 'Tarifa', 'Prendas', 'Importe', 'Estado', 'F. Pago', ''].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 font-mono font-bold uppercase text-[9px] tracking-widest text-[#6B6058] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineasDetalle.map((b, i) => {
                        const isExpanded = expandedLineaId === b.id;
                        // Tallas de este operario para este corte+color+tarifa
                        const tallasFilas = seguimientoFilas.filter(f => {
                          if (f.corteId !== b.corteId) return false;
                          if (b.colorId && f.colorId !== b.colorId) return false;
                          const asig = f.asignaciones.find(a => a.tarifaId === b.tarifaId && a.confirmado === true);
                          if (!asig) return false;
                          const ids = asig.operarioIds?.filter(Boolean).length
                            ? asig.operarioIds!.filter(Boolean)
                            : (asig.operarioId ? [asig.operarioId] : []);
                          return ids.includes(b.operarioId);
                        });
                        const tieneTallas = tallasFilas.length >= 1 && !b.talla;

                        return (
                          <React.Fragment key={b.id}>
                            <tr
                              className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${b.estadoPago === 'PAGADO' ? 'opacity-60' : ''} ${tieneTallas && b.estadoPago === 'PENDIENTE' ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                              onClick={() => tieneTallas && b.estadoPago === 'PENDIENTE' && setExpandedLineaId(isExpanded ? null : b.id)}
                            >
                              <td className="px-2 py-2 text-center">
                                {tieneTallas && b.estadoPago === 'PENDIENTE' && (
                                  <span className="text-[10px] text-blue-400 font-bold">{isExpanded ? '▲' : '▼'}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono font-black text-[#1A1A1A]">{b.nCorte}</td>
                              <td className="px-3 py-2 text-gray-600">{b.colorId ? (colorMap.get(b.colorId) ?? '—') : '—'}</td>
                              <td className="px-3 py-2 font-mono text-gray-400 text-[10px]">{b.talla ?? (tieneTallas ? <span className="text-blue-400 italic">ver tallas ▼</span> : '—')}</td>
                              <td className="px-3 py-2 text-gray-700">{b.operacion}</td>
                              <td className="px-3 py-2 font-mono text-right">S/ {b.tarifa.toFixed(3)}</td>
                              <td className="px-3 py-2 font-mono text-right">{b.cantPrendas.toLocaleString()}</td>
                              <td className="px-3 py-2 font-mono text-right font-black text-[#1A1A1A]">S/ {b.importe.toFixed(2)}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-block px-2 py-0.5 font-mono font-bold text-[9px] uppercase tracking-wide rounded ${
                                  b.estadoPago === 'PAGADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {b.estadoPago}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-gray-400 text-[10px]">{b.fechaPago ?? '—'}</td>
                              <td className="px-3 py-2">
                                {b.estadoPago === 'PENDIENTE' && !tieneTallas && (
                                  <button
                                    onClick={e => { e.stopPropagation(); const hoy = new Date().toISOString().slice(0, 10); updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: hoy }); addToast('Línea marcada pagada', 'success'); }}
                                    className="text-[9px] font-bold uppercase text-green-700 border border-green-300 px-2 py-0.5 hover:bg-green-50 whitespace-nowrap"
                                  >Pagar</button>
                                )}
                              </td>
                            </tr>
                            {/* Sub-filas por talla */}
                            {isExpanded && tallasFilas.map(fila => {
                              const subLinea = boletaLineas.find(
                                bl => bl.operarioId === b.operarioId &&
                                      bl.corteId === b.corteId &&
                                      bl.tarifaId === b.tarifaId &&
                                      bl.colorId === b.colorId &&
                                      bl.talla === fila.talla
                              );
                              const yaPagada = subLinea?.estadoPago === 'PAGADO';
                              const asig = fila.asignaciones.find(a => a.tarifaId === b.tarifaId && a.confirmado === true);
                              const ids = asig?.operarioIds?.filter(Boolean).length
                                ? asig!.operarioIds!.filter(Boolean)
                                : (asig?.operarioId ? [asig.operarioId] : []);
                              const cantOperario = ids.length > 1 ? Math.round(fila.cantidad / ids.length) : fila.cantidad;
                              return (
                                <tr key={`${b.id}-${fila.talla}`} className="bg-blue-50 border-l-4 border-blue-200">
                                  <td />
                                  <td className="px-3 py-1.5 font-mono text-gray-400 text-[10px]">↳</td>
                                  <td className="px-3 py-1.5 text-gray-500 text-[10px]">{colorMap.get(fila.colorId) ?? '—'}</td>
                                  <td className="px-3 py-1.5 font-mono font-black text-[11px] text-blue-700">{fila.talla}</td>
                                  <td className="px-3 py-1.5 text-gray-500 text-[10px]">{b.operacion}</td>
                                  <td className="px-3 py-1.5 font-mono text-right text-[10px]">S/ {b.tarifa.toFixed(3)}</td>
                                  <td className="px-3 py-1.5 font-mono text-right font-bold text-[11px]">{cantOperario}</td>
                                  <td className="px-3 py-1.5 font-mono text-right font-black text-[11px]">S/ {(cantOperario * b.tarifa).toFixed(2)}</td>
                                  <td className="px-3 py-1.5">
                                    {yaPagada ? (
                                      <span className="inline-block px-2 py-0.5 font-mono font-bold text-[9px] uppercase tracking-wide rounded bg-green-100 text-green-700">Pagado</span>
                                    ) : (
                                      <span className="inline-block px-2 py-0.5 font-mono font-bold text-[9px] uppercase tracking-wide rounded bg-yellow-100 text-yellow-700">Pendiente</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 font-mono text-gray-400 text-[10px]">{subLinea?.fechaPago ?? '—'}</td>
                                  <td className="px-3 py-1.5">
                                    {!yaPagada && (
                                      <button
                                        onClick={e => { e.stopPropagation(); pagarTalla(b, fila.talla, cantOperario); }}
                                        className="text-[9px] font-bold uppercase text-green-700 border border-green-300 px-2 py-0.5 hover:bg-green-50 whitespace-nowrap"
                                      >Pagar talla</button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                      <tr>
                        <td colSpan={6} className="px-3 py-2.5 font-mono font-bold text-xs text-gray-500 uppercase">Total — {lineasDetalle.length} líneas</td>
                        <td className="px-3 py-2.5 font-mono font-black text-right text-[#1A1A1A]">S/ {totalDetalleNeto.toFixed(2)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════ TAB: VISTA GENERAL ══════════════ */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-wrap gap-4 bg-white border border-[#DDD8CF] p-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Operario</label>
              <select value={gOperarioId} onChange={e => setGOperarioId(e.target.value)} className="input-base w-52">
                <option value="">Todos</option>
                {operarios.map(o => (
                  <option key={o.id} value={o.id}>{o.codigo} — {o.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Operación</label>
              <select value={gOperacion} onChange={e => setGOperacion(e.target.value)} className="input-base w-52">
                <option value="">Todas</option>
                {todasOperaciones.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Período</label>
              <select value={gPeriodo} onChange={e => setGPeriodo(e.target.value)} className="input-base w-36">
                <option value="">Todos</option>
                {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Corte</label>
              <select value={gCorteId} onChange={e => setGCorteId(e.target.value)} className="input-base w-44">
                <option value="">Todos</option>
                {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
                  <option key={c.id} value={c.id}>{c.nCorte} — {productoMap.get(c.productoId)?.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Estado</label>
              <select value={gEstado} onChange={e => setGEstado(e.target.value as typeof gEstado)} className="input-base w-36">
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PAGADO">Pagado</option>
              </select>
            </div>
            {(gOperarioId || gOperacion || gPeriodo || gEstado || gCorteId) && (
              <div className="flex items-end">
                <button
                  onClick={() => { setGOperarioId(''); setGOperacion(''); setGPeriodo(''); setGEstado(''); setGCorteId(''); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-500 flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Limpiar
                </button>
              </div>
            )}
          </div>

          {/* Contador */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              {lineasGenerales.length} línea{lineasGenerales.length !== 1 ? 's' : ''}
              {lineasGenerales.length > 0 && (
                <span className="ml-3 text-[#1a1a1a]">Total S/ {totalGeneral.toFixed(2)}</span>
              )}
            </p>
          </div>

          {/* Tabla */}
          {lineasGenerales.length === 0 ? (
            <div className="texajo-table-shell">
              <div className="texajo-table-scroll">
                <table className="texajo-table">
                  <thead>
                    <tr>
                      {['Período', 'Operario', 'N° Corte', 'Producto', 'Operación', 'Tarifa', 'Prendas', 'Importe', 'Estado', ''].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={10} className="texajo-empty-row">Sin resultados</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="texajo-table-shell">
              <div className="texajo-table-scroll">
                <table className="texajo-table texajo-table--wide">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Operario</th>
                      <th>N° Corte</th>
                      <th>Producto</th>
                      <th>Color</th>
                      <th>Operación</th>
                      <th className="text-right">Tarifa</th>
                      <th className="text-right">Prendas</th>
                      <th className="text-right">Importe</th>
                      <th className="text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineasGenerales.map(b => {
                      const op = operarioMap.get(b.operarioId);
                      const rowBgG = b.estadoPago === 'PAGADO' ? 'bg-green-50 opacity-60' : 'bg-amber-50 hover:bg-amber-100';
                      return (
                        <tr key={b.id} className={rowBgG}>
                          <td className="font-mono text-xs">{b.periodo}</td>
                          <td>
                            <div className="font-bold text-[11px]">{op?.nombre ?? b.operarioId}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{op?.codigo}</div>
                          </td>
                          <td className="font-mono">{b.nCorte}</td>
                          <td className="text-[11px] text-gray-600">{productoMap.get(b.productoId)?.nombre ?? '—'}</td>
                          <td className="text-[11px]">{b.colorId ? colorMap.get(b.colorId) ?? '—' : '—'}</td>
                          <td>{b.operacion}</td>
                          <td className="text-right font-mono">S/ {b.tarifa.toFixed(3)}</td>
                          <td className="text-right font-mono">{b.cantPrendas}</td>
                          <td className="text-right font-mono font-bold">S/ {b.importe.toFixed(2)}</td>
                          <td className="text-center">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                              b.estadoPago === 'PAGADO'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {b.estadoPago}
                            </span>
                          </td>
                          <td className="px-2">
                            {confirmDelete === b.id ? (
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <button onClick={() => { handleDeleteBoletaLinea(b); setConfirmDelete(null); addToast('Línea eliminada', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                                <span className="text-gray-300">/</span>
                                <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                              </span>
                            ) : (
                              <button onClick={() => setConfirmDelete(b.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={8} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-4 py-3">
                        Total — {lineasGenerales.length} línea{lineasGenerales.length !== 1 ? 's' : ''}
                      </td>
                      <td className="text-right font-mono font-black px-4 py-3">S/ {totalGeneral.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB: POR CORTE ══════════════ */}
      {activeTab === 'porcorte' && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-wrap gap-4 bg-white border border-[#DDD8CF] p-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Corte</label>
              <select
                value={pcCorteId}
                onChange={e => { setPcCorteId(e.target.value); setPcOperacion(''); setPcOperarioId(''); setPcEstado(''); }}
                className="input-base w-56"
              >
                <option value="">Seleccionar corte…</option>
                {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
                  <option key={c.id} value={c.id}>{c.nCorte} — {productoMap.get(c.productoId)?.nombre}</option>
                ))}
              </select>
            </div>
            {pcCorteId && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Operación</label>
                <select
                  value={pcOperacion}
                  onChange={e => setPcOperacion(e.target.value)}
                  className="input-base w-52"
                >
                  <option value="">Todas</option>
                  {pcOperaciones.map(t => (
                    <option key={t.id} value={t.operacion}>{t.orden}. {t.operacion}</option>
                  ))}
                </select>
              </div>
            )}
            {pcCorteId && pcResumen.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Operario</label>
                <select
                  value={pcOperarioId}
                  onChange={e => setPcOperarioId(e.target.value)}
                  className="input-base w-52"
                >
                  <option value="">Todos</option>
                  {pcResumen.map(r => {
                    const op = operarioMap.get(r.operarioId);
                    return (
                      <option key={r.operarioId} value={r.operarioId}>
                        {op?.nombre ?? r.operarioId}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            {pcCorteId && pcResumen.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Estado pago</label>
                <select
                  value={pcEstado}
                  onChange={e => setPcEstado(e.target.value as typeof pcEstado)}
                  className="input-base w-36"
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PAGADO">Pagado</option>
                </select>
              </div>
            )}
            {(pcOperacion || pcOperarioId || pcEstado) && (
              <div className="flex items-end">
                <button
                  onClick={() => { setPcOperacion(''); setPcOperarioId(''); setPcEstado(''); }}
                  className="text-[10px] font-bold uppercase text-gray-400 hover:text-red-500 flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {!pcCorteId ? (
            <p className="text-sm text-gray-400 italic">Selecciona un corte para ver los operarios asignados.</p>
          ) : pcResumen.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin operarios asignados con operaciones confirmadas en este corte{pcOperacion ? ` para "${pcOperacion}"` : ''}.</p>
          ) : (
            <div className="space-y-4">
              {/* Encabezado del corte */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Corte {pcCorte?.nCorte} — {productoMap.get(pcCorte!.productoId)?.nombre}
                  </span>
                  <span className="text-[10px] text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400">
                    {pcResumenFiltrado.length} operario{pcResumenFiltrado.length !== 1 ? 's' : ''}
                    {pcOperarioId ? '' : ` de ${pcResumen.length}`}
                  </span>
                  <span className="text-[10px] text-gray-300">·</span>
                  <span className="text-[10px] font-bold text-[#1a1a1a]">
                    {pcResumenFiltrado.reduce((s, r) => s + r.totalPrendas, 0).toLocaleString()} prendas · S/ {pcResumenFiltrado.reduce((s, r) => s + r.totalImporte, 0).toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const rows: Record<string, unknown>[] = [];
                    for (const opRow of pcResumenFiltrado) {
                      const op = operarioMap.get(opRow.operarioId);
                      for (const opEntry of opRow.operaciones) {
                        // Agrupar detalle por color (igual que en pantalla)
                        const byColor = new Map<string, typeof opEntry.detalle>();
                        for (const d of opEntry.detalle) {
                          if (!byColor.has(d.colorId)) byColor.set(d.colorId, []);
                          byColor.get(d.colorId)!.push(d);
                        }
                        byColor.forEach((items, colorId) => {
                          const tallasStr = items.map(d => `${d.talla} ${d.cantidad}`).join('  ');
                          const totalColor = items.reduce((s, d) => s + d.cantidad, 0);
                          rows.push({
                            Operario: op?.nombre ?? opRow.operarioId,
                            Codigo: op?.codigo ?? '',
                            Operacion: `${opEntry.orden}. ${opEntry.operacion}`,
                            Color: colorMap.get(colorId) ?? colorId,
                            Tallas: tallasStr,
                            Prendas: totalColor,
                            Tarifa: `S/ ${opEntry.tarifa.toFixed(3)}`,
                            Importe: `S/ ${(totalColor * opEntry.tarifa).toFixed(2)}`,
                          });
                        });
                      }
                    }
                    const pcTotalBruto = pcResumenFiltrado.reduce((s, r) => s + r.totalImporte, 0);
                    const pcTotalPrendas = pcResumenFiltrado.reduce((s, r) => s + r.totalPrendas, 0);
                    const pcDescuento1 = pcOperarioId ? pcTotalBruto * 0.01 : 0;
                    const pcTotalNeto = pcTotalBruto - pcDescuento1;
                    const footerRows: Record<string, unknown>[] = [
                      { Operario: 'TOTAL BRUTO', Codigo: '', Operacion: '', Color: '', Tallas: '', Prendas: pcTotalPrendas, Tarifa: '', Importe: `S/ ${pcTotalBruto.toFixed(2)}` },
                      ...(pcOperarioId ? [
                        { Operario: 'DESC. MERMA 1%', Codigo: '', Operacion: '', Color: '', Tallas: '', Prendas: '', Tarifa: '', Importe: `− S/ ${pcDescuento1.toFixed(2)}` },
                        { Operario: 'NETO A PAGAR', Codigo: '', Operacion: '', Color: '', Tallas: '', Prendas: '', Tarifa: '', Importe: `S/ ${pcTotalNeto.toFixed(2)}` },
                      ] : []),
                    ];
                    exportTableToPdf({
                      title: `Destajo — Corte ${pcCorte!.nCorte}`,
                      subtitle: `${productoMap.get(pcCorte!.productoId)?.nombre ?? ''}${pcOperacion ? ` · Op: ${pcOperacion}` : ''} · ${new Date().toLocaleDateString('es-PE')}`,
                      fileName: `destajo_corte_${pcCorte!.nCorte}${pcOperacion ? `_${pcOperacion.replace(/\s+/g, '_')}` : ''}`,
                      rows,
                      footerRows,
                      columns: [
                        { header: 'Operario', dataKey: 'Operario' },
                        { header: 'Cód.', dataKey: 'Codigo' },
                        { header: 'Operación', dataKey: 'Operacion' },
                        { header: 'Color', dataKey: 'Color' },
                        { header: 'Tallas', dataKey: 'Tallas' },
                        { header: 'Prendas', dataKey: 'Prendas' },
                        { header: 'Tarifa', dataKey: 'Tarifa' },
                        { header: 'Importe', dataKey: 'Importe' },
                      ],
                      rightCols: ['Prendas', 'Tarifa', 'Importe'],
                      centerCols: ['Codigo'],
                      orientation: 'landscape',
                    });
                    addToast('PDF exportado', 'success');
                  }}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5" /> Exportar PDF
                </button>
              </div>

              {pcResumenFiltrado.map(opRow => {
                const op = operarioMap.get(opRow.operarioId);
                const tarifaIdsOp = new Set(opRow.operaciones.map(o => o.tarifaId));
                const lineasOp = boletaLineas.filter(b => b.operarioId === opRow.operarioId && b.corteId === pcCorteId && tarifaIdsOp.has(b.tarifaId) && b.importe > 0);
                const tienePendiente = lineasOp.length === 0 || lineasOp.some(b => b.estadoPago === 'PENDIENTE');
                return (
                  <div key={opRow.operarioId} className="bg-white border border-[#DDD8CF]">
                    {/* Cabecera operario */}
                    <div className="flex items-center justify-between bg-[#1C1915] px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wide text-[#F5F2EA]">
                          {op?.nombre ?? opRow.operarioId}
                        </span>
                        {op?.codigo && (
                          <span className="text-[10px] font-mono text-[#6B6058]">{op.codigo}</span>
                        )}
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${tienePendiente ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                          {tienePendiente ? 'PENDIENTE' : 'PAGADO'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-mono">
                        <span className="text-[#6B6058]">{opRow.totalPrendas.toLocaleString()} prendas</span>
                        <span className="font-bold text-[#B66F35]">S/ {opRow.totalImporte.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Tabla operaciones */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[#DDD8CF] bg-[#F5F2EA]">
                            <th className="text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Operación</th>
                            <th className="text-right px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Tarifa</th>
                            <th className="text-right px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Prendas</th>
                            <th className="text-right px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Importe</th>
                            <th className="text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Detalle (color / talla)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {opRow.operaciones.map(opEntry => (
                            <tr key={opEntry.tarifaId} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-700">
                                <span className="text-[10px] font-mono text-gray-400 mr-1.5">{opEntry.orden}.</span>
                                {opEntry.operacion}
                              </td>
                              <td className="px-3 py-2 font-mono text-right text-gray-500">S/ {opEntry.tarifa.toFixed(3)}</td>
                              <td className="px-3 py-2 font-mono font-bold text-right">{opEntry.totalPrendas.toLocaleString()}</td>
                              <td className="px-3 py-2 font-mono font-black text-right text-[#173A25]">S/ {opEntry.totalImporte.toFixed(2)}</td>
                              <td className="px-3 py-2">
                                <div className="space-y-1">
                                  {(() => {
                                    const byColor = new Map<string, typeof opEntry.detalle>();
                                    for (const d of opEntry.detalle) {
                                      if (!byColor.has(d.colorId)) byColor.set(d.colorId, []);
                                      byColor.get(d.colorId)!.push(d);
                                    }
                                    return [...byColor.entries()].map(([colorId, items]) => (
                                      <div key={colorId} className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-gray-500 w-28 truncate shrink-0">{colorMap.get(colorId) ?? colorId}</span>
                                        <div className="flex gap-1 flex-wrap">
                                          {items.map((d, i) => (
                                            <span key={i} className="inline-flex items-center gap-0.5 bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono rounded">
                                              <span className="font-bold text-gray-700">{d.talla}</span>
                                              <span className="text-gray-400">{d.cantidad}</span>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-[#DDD8CF] bg-[#F5F2EA]">
                            <td colSpan={2} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              Total operario
                            </td>
                            <td className="px-3 py-1.5 font-mono font-black text-right">{opRow.totalPrendas.toLocaleString()}</td>
                            <td className="px-3 py-1.5 font-mono font-black text-right text-[#B66F35]">S/ {opRow.totalImporte.toFixed(2)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Total general del corte */}
              {(() => {
                const pcTotalPrendas = pcResumenFiltrado.reduce((s, r) => s + r.totalPrendas, 0);
                const pcTotalBruto = pcResumenFiltrado.reduce((s, r) => s + r.totalImporte, 0);
                const pcDescuento1 = pcOperarioId ? pcTotalBruto * 0.01 : 0;
                const pcTotalNeto = pcTotalBruto - pcDescuento1;
                return (
                  <div className="flex justify-end">
                    <div className="bg-white border border-[#DDD8CF] px-5 py-3 flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Prendas</p>
                        <p className="text-lg font-black font-mono">{pcTotalPrendas.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Bruto Destajo</p>
                        <p className="text-lg font-black font-mono text-[#173A25]">S/ {pcTotalBruto.toFixed(2)}</p>
                      </div>
                      {pcOperarioId && (
                        <>
                          <div className="text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Desc. Merma 1%</p>
                            <p className="text-lg font-black font-mono text-red-600">− S/ {pcDescuento1.toFixed(2)}</p>
                          </div>
                          <div className="text-center border-l border-[#DDD8CF] pl-8">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Neto a Pagar</p>
                            <p className="text-xl font-black font-mono text-[#B66F35]">S/ {pcTotalNeto.toFixed(2)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB: MI BOLETA ══════════════ */}
      {activeTab === 'boleta' && <>

      {/* Selectores */}
      <div className="flex flex-wrap gap-4 bg-white border border-gray-200 p-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Operario</label>
          <select value={selectedOperario} onChange={e => setSelectedOperario(e.target.value)} className="input-base w-52">
            <option value="">Seleccionar…</option>
            {operarios.filter(o => o.estado === 'ACTIVO').map(o => (
              <option key={o.id} value={o.id}>{o.codigo} — {o.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Período</label>
          <select value={selectedPeriodo} onChange={e => { setSelectedPeriodo(e.target.value); setBDesde(''); setBHasta(''); }} className="input-base w-36">
            {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Desde</label>
          <input type="date" value={bDesde} onChange={e => setBDesde(e.target.value)} className="input-base w-36" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Hasta</label>
          <input type="date" value={bHasta} onChange={e => setBHasta(e.target.value)} className="input-base w-36" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Corte</label>
          <select value={bCorteId} onChange={e => { setBCorteId(e.target.value); setBulkCorteId(e.target.value); }} className="input-base w-44">
            <option value="">Todos</option>
            {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
              <option key={c.id} value={c.id}>{c.nCorte} — {productoMap.get(c.productoId)?.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Estado Pago</label>
          <select value={bEstado} onChange={e => setBEstado(e.target.value as typeof bEstado)} className="input-base w-36">
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
          </select>
        </div>
        {(bDesde || bHasta) && (
          <div className="flex items-end">
            <button onClick={() => { setBDesde(''); setBHasta(''); }} className="text-[10px] font-bold uppercase text-gray-400 hover:text-gray-700 border border-gray-200 px-2 py-1">
              Limpiar fechas
            </button>
          </div>
        )}
        {selectedOperario && (
          <div className="flex items-end gap-2">
            <button onClick={() => { resetDraft(); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="h-3 w-3" /> Agregar Línea
            </button>
            <button onClick={() => setShowBoleta(true)} className="btn-secondary flex items-center gap-2 text-xs">
              <Receipt className="h-3 w-3" /> Ver Boleta
            </button>
          </div>
        )}
      </div>

      {/* Carga masiva por corte */}
      {selectedOperario && (
        <div className="flex flex-wrap gap-3 items-end bg-gray-50 border border-gray-200 p-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Cargar todas las ops. de un corte</label>
            <select value={bulkCorteId} onChange={e => { setBulkCorteId(e.target.value); setBCorteId(e.target.value); }} className="input-base w-48">
              <option value="">Seleccionar corte…</option>
              {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
                <option key={c.id} value={c.id}>{c.nCorte} — {productoMap.get(c.productoId)?.nombre}</option>
              ))}
            </select>
          </div>
          <button onClick={handleBulkAdd} disabled={!bulkCorteId} className="btn-secondary text-xs disabled:opacity-40">
            Cargar Operaciones
          </button>
        </div>
      )}

      {/* Tabla boleta */}
      {selectedOperario && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
              Boleta — {operarioMap.get(selectedOperario)?.nombre} / {selectedPeriodo}
            </h3>
            <div className="flex items-center gap-2">
              {pendientes.length > 0 && (
                <button onClick={handleMarcarPagado} className="text-xs font-bold uppercase tracking-widest text-green-700 border border-green-300 px-3 py-1 hover:bg-green-50">
                  Marcar todo pagado
                </button>
              )}
              {lineasFiltradas.length > 0 && (
                <>
                  <button onClick={exportarDestajo} className="btn-secondary flex items-center gap-1 text-xs">
                    <Download className="h-3 w-3" /> Excel
                  </button>
                  <button onClick={exportarDestajoPdf} className="btn-secondary flex items-center gap-1 text-xs">
                    <FileText className="h-3 w-3" /> PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {lineasFiltradas.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin líneas para este operario/período.</p>
          ) : (
            <div className="bg-white border border-gray-200 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['N° Corte', 'Producto', 'Color', 'Talla', 'Operación', 'Tarifa', 'Prendas', 'Importe', 'Estado', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineasFiltradas.map(b => {
                    // Líneas que ya son sub-líneas por talla no se expanden
                    if (b.talla) return (
                      <tr key={b.id} className={`bg-blue-50/50 border-l-4 border-blue-200 ${b.estadoPago === 'PAGADO' ? 'opacity-60' : 'bg-amber-50/60'}`}>
                        <td className="px-3 py-2 font-mono text-gray-400 text-[10px]">↳ {b.nCorte}</td>
                        <td className="px-3 py-2 text-[11px] text-gray-500">{productoMap.get(b.productoId)?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-[11px] text-gray-600">{b.colorId ? colorMap.get(b.colorId) ?? '—' : '—'}</td>
                        <td className="px-3 py-2 font-mono font-black text-blue-700">{b.talla}</td>
                        <td className="px-3 py-2 text-gray-600">{b.operacion}</td>
                        <td className="px-3 py-2 font-mono text-right">S/ {b.tarifa.toFixed(3)}</td>
                        <td className="px-3 py-2 font-mono text-right font-bold">{b.cantPrendas}</td>
                        <td className="px-3 py-2 font-mono text-right font-bold">S/ {b.importe.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-bold uppercase ${b.estadoPago === 'PAGADO' ? 'text-green-700' : 'text-yellow-700'}`}>{b.estadoPago}</span>
                        </td>
                        <td className="px-3 py-2">
                          {b.estadoPago === 'PENDIENTE' && (
                            <button onClick={() => updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: new Date().toISOString().slice(0, 10) })} className="text-[10px] text-green-600 hover:text-green-800 font-bold uppercase">Pagar</button>
                          )}
                        </td>
                      </tr>
                    );

                    const isExp = expandedLineaId === b.id;
                    // Tallas asignadas a este operario para este corte+color+tarifa
                    const tallasDisp = seguimientoFilas.filter(f => {
                      if (f.corteId !== b.corteId) return false;
                      if (b.colorId && f.colorId !== b.colorId) return false;
                      const asig = f.asignaciones.find(a => a.tarifaId === b.tarifaId && a.confirmado === true);
                      if (!asig) return false;
                      const ids = asig.operarioIds?.filter(Boolean).length
                        ? asig.operarioIds!.filter(Boolean)
                        : (asig.operarioId ? [asig.operarioId] : []);
                      return ids.includes(b.operarioId);
                    });
                    const tieneTallas = tallasDisp.length >= 1;
                    // Calcular cantPrendas real sumando solo las tallas asignadas a este operario
                    const cantPrendasReal = tieneTallas
                      ? tallasDisp.reduce((sum, fila) => {
                          const asig = fila.asignaciones.find(a => a.tarifaId === b.tarifaId && a.confirmado === true);
                          if (!asig) return sum;
                          const ids = asig.operarioIds?.filter(Boolean).length
                            ? asig.operarioIds!.filter(Boolean)
                            : (asig.operarioId ? [asig.operarioId] : []);
                          if (!ids.includes(b.operarioId)) return sum;
                          if (ids.length === 1) return sum + fila.cantidad;
                          return sum + Math.round(fila.cantidad / ids.length);
                        }, 0)
                      : b.cantPrendas;
                    const importeReal = cantPrendasReal * b.tarifa;
                    const rowBgB = b.estadoPago === 'PAGADO'
                      ? 'bg-green-50 opacity-60'
                      : tieneTallas
                        ? 'bg-amber-50 cursor-pointer hover:bg-amber-100'
                        : 'bg-amber-50 hover:bg-amber-100';

                    return (
                      <React.Fragment key={b.id}>
                        <tr
                          className={rowBgB}
                          onClick={() => tieneTallas && b.estadoPago === 'PENDIENTE' && setExpandedLineaId(isExp ? null : b.id)}
                        >
                          <td className="px-3 py-2 font-mono">
                            <span className="flex items-center gap-1.5">
                              {tieneTallas && b.estadoPago === 'PENDIENTE' && (
                                <span className="text-[11px] text-amber-500 font-black">{isExp ? '▲' : '▼'}</span>
                              )}
                              {b.nCorte}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[11px] text-gray-600">{productoMap.get(b.productoId)?.nombre ?? '—'}</td>
                          <td className="px-3 py-2 text-[11px]">
                            {b.colorId ? <span className="font-medium text-gray-700">{colorMap.get(b.colorId) ?? b.colorId}</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-[10px] text-gray-400 italic">
                            {tieneTallas && b.estadoPago === 'PENDIENTE' ? <span className="text-amber-500">ver tallas</span> : '—'}
                          </td>
                          <td className="px-3 py-2">{b.operacion}</td>
                          <td className="px-3 py-2 font-mono text-right">S/ {b.tarifa.toFixed(3)}</td>
                          <td className="px-3 py-2">
                            {tieneTallas ? (
                              <span className="font-mono font-bold text-right block">{cantPrendasReal.toLocaleString()}</span>
                            ) : (
                              <input
                                type="number" min={0}
                                value={b.cantPrendas}
                                onChange={e => updateBoletaLinea(b.id, { cantPrendas: parseInt(e.target.value) || 0, importe: (parseInt(e.target.value) || 0) * b.tarifa })}
                                className="w-20 input-base text-right text-xs py-0.5"
                                disabled={b.estadoPago === 'PAGADO'}
                                onClick={e => e.stopPropagation()}
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-right font-bold">S/ {importeReal.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] font-bold uppercase ${b.estadoPago === 'PAGADO' ? 'text-green-700' : 'text-yellow-700'}`}>{b.estadoPago}</span>
                          </td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              {b.estadoPago === 'PENDIENTE' && (
                                <button
                                  onClick={() => updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: new Date().toISOString().slice(0, 10), cantPrendas: cantPrendasReal, importe: importeReal })}
                                  className="text-[10px] text-green-600 hover:text-green-800 font-bold uppercase"
                                >Pagar todo</button>
                              )}
                              {confirmDelete === b.id ? (
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <button onClick={() => { handleDeleteBoletaLinea(b); setConfirmDelete(null); addToast('Línea eliminada', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                                  <span className="text-gray-300">/</span>
                                  <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                                </span>
                              ) : (
                                <button onClick={() => setConfirmDelete(b.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Sub-filas por talla */}
                        {isExp && tallasDisp.map(fila => {
                          const subLinea = boletaLineas.find(
                            bl => bl.operarioId === b.operarioId &&
                                  bl.corteId === b.corteId &&
                                  bl.tarifaId === b.tarifaId &&
                                  bl.colorId === b.colorId &&
                                  bl.talla === fila.talla
                          );
                          const yaPagada = subLinea?.estadoPago === 'PAGADO';
                          const asig = fila.asignaciones.find(a => a.tarifaId === b.tarifaId && a.confirmado === true);
                          const ids2 = asig?.operarioIds?.filter(Boolean).length
                            ? asig!.operarioIds!.filter(Boolean)
                            : (asig?.operarioId ? [asig.operarioId] : []);
                          const cantOperario = ids2.length > 1 ? Math.round(fila.cantidad / ids2.length) : fila.cantidad;
                          return (
                            <tr key={`${b.id}-${fila.talla}`} className="bg-amber-50 border-l-4 border-amber-300">
                              <td className="px-3 py-1.5 font-mono text-gray-400 text-[10px]">↳ {b.nCorte}</td>
                              <td className="px-3 py-1.5 text-[10px] text-gray-500">{productoMap.get(b.productoId)?.nombre ?? '—'}</td>
                              <td className="px-3 py-1.5 text-[10px] text-gray-600">{colorMap.get(fila.colorId) ?? '—'}</td>
                              <td className="px-3 py-1.5 font-mono font-black text-amber-700">{fila.talla}</td>
                              <td className="px-3 py-1.5 text-[10px] text-gray-500">{b.operacion}</td>
                              <td className="px-3 py-1.5 font-mono text-right text-[10px]">S/ {b.tarifa.toFixed(3)}</td>
                              <td className="px-3 py-1.5 font-mono text-right font-bold">{cantOperario}</td>
                              <td className="px-3 py-1.5 font-mono text-right font-black">S/ {(cantOperario * b.tarifa).toFixed(2)}</td>
                              <td className="px-3 py-1.5">
                                {yaPagada
                                  ? <span className="text-[10px] font-bold uppercase text-green-700">Pagado</span>
                                  : <span className="text-[10px] font-bold uppercase text-yellow-700">Pendiente</span>
                                }
                              </td>
                              <td className="px-3 py-1.5">
                                {!yaPagada && (
                                  <button
                                    onClick={() => {
                                      const hoy = new Date().toISOString().slice(0, 10);
                                      if (subLinea) {
                                        updateBoletaLinea(subLinea.id, { estadoPago: 'PAGADO', fechaPago: hoy });
                                      } else {
                                        const nuevaCant = cantPrendasReal - cantOperario;
                                        addBoletaLinea({
                                          id: newId(),
                                          operarioId: b.operarioId,
                                          corteId: b.corteId,
                                          nCorte: b.nCorte,
                                          productoId: b.productoId,
                                          colorId: b.colorId,
                                          talla: fila.talla,
                                          tarifaId: b.tarifaId,
                                          operacion: b.operacion,
                                          orden: b.orden,
                                          tarifa: b.tarifa,
                                          cantPrendas: cantOperario,
                                          importe: cantOperario * b.tarifa,
                                          periodo: b.periodo,
                                          fechaRegistro: b.fechaRegistro,
                                          estadoPago: 'PAGADO',
                                          fechaPago: hoy,
                                        });
                                        if (nuevaCant > 0) {
                                          updateBoletaLinea(b.id, { cantPrendas: nuevaCant, importe: nuevaCant * b.tarifa });
                                        } else {
                                          updateBoletaLinea(b.id, { cantPrendas: 0, importe: 0, estadoPago: 'PAGADO', fechaPago: hoy });
                                        }
                                      }
                                      addToast(`Talla ${fila.talla} pagada`, 'success');
                                    }}
                                    className="text-[9px] font-bold uppercase text-green-700 border border-green-300 px-2 py-0.5 hover:bg-green-50 whitespace-nowrap"
                                  >Pagar talla</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {(lineasFiltradas.length > 0 || descuentosFiltrados.length > 0) && selectedOperario && (
            <div className="mt-4 flex justify-end">
              <div className="bg-white border border-gray-200 p-4 w-72 space-y-2">
                {/* Bruto */}
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase">Bruto Destajo</span>
                  <span className="font-mono">S/ {totalBruto.toFixed(2)}</span>
                </div>

                {/* Descuento fijo 1% */}
                <div className="flex justify-between text-xs text-red-700">
                  <span className="font-bold uppercase">Desc. 1%</span>
                  <span className="font-mono">− S/ {descuentoFijo.toFixed(2)}</span>
                </div>

                {/* Descuentos individuales */}
                {descuentosFiltrados.map(d => (
                  <div key={d.id} className="flex justify-between text-xs text-red-700">
                    <span className="font-bold uppercase">{d.tipo}{d.notas ? ` — ${d.notas}` : ''}</span>
                    <span className="font-mono">− S/ {d.monto.toFixed(2)}</span>
                  </div>
                ))}

                {/* Total descuentos (solo si hay más de uno) */}
                {descuentosFiltrados.length > 1 && (
                  <div className="flex justify-between text-xs text-red-700 border-t border-red-100 pt-1">
                    <span className="font-bold uppercase">Total Descuentos</span>
                    <span className="font-mono">− S/ {totalDescuentos.toFixed(2)}</span>
                  </div>
                )}

                {/* Neto */}
                <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-2">
                  <span className="uppercase">Neto a Pagar</span>
                  <span className="font-mono text-[#173A25]">S/ {totalNeto.toFixed(2)}</span>
                </div>

                {pagadas.length > 0 && (
                  <p className="text-[10px] text-gray-500 pt-1">
                    {pagadas.length} líneas pagadas de {lineasFiltradas.length}
                  </p>
                )}
                <div className="pt-1 border-t border-gray-100">
                  <button
                    onClick={() => { setShowDescForm(true); setDescForm({ tipo: 'ADELANTO', monto: '', notas: '' }); document.getElementById('desc-form-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="w-full text-[10px] font-bold uppercase tracking-widest text-amber-700 border border-amber-300 py-1 hover:bg-amber-50 flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Agregar adelanto / descuento
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Gestión de descuentos ── */}
          {selectedOperario && (
            <div id="desc-form-section" className="mt-4 bg-white border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Descuentos del período
                </h4>
                <button
                  onClick={() => setShowDescForm(v => !v)}
                  className="btn-primary flex items-center gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" /> Agregar Descuento
                </button>
              </div>

              {/* Lista de descuentos existentes */}
              {descuentosFiltrados.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Sin descuentos registrados para este período.</p>
              ) : (
                <ul className="space-y-1">
                  {descuentosFiltrados.map(d => (
                    <li key={d.id} className="flex items-center justify-between text-xs bg-red-50 border border-red-100 px-3 py-1.5">
                      <span className="text-red-700 font-bold uppercase">{d.tipo}</span>
                      {d.notas && <span className="text-gray-500 mx-2 flex-1 truncate">{d.notas}</span>}
                      <span className="font-mono text-red-700 font-bold mr-3">− S/ {d.monto.toFixed(2)}</span>
                      <button
                        onClick={() => { deleteDescuentoBoleta(d.id); addToast('Descuento eliminado', 'success'); }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Eliminar descuento"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Mini-form inline */}
              {showDescForm && (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const monto = parseFloat(descForm.monto);
                    if (!monto || monto <= 0) { addToast('Ingresa un monto válido', 'error'); return; }
                    addDescuentoBoleta({
                      id: crypto.randomUUID(),
                      operarioId: selectedOperario,
                      periodo: selectedPeriodo,
                      tipo: descForm.tipo,
                      monto,
                      notas: descForm.notas.trim(),
                    });
                    addToast('Descuento agregado', 'success');
                    setDescForm({ tipo: 'ADELANTO', monto: '', notas: '' });
                    setShowDescForm(false);
                  }}
                  className="border border-gray-200 bg-gray-50 p-3 space-y-2"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nuevo descuento</p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Tipo</label>
                      <select
                        value={descForm.tipo}
                        onChange={e => setDescForm(f => ({ ...f, tipo: e.target.value as TipoDescuentoBoleta }))}
                        className="input-base text-xs w-36"
                      >
                        <option value="ADELANTO">Adelanto</option>
                        <option value="CAFETÍN">Cafetín</option>
                        <option value="PRÉSTAMO">Préstamo</option>
                        <option value="FALTA">Falta</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Monto S/</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={descForm.monto}
                        onChange={e => setDescForm(f => ({ ...f, monto: e.target.value }))}
                        placeholder="0.00"
                        className="input-base text-xs w-28 text-right"
                        required
                      />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Notas (opcional)</label>
                      <input
                        type="text"
                        value={descForm.notas}
                        onChange={e => setDescForm(f => ({ ...f, notas: e.target.value }))}
                        placeholder="Descripción…"
                        className="input-base text-xs w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary text-xs">Guardar</button>
                      <button
                        type="button"
                        onClick={() => { setShowDescForm(false); setDescForm({ tipo: 'ADELANTO', monto: '', notas: '' }); }}
                        className="btn-secondary text-xs"
                      >Cancelar</button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      </> /* fin tab boleta */}

      {/* Boleta operario */}
      {showBoleta && selectedOperario && (() => {
        const operario = operarioMap.get(selectedOperario);
        return operario ? <BoletaOperario operario={operario} periodo={selectedPeriodo} desde={bDesde || undefined} hasta={bHasta || undefined} estadoPago={bEstado || undefined} onClose={() => setShowBoleta(false)} /> : null;
      })()}

      {/* Modal agregar líneas — secciones por operario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white border border-gray-300 w-full max-w-3xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Agregar Líneas</h3>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest">{selectedPeriodo}</p>
              </div>
              <button type="button" onClick={() => { setShowForm(false); resetDraft(); }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddLineas} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-4 space-y-5">

                {draftSecciones.map((seccion, secIdx) => {
                  const opNombre = operarioMap.get(seccion.operarioId)?.nombre ?? seccion.operarioId;
                  const esPrimero = secIdx === 0;
                  return (
                    <div key={seccion.operarioId} className="border border-gray-200 bg-gray-50">
                      {/* Encabezado sección */}
                      <div className="flex items-center justify-between bg-[#1a1a1a] px-4 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#f9f7f2]">
                          {opNombre}
                        </span>
                        {!esPrimero && (
                          <button
                            type="button"
                            onClick={() => removeSeccion(seccion.operarioId)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            tabIndex={-1}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="p-3 space-y-2">
                        {/* Cabecera columnas */}
                        <div className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 px-1">
                          {['Corte', 'Operación', 'Prendas', ''].map(h => (
                            <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</span>
                          ))}
                        </div>

                        {/* Filas */}
                        {seccion.lineas.map(row => {
                          const tarifasRow = row.corteId ? (tarifasPorCorte.get(row.corteId) ?? []) : [];
                          return (
                            <div key={row.id} className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 items-center">
                              <select
                                value={row.corteId}
                                onChange={e => updateRowInSeccion(seccion.operarioId, row.id, { corteId: e.target.value, tarifaId: '' })}
                                className="input-base text-xs"
                              >
                                <option value="">Seleccionar…</option>
                                {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
                                  <option key={c.id} value={c.id}>{c.nCorte} — {productoMap.get(c.productoId)?.nombre}</option>
                                ))}
                              </select>
                              <select
                                value={row.tarifaId}
                                onChange={e => updateRowInSeccion(seccion.operarioId, row.id, { tarifaId: e.target.value })}
                                className="input-base text-xs"
                                disabled={!row.corteId}
                              >
                                <option value="">Seleccionar…</option>
                                {tarifasRow.map(t => (
                                  <option key={t.id} value={t.id}>{t.orden}. {t.operacion} — S/{t.tarifa.toFixed(3)}</option>
                                ))}
                              </select>
                              <input
                                type="number" min={0}
                                value={row.cantPrendas}
                                onChange={e => updateRowInSeccion(seccion.operarioId, row.id, { cantPrendas: e.target.value })}
                                placeholder="0"
                                className="input-base text-xs text-right"
                              />
                              <button
                                type="button"
                                onClick={() => seccion.lineas.length > 1 ? removeRowFromSeccion(seccion.operarioId, row.id) : undefined}
                                className="flex items-center justify-center text-gray-300 hover:text-red-500"
                                disabled={seccion.lineas.length === 1}
                                tabIndex={-1}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => addRowToSeccion(seccion.operarioId)}
                          className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#173A25] hover:text-[#B66F35] transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Agregar otra línea
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Agregar otro operario */}
                {(() => {
                  const yaAgregados = new Set(draftSecciones.map(s => s.operarioId));
                  const disponibles = operarios.filter(o => o.estado === 'ACTIVO' && !yaAgregados.has(o.id));
                  if (disponibles.length === 0) return null;
                  return (
                    <div className="pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Agregar otro operario (opcional)
                      </p>
                      <select
                        value=""
                        onChange={e => { if (e.target.value) addExtraSeccion(e.target.value); }}
                        className="input-base text-xs w-64"
                      >
                        <option value="">— Seleccionar operario —</option>
                        {disponibles.map(o => (
                          <option key={o.id} value={o.id}>{o.codigo} — {o.nombre}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 shrink-0">
                <span className="text-[10px] text-gray-400 font-mono">
                  {draftSecciones.reduce((s, sec) => s + sec.lineas.filter(r => r.corteId && r.tarifaId && r.cantPrendas).length, 0)} líneas válidas · {draftSecciones.length} operario{draftSecciones.length !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetDraft(); }}
                    className="btn-secondary"
                  >Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
