import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, ChevronDown, ChevronRight, FileText, Trash2, CheckCircle, RotateCcw, MoreHorizontal, Shirt, Scissors, Users, Calendar, Clock, PackageSearch } from 'lucide-react';
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

  // Modal asignación operarios + confirmación de avance, combinados: { corteId, colorId } abierto,
  // más una talla "foco" opcional (cuando se abre desde el botón Confirmar de una talla específica)
  const [modalColor, setModalColor] = useState<{ corteId: string; colorId: string; tallaFoco?: string } | null>(null);
  // modalOps[tarifaId][talla] = operarioId[]  — permite operarios distintos por talla
  const [modalOps, setModalOps] = useState<Record<string, Record<string, string[]>>>({});
  // modalConfirmado[tarifaId][talla] = confirmado — se guarda junto con la asignación de operario
  const [modalConfirmado, setModalConfirmado] = useState<Record<string, Record<string, boolean>>>({});
  // Operarios por operación en el modal confirmar: { [tarifaId]: { operarioId, cantidad }[] }
  const [avanceOpsIds, setAvanceOpsIds] = useState<Record<string, { operarioId: string; cantidad: number }[]>>({});
  // Menú desplegable "···" por fila (corteId+colorId+talla)
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  // Modal edición de operarios por talla (separado del modal confirmar)
  const [modalEditOps, setModalEditOps] = useState<{ corteId: string; colorId: string; talla: string } | null>(null);
  // Operaciones con excepción por talla expandida en el modal "Asignar operarios" (tarifaId[])
  const [tarifasExpandidas, setTarifasExpandidas] = useState<Set<string>>(new Set());
  // Hex overrides por colorId — persiste durante la sesión para que el PDF use el color elegido
  const [colorHexOverrides, setColorHexOverrides] = useState<Record<string, string>>({});
  const [modalHex, setModalHex] = useState<string>('#9E9E9E');
  // Fuente del PDF — persiste en la sesión
  const pdfFont: PdfFont = 'oswald';
  // Cantidades por operario en el modal global: { [tarifaId][talla]: number[] }
  const [modalOpsQty, setModalOpsQty] = useState<Record<string, Record<string, number[]>>>({});

  const abrirModalAsignarColor = (corteId: string, colorId: string, tallaFoco?: string) => {
    const filasDelColor = seguimientoFilas.filter(f => f.corteId === corteId && f.colorId === colorId);
    const ops: Record<string, Record<string, string[]>> = {};
    const qty: Record<string, Record<string, number[]>> = {};
    const confirmado: Record<string, Record<string, boolean>> = {};
    for (const fila of filasDelColor) {
      fila.asignaciones.forEach(a => {
        if (!ops[a.tarifaId]) ops[a.tarifaId] = {};
        if (!qty[a.tarifaId]) qty[a.tarifaId] = {};
        if (!confirmado[a.tarifaId]) confirmado[a.tarifaId] = {};
        const ids = a.operarioIds?.length ? a.operarioIds : (a.operarioId ? [a.operarioId] : ['']);
        ops[a.tarifaId][fila.talla] = ids;
        confirmado[a.tarifaId][fila.talla] = a.confirmado ?? false;
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
    setModalConfirmado(confirmado);
    // Expandir automáticamente las operaciones que ya tienen operarios o confirmaciones distintas entre tallas
    const expandidas = new Set<string>();
    for (const [tarifaId, tallaMap] of Object.entries(ops)) {
      const idsUnicos = new Set(Object.values(tallaMap).map(ids => ids[0] ?? ''));
      const confUnicos = new Set(Object.values(confirmado[tarifaId] ?? {}));
      if (idsUnicos.size > 1 || confUnicos.size > 1) expandidas.add(tarifaId);
    }
    setTarifasExpandidas(expandidas);
    const hexInicial = colorHexOverrides[colorId] ?? colorHexFromName(colorMap.get(colorId) ?? '');
    setModalHex(hexInicial);
    setModalColor({ corteId, colorId, tallaFoco });
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
        const idsCrudos = tallaOps[fila.talla] ?? [];
        const ids = idsCrudos.filter(Boolean);
        const tarifa = tarifasOperaciones.find(t => t.id === a.tarifaId);
        const pago = ids.length && tarifa ? fila.cantidad * tarifa.tarifa : 0;
        const idsPrevios = a.operarioIds?.length ? a.operarioIds : (a.operarioId ? [a.operarioId] : []);
        const cambiaronOperarios = ids.length > 0 &&
          (ids.length !== idsPrevios.length || ids.some(id => !idsPrevios.includes(id)));
        // El check de confirmado se decide en el modal; si se cambió de operario, exige reconfirmar.
        const confirmadoModal = modalConfirmado[a.tarifaId]?.[fila.talla] ?? a.confirmado ?? false;
        const confirmado = (confirmadoModal && cambiaronOperarios) ? false : confirmadoModal;
        return {
          ...a, operarioId: ids[0] ?? '', operarioIds: ids, pago, confirmado,
        };
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
          // Reparto personalizado (modo mixto): usar las cantidades del modal si suman el total de la fila;
          // si no cuadran (dato viejo o inconsistente), caer de vuelta a reparto equitativo.
          const idsCrudos = modalOps[t.id]?.[fila.talla] ?? [];
          const qtyCrudos = modalOpsQty[t.id]?.[fila.talla] ?? [];
          const sumaQty = idsCrudos.reduce((s, id, i) => s + (id ? (qtyCrudos[i] ?? 0) : 0), 0);
          if (idsCrudos.length === ids.length && sumaQty === fila.cantidad) {
            idsCrudos.forEach((id, i) => {
              if (!id) return;
              cantPorOperario.set(id, (cantPorOperario.get(id) ?? 0) + (qtyCrudos[i] ?? 0));
            });
          } else {
            const base = Math.floor(fila.cantidad / ids.length);
            const resto = fila.cantidad - base * ids.length;
            ids.forEach((id, i) => {
              cantPorOperario.set(id, (cantPorOperario.get(id) ?? 0) + base + (i === 0 ? resto : 0));
            });
          }
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
    addToast('Operarios y avance guardados', 'success');
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

    // Si se cambia el conjunto de operarios de una operación ya confirmada, exigir
    // reconfirmación: no dejar que el/los nuevo(s) operario(s) cobren sin verificación.
    const asignaciones = fila.asignaciones.map(a => {
      const ops = avanceOpsIds[a.tarifaId] ?? [];
      const ids = ops.map(o => o.operarioId).filter(Boolean);
      const idsPrevios = a.operarioIds?.length ? a.operarioIds : (a.operarioId ? [a.operarioId] : []);
      const cambiaronOperarios = ids.length > 0 &&
        (ids.length !== idsPrevios.length || ids.some(id => !idsPrevios.includes(id)));
      return {
        ...a,
        operarioId: ids[0] ?? a.operarioId,
        operarioIds: ids.length > 0 ? ids : (a.operarioIds ?? []),
        confirmado: (a.confirmado && cambiaronOperarios) ? false : a.confirmado,
      };
    });
    const pctAvance = asignaciones.length > 0
      ? Math.round((asignaciones.filter(a => a.confirmado).length / asignaciones.length) * 100)
      : fila.pctAvance;
    const estado = pctAvance === 100 ? 'LISTO' : (fila.estado === 'LISTO' ? 'EN_PROCESO' : fila.estado);
    updateSeguimientoFila(fila.id, { asignaciones, pctAvance, estado });

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

    // Si se cambia el operario de una operación ya confirmada, exigir reconfirmación:
    // el nuevo operario no debe cobrar automáticamente por trabajo que no se ha verificado.
    const opIdPrevio = fila.asignaciones.find(a => a.tarifaId === tarifaId)?.operarioId ?? '';
    const estabaConfirmada = fila.asignaciones.find(a => a.tarifaId === tarifaId)?.confirmado ?? false;
    const reasignacion = estabaConfirmada && opIdPrevio && opIdPrevio !== operarioId;

    // Construir versión actualizada para calcular totales correctos
    const filasActualizadas: SeguimientoFila[] = seguimientoFilas.map(f => {
      if (f.corteId !== fila.corteId || f.colorId !== fila.colorId) return f;
      const pago = operarioId && tarifa ? f.cantidad * tarifa.tarifa : 0;
      const base: SeguimientoAsignacion[] = f.asignaciones.length > 0
        ? f.asignaciones
        : tarifasCorte.map(t => ({ tarifaId: t.id, operacion: t.operacion, orden: t.orden, operarioId: '', pago: 0 }));
      return {
        ...f,
        asignaciones: base.map(a => a.tarifaId === tarifaId
          ? { ...a, operarioId, pago, confirmado: reasignacion ? false : a.confirmado }
          : a),
      };
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

    if (opIdPrevio && opIdPrevio !== operarioId) {
      const linea = boletaLineas.find(
        b => b.operarioId === opIdPrevio && b.corteId === fila.corteId &&
             b.tarifaId === tarifaId && b.periodo === periodo && b.colorId === fila.colorId
      );
      if (linea) deleteBoletaLinea(linea.id);
    }

    // Upsert solo si la operación sigue confirmada tras la reasignación (no se resetea confirmado)
    if (operarioId && tarifa && estabaConfirmada && !reasignacion) {
      upsertBoletaLinea(operarioId, fila.corteId, tarifaId, periodo, filasActualizadas);
    }
    if (reasignacion) {
      addToast('Operario reasignado — la operación quedó pendiente de reconfirmar', 'info');
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="hidden sm:flex h-11 w-11 flex-shrink-0 items-center justify-center"
            style={{ background: '#7B5EA715', border: '1px solid #7B5EA740' }}
          >
            <Shirt className="h-5 w-5" style={{ color: '#7B5EA7' }} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#9A8F87' }}>Producción</p>
            <h2 className="font-serif text-2xl font-bold leading-tight" style={{ color: '#1a1a1a' }}>Seguimiento Confección</h2>
            <p className="text-xs text-gray-500 mt-0.5">Asignación de operarios por operación y talla</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModuleInfoBox
            accent="#7B5EA7"
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
      <div className="flex flex-wrap gap-1 border-b" style={{ borderColor: '#DDD8CF' }}>
        {([
          { id: 'seguimiento', label: 'Por Corte', icon: Scissors },
          { id: 'porProducto', label: 'Por Producto', icon: Shirt },
        ] as { id: 'seguimiento' | 'porProducto'; label: string; icon: typeof Scissors }[]).map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 border-b-2 transition-colors"
              style={{
                borderColor: isActive ? '#1a1a1a' : 'transparent',
                color: isActive ? '#1a1a1a' : '#9A8F87',
              }}
            >
              <tab.icon className="h-3.5 w-3.5" style={{ color: isActive ? '#7B5EA7' : 'currentColor' }} />
              {tab.label}
            </button>
          );
        })}
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
            className="text-[11px] font-bold uppercase tracking-widest px-2 self-end h-8"
            style={{ color: '#9A8F87' }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {cortesConSeguimiento.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ border: '1px dashed #DDD8CF' }}>
          <span className="h-10 w-10 flex items-center justify-center" style={{ background: '#7B5EA718' }}>
            <Shirt className="h-5 w-5" style={{ color: '#7B5EA7' }} />
          </span>
          <p className="text-sm font-bold text-gray-500">Sin cortes activos</p>
          <p className="text-xs text-gray-400">Los cortes completados aparecerán aquí para su seguimiento.</p>
        </div>
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

            const avanceColor = avgAvance === 100 ? '#2F7A4D' : avgAvance >= 50 ? '#4B7FA3' : '#B6762A';
            const entregaVencida = fechasGuardadas.entrega && fechasGuardadas.entrega < new Date().toISOString().slice(0, 10) && avgAvance < 100;

            return (
              <div key={corte.id} className="bg-white" style={{ border: '1px solid #DDD8CF', borderLeft: `3px solid ${avanceColor}` }}>
                <div
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedCorte(isOpen ? null : corte.id)}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    {isOpen ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: '#7B5EA7' }} /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />}
                    <span className="font-mono font-black text-sm" style={{ color: '#1a1a1a' }}>{corte.nCorte}</span>
                    <span className="text-xs font-bold text-gray-600">{capWords(productoMap.get(corte.productoId)?.nombre ?? '')}</span>
                    <span className="text-xs text-gray-400">{capWords(colorMap.get(corte.colorId) ?? '')}</span>
                    <span className="text-xs font-mono text-gray-400">{corte.totalPrendas} prendas</span>
                    {fechasGuardadas.inicio && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                        <Clock className="h-3 w-3" /> {fechasGuardadas.inicio}
                      </span>
                    )}
                    {fechasGuardadas.entrega && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-mono font-bold"
                        style={{ color: entregaVencida ? '#C0362C' : '#B6762A' }}
                      >
                        <Calendar className="h-3 w-3" /> {fechasGuardadas.entrega}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] text-gray-400 font-mono">{filas.length} filas</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 overflow-hidden" style={{ background: '#EAE6DD' }}>
                        <div className="h-full transition-all" style={{ width: `${avgAvance}%`, background: avanceColor }} />
                      </div>
                      <span className="text-xs font-bold font-mono tabular-nums" style={{ color: avanceColor }}>{avgAvance}%</span>
                    </div>
                    {filas.length > 0 && (
                      <>
                      <button
                        onClick={e => { e.stopPropagation(); const d = buildHojaData(corte.id); if (d) exportHojaSeguimientoPdf(d, pdfFont); }}
                        className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 px-1.5 py-0.5 transition-colors"
                        title="Exportar hoja de seguimiento PDF"
                      >
                        <FileText className="h-3 w-3" /><span>PDF</span>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); const d = buildHojaData(corte.id); if (d) exportHojaSeguimientoXlsx(d); }}
                        className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 px-1.5 py-0.5 transition-colors"
                        title="Exportar hoja de seguimiento Excel"
                      >
                        <Download className="h-3 w-3" /><span>Excel</span>
                      </button>
                      </>
                    )}
                    {esAdmin && filas.length > 0 && (
                      confirmDeleteCorte === corte.id ? (
                        <span className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <span className="text-[11px] font-bold" style={{ color: '#C0362C' }}>¿Eliminar {filas.length} fila{filas.length > 1 ? 's' : ''}?</span>
                          <button
                            onClick={() => {
                              filas.forEach(f => deleteSeguimientoFila(f.id));
                              boletaLineas.filter(b => b.corteId === corte.id).forEach(b => deleteBoletaLinea(b.id));
                              setConfirmDeleteCorte(null);
                              addToast(`Seguimiento de corte eliminado (${filas.length} filas)`, 'success');
                            }}
                            className="text-[11px] font-bold uppercase px-1"
                            style={{ color: '#C0362C' }}
                          >Sí</button>
                          <button
                            onClick={() => setConfirmDeleteCorte(null)}
                            className="text-[11px] text-gray-400 hover:text-gray-600 px-1"
                          >No</button>
                        </span>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteCorte(corte.id); }}
                          className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 transition-colors"
                          style={{ color: '#C0362C99' }}
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
                  <div style={{ borderTop: '1px solid #DDD8CF' }}>
                    {/* Barra de fechas */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-2.5" style={{ background: '#FAF8F4', borderBottom: '1px solid #EFECE5' }} onClick={e => e.stopPropagation()}>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <Calendar className="h-3 w-3" /> Fechas
                      </span>
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
                          className="text-[10px] px-1.5 py-0.5 bg-white focus:outline-none"
                          style={{ border: '1px solid #DDD8CF' }}
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
                          className="text-[10px] px-1.5 py-0.5 bg-white focus:outline-none"
                          style={{ border: '1px solid #DDD8CF' }}
                        />
                      </div>
                      {(fechasEdit.inicio !== fechasGuardadas.inicio || fechasEdit.entrega !== fechasGuardadas.entrega) && (
                        <button
                          onClick={() => guardarFechas(fechasEdit.inicio, fechasEdit.entrega)}
                          className="text-[10px] font-bold px-2 py-0.5 transition-colors"
                          style={{ color: '#4B7FA3', border: '1px solid #4B7FA355', background: '#4B7FA30D' }}
                        >
                          Guardar
                        </button>
                      )}
                    </div>
                    {filas.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <PackageSearch className="h-5 w-5 text-gray-300" />
                        <p className="text-xs text-gray-400 italic">Sin filas creadas para este corte.</p>
                      </div>
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
                          <table className="min-w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                              <tr style={{ background: '#1a1a1a' }}>
                                {['Color', 'Operarios', 'Talla', 'Cantidad', 'Avance', 'Total Pago', ''].map(h => (
                                  <th key={h} className="px-3 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: '#f9f7f2' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {gruposPorColor.map(grupo => {
                                const primerFila = grupo.filas[0];
                                const asignados = primerFila.asignaciones.filter(a => a.operarioId).length;
                                const totalOps = primerFila.asignaciones.length;
                                return grupo.filas.map((fila, idx) => {
                                  // Colores explícitos por estado de fila (NO usar nth-child: el rowSpan del
                                  // grupo de color rompe la correspondencia índice↔fila real).
                                  const rowBg = fila.estado === 'LISTO'
                                    ? '#2F7A4D0D'
                                    : fila.pctAvance > 0
                                      ? '#B6762A0D'
                                      : '#C0362C0A';
                                  const rowBorder = idx < grupo.filas.length - 1 ? '1px dashed #EFECE5' : '1px solid #DDD8CF';
                                  return (
                                  <tr key={fila.id} style={{ background: rowBg, borderBottom: rowBorder }} className="transition-colors hover:brightness-95">
                                    {idx === 0 && (
                                      <td
                                        className="px-3 py-2.5 font-bold whitespace-nowrap align-middle"
                                        style={{ color: '#1a1a1a' }}
                                        rowSpan={grupo.filas.length}
                                      >
                                        <div className="flex flex-col gap-1.5 items-start">
                                          <span>{capWords(colorMap.get(grupo.colorId) ?? grupo.colorId)}</span>
                                          <button
                                            onClick={() => reconstruirBoletasColor(corte.id, grupo.colorId)}
                                            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 transition-colors whitespace-nowrap"
                                            style={{ color: '#4B7FA3', border: '1px solid #4B7FA355', background: '#4B7FA30D' }}
                                            title="Recalcular boletas de destajo para este color, solo tallas confirmadas"
                                          >
                                            <RotateCcw className="h-2.5 w-2.5" />
                                            Recalcular
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                    {idx === 0 && (
                                      <td className="px-3 py-2.5 align-middle" rowSpan={grupo.filas.length}>
                                        <button
                                          onClick={() => abrirModalAsignarColor(corte.id, grupo.colorId)}
                                          className="flex items-center gap-1.5 text-[10px] px-2 py-1 transition-colors whitespace-nowrap"
                                          style={
                                            asignados === totalOps && totalOps > 0
                                              ? { color: '#2F7A4D', border: '1px solid #2F7A4D55', background: '#2F7A4D0D' }
                                              : asignados > 0
                                                ? { color: '#B6762A', border: '1px solid #B6762A55', background: '#B6762A0D' }
                                                : { color: '#6B6058', border: '1px solid #DDD8CF' }
                                          }
                                        >
                                          <Users className="h-3 w-3" />
                                          <span>{asignados}/{totalOps} ops</span>
                                        </button>
                                      </td>
                                    )}
                                    <td className="px-3 py-2.5 font-bold text-center" style={{ color: '#1a1a1a' }}>{fila.talla}</td>
                                    <td className="px-3 py-2.5 font-mono text-right">{fila.cantidad}</td>
                                    <td className="px-3 py-2.5">
                                      {(() => {
                                        const opActual = fila.asignaciones
                                          .slice()
                                          .sort((a, b) => a.orden - b.orden)
                                          .find(a => !a.confirmado);
                                        const avanceColorFila = fila.pctAvance === 100 ? '#2F7A4D' : fila.pctAvance >= 50 ? '#4B7FA3' : '#B6762A';
                                        return (
                                          <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                              <div className="w-16 h-1.5 overflow-hidden" style={{ background: '#EAE6DD' }}>
                                                <div className="h-full transition-all" style={{ width: `${fila.pctAvance}%`, background: avanceColorFila }} />
                                              </div>
                                              <span className="text-[10px] font-mono font-bold" style={{ color: avanceColorFila }}>{fila.pctAvance}%</span>
                                              {fila.estado === 'LISTO' ? (
                                                <button
                                                  onClick={() => abrirModalAsignarColor(corte.id, grupo.colorId, fila.talla)}
                                                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 transition-colors whitespace-nowrap"
                                                  style={{ color: '#2F7A4D', border: '1px solid #2F7A4D55', background: '#2F7A4D15' }}
                                                  title="Ver o editar operarios y avance"
                                                >
                                                  <CheckCircle className="h-2.5 w-2.5" />
                                                  <span>Listo</span>
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() => abrirModalAsignarColor(corte.id, grupo.colorId, fila.talla)}
                                                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 transition-colors whitespace-nowrap"
                                                  style={{ color: '#6B6058', border: '1px solid #DDD8CF' }}
                                                  title="Asignar operarios y confirmar avance de esta talla"
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
                                                    className="flex items-center text-[10px] px-1 py-0.5 transition-colors"
                                                    style={{ color: '#9A8F87', border: '1px solid #DDD8CF' }}
                                                    title="Más opciones"
                                                  >
                                                    <MoreHorizontal className="h-3 w-3" />
                                                  </button>
                                                  {abierto && (
                                                    <>
                                                      <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(null)} />
                                                      <div className="absolute right-0 top-full mt-1 z-20 bg-white py-1 min-w-[140px]" style={{ border: '1px solid #DDD8CF', boxShadow: '0 8px 24px -8px rgba(26,26,26,0.25)' }}>
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
                                                <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#4B7FA3' }} />
                                                <span className="text-[9px] font-bold truncate max-w-[120px]" style={{ color: '#4B7FA3' }}>
                                                  {opActual.orden}. {opActual.operacion}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-3 py-2.5 font-mono text-right font-bold" style={{ color: '#1a1a1a' }}>S/ {fila.totalPago.toFixed(2)}</td>
                                    {esAdmin && (
                                    <td className="px-3 py-2.5">
                                      {confirmDelete === fila.id ? (
                                        <span className="flex items-center gap-1 whitespace-nowrap">
                                          <button onClick={() => {
                                            deleteSeguimientoFila(fila.id);
                                            const restantes = filas.filter(f => f.id !== fila.id);
                                            if (restantes.length === 0) boletaLineas.filter(b => b.corteId === fila.corteId).forEach(b => deleteBoletaLinea(b.id));
                                            setConfirmDelete(null);
                                            addToast('Fila eliminada', 'success');
                                          }} className="text-[10px] font-bold uppercase" style={{ color: '#C0362C' }}>Sí</button>
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
                <span className="text-gray-500">Total prendas: <span className="font-black" style={{ color: '#1a1a1a' }}>{resumenPorProducto.total}</span></span>
                <span className="text-gray-500">Avance prom: <span className="font-black" style={{ color: '#1a1a1a' }}>{resumenPorProducto.avgAvance}%</span></span>
              </div>
            )}
          </div>

          {!filtroProductoId ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ border: '1px dashed #DDD8CF' }}>
              <span className="h-10 w-10 flex items-center justify-center" style={{ background: '#7B5EA718' }}>
                <Shirt className="h-5 w-5" style={{ color: '#7B5EA7' }} />
              </span>
              <p className="text-sm font-bold text-gray-500">Selecciona un producto</p>
              <p className="text-xs text-gray-400">Verás todo su seguimiento de confección aquí.</p>
            </div>
          ) : filasPorProducto.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ border: '1px dashed #DDD8CF' }}>
              <PackageSearch className="h-8 w-8 text-gray-300" />
              <p className="text-sm font-bold text-gray-500">Sin filas de seguimiento</p>
              <p className="text-xs text-gray-400">Este producto aún no tiene cortes en seguimiento.</p>
            </div>
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
                      const avanceColorFila = fila.pctAvance === 100 ? '#2F7A4D' : fila.pctAvance >= 50 ? '#4B7FA3' : '#B6762A';
                      const estadoColor = fila.estado === 'LISTO' ? '#2F7A4D' : fila.estado === 'EN_PROCESO' ? '#4B7FA3' : fila.estado === 'ANULADO' ? '#C0362C' : '#9A8F87';
                      return (
                        <tr key={fila.id}>
                          <td className="font-bold font-mono">{fila.nCorte}</td>
                          <td className="font-mono whitespace-nowrap">{fila.fecha}</td>
                          <td className="whitespace-nowrap">{capWords(colorMap.get(fila.colorId) ?? fila.colorId)}</td>
                          <td className="font-bold text-center">{fila.talla}</td>
                          <td className="font-mono text-right">{fila.cantidad}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 overflow-hidden" style={{ background: '#EAE6DD' }}>
                                <div className="h-full transition-all" style={{ width: `${fila.pctAvance}%`, background: avanceColorFila }} />
                              </div>
                              <span className="text-[10px] font-mono font-bold" style={{ color: avanceColorFila }}>{fila.pctAvance}%</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase"
                              style={{ background: `${estadoColor}18`, color: estadoColor }}
                            >{fila.estado.replace('_', ' ')}</span>
                          </td>
                          <td className="font-mono text-right font-bold">S/ {fila.totalPago.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
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
      {/* Modal edición de operarios por talla */}
      {modalEditOps && (() => {
        const { corteId, colorId, talla } = modalEditOps;
        const tarifasModal = tarifasDelCorte(corteId);
        const filaModal = seguimientoFilas.find(f => f.corteId === corteId && f.colorId === colorId && f.talla === talla);
        const cantFila = filaModal?.cantidad ?? 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalEditOps(null)}>
            <div className="bg-white w-full max-w-sm" style={{ border: '1px solid #DDD8CF' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: '#FFFDF9', borderBottom: '3px solid #4B7FA3' }}>
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 flex-shrink-0 flex items-center justify-center" style={{ background: '#4B7FA318' }}>
                    <Users className="h-4 w-4" style={{ color: '#4B7FA3' }} />
                  </span>
                  <div>
                    <p className="font-serif font-bold text-sm" style={{ color: '#1a1a1a' }}>Editar operarios</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {capWords(colorMap.get(colorId) ?? '')} — Talla {talla} — {cantFila} prendas
                    </p>
                  </div>
                </div>
                <button onClick={() => setModalEditOps(null)} className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-2.5 max-h-[55vh] overflow-y-auto">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Operarios por operación — Talla {talla}</p>
                <p className="text-[10px] text-gray-400 -mt-1 mb-1">Si más de un operario trabajó la misma operación, agrégalos y ajusta cuánto hizo cada uno.</p>
                {tarifasModal.map(t => {
                  const ops = avanceOpsIds[t.id] ?? [];
                  const totalAsignado = ops.reduce((s, o) => s + (o.cantidad || 0), 0);
                  const hayAlgo = ops.some(o => o.operarioId);
                  const descuadre = totalAsignado !== cantFila && hayAlgo;
                  const completo = totalAsignado === cantFila && hayAlgo;
                  return (
                    <div key={t.id} className="bg-white rounded-sm" style={{ border: '1px solid #DDD8CF' }}>
                      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid #EFECE5', background: '#FAF8F4' }}>
                        <span className="text-[10px] text-gray-400 font-mono w-4 flex-shrink-0">{t.orden}.</span>
                        <span className="text-[12px] font-bold flex-1 min-w-0 truncate" style={{ color: '#1a1a1a' }}>{t.operacion}</span>
                        {hayAlgo && (
                          <span
                            className="text-[9px] font-bold whitespace-nowrap px-1.5 py-0.5 flex-shrink-0"
                            style={completo ? { color: '#2F7A4D', background: '#2F7A4D14' } : { color: '#B6762A', background: '#B6762A14' }}
                          >
                            {totalAsignado}/{cantFila}p
                          </span>
                        )}
                      </div>
                      {/* Barra de reparto entre operarios */}
                      {ops.length > 1 && (
                        <div className="flex h-1.5 w-full" style={{ background: '#EAE6DD' }}>
                          {ops.map((op, i) => op.cantidad > 0 && (
                            <div
                              key={i}
                              style={{
                                width: `${(op.cantidad / cantFila) * 100}%`,
                                background: ['#4B7FA3', '#7B5EA7', '#B6762A', '#2F7A4D'][i % 4],
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="px-3 py-2.5 space-y-1.5">
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
                              className="flex-1 text-[11px] px-2 py-1.5 bg-white min-w-0"
                              style={{ border: '1px solid #DDD8CF' }}
                            >
                              <option value="">— sin operario —</option>
                              {operarios.filter(o => o.estado === 'ACTIVO').map(o => (
                                <option key={o.id} value={o.id}>
                                  {capWords((o.nombre ?? o.codigo).split(',')[1]?.trim().split(/\s+/)[0] ?? (o.nombre ?? o.codigo).split(/\s+/)[0])} ({o.codigo})
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center flex-shrink-0" style={{ border: '1px solid #DDD8CF' }}>
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
                                className="w-12 text-[11px] px-1.5 py-1.5 text-right font-mono border-0 focus:outline-none"
                              />
                              <span className="text-[9px] text-gray-400 pr-2 flex-shrink-0">prendas</span>
                            </div>
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
                                className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
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
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-700 mt-1 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Agregar otro operario</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #EFECE5' }}>
                <button onClick={() => setModalEditOps(null)} className="btn-secondary text-xs">Cancelar</button>
                <button onClick={guardarModalEditOps} className="btn-primary text-xs">Guardar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal nueva fila */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col" style={{ border: '1px solid #DDD8CF' }}>
            <div className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0" style={{ background: '#FFFDF9', borderBottom: '3px solid #7B5EA7' }}>
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 flex-shrink-0 flex items-center justify-center" style={{ background: '#7B5EA718' }}>
                  <Plus className="h-4 w-4" style={{ color: '#7B5EA7' }} />
                </span>
                <h3 className="font-serif font-bold text-sm" style={{ color: '#1a1a1a' }}>Nueva Fila de Seguimiento</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
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
                      const nombreColor = capWords(colorMap.get(det.colorId) ?? det.colorId);
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
                        <div key={det.colorId} className="p-3" style={{ border: '1px solid #DDD8CF', background: '#FAF8F4' }}>
                          <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#1a1a1a' }}>
                            {nombreColor}
                            {det.tonalidad && (
                              <span className="ml-1.5 text-[10px] font-mono text-gray-400 px-1.5 py-0.5" style={{ background: '#EAE6DD' }}>
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
        const { corteId, colorId, tallaFoco } = modalColor;
        const tarifasModal = tarifasDelCorte(corteId);
        const filasDelColor = seguimientoFilas.filter(f => f.corteId === corteId && f.colorId === colorId);
        const totalPrendas = filasDelColor.reduce((s, f) => s + f.cantidad, 0);
        // Preview de avance general del color con los cambios del modal (antes de guardar)
        const totalCeldas = tarifasModal.length * filasDelColor.length;
        const confirmadasPreview = tarifasModal.reduce((s, t) =>
          s + filasDelColor.filter(f => modalConfirmado[t.id]?.[f.talla]).length, 0);
        const pctPreviewColor = totalCeldas > 0 ? Math.round((confirmadasPreview / totalCeldas) * 100) : 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalColor(null)}>
            <div className="bg-white w-full max-w-md" style={{ border: '1px solid #DDD8CF' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: '#FFFDF9', borderBottom: '3px solid #7B5EA7' }}>
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 flex-shrink-0 flex items-center justify-center" style={{ background: '#7B5EA718' }}>
                    <Users className="h-4 w-4" style={{ color: '#7B5EA7' }} />
                  </span>
                  <div>
                    <p className="font-serif font-bold text-sm" style={{ color: '#1a1a1a' }}>Asignar y confirmar avance</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {capWords(colorMap.get(colorId) ?? '')} — {totalPrendas} prendas ({filasDelColor.map(f => f.talla).join(', ')})
                    </p>
                  </div>
                </div>
                <button onClick={() => setModalColor(null)} className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Selector de color para PDF */}
              <div className="px-5 pt-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Color en PDF</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.entries(COLOR_PALETTE).map(([nombre, hex]) => (
                    <button
                      key={hex}
                      title={capWords(nombre)}
                      onClick={() => setModalHex(hex)}
                      className="w-6 h-6 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: hex,
                        border: modalHex === hex ? '2px solid #1a1a1a' : '2px solid transparent',
                        outline: modalHex === hex ? '1px solid #fff' : 'none',
                        outlineOffset: '-3px',
                      }}
                    />
                  ))}
                  {/* Picker libre */}
                  <label title="Elegir color personalizado" className="w-6 h-6 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-500 overflow-hidden">
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
                  <div className="w-5 h-5" style={{ backgroundColor: modalHex, border: '1px solid #DDD8CF' }} />
                  <span className="text-[10px] text-gray-500 font-mono">{modalHex}</span>
                </div>
              </div>
              <div className="px-5 py-3 space-y-2 max-h-[55vh] overflow-y-auto">
                <p className="text-[10px] text-gray-400 -mt-1 mb-1">
                  Elige el operario y marca si ya terminó. Se aplica a todas las tallas, salvo que personalices alguna.
                </p>
                {tarifasModal.map(t => {
                  const tallasOrden = ['S','M','L','XL'] as const;
                  const tallasPresentes = tallasOrden.filter(ta => filasDelColor.some(f => f.talla === ta));
                  // Operario "global" de esta operación = el de la primera talla presente
                  const primeraT = tallasPresentes[0] ?? '';
                  const globalId = modalOps[t.id]?.[primeraT]?.[0] ?? '';
                  const globalConfirmado = modalConfirmado[t.id]?.[primeraT] ?? false;
                  // ¿Hay tallas con operario o confirmación distinta al global?
                  const hayExcepcion = tallasPresentes.some(ta => {
                    const opTalla = modalOps[t.id]?.[ta]?.[0] ?? '';
                    const confTalla = modalConfirmado[t.id]?.[ta] ?? false;
                    return (opTalla && opTalla !== globalId) || confTalla !== globalConfirmado;
                  });
                  const expandida = tarifasExpandidas.has(t.id) || hayExcepcion;
                  const esFoco = tallaFoco && tallasPresentes.includes(tallaFoco as typeof tallasOrden[number]);

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

                  const aplicarConfirmadoATallas = (valor: boolean) => {
                    setModalConfirmado(prev => {
                      const tallaMap: Record<string, boolean> = {};
                      tallasPresentes.forEach(ta => { tallaMap[ta] = valor; });
                      return { ...prev, [t.id]: tallaMap };
                    });
                  };

                  const toggleExpandida = () => setTarifasExpandidas(prev => {
                    const next = new Set(prev);
                    if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                    return next;
                  });

                  return (
                    <div
                      key={t.id}
                      className="rounded-sm"
                      style={{
                        border: esFoco ? '1px solid #7B5EA755' : '1px solid #EFECE5',
                        background: expandida ? '#FAF8F4' : '#fff',
                        boxShadow: esFoco ? 'inset 2px 0 0 #7B5EA7' : 'none',
                      }}
                    >
                      {/* Fila principal: operación + confirmado global + selector global */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => aplicarConfirmadoATallas(!globalConfirmado)}
                          title="Marcar como completada en todas las tallas"
                          className="h-5 w-5 flex-shrink-0 flex items-center justify-center transition-colors"
                          style={globalConfirmado ? { background: '#2F7A4D', border: '1px solid #2F7A4D' } : { background: '#fff', border: '1.5px solid #C7C0B4' }}
                        >
                          {globalConfirmado && <CheckCircle className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />}
                        </button>
                        <span className="text-[10px] font-mono text-gray-400 w-4 text-right flex-shrink-0">{t.orden}.</span>
                        <span className="text-[12px] font-bold flex-1 min-w-0 truncate" style={{ color: globalConfirmado ? '#2F7A4D' : '#1a1a1a' }}>{t.operacion}</span>
                        <select
                          value={hayExcepcion ? '' : globalId}
                          onChange={e => aplicarGlobalATallas(e.target.value)}
                          className="text-[11px] bg-white px-2 py-1.5 flex-shrink-0"
                          style={{ border: '1px solid #DDD8CF', width: '8.5rem' }}
                        >
                          <option value="">{hayExcepcion ? '— mixto —' : '— sin asignar —'}</option>
                          {operarios.filter(o => o.estado === 'ACTIVO').map(o => (
                            <option key={o.id} value={o.id}>{capWords(o.nombre ?? o.codigo)}</option>
                          ))}
                        </select>
                        {tallasPresentes.length > 1 && (
                          <button
                            type="button"
                            onClick={toggleExpandida}
                            title="Personalizar por talla"
                            className="flex-shrink-0 h-6 w-6 flex items-center justify-center transition-colors"
                            style={hayExcepcion
                              ? { color: '#4B7FA3', background: '#4B7FA318' }
                              : { color: '#B0A896' }}
                          >
                            <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: expandida ? 'rotate(180deg)' : 'none' }} />
                          </button>
                        )}
                      </div>
                      {/* Filas por talla — solo visibles al expandir o si ya hay una excepción */}
                      {expandida && (
                        <div className="px-3 pb-2.5 pt-0.5 space-y-1" style={{ borderTop: '1px dashed #E5E0D6' }}>
                          {tallasPresentes.map(ta => {
                            const fila = filasDelColor.find(f => f.talla === ta)!;
                            const idsTalla = modalOps[t.id]?.[ta] ?? [];
                            const qtyTalla = modalOpsQty[t.id]?.[ta] ?? [];
                            const opId = idsTalla[0] ?? '';
                            const esMixto = idsTalla.length > 1;
                            const confTalla = modalConfirmado[t.id]?.[ta] ?? false;
                            const esDiferente = opId && opId !== globalId;
                            const tallaEsFoco = tallaFoco === ta;
                            const sumaAsignada = idsTalla.reduce((s, id, i) => s + (id ? (qtyTalla[i] ?? 0) : 0), 0);
                            const cuadra = sumaAsignada === fila.cantidad;

                            const setSimple = (newOpId: string) => {
                              setModalOps(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: [newOpId] } }));
                              setModalOpsQty(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: [fila.cantidad] } }));
                            };
                            const activarMixto = () => {
                              const base = Math.floor(fila.cantidad / 2);
                              setModalOps(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: [opId, ''] } }));
                              setModalOpsQty(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: [fila.cantidad - base, base] } }));
                            };
                            const agregarOperario = () => {
                              const ids = [...idsTalla, ''];
                              const qty = [...qtyTalla, 0];
                              setModalOps(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: ids } }));
                              setModalOpsQty(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: qty } }));
                            };
                            const quitarOperario = (idx: number) => {
                              const ids = idsTalla.filter((_, i) => i !== idx);
                              const qty = qtyTalla.filter((_, i) => i !== idx);
                              setModalOps(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: ids } }));
                              setModalOpsQty(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: qty } }));
                            };
                            const cambiarOperarioIdx = (idx: number, newOpId: string) => {
                              const ids = idsTalla.map((id, i) => i === idx ? newOpId : id);
                              setModalOps(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: ids } }));
                            };
                            const cambiarCantidadIdx = (idx: number, val: number) => {
                              const qty = qtyTalla.map((q, i) => i === idx ? val : q);
                              setModalOpsQty(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: qty } }));
                            };

                            return (
                              <div
                                key={ta}
                                className="pt-1.5 -mx-1 px-1"
                                style={tallaEsFoco ? { background: '#7B5EA70D' } : undefined}
                              >
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setModalConfirmado(prev => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), [ta]: !confTalla } }))}
                                    title={`Marcar talla ${ta} como completada`}
                                    className="h-4.5 w-4.5 flex-shrink-0 flex items-center justify-center transition-colors"
                                    style={confTalla ? { background: '#2F7A4D', border: '1px solid #2F7A4D' } : { background: '#fff', border: '1.5px solid #C7C0B4' }}
                                  >
                                    {confTalla && <CheckCircle className="h-3 w-3 text-white" strokeWidth={2.5} />}
                                  </button>
                                  <span className="text-[10px] font-black w-5" style={{ color: esDiferente || esMixto ? '#4B7FA3' : '#9A8F87' }}>{ta}</span>
                                  <span className="text-[10px] text-gray-400 font-mono w-8 text-right">{fila.cantidad}p</span>
                                  {!esMixto ? (
                                    <select
                                      value={opId}
                                      onChange={e => setSimple(e.target.value)}
                                      className="text-[11px] px-2 py-1 flex-1 min-w-0"
                                      style={esDiferente ? { border: '1px solid #4B7FA355', background: '#4B7FA30D' } : { border: '1px solid #DDD8CF', background: '#fff' }}
                                    >
                                      <option value="">— sin asignar —</option>
                                      {operarios.filter(o => o.estado === 'ACTIVO').map(o => (
                                        <option key={o.id} value={o.id}>{capWords(o.nombre ?? o.codigo)}</option>
                                      ))}
                                    </select>
                                  ) : <span className="flex-1" />}
                                  <button
                                    type="button"
                                    onClick={esMixto ? agregarOperario : activarMixto}
                                    title="Repartir entre varios operarios (mixto)"
                                    className="flex-shrink-0 h-6 w-6 flex items-center justify-center transition-colors"
                                    style={{ color: '#7B5EA7', background: '#7B5EA712' }}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                {esMixto && (
                                  <div className="mt-1 ml-6 space-y-1">
                                    {idsTalla.map((id, idx) => (
                                      <div key={idx} className="flex items-center gap-1.5">
                                        <select
                                          value={id}
                                          onChange={e => cambiarOperarioIdx(idx, e.target.value)}
                                          className="text-[11px] px-2 py-1 flex-1 min-w-0"
                                          style={{ border: '1px solid #4B7FA355', background: '#4B7FA30D' }}
                                        >
                                          <option value="">— sin asignar —</option>
                                          {operarios.filter(o => o.estado === 'ACTIVO').map(o => (
                                            <option key={o.id} value={o.id}>{capWords(o.nombre ?? o.codigo)}</option>
                                          ))}
                                        </select>
                                        <input
                                          type="number"
                                          min={0}
                                          value={qtyTalla[idx] ?? 0}
                                          onChange={e => cambiarCantidadIdx(idx, Number(e.target.value))}
                                          className="text-[11px] px-1.5 py-1 w-14 text-right font-mono"
                                          style={{ border: '1px solid #DDD8CF' }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => quitarOperario(idx)}
                                          title="Quitar operario"
                                          className="flex-shrink-0 h-6 w-6 flex items-center justify-center"
                                          style={{ color: '#C0362C' }}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                    <p className="text-[9px] font-mono" style={{ color: cuadra ? '#2F7A4D' : '#C0362C' }}>
                                      {sumaAsignada} / {fila.cantidad} prendas asignadas
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Preview de avance general del color */}
              <div className="px-5 pb-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 overflow-hidden" style={{ background: '#EAE6DD' }}>
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pctPreviewColor}%`, background: pctPreviewColor === 100 ? '#2F7A4D' : pctPreviewColor > 0 ? '#4B7FA3' : '#B6762A' }}
                  />
                </div>
                <span className="text-[11px] font-black font-mono tabular-nums w-10 text-right">{pctPreviewColor}%</span>
              </div>
              <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #EFECE5' }}>
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
