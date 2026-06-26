import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, ChevronDown, ChevronRight, FileText, Trash2, CheckCircle, RotateCcw, MoreHorizontal } from 'lucide-react';
import { SeguimientoFila, SeguimientoAsignacion, BoletaLinea } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { exportRowsToXlsx, exportTableToPdf, exportHojaSeguimientoPdf, exportHojaSeguimientoXlsx } from '../lib/export';
import type { PdfFont } from '../lib/fonts';
import { newId } from '../lib/storage';
import { mockColores } from '../data';
import { useEsAdmin } from '../lib/useEsAdmin';
import { capWords } from '../lib/utils';

// Paleta exacta por nombre (coincidencia exacta primero, luego parcial)
const COLOR_PALETTE: Record<string, string> = {
  'perla':     '#F8F8F7',
  'cemento':   '#74988A',
  'negro':     '#313438',
  'azul':      '#5F628B',
  'topo':      '#8C7258',
  'denim':     '#5C7392',
  'pacay':     '#7A866E',
  'botella':   '#385D4F',
  'palo rosa': '#C79D9F',
  'vino':      '#8A3449',
  'melange':   '#747472',
  'beige':     '#D9C5A8',
  'camote':    '#745958',
  'plomo':     '#434A5A',
  // Colores vivos
  'rojo':      '#E53935',
  'naranja':   '#F57C00',
  'amarillo':  '#F9A825',
  'verde':     '#2E7D32',
  'celeste':   '#0288D1',
  'morado':    '#6A1B9A',
  'fucsia':    '#C2185B',
  'turquesa':  '#00838F',
  'lima':      '#689F38',
  'coral':     '#E64A19',
};

function colorHexFromName(nombre: string): string {
  const n = nombre.toLowerCase().trim();
  // Coincidencia exacta
  if (COLOR_PALETTE[n]) return COLOR_PALETTE[n];
  // Coincidencia parcial en paleta
  for (const [key, hex] of Object.entries(COLOR_PALETTE)) {
    if (n.includes(key) || key.includes(n)) return hex;
  }
  // Fallbacks genéricos
  if (n.includes('blanco') || n.includes('white') || n.includes('crema')) return '#F5F5F5';
  if (n.includes('rojo') || n.includes('red')) return '#E53935';
  if (n.includes('rosado') || n.includes('rosa') || n.includes('pink')) return '#E91E8C';
  if (n.includes('fucsia') || n.includes('fuchsia')) return '#D500F9';
  if (n.includes('naranja') || n.includes('orange')) return '#FB8C00';
  if (n.includes('amarillo') || n.includes('yellow')) return '#FDD835';
  if (n.includes('verde') || n.includes('green')) return '#43A047';
  if (n.includes('marino') || n.includes('navy')) return '#1A237E';
  if (n.includes('celeste') || n.includes('blue')) return '#1E88E5';
  if (n.includes('morado') || n.includes('violeta') || n.includes('purple')) return '#8E24AA';
  if (n.includes('lila') || n.includes('lavanda')) return '#CE93D8';
  if (n.includes('gris') || n.includes('grey') || n.includes('gray')) return '#757575';
  if (n.includes('salmon') || n.includes('salmón')) return '#FF8A65';
  if (n.includes('turquesa') || n.includes('turquoise')) return '#00ACC1';
  if (n.includes('colegial')) return '#5C6BC0';
  if (n.includes('bordo')) return '#880E4F';
  return '#9E9E9E';
}

