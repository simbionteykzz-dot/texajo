import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, CheckCircle, Clock, XCircle, FileText, Trash2, ChevronDown, ChevronRight, Save, Play, StopCircle, Scissors, Pencil, Ban, RotateCcw } from 'lucide-react';
import { Corte, CorteColorDetalle, SeguimientoAsignacion, SeguimientoFila, MovimientoTela } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { ConfirmModal } from '../components/ConfirmModal';
import { exportRowsToXlsx, exportReportesCorte } from '../lib/export';
import { newId } from '../lib/storage';
import { mockColores } from '../data';
import { useStockActualTelas, useColoresAgrupados } from '../hooks/useCorteOperaciones';

const TONALIDADES = ['1', '2', '3', '4'] as const;
import { useEsAdmin } from '../lib/useEsAdmin';
import { capWords } from '../lib/utils';

const _canonicosMap = new Map(mockColores.map(c => [c.nombre.toLowerCase(), c.nombre]));
function resolveNombreColorCortes(nombre: string): string {
  const n = nombre.toLowerCase();
  if (_canonicosMap.has(n)) return _canonicosMap.get(n)!;
  const mNew = nombre.match(/^_dup_(.+?)_[\w-]+$/);
  if (mNew && _canonicosMap.has(mNew[1].toLowerCase())) return _canonicosMap.get(mNew[1].toLowerCase())!;
  return nombre;
}

// Suma rollos sin contar duplicados del mismo colorBase+tonalidad (la celda está agrupada por rowSpan)
const totalRollosSinDuplicar = (colores: { colorBase: string; tonalidad: string; rollosUsados: string }[]) =>
  colores.reduce((sum, det, i) => {
    const key = `${det.colorBase}|${det.tonalidad}`;
    if (det.colorBase && i > 0 && `${colores[i - 1].colorBase}|${colores[i - 1].tonalidad}` === key) return sum;
    return sum + (parseFloat(det.rollosUsados) || 0);
  }, 0);

interface ColorDetalle {
  uid: string;       // key estable para React — no cambia al reordenar/duplicar
  colorId: string;
  colorBase: string; // nombre base para el primer dropdown (ej: "Negro")
  tonalidad: string; // número de tonalidad seleccionado (ej: "2")
  kgUsados: string;
  rollosUsados: string;
  tendidas: string;
  propS: string; propM: string; propL: string; propXL: string;
  cantS: string; cantM: string; cantL: string; cantXL: string;
  todosColores?: boolean;
}

interface CorteForm {
  nCorte: string; fecha: string; clienteId: string; productoId: string;
  telaId: string;
  cortador: string; ayudante: string; tendedor: string;
  mtsPorTendida: string; ancho: string;
  propS: string; propM: string; propL: string; propXL: string;
  colores: ColorDetalle[];
  traslado: boolean; notas: string;
}

const emptyColorDetalle = (): ColorDetalle => ({
  uid: crypto.randomUUID(),
  colorId: '', colorBase: '', tonalidad: '',
  kgUsados: '', rollosUsados: '',
  tendidas: '', propS: '', propM: '', propL: '', propXL: '',
  cantS: '0', cantM: '0', cantL: '0', cantXL: '0',
});

const emptyForm = (): CorteForm => ({
  nCorte: '', fecha: new Date().toISOString().slice(0, 10),
  clienteId: '', productoId: '', telaId: '',
  cortador: '', ayudante: '', tendedor: '',
  mtsPorTendida: '', ancho: '',
  propS: '', propM: '', propL: '', propXL: '',
  colores: [emptyColorDetalle()],
  traslado: false, notas: '',
});

const ESTADO_COLOR: Record<string, string> = {
  EN_PROCESO: '#4B7FA3',
  COMPLETADO: '#2F7A4D',
  ANULADO: '#C0362C',
};

const ESTADO_ICON: Record<string, React.ReactNode> = {
  EN_PROCESO: <Clock className="h-3 w-3" style={{ color: ESTADO_COLOR.EN_PROCESO }} />,
  COMPLETADO: <CheckCircle className="h-3 w-3" style={{ color: ESTADO_COLOR.COMPLETADO }} />,
  ANULADO: <XCircle className="h-3 w-3" style={{ color: ESTADO_COLOR.ANULADO }} />,
};

