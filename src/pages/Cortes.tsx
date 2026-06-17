import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, CheckCircle, Clock, XCircle, FileText, Trash2, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { Corte, CorteColorDetalle, SeguimientoAsignacion, SeguimientoFila, MovimientoTela } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { ConfirmModal } from '../components/ConfirmModal';
import { exportRowsToXlsx, exportReportesCorte } from '../lib/export';
import { newId } from '../lib/storage';
import { useStockActualTelas, useColoresAgrupados } from '../hooks/useCorteOperaciones';
import { useEsAdmin } from '../lib/useEsAdmin';

// Suma rollos sin contar duplicados del mismo colorBase (la celda está agrupada por rowSpan)
const totalRollosSinDuplicar = (colores: { colorBase: string; rollosUsados: string }[]) =>
  colores.reduce((sum, det, i) => {
    const base = det.colorBase;
    if (base && i > 0 && colores[i - 1].colorBase === base) return sum;
    return sum + (parseFloat(det.rollosUsados) || 0);
  }, 0);

interface ColorDetalle {
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

const ESTADO_ICON: Record<string, React.ReactNode> = {
  EN_PROCESO: <Clock className="h-3 w-3 text-blue-600" />,
  COMPLETADO: <CheckCircle className="h-3 w-3 text-green-600" />,
  ANULADO: <XCircle className="h-3 w-3 text-red-500" />,
};

export function Cortes() {
  const {
    cortes, clientes, productos, colores, telas, tarifasOperaciones, operarios,
    movimientosTela, seguimientoFilas, productoColores,
    addCorte, updateCorte, deleteCorte,
    addMovimientoTela, addSeguimientoFila,
    updateProducto, addColorConProductoColor, updateProductoColor, addProductoColor,
  } = useAppContext();

  const { addToast } = useToast();
  const esAdmin = useEsAdmin();
  const [showForm, setShowForm] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [form, setForm] = useState<CorteForm>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [completandoId, setCompletandoId] = useState<string | null>(null);
  const [mostrarTodosProductos, setMostrarTodosProductos] = useState(true);
  const [expandedCortes, setExpandedCortes] = useState<Set<string>>(new Set());
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set());
  const toggleOps = (key: string) =>
    setExpandedOps(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  const toggleExpand = (id: string) =>
    setExpandedCortes(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  // Mini-modal para agregar tonalidad desde el formulario de corte
  const [tonModal, setTonModal] = useState<{ idx: number; colorBase: string } | null>(null);
  const [tonProps, setTonProps] = useState({ propS: '', propM: '', propL: '', propXL: '' });

  const capWords = (s: string) =>
    s.replace(/(^|\s)(\S)/g, (_, sp, ch) => sp + ch.toUpperCase());

  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);
  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c.nombre])), [colores]);
  const telaMap = useMemo(() => new Map(telas.map(t => [t.id, t])), [telas]);

  const coloresAgrupados = useColoresAgrupados(colores);

  // Nombres base ordenados por prioridad mínima del grupo
  const nombresBase = useMemo(() => {
    return [...coloresAgrupados.keys()].sort((a, b) => {
      const minA = Math.min(...(coloresAgrupados.get(a)?.map(x => x.prioridad) ?? [999]));
      const minB = Math.min(...(coloresAgrupados.get(b)?.map(x => x.prioridad) ?? [999]));
      return minA - minB || a.localeCompare(b);
    });
  }, [coloresAgrupados]);

  const stockActualTelas = useStockActualTelas(movimientosTela);

  useEffect(() => {
    if (!form.productoId) return;
    const prod = productoMap.get(form.productoId);
    if (!prod) return;
    setForm(f => {
      const partial: Partial<CorteForm> = {};
      if (prod.telaId && !f.telaId) partial.telaId = prod.telaId;
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
      .filter(c => (!filterEstado || c.estado === filterEstado) && (!filterCliente || c.clienteId === filterCliente))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [cortes, filterEstado, filterCliente]);

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

  // Anula un corte: si estaba COMPLETADO revierte el movimiento A_CORTE con un AJUSTE_POS
  const anularCorte = (corte: Corte) => {
    if (corte.estado === 'COMPLETADO' && corte.telaId && corte.colorId && corte.rollosUsados > 0) {
      const key = `${corte.telaId}|${corte.colorId}`;
      const stockAntes = stockActualTelas.get(key) ?? 0;
      const stockDespues = stockAntes + corte.rollosUsados;
      const color = colores.find(c => c.id === corte.colorId);
      const mov: MovimientoTela = {
        id: newId(),
        fecha: new Date().toISOString().slice(0, 10),
        tipo: 'AJUSTE_POS',
        clienteId: corte.clienteId,
        telaId: corte.telaId,
        colorId: corte.colorId,
        rollos: corte.rollosUsados,
        kgTotal: corte.kgUsados || 0,
        categoriaColor: color?.categoria ?? 'OSCURO',
        precioKg: 0,
        totalSoles: 0,
        stockRollosAntes: stockAntes,
        stockRollosDespues: stockDespues,
        responsable: '',
        notas: `Reversión por anulación de corte ${corte.nCorte}`,
      };
      addMovimientoTela(mov);
    }
    updateCorte(corte.id, { estado: 'ANULADO' });
    addToast(`Corte ${corte.nCorte} anulado`, 'success');
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

    if (!/^\d+[A-Za-z]?$/.test(form.nCorte.trim()) || parseInt(form.nCorte) <= 0) {
      addToast('N° Corte debe ser un número, con letra opcional al final (ej: 100 ó 100A)', 'error');
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

    const corte: Corte = {
      id: newId(),
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
      revision: 'PENDIENTE',
      traslado: form.traslado,
      estado: 'EN_PROCESO',
      pagoCliente: 'PENDIENTE',
      pagoPlanilla: 'PENDIENTE',
      costoMoCorte: calcCostoMo(form.productoId, totalPrendas),
      notas: form.notas,
    };
    addCorte(corte);

    const msg = coloresDetalle.length > 1
      ? `Corte ${form.nCorte} registrado con ${coloresDetalle.length} colores`
      : `Corte ${form.nCorte} registrado`;
    addToast(msg, 'success');
    setShowForm(false);
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

  const exportarCortesPdf = () => {
    const dataList = cortesFiltrados.map(c => {
      const tela = telaMap.get(c.telaId ?? '')?.nombre ?? c.telaId ?? '';
      const producto = productoMap.get(c.productoId)?.nombre ?? c.productoId;
      const detalles = c.coloresDetalle && c.coloresDetalle.length > 0
        ? c.coloresDetalle
        : [{ colorId: c.colorId, kgUsados: c.kgUsados, rollosUsados: c.rollosUsados, tendidas: c.tendidas, cantS: c.cantS, cantM: c.cantM, cantL: c.cantL, cantXL: c.cantXL }];
      return {
        nCorte: c.nCorte,
        fecha: c.fecha,
        tela,
        producto,
        cortador: c.cortador,
        ayudante: c.ayudante,
        tendedor: c.tendedor,
        ancho: c.ancho,
        mtsPorTendida: c.mtsPorTendida,
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Cortes</h2>
          <p className="text-xs text-gray-500 mt-1">Registro y seguimiento de órdenes de corte</p>
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
      </div>

      {cortesFiltrados.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin cortes registrados.</p>
      ) : (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">N° Corte</th>
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">Fecha</th>
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">Cliente</th>
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">Producto</th>
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">Color</th>
                <th className="px-2 py-1 text-center text-[9px] font-bold uppercase tracking-widest text-gray-500">S</th>
                <th className="px-2 py-1 text-center text-[9px] font-bold uppercase tracking-widest text-gray-500">M</th>
                <th className="px-2 py-1 text-center text-[9px] font-bold uppercase tracking-widest text-gray-500">L</th>
                <th className="px-2 py-1 text-center text-[9px] font-bold uppercase tracking-widest text-gray-500">XL</th>
                <th className="px-2 py-1 text-right text-[9px] font-bold uppercase tracking-widest text-gray-500">Total</th>
                <th className="px-2 py-1 text-right text-[9px] font-bold uppercase tracking-widest text-gray-500">Kg</th>
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500 min-w-[90px]">Avance</th>
                {esAdmin && <th className="px-2 py-1 text-right text-[9px] font-bold uppercase tracking-widest text-gray-500">Costo MO</th>}
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500">Estado</th>
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500">Pago Cli.</th>
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500">Planilla</th>
                <th className="px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cortesFiltrados.map((c, corteIdx) => {
                const detalles = c.coloresDetalle && c.coloresDetalle.length > 0
                  ? c.coloresDetalle
                  : [{ colorId: c.colorId, tonalidad: c.tonalidad, cantS: c.cantS, cantM: c.cantM, cantL: c.cantL, cantXL: c.cantXL, kgUsados: c.kgUsados, rollosUsados: c.rollosUsados }];

                const filas = detalles.map(det => ({
                  colorId: det.colorId,
                  tonalidad: det.tonalidad,
                  cantS: det.cantS,
                  cantM: det.cantM,
                  cantL: det.cantL,
                  cantXL: det.cantXL,
                  totalColor: det.cantS + det.cantM + det.cantL + det.cantXL,
                  kgUsados: det.kgUsados,
                }));

                const expanded = expandedCortes.has(c.id);
                const tieneColores = filas.length > 1;
                const bgCorte = corteIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                const totalColumnas = esAdmin ? 16 : 15; // sin Costo MO si no es admin
                const borderTop = 'border-t-2 border-gray-300';

                // Avance global del corte (promedio de todos los colores)
                const filasSegsAll = seguimientoFilas.filter(sf => sf.corteId === c.id);
                const pctGlobal = filasSegsAll.length > 0
                  ? Math.round(filasSegsAll.reduce((s, sf) => s + (sf.pctAvance ?? 0), 0) / filasSegsAll.length)
                  : null;

                // Resumen de colores para la fila collapsed
                const resumenColores = filas.map(f =>
                  (colorMap.get(f.colorId) ?? f.colorId) + (f.tonalidad ? ` Tn-${f.tonalidad}` : '')
                ).join(' · ');

                return (
                  <React.Fragment key={c.id}>
                    {/* ── Fila principal (siempre visible) ── */}
                    <tr
                      className={`${borderTop} ${bgCorte} hover:bg-amber-50/50 transition-colors cursor-pointer select-none`}
                      onClick={() => toggleExpand(c.id)}
                    >
                      {/* Chevron + N° Corte */}
                      <td className="px-2 py-1 font-mono font-black text-xs text-gray-800 border-r border-gray-200 border-l-4 border-l-[#B66F35] whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          {expanded
                            ? <ChevronDown className="h-3 w-3 text-[#B66F35] flex-shrink-0" />
                            : <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          }
                          {c.nCorte}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-xs font-mono whitespace-nowrap border-r border-gray-100">{c.fecha}</td>
                      <td className="px-2 py-1 text-xs whitespace-nowrap border-r border-gray-100">{clienteMap.get(c.clienteId) ?? c.clienteId}</td>
                      <td className="px-2 py-1 text-xs whitespace-nowrap border-r border-gray-100">{productoMap.get(c.productoId)?.nombre ?? c.productoId}</td>
                      {/* Colores: resumen collapsed o primer color si solo hay 1 */}
                      <td className="px-2 py-1 border-r border-gray-100">
                        {tieneColores && !expanded ? (
                          <span className="text-[10px] text-gray-500 italic">{resumenColores}</span>
                        ) : !tieneColores ? (
                          <span className="text-xs font-medium text-gray-700">
                            {colorMap.get(filas[0].colorId) ?? filas[0].colorId}
                            {filas[0].tonalidad && <span className="ml-1 text-[10px] font-mono text-gray-400">Tn-{filas[0].tonalidad}</span>}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#B66F35] font-bold">{filas.length} colores</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-xs text-center font-mono">{c.cantS > 0 ? c.cantS : <span className="text-gray-300">—</span>}</td>
                      <td className="px-2 py-1 text-xs text-center font-mono">{c.cantM > 0 ? c.cantM : <span className="text-gray-300">—</span>}</td>
                      <td className="px-2 py-1 text-xs text-center font-mono">{c.cantL > 0 ? c.cantL : <span className="text-gray-300">—</span>}</td>
                      <td className="px-2 py-1 text-xs text-center font-mono">{c.cantXL > 0 ? c.cantXL : <span className="text-gray-300">—</span>}</td>
                      <td className="px-2 py-1 text-xs text-right font-mono font-bold">{c.totalPrendas}</td>
                      <td className="px-2 py-1 text-xs text-right font-mono text-gray-500">{c.kgUsados > 0 ? c.kgUsados.toFixed(1) : '—'}</td>
                      {/* Avance global */}
                      <td className="px-2 py-1 min-w-[90px]">
                        {pctGlobal !== null ? (
                          <div className="flex items-center gap-1">
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${pctGlobal === 100 ? 'bg-green-500' : pctGlobal >= 50 ? 'bg-blue-400' : 'bg-yellow-400'}`}
                                style={{ width: `${pctGlobal}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold font-mono tabular-nums ${pctGlobal === 100 ? 'text-green-600' : 'text-gray-600'}`}>{pctGlobal}%</span>
                          </div>
                        ) : <span className="text-[10px] text-gray-300 italic">—</span>}
                      </td>
                      {esAdmin && (
                        <td className="px-2 py-1 text-xs font-mono text-right border-l border-gray-100">
                          {c.costoMoCorte > 0 ? `S/ ${c.costoMoCorte.toFixed(2)}` : '—'}
                        </td>
                      )}
                      <td className="px-2 py-1 border-l border-gray-100">
                        <span className="flex items-center gap-1">
                          {ESTADO_ICON[c.estado]}
                          <span className="text-[10px] font-bold uppercase">{c.estado.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-2 py-1 border-l border-gray-100" onClick={e => e.stopPropagation()}>
                        <select
                          value={c.pagoCliente}
                          onChange={e => updateCorte(c.id, { pagoCliente: e.target.value as 'PENDIENTE' | 'COBRADO' })}
                          className={`text-[10px] font-bold uppercase border-0 bg-transparent cursor-pointer ${c.pagoCliente === 'COBRADO' ? 'text-green-700' : 'text-yellow-700'}`}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="COBRADO">Cobrado</option>
                        </select>
                      </td>
                      <td className="px-2 py-1 border-l border-gray-100" onClick={e => e.stopPropagation()}>
                        <select
                          value={c.pagoPlanilla}
                          onChange={e => updateCorte(c.id, { pagoPlanilla: e.target.value as 'PENDIENTE' | 'PAGADO' })}
                          className={`text-[10px] font-bold uppercase border-0 bg-transparent cursor-pointer ${c.pagoPlanilla === 'PAGADO' ? 'text-green-700' : 'text-yellow-700'}`}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="PAGADO">Pagado</option>
                        </select>
                      </td>
                      <td className="px-2 py-1 border-l border-gray-100" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-0.5">
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
                              className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                            >{completandoId === c.id ? 'Guardando…' : 'Completar'}</button>
                          )}
                          {(c.estado === 'EN_PROCESO' || c.estado === 'COMPLETADO') && (
                            <button
                              onClick={() => setConfirmDelete(`anular-${c.id}`)}
                              className="text-[10px] font-bold uppercase text-red-500 hover:text-red-700 whitespace-nowrap"
                            >Anular</button>
                          )}
                          {esAdmin && (
                            <button onClick={() => setConfirmDelete(c.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Fila de detalles físicos + métricas del corte ── */}
                    {expanded && (() => {
                      const metrosTotales = c.tendidas > 0 && c.mtsPorTendida > 0 ? c.tendidas * c.mtsPorTendida : null;
                      const prendasPorKg = c.kgUsados > 0 && c.totalPrendas > 0 ? c.totalPrendas / c.kgUsados : null;
                      const kgPorPrenda = c.totalPrendas > 0 && c.kgUsados > 0 ? c.kgUsados / c.totalPrendas : null;
                      const prendasPorMetro = metrosTotales && metrosTotales > 0 ? c.totalPrendas / metrosTotales : null;
                      const kgPorMetro = metrosTotales && metrosTotales > 0 ? c.kgUsados / metrosTotales : null;
                      const metrosPorRollo = c.rollosUsados > 0 && metrosTotales ? metrosTotales / c.rollosUsados : null;
                      const prendasPorRollo = c.rollosUsados > 0 && c.totalPrendas > 0 ? c.totalPrendas / c.rollosUsados : null;
                      const m2PorPrenda = metrosTotales && c.ancho > 0 && c.totalPrendas > 0
                        ? (metrosTotales * c.ancho) / c.totalPrendas : null;
                      return (
                        <tr className="border-t border-dashed border-gray-200 bg-[#FDFCF8]">
                          <td colSpan={totalColumnas} className="px-4 py-3 border-l-4 border-l-[#B66F35]/20">
                            <div className="flex flex-col gap-2.5">

                              {/* Fila 1: datos físicos base */}
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 w-full">Datos físicos</span>
                                {[
                                  { label: 'Rollos', val: c.rollosUsados },
                                  { label: 'Tendidas', val: c.tendidas },
                                  { label: 'Mts/tendida', val: c.mtsPorTendida > 0 ? c.mtsPorTendida : null },
                                  { label: 'Metros totales', val: metrosTotales ? metrosTotales.toFixed(1) + ' m' : null },
                                  { label: 'Ancho', val: c.ancho > 0 ? c.ancho + ' m' : null },
                                  { label: 'KG usados', val: c.kgUsados > 0 ? c.kgUsados.toFixed(2) + ' kg' : null },
                                ].map(({ label, val }) => val != null && (
                                  <div key={label} className="flex items-center gap-1">
                                    <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">{label}</span>
                                    <span className="font-mono font-bold text-gray-800 text-[12px]">{val}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Fila 2: métricas de rendimiento */}
                              <div className="flex flex-wrap items-stretch gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 w-full">Rendimiento de tela</span>
                                {[
                                  { label: 'Prendas / kg', val: prendasPorKg, fmt: (v: number) => v.toFixed(2), color: 'emerald', hint: 'prendas salen de 1 kg' },
                                  { label: 'Kg / prenda', val: kgPorPrenda, fmt: (v: number) => v.toFixed(4) + ' kg', color: 'emerald', hint: 'tela consume cada prenda' },
                                  { label: 'Prendas / metro', val: prendasPorMetro, fmt: (v: number) => v.toFixed(3), color: 'blue', hint: 'prendas por metro corrido' },
                                  { label: 'Kg / metro', val: kgPorMetro, fmt: (v: number) => v.toFixed(4) + ' kg', color: 'blue', hint: 'gramaje real del tejido' },
                                  { label: 'Metros / rollo', val: metrosPorRollo, fmt: (v: number) => v.toFixed(1) + ' m', color: 'violet', hint: 'longitud promedio por rollo' },
                                  { label: 'Prendas / rollo', val: prendasPorRollo, fmt: (v: number) => v.toFixed(1), color: 'violet', hint: 'producción por rollo' },
                                  { label: 'm² / prenda', val: m2PorPrenda, fmt: (v: number) => v.toFixed(4) + ' m²', color: 'amber', hint: 'área de tela por prenda' },
                                ].filter(m => m.val !== null).map(({ label, val, fmt, color, hint }) => {
                                  const colorMap2: Record<string, string> = {
                                    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
                                    blue: 'bg-blue-50 border-blue-200 text-blue-800',
                                    violet: 'bg-violet-50 border-violet-200 text-violet-800',
                                    amber: 'bg-amber-50 border-amber-200 text-amber-800',
                                  };
                                  const labelColor: Record<string, string> = {
                                    emerald: 'text-emerald-500',
                                    blue: 'text-blue-500',
                                    violet: 'text-violet-500',
                                    amber: 'text-amber-600',
                                  };
                                  return (
                                    <div key={label} className={`flex flex-col items-center justify-center px-3 py-1.5 rounded border min-w-[110px] ${colorMap2[color]}`}>
                                      <span className={`text-[9px] font-bold uppercase tracking-wider ${labelColor[color]}`}>{label}</span>
                                      <span className="font-mono font-black text-[14px] mt-0.5">{fmt(val!)}</span>
                                      <span className="text-[8px] text-gray-400 italic mt-0.5">{hint}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Fila 3: personal + estado */}
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-0.5 border-t border-gray-100">
                                {c.cortador && <div className="flex items-center gap-1"><span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Cortador</span><span className="text-gray-700 text-[11px]">{c.cortador}</span></div>}
                                {c.ayudante && <div className="flex items-center gap-1"><span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Ayudante</span><span className="text-gray-700 text-[11px]">{c.ayudante}</span></div>}
                                {c.tendedor && <div className="flex items-center gap-1"><span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Tendedor</span><span className="text-gray-700 text-[11px]">{c.tendedor}</span></div>}
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Revisión</span>
                                  <span className={`text-[10px] font-bold ${c.revision === 'VERIFICADO' ? 'text-green-600' : 'text-yellow-600'}`}>{c.revision}</span>
                                </div>
                                {c.traslado && <span className="text-[10px] font-bold text-blue-600">TRASLADO</span>}
                                {c.notas && <div className="flex items-center gap-1"><span className="text-[9px] uppercase tracking-wide text-gray-400 font-bold">Notas</span><span className="text-gray-600 italic text-[11px]">{c.notas}</span></div>}
                              </div>

                            </div>
                          </td>
                        </tr>
                      );
                    })()}

                    {/* ── Filas de colores (solo si expandido y tiene más de 1) ── */}
                    {expanded && tieneColores && filas.map((fila, fi) => {
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

                      // Para el desplegable: operaciones × tallas con operario y estado
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
                        <React.Fragment key={`${c.id}-det-${fi}`}>
                          <tr className="border-t border-gray-200/60 bg-amber-50/20">
                            {/* indent + chevron ops */}
                            <td className="py-1.5 border-l-4 border-l-[#B66F35]/30 pl-2" colSpan={1}>
                              {filasSegs.length > 0 && (
                                <button onClick={() => toggleOps(opsKey)} className="p-0.5 rounded hover:bg-amber-100 transition-colors">
                                  {opsExpanded
                                    ? <ChevronDown className="h-3 w-3 text-[#B66F35]" />
                                    : <ChevronRight className="h-3 w-3 text-gray-400" />}
                                </button>
                              )}
                            </td>
                            <td colSpan={3} />
                            <td className="px-3 py-1.5 whitespace-nowrap text-gray-600 border-r border-gray-100">
                              <span className="flex items-center gap-1 pl-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#B66F35]/50 flex-shrink-0" />
                                {colorMap.get(fila.colorId) ?? fila.colorId}
                                {fila.tonalidad && <span className="ml-1 text-[10px] font-mono text-gray-400">Tn-{fila.tonalidad}</span>}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono text-gray-600">{fila.cantS > 0 ? fila.cantS : <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-1.5 text-center font-mono text-gray-600">{fila.cantM > 0 ? fila.cantM : <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-1.5 text-center font-mono text-gray-600">{fila.cantL > 0 ? fila.cantL : <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-1.5 text-center font-mono text-gray-600">{fila.cantXL > 0 ? fila.cantXL : <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-gray-700">{fila.totalColor}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-gray-500">{fila.kgUsados > 0 ? fila.kgUsados.toFixed(1) : '—'}</td>
                            <td className="px-3 py-1.5">
                              {pctColor !== null ? (
                                <div className="flex flex-col gap-0.5 min-w-[110px]">
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                      <div className={`h-full transition-all ${pctColor === 100 ? 'bg-green-500' : pctColor >= 50 ? 'bg-blue-400' : 'bg-yellow-400'}`} style={{ width: `${pctColor}%` }} />
                                    </div>
                                    <span className={`text-[10px] font-bold font-mono tabular-nums ${pctColor === 100 ? 'text-green-600' : 'text-gray-600'}`}>{pctColor}%</span>
                                  </div>
                                  {opActual && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                                      <span className="text-[10px] font-bold text-blue-700">{opActual.op}</span>
                                      <span className="text-[9px] text-blue-400 font-mono">{opActual.pct}%</span>
                                    </div>
                                  )}
                                  {!opActual && fases.length > 0 && (
                                    <span className="text-[9px] text-green-600 font-bold mt-0.5">✓ Todas completas</span>
                                  )}
                                </div>
                              ) : <span className="text-[10px] text-gray-300 italic">Sin seguimiento</span>}
                            </td>
                            <td colSpan={5} />
                          </tr>

                          {/* ── Desplegable operaciones × tallas ── */}
                          {opsExpanded && opDetallesSorted.length > 0 && (
                            <tr className="bg-gray-50/80 border-t border-dashed border-gray-200">
                              <td colSpan={totalColumnas} className="px-0 py-0 border-l-4 border-l-[#B66F35]/10">
                                <div className="ml-10 mr-4 my-1.5">
                                  <table className="w-full text-[10px] border-collapse">
                                    <thead>
                                      <tr className="border-b border-gray-200">
                                        <th className="py-1 px-2 text-left text-[9px] uppercase tracking-wide text-gray-400 font-bold w-8">#</th>
                                        <th className="py-1 px-2 text-left text-[9px] uppercase tracking-wide text-gray-400 font-bold">Operación</th>
                                        {TALLAS.map(t => <th key={t} className="py-1 px-2 text-center text-[9px] uppercase tracking-wide text-gray-400 font-bold w-14">{t}</th>)}
                                        <th className="py-1 px-2 text-left text-[9px] uppercase tracking-wide text-gray-400 font-bold">Operario</th>
                                        <th className="py-1 px-2 text-center text-[9px] uppercase tracking-wide text-gray-400 font-bold w-16">Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {opDetallesSorted.map(([op, { orden, filas: opFilas }], oi) => {
                                        const tallaMap = new Map(opFilas.map(f => [f.talla, f]));
                                        const confirmadas = opFilas.filter(f => f.confirmado).map(f => f.talla);
                                        const todasConfirmadas = TALLAS.filter(t => tallaMap.has(t)).every(t => tallaMap.get(t)!.confirmado);
                                        const operarioNombre = opFilas[0]?.operario ?? '—';
                                        return (
                                          <tr key={op} className={`border-b border-gray-100 ${todasConfirmadas ? 'opacity-60' : ''}`}>
                                            <td className="py-1 px-2 font-mono text-gray-400">{orden}</td>
                                            <td className="py-1 px-2 font-bold text-gray-700">
                                              <span className="flex items-center gap-1">
                                                {!todasConfirmadas && opActual?.op === op && (
                                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                                                )}
                                                {todasConfirmadas && <span className="text-green-500 text-[9px]">✓</span>}
                                                {op}
                                              </span>
                                            </td>
                                            {TALLAS.map(t => {
                                              const sf = tallaMap.get(t);
                                              if (!sf) return <td key={t} className="py-1 px-2 text-center text-gray-200">—</td>;
                                              return (
                                                <td key={t} className="py-1 px-2 text-center">
                                                  <span className={`inline-flex items-center justify-center w-10 rounded text-[9px] font-mono font-bold py-0.5
                                                    ${sf.confirmado ? 'bg-green-100 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                                    {sf.cantidad}
                                                  </span>
                                                </td>
                                              );
                                            })}
                                            <td className="py-1 px-2 text-gray-600 whitespace-nowrap">{operarioNombre}</td>
                                            <td className="py-1 px-2 text-center">
                                              {todasConfirmadas
                                                ? <span className="text-[9px] font-bold text-green-600">Confirmado</span>
                                                : confirmadas.length > 0
                                                  ? <span className="text-[9px] text-yellow-600 font-bold">{confirmadas.join(', ')} ✓</span>
                                                  : <span className="text-[9px] text-gray-400">Pendiente</span>
                                              }
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td colSpan={10} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</td>
                <td className="px-3 py-2 font-mono text-right font-bold">{cortesFiltrados.reduce((s, c) => s + c.totalPrendas, 0)}</td>
                <td className="px-3 py-2 font-mono text-right font-bold">{cortesFiltrados.reduce((s, c) => s + c.kgUsados, 0).toFixed(1)}</td>
                <td className="px-3 py-2 font-mono text-right font-bold">
                  S/ {cortesFiltrados.reduce((s, c) => s + c.costoMoCorte, 0).toFixed(2)}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gray-300 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Corte</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <F label="N° Corte"><input type="text" placeholder="Ej: 100 ó 100A" value={form.nCorte} onChange={set('nCorte')} className="input-base" required /></F>
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
                  <select value={form.telaId} onChange={set('telaId')} className="input-base">
                    <option value="">— (opcional)</option>
                    {telas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Tendedor">
                  <select value={form.tendedor} onChange={set('tendedor')} className="input-base">
                    <option value="">Seleccionar…</option>
                    <option value="RIQUE">RIQUE</option>
                  </select>
                </F>
                <F label="Cortador">
                  <select value={form.cortador} onChange={set('cortador')} className="input-base">
                    <option value="">Seleccionar…</option>
                    <option value="YERSON">YERSON</option>
                    <option value="JOSE">JOSE</option>
                  </select>
                </F>
                <F label="Ayudante">
                  <select value={form.ayudante} onChange={set('ayudante')} className="input-base">
                    <option value="">Seleccionar…</option>
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
                                const updatedColores = f.colores.map((c, ci) => {
                                  const t2 = parseInt(c.tendidas) || 0;
                                  // Row 0 es la fuente de verdad de las props — no se sobreescribe desde el panel
                                  if (ci === 0) return c;
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
                        {form.colores.length > 1 && <th className="w-6" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        // Agrupar rollos por colorBase (todas las tonalidades del mismo color base comparten rollos)
                        const rollosSpan: number[] = form.colores.map((_, i) => {
                          const base = form.colores[i].colorBase;
                          if (!base) return 1;
                          if (i > 0 && form.colores[i - 1].colorBase === base) return 0;
                          let span = 1;
                          while (i + span < form.colores.length && form.colores[i + span].colorBase === base) span++;
                          return span;
                        });
                        return form.colores.map((det, idx) => {
                        const total = (parseInt(det.cantS)||0)+(parseInt(det.cantM)||0)+(parseInt(det.cantL)||0)+(parseInt(det.cantXL)||0);
                        const pc = det.colorId ? productoColores.find(x => x.productoId === form.productoId && x.colorId === det.colorId) : null;
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
                        // Si tendidas > 0: dividir; si no, usar las cantidades como proporción base (÷1)
                        const divisor = gT > 0 ? gT : 1;
                        const propsPorTendida = det.colorId ? {
                          propS: Math.round((parseInt(det.cantS)||0) / divisor),
                          propM: Math.round((parseInt(det.cantM)||0) / divisor),
                          propL: Math.round((parseInt(det.cantL)||0) / divisor),
                          propXL: Math.round((parseInt(det.cantXL)||0) / divisor),
                        } : null;
                        // Mostrar 💾 solo cuando hay cantidades reales y difieren de lo guardado en productoColores
                        const tieneCantidades = (parseInt(det.cantS)||0) + (parseInt(det.cantM)||0) + (parseInt(det.cantL)||0) + (parseInt(det.cantXL)||0) > 0;
                        const isDirty = det.colorId && tieneCantidades && propsPorTendida && (
                          propsPorTendida.propS !== (pc?.propS ?? 0) ||
                          propsPorTendida.propM !== (pc?.propM ?? 0) ||
                          propsPorTendida.propL !== (pc?.propL ?? 0) ||
                          propsPorTendida.propXL !== (pc?.propXL ?? 0)
                        );
                        const setDet = (field: keyof ColorDetalle) =>
                          (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                            setForm(f => {
                              const next = [...f.colores];
                              const updated = { ...next[idx], [field]: e.target.value };
                              next[idx] = updated;

                              // Si cambia tendidas: usar props de productoColores para esa tonalidad, o props globales como fallback
                              if (field === 'tendidas') {
                                const t = parseInt(e.target.value) || 0;
                                if (t > 0) {
                                  const colorId = next[idx].colorId;
                                  const pcRow = colorId ? productoColores.find(x => x.productoId === f.productoId && x.colorId === colorId) : null;
                                  const pS  = pcRow ? pcRow.propS  : (parseInt(f.propS)  || 0);
                                  const pM  = pcRow ? pcRow.propM  : (parseInt(f.propM)  || 0);
                                  const pL  = pcRow ? pcRow.propL  : (parseInt(f.propL)  || 0);
                                  const pXL = pcRow ? pcRow.propXL : (parseInt(f.propXL) || 0);
                                  if (pS + pM + pL + pXL > 0) {
                                    next[idx] = { ...next[idx], tendidas: e.target.value, cantS: String(pS * t), cantM: String(pM * t), cantL: String(pL * t), cantXL: String(pXL * t) };
                                  }
                                  // Si es el primer color, derivar props globales y propagar a los demás
                                  if (idx === 0) {
                                    const pS0  = pcRow ? pcRow.propS  : (parseInt(f.propS)  || 0);
                                    const pM0  = pcRow ? pcRow.propM  : (parseInt(f.propM)  || 0);
                                    const pL0  = pcRow ? pcRow.propL  : (parseInt(f.propL)  || 0);
                                    const pXL0 = pcRow ? pcRow.propXL : (parseInt(f.propXL) || 0);
                                    if (pS0 + pM0 + pL0 + pXL0 > 0) {
                                      for (let i = 1; i < next.length; i++) {
                                        const ti = parseInt(next[i].tendidas) || 0;
                                        if (ti > 0) {
                                          next[i] = { ...next[i], cantS: String(pS0 * ti), cantM: String(pM0 * ti), cantL: String(pL0 * ti), cantXL: String(pXL0 * ti) };
                                        }
                                      }
                                      return { ...f, colores: next, propS: String(pS0), propM: String(pM0), propL: String(pL0), propXL: String(pXL0) };
                                    }
                                  }
                                }
                              }

                              // Si es el primer color y cambia cantidades → actualizar props globales y propagar
                              if (idx === 0 && (field === 'cantS' || field === 'cantM' || field === 'cantL' || field === 'cantXL')) {
                                const t0 = parseInt(next[0].tendidas) || 0;
                                const cS  = field === 'cantS'  ? (parseInt(e.target.value) || 0) : (parseInt(next[0].cantS)  || 0);
                                const cM  = field === 'cantM'  ? (parseInt(e.target.value) || 0) : (parseInt(next[0].cantM)  || 0);
                                const cL  = field === 'cantL'  ? (parseInt(e.target.value) || 0) : (parseInt(next[0].cantL)  || 0);
                                const cXL = field === 'cantXL' ? (parseInt(e.target.value) || 0) : (parseInt(next[0].cantXL) || 0);
                                if (t0 > 0) {
                                  const pS  = Math.round(cS  / t0);
                                  const pM  = Math.round(cM  / t0);
                                  const pL  = Math.round(cL  / t0);
                                  const pXL = Math.round(cXL / t0);
                                  for (let i = 1; i < next.length; i++) {
                                    const ti = parseInt(next[i].tendidas) || 0;
                                    if (ti > 0 && (pS + pM + pL + pXL) > 0) {
                                      next[i] = { ...next[i], cantS: String(pS * ti), cantM: String(pM * ti), cantL: String(pL * ti), cantXL: String(pXL * ti) };
                                    }
                                  }
                                  return { ...f, colores: next, propS: String(pS), propM: String(pM), propL: String(pL), propXL: String(pXL) };
                                }
                              }

                              return { ...f, colores: next };
                            });
                          };
                        return (
                          <React.Fragment key={idx}>
                            <tr className="hover:bg-gray-50 border-t border-gray-200">
                              {form.colores.length > 1 && (
                                <td className="px-2 py-1 text-[10px] font-mono font-bold text-gray-400 text-center align-middle">
                                  {String.fromCharCode(65 + idx)}
                                </td>
                              )}
                              {/* Dropdown 1: nombre base del color */}
                              <td className="px-2 py-1 min-w-[110px] w-28">
                                <select
                                  value={det.colorBase}
                                  onChange={e => {
                                    const base = e.target.value;
                                    const opciones = coloresAgrupados.get(base) ?? [];
                                    const unica = opciones.length === 1 ? opciones[0] : null;
                                    const newColorId = unica ? unica.id : '';
                                    const newTon = unica?.tonalidad ?? '';
                                    setForm(f => {
                                      const next = [...f.colores];
                                      const t = parseInt(next[idx].tendidas) || 0;
                                      const pcGuardado = newColorId ? productoColores.find(x => x.productoId === f.productoId && x.colorId === newColorId) : null;
                                      const pS  = pcGuardado ? pcGuardado.propS  : (parseInt(f.propS)  || 0);
                                      const pM  = pcGuardado ? pcGuardado.propM  : (parseInt(f.propM)  || 0);
                                      const pL  = pcGuardado ? pcGuardado.propL  : (parseInt(f.propL)  || 0);
                                      const pXL = pcGuardado ? pcGuardado.propXL : (parseInt(f.propXL) || 0);
                                      const cantidades = (pS + pM + pL + pXL) > 0 ? {
                                        cantS:  String(t > 0 ? pS  * t : pS),
                                        cantM:  String(t > 0 ? pM  * t : pM),
                                        cantL:  String(t > 0 ? pL  * t : pL),
                                        cantXL: String(t > 0 ? pXL * t : pXL),
                                      } : {};
                                      next[idx] = { ...next[idx], colorBase: base, tonalidad: newTon, colorId: newColorId, ...cantidades };
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
                              {/* Dropdown 2: tonalidad */}
                              <td className="px-2 py-1 min-w-[80px] w-20">
                                {(() => {
                                  const opciones = coloresAgrupados.get(det.colorBase) ?? [];
                                  const conTonalidad = opciones.filter(o => o.tonalidad !== null);
                                  return (
                                    <div className="flex items-center gap-1">
                                      {(!det.colorBase || conTonalidad.length === 0) ? (
                                        <span className="text-xs text-gray-400 px-1 flex-1">—</span>
                                      ) : (
                                        <select
                                          value={det.tonalidad}
                                          onChange={e => {
                                            const ton = e.target.value;
                                            const opcion = conTonalidad.find(o => o.tonalidad === ton);
                                            const colorId = opcion?.id ?? '';
                                            setForm(f => {
                                              const next = [...f.colores];
                                              const t = parseInt(next[idx].tendidas) || 0;
                                              // Si ya hay props guardadas para esta tonalidad, usarlas; si no, usar props globales
                                              const pcGuardado = colorId ? productoColores.find(x => x.productoId === f.productoId && x.colorId === colorId) : null;
                                              const pS  = pcGuardado ? pcGuardado.propS  : (parseInt(f.propS)  || 0);
                                              const pM  = pcGuardado ? pcGuardado.propM  : (parseInt(f.propM)  || 0);
                                              const pL  = pcGuardado ? pcGuardado.propL  : (parseInt(f.propL)  || 0);
                                              const pXL = pcGuardado ? pcGuardado.propXL : (parseInt(f.propXL) || 0);
                                              const cantidades = (pS + pM + pL + pXL) > 0 ? {
                                                cantS:  String(t > 0 ? pS  * t : pS),
                                                cantM:  String(t > 0 ? pM  * t : pM),
                                                cantL:  String(t > 0 ? pL  * t : pL),
                                                cantXL: String(t > 0 ? pXL * t : pXL),
                                              } : {};
                                              next[idx] = { ...next[idx], tonalidad: ton, colorId, ...cantidades };
                                              return { ...f, colores: next };
                                            });
                                          }}
                                          className="input-base text-xs py-1 flex-1 min-w-0"
                                          required={idx === 0}
                                        >
                                          <option value="">Ton…</option>
                                          {conTonalidad.map(o => (
                                            <option key={o.id} value={o.tonalidad!}>{o.tonalidad}</option>
                                          ))}
                                        </select>
                                      )}
                                      {det.colorBase && (
                                        <button
                                          type="button"
                                          onClick={() => setTonModal({ idx, colorBase: det.colorBase })}
                                          className="text-[10px] font-bold text-blue-600 hover:text-white hover:bg-blue-500 border border-blue-300 hover:border-blue-500 w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                                          title={`Agregar nueva tonalidad de "${det.colorBase}"`}
                                        >+</button>
                                      )}
                                    </div>
                                  );
                                })()}
                                {/* Mini-modal tonalidad */}
                                {tonModal?.idx === idx && (() => {
                                  const variantes = colores.filter(c => {
                                    const m = c.nombre.match(/^(.+?)\s+(\d+)$/);
                                    return m && m[1].toLowerCase() === tonModal.colorBase.toLowerCase();
                                  });
                                  const maxTon = variantes.reduce((max, c) => {
                                    const m = c.nombre.match(/(\d+)$/);
                                    return m ? Math.max(max, parseInt(m[1])) : max;
                                  }, 0);
                                  const nuevaNum = maxTon + 1;
                                  const nuevoNombre = `${tonModal.colorBase} ${nuevaNum}`;
                                  const baseColor = colores.find(c => c.nombre.toLowerCase() === tonModal.colorBase.toLowerCase()) ?? variantes[0];
                                  const tieneProducto = !!form.productoId;
                                  return (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTonModal(null)}>
                                      <div className="bg-white shadow-2xl p-6 w-80 border border-gray-200" onClick={e => e.stopPropagation()}>
                                        <p className="text-sm font-black uppercase tracking-widest text-gray-800 mb-1">Nueva tonalidad</p>
                                        <p className="text-xs text-gray-500 mb-4">
                                          Se creará <strong className="text-blue-600">"{capWords(nuevoNombre)}"</strong> con la misma categoría que la base.
                                        </p>
                                        {tieneProducto && (
                                          <div className="mb-4">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">Props para esta tonalidad</p>
                                            <div className="grid grid-cols-4 gap-2">
                                              {(['S','M','L','XL'] as const).map(t => (
                                                <div key={t} className="flex flex-col items-center gap-1">
                                                  <label className="text-[10px] font-bold text-gray-400 uppercase">{t}</label>
                                                  <input
                                                    type="number" min={0} step={1}
                                                    value={tonProps[`prop${t}` as keyof typeof tonProps]}
                                                    onChange={e => setTonProps(p => ({ ...p, [`prop${t}`]: e.target.value }))}
                                                    className="input-base text-xs py-1 text-center w-full"
                                                    placeholder="0"
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1">Dejar en 0 para usar los props del producto</p>
                                          </div>
                                        )}
                                        <div className="flex gap-2 justify-end">
                                          <button type="button" onClick={() => { setTonModal(null); setTonProps({ propS: '', propM: '', propL: '', propXL: '' }); }} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 hover:bg-gray-50">
                                            Cancelar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const colorId = newId();
                                              const pS  = parseInt(tonProps.propS)  || 0;
                                              const pM  = parseInt(tonProps.propM)  || 0;
                                              const pL  = parseInt(tonProps.propL)  || 0;
                                              const pXL = parseInt(tonProps.propXL) || 0;
                                              const pcData = (tieneProducto && (pS > 0 || pM > 0 || pL > 0 || pXL > 0))
                                                ? { id: newId(), productoId: form.productoId, propS: pS, propM: pM, propL: pL, propXL: pXL }
                                                : null;
                                              addColorConProductoColor(
                                                { id: colorId, nombre: nuevoNombre, categoria: baseColor?.categoria ?? 'OSCURO', prioridad: baseColor?.prioridad ?? 99, notas: '' },
                                                pcData
                                              );
                                              addToast(`Color "${capWords(nuevoNombre)}" creado — selecciónalo en el dropdown`, 'success');
                                              setTonModal(null);
                                              setTonProps({ propS: '', propM: '', propL: '', propXL: '' });
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                                          >
                                            Crear Ton. {nuevaNum}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
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
                              <td className="px-1 py-1 w-6 text-center">
                                {isDirty && (
                                  <button
                                    type="button"
                                    title="Guardar proporciones de esta tonalidad en catálogo"
                                    onClick={() => {
                                      if (!propsPorTendida || !det.colorId) return;
                                      if (pc) {
                                        updateProductoColor(pc.id, propsPorTendida);
                                      } else {
                                        addProductoColor({ id: newId(), productoId: form.productoId, colorId: det.colorId, ...propsPorTendida });
                                      }
                                      addToast(`Props tonalidad guardados (${det.colorBase || det.colorId})`, 'success');
                                    }}
                                    className="p-0.5 rounded bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white transition-colors"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                              <td className="px-2 py-1 text-right font-mono font-bold text-gray-700 whitespace-nowrap">{total}</td>
                              {form.colores.length > 1 && (
                                <td className="px-2 py-1 align-middle">
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
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Corte</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar eliminar corte */}
      {confirmDelete && !confirmDelete.startsWith('anular-') && (
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
      {confirmDelete?.startsWith('anular-') && (() => {
        const id = confirmDelete.replace('anular-', '');
        const corte = cortes.find(x => x.id === id);
        return (
          <ConfirmModal
            mensaje={`¿Anular corte ${corte?.nCorte ?? ''}?`}
            detalle={corte?.estado === 'COMPLETADO' ? 'Se revertirá el descuento de inventario.' : 'El corte pasará a estado ANULADO.'}
            labelConfirmar="Anular"
            onConfirmar={() => {
              if (corte) anularCorte(corte);
              setConfirmDelete(null);
            }}
            onCancelar={() => setConfirmDelete(null)}
          />
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