export function ProduccionConfeccion() {
  const {
    seguimientoFilas, cortes, productos, colores, operarios, tarifasOperaciones,
    boletaLineas, clientes,
    addSeguimientoFila, updateSeguimientoFila, deleteSeguimientoFila,
    addBoletaLinea, addBoletaLineas, updateBoletaLinea, deleteBoletaLinea,
  } = useAppContext();
  const { addToast } = useToast();
  const esAdmin = useEsAdmin();
  const [activeTab, setActiveTab] = useState<'seguimiento' | 'porProducto'>('seguimiento');
  const [expandedCorte, setExpandedCorte] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCorteId, setFilterCorteId] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteCorte, setConfirmDeleteCorte] = useState<string | null>(null);
  const [filtroProductoId, setFiltroProductoId] = useState('');
  // Fechas por corte (editadas inline en el encabezado expandido)
  const [editFechas, setEditFechas] = useState<Record<string, { inicio: string; entrega: string }>>({});

  // Modal asignación operarios: { corteId, colorId } abierto + ops temporales { [tarifaId]: operarioId }
  const [modalColor, setModalColor] = useState<{ corteId: string; colorId: string } | null>(null);
  // modalOps[tarifaId][talla] = operarioId[]  — permite operarios distintos por talla
  const [modalOps, setModalOps] = useState<Record<string, Record<string, string[]>>>({});
  // Modal confirmar avance: { corteId, colorId, talla } + ops confirmadas { [tarifaId]: boolean }
  const [modalAvance, setModalAvance] = useState<{ corteId: string; colorId: string; talla: string } | null>(null);
  const [avanceOps, setAvanceOps] = useState<Record<string, boolean>>({});
  // Operarios por operación en el modal confirmar: { [tarifaId]: { operarioId, cantidad }[] }
  const [avanceOpsIds, setAvanceOpsIds] = useState<Record<string, { operarioId: string; cantidad: number }[]>>({});
  // Menú desplegable "···" por fila (corteId+colorId+talla)
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  // Modal edición de operarios por talla (separado del modal confirmar)
  const [modalEditOps, setModalEditOps] = useState<{ corteId: string; colorId: string; talla: string } | null>(null);
  // Hex overrides por colorId — persiste durante la sesión para que el PDF use el color elegido
  const [colorHexOverrides, setColorHexOverrides] = useState<Record<string, string>>({});
  const [modalHex, setModalHex] = useState<string>('#9E9E9E');
  // Fuente del PDF — persiste en la sesión
  const pdfFont: PdfFont = 'oswald';
  // Cantidades por operario en el modal global: { [tarifaId][talla]: number[] }
  const [modalOpsQty, setModalOpsQty] = useState<Record<string, Record<string, number[]>>>({});

  const abrirModalAsignarColor = (corteId: string, colorId: string) => {
    const filasDelColor = seguimientoFilas.filter(f => f.corteId === corteId && f.colorId === colorId);
    const ops: Record<string, Record<string, string[]>> = {};
    const qty: Record<string, Record<string, number[]>> = {};
    for (const fila of filasDelColor) {
      fila.asignaciones.forEach(a => {
        if (!ops[a.tarifaId]) ops[a.tarifaId] = {};
        if (!qty[a.tarifaId]) qty[a.tarifaId] = {};
        const ids = a.operarioIds?.length ? a.operarioIds : (a.operarioId ? [a.operarioId] : ['']);
        ops[a.tarifaId][fila.talla] = ids;
        const validIds = ids.filter(Boolean);
        if (validIds.length > 1) {
          const base = Math.floor(fila.cantidad / validIds.length);
          const resto = fila.cantidad - base * validIds.length;
          qty[a.tarifaId][fila.talla] = ids.map((id, i) => id ? (base + (i === 0 ? resto : 0)) : 0);
        } else {
          qty[a.tarifaId][fila.talla] = ids.map(id => id ? fila.cantidad : 0);
        }
      });
    }
    setModalOps(ops);
    setModalOpsQty(qty);
    const hexInicial = colorHexOverrides[colorId] ?? colorHexFromName(colorMap.get(colorId) ?? '');
    setModalHex(hexInicial);
    setModalColor({ corteId, colorId });
  };

  const guardarModalAsignar = () => {
    if (!modalColor) return;
    const { corteId, colorId } = modalColor;
    const filasDelColor = seguimientoFilas.filter(f => f.corteId === corteId && f.colorId === colorId);
    if (!filasDelColor.length) return;
    const tarifasCorte = tarifasDelCorte(corteId);
    const periodo = filasDelColor[0].fecha.slice(0, 7);

    // 1. Construir las filas actualizadas en memoria (con los operarios del modal)
    const filasActualizadas: SeguimientoFila[] = filasDelColor.map(fila => {
      const base: SeguimientoAsignacion[] = fila.asignaciones.length > 0
        ? fila.asignaciones
        : tarifasCorte.map(t => ({ tarifaId: t.id, operacion: t.operacion, orden: t.orden, operarioId: '', pago: 0 }));
      const asignaciones: SeguimientoAsignacion[] = base.map(a => {
        const tallaOps = modalOps[a.tarifaId];
        if (!tallaOps) return a;
        const ids = (tallaOps[fila.talla] ?? []).filter(Boolean);
        const tarifa = tarifasOperaciones.find(t => t.id === a.tarifaId);
        const pago = ids.length && tarifa ? fila.cantidad * tarifa.tarifa : 0;
        return { ...a, operarioId: ids[0] ?? '', operarioIds: ids, pago };
      });
      const totalPago = asignaciones.reduce((s, a) => s + a.pago, 0);
      const confirmedCount = asignaciones.filter(a => a.confirmado).length;
      const pctAvance = asignaciones.length > 0 ? Math.round((confirmedCount / asignaciones.length) * 100) : 0;
      const estado = pctAvance === 100 ? 'LISTO' : fila.estado;
      return { ...fila, asignaciones, totalPago, pctAvance, estado };
    });

    // 2. Reconstruir boletas de las tallas YA confirmadas con los nuevos operarios
    const boletasAEliminar = boletaLineas.filter(
      b => b.corteId === corteId && b.periodo === periodo && b.colorId === colorId
    );
    const nuevasBoletas: BoletaLinea[] = [];
    for (const t of tarifasCorte) {
      const filasConfirmadas = filasActualizadas.filter(f =>
        f.asignaciones.some(a => a.tarifaId === t.id && a.confirmado === true)
      );
      if (filasConfirmadas.length === 0) continue;

      const cantPorOperario = new Map<string, number>();
      for (const fila of filasConfirmadas) {
        const asig = fila.asignaciones.find(a => a.tarifaId === t.id);
        if (!asig) continue;
        const ids = asig.operarioIds?.length ? asig.operarioIds : (asig.operarioId ? [asig.operarioId] : []);
        if (ids.length === 0) continue;
        if (ids.length === 1) {
          cantPorOperario.set(ids[0], (cantPorOperario.get(ids[0]) ?? 0) + fila.cantidad);
        } else {
          const base = Math.floor(fila.cantidad / ids.length);
          const resto = fila.cantidad - base * ids.length;
          ids.forEach((id, i) => {
            cantPorOperario.set(id, (cantPorOperario.get(id) ?? 0) + base + (i === 0 ? resto : 0));
          });
        }
      }

      const tarifa = tarifasOperaciones.find(tt => tt.id === t.id);
      if (!tarifa) continue;
      const ref = filasDelColor[0];
      for (const [opId, cantTotal] of cantPorOperario) {
        if (cantTotal === 0) continue;
        nuevasBoletas.push({
          id: newId(), operarioId: opId, corteId, nCorte: ref.nCorte,
          productoId: ref.productoId, colorId, tarifaId: t.id,
          operacion: tarifa.operacion, orden: tarifa.orden, tarifa: tarifa.tarifa,
          cantPrendas: cantTotal, importe: cantTotal * tarifa.tarifa,
          periodo, estadoPago: 'PENDIENTE',
        });
      }
    }

    // 3. Persistir todo: actualizar filas, reconstruir boletas de confirmadas
    for (const fila of filasActualizadas) {
      updateSeguimientoFila(fila.id, {
        asignaciones: fila.asignaciones,
        totalPago: fila.totalPago,
        pctAvance: fila.pctAvance,
        estado: fila.estado,
      });
    }
    boletasAEliminar.forEach(b => deleteBoletaLinea(b.id));
    if (nuevasBoletas.length > 0) addBoletaLineas(nuevasBoletas);

    setColorHexOverrides(prev => ({ ...prev, [modalColor.colorId]: modalHex }));
    setModalColor(null);
    addToast('Operarios guardados', 'success');
  };

  const abrirModalEditOps = (corteId: string, colorId: string, talla: string) => {
    const fila = seguimientoFilas.find(f => f.corteId === corteId && f.colorId === colorId && f.talla === talla);
    const inicialIds: Record<string, { operarioId: string; cantidad: number }[]> = {};
    fila?.asignaciones.forEach(a => {
      const ids = a.operarioIds?.length ? a.operarioIds : (a.operarioId ? [a.operarioId] : []);
      const totalCant = fila.cantidad;
      const base = ids.length > 0 ? Math.floor(totalCant / ids.length) : totalCant;
      const resto = ids.length > 0 ? totalCant - base * ids.length : 0;
      inicialIds[a.tarifaId] = ids.map((id, i) => ({ operarioId: id, cantidad: base + (i === 0 ? resto : 0) }));
      if (inicialIds[a.tarifaId].length === 0) inicialIds[a.tarifaId] = [{ operarioId: '', cantidad: totalCant }];
    });
    setAvanceOpsIds(inicialIds);
    setModalEditOps({ corteId, colorId, talla });
    setMenuAbierto(null);
  };

  const guardarModalEditOps = () => {
    if (!modalEditOps) return;
    const { corteId, colorId, talla } = modalEditOps;
    const fila = seguimientoFilas.find(f => f.corteId === corteId && f.colorId === colorId && f.talla === talla);
    if (!fila) return;

    const asignaciones = fila.asignaciones.map(a => {
      const ops = avanceOpsIds[a.tarifaId] ?? [];
      const ids = ops.map(o => o.operarioId).filter(Boolean);
      return {
        ...a,
        operarioId: ids[0] ?? a.operarioId,
        operarioIds: ids.length > 0 ? ids : (a.operarioIds ?? []),
      };
    });
    updateSeguimientoFila(fila.id, { asignaciones });

    // Reconstruir boletas del color con los nuevos operarios
    const periodo = fila.fecha.slice(0, 7);
    const tarifasCorte = tarifasDelCorte(corteId);
    const todasLasFilasColor: SeguimientoFila[] = seguimientoFilas
      .filter(f => f.corteId === corteId && f.colorId === colorId)
      .map(f => f.id === fila.id ? { ...f, asignaciones } : f);

    const boletasViejas = boletaLineas.filter(
      b => b.corteId === corteId && b.colorId === colorId && b.periodo === periodo
    );
    const nuevasBoletas: BoletaLinea[] = [];
    for (const t of tarifasCorte) {
      const filasConfirmadas = todasLasFilasColor.filter(f =>
        f.asignaciones.some(a => a.tarifaId === t.id && a.confirmado === true)
      );
      if (filasConfirmadas.length === 0) continue;
      const cantPorOperario = new Map<string, number>();
      for (const filaConf of filasConfirmadas) {
        const asig = filaConf.asignaciones.find(a => a.tarifaId === t.id);
        if (!asig) continue;
        if (filaConf.id === fila.id) {
          for (const op of (avanceOpsIds[t.id] ?? []).filter(o => o.operarioId && o.cantidad > 0)) {
            cantPorOperario.set(op.operarioId, (cantPorOperario.get(op.operarioId) ?? 0) + op.cantidad);
          }
        } else {
          const ids = asig.operarioIds?.length ? asig.operarioIds : (asig.operarioId ? [asig.operarioId] : []);
          if (ids.length === 0) continue;
          if (ids.length === 1) {
            cantPorOperario.set(ids[0], (cantPorOperario.get(ids[0]) ?? 0) + filaConf.cantidad);
          } else {
            const base = Math.floor(filaConf.cantidad / ids.length);
            const resto = filaConf.cantidad - base * ids.length;
            ids.forEach((id, i) => {
              cantPorOperario.set(id, (cantPorOperario.get(id) ?? 0) + base + (i === 0 ? resto : 0));
            });
          }
        }
      }
      const tarifa = tarifasOperaciones.find(tt => tt.id === t.id);
      if (!tarifa) continue;
      for (const [opId, cantTotal] of cantPorOperario) {
        if (cantTotal === 0) continue;
        nuevasBoletas.push({
          id: newId(), operarioId: opId, corteId, nCorte: fila.nCorte,
          productoId: fila.productoId, colorId, tarifaId: t.id,
          operacion: tarifa.operacion, orden: tarifa.orden, tarifa: tarifa.tarifa,
          cantPrendas: cantTotal, importe: cantTotal * tarifa.tarifa,
          periodo, estadoPago: 'PENDIENTE',
        });
      }
    }
    boletasViejas.forEach(b => deleteBoletaLinea(b.id));
    if (nuevasBoletas.length > 0) addBoletaLineas(nuevasBoletas);

    setModalEditOps(null);
    addToast('Operarios actualizados', 'success');
  };

  const abrirModalAvance = (corteId: string, colorId: string, talla: string) => {
    const fila = seguimientoFilas.find(f => f.corteId === corteId && f.colorId === colorId && f.talla === talla);
    const inicial: Record<string, boolean> = {};
    const inicialIds: Record<string, { operarioId: string; cantidad: number }[]> = {};
    fila?.asignaciones.forEach(a => {
      inicial[a.tarifaId] = a.confirmado ?? false;
      const ids = a.operarioIds?.length ? a.operarioIds : (a.operarioId ? [a.operarioId] : []);
      const totalCant = fila.cantidad;
      const base = ids.length > 0 ? Math.floor(totalCant / ids.length) : totalCant;
      const resto = ids.length > 0 ? totalCant - base * ids.length : 0;
      inicialIds[a.tarifaId] = ids.map((id, i) => ({ operarioId: id, cantidad: base + (i === 0 ? resto : 0) }));
      if (inicialIds[a.tarifaId].length === 0) inicialIds[a.tarifaId] = [{ operarioId: '', cantidad: totalCant }];
    });
    setAvanceOps(inicial);
    setAvanceOpsIds(inicialIds);
    setModalAvance({ corteId, colorId, talla });
  };

  const guardarModalAvance = () => {
    if (!modalAvance) return;
    const { corteId, colorId, talla } = modalAvance;
    const fila = seguimientoFilas.find(f => f.corteId === corteId && f.colorId === colorId && f.talla === talla);
    if (!fila) return;
    const tarifasCorte = tarifasDelCorte(corteId);
    const totalOps = tarifasCorte.length;
    const confirmadas = Object.values(avanceOps).filter(Boolean).length;
    const pctAvance = totalOps > 0 ? Math.round((confirmadas / totalOps) * 100) : 0;
    const estado = pctAvance === 100 ? 'LISTO' : pctAvance > 0 ? 'EN_PROCESO' : 'PENDIENTE';

    // Construir asignaciones actualizadas para esta talla
    const asignaciones = fila.asignaciones.map(a => {
      const ops = avanceOpsIds[a.tarifaId] ?? [];
      const ids = ops.map(o => o.operarioId).filter(Boolean);
      return {
        ...a,
        confirmado: avanceOps[a.tarifaId] ?? false,
        operarioId: ids[0] ?? a.operarioId,
        operarioIds: ids.length > 0 ? ids : (a.operarioIds ?? []),
      };
    });
    updateSeguimientoFila(fila.id, { asignaciones, pctAvance, estado });

    const periodo = fila.fecha.slice(0, 7);

    // Snapshot de todas las filas del color con esta talla ya actualizada
    const todasLasFilasColor: SeguimientoFila[] = seguimientoFilas
      .filter(f => f.corteId === corteId && f.colorId === colorId)
      .map(f => f.id === fila.id ? { ...f, asignaciones, pctAvance, estado } : f);

    // Reconstruir boletas completas del color desde cero usando el snapshot actualizado
    const boletasViejas = boletaLineas.filter(
      b => b.corteId === corteId && b.colorId === colorId && b.periodo === periodo
    );

    const nuevasBoletas: BoletaLinea[] = [];
    for (const t of tarifasCorte) {
      const filasConfirmadas = todasLasFilasColor.filter(f =>
        f.asignaciones.some(a => a.tarifaId === t.id && a.confirmado === true)
      );
      if (filasConfirmadas.length === 0) continue;

      const cantPorOperario = new Map<string, number>();
      for (const filaConf of filasConfirmadas) {
        const asig = filaConf.asignaciones.find(a => a.tarifaId === t.id);
        if (!asig) continue;
        // Para la talla actual usar avanceOpsIds (cantidades exactas del modal)
        if (filaConf.id === fila.id && asig.operarioIds && asig.operarioIds.length > 1) {
          for (const op of (avanceOpsIds[t.id] ?? []).filter(o => o.operarioId && o.cantidad > 0)) {
            cantPorOperario.set(op.operarioId, (cantPorOperario.get(op.operarioId) ?? 0) + op.cantidad);
          }
        } else {
          const ids = asig.operarioIds?.length ? asig.operarioIds : (asig.operarioId ? [asig.operarioId] : []);
          if (ids.length === 0) continue;
          if (ids.length === 1) {
            cantPorOperario.set(ids[0], (cantPorOperario.get(ids[0]) ?? 0) + filaConf.cantidad);
          } else {
            const base = Math.floor(filaConf.cantidad / ids.length);
            const resto = filaConf.cantidad - base * ids.length;
            ids.forEach((id, i) => {
              cantPorOperario.set(id, (cantPorOperario.get(id) ?? 0) + base + (i === 0 ? resto : 0));
            });
          }
        }
      }

      const tarifa = tarifasOperaciones.find(tt => tt.id === t.id);
      if (!tarifa) continue;
      for (const [opId, cantTotal] of cantPorOperario) {
        if (cantTotal === 0) continue;
        nuevasBoletas.push({
          id: newId(), operarioId: opId, corteId, nCorte: fila.nCorte,
          productoId: fila.productoId, colorId, tarifaId: t.id,
          operacion: tarifa.operacion, orden: tarifa.orden, tarifa: tarifa.tarifa,
          cantPrendas: cantTotal, importe: cantTotal * tarifa.tarifa,
          periodo, estadoPago: 'PENDIENTE',
        });
      }
    }

    boletasViejas.forEach(b => deleteBoletaLinea(b.id));
    if (nuevasBoletas.length > 0) addBoletaLineas(nuevasBoletas);

    setModalAvance(null);
    addToast(estado === 'LISTO' ? `Talla ${talla} marcada como LISTO` : `Talla ${talla}: avance ${pctAvance}%`, 'success');
  };

  // Reconstruye desde cero todas las boletas de un corte+color basándose en el estado confirmado actual
  const reconstruirBoletasColor = (corteId: string, colorId: string) => {
    const tarifasCorte = tarifasDelCorte(corteId);
    const filasColor = seguimientoFilas.filter(f => f.corteId === corteId && f.colorId === colorId);
    if (filasColor.length === 0) return;
    const periodo = filasColor[0].fecha.slice(0, 7);

    // Eliminar TODAS las boletas de este corte+color de una vez
    const boletasViejas = boletaLineas.filter(
      b => b.corteId === corteId && b.colorId === colorId && b.periodo === periodo
    );
    boletasViejas.forEach(b => deleteBoletaLinea(b.id));

    // Construir nuevas boletas agrupando por operario
    const nuevasBoletas: BoletaLinea[] = [];
    for (const t of tarifasCorte) {
      const filasConfirmadas = filasColor.filter(f =>
        f.asignaciones.some(a => a.tarifaId === t.id && a.confirmado === true)
      );
      if (filasConfirmadas.length === 0) continue;

      const cantPorOperario = new Map<string, number>();
      for (const filaConf of filasConfirmadas) {
        const asig = filaConf.asignaciones.find(a => a.tarifaId === t.id);
        if (!asig) continue;
        const ids = asig.operarioIds?.length ? asig.operarioIds : (asig.operarioId ? [asig.operarioId] : []);
        if (ids.length === 0) continue;
        if (ids.length === 1) {
          cantPorOperario.set(ids[0], (cantPorOperario.get(ids[0]) ?? 0) + filaConf.cantidad);
        } else {
          const base = Math.floor(filaConf.cantidad / ids.length);
          const resto = filaConf.cantidad - base * ids.length;
          ids.forEach((id, i) => {
            cantPorOperario.set(id, (cantPorOperario.get(id) ?? 0) + base + (i === 0 ? resto : 0));
          });
        }
      }

      const tarifa = tarifasOperaciones.find(tt => tt.id === t.id);
      if (!tarifa) continue;
      for (const [opId, cantTotal] of cantPorOperario) {
        if (cantTotal === 0) continue;
        nuevasBoletas.push({
          id: newId(), operarioId: opId, corteId, nCorte: filasColor[0].nCorte,
          productoId: filasColor[0].productoId, colorId, tarifaId: t.id,
          operacion: tarifa.operacion, orden: tarifa.orden, tarifa: tarifa.tarifa,
          cantPrendas: cantTotal, importe: cantTotal * tarifa.tarifa,
          periodo, estadoPago: 'PENDIENTE',
        });
      }
    }

    if (nuevasBoletas.length > 0) addBoletaLineas(nuevasBoletas);
    addToast('Boletas recalculadas', 'success');
  };

  // Cantidades por color agrupado: { [colorId]: { S, M, L, XL } }
  // Al seleccionar corte, se agrupa por colorId único (un mismo color en múltiples cortes → un solo bloque)
  type CantsPorColor = { S: string; M: string; L: string; XL: string };
  const [form, setForm] = useState({
    corteId: '', fecha: new Date().toISOString().slice(0, 10),
    cantsPorColor: {} as Record<string, CantsPorColor>,
  });

  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const colorMap = useMemo(() => {
    const canonicos = new Set(mockColores.map(c => c.nombre.toLowerCase()));
    const resolveNombre = (nombre: string): string => {
      const n = nombre.toLowerCase();
      if (canonicos.has(n)) return mockColores.find(c => c.nombre.toLowerCase() === n)!.nombre;
      // Formato nuevo: _dup_NOMBRE_id
      const mNew = nombre.match(/^_dup_(.+?)_[\w-]+$/);
      if (mNew && canonicos.has(mNew[1].toLowerCase()))
        return mockColores.find(c => c.nombre.toLowerCase() === mNew[1].toLowerCase())!.nombre;
      // Formato viejo: _dup_N (número puro) — se resuelve más abajo via cortes; aquí solo lo marca
      return nombre;
    };

    const map = new Map<string, string>();
    for (const c of colores) map.set(c.id, resolveNombre(c.nombre));

    // Para _dup_* sin resolver: buscar en cortes via tonalidad o coloresDetalle
    for (const [id, nombre] of map) {
      if (!nombre.startsWith('_dup_')) continue;
      for (const corte of cortes) {
        if (corte.colorId === id && corte.tonalidad) {
          const base = corte.tonalidad.replace(/\s+Tn-?\d+$/i, '').trim();
          if (canonicos.has(base.toLowerCase())) {
            map.set(id, mockColores.find(c => c.nombre.toLowerCase() === base.toLowerCase())!.nombre);
            break;
          }
        }
        const det = corte.coloresDetalle?.find(d => d.colorId === id);
        if (det) {
          const nombrePrincipal = map.get(corte.colorId) ?? '';
          if (!nombrePrincipal.startsWith('_dup_') && canonicos.has(nombrePrincipal.toLowerCase())) {
            map.set(id, mockColores.find(c => c.nombre.toLowerCase() === nombrePrincipal.toLowerCase())!.nombre);
            break;
          }
          if (det.tonalidad) {
            const base = det.tonalidad.replace(/\s+Tn-?\d+$/i, '').trim();
            if (canonicos.has(base.toLowerCase())) {
              map.set(id, mockColores.find(c => c.nombre.toLowerCase() === base.toLowerCase())!.nombre);
              break;
            }
          }
        }
      }
    }

    // Pass 3: seguimientoFilas → corte → tonalidad / coloresDetalle
    const corteMap2 = new Map(cortes.map(c => [c.id, c]));
    const tryResolveFromTonalidad = (tonalidad: string): string | null => {
      const base = tonalidad.replace(/\s+Tn-?\d+$/i, '').trim();
      const baseLow = base.toLowerCase();
      if (canonicos.has(baseLow)) return mockColores.find(c => c.nombre.toLowerCase() === baseLow)!.nombre;
      // Coincidencia parcial — el canónico contiene la base o viceversa
      for (const c of mockColores) {
        const cn = c.nombre.toLowerCase();
        if (cn === baseLow || baseLow.startsWith(cn) || cn.startsWith(baseLow)) return c.nombre;
      }
      return null;
    };
    for (const [id, nombre] of map) {
      if (!nombre.startsWith('_dup_')) continue;
      const filasConEsteColor = seguimientoFilas.filter(f => f.colorId === id);
      let resuelto = false;
      for (const fila of filasConEsteColor) {
        if (resuelto) break;
        const corte = corteMap2.get(fila.corteId);
        if (!corte) continue;
        // 3a: tonalidad del corte principal si el corte.colorId === id
        if (corte.colorId === id && corte.tonalidad) {
          const r = tryResolveFromTonalidad(corte.tonalidad);
          if (r) { map.set(id, r); resuelto = true; break; }
        }
        // 3b: coloresDetalle del corte para este colorId
        const det = corte.coloresDetalle?.find(d => d.colorId === id);
        if (det?.tonalidad) {
          const r = tryResolveFromTonalidad(det.tonalidad);
          if (r) { map.set(id, r); resuelto = true; break; }
        }
        // 3c: si el corte tiene coloresDetalle, usar la tonalidad del primer detalle con tonalidad
        if (corte.coloresDetalle?.length) {
          for (const d of corte.coloresDetalle) {
            if (d.tonalidad) {
              const r = tryResolveFromTonalidad(d.tonalidad);
              if (r) { map.set(id, r); resuelto = true; break; }
            }
          }
        }
        // 3d: usar la tonalidad del corte aunque no sea el color principal
        if (!resuelto && corte.tonalidad) {
          const r = tryResolveFromTonalidad(corte.tonalidad);
          if (r) { map.set(id, r); resuelto = true; break; }
        }
        // 3e: usar el nombre del color principal del corte si ya está resuelto
        if (!resuelto && corte.colorId !== id) {
          const nombrePrincipal = map.get(corte.colorId) ?? '';
          if (nombrePrincipal && !nombrePrincipal.startsWith('_dup_')) {
            map.set(id, nombrePrincipal); resuelto = true; break;
          }
        }
      }
    }

    // Pass 4: los que aún son _dup_* — reemplazar con texto limpio para no mostrar el string interno
    for (const [id, nombre] of map) {
      if (nombre.startsWith('_dup_')) {
        // Intentar extraer número del formato _dup_N para mostrar "Color N"
        const mNum = nombre.match(/^_dup_(\d+)$/);
        map.set(id, mNum ? `Color ${mNum[1]}` : 'Color');
      }
    }

    return map;
  }, [colores, cortes, seguimientoFilas]);
  const operarioMap = useMemo(() => new Map(operarios.map(o => [o.id, o])), [operarios]);
  const corteMap = useMemo(() => new Map(cortes.map(c => [c.id, c])), [cortes]);
  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);

  // Dado un corteId, agrupa los colores del corte sumando cantidades por colorId
  const coloresUnicosDelCorte = useMemo(() => (corteId: string): { colorId: string; tonalidad?: string; cantS: number; cantM: number; cantL: number; cantXL: number }[] => {
    const corte = corteMap.get(corteId);
    if (!corte) return [];
    const detalles = corte.coloresDetalle && corte.coloresDetalle.length > 0
      ? corte.coloresDetalle
      : [{ colorId: corte.colorId, tonalidad: corte.tonalidad, cantS: corte.cantS, cantM: corte.cantM, cantL: corte.cantL, cantXL: corte.cantXL }];
    // Sumar cantidades por colorId (varios detalles del mismo color → un solo bloque)
    const grouped = new Map<string, { colorId: string; tonalidad?: string; cantS: number; cantM: number; cantL: number; cantXL: number }>();
    for (const d of detalles) {
      const existing = grouped.get(d.colorId);
      if (existing) {
        existing.cantS += (d as any).cantS ?? 0;
        existing.cantM += (d as any).cantM ?? 0;
        existing.cantL += (d as any).cantL ?? 0;
        existing.cantXL += (d as any).cantXL ?? 0;
      } else {
        grouped.set(d.colorId, {
          colorId: d.colorId,
          tonalidad: d.tonalidad,
          cantS: (d as any).cantS ?? 0,
          cantM: (d as any).cantM ?? 0,
          cantL: (d as any).cantL ?? 0,
          cantXL: (d as any).cantXL ?? 0,
        });
      }
    }
    return Array.from(grouped.values());
  }, [corteMap]);


  const tarifasDelCorte = (corteId: string) => {
    const corte = corteMap.get(corteId);
    if (!corte) return [];
    return tarifasOperaciones.filter(t => t.productoId === corte.productoId).sort((a, b) => a.orden - b.orden);
  };

  // Upserta una BoletaLinea para un operario. cantOverride fuerza una cantidad específica (para división entre operarios).
  // colorIdOverride es obligatorio cuando se usa cantOverride para apuntar al color correcto de la talla confirmada.
  const upsertBoletaLinea = (
    operarioId: string,
    corteId: string,
    tarifaId: string,
    periodo: string,
    filasActualizadas: SeguimientoFila[],
    cantOverride?: number,
    colorIdOverride?: string,
  ) => {
    const tarifa = tarifasOperaciones.find(t => t.id === tarifaId);
    if (!tarifa) return;

    if (cantOverride !== undefined) {
      // Cantidad explícita: usar el colorId del modal, no el de la primera fila del periodo
      const colorId = colorIdOverride
        ?? filasActualizadas.find(f => f.corteId === corteId && f.fecha.slice(0, 7) === periodo)?.colorId;
      if (!colorId) return;
      const cantTotal = cantOverride;
      if (cantTotal === 0) return;
      const referenciaFila = filasActualizadas.find(f => f.corteId === corteId && f.colorId === colorId);
      if (!referenciaFila) return;
      const existente = boletaLineas.find(
        b => b.operarioId === operarioId && b.corteId === corteId &&
             b.tarifaId === tarifaId && b.periodo === periodo && b.colorId === colorId
      );
      if (existente) {
        updateBoletaLinea(existente.id, { cantPrendas: cantTotal, importe: cantTotal * tarifa.tarifa });
      } else {
        addBoletaLinea({
          id: newId(), operarioId, corteId, nCorte: referenciaFila.nCorte,
          productoId: referenciaFila.productoId, colorId, tarifaId,
          operacion: tarifa.operacion, orden: tarifa.orden, tarifa: tarifa.tarifa,
          cantPrendas: cantTotal, importe: cantTotal * tarifa.tarifa,
          periodo, estadoPago: 'PENDIENTE',
        });
      }
      return;
    }

    // Sin override: calcular sumando prendas del corte donde este operario tiene esta tarifa
    const cantPorColor = new Map<string, number>();
    for (const f of filasActualizadas) {
      if (f.corteId !== corteId || f.fecha.slice(0, 7) !== periodo) continue;
      const asig = f.asignaciones.find(a =>
        a.tarifaId === tarifaId &&
        (a.operarioId === operarioId || (a.operarioIds ?? []).includes(operarioId))
      );
      if (asig) cantPorColor.set(f.colorId, (cantPorColor.get(f.colorId) ?? 0) + f.cantidad);
    }

    for (const [colorId, cantTotal] of cantPorColor) {
      if (cantTotal === 0) continue;
      const existente = boletaLineas.find(
        b => b.operarioId === operarioId && b.corteId === corteId &&
             b.tarifaId === tarifaId && b.periodo === periodo && b.colorId === colorId
      );
      if (existente) {
        updateBoletaLinea(existente.id, { cantPrendas: cantTotal, importe: cantTotal * tarifa.tarifa });
      } else {
        const primeraFila = filasActualizadas.find(f => f.corteId === corteId && f.colorId === colorId);
        if (!primeraFila) continue;
        addBoletaLinea({
          id: newId(), operarioId, corteId, nCorte: primeraFila.nCorte,
          productoId: primeraFila.productoId, colorId, tarifaId,
          operacion: tarifa.operacion, orden: tarifa.orden, tarifa: tarifa.tarifa,
          cantPrendas: cantTotal, importe: cantTotal * tarifa.tarifa,
          periodo, estadoPago: 'PENDIENTE',
        });
      }
    }
  };

  // Agrupar filas por corte
  const filasPorCorte = useMemo(() => {
    const map = new Map<string, SeguimientoFila[]>();
    for (const f of seguimientoFilas) {
      if (!map.has(f.corteId)) map.set(f.corteId, []);
      map.get(f.corteId)!.push(f);
    }
    return map;
  }, [seguimientoFilas]);

  const cortesConSeguimiento = useMemo(() =>
    cortes.filter(c => {
      if (c.estado === 'ANULADO') return false;
      if (filterCorteId && c.id !== filterCorteId) return false;
      if (filterDesde && c.fecha < filterDesde) return false;
      if (filterHasta && c.fecha > filterHasta) return false;
      return true;
    }).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [cortes, filterCorteId, filterDesde, filterHasta]);

  const filasPorProducto = useMemo(() => {
    if (!filtroProductoId) return [];
    return seguimientoFilas.filter(f => f.productoId === filtroProductoId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [seguimientoFilas, filtroProductoId]);

  const resumenPorProducto = useMemo(() => {
    if (filasPorProducto.length === 0) return null;
    const total = filasPorProducto.reduce((s, f) => s + f.cantidad, 0);
    const avgAvance = total > 0
      ? Math.round(filasPorProducto.reduce((s, f) => s + f.pctAvance * f.cantidad, 0) / total)
      : 0;
    return { total, avgAvance };
  }, [filasPorProducto]);

  const handleAddFila = (e: React.FormEvent) => {
    e.preventDefault();
    const corte = corteMap.get(form.corteId);
    if (!corte) { addToast('Selecciona un corte', 'error'); return; }
    const tarifas = tarifasDelCorte(form.corteId);

    // Colores únicos del corte (dedup por colorId)
    const detallesCorte = coloresUnicosDelCorte(form.corteId);

    let totalFilas = 0;
    for (const det of detallesCorte) {
      const cants = form.cantsPorColor[det.colorId];
      if (!cants) continue;
      const tallasValidas = (['S', 'M', 'L', 'XL'] as const).filter(t => parseInt(cants[t]) > 0);
      for (const talla of tallasValidas) {
        const cantidad = parseInt(cants[talla]);
        const asignaciones: SeguimientoAsignacion[] = tarifas.map(t => ({
          tarifaId: t.id, operacion: t.operacion, orden: t.orden, operarioId: '', pago: 0,
        }));
        const assignedCount = asignaciones.filter(a => a.operarioId).length;
        const pctAvance = asignaciones.length > 0 ? Math.round((assignedCount / asignaciones.length) * 100) : 0;
        const totalPago = asignaciones.reduce((s, a) => s + a.pago, 0);
        addSeguimientoFila({
          id: newId(),
          corteId: form.corteId,
          nCorte: corte.nCorte,
          productoId: corte.productoId,
          fecha: form.fecha,
          colorId: det.colorId,
          talla,
          cantidad,
          asignaciones,
          pctAvance,
          estado: pctAvance === 100 ? 'LISTO' : 'PENDIENTE',
          totalPago,
        });
        totalFilas++;
      }
    }

    if (totalFilas === 0) { addToast('Ingresa al menos una cantidad mayor a 0', 'error'); return; }
    addToast(`${totalFilas} fila${totalFilas > 1 ? 's' : ''} de seguimiento creada${totalFilas > 1 ? 's' : ''}`, 'success');
    setShowForm(false);
    setForm({ corteId: '', fecha: new Date().toISOString().slice(0, 10), cantsPorColor: {} });
  };

  const handleAsignarOperario = (filaId: string, tarifaId: string, operarioId: string) => {
    const fila = seguimientoFilas.find(f => f.id === filaId);
    if (!fila) return;
    const tarifa = tarifasOperaciones.find(t => t.id === tarifaId);

    // Propagar a todas las filas del mismo corte + color
    const filasDelColor = seguimientoFilas.filter(f => f.corteId === fila.corteId && f.colorId === fila.colorId);
    const tarifasCorte = tarifasDelCorte(fila.corteId);

    // Construir versión actualizada para calcular totales correctos
    const filasActualizadas: SeguimientoFila[] = seguimientoFilas.map(f => {
      if (f.corteId !== fila.corteId || f.colorId !== fila.colorId) return f;
      const pago = operarioId && tarifa ? f.cantidad * tarifa.tarifa : 0;
      const base: SeguimientoAsignacion[] = f.asignaciones.length > 0
        ? f.asignaciones
        : tarifasCorte.map(t => ({ tarifaId: t.id, operacion: t.operacion, orden: t.orden, operarioId: '', pago: 0 }));
      return { ...f, asignaciones: base.map(a => a.tarifaId === tarifaId ? { ...a, operarioId, pago } : a) };
    });

    for (const f of filasDelColor) {
      const fAct = filasActualizadas.find(x => x.id === f.id)!;
      const asignaciones = fAct.asignaciones;
      const totalPago = asignaciones.reduce((s, a) => s + a.pago, 0);
      const confirmedCount = asignaciones.filter(a => a.confirmado).length;
      const pctAvance = asignaciones.length > 0 ? Math.round((confirmedCount / asignaciones.length) * 100) : 0;
      const estado = pctAvance === 100 ? 'LISTO' : f.estado;
      updateSeguimientoFila(f.id, { asignaciones, totalPago, pctAvance, estado });
    }

    // Upsert o eliminar boleta según si se asignó o desasignó
    const periodo = fila.fecha.slice(0, 7);
    const opIdPrevio = fila.asignaciones.find(a => a.tarifaId === tarifaId)?.operarioId ?? '';
    const estaConfirmada = fila.asignaciones.find(a => a.tarifaId === tarifaId)?.confirmado ?? false;

    if (opIdPrevio && opIdPrevio !== operarioId) {
      const linea = boletaLineas.find(
        b => b.operarioId === opIdPrevio && b.corteId === fila.corteId &&
             b.tarifaId === tarifaId && b.periodo === periodo && b.colorId === fila.colorId
      );
      if (linea) deleteBoletaLinea(linea.id);
    }

    // Upsert solo si la operación está confirmada
    if (operarioId && tarifa && estaConfirmada) {
      upsertBoletaLinea(operarioId, fila.corteId, tarifaId, periodo, filasActualizadas);
    }
  };

  const buildHojaData = (corteId: string) => {
    const corte = corteMap.get(corteId);
    if (!corte) return null;
    const cliente = corte.clienteId; // se reemplaza abajo con nombre si disponible
    const tarifas = tarifasDelCorte(corteId);
    const filas = (filasPorCorte.get(corteId) ?? []);
    // Ordenar igual que la tabla
    const detalles = corte.coloresDetalle && corte.coloresDetalle.length > 0
      ? corte.coloresDetalle : [{ colorId: corte.colorId }];
    const colorOrder: Record<string, number> = {};
    detalles.forEach((d, i) => { if (!(d.colorId in colorOrder)) colorOrder[d.colorId] = i; });
    const tallasOrd = ['S', 'M', 'L', 'XL'];
    const filasOrdenadas = [...filas].sort((a, b) => {
      const ci = (colorOrder[a.colorId] ?? 999) - (colorOrder[b.colorId] ?? 999);
      if (ci !== 0) return ci;
      return tallasOrd.indexOf(a.talla) - tallasOrd.indexOf(b.talla);
    });
    return {
      nCorte: corte.nCorte,
      producto: productoMap.get(corte.productoId)?.nombre ?? '',
      cliente: clienteMap.get(corte.clienteId) ?? corte.clienteId,
      fecha: corte.fecha,
      operaciones: tarifas.map(t => t.operacion),
      filas: filasOrdenadas.map(f => ({
        color: colorMap.get(f.colorId) ?? f.colorId,
        colorHex: colorHexOverrides[f.colorId] ?? colorHexFromName(colorMap.get(f.colorId) ?? ''),
        talla: f.talla,
        cantidad: f.cantidad,
        operariosPorOp: tarifas.map(t => {
          const a = f.asignaciones.find(a => a.tarifaId === t.id);
          if (!a || !a.operarioId || !a.confirmado) return '';
          const op = operarioMap.get(a.operarioId);
          if (!op) return '';
          const nombre = op.nombre ?? op.codigo;
          // "Apellido Apellido, Nombre Segundo" → "Nombre"
          const partes = nombre.split(',');
          return (partes[1]?.trim().split(/\s+/)[0] ?? partes[0].trim().split(/\s+/)[0]);
        }),
      })),
    };
  };

  const buildRows = () => {
    const tallaOrd = ['S', 'M', 'L', 'XL'];
    return seguimientoFilas
      .filter(f => corteMap.has(f.corteId))
      .slice()
      .sort((a, b) => {
        const ca = corteMap.get(a.corteId)!;
        const cb = corteMap.get(b.corteId)!;
        // 1. Fecha corte desc, luego nCorte
        const byFecha = cb.fecha.localeCompare(ca.fecha) || String(ca.nCorte).localeCompare(String(cb.nCorte));
        if (byFecha !== 0) return byFecha;
        // 2. Orden del color dentro del corte
        const getColorOrder = (corte: typeof ca, colorId: string) => {
          const det = corte.coloresDetalle && corte.coloresDetalle.length > 0
            ? corte.coloresDetalle : [{ colorId: corte.colorId }];
          const idx = det.findIndex(d => d.colorId === colorId);
          return idx === -1 ? 999 : idx;
        };
        const byColor = getColorOrder(ca, a.colorId) - getColorOrder(cb, b.colorId);
        if (byColor !== 0) return byColor;
        // 3. Talla S→XL
        return tallaOrd.indexOf(a.talla) - tallaOrd.indexOf(b.talla);
      })
      .map((f) => {
        const corte = corteMap.get(f.corteId);
        return {
          NCorte: f.nCorte,
          Fecha: f.fecha,
          Producto: productoMap.get(corte?.productoId ?? '')?.nombre ?? '',
          Color: colorMap.get(f.colorId) ?? f.colorId,
          Talla: f.talla,
          Cantidad: f.cantidad,
          AvancePct: `${f.pctAvance}%`,
          Estado: f.estado,
          TotalPago: `S/. ${f.totalPago.toFixed(2)}`,
        };
      });
  };

  const generarFilasFaltantes = () => {
    const cortesSinFilas = cortes.filter(c =>
      c.estado !== 'ANULADO' && !filasPorCorte.has(c.id)
    );
    if (cortesSinFilas.length === 0) {
      addToast('Todos los cortes ya tienen seguimiento', 'info');
      return;
    }
    let totalFilas = 0;
    for (const corte of cortesSinFilas) {
      const tarifas = tarifasOperaciones
        .filter(t => t.productoId === corte.productoId)
        .sort((a, b) => a.orden - b.orden);
      const detalles = corte.coloresDetalle && corte.coloresDetalle.length > 0
        ? corte.coloresDetalle
        : [{ colorId: corte.colorId, cantS: corte.cantS, cantM: corte.cantM, cantL: corte.cantL, cantXL: corte.cantXL }];
      const grouped = new Map<string, { cantS: number; cantM: number; cantL: number; cantXL: number }>();
      for (const d of detalles) {
        const prev = grouped.get(d.colorId) ?? { cantS: 0, cantM: 0, cantL: 0, cantXL: 0 };
        grouped.set(d.colorId, {
          cantS: prev.cantS + ((d as any).cantS ?? 0),
          cantM: prev.cantM + ((d as any).cantM ?? 0),
          cantL: prev.cantL + ((d as any).cantL ?? 0),
          cantXL: prev.cantXL + ((d as any).cantXL ?? 0),
        });
      }
      for (const [colorId, cants] of grouped) {
        const tallasValidas = (['S', 'M', 'L', 'XL'] as const).filter(t => cants[`cant${t}` as keyof typeof cants] > 0);
        for (const talla of tallasValidas) {
          const cantidad = cants[`cant${talla}` as keyof typeof cants] as number;
          const asignaciones: SeguimientoAsignacion[] = tarifas.map(t => ({
            tarifaId: t.id, operacion: t.operacion, orden: t.orden, operarioId: '', pago: 0,
          }));
          addSeguimientoFila({
            id: newId(),
            corteId: corte.id,
            nCorte: corte.nCorte,
            productoId: corte.productoId,
            fecha: corte.fecha,
            colorId,
            talla,
            cantidad,
            asignaciones,
            pctAvance: 0,
            estado: 'PENDIENTE',
            totalPago: 0,
          });
          totalFilas++;
        }
      }
    }
    addToast(`${totalFilas} fila${totalFilas !== 1 ? 's' : ''} creada${totalFilas !== 1 ? 's' : ''} para ${cortesSinFilas.length} corte${cortesSinFilas.length !== 1 ? 's' : ''}`, 'success');
  };

  const exportarSeguimiento = () => {
    exportRowsToXlsx(buildRows(), `seguimiento_confeccion_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Confeccion');
    addToast('Excel exportado', 'success');
  };

  const exportarSeguimientoPdf = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    exportTableToPdf({
      title: 'Seguimiento Confección',
      subtitle: `Asignación por operación y talla — ${fecha}`,
      fileName: `seguimiento_confeccion_${fecha}`,
      columns: [
        { header: 'N° Corte', dataKey: 'NCorte' },
        { header: 'Fecha', dataKey: 'Fecha' },
        { header: 'Producto', dataKey: 'Producto' },
        { header: 'Color', dataKey: 'Color' },
        { header: 'Talla', dataKey: 'Talla' },
        { header: 'Cantidad', dataKey: 'Cantidad' },
        { header: 'Avance', dataKey: 'AvancePct' },
        { header: 'Estado', dataKey: 'Estado' },
        { header: 'Total Pago', dataKey: 'TotalPago' },
      ],
      rows: buildRows(),
      rightCols: ['TotalPago'],
      centerCols: ['Talla', 'Cantidad', 'AvancePct', 'Estado'],
    });
    addToast('PDF exportado', 'success');
  };

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Seguimiento Confección</h2>
          <p className="text-xs text-gray-500 mt-1">Asignación de operarios por operación y talla</p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleInfoBox
            accent="#B89B5E"
            titulo="Seguimiento Confección"
            descripcion="Asigna operarios a cada operación de confección por talla y corte. Calcula el avance porcentual y el pago por destajo generado. Agrupa las filas por corte con vista expandible."
            items={[
              { label: 'Por Corte', detail: 'Filas agrupadas por N° de corte con totales de prendas y pago' },
              { label: 'Por Producto', detail: 'Filtro por producto: muestra todos sus cortes, avance y pago total' },
              { label: 'Avance', detail: 'Calculado como promedio ponderado de asignaciones completadas' },
              { label: 'Estado', detail: 'PENDIENTE → EN_PROCESO → LISTO → PAGADO' },
            ]}
          />
          <button onClick={exportarSeguimiento} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportarSeguimientoPdf} className="btn-secondary flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF
          </button>
<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nueva Fila
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'seguimiento', label: 'Por Corte' },
          { id: 'porProducto', label: 'Por Producto' },
        ] as { id: 'seguimiento' | 'porProducto'; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#1a1a1a] text-[#1a1a1a]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'seguimiento' && <>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Corte</label>
          <select value={filterCorteId} onChange={e => setFilterCorteId(e.target.value)} className="input-base text-xs w-48">
            <option value="">Todos los cortes</option>
            {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
              <option key={c.id} value={c.id}>{c.nCorte}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Desde</label>
          <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} className="input-base w-36" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Hasta</label>
          <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} className="input-base w-36" />
        </div>
        {(filterCorteId || filterDesde || filterHasta) && (
          <button
            onClick={() => { setFilterCorteId(''); setFilterDesde(''); setFilterHasta(''); }}
            className="btn-secondary text-xs h-8 px-3 self-end"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {cortesConSeguimiento.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin cortes activos.</p>
      ) : (
        <div className="space-y-3">
          {cortesConSeguimiento.map(corte => {
            const filas = filasPorCorte.get(corte.id) ?? [];
            const isOpen = expandedCorte === corte.id;
            const avgAvance = filas.length > 0 ? Math.round(filas.reduce((s, f) => s + f.pctAvance, 0) / filas.length) : 0;
            // Fechas del corte — tomadas de la primera fila o del estado de edición
            const fechaRef = filas[0];
            const fechasGuardadas = {
              inicio: fechaRef?.fechaInicio ?? '',
              entrega: fechaRef?.fechaEntrega ?? '',
            };
            const fechasEdit = editFechas[corte.id] ?? fechasGuardadas;
            const guardarFechas = (inicio: string, entrega: string) => {
              filas.forEach(f => updateSeguimientoFila(f.id, { fechaInicio: inicio, fechaEntrega: entrega }));
              setEditFechas(prev => ({ ...prev, [corte.id]: { inicio, entrega } }));
            };

            return (
              <div key={corte.id} className="bg-white border border-gray-200">
                <div
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedCorte(isOpen ? null : corte.id)}
                >
                  <div className="flex items-center gap-4">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-black text-sm">{corte.nCorte}</span>
                    <span className="text-xs text-gray-500">{capWords(productoMap.get(corte.productoId)?.nombre ?? '')}</span>
                    <span className="text-xs text-gray-400">{colorMap.get(corte.colorId)}</span>
                    <span className="text-xs text-gray-400">{corte.totalPrendas} prendas</span>
                    {fechasGuardadas.inicio && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        Inicio: {fechasGuardadas.inicio}
                      </span>
                    )}
                    {fechasGuardadas.entrega && (
                      <span className={`text-[10px] font-mono font-bold ${
                        fechasGuardadas.entrega < new Date().toISOString().slice(0,10) && avgAvance < 100
                          ? 'text-red-500'
                          : 'text-orange-500'
                      }`}>
                        Entrega: {fechasGuardadas.entrega}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{filas.length} filas</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-200">
                        <div className="h-full bg-black" style={{ width: `${avgAvance}%` }} />
                      </div>
                      <span className="text-xs font-bold">{avgAvance}%</span>
                    </div>
                    {filas.length > 0 && (
                      <>
                      <button
                        onClick={e => { e.stopPropagation(); const d = buildHojaData(corte.id); if (d) exportHojaSeguimientoPdf(d, pdfFont); }}
                        className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 px-1 py-0.5 rounded hover:bg-gray-100"
                        title="Exportar hoja de seguimiento PDF"
                      >
                        <FileText className="h-3 w-3" /><span>PDF</span>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); const d = buildHojaData(corte.id); if (d) exportHojaSeguimientoXlsx(d); }}
                        className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 px-1 py-0.5 rounded hover:bg-gray-100"
                        title="Exportar hoja de seguimiento Excel"
                      >
                        <Download className="h-3 w-3" /><span>Excel</span>
                      </button>
                      </>
                    )}
                    {esAdmin && filas.length > 0 && (
                      confirmDeleteCorte === corte.id ? (
                        <span className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <span className="text-[11px] text-red-600 font-bold">¿Eliminar {filas.length} fila{filas.length > 1 ? 's' : ''}?</span>
                          <button
                            onClick={() => {
                              filas.forEach(f => deleteSeguimientoFila(f.id));
                              boletaLineas.filter(b => b.corteId === corte.id).forEach(b => deleteBoletaLinea(b.id));
                              setConfirmDeleteCorte(null);
                              addToast(`Seguimiento de corte eliminado (${filas.length} filas)`, 'success');
                            }}
                            className="text-[11px] font-bold text-red-600 hover:text-red-800 uppercase px-1"
                          >Sí</button>
                          <button
                            onClick={() => setConfirmDeleteCorte(null)}
                            className="text-[11px] text-gray-500 hover:text-gray-700 px-1"
                          >No</button>
                        </span>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteCorte(corte.id); }}
                          className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 px-1 py-0.5 rounded hover:bg-red-50"
                          title="Eliminar todo el seguimiento de este corte"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Eliminar seguimiento</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-200">
                    {/* Barra de fechas */}
                    <div className="flex items-center gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fechas</span>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-gray-500 whitespace-nowrap">Inicio:</label>
                        <input
                          type="date"
                          value={fechasEdit.inicio}
                          onChange={e => {
                            const v = e.target.value;
                            setEditFechas(prev => ({ ...prev, [corte.id]: { ...fechasEdit, inicio: v } }));
                          }}
                          onBlur={e => guardarFechas(e.target.value, fechasEdit.entrega)}
                          className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-gray-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-gray-500 whitespace-nowrap">Entrega:</label>
                        <input
                          type="date"
                          value={fechasEdit.entrega}
                          onChange={e => {
                            const v = e.target.value;
                            setEditFechas(prev => ({ ...prev, [corte.id]: { ...fechasEdit, entrega: v } }));
                          }}
                          onBlur={e => guardarFechas(fechasEdit.inicio, e.target.value)}
                          className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-gray-400"
                        />
                      </div>
                      {(fechasEdit.inicio !== fechasGuardadas.inicio || fechasEdit.entrega !== fechasGuardadas.entrega) && (
                        <button
                          onClick={() => guardarFechas(fechasEdit.inicio, fechasEdit.entrega)}
                          className="text-[10px] font-bold text-blue-600 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100"
                        >
                          Guardar
                        </button>
                      )}
                    </div>
                    {filas.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400 italic">Sin filas creadas para este corte.</p>
                    ) : (() => {
                      const tarifas = tarifasDelCorte(corte.id);
                      const filasOrdenadas = (() => {
                        const detalles = corte.coloresDetalle && corte.coloresDetalle.length > 0
                          ? corte.coloresDetalle : [{ colorId: corte.colorId }];
                        const colorOrder: Record<string, number> = {};
                        detalles.forEach((d, i) => { if (!(d.colorId in colorOrder)) colorOrder[d.colorId] = i; });
                        const ord = ['S','M','L','XL'];
                        return [...filas].sort((a, b) => {
                          const ci = (colorOrder[a.colorId] ?? 999) - (colorOrder[b.colorId] ?? 999);
                          if (ci !== 0) return ci;
                          return ord.indexOf(a.talla) - ord.indexOf(b.talla);
                        });
                      })();
                      // Agrupar filas por color (manteniendo el orden)
                      const gruposPorColor: { colorId: string; filas: SeguimientoFila[] }[] = [];
                      for (const fila of filasOrdenadas) {
                        const ultimo = gruposPorColor[gruposPorColor.length - 1];
                        if (ultimo && ultimo.colorId === fila.colorId) {
                          ultimo.filas.push(fila);
                        } else {
                          gruposPorColor.push({ colorId: fila.colorId, filas: [fila] });
                        }
                      }
                      return (
                        <>
                          <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Color</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Operarios</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Talla</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Cantidad</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Avance</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Pago</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {gruposPorColor.map(grupo => {
                                const primerFila = grupo.filas[0];
                                const asignados = primerFila.asignaciones.filter(a => a.operarioId).length;
                                const totalOps = primerFila.asignaciones.length;
                                return grupo.filas.map((fila, idx) => {
                                  const rowBg = fila.estado === 'LISTO'
                                    ? 'bg-green-50 hover:bg-green-100'
                                    : fila.pctAvance > 0
                                      ? 'bg-amber-50 hover:bg-amber-100'
                                      : 'bg-red-50 hover:bg-red-100';
                                  return (
                                  <tr key={fila.id} className={`${rowBg} ${idx < grupo.filas.length - 1 ? 'border-b border-dashed border-gray-100' : 'border-b border-gray-200'}`}>
                                    {idx === 0 && (
                                      <td
                                        className="px-3 py-2 font-black whitespace-nowrap align-middle"
                                        rowSpan={grupo.filas.length}
                                      >
                                        <div className="flex flex-col gap-1 items-start">
                                          <span>{colorMap.get(grupo.colorId) ?? grupo.colorId}</span>
                                          <button
                                            onClick={() => reconstruirBoletasColor(corte.id, grupo.colorId)}
                                            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-blue-600 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100 whitespace-nowrap"
                                            title="Recalcular boletas de destajo para este color, solo tallas confirmadas"
                                          >
                                            <RotateCcw className="h-2.5 w-2.5" />
                                            Recalcular
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                    {idx === 0 && (
                                      <td className="px-3 py-2 align-middle" rowSpan={grupo.filas.length}>
                                        <button
                                          onClick={() => abrirModalAsignarColor(corte.id, grupo.colorId)}
                                          className={`flex items-center gap-1.5 text-[10px] border px-2 py-1 rounded hover:bg-gray-100 whitespace-nowrap ${
                                            asignados === totalOps && totalOps > 0
                                              ? 'border-green-300 text-green-700 bg-green-50'
                                              : asignados > 0
                                                ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
                                                : 'border-gray-200 text-gray-500'
                                          }`}
                                        >
                                          <span>{asignados}/{totalOps} ops</span>
                                        </button>
                                      </td>
                                    )}
                                    <td className="px-3 py-2 font-bold text-center">{fila.talla}</td>
                                    <td className="px-3 py-2 font-mono text-right">{fila.cantidad}</td>
                                    <td className="px-3 py-2">
                                      {(() => {
                                        const opActual = fila.asignaciones
                                          .slice()
                                          .sort((a, b) => a.orden - b.orden)
                                          .find(a => !a.confirmado);
                                        return (
                                          <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                              <div className="w-16 h-1.5 bg-gray-200">
                                                <div className="h-full bg-black" style={{ width: `${fila.pctAvance}%` }} />
                                              </div>
                                              <span className="text-[10px]">{fila.pctAvance}%</span>
                                              {fila.estado === 'LISTO' ? (
                                                <button
                                                  onClick={() => abrirModalAvance(corte.id, grupo.colorId, fila.talla)}
                                                  className="flex items-center gap-1 text-[10px] border border-green-400 bg-green-100 text-green-800 px-1.5 py-0.5 rounded hover:bg-green-200 whitespace-nowrap"
                                                  title="Ver/editar avance confirmado"
                                                >
                                                  <CheckCircle className="h-2.5 w-2.5" />
                                                  <span>Listo</span>
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() => abrirModalAvance(corte.id, grupo.colorId, fila.talla)}
                                                  className="flex items-center gap-1 text-[10px] border border-gray-300 text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100 whitespace-nowrap"
                                                  title="Confirmar avance de operaciones para esta talla"
                                                >
                                                  <CheckCircle className="h-2.5 w-2.5" />
                                                  <span>Confirmar</span>
                                                </button>
                                              )}
                                            {/* Botón ··· con menú desplegable */}
                                            {(() => {
                                              const menuKey = `${corte.id}-${grupo.colorId}-${fila.talla}`;
                                              const abierto = menuAbierto === menuKey;
                                              return (
                                                <div className="relative">
                                                  <button
                                                    onClick={() => setMenuAbierto(abierto ? null : menuKey)}
                                                    className="flex items-center text-[10px] border border-gray-200 text-gray-400 px-1 py-0.5 rounded hover:bg-gray-100 hover:text-gray-600"
                                                    title="Más opciones"
                                                  >
                                                    <MoreHorizontal className="h-3 w-3" />
                                                  </button>
                                                  {abierto && (
                                                    <>
                                                      <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(null)} />
                                                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[140px]">
                                                        <button
                                                          onClick={() => abrirModalEditOps(corte.id, grupo.colorId, fila.talla)}
                                                          className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                                        >
                                                          Editar operarios
                                                        </button>
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                            </div>
                                            {fila.estado !== 'LISTO' && opActual && (
                                              <div className="flex items-center gap-1">
                                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                                                <span className="text-[9px] text-blue-700 font-bold truncate max-w-[120px]">
                                                  {opActual.orden}. {opActual.operacion}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-right font-bold">S/ {fila.totalPago.toFixed(2)}</td>
                                    {esAdmin && (
                                    <td className="px-3 py-2">
                                      {confirmDelete === fila.id ? (
                                        <span className="flex items-center gap-1 whitespace-nowrap">
                                          <button onClick={() => {
                                            deleteSeguimientoFila(fila.id);
                                            const restantes = filas.filter(f => f.id !== fila.id);
                                            if (restantes.length === 0) boletaLineas.filter(b => b.corteId === fila.corteId).forEach(b => deleteBoletaLinea(b.id));
                                            setConfirmDelete(null);
                                            addToast('Fila eliminada', 'success');
                                          }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                                          <span className="text-gray-300">/</span>
                                          <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                                        </span>
                                      ) : (
                                        <button onClick={() => setConfirmDelete(fila.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </td>
                                    )}
                                  </tr>
                                  );
                                })}
                              )}
                            </tbody>
                          </table>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      </>}

      {/* Tab: Por Producto */}
      {activeTab === 'porProducto' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Producto</label>
              <select
                value={filtroProductoId}
                onChange={e => setFiltroProductoId(e.target.value)}
                className="input-base text-xs w-60"
              >
                <option value="">Seleccionar producto…</option>
                {[...productos].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => (
                  <option key={p.id} value={p.id}>{capWords(p.nombre)}</option>
                ))}
              </select>
            </div>
            {filtroProductoId && resumenPorProducto && (
              <div className="flex gap-4 pb-1 text-xs">
                <span className="text-gray-500">Total prendas: <span className="font-black text-gray-800">{resumenPorProducto.total}</span></span>
                <span className="text-gray-500">Avance prom: <span className="font-black text-gray-800">{resumenPorProducto.avgAvance}%</span></span>
              </div>
            )}
          </div>

          {!filtroProductoId ? (
            <p className="text-sm text-gray-400 italic">Selecciona un producto para ver su seguimiento.</p>
          ) : filasPorProducto.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin filas de seguimiento para este producto.</p>
          ) : (
            <div className="texajo-table-shell">
              <div className="texajo-table-scroll">
                <table className="texajo-table">
                  <thead>
                    <tr>
                      {['N° Corte', 'Fecha', 'Color', 'Talla', 'Cantidad', 'Avance', 'Estado', 'Total Pago'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filasPorProducto.map(fila => {
                      const corte = corteMap.get(fila.corteId);
                      return (
                        <tr key={fila.id}>
                          <td className="font-bold font-mono">{fila.nCorte}</td>
                          <td className="font-mono whitespace-nowrap">{fila.fecha}</td>
                          <td className="whitespace-nowrap">{colorMap.get(fila.colorId) ?? fila.colorId}</td>
                          <td className="font-bold text-center">{fila.talla}</td>
                          <td className="font-mono text-right">{fila.cantidad}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200">
                                <div className="h-full bg-black" style={{ width: `${fila.pctAvance}%` }} />
                              </div>
                              <span className="text-[10px] font-mono">{fila.pctAvance}%</span>
                            </div>
                          </td>
                          <td>
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${
                              fila.estado === 'LISTO' ? 'bg-green-100 text-green-800' :
                              fila.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>{fila.estado}</span>
                          </td>
                          <td className="font-mono text-right font-bold">S/ {fila.totalPago.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</td>
                      <td className="font-mono text-right font-black">{resumenPorProducto?.total}</td>
                      <td className="text-[10px] font-bold text-gray-700">{resumenPorProducto?.avgAvance}% prom.</td>
                      <td />
                      <td className="font-mono text-right font-black">S/ {filasPorProducto.reduce((s, f) => s + f.totalPago, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmar avance de operaciones */}
      {modalAvance && (() => {
        const { corteId, colorId, talla } = modalAvance;
        const tarifasModal = tarifasDelCorte(corteId);
        const filaModal = seguimientoFilas.find(f => f.corteId === corteId && f.colorId === colorId && f.talla === talla);
        const confirmadas = Object.values(avanceOps).filter(Boolean).length;
        const pctPreview = tarifasModal.length > 0 ? Math.round((confirmadas / tarifasModal.length) * 100) : 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalAvance(null)}>
            <div className="bg-white w-full max-w-sm rounded shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="font-black text-sm">Confirmar avance</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {colorMap.get(colorId)} — Talla {talla} — {filaModal?.cantidad ?? 0} prendas
                  </p>
                </div>
                <button onClick={() => setModalAvance(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-2 max-h-[55vh] overflow-y-auto">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Operaciones — Talla {talla}</p>
                {tarifasModal.map(t => {
                  const checked = avanceOps[t.id] ?? false;
                  const asig = filaModal?.asignaciones.find(a => a.tarifaId === t.id);
                  const ids = asig?.operarioIds?.length ? asig.operarioIds : (asig?.operarioId ? [asig.operarioId] : []);
                  const nombresOps = ids.map(id => {
                    const op = operarioMap.get(id);
                    if (!op) return '';
                    return (op.nombre ?? op.codigo).split(',')[1]?.trim().split(/\s+/)[0] ?? (op.nombre ?? op.codigo).split(/\s+/)[0];
                  }).filter(Boolean);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors ${checked ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => setAvanceOps(prev => ({ ...prev, [t.id]: e.target.checked }))}
                        className="h-3.5 w-3.5 accent-green-600 flex-shrink-0"
                      />
                      <span className="text-[10px] text-gray-400 font-mono w-4 flex-shrink-0">{t.orden}.</span>
                      <span className={`text-[11px] font-bold flex-1 ${checked ? 'text-green-800' : 'text-gray-700'}`}>{t.operacion}</span>
                      {nombresOps.length > 0 && (
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{nombresOps.join(', ')}</span>
                      )}
                    </label>
                  );
                })}
              </div>
              {/* Preview avance */}
              <div className="px-5 pb-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-gray-200 rounded">
                  <div className="h-full bg-black rounded transition-all" style={{ width: `${pctPreview}%` }} />
                </div>
                <span className="text-[11px] font-black tabular-nums w-10 text-right">{pctPreview}%</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  pctPreview === 100 ? 'bg-green-100 text-green-800' :
                  pctPreview > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {pctPreview === 100 ? 'Listo' : pctPreview > 0 ? 'En proceso' : 'Pendiente'}
                </span>
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
                <button onClick={() => setModalAvance(null)} className="btn-secondary text-xs">Cancelar</button>
                <button onClick={guardarModalAvance} className="btn-primary text-xs">Confirmar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal edición de operarios por talla */}
      {modalEditOps && (() => {
        const { corteId, colorId, talla } = modalEditOps;
        const tarifasModal = tarifasDelCorte(corteId);
        const filaModal = seguimientoFilas.find(f => f.corteId === corteId && f.colorId === colorId && f.talla === talla);
        const cantFila = filaModal?.cantidad ?? 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalEditOps(null)}>
            <div className="bg-white w-full max-w-sm rounded shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="font-black text-sm">Editar operarios</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {colorMap.get(colorId)} — Talla {talla} — {cantFila} prendas
                  </p>
                </div>
                <button onClick={() => setModalEditOps(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Operarios por operación — Talla {talla}</p>
                {tarifasModal.map(t => {
                  const ops = avanceOpsIds[t.id] ?? [];
                  const totalAsignado = ops.reduce((s, o) => s + (o.cantidad || 0), 0);
                  const descuadre = totalAsignado !== cantFila && ops.some(o => o.operarioId);
                  return (
                    <div key={t.id} className="rounded border border-gray-200 bg-white">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                        <span className="text-[10px] text-gray-400 font-mono w-4 flex-shrink-0">{t.orden}.</span>
                        <span className="text-[11px] font-bold text-gray-700 flex-1">{t.operacion}</span>
                        {descuadre && (
                          <span className="text-[9px] text-amber-600 font-bold whitespace-nowrap">{totalAsignado}/{cantFila}</span>
                        )}
                      </div>
                      <div className="px-3 py-2 space-y-1">
                        {ops.map((op, opIdx) => (
                          <div key={opIdx} className="flex items-center gap-1.5">
                            <select
                              value={op.operarioId}
                              onChange={e => {
                                const newOpId = e.target.value;
                                setAvanceOpsIds(prev => {
                                  const list = [...(prev[t.id] ?? [])];
                                  list[opIdx] = { ...list[opIdx], operarioId: newOpId };
                                  return { ...prev, [t.id]: list };
                                });
                              }}
                              className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white min-w-0"
                            >
                              <option value="">— sin operario —</option>
                              {operarios.filter(o => o.estado === 'ACTIVO').map(o => (
                                <option key={o.id} value={o.id}>
                                  {(o.nombre ?? o.codigo).split(',')[1]?.trim().split(/\s+/)[0] ?? (o.nombre ?? o.codigo).split(/\s+/)[0]} ({o.codigo})
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              max={cantFila}
                              value={op.cantidad}
                              onChange={e => {
                                const val = Math.min(parseInt(e.target.value) || 0, cantFila);
                                setAvanceOpsIds(prev => {
                                  const list = [...(prev[t.id] ?? [])];
                                  list[opIdx] = { ...list[opIdx], cantidad: val };
                                  const otros = list.length - 1;
                                  if (otros > 0) {
                                    const resto = cantFila - val;
                                    const base = Math.floor(Math.max(resto, 0) / otros);
                                    const mod = Math.max(resto, 0) - base * otros;
                                    let primerOtro = true;
                                    for (let i = 0; i < list.length; i++) {
                                      if (i === opIdx) continue;
                                      list[i] = { ...list[i], cantidad: base + (primerOtro ? mod : 0) };
                                      primerOtro = false;
                                    }
                                  }
                                  return { ...prev, [t.id]: list };
                                });
                              }}
                              className="w-14 text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-right font-mono"
                            />
                            {ops.length > 1 && (
                              <button
                                onClick={() => setAvanceOpsIds(prev => {
                                  const list = (prev[t.id] ?? []).filter((_, i) => i !== opIdx);
                                  const total = list.reduce((s, o) => s + o.cantidad, 0);
                                  if (total !== cantFila && list.length > 0) {
                                    const base = Math.floor(cantFila / list.length);
                                    const resto = cantFila - base * list.length;
                                    return { ...prev, [t.id]: list.map((o, i) => ({ ...o, cantidad: base + (i === 0 ? resto : 0) })) };
                                  }
                                  return { ...prev, [t.id]: list };
                                })}
                                className="text-gray-300 hover:text-red-400 flex-shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => setAvanceOpsIds(prev => {
                            const list = [...(prev[t.id] ?? [])];
                            const newCount = list.length + 1;
                            const base = Math.floor(cantFila / newCount);
                            const resto = cantFila - base * newCount;
                            const newList = list.map((o, i) => ({ ...o, cantidad: base + (i === 0 ? resto : 0) }));
                            newList.push({ operarioId: '', cantidad: base });
                            return { ...prev, [t.id]: newList };
                          })}
                          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 mt-0.5"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Agregar operario</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
                <button onClick={() => setModalEditOps(null)} className="btn-secondary text-xs">Cancelar</button>
                <button onClick={guardarModalEditOps} className="btn-primary text-xs">Guardar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal nueva fila */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gray-300 w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <h3 className="text-sm font-black uppercase tracking-widest">Nueva Fila de Seguimiento</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAddFila} className="p-6 space-y-4 overflow-y-auto flex-1">
              <F label="Corte">
                <select
                  value={form.corteId}
                  onChange={e => {
                    const corteId = e.target.value;
                    const colores = coloresUnicosDelCorte(corteId);
                    const cantsPorColor: Record<string, { S: string; M: string; L: string; XL: string }> = {};
                    for (const d of colores) cantsPorColor[d.colorId] = {
                      S: d.cantS > 0 ? String(d.cantS) : '',
                      M: d.cantM > 0 ? String(d.cantM) : '',
                      L: d.cantL > 0 ? String(d.cantL) : '',
                      XL: d.cantXL > 0 ? String(d.cantXL) : '',
                    };
                    setForm(f => ({ ...f, corteId, cantsPorColor }));
                  }}
                  className="input-base"
                  required
                >
                  <option value="">Seleccionar…</option>
                  {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
                    <option key={c.id} value={c.id}>{c.nCorte} — {capWords(productoMap.get(c.productoId)?.nombre ?? '')}</option>
                  ))}
                </select>
              </F>
              <F label="Fecha">
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="input-base" />
              </F>

              {/* Bloques por color — un bloque por colorId único del corte */}
              {(() => {
                if (!form.corteId) return null;
                const detalles = coloresUnicosDelCorte(form.corteId);
                if (detalles.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Cantidades por Color
                    </label>
                    {detalles.map(det => {
                      const nombreColor = colorMap.get(det.colorId) ?? det.colorId;
                      const cants = form.cantsPorColor[det.colorId] ?? { S: '', M: '', L: '', XL: '' };
                      const setCant = (talla: 'S' | 'M' | 'L' | 'XL', val: string) =>
                        setForm(f => ({
                          ...f,
                          cantsPorColor: {
                            ...f.cantsPorColor,
                            [det.colorId]: { ...f.cantsPorColor[det.colorId] ?? { S: '', M: '', L: '', XL: '' }, [talla]: val },
                          },
                        }));
                      return (
                        <div key={det.colorId} className="border border-gray-200 p-3 bg-gray-50">
                          <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                            {nombreColor}
                            {det.tonalidad && (
                              <span className="ml-1.5 text-[10px] font-mono text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                                Tn-{det.tonalidad}
                              </span>
                            )}
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {(['S', 'M', 'L', 'XL'] as const).map(t => (
                              <div key={t}>
                                <label className="block text-[10px] font-bold text-center text-gray-400 mb-1">{t}</label>
                                <input
                                  type="number" min={0} placeholder="0"
                                  value={cants[t]}
                                  onChange={e => setCant(t, e.target.value)}
                                  className="input-base text-center text-sm py-1 w-full"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal asignación de operarios por color */}
      {modalColor && (() => {
        const { corteId, colorId } = modalColor;
        const tarifasModal = tarifasDelCorte(corteId);
        const filasDelColor = seguimientoFilas.filter(f => f.corteId === corteId && f.colorId === colorId);
        const totalPrendas = filasDelColor.reduce((s, f) => s + f.cantidad, 0);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalColor(null)}>
            <div className="bg-white w-full max-w-md rounded shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="font-black text-sm">Asignar operarios</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {colorMap.get(colorId)} — {totalPrendas} prendas ({filasDelColor.map(f => f.talla).join(', ')})
                  </p>
                </div>
                <button onClick={() => setModalColor(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Selector de color para PDF */}
              <div className="px-5 pt-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Color en PDF</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.entries(COLOR_PALETTE).map(([nombre, hex]) => (
                    <button
                      key={hex}
                      title={nombre}
                      onClick={() => setModalHex(hex)}
                      className="w-6 h-6 rounded border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: hex,
                        borderColor: modalHex === hex ? '#000' : 'transparent',
                        outline: modalHex === hex ? '1px solid #fff' : 'none',
                        outlineOffset: '-3px',
                      }}
                    />
                  ))}
                  {/* Picker libre */}
                  <label title="Elegir color personalizado" className="w-6 h-6 rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-500 overflow-hidden">
                    <input
                      type="color"
                      value={modalHex}
                      onChange={e => setModalHex(e.target.value)}
                      className="opacity-0 absolute w-6 h-6 cursor-pointer"
                    />
                    <span className="text-[9px] text-gray-400 pointer-events-none">+</span>
                  </label>
                </div>
                {/* Preview */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: modalHex }} />
                  <span className="text-[10px] text-gray-500 font-mono">{modalHex}</span>
                </div>
              </div>
              <div className="px-5 py-3 space-y-3 max-h-[60vh] overflow-y-auto">
                {tarifasModal.map(t => {
                  const tallasOrden = ['S','M','L','XL'] as const;
                  const tallasPresentes = tallasOrden.filter(ta => filasDelColor.some(f => f.talla === ta));
                  // Operario "global" de esta operación = el de la primera talla presente
                  const primeraT = tallasPresentes[0] ?? '';
                  const globalId = modalOps[t.id]?.[primeraT]?.[0] ?? '';
                  // ¿Hay tallas con operario distinto al global?
                  const hayExcepcion = tallasPresentes.some(ta => {
                    const opTalla = modalOps[t.id]?.[ta]?.[0] ?? '';
                    return opTalla && opTalla !== globalId;
                  });

                  const aplicarGlobalATallas = (opId: string) => {
                    setModalOps(prev => {
                      const tallaMap: Record<string, string[]> = {};
                      tallasPresentes.forEach(ta => { tallaMap[ta] = [opId]; });
                      return { ...prev, [t.id]: tallaMap };
                    });
                    setModalOpsQty(prev => {
                      const tallaMap: Record<string, number[]> = {};
                      filasDelColor.forEach(f => { tallaMap[f.talla] = [f.cantidad]; });
                      return { ...prev, [t.id]: tallaMap };
                    });
                  };

                  return (
                    <div key={t.id} className="space-y-1.5 border border-gray-100 rounded p-2">
                      {/* Fila principal: operación + selector global */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400 w-5 text-right flex-shrink-0">{t.orden}.</span>
                        <span className="text-[11px] font-bold text-gray-700 w-28 truncate flex-shrink-0">{t.operacion}</span>
                        <select
                          value={hayExcepcion ? '' : globalId}
                          onChange={e => aplicarGlobalATallas(e.target.value)}
                          className="text-[11px] border border-gray-200 bg-white px-2 py-0.5 rounded flex-1 min-w-0"
                        >
                          <option value="">{hayExcepcion ? '— mixto —' : '— sin asignar —'}</option>
                          {operarios.filter(o => o.estado === 'ACTIVO').map(o => (
                            <option key={o.id} value={o.id}>{o.nombre ?? o.codigo}</option>
                          ))}
                        </select>
                      </div>
                      {/* Filas por talla — siempre visibles para poder personalizar */}
                      <div className="pl-7 space-y-1">
                        {tallasPresentes.map(ta => {
                          const fila = filasDelColor.find(f => f.talla === ta)!;
                          const opId = modalOps[t.id]?.[ta]?.[0] ?? '';
                          const esDiferente = opId && opId !== globalId;
                          return (
                            <div key={ta} className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-black w-5 ${esDiferente ? 'text-blue-600' : 'text-gray-400'}`}>{ta}</span>
                              <span className="text-[10px] text-gray-400 font-mono w-8 text-right">{fila.cantidad}p</span>
                              <select
                                value={opId}
                                onChange={e => {
                                  const newOpId = e.target.value;
                                  setModalOps(prev => ({
                                    ...prev,
                                    [t.id]: { ...(prev[t.id] ?? {}), [ta]: [newOpId] },
                                  }));
                                  setModalOpsQty(prev => ({
                                    ...prev,
                                    [t.id]: { ...(prev[t.id] ?? {}), [ta]: [fila.cantidad] },
                                  }));
                                }}
                                className={`text-[11px] border rounded px-2 py-0.5 flex-1 min-w-0 ${esDiferente ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                              >
                                <option value="">— sin asignar —</option>
                                {operarios.filter(o => o.estado === 'ACTIVO').map(o => (
                                  <option key={o.id} value={o.id}>{o.nombre ?? o.codigo}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
                <button onClick={() => setModalColor(null)} className="btn-secondary text-xs">Cancelar</button>
                <button onClick={guardarModalAsignar} className="btn-primary text-xs">Guardar</button>
              </div>
            </div>
          </div>
        );
      })()}
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