export function Cortes() {
  const {
    cortes, clientes, productos, colores, telas, tarifasOperaciones, operarios,
    movimientosTela, seguimientoFilas, boletaLineas,
    addCorte, updateCorte, deleteCorte,
    addMovimientoTela, addSeguimientoFila, updateSeguimientoFila, deleteBoletaLinea,
    updateProducto, addColorConProductoColor,
  } = useAppContext();

  const { addToast } = useToast();
  const esAdmin = useEsAdmin();
  const [showForm, setShowForm] = useState(false);
  const [editingCorteId, setEditingCorteId] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterProducto, setFilterProducto] = useState('');
  const [form, setForm] = useState<CorteForm>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmAnular, setConfirmAnular] = useState<string | null>(null);
  const [confirmReactivar, setConfirmReactivar] = useState<string | null>(null);
  const [completandoId, setCompletandoId] = useState<string | null>(null);
  const [detalleCorteId, setDetalleCorteId] = useState<string | null>(null);
  const [tiempoModal, setTiempoModal] = useState<{ open: boolean; tipo: 'inicio' | 'fin' }>({ open: false, tipo: 'inicio' });
  const [tiempoCorteId, setTiempoCorteId] = useState(''); // corte seleccionado en el modal
  const [mostrarTodosProductos, setMostrarTodosProductos] = useState(true);
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set());
  const toggleOps = (key: string) =>
    setExpandedOps(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const corteToForm = (c: Corte): CorteForm => {
    const detalles = c.coloresDetalle && c.coloresDetalle.length > 0
      ? c.coloresDetalle
      : [{ colorId: c.colorId, tonalidad: c.tonalidad, kgUsados: c.kgUsados, rollosUsados: c.rollosUsados, tendidas: c.tendidas, propS: 0, propM: 0, propL: 0, propXL: 0, cantS: c.cantS, cantM: c.cantM, cantL: c.cantL, cantXL: c.cantXL, totalPrendas: c.totalPrendas }];
    const firstDet = detalles[0];
    return {
      nCorte: c.nCorte,
      fecha: c.fecha,
      clienteId: c.clienteId,
      productoId: c.productoId,
      telaId: c.telaId ?? '',
      cortador: c.cortador,
      ayudante: c.ayudante,
      tendedor: c.tendedor ?? '',
      mtsPorTendida: c.mtsPorTendida > 0 ? String(c.mtsPorTendida) : '',
      ancho: c.ancho && c.ancho > 0 ? String(c.ancho) : '',
      propS: String(firstDet.propS ?? 0),
      propM: String(firstDet.propM ?? 0),
      propL: String(firstDet.propL ?? 0),
      propXL: String(firstDet.propXL ?? 0),
      colores: detalles.map(det => ({
        uid: crypto.randomUUID(),
        colorId: det.colorId,
        colorBase: resolveNombreColorCortes(colores.find(cl => cl.id === det.colorId)?.nombre ?? ''),
        tonalidad: det.tonalidad ?? '',
        kgUsados: det.kgUsados > 0 ? String(det.kgUsados) : '',
        rollosUsados: det.rollosUsados > 0 ? String(det.rollosUsados) : '',
        tendidas: det.tendidas > 0 ? String(det.tendidas) : '',
        propS: String(det.propS ?? 0),
        propM: String(det.propM ?? 0),
        propL: String(det.propL ?? 0),
        propXL: String(det.propXL ?? 0),
        cantS: String(det.cantS),
        cantM: String(det.cantM),
        cantL: String(det.cantL),
        cantXL: String(det.cantXL),
      })),
      traslado: c.traslado ?? false,
      notas: c.notas ?? '',
    };
  };

  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);
  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const productosConCortes = useMemo(() => {
    const idsUsados = new Set(cortes.map(c => c.productoId));
    return productos
      .filter(p => idsUsados.has(p.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos, cortes]);
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of colores) map.set(c.id, resolveNombreColorCortes(c.nombre));
    return map;
  }, [colores]);
  const telaMap = useMemo(() => new Map(telas.map(t => [t.id, t])), [telas]);

  const coloresAgrupados = useColoresAgrupados(colores);

  // Solo los 15 colores canónicos, ordenados por prioridad
  const nombresBase = useMemo(() => {
    const canonicos = new Set(mockColores.map(c => c.nombre.toLowerCase()));
    return mockColores
      .filter(c => coloresAgrupados.has(c.nombre) || canonicos.has(c.nombre.toLowerCase()))
      .sort((a, b) => (a.prioridad ?? 999) - (b.prioridad ?? 999))
      .map(c => c.nombre);
  }, [coloresAgrupados]);

  const stockActualTelas = useStockActualTelas(movimientosTela);

  useEffect(() => {
    if (!form.productoId) return;
    const prod = productoMap.get(form.productoId);
    if (!prod) return;
    setForm(f => {
      const partial: Partial<CorteForm> = {};
      if (prod.telaId) partial.telaId = prod.telaId;
      const pS = prod.propS ?? 0, pM = prod.propM ?? 0, pL = prod.propL ?? 0, pXL = prod.propXL ?? 0;
      const hasProps = pS > 0 || pM > 0 || pL > 0 || pXL > 0;
      if (hasProps && !f.propS && !f.propM && !f.propL && !f.propXL) {
        partial.propS = String(pS);
        partial.propM = String(pM);
        partial.propL = String(pL);
        partial.propXL = String(pXL);
      }
      return { ...f, ...partial };
    });
  }, [form.productoId, productoMap]);


  const cortesFiltrados = useMemo(() =>
    [...cortes]
      .filter(c => (!filterEstado || c.estado === filterEstado) && (!filterCliente || c.clienteId === filterCliente) && (!filterProducto || c.productoId === filterProducto))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [cortes, filterEstado, filterCliente, filterProducto]);

  // Detecta si los props globales difieren de los guardados en el producto
  const propsModificadas = useMemo(() => {
    if (!form.productoId) return false;
    const prod = productoMap.get(form.productoId);
    if (!prod) return false;
    return (parseInt(form.propS) || 0) !== (prod.propS ?? 0)
      || (parseInt(form.propM) || 0) !== (prod.propM ?? 0)
      || (parseInt(form.propL) || 0) !== (prod.propL ?? 0)
      || (parseInt(form.propXL) || 0) !== (prod.propXL ?? 0);
  }, [form.propS, form.propM, form.propL, form.propXL, form.productoId, productoMap]);

  const guardarPropsEnProducto = () => {
    if (!form.productoId) return;
    const pS = parseInt(form.propS) || 0;
    const pM = parseInt(form.propM) || 0;
    const pL = parseInt(form.propL) || 0;
    const pXL = parseInt(form.propXL) || 0;
    updateProducto(form.productoId, { propS: pS, propM: pM, propL: pL, propXL: pXL });
    addToast('Proporciones guardadas en el producto', 'success');
  };

  const set = (field: keyof CorteForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const calcCostoMo = (productoId: string, total: number) => {
    const tarifas = tarifasOperaciones.filter(t => t.productoId === productoId);
    const sumTarifas = tarifas.reduce((s, t) => s + t.tarifa, 0);
    return sumTarifas * total;
  };

  // Crea filas de seguimiento automáticamente para un corte completado
  const crearFilasSeguimiento = (corte: Corte) => {
    const tarifas = tarifasOperaciones.filter(t => t.productoId === corte.productoId).sort((a, b) => a.orden - b.orden);
    const rawDetalles = corte.coloresDetalle && corte.coloresDetalle.length > 0
      ? corte.coloresDetalle
      : [{ colorId: corte.colorId, cantS: corte.cantS, cantM: corte.cantM, cantL: corte.cantL, cantXL: corte.cantXL } as CorteColorDetalle];

    // Agrupar por colorId sumando cantidades (puede haber varios rollos del mismo color)
    const porColor = new Map<string, { cantS: number; cantM: number; cantL: number; cantXL: number }>();
    for (const det of rawDetalles) {
      if (!det.colorId) continue;
      const prev = porColor.get(det.colorId) ?? { cantS: 0, cantM: 0, cantL: 0, cantXL: 0 };
      porColor.set(det.colorId, {
        cantS:  prev.cantS  + (det.cantS  ?? 0),
        cantM:  prev.cantM  + (det.cantM  ?? 0),
        cantL:  prev.cantL  + (det.cantL  ?? 0),
        cantXL: prev.cantXL + (det.cantXL ?? 0),
      });
    }

    for (const [colorId, det] of porColor) {
      const tallasMap: Array<{ talla: 'S' | 'M' | 'L' | 'XL'; cantidad: number }> = [
        { talla: 'S', cantidad: det.cantS },
        { talla: 'M', cantidad: det.cantM },
        { talla: 'L', cantidad: det.cantL },
        { talla: 'XL', cantidad: det.cantXL },
      ];
      for (const { talla, cantidad } of tallasMap) {
        if (cantidad <= 0) continue;
        const yaExiste = seguimientoFilas.some(f => f.corteId === corte.id && f.talla === talla && f.colorId === colorId);
        if (yaExiste) continue;
        const asignaciones: SeguimientoAsignacion[] = tarifas.map(t => ({
          tarifaId: t.id, operacion: t.operacion, orden: t.orden, operarioId: '', pago: 0,
        }));
        const fila: SeguimientoFila = {
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
        };
        addSeguimientoFila(fila);
      }
    }
  };

  // Anula un corte: marca sus filas de seguimiento pendientes como ANULADO y elimina
  // las boletas aún no pagadas (las ya PAGADAS se conservan, ese dinero ya se entregó)
  const anularCorte = (corte: Corte) => {
    updateCorte(corte.id, { estado: 'ANULADO' });
    for (const f of seguimientoFilas) {
      if (f.corteId !== corte.id) continue;
      if (f.estado === 'LISTO' || f.estado === 'PAGADO' || f.estado === 'ANULADO') continue;
      updateSeguimientoFila(f.id, { estado: 'ANULADO' });
    }
    for (const b of boletaLineas) {
      if (b.corteId !== corte.id) continue;
      if (b.estadoPago === 'PAGADO') continue;
      deleteBoletaLinea(b.id);
    }
  };

  // Reactiva un corte anulado: vuelve el corte y sus filas ANULADO a estado activo.
  // No recupera boletas de pago que se hayan eliminado al anular.
  const reactivarCorte = (corte: Corte) => {
    updateCorte(corte.id, { estado: 'EN_PROCESO' });
    for (const f of seguimientoFilas) {
      if (f.corteId !== corte.id || f.estado !== 'ANULADO') continue;
      updateSeguimientoFila(f.id, { estado: 'PENDIENTE' });
    }
  };

  // Normaliza un ID que puede ser nombre plano → ID canónico buscando en el catálogo
  const normalizeColorId = (raw: string): string => {
    if (colores.find(c => c.id === raw)) return raw;
    return colores.find(c => c.nombre.toLowerCase() === raw.toLowerCase())?.id ?? raw;
  };
  const normalizeTelaId = (raw: string): string => {
    if (telas.find(t => t.id === raw)) return raw;
    return telas.find(t => t.nombre.toLowerCase() === raw.toLowerCase())?.id ?? raw;
  };

  // Descuenta inventario automáticamente al completar un corte (uno o varios colores)
  const descontarInventario = (corte: Corte): boolean => {
    if (!corte.telaId) return true;
    // Guard: si ya existe un movimiento A_CORTE para este corteId, no duplicar
    const yaDescontado = movimientosTela.some(m => m.corteId === corte.id && m.tipo === 'A_CORTE');
    if (yaDescontado) {
      addToast(`El corte ${corte.nCorte} ya fue descontado del inventario`, 'error');
      return false;
    }
    const telaId = normalizeTelaId(corte.telaId);
    const detalles = corte.coloresDetalle && corte.coloresDetalle.length > 0
      ? corte.coloresDetalle
      : [{ colorId: corte.colorId, rollosUsados: corte.rollosUsados, kgUsados: corte.kgUsados } as CorteColorDetalle];

    // Verificar stock para todos los colores antes de descontar
    for (const det of detalles) {
      if (!det.colorId || det.rollosUsados <= 0) continue;
      const colorId = normalizeColorId(det.colorId);
      const key = `${telaId}|${colorId}`;
      const stockAntes = stockActualTelas.get(key) ?? 0;
      if (stockAntes - det.rollosUsados < 0) {
        const nombreColor = colorMap.get(colorId) ?? colorId;
        addToast(`Stock insuficiente para ${nombreColor}: se necesitan ${det.rollosUsados} rollos pero hay ${stockAntes}`, 'error');
        return false;
      }
    }

    // Crear movimiento A_CORTE por cada color
    for (const det of detalles) {
      if (!det.colorId || det.rollosUsados <= 0) continue;
      const colorId = normalizeColorId(det.colorId);
      const key = `${telaId}|${colorId}`;
      const stockAntes = stockActualTelas.get(key) ?? 0;
      const stockDespues = stockAntes - det.rollosUsados;
      const color = colores.find(c => c.id === colorId);
      const mov: MovimientoTela = {
        id: newId(),
        fecha: corte.fecha,
        tipo: 'A_CORTE',
        clienteId: corte.clienteId,
        telaId,
        colorId,
        rollos: det.rollosUsados,
        kgTotal: det.kgUsados || 0,
        categoriaColor: color?.categoria ?? 'OSCURO',
        precioKg: 0,
        totalSoles: 0,
        stockRollosAntes: stockAntes,
        stockRollosDespues: stockDespues,
        responsable: corte.cortador,
        corteId: corte.id,
        nCorte: corte.nCorte,
        notas: `Auto-descuento por corte ${corte.nCorte}${det.tonalidad ? ` Tn-${det.tonalidad}` : ''}`,
      };
      addMovimientoTela(mov);
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const coloresValidos = form.colores.filter(c => c.colorId !== '');
    if (!form.nCorte || !form.clienteId || !form.productoId || coloresValidos.length === 0) {
      addToast('Completa nCorte, cliente, producto y al menos un color', 'error');
      return;
    }

    if (!/^\d+[-]?[A-Za-z]?$/.test(form.nCorte.trim()) || parseInt(form.nCorte) <= 0) {
      addToast('N° Corte debe ser un número, con letra opcional al final (ej: 100, 100A ó 100-A)', 'error');
      return;
    }

    // Props globales del corte
    const gPropS = parseInt(form.propS) || 0;
    const gPropM = parseInt(form.propM) || 0;
    const gPropL = parseInt(form.propL) || 0;
    const gPropXL = parseInt(form.propXL) || 0;

    // Construir detalle por color
    const coloresDetalle: CorteColorDetalle[] = coloresValidos.map(det => {
      const cantS = parseInt(det.cantS) || 0;
      const cantM = parseInt(det.cantM) || 0;
      const cantL = parseInt(det.cantL) || 0;
      const cantXL = parseInt(det.cantXL) || 0;
      return {
        colorId: det.colorId,
        tonalidad: det.tonalidad || undefined,
        kgUsados: parseFloat(det.kgUsados) || 0,
        rollosUsados: parseFloat(det.rollosUsados) || 0,
        tendidas: parseInt(det.tendidas) || 0,
        propS: gPropS,
        propM: gPropM,
        propL: gPropL,
        propXL: gPropXL,
        cantS, cantM, cantL, cantXL,
        totalPrendas: cantS + cantM + cantL + cantXL,
      };
    });

    // Totales agregados
    const totalKg = coloresDetalle.reduce((s, d) => s + d.kgUsados, 0);
    // Solo contar rollos de la primera fila de cada grupo colorBase para no duplicar
    const coloresValidosForm = form.colores.filter(c => c.colorId !== '');
    const totalRollos = totalRollosSinDuplicar(coloresValidosForm);
    const totalS = coloresDetalle.reduce((s, d) => s + d.cantS, 0);
    const totalM = coloresDetalle.reduce((s, d) => s + d.cantM, 0);
    const totalL = coloresDetalle.reduce((s, d) => s + d.cantL, 0);
    const totalXL = coloresDetalle.reduce((s, d) => s + d.cantXL, 0);
    const totalPrendas = totalS + totalM + totalL + totalXL;
    const primerColor = coloresDetalle[0];

    const camposComunes = {
      nCorte: form.nCorte,
      fecha: form.fecha,
      clienteId: form.clienteId,
      productoId: form.productoId,
      colorId: primerColor.colorId,
      tonalidad: primerColor.tonalidad,
      coloresDetalle,
      telaId: form.telaId || undefined,
      cortador: form.cortador,
      ayudante: form.ayudante,
      tendedor: form.tendedor,
      kgUsados: totalKg,
      rollosUsados: totalRollos,
      tendidas: coloresDetalle.reduce((s, d) => s + d.tendidas, 0),
      mtsPorTendida: parseFloat(form.mtsPorTendida) || 0,
      ancho: parseFloat(form.ancho) || 0,
      cantS: totalS, cantM: totalM, cantL: totalL, cantXL: totalXL,
      totalPrendas,
      consumo: totalPrendas > 0 ? totalKg / totalPrendas : 0,
      rendimiento: totalRollos > 0 ? totalPrendas / totalRollos : 0,
      traslado: form.traslado,
      costoMoCorte: calcCostoMo(form.productoId, totalPrendas),
      notas: form.notas,
    };

    if (editingCorteId) {
      updateCorte(editingCorteId, camposComunes);
      addToast(`Corte ${form.nCorte} actualizado`, 'success');
    } else {
      const corte: Corte = {
        id: newId(),
        ...camposComunes,
        revision: 'PENDIENTE',
        estado: 'EN_PROCESO',
        pagoCliente: 'PENDIENTE',
        pagoPlanilla: 'PENDIENTE',
      };
      addCorte(corte);
      crearFilasSeguimiento(corte);
      const msg = coloresDetalle.length > 1
        ? `Corte ${form.nCorte} registrado con ${coloresDetalle.length} colores`
        : `Corte ${form.nCorte} registrado`;
      addToast(msg, 'success');
    }

    setShowForm(false);
    setEditingCorteId(null);
    setForm(emptyForm());
  };

  const buildRows = () => cortesFiltrados.flatMap((c) => {
    const detalles = c.coloresDetalle && c.coloresDetalle.length > 0
      ? c.coloresDetalle
      : [{ colorId: c.colorId, tonalidad: c.tonalidad, cantS: c.cantS, cantM: c.cantM, cantL: c.cantL, cantXL: c.cantXL } as CorteColorDetalle];
    return detalles.map((det, i) => ({
      NCorte: i === 0 ? c.nCorte : '',
      Fecha: i === 0 ? c.fecha : '',
      Cliente: i === 0 ? (clienteMap.get(c.clienteId) ?? c.clienteId) : '',
      Producto: i === 0 ? (productoMap.get(c.productoId)?.nombre ?? c.productoId) : '',
      Color: (colorMap.get(det.colorId) ?? det.colorId) + (det.tonalidad ? ` Tn-${det.tonalidad}` : ''),
      S: det.cantS ?? 0,
      M: det.cantM ?? 0,
      L: det.cantL ?? 0,
      XL: det.cantXL ?? 0,
      Prendas: (det.cantS ?? 0) + (det.cantM ?? 0) + (det.cantL ?? 0) + (det.cantXL ?? 0),
      KgUsados: i === 0 ? c.kgUsados : '',
      CostoMO: i === 0 ? (c.costoMoCorte?.toFixed(2) ?? '0.00') : '',
      Estado: i === 0 ? c.estado : '',
      PagoCliente: i === 0 ? c.pagoCliente : '',
      PagoPlanilla: i === 0 ? c.pagoPlanilla : '',
    }));
  });



  const exportarCortes = () => {
    exportRowsToXlsx(buildRows(), `cortes_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Cortes');
    addToast('Excel exportado', 'success');
  };

  const fmtHora = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  };

  const confirmarTiempo = () => {
    if (!tiempoCorteId) return;
    const now = new Date().toISOString();
    const nCorte = cortes.find(c => c.id === tiempoCorteId)?.nCorte ?? '';
    if (tiempoModal.tipo === 'inicio') {
      updateCorte(tiempoCorteId, { horaInicio: now });
      addToast(`Inicio registrado para Corte ${nCorte}`, 'success');
    } else {
      updateCorte(tiempoCorteId, { horaFin: now });
      addToast(`Finalización registrada para Corte ${nCorte}`, 'success');
    }
    setTiempoModal({ open: false, tipo: 'inicio' });
    setTiempoCorteId('');
  };

  const exportarCortesPdf = () => {
    const dataList = cortesFiltrados.map(c => {
      const tela = telaMap.get(c.telaId ?? '')?.nombre ?? c.telaId ?? '';
      const producto = productoMap.get(c.productoId)?.nombre ?? c.productoId;
      const detalles = c.coloresDetalle && c.coloresDetalle.length > 0
        ? c.coloresDetalle
        : [{ colorId: c.colorId, kgUsados: c.kgUsados, rollosUsados: c.rollosUsados, tendidas: c.tendidas, cantS: c.cantS, cantM: c.cantM, cantL: c.cantL, cantXL: c.cantXL }];
      const prod = productoMap.get(c.productoId);
      return {
        nCorte: c.nCorte,
        fecha: c.fecha,
        horaInicio: c.horaInicio,
        horaFin: c.horaFin,
        tela,
        producto,
        cortador: c.cortador,
        ayudante: c.ayudante,
        tendedor: c.tendedor,
        ancho: c.ancho,
        mtsPorTendida: c.mtsPorTendida,
        propS: prod?.propS,
        propM: prod?.propM,
        propL: prod?.propL,
        propXL: prod?.propXL,
        colores: detalles.map((d, i) => ({
          nombre: colorMap.get(d.colorId) ?? d.colorId,
          kgUsados: d.kgUsados,
          // Mostrar rollos solo en la primera fila de cada colorId (las tonalidades comparten el mismo rollo)
          rollosUsados: i === 0 || d.colorId !== detalles[i - 1].colorId ? d.rollosUsados : 0,
          tendidas: d.tendidas,
          cantS: d.cantS,
          cantM: d.cantM,
          cantL: d.cantL,
          cantXL: d.cantXL,
        })),
      };
    });
    exportReportesCorte(dataList);
    addToast(`PDF exportado (${dataList.length} cortes)`, 'success');
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
            style={{ background: '#C4612A15', border: '1px solid #C4612A40' }}
          >
            <Scissors className="h-5 w-5" style={{ color: '#C4612A' }} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#9A8F87' }}>Producción</p>
            <h2 className="font-serif text-2xl font-bold leading-tight" style={{ color: '#1a1a1a' }}>Cortes</h2>
            <p className="text-xs text-gray-500 mt-0.5">Registro y seguimiento de órdenes de corte</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModuleInfoBox
            accent="#C4612A"
            titulo="Cortes"
            descripcion="Registra cada orden de corte con sus datos físicos (kg, rollos, tendidas) y calcula automáticamente el consumo por prenda y el rendimiento. Al guardar descuenta el inventario de telas y genera las filas de seguimiento en confección."
            items={[
              { label: 'Cálculo automático', detail: 'Consumo = kg / prendas · Rendimiento = prendas / rollos' },
              { label: 'Descuento inventario', detail: 'Crea un movimiento A_CORTE en inventario de telas al guardar' },
              { label: 'Cortador / Ayudante', detail: 'Selección desde catálogo de operarios activos' },
              { label: 'Estados', detail: 'En Proceso → Completado / Anulado con indicador visual' },
            ]}
          />
          {esAdmin && (
            <button
              onClick={() => { setTiempoModal({ open: true, tipo: 'inicio' }); setTiempoCorteId(''); }}
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border transition-colors"
              style={{ color: '#2F7A4D', borderColor: '#2F7A4D55', background: '#2F7A4D0D' }}
            >
              <Play className="h-4 w-4" /> Iniciar Corte
            </button>
          )}
          {esAdmin && (
            <button
              onClick={() => { setTiempoModal({ open: true, tipo: 'fin' }); setTiempoCorteId(''); }}
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border transition-colors"
              style={{ color: '#C0362C', borderColor: '#C0362C55', background: '#C0362C0D' }}
            >
              <StopCircle className="h-4 w-4" /> Finalizar Corte
            </button>
          )}
          <button onClick={exportarCortes} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportarCortesPdf} className="btn-secondary flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo Corte
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="input-base text-xs w-36">
          <option value="">Todos los estados</option>
          <option value="EN_PROCESO">En Proceso</option>
          <option value="COMPLETADO">Completado</option>
          <option value="ANULADO">Anulado</option>
        </select>
        <select value={filterCliente} onChange={e => setFilterCliente(e.target.value)} className="input-base text-xs w-40">
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={filterProducto} onChange={e => setFilterProducto(e.target.value)} className="input-base text-xs w-44">
          <option value="">Todos los productos</option>
          {productosConCortes.map(p => <option key={p.id} value={p.id}>{capWords(p.nombre)}</option>)}
        </select>
        {(filterEstado || filterCliente || filterProducto) && (
          <button
            onClick={() => { setFilterEstado(''); setFilterCliente(''); setFilterProducto(''); }}
            className="text-[11px] font-bold uppercase tracking-widest px-2"
            style={{ color: '#9A8F87' }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {cortesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ border: '1px dashed #DDD8CF' }}>
          <span className="h-10 w-10 flex items-center justify-center" style={{ background: '#C4612A18' }}>
            <Scissors className="h-5 w-5" style={{ color: '#C4612A' }} />
          </span>
          <p className="text-sm font-bold text-gray-500">Sin cortes registrados</p>
          <p className="text-xs text-gray-400">Presiona "Nuevo Corte" para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {cortesFiltrados.map(c => {
            const detalles = c.coloresDetalle && c.coloresDetalle.length > 0
              ? c.coloresDetalle
              : [{ colorId: c.colorId, tonalidad: c.tonalidad, cantS: c.cantS, cantM: c.cantM, cantL: c.cantL, cantXL: c.cantXL, kgUsados: c.kgUsados, rollosUsados: c.rollosUsados }];
            const tieneColores = detalles.length > 1;

            const filasSegsAll = seguimientoFilas.filter(sf => sf.corteId === c.id);
            const pctGlobal = filasSegsAll.length > 0
              ? Math.round(filasSegsAll.reduce((s, sf) => s + (sf.pctAvance ?? 0), 0) / filasSegsAll.length)
              : null;

            const resumenColores = (() => {
              const seen = new Set<string>();
              return detalles
                .map(f => (colorMap.get(f.colorId) ?? f.colorId) + (f.tonalidad ? ` Tn-${f.tonalidad}` : ''))
                .filter(label => { if (seen.has(label)) return false; seen.add(label); return true; })
                .join(' · ');
            })();

            const estadoColor = ESTADO_COLOR[c.estado];

            return (
              <button
                key={c.id}
                onClick={() => setDetalleCorteId(c.id)}
                className="bg-white text-left flex flex-col transition-shadow hover:shadow-lg"
                style={{ border: '1px solid #DDD8CF', borderLeft: `3px solid ${estadoColor}` }}
              >
                <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2">
                  <div>
                    <p className="font-mono font-black text-sm" style={{ color: '#1a1a1a' }}>{c.nCorte}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{c.fecha}</p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase flex-shrink-0"
                    style={{ background: `${estadoColor}18`, color: estadoColor }}
                  >
                    {ESTADO_ICON[c.estado]}
                    {c.estado.replace('_', ' ')}
                  </span>
                </div>

                <div className="px-4 pb-3 flex-1 space-y-1">
                  <p className="text-xs font-bold truncate" style={{ color: '#1a1a1a' }}>{clienteMap.get(c.clienteId) ?? c.clienteId}</p>
                  <p className="text-[11px] text-gray-500 truncate">{capWords(productoMap.get(c.productoId)?.nombre ?? c.productoId)}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {tieneColores ? <span className="font-bold" style={{ color: '#C4612A' }}>{detalles.length} colores</span> : resumenColores}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ borderTop: '1px solid #EFECE5', background: '#FAF8F4' }}>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono font-black text-base" style={{ color: '#1a1a1a' }}>{c.totalPrendas}</span>
                    <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">prendas</span>
                  </div>
                  {pctGlobal !== null ? (
                    <div className="flex items-center gap-1.5 flex-1 max-w-[100px]">
                      <div className="flex-1 h-1.5 overflow-hidden" style={{ background: '#EAE6DD' }}>
                        <div
                          className="h-full transition-all"
                          style={{ width: `${pctGlobal}%`, background: pctGlobal === 100 ? '#2F7A4D' : pctGlobal >= 50 ? '#4B7FA3' : '#B6762A' }}
                        />
                      </div>
                      <span className="text-[9px] font-bold font-mono tabular-nums" style={{ color: pctGlobal === 100 ? '#2F7A4D' : '#6B6058' }}>{pctGlobal}%</span>
                    </div>
                  ) : <span className="text-[9px] text-gray-300 italic">Sin avance</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal de detalle de corte */}
      {detalleCorteId && (() => {
        const c = cortes.find(x => x.id === detalleCorteId);
        if (!c) return null;

        const detalles = c.coloresDetalle && c.coloresDetalle.length > 0
          ? c.coloresDetalle
          : [{ colorId: c.colorId, tonalidad: c.tonalidad, cantS: c.cantS, cantM: c.cantM, cantL: c.cantL, cantXL: c.cantXL, kgUsados: c.kgUsados, rollosUsados: c.rollosUsados }];
        const filas = detalles.map(det => ({
          colorId: det.colorId, tonalidad: det.tonalidad,
          cantS: det.cantS, cantM: det.cantM, cantL: det.cantL, cantXL: det.cantXL,
          totalColor: det.cantS + det.cantM + det.cantL + det.cantXL,
          kgUsados: det.kgUsados ?? 0,
        }));
        const tieneColores = filas.length > 1;

        const filasSegsAll = seguimientoFilas.filter(sf => sf.corteId === c.id);
        const pctGlobal = filasSegsAll.length > 0
          ? Math.round(filasSegsAll.reduce((s, sf) => s + (sf.pctAvance ?? 0), 0) / filasSegsAll.length)
          : null;

        const metrosTotales = c.tendidas > 0 && c.mtsPorTendida > 0 ? c.tendidas * c.mtsPorTendida : null;
        const prendasPorKg = c.kgUsados > 0 && c.totalPrendas > 0 ? c.totalPrendas / c.kgUsados : null;
        const kgPorPrenda = c.totalPrendas > 0 && c.kgUsados > 0 ? c.kgUsados / c.totalPrendas : null;
        const prendasPorMetro = metrosTotales && metrosTotales > 0 ? c.totalPrendas / metrosTotales : null;
        const kgPorMetro = metrosTotales && metrosTotales > 0 ? c.kgUsados / metrosTotales : null;
        const metrosPorRollo = c.rollosUsados > 0 && metrosTotales ? metrosTotales / c.rollosUsados : null;
        const prendasPorRollo = c.rollosUsados > 0 && c.totalPrendas > 0 ? c.totalPrendas / c.rollosUsados : null;
        const m2PorPrenda = metrosTotales && c.ancho > 0 && c.totalPrendas > 0
          ? (metrosTotales * c.ancho) / c.totalPrendas : null;

        const estadoColor = ESTADO_COLOR[c.estado];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetalleCorteId(null)}>
            <div
              className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              style={{ border: '1px solid #DDD8CF' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div
                className="flex items-start justify-between gap-3 px-6 py-4 sticky top-0"
                style={{ background: '#FFFDF9', borderBottom: `3px solid ${estadoColor}` }}
              >
                <div>
                  <p className="font-mono font-black text-lg" style={{ color: '#1a1a1a' }}>Corte {c.nCorte}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.fecha} · {clienteMap.get(c.clienteId) ?? c.clienteId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase"
                    style={{ background: `${estadoColor}18`, color: estadoColor }}
                  >
                    {ESTADO_ICON[c.estado]}
                    {c.estado.replace('_', ' ')}
                  </span>
                  <button onClick={() => setDetalleCorteId(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">

                {/* Acciones rápidas */}
                {esAdmin && (
                  <div className="flex flex-wrap items-center gap-2 pb-4" style={{ borderBottom: '1px solid #EFECE5' }}>
                    {c.estado === 'EN_PROCESO' && (
                      <button
                        disabled={completandoId === c.id}
                        onClick={() => {
                          if (completandoId === c.id) return;
                          const totalPrendas = (c.cantS ?? 0) + (c.cantM ?? 0) + (c.cantL ?? 0) + (c.cantXL ?? 0);
                          if (totalPrendas === 0) { addToast('El corte no tiene prendas registradas', 'error'); return; }
                          setCompletandoId(c.id);
                          const ok = descontarInventario(c);
                          if (!ok) { setCompletandoId(null); return; }
                          updateCorte(c.id, { estado: 'COMPLETADO' });
                          crearFilasSeguimiento(c);
                          addToast(`Corte ${c.nCorte} completado — inventario descontado y seguimiento creado`, 'success');
                          setTimeout(() => setCompletandoId(null), 2000);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border transition-colors disabled:opacity-40"
                        style={{ color: '#2F7A4D', borderColor: '#2F7A4D55', background: '#2F7A4D0D' }}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> {completandoId === c.id ? 'Guardando…' : 'Completar'}
                      </button>
                    )}
                    <button
                      onClick={() => { setForm(corteToForm(c)); setEditingCorteId(c.id); setShowForm(true); setDetalleCorteId(null); }}
                      className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border transition-colors"
                      style={{ color: '#1a1a1a', borderColor: '#DDD8CF' }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    {c.estado !== 'ANULADO' ? (
                      <button
                        onClick={() => setConfirmAnular(c.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border transition-colors"
                        style={{ color: '#B6762A', borderColor: '#B6762A55', background: '#B6762A0D' }}
                      >
                        <Ban className="h-3.5 w-3.5" /> Anular
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmReactivar(c.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border transition-colors"
                        style={{ color: '#4B7FA3', borderColor: '#4B7FA355', background: '#4B7FA30D' }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reactivar
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(c.id)}
                      className="ml-auto flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border transition-colors"
                      style={{ color: '#C0362C', borderColor: '#C0362C55', background: '#C0362C0D' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                )}

                {/* Resumen: producto, tallas, pagos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Producto</p>
                    <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>{capWords(productoMap.get(c.productoId)?.nombre ?? c.productoId)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Avance de confección</p>
                    {pctGlobal !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 overflow-hidden" style={{ background: '#EAE6DD' }}>
                          <div className="h-full transition-all" style={{ width: `${pctGlobal}%`, background: pctGlobal === 100 ? '#2F7A4D' : pctGlobal >= 50 ? '#4B7FA3' : '#B6762A' }} />
                        </div>
                        <span className="text-xs font-bold font-mono tabular-nums" style={{ color: pctGlobal === 100 ? '#2F7A4D' : '#6B6058' }}>{pctGlobal}%</span>
                      </div>
                    ) : <span className="text-xs text-gray-300 italic">Sin seguimiento</span>}
                  </div>
                </div>

                {/* Colores + tallas */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {tieneColores ? `Colores (${filas.length})` : 'Color'}
                  </p>
                  <div className="space-y-2">
                    {filas.map((fila, fi) => {
                      const opsKey = `${c.id}-${fila.colorId}`;
                      const opsExpanded = expandedOps.has(opsKey);
                      const filasSegs = seguimientoFilas.filter(sf => sf.corteId === c.id && sf.colorId === fila.colorId);
                      const pctColor = filasSegs.length > 0
                        ? Math.round(filasSegs.reduce((s, sf) => s + (sf.pctAvance ?? 0), 0) / filasSegs.length)
                        : null;
                      const opMap = new Map<string, { orden: number; total: number; completadas: number }>();
                      for (const sf of filasSegs) {
                        for (const asig of (sf.asignaciones ?? [])) {
                          const prev = opMap.get(asig.operacion) ?? { orden: asig.orden, total: 0, completadas: 0 };
                          opMap.set(asig.operacion, { orden: asig.orden, total: prev.total + 1, completadas: prev.completadas + (asig.confirmado ? 1 : 0) });
                        }
                      }
                      const fases = [...opMap.entries()].sort((a, b) => a[1].orden - b[1].orden).map(([op, v]) => ({ op, pct: Math.round((v.completadas / v.total) * 100) }));
                      const opActual = fases.find(f => f.pct < 100);

                      const TALLAS = ['S', 'M', 'L', 'XL'] as const;
                      type OpDetalle = { talla: string; cantidad: number; operario: string; confirmado: boolean };
                      const opDetalles = new Map<string, { orden: number; filas: OpDetalle[] }>();
                      for (const sf of filasSegs) {
                        for (const asig of (sf.asignaciones ?? [])) {
                          const entry = opDetalles.get(asig.operacion) ?? { orden: asig.orden, filas: [] };
                          const nombres = (asig.operarioIds?.filter(Boolean).length ? asig.operarioIds! : asig.operarioId ? [asig.operarioId] : [])
                            .map(id => operarios.find(o => o.id === id)?.nombre ?? id).join(', ');
                          entry.filas.push({ talla: sf.talla, cantidad: sf.cantidad, operario: nombres, confirmado: !!asig.confirmado });
                          opDetalles.set(asig.operacion, entry);
                        }
                      }
                      const opDetallesSorted = [...opDetalles.entries()].sort((a, b) => a[1].orden - b[1].orden);

                      return (
                        <div key={fi} style={{ border: '1px solid #EFECE5' }}>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5" style={{ background: '#FAF8F4' }}>
                            <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#1a1a1a' }}>
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#C4612A' }} />
                              {colorMap.get(fila.colorId) ?? fila.colorId}
                              {fila.tonalidad && <span className="text-[10px] font-mono text-gray-400">Tn-{fila.tonalidad}</span>}
                            </span>
                            <div className="flex items-center gap-3 text-[11px] font-mono text-gray-500">
                              {(['cantS', 'cantM', 'cantL', 'cantXL'] as const).map((k, i) => (
                                fila[k] > 0 && <span key={k}>{['S', 'M', 'L', 'XL'][i]}: <strong className="text-gray-700">{fila[k]}</strong></span>
                              ))}
                              <span>Total: <strong className="text-gray-700">{fila.totalColor}</strong></span>
                              {fila.kgUsados > 0 && <span>{fila.kgUsados.toFixed(1)} kg</span>}
                            </div>
                            {pctColor !== null && (
                              <div className="flex items-center gap-1.5 ml-auto">
                                <span className="text-[10px] font-bold font-mono tabular-nums" style={{ color: pctColor === 100 ? '#2F7A4D' : '#6B6058' }}>{pctColor}%</span>
                                {opActual && <span className="text-[10px] font-bold" style={{ color: '#4B7FA3' }}>{opActual.op}</span>}
                                {!opActual && fases.length > 0 && <span className="text-[10px] font-bold" style={{ color: '#2F7A4D' }}>✓ Completo</span>}
                              </div>
                            )}
                            {filasSegs.length > 0 && (
                              <button onClick={() => toggleOps(opsKey)} className="p-0.5 hover:bg-white transition-colors">
                                {opsExpanded ? <ChevronDown className="h-3.5 w-3.5" style={{ color: '#C4612A' }} /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                              </button>
                            )}
                          </div>

                          {opsExpanded && opDetallesSorted.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-[10px] border-collapse">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #EFECE5' }}>
                                    <th className="py-1.5 px-3 text-left text-[9px] uppercase tracking-wide text-gray-400 font-bold">Operación</th>
                                    {TALLAS.map(t => <th key={t} className="py-1.5 px-2 text-center text-[9px] uppercase tracking-wide text-gray-400 font-bold w-12">{t}</th>)}
                                    <th className="py-1.5 px-3 text-left text-[9px] uppercase tracking-wide text-gray-400 font-bold">Operario</th>
                                    <th className="py-1.5 px-3 text-center text-[9px] uppercase tracking-wide text-gray-400 font-bold">Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {opDetallesSorted.map(([op, { orden, filas: opFilas }]) => {
                                    const tallaMap = new Map(opFilas.map(f => [f.talla, f]));
                                    const confirmadas = opFilas.filter(f => f.confirmado).map(f => f.talla);
                                    const todasConfirmadas = TALLAS.filter(t => tallaMap.has(t)).every(t => tallaMap.get(t)!.confirmado);
                                    const operarioNombre = opFilas[0]?.operario ?? '—';
                                    return (
                                      <tr key={op} className={todasConfirmadas ? 'opacity-60' : ''} style={{ borderBottom: '1px solid #F5F2EA' }}>
                                        <td className="py-1.5 px-3 font-bold text-gray-700">{op}</td>
                                        {TALLAS.map(t => {
                                          const sf = tallaMap.get(t);
                                          if (!sf) return <td key={t} className="py-1.5 px-2 text-center text-gray-200">—</td>;
                                          return (
                                            <td key={t} className="py-1.5 px-2 text-center">
                                              <span
                                                className="inline-flex items-center justify-center w-9 py-0.5 text-[9px] font-mono font-bold"
                                                style={sf.confirmado ? { background: '#2F7A4D18', color: '#2F7A4D' } : { background: '#B6762A18', color: '#B6762A' }}
                                              >
                                                {sf.cantidad}
                                              </span>
                                            </td>
                                          );
                                        })}
                                        <td className="py-1.5 px-3 text-gray-600 whitespace-nowrap">{operarioNombre}</td>
                                        <td className="py-1.5 px-3 text-center">
                                          {todasConfirmadas
                                            ? <span className="text-[9px] font-bold" style={{ color: '#2F7A4D' }}>Confirmado</span>
                                            : confirmadas.length > 0
                                              ? <span className="text-[9px] font-bold" style={{ color: '#B6762A' }}>{confirmadas.join(', ')} ✓</span>
                                              : <span className="text-[9px] text-gray-400">Pendiente</span>
                                          }
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Datos físicos */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Datos físicos</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {[
                      { label: 'Rollos', val: c.rollosUsados },
                      { label: 'Tendidas', val: c.tendidas },
                      { label: 'Mts/tendida', val: c.mtsPorTendida > 0 ? c.mtsPorTendida : null },
                      { label: 'Metros totales', val: metrosTotales ? metrosTotales.toFixed(1) + ' m' : null },
                      { label: 'Ancho', val: c.ancho > 0 ? c.ancho + ' m' : null },
                      { label: 'KG usados', val: c.kgUsados > 0 ? c.kgUsados.toFixed(2) + ' kg' : null },
                      esAdmin ? { label: 'Costo MO', val: c.costoMoCorte > 0 ? `S/ ${c.costoMoCorte.toFixed(2)}` : null } : null,
                    ].filter(Boolean).map((item) => item && (
                      <div key={item.label} className="flex items-center gap-1">
                        <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">{item.label}</span>
                        <span className="font-mono font-bold text-gray-800 text-[12px]">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rendimiento de tela */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Rendimiento de tela</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Prendas / kg', val: prendasPorKg, fmt: (v: number) => v.toFixed(2), color: '#2F7A4D', hint: 'prendas salen de 1 kg' },
                      { label: 'Kg / prenda', val: kgPorPrenda, fmt: (v: number) => v.toFixed(4) + ' kg', color: '#2F7A4D', hint: 'tela consume cada prenda' },
                      { label: 'Prendas / metro', val: prendasPorMetro, fmt: (v: number) => v.toFixed(3), color: '#4B7FA3', hint: 'prendas por metro corrido' },
                      { label: 'Kg / metro', val: kgPorMetro, fmt: (v: number) => v.toFixed(4) + ' kg', color: '#4B7FA3', hint: 'gramaje real del tejido' },
                      { label: 'Metros / rollo', val: metrosPorRollo, fmt: (v: number) => v.toFixed(1) + ' m', color: '#7B5EA7', hint: 'longitud promedio por rollo' },
                      { label: 'Prendas / rollo', val: prendasPorRollo, fmt: (v: number) => v.toFixed(1), color: '#7B5EA7', hint: 'producción por rollo' },
                      { label: 'm² / prenda', val: m2PorPrenda, fmt: (v: number) => v.toFixed(4) + ' m²', color: '#B6762A', hint: 'área de tela por prenda' },
                    ].filter(m => m.val !== null).map(({ label, val, fmt, color, hint }) => (
                      <div key={label} className="flex flex-col items-center justify-center px-3 py-2 min-w-[110px]" style={{ background: `${color}0D`, border: `1px solid ${color}30` }}>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
                        <span className="font-mono font-black text-[14px] mt-0.5" style={{ color: '#1a1a1a' }}>{fmt(val!)}</span>
                        <span className="text-[8px] text-gray-400 italic mt-0.5 text-center">{hint}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Personal + pagos + estado */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Personal y pagos</p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {c.cortador && <div className="flex items-center gap-1"><span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Cortador</span><span className="text-gray-700 text-[11px]">{c.cortador}</span></div>}
                    {c.ayudante && <div className="flex items-center gap-1"><span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Ayudante</span><span className="text-gray-700 text-[11px]">{c.ayudante}</span></div>}
                    {c.tendedor && <div className="flex items-center gap-1"><span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Tendedor</span><span className="text-gray-700 text-[11px]">{c.tendedor}</span></div>}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Revisión</span>
                      <span className="text-[10px] font-bold" style={{ color: c.revision === 'VERIFICADO' ? '#2F7A4D' : '#B6762A' }}>{c.revision}</span>
                    </div>
                    {c.traslado && <span className="text-[10px] font-bold" style={{ color: '#4B7FA3' }}>TRASLADO</span>}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Pago Cliente</span>
                      {esAdmin ? (
                        <select
                          value={c.pagoCliente}
                          onChange={e => updateCorte(c.id, { pagoCliente: e.target.value as 'PENDIENTE' | 'COBRADO' })}
                          className="text-[10px] font-bold uppercase border-0 bg-transparent cursor-pointer"
                          style={{ color: c.pagoCliente === 'COBRADO' ? '#2F7A4D' : '#B6762A' }}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="COBRADO">Cobrado</option>
                        </select>
                      ) : (
                        <span className="text-[10px] font-bold uppercase" style={{ color: c.pagoCliente === 'COBRADO' ? '#2F7A4D' : '#B6762A' }}>
                          {c.pagoCliente === 'COBRADO' ? 'Cobrado' : 'Pendiente'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Planilla</span>
                      {esAdmin ? (
                        <select
                          value={c.pagoPlanilla}
                          onChange={e => updateCorte(c.id, { pagoPlanilla: e.target.value as 'PENDIENTE' | 'PAGADO' })}
                          className="text-[10px] font-bold uppercase border-0 bg-transparent cursor-pointer"
                          style={{ color: c.pagoPlanilla === 'PAGADO' ? '#2F7A4D' : '#B6762A' }}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="PAGADO">Pagado</option>
                        </select>
                      ) : (
                        <span className="text-[10px] font-bold uppercase" style={{ color: c.pagoPlanilla === 'PAGADO' ? '#2F7A4D' : '#B6762A' }}>
                          {c.pagoPlanilla === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                        </span>
                      )}
                    </div>
                    {c.horaInicio && (
                      <div className="flex items-center gap-1">
                        <Play className="h-3 w-3" style={{ color: '#2F7A4D' }} />
                        <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Inicio</span>
                        <span className="font-mono text-[11px] font-bold" style={{ color: '#2F7A4D' }}>{fmtHora(c.horaInicio)}</span>
                      </div>
                    )}
                    {c.horaFin && (
                      <div className="flex items-center gap-1">
                        <StopCircle className="h-3 w-3" style={{ color: '#C0362C' }} />
                        <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Fin</span>
                        <span className="font-mono text-[11px] font-bold" style={{ color: '#C0362C' }}>{fmtHora(c.horaFin)}</span>
                      </div>
                    )}
                    {c.horaInicio && c.horaFin && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" style={{ color: '#4B7FA3' }} />
                        <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Duración</span>
                        <span className="font-mono text-[11px] font-bold" style={{ color: '#4B7FA3' }}>{(() => {
                          const mins = Math.round((new Date(c.horaFin).getTime() - new Date(c.horaInicio).getTime()) / 60000);
                          if (mins < 60) return `${mins} min`;
                          return `${Math.floor(mins / 60)}h ${mins % 60}min`;
                        })()}</span>
                      </div>
                    )}
                  </div>
                  {c.notas && (
                    <p className="text-[11px] text-gray-600 italic mt-2">{c.notas}</p>
                  )}
                </div>

              </div>
            </div>
          </div>
        );
      })()}


      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gray-300 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest">{editingCorteId ? `Editar Corte ${form.nCorte}` : 'Nuevo Corte'}</h3>
              <button onClick={() => { setShowForm(false); setEditingCorteId(null); setForm(emptyForm()); }}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <F label="N° Corte"><input type="text" placeholder="Ej: 100, 100A ó 100-A" value={form.nCorte} onChange={set('nCorte')} className="input-base" required /></F>
                <F label="Fecha"><input type="date" value={form.fecha} onChange={set('fecha')} className="input-base" required /></F>
                <F label="Cliente">
                  <select value={form.clienteId} onChange={set('clienteId')} className="input-base" required>
                    <option value="">Seleccionar…</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{capWords(c.nombre)}</option>)}
                  </select>
                </F>
              </div>
              <div className="flex justify-end mb-1">
                <button
                  type="button"
                  onClick={() => { setMostrarTodosProductos(v => !v); setForm(f => ({ ...f, productoId: '' })); }}
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                    mostrarTodosProductos
                      ? 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200'
                      : 'bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100'
                  }`}
                >
                  {mostrarTodosProductos ? '○ Todos los productos' : '⬤ Productos con props'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Producto">
                  <select value={form.productoId} onChange={set('productoId')} className="input-base" required>
                    <option value="">Seleccionar…</option>
                    {(mostrarTodosProductos
                      ? productos
                      : productos.filter(p => (p.propS ?? 0) > 0 || (p.propM ?? 0) > 0 || (p.propL ?? 0) > 0 || (p.propXL ?? 0) > 0)
                    ).map(p => <option key={p.id} value={p.id}>{capWords(p.nombre)}</option>)}
                  </select>
                </F>
                <F label="Tela">
                  {(() => {
                    const prodTela = productoMap.get(form.productoId)?.telaId;
                    if (prodTela) {
                      const tela = telas.find(t => t.id === prodTela);
                      return (
                        <select value={form.telaId} disabled className="input-base bg-gray-50 text-gray-600 cursor-not-allowed">
                          <option value={prodTela}>{tela?.nombre ?? prodTela}</option>
                        </select>
                      );
                    }
                    return (
                      <select value={form.telaId} onChange={set('telaId')} className="input-base">
                        <option value="">— (opcional)</option>
                        {telas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                      </select>
                    );
                  })()}
                </F>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Tendedor">
                  <select value={form.tendedor} onChange={set('tendedor')} className="input-base">
                    <option value="">Seleccionar…</option>
                    <option value="RIQUI">RIQUI</option>
                    <option value="YERSON">YERSON</option>
                    <option value="JOSE">JOSE</option>
                  </select>
                </F>
                <F label="Cortador">
                  <select value={form.cortador} onChange={set('cortador')} className="input-base">
                    <option value="">Seleccionar…</option>
                    <option value="RIQUI">RIQUI</option>
                    <option value="YERSON">YERSON</option>
                    <option value="JOSE">JOSE</option>
                  </select>
                </F>
                <F label="Ayudante">
                  <select value={form.ayudante} onChange={set('ayudante')} className="input-base">
                    <option value="">Seleccionar…</option>
                    <option value="RIQUI">RIQUI</option>
                    <option value="YERSON">YERSON</option>
                    <option value="JOSE">JOSE</option>
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Mts por Tendida"><input type="number" min={0} step={0.01} value={form.mtsPorTendida} onChange={set('mtsPorTendida')} className="input-base" /></F>
                <F label="Ancho (m)"><input type="number" min={0} step={0.01} value={form.ancho} onChange={set('ancho')} className="input-base" /></F>
              </div>

              {/* Tabla colores × cantidades */}
              <div>
                {/* Props globales — encima de la tabla */}
                <div className="mb-3 border border-blue-200 bg-blue-50/60 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Proporciones por talla (aplican a todos los colores)</span>
                    <div className="flex items-center gap-2">
                      {propsModificadas && (
                        <button
                          type="button"
                          onClick={guardarPropsEnProducto}
                          className="text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-1 px-2 py-0.5 rounded bg-green-600 hover:bg-green-700 animate-pulse"
                        >
                          <Save className="h-3 w-3" /> Guardar en producto
                        </button>
                      )}
                      {form.productoId && (parseInt(form.propS)||0)+(parseInt(form.propM)||0)+(parseInt(form.propL)||0)+(parseInt(form.propXL)||0) > 0 && (
                        <button
                          type="button"
                          title="Limpiar proporciones guardadas en el producto"
                          onClick={() => {
                            updateProducto(form.productoId, { propS: 0, propM: 0, propL: 0, propXL: 0 });
                            setForm(f => ({ ...f, propS: '', propM: '', propL: '', propXL: '' }));
                            addToast('Proporciones del producto limpiadas', 'info');
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1 px-2 py-0.5 rounded border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                        >
                          <X className="h-3 w-3" /> Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {(['S','M','L','XL'] as const).map(t => {
                      const field = `prop${t}` as 'propS'|'propM'|'propL'|'propXL';
                      return (
                        <div key={t} className="flex flex-col items-center gap-1">
                          <label className="text-[10px] font-bold uppercase text-blue-400">{t}</label>
                          <input
                            type="number" min={0} step={1}
                            value={form[field]}
                            onChange={e => {
                              const val = e.target.value;
                              setForm(f => {
                                const pS  = field === 'propS'  ? (parseInt(val)||0) : (parseInt(f.propS)||0);
                                const pM  = field === 'propM'  ? (parseInt(val)||0) : (parseInt(f.propM)||0);
                                const pL  = field === 'propL'  ? (parseInt(val)||0) : (parseInt(f.propL)||0);
                                const pXL = field === 'propXL' ? (parseInt(val)||0) : (parseInt(f.propXL)||0);
                                const updatedColores = f.colores.map((c) => {
                                  const t2 = parseInt(c.tendidas) || 0;
                                  if (t2 <= 0 || (pS + pM + pL + pXL) === 0) return c;
                                  return {
                                    ...c,
                                    cantS: String(pS * t2),
                                    cantM: String(pM * t2),
                                    cantL: String(pL * t2),
                                    cantXL: String(pXL * t2),
                                  };
                                });
                                return { ...f, [field]: val, colores: updatedColores };
                              });
                            }}
                            className="input-base text-xs py-1 text-center w-16"
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                    {(parseInt(form.propS)||0)+(parseInt(form.propM)||0)+(parseInt(form.propL)||0)+(parseInt(form.propXL)||0) > 0 && (
                      <div className="ml-2 text-[10px] text-blue-400 font-mono">
                        Total proporción: {(parseInt(form.propS)||0)+(parseInt(form.propM)||0)+(parseInt(form.propL)||0)+(parseInt(form.propXL)||0)} prendas/tendida
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Colores y Cantidades</label>
                  <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, colores: [...f.colores, emptyColorDetalle()] }))}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#C4612A] hover:text-[#a04e22] flex items-center gap-1 px-2 py-0.5 rounded border border-orange-300 bg-orange-50 hover:bg-orange-100"
                  >
                    <Plus className="h-3 w-3" /> + Color
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      colores: [...f.colores, { ...emptyColorDetalle(), todosColores: true }],
                    }))}
                    className="text-[10px] font-bold uppercase tracking-widest text-purple-700 flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Plus className="h-3 w-3" /> + Color Global
                  </button>
                  </div>
                </div>
                <div className="overflow-x-auto border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {form.colores.length > 1 && <th className="px-2 py-1.5 text-[10px] font-bold uppercase text-gray-400 w-6">#</th>}
                        <th className="px-2 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-left min-w-[110px] w-28">Color</th>
                        <th className="px-2 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-center min-w-[60px] w-16">Ton.</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-right w-16">Kg</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-right w-16">Rollos</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-center w-16">Tendidas</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-blue-400 text-center w-16 border-l border-blue-100">S</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-blue-400 text-center w-16">M</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-blue-400 text-center w-16">L</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-blue-400 text-center w-16">XL</th>
                        <th className="w-6" />
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-right w-16">Total</th>
                        <th className="w-6" />
                        {form.colores.length > 1 && <th className="w-6" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        // Agrupar rollos por colorBase+tonalidad (tonalidades distintas = rollos distintos)
                        const rollosSpan: number[] = form.colores.map((_, i) => {
                          const base = form.colores[i].colorBase;
                          const ton = form.colores[i].tonalidad;
                          if (!base) return 1;
                          if (i > 0 && form.colores[i - 1].colorBase === base && form.colores[i - 1].tonalidad === ton) return 0;
                          let span = 1;
                          while (i + span < form.colores.length && form.colores[i + span].colorBase === base && form.colores[i + span].tonalidad === ton) span++;
                          return span;
                        });
                        return form.colores.map((det, idx) => {
                        const total = (parseInt(det.cantS)||0)+(parseInt(det.cantM)||0)+(parseInt(det.cantL)||0)+(parseInt(det.cantXL)||0);
                        const gT = parseInt(det.tendidas) || 0;
                        const gPS = parseInt(form.propS) || 0, gPM = parseInt(form.propM) || 0;
                        const gPL = parseInt(form.propL) || 0, gPXL = parseInt(form.propXL) || 0;
                        const esperadoS = gT * gPS, esperadoM = gT * gPM, esperadoL = gT * gPL, esperadoXL = gT * gPXL;
                        const tienePropsCustom = det.colorId && (
                          (parseInt(det.cantS)||0) !== esperadoS ||
                          (parseInt(det.cantM)||0) !== esperadoM ||
                          (parseInt(det.cantL)||0) !== esperadoL ||
                          (parseInt(det.cantXL)||0) !== esperadoXL
                        ) && gT > 0 && (gPS + gPM + gPL + gPXL) > 0;
                        const setDet = (field: keyof ColorDetalle) =>
                          (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                            setForm(f => {
                              const next = [...f.colores];
                              const updated = { ...next[idx], [field]: e.target.value };
                              next[idx] = updated;

                              if (field === 'tendidas') {
                                const t = parseInt(e.target.value) || 0;
                                if (t > 0) {
                                  const pS  = parseInt(f.propS)  || 0;
                                  const pM  = parseInt(f.propM)  || 0;
                                  const pL  = parseInt(f.propL)  || 0;
                                  const pXL = parseInt(f.propXL) || 0;
                                  if (pS + pM + pL + pXL > 0) {
                                    next[idx] = { ...next[idx], tendidas: e.target.value, cantS: String(pS * t), cantM: String(pM * t), cantL: String(pL * t), cantXL: String(pXL * t) };
                                  }
                                }
                              }


                              return { ...f, colores: next };
                            });
                          };
                        return (
                          <React.Fragment key={det.uid ?? idx}>
                            <tr className="hover:bg-gray-50 border-t border-gray-200">
                              {form.colores.length > 1 && (
                                <td className="px-2 py-1 text-[10px] font-mono font-bold text-gray-400 text-center align-middle">
                                  {String.fromCharCode(65 + idx)}
                                </td>
                              )}
                              {/* Dropdown 1: color base */}
                              <td className="px-2 py-1 min-w-[110px] w-28">
                                <select
                                  value={det.colorBase}
                                  onChange={e => {
                                    const base = e.target.value;
                                    const newColorId = (coloresAgrupados.get(base) ?? [])[0]?.id ?? '';
                                    setForm(f => {
                                      const next = [...f.colores];
                                      const t = parseInt(next[idx].tendidas) || 0;
                                      const pS  = parseInt(f.propS)  || 0;
                                      const pM  = parseInt(f.propM)  || 0;
                                      const pL  = parseInt(f.propL)  || 0;
                                      const pXL = parseInt(f.propXL) || 0;
                                      const cantidades = (pS + pM + pL + pXL) > 0 ? {
                                        cantS:  String(t > 0 ? pS  * t : pS),
                                        cantM:  String(t > 0 ? pM  * t : pM),
                                        cantL:  String(t > 0 ? pL  * t : pL),
                                        cantXL: String(t > 0 ? pXL * t : pXL),
                                      } : {};
                                      next[idx] = { ...next[idx], colorBase: base, colorId: newColorId, tonalidad: '', ...cantidades };
                                      return { ...f, colores: next };
                                    });
                                  }}
                                  className="input-base text-xs py-1 w-full"
                                  required={idx === 0}
                                >
                                  <option value="">Color…</option>
                                  {nombresBase.map(b => (
                                    <option key={b} value={b}>{capWords(b)}</option>
                                  ))}
                                </select>
                              </td>
                              {/* Dropdown 2: tonalidad 1–4 (dato descriptivo) */}
                              <td className="px-2 py-1 min-w-[80px] w-20">
                                <div className="flex items-center gap-1">
                                  {!det.colorBase ? (
                                    <span className="text-xs text-gray-400 px-1 flex-1">—</span>
                                  ) : (
                                    <select
                                      value={det.tonalidad}
                                      onChange={e => {
                                        const ton = e.target.value;
                                        setForm(f => {
                                          const next = [...f.colores];
                                          next[idx] = { ...next[idx], tonalidad: ton };
                                          return { ...f, colores: next };
                                        });
                                      }}
                                      className="input-base text-xs py-1 w-full"
                                    >
                                      <option value="">Ton…</option>
                                      {TONALIDADES.map(t => (
                                        <option key={t} value={t}>Tonalidad {t}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-1">
                                <input type="number" min={0} step={0.1} value={det.kgUsados} onChange={setDet('kgUsados')} className="input-base text-xs py-1 text-right w-full min-w-[52px]" placeholder="0" />
                              </td>
                              {rollosSpan[idx] > 0 && (
                                <td className="px-2 py-1" rowSpan={rollosSpan[idx]}>
                                  <input
                                    type="number" min={0} step={0.5}
                                    value={det.rollosUsados}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setForm(f => {
                                        const next = [...f.colores];
                                        for (let i = idx; i < idx + rollosSpan[idx]; i++) {
                                          next[i] = { ...next[i], rollosUsados: val };
                                        }
                                        return { ...f, colores: next };
                                      });
                                    }}
                                    className={`input-base text-xs py-1 text-right w-full min-w-[52px] ${form.telaId && !parseFloat(det.rollosUsados) ? 'border-orange-400 bg-orange-50' : ''}`}
                                    placeholder={form.telaId ? 'Requerido' : '0'}
                                    required={!!form.telaId}
                                  />
                                </td>
                              )}
                              <td className="px-2 py-1">
                                <input type="number" min={0} value={det.tendidas} onChange={setDet('tendidas')} className="input-base text-xs py-1 text-center w-full min-w-[52px]" placeholder="0" />
                              </td>
                              {/* Cantidades calculadas */}
                              {(['cantS','cantM','cantL','cantXL'] as const).map(f => (
                                <td key={f} className={`px-2 py-1 border-l ${tienePropsCustom ? 'border-yellow-200 bg-yellow-50/30' : 'border-blue-50'}`}>
                                  <input type="number" min={0} value={det[f]} onChange={setDet(f)} className={`input-base text-xs py-1 text-center w-full min-w-[48px] ${tienePropsCustom ? 'border-yellow-300' : ''}`} />
                                </td>
                              ))}
                              <td className="px-2 py-1 text-right font-mono font-bold text-gray-700 whitespace-nowrap">{total}</td>
                              <td className="px-1 py-1 align-middle">
                                <button
                                  type="button"
                                  title="Duplicar este color"
                                  onClick={() => setForm(f => {
                                    const copia = { ...f.colores[idx], uid: crypto.randomUUID(), cantS: '0', cantM: '0', cantL: '0', cantXL: '0', kgUsados: '', rollosUsados: '', tendidas: '' };
                                    const nuevos = [...f.colores];
                                    nuevos.splice(idx + 1, 0, copia);
                                    return { ...f, colores: nuevos };
                                  })}
                                  className="text-gray-300 hover:text-blue-500 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </button>
                              </td>
                              {form.colores.length > 1 && (
                                <td className="px-1 py-1 align-middle">
                                  <button type="button" onClick={() => setForm(f => ({ ...f, colores: f.colores.filter((_, i) => i !== idx) }))} className="text-gray-300 hover:text-red-500">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          </React.Fragment>
                        );
                        });
                      })()}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                      <tr>
                        {form.colores.length > 1 && <td />}
                        <td className="px-2 py-1 text-[10px] font-bold uppercase text-gray-500">Total</td>
                        <td />
                        <td className="px-2 py-1 text-right font-mono font-black text-gray-800">
                          {form.colores.reduce((s, d) => s + (parseFloat(d.kgUsados)||0), 0).toFixed(1)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono font-black text-gray-800">
                          {totalRollosSinDuplicar(form.colores).toFixed(1)}
                        </td>
                        <td className="px-2 py-1 text-center font-mono font-black text-gray-800">
                          {form.colores.reduce((s, d) => s + (parseInt(d.tendidas)||0), 0)}
                        </td>
                        {(['cantS','cantM','cantL','cantXL'] as const).map(f => (
                          <td key={f} className="px-2 py-1 text-center font-mono font-black text-gray-800 border-l border-blue-100">
                            {form.colores.reduce((s, d) => s + (parseInt(d[f])||0), 0)}
                          </td>
                        ))}
                        <td />
                        <td className="px-2 py-1 text-right font-mono font-black text-gray-800">
                          {form.colores.reduce((s, d) => s + (parseInt(d.cantS)||0)+(parseInt(d.cantM)||0)+(parseInt(d.cantL)||0)+(parseInt(d.cantXL)||0), 0)}
                        </td>
                        <td />
                        {form.colores.length > 1 && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              {/* Indicadores generales: rendimiento y consumo */}
              {(() => {
                const totalKg = form.colores.reduce((s, d) => s + (parseFloat(d.kgUsados)||0), 0);
                const totalPrendas = form.colores.reduce((s, d) =>
                  s + (parseInt(d.cantS)||0)+(parseInt(d.cantM)||0)+(parseInt(d.cantL)||0)+(parseInt(d.cantXL)||0), 0);
                const totalTendidas = form.colores.reduce((s, d) => s + (parseInt(d.tendidas)||0), 0);
                const mtsPorTendida = parseFloat(form.mtsPorTendida) || 0;
                const metrosTotales = totalTendidas > 0 && mtsPorTendida > 0 ? totalTendidas * mtsPorTendida : null;
                const rendimiento = totalKg > 0 && totalPrendas > 0 ? totalPrendas / totalKg : null;
                const prendasPorTendida = totalTendidas > 0 ? totalPrendas / totalTendidas : 0;
                const consumoTendida = prendasPorTendida > 0 && mtsPorTendida > 0 ? mtsPorTendida / prendasPorTendida : null;
                if (rendimiento === null && consumoTendida === null && metrosTotales === null) return null;
                const cols = [metrosTotales, rendimiento, consumoTendida].filter(v => v !== null).length;
                return (
                  <div className={`grid gap-3 grid-cols-${cols}`}>
                    {metrosTotales !== null && (
                      <div className="bg-blue-50 border border-blue-200 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-0.5">Metros de tendida</p>
                        <p className="text-lg font-black text-blue-800">{metrosTotales.toFixed(1)}</p>
                        <p className="text-[10px] text-blue-500">mts totales</p>
                      </div>
                    )}
                    {rendimiento !== null && (
                      <div className="bg-blue-50 border border-blue-200 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-0.5">Rendimiento general</p>
                        <p className="text-lg font-black text-blue-800">{rendimiento.toFixed(2)}</p>
                        <p className="text-[10px] text-blue-500">prendas / kg</p>
                      </div>
                    )}
                    {consumoTendida !== null && (
                      <div className="bg-blue-50 border border-blue-200 px-3 py-2 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-0.5">Consumo por tendida</p>
                        <p className="text-lg font-black text-blue-800">{consumoTendida.toFixed(3)}</p>
                        <p className="text-[10px] text-blue-500">mts / prenda</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="traslado" checked={form.traslado} onChange={e => setForm(f => ({ ...f, traslado: e.target.checked }))} className="h-4 w-4" />
                <label htmlFor="traslado" className="text-[10px] font-bold uppercase tracking-widest">Traslado</label>
              </div>
              <F label="Notas"><textarea value={form.notas} onChange={set('notas')} rows={2} className="input-base" /></F>
              {(() => {
                const prodSeleccionado = productoMap.get(form.productoId);
                if (!prodSeleccionado) return null;
                return (
                  <>
                    {form.colores.map((det, idx) => {
                      const kgU = parseFloat(det.kgUsados) || 0;
                      const rollosU = parseFloat(det.rollosUsados) || 0;
                      const totalP = (parseInt(det.cantS)||0)+(parseInt(det.cantM)||0)+(parseInt(det.cantL)||0)+(parseInt(det.cantXL)||0);
                      const consumoActual = totalP > 0 ? kgU / totalP : 0;
                      // Para el rendimiento, sumar prendas de todo el grupo colorBase (rollos son compartidos)
                      const base = det.colorBase;
                      const prendasGrupo = base
                        ? form.colores.filter(c => c.colorBase === base).reduce((s, c) => s + (parseInt(c.cantS)||0)+(parseInt(c.cantM)||0)+(parseInt(c.cantL)||0)+(parseInt(c.cantXL)||0), 0)
                        : totalP;
                      const rendimientoActual = rollosU > 0 ? prendasGrupo / rollosU : 0;
                      const label = form.colores.length > 1 ? ` (${String.fromCharCode(65+idx)})` : '';
                      return (
                        <React.Fragment key={idx}>
                          {prodSeleccionado.limiteConsumo && consumoActual > 0 && consumoActual > prodSeleccionado.limiteConsumo && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 text-[11px] font-bold">
                              ⚠ Color{label}: Consumo {consumoActual.toFixed(3)} kg/prenda supera el límite de {prodSeleccionado.limiteConsumo} kg/prenda
                            </div>
                          )}
                          {prodSeleccionado.limiteRendimiento && rendimientoActual > 0 && rendimientoActual < prodSeleccionado.limiteRendimiento && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 text-[11px] font-bold">
                              ⚠ Color{label}: Rendimiento {rendimientoActual.toFixed(1)} prendas/rollo está por debajo del mínimo de {prodSeleccionado.limiteRendimiento}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </>
                );
              })()}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingCorteId(null); setForm(emptyForm()); }} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">{editingCorteId ? 'Actualizar Corte' : 'Guardar Corte'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar eliminar corte */}
      {confirmDelete && (
        <ConfirmModal
          mensaje="¿Eliminar este corte?"
          detalle="Se eliminará el corte y todo su seguimiento. Esta acción no se puede deshacer."
          onConfirmar={() => {
            deleteCorte(confirmDelete);
            setConfirmDelete(null);
            addToast('Corte eliminado', 'success');
          }}
          onCancelar={() => setConfirmDelete(null)}
        />
      )}

      {/* Confirmar anular corte */}
      {confirmAnular && (
        <ConfirmModal
          mensaje="¿Anular este corte?"
          detalle="El corte y sus filas de seguimiento pendientes pasarán a ANULADO. Las boletas de pago aún no pagadas de este corte se eliminarán; las ya pagadas se conservan. Esta acción no se puede deshacer."
          onConfirmar={() => {
            const corte = cortes.find(c => c.id === confirmAnular);
            if (corte) anularCorte(corte);
            setConfirmAnular(null);
            addToast('Corte anulado', 'success');
          }}
          onCancelar={() => setConfirmAnular(null)}
        />
      )}

      {/* Confirmar reactivar corte */}
      {confirmReactivar && (
        <ConfirmModal
          mensaje="¿Reactivar este corte?"
          detalle="El corte volverá a EN_PROCESO y sus filas de seguimiento a PENDIENTE. Las boletas de pago que se eliminaron al anular NO se recuperan — los operarios deberán reconfirmarse de nuevo."
          onConfirmar={() => {
            const corte = cortes.find(c => c.id === confirmReactivar);
            if (corte) reactivarCorte(corte);
            setConfirmReactivar(null);
            addToast('Corte reactivado', 'success');
          }}
          onCancelar={() => setConfirmReactivar(null)}
        />
      )}

      {/* Modal registro de inicio / fin de corte */}
      {tiempoModal.open && (() => {
        const esInicio = tiempoModal.tipo === 'inicio';
        const cortesEnProceso = cortes.filter(c => c.estado === 'EN_PROCESO');
        const corteSeleccionado = cortes.find(c => c.id === tiempoCorteId);
        const yaRegistrado = corteSeleccionado && (esInicio ? !!corteSeleccionado.horaInicio : !!corteSeleccionado.horaFin);
        const cerrar = () => { setTiempoModal({ open: false, tipo: 'inicio' }); setTiempoCorteId(''); };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={cerrar}>
            <div className="bg-white shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {esInicio ? <Play className="h-5 w-5 text-green-600" /> : <StopCircle className="h-5 w-5 text-red-500" />}
                  <h3 className="font-black uppercase text-sm tracking-wide">
                    {esInicio ? 'Registrar Inicio de Corte' : 'Registrar Fin de Corte'}
                  </h3>
                </div>
                <button onClick={cerrar} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Seleccionar Corte</label>
                <select value={tiempoCorteId} onChange={e => setTiempoCorteId(e.target.value)} className="input-base w-full">
                  <option value="">Seleccionar corte…</option>
                  {cortesEnProceso.map(c => {
                    const prod = productoMap.get(c.productoId)?.nombre ?? '';
                    const cli = clienteMap.get(c.clienteId) ?? '';
                    const tags = [c.horaInicio ? '✓ inicio' : '', c.horaFin ? '✓ fin' : ''].filter(Boolean).join(' ');
                    return (
                      <option key={c.id} value={c.id}>
                        Corte {c.nCorte} — {prod} · {cli}{tags ? ` [${tags}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {yaRegistrado && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
                  Ya tiene {esInicio ? 'inicio' : 'fin'} registrado ({esInicio ? fmtHora(corteSeleccionado!.horaInicio!) : fmtHora(corteSeleccionado!.horaFin!)}). Se sobreescribirá.
                </p>
              )}

              <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 px-3 py-2">
                Hora actual: <span className="font-mono font-bold text-gray-800">{new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={cerrar} className="btn-secondary text-xs px-4">Cancelar</button>
                <button
                  disabled={!tiempoCorteId}
                  onClick={confirmarTiempo}
                  className={`btn-primary text-xs px-4 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${!esInicio ? 'bg-red-600 hover:bg-red-700 border-red-600' : ''}`}
                >
                  {esInicio ? <Play className="h-3.5 w-3.5" /> : <StopCircle className="h-3.5 w-3.5" />}
                  Confirmar {esInicio ? 'Inicio' : 'Fin'}
                </button>
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
