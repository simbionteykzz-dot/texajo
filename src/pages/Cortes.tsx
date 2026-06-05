import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, CheckCircle, Clock, XCircle, FileText, Trash2 } from 'lucide-react';
import { Corte, SeguimientoAsignacion, SeguimientoFila, MovimientoTela } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';

const uid = () => crypto.randomUUID();

interface ColorDetalle {
  colorId: string;
  colorBase: string;
  colorTonal: string;
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
  cortador: string; ayudante: string;
  mtsPorTendida: string; ancho: string;
  colores: ColorDetalle[];
  traslado: boolean; notas: string;
}

const emptyColorDetalle = (): ColorDetalle => ({
  colorId: '', colorBase: '', colorTonal: '',
  kgUsados: '', rollosUsados: '',
  tendidas: '', propS: '', propM: '', propL: '', propXL: '',
  cantS: '0', cantM: '0', cantL: '0', cantXL: '0',
});

const emptyForm = (): CorteForm => ({
  nCorte: '', fecha: new Date().toISOString().slice(0, 10),
  clienteId: '', productoId: '', telaId: '',
  cortador: '', ayudante: '',
  mtsPorTendida: '', ancho: '',
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
    movimientosTela, seguimientoFilas, boletaLineas, productoColores,
    addCorte, updateCorte, deleteCorte,
    deleteSeguimientoFila, deleteBoletaLinea,
    addMovimientoTela, addSeguimientoFila,
  } = useAppContext();

  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [form, setForm] = useState<CorteForm>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [mostrarTodosProductos, setMostrarTodosProductos] = useState(true);

  const capWords = (s: string) =>
    s.replace(/(^|\s)(\S)/g, (_, sp, ch) => sp + ch.toUpperCase());

  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);
  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c.nombre])), [colores]);
  const telaMap = useMemo(() => new Map(telas.map(t => [t.id, t])), [telas]);

  const colorGroups = useMemo(() => {
    type Group = { baseId: string; baseName: string; variants: { id: string; tonal: string }[] };
    const byName = new Map<string, Group>();

    for (const c of colores) {
      const numSuffix = c.nombre.match(/\s+(\d+)$/);
      const baseName = numSuffix ? c.nombre.slice(0, -numSuffix[0].length).trim() : c.nombre.trim();
      const tonal = numSuffix ? numSuffix[1] : 'Base';

      if (!byName.has(baseName)) {
        byName.set(baseName, { baseId: c.id, baseName, variants: [] });
      }
      const grp = byName.get(baseName)!;

      if (!numSuffix) {
        // Sin sufijo numérico → es una "Base". Si ya hay otra Base en el grupo, no duplicar.
        const alreadyHasBase = grp.variants.some(v => v.tonal === 'Base');
        if (alreadyHasBase) continue;
        grp.baseId = c.id;
      }
      grp.variants.push({ id: c.id, tonal });
    }

    for (const g of byName.values()) {
      g.variants.sort((a, b) => {
        if (a.tonal === 'Base') return -1;
        if (b.tonal === 'Base') return 1;
        return parseInt(a.tonal) - parseInt(b.tonal);
      });
    }
    return Array.from(byName.values()).sort((a, b) => a.baseName.localeCompare(b.baseName));
  }, [colores]);

  // Stock actual de telas: suma/resta deltas de todos los movimientos (no depende de stockRollosDespues)
  const stockActualTelas = useMemo(() => {
    const POSITIVOS = ['INGRESO', 'DE_REPROCESO', 'AJUSTE_POS'];
    const NEGATIVOS = ['A_CORTE', 'A_REPROCESO', 'MUESTRA', 'AJUSTE_NEG'];
    const map = new Map<string, number>();
    for (const m of movimientosTela) {
      const key = `${m.telaId}|${m.colorId}`;
      const prev = map.get(key) ?? 0;
      const delta = POSITIVOS.includes(m.tipo) ? m.rollos : NEGATIVOS.includes(m.tipo) ? -m.rollos : 0;
      map.set(key, prev + delta);
    }
    return map;
  }, [movimientosTela]);

  useEffect(() => {
    if (!form.productoId) return;
    const prod = productoMap.get(form.productoId);
    if (!prod) return;
    setForm(f => {
      const partial: Partial<CorteForm> = {};
      if (prod.telaId && !f.telaId) partial.telaId = prod.telaId;
      const pS = prod.propS ?? 0, pM = prod.propM ?? 0, pL = prod.propL ?? 0, pXL = prod.propXL ?? 0;
      const hasProps = pS > 0 || pM > 0 || pL > 0 || pXL > 0;
      const updatedColores = hasProps
        ? f.colores.map(c => {
            if (c.propS || c.propM || c.propL || c.propXL) return c;
            const t = parseInt(c.tendidas) || 0;
            return {
              ...c,
              propS: String(pS), propM: String(pM), propL: String(pL), propXL: String(pXL),
              ...(t > 0 ? { cantS: String(pS * t), cantM: String(pM * t), cantL: String(pL * t), cantXL: String(pXL * t) } : {}),
            };
          })
        : f.colores;
      return { ...f, ...partial, colores: updatedColores };
    });
  }, [form.productoId, productoMap]);


  const cortesFiltrados = useMemo(() =>
    [...cortes]
      .filter(c => (!filterEstado || c.estado === filterEstado) && (!filterCliente || c.clienteId === filterCliente))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [cortes, filterEstado, filterCliente]);

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
    const tallasMap: Array<{ talla: 'S' | 'M' | 'L' | 'XL'; cantidad: number }> = [
      { talla: 'S', cantidad: corte.cantS },
      { talla: 'M', cantidad: corte.cantM },
      { talla: 'L', cantidad: corte.cantL },
      { talla: 'XL', cantidad: corte.cantXL },
    ];
    for (const { talla, cantidad } of tallasMap) {
      if (cantidad <= 0) continue;
      const yaExiste = seguimientoFilas.some(f => f.corteId === corte.id && f.talla === talla);
      if (yaExiste) continue;
      const asignaciones: SeguimientoAsignacion[] = tarifas.map(t => ({
        tarifaId: t.id, operacion: t.operacion, orden: t.orden, operarioId: '', pago: 0,
      }));
      const fila: SeguimientoFila = {
        id: uid(),
        corteId: corte.id,
        nCorte: corte.nCorte,
        productoId: corte.productoId,
        fecha: corte.fecha,
        colorId: corte.colorId,
        talla,
        cantidad,
        asignaciones,
        pctAvance: 0,
        estado: 'PENDIENTE',
        totalPago: 0,
      };
      addSeguimientoFila(fila);
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
        id: uid(),
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

  // Descuenta inventario automáticamente al completar un corte
  const descontarInventario = (corte: Corte): boolean => {
    if (!corte.telaId || !corte.colorId) return true;
    const colorId = normalizeColorId(corte.colorId);
    const telaId = normalizeTelaId(corte.telaId);
    // Si se normalizaron, persistir los IDs correctos en el corte
    if (colorId !== corte.colorId || telaId !== corte.telaId) {
      updateCorte(corte.id, { colorId, telaId });
    }
    const key = `${telaId}|${colorId}`;
    const stockAntes = stockActualTelas.get(key) ?? 0;
    const rollos = corte.rollosUsados || 0;
    const stockDespues = stockAntes - rollos;
    if (stockDespues < 0) {
      addToast(`Stock insuficiente: se necesitan ${rollos} rollos pero hay ${stockAntes} disponibles`, 'error');
      return false;
    }
    const kgTotal = corte.kgUsados || 0;
    const color = colores.find(c => c.id === colorId);
    const mov: MovimientoTela = {
      id: uid(),
      fecha: corte.fecha,
      tipo: 'A_CORTE',
      clienteId: corte.clienteId,
      telaId,
      colorId,
      rollos,
      kgTotal,
      categoriaColor: color?.categoria ?? 'OSCURO',
      precioKg: 0,
      totalSoles: 0,
      stockRollosAntes: stockAntes,
      stockRollosDespues: stockDespues,
      responsable: corte.cortador,
      corteId: corte.id,
      nCorte: corte.nCorte,
      notas: `Auto-descuento por corte ${corte.nCorte}`,
    };
    addMovimientoTela(mov);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const coloresValidos = form.colores.filter(c => c.colorId !== '');
    if (!form.nCorte || !form.clienteId || !form.productoId || coloresValidos.length === 0) {
      addToast('Completa nCorte, cliente, producto y al menos un color', 'error');
      return;
    }


    coloresValidos.forEach((det, idx) => {
      const sufijo = coloresValidos.length > 1 ? `-${String.fromCharCode(65 + idx)}` : '';
      const cantS = parseInt(det.cantS) || 0;
      const cantM = parseInt(det.cantM) || 0;
      const cantL = parseInt(det.cantL) || 0;
      const cantXL = parseInt(det.cantXL) || 0;
      const totalPrendas = cantS + cantM + cantL + cantXL;
      const kgUsados = parseFloat(det.kgUsados) || 0;
      const rollosUsados = parseFloat(det.rollosUsados) || 0;
      const corte: Corte = {
        id: uid(),
        nCorte: form.nCorte + sufijo,
        fecha: form.fecha,
        clienteId: form.clienteId,
        productoId: form.productoId,
        colorId: det.colorId,
        telaId: form.telaId || undefined,
        cortador: form.cortador,
        ayudante: form.ayudante,
        kgUsados,
        rollosUsados,
        tendidas: parseInt(det.tendidas) || 0,
        mtsPorTendida: parseFloat(form.mtsPorTendida) || 0,
        ancho: parseFloat(form.ancho) || 0,
        cantS, cantM, cantL, cantXL,
        totalPrendas,
        consumo: totalPrendas > 0 ? kgUsados / totalPrendas : 0,
        rendimiento: rollosUsados > 0 ? totalPrendas / rollosUsados : 0,
        revision: 'PENDIENTE',
        traslado: form.traslado,
        estado: 'EN_PROCESO',
        pagoCliente: 'PENDIENTE',
        pagoPlanilla: 'PENDIENTE',
        costoMoCorte: calcCostoMo(form.productoId, totalPrendas),
        notas: form.notas,
      };
      addCorte(corte);
    });

    const msg = coloresValidos.length > 1
      ? `${coloresValidos.length} cortes registrados (${form.nCorte}-A … ${form.nCorte}-${String.fromCharCode(64 + coloresValidos.length)})`
      : `Corte ${form.nCorte} registrado`;
    addToast(msg, 'success');
    setShowForm(false);
    setForm(emptyForm());
  };

  const buildRows = () => cortesFiltrados.map((c) => ({
    NCorte: c.nCorte,
    Fecha: c.fecha,
    Cliente: clienteMap.get(c.clienteId) ?? c.clienteId,
    Producto: productoMap.get(c.productoId)?.nombre ?? c.productoId,
    Color: colorMap.get(c.colorId) ?? c.colorId,
    Prendas: c.totalPrendas,
    KgUsados: c.kgUsados,
    CostoMO: c.costoMoCorte?.toFixed(2) ?? '0.00',
    Estado: c.estado,
    PagoCliente: c.pagoCliente,
    PagoPlanilla: c.pagoPlanilla,
  }));

  const exportarCortes = () => {
    exportRowsToXlsx(buildRows(), `cortes_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Cortes');
    addToast('Excel exportado', 'success');
  };

  const exportarCortesPdf = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    exportTableToPdf({
      title: 'Cortes',
      subtitle: `Registro de órdenes al ${fecha}`,
      fileName: `cortes_${fecha}`,
      columns: [
        { header: 'N° Corte', dataKey: 'NCorte' },
        { header: 'Fecha', dataKey: 'Fecha' },
        { header: 'Cliente', dataKey: 'Cliente' },
        { header: 'Producto', dataKey: 'Producto' },
        { header: 'Color', dataKey: 'Color' },
        { header: 'Prendas', dataKey: 'Prendas' },
        { header: 'Kg', dataKey: 'KgUsados' },
        { header: 'Costo MO', dataKey: 'CostoMO' },
        { header: 'Estado', dataKey: 'Estado' },
        { header: 'Pago Cliente', dataKey: 'PagoCliente' },
        { header: 'Pago Planilla', dataKey: 'PagoPlanilla' },
      ],
      rows: buildRows(),
      rightCols: ['KgUsados', 'CostoMO'],
      centerCols: ['Prendas', 'Estado', 'PagoCliente', 'PagoPlanilla'],
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
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['N° Corte', 'Fecha', 'Cliente', 'Producto', 'Color', 'Prendas', 'Kg', 'Rollos', 'Costo MO', 'Estado', 'Pago Cli.', 'Planilla', 'Acciones'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cortesFiltrados.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono font-bold">{c.nCorte}</td>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">{c.fecha}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{clienteMap.get(c.clienteId) ?? c.clienteId}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{productoMap.get(c.productoId)?.nombre ?? c.productoId}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{colorMap.get(c.colorId) ?? c.colorId}</td>
                  <td className="px-3 py-2 font-mono text-right">{c.totalPrendas}</td>
                  <td className="px-3 py-2 font-mono text-right">{c.kgUsados.toFixed(1)}</td>
                  <td className="px-3 py-2 font-mono text-right">
                    {c.telaId && c.rollosUsados === 0
                      ? <span className="text-orange-500 font-bold" title="Sin rollos — no descontará inventario">0 ⚠</span>
                      : c.rollosUsados || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-right text-xs">
                    {c.costoMoCorte > 0 ? `S/ ${c.costoMoCorte.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1">
                      {ESTADO_ICON[c.estado]}
                      <span className="text-[10px] font-bold uppercase">{c.estado.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={c.pagoCliente}
                      onChange={e => updateCorte(c.id, { pagoCliente: e.target.value as 'PENDIENTE' | 'COBRADO' })}
                      className={`text-[10px] font-bold uppercase border-0 bg-transparent cursor-pointer ${c.pagoCliente === 'COBRADO' ? 'text-green-700' : 'text-yellow-700'}`}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="COBRADO">Cobrado</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={c.pagoPlanilla}
                      onChange={e => updateCorte(c.id, { pagoPlanilla: e.target.value as 'PENDIENTE' | 'PAGADO' })}
                      className={`text-[10px] font-bold uppercase border-0 bg-transparent cursor-pointer ${c.pagoPlanilla === 'PAGADO' ? 'text-green-700' : 'text-yellow-700'}`}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="PAGADO">Pagado</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {c.estado === 'EN_PROCESO' && (
                        <button
                          onClick={() => {
                            const totalPrendas = (c.cantS ?? 0) + (c.cantM ?? 0) + (c.cantL ?? 0) + (c.cantXL ?? 0);
                            if (totalPrendas === 0) {
                              addToast('El corte no tiene prendas registradas', 'error');
                              return;
                            }
                            const ok = descontarInventario(c);
                            if (!ok) return;
                            updateCorte(c.id, { estado: 'COMPLETADO' });
                            crearFilasSeguimiento(c);
                            addToast(`Corte ${c.nCorte} completado — inventario descontado y seguimiento creado`, 'success');
                          }}
                          className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800"
                        >Completar</button>
                      )}
                      {(c.estado === 'EN_PROCESO' || c.estado === 'COMPLETADO') && (
                        <button
                          onClick={() => {
                            if (!window.confirm(`¿Anular corte ${c.nCorte}? ${c.estado === 'COMPLETADO' ? 'Se revertirá el descuento de inventario.' : ''}`)) return;
                            anularCorte(c);
                          }}
                          className="text-[10px] font-bold uppercase text-red-500 hover:text-red-700"
                        >Anular</button>
                      )}
                      {confirmDelete === c.id ? (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <button onClick={() => {
                            seguimientoFilas.filter(f => f.corteId === c.id).forEach(f => deleteSeguimientoFila(f.id));
                            boletaLineas.filter(b => b.corteId === c.id).forEach(b => deleteBoletaLinea(b.id));
                            deleteCorte(c.id);
                            setConfirmDelete(null);
                            addToast('Corte eliminado', 'success');
                          }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                          <span className="text-gray-300">/</span>
                          <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDelete(c.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50">
                <td colSpan={8} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</td>
                <td className="px-3 py-2 font-mono text-right text-xs font-bold">
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
                <F label="N° Corte"><input type="text" value={form.nCorte} onChange={set('nCorte')} className="input-base" required /></F>
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
              <div className="grid grid-cols-2 gap-4">
                <F label="Cortador">
                  <select value={form.cortador} onChange={set('cortador')} className="input-base">
                    <option value="">Seleccionar…</option>
                    {[...operarios]
                      .filter(o => o.estado === 'ACTIVO')
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
                  </select>
                </F>
                <F label="Ayudante">
                  <select value={form.ayudante} onChange={set('ayudante')} className="input-base">
                    <option value="">Seleccionar…</option>
                    {[...operarios]
                      .filter(o => o.estado === 'ACTIVO')
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Mts por Tendida"><input type="number" min={0} step={0.1} value={form.mtsPorTendida} onChange={set('mtsPorTendida')} className="input-base" /></F>
                <F label="Ancho (m)"><input type="number" min={0} step={0.01} value={form.ancho} onChange={set('ancho')} className="input-base" /></F>
              </div>

              {/* Tabla colores × cantidades */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Colores y Cantidades
                    {form.colores.filter(c => c.colorId).length > 1 && (
                      <span className="ml-2 text-[#C4612A]">— un corte por cada color</span>
                    )}
                  </label>
                  <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => {
                      const prod = productoMap.get(f.productoId);
                      return { ...f, colores: [...f.colores, {
                        ...emptyColorDetalle(),
                        propS: String(prod?.propS ?? ''),
                        propM: String(prod?.propM ?? ''),
                        propL: String(prod?.propL ?? ''),
                        propXL: String(prod?.propXL ?? ''),
                      }] };
                    })}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#C4612A] hover:text-[#a04e22] flex items-center gap-1 px-2 py-0.5 rounded border border-orange-300 bg-orange-50 hover:bg-orange-100"
                  >
                    <Plus className="h-3 w-3" /> + Color con Props
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
                        <th className="px-2 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-left min-w-[120px] w-32">Color</th>
                        <th className="px-2 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-left min-w-[90px] w-24">Tonalidad</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-right w-16">Kg</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-right w-16">Rollos</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-center w-16">Tendidas</th>
                        <th className="px-2 py-1.5 text-[10px] font-bold uppercase text-blue-400 text-center w-14">PropS</th>
                        <th className="px-2 py-1.5 text-[10px] font-bold uppercase text-blue-400 text-center w-14">PropM</th>
                        <th className="px-2 py-1.5 text-[10px] font-bold uppercase text-blue-400 text-center w-14">PropL</th>
                        <th className="px-2 py-1.5 text-[10px] font-bold uppercase text-blue-400 text-center w-14">PropXL</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-center w-16">S</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-center w-16">M</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-center w-16">L</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-center w-16">XL</th>
                        <th className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500 text-right w-16">Total</th>
                        {form.colores.length > 1 && <th className="w-6" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.colores.map((det, idx) => {
                        const total = (parseInt(det.cantS)||0)+(parseInt(det.cantM)||0)+(parseInt(det.cantL)||0)+(parseInt(det.cantXL)||0);
                        const setDet = (field: keyof ColorDetalle, recalc = false) =>
                          (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                            setForm(f => {
                              const next = [...f.colores];
                              const updated = { ...next[idx], [field]: e.target.value };
                              // Autocalcula cantidades cuando cambia tendidas o proporciones
                              if (recalc || field === 'tendidas' || field === 'propS' || field === 'propM' || field === 'propL' || field === 'propXL') {
                                const t = parseInt(field === 'tendidas' ? e.target.value : updated.tendidas) || 0;
                                const pS = parseInt(field === 'propS' ? e.target.value : updated.propS) || 0;
                                const pM = parseInt(field === 'propM' ? e.target.value : updated.propM) || 0;
                                const pL = parseInt(field === 'propL' ? e.target.value : updated.propL) || 0;
                                const pXL = parseInt(field === 'propXL' ? e.target.value : updated.propXL) || 0;
                                if (t > 0 && (pS + pM + pL + pXL) > 0) {
                                  updated.cantS = String(pS * t);
                                  updated.cantM = String(pM * t);
                                  updated.cantL = String(pL * t);
                                  updated.cantXL = String(pXL * t);
                                }
                              }
                              next[idx] = updated;
                              return { ...f, colores: next };
                            });
                          };
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            {form.colores.length > 1 && (
                              <td className="px-2 py-1 text-[10px] font-mono font-bold text-gray-400 text-center">
                                {String.fromCharCode(65 + idx)}
                              </td>
                            )}
                            <td className="px-2 py-1 min-w-[120px] w-32">
                              <select
                                value={det.colorBase}
                                onChange={async e => {
                                  const base = e.target.value;
                                  const group = colorGroups.find(g => g.baseId === base);
                                  const singleVariant = group?.variants.length === 1 ? group.variants[0] : null;
                                  const colorId = singleVariant?.id ?? '';
                                  setForm(f => {
                                    const next = [...f.colores];
                                    next[idx] = {
                                      ...next[idx],
                                      colorBase: base,
                                      colorTonal: singleVariant ? singleVariant.tonal : '',
                                      colorId,
                                    };
                                    return { ...f, colores: next };
                                  });
                                  if (!colorId || !form.productoId) return;
                                  const pcLocal = productoColores.find(x => x.productoId === form.productoId && x.colorId === colorId);
                                  const prodProps = productoMap.get(form.productoId);
                                  const src = pcLocal ?? (prodProps ? { propS: prodProps.propS ?? 0, propM: prodProps.propM ?? 0, propL: prodProps.propL ?? 0, propXL: prodProps.propXL ?? 0 } : null);
                                  if (src) {
                                    setForm(f => {
                                      const next = [...f.colores];
                                      const t = parseInt(next[idx].tendidas) || 0;
                                      next[idx] = {
                                        ...next[idx],
                                        propS: String(src.propS), propM: String(src.propM),
                                        propL: String(src.propL), propXL: String(src.propXL),
                                        ...(t > 0 ? {
                                          cantS: String(src.propS * t), cantM: String(src.propM * t),
                                          cantL: String(src.propL * t), cantXL: String(src.propXL * t),
                                        } : {}),
                                      };
                                      return { ...f, colores: next };
                                    });
                                  }
                                }}
                                className="input-base text-xs py-1 w-full"
                                required={idx === 0}
                              >
                                <option value="">Seleccionar…</option>
                                {(form.productoId && !det.todosColores && productoColores.some(pc => pc.productoId === form.productoId)
                                  ? colorGroups.filter(g => g.variants.some(v => productoColores.some(pc => pc.productoId === form.productoId && pc.colorId === v.id)))
                                  : colorGroups
                                ).map(g => <option key={g.baseId} value={g.baseId}>{capWords(g.baseName)}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1 min-w-[90px] w-24">
                              {(() => {
                                const group = colorGroups.find(g => g.baseId === det.colorBase);
                                const variants = group?.variants ?? [];
                                if (!det.colorBase) return <span className="text-[10px] text-gray-300 italic">—</span>;
                                if (variants.length === 1) return <span className="text-[10px] text-gray-500 font-mono">Base</span>;
                                return (
                                  <select
                                    value={det.colorTonal}
                                    onChange={async e => {
                                      const tonal = e.target.value;
                                      const variant = variants.find(v => v.tonal === tonal);
                                      const colorId = variant?.id ?? '';
                                      setForm(f => {
                                        const next = [...f.colores];
                                        next[idx] = { ...next[idx], colorTonal: tonal, colorId };
                                        return { ...f, colores: next };
                                      });
                                      if (!form.productoId || !colorId) return;
                                      const pcLocal = productoColores.find(x => x.productoId === form.productoId && x.colorId === colorId);
                                      const prodProps = productoMap.get(form.productoId);
                                      const src = pcLocal ?? (prodProps ? { propS: prodProps.propS ?? 0, propM: prodProps.propM ?? 0, propL: prodProps.propL ?? 0, propXL: prodProps.propXL ?? 0 } : null);
                                      if (src) {
                                        setForm(f => {
                                          const next = [...f.colores];
                                          const t = parseInt(next[idx].tendidas) || 0;
                                          next[idx] = {
                                            ...next[idx],
                                            propS: String(src.propS), propM: String(src.propM),
                                            propL: String(src.propL), propXL: String(src.propXL),
                                            ...(t > 0 ? {
                                              cantS: String(src.propS * t), cantM: String(src.propM * t),
                                              cantL: String(src.propL * t), cantXL: String(src.propXL * t),
                                            } : {}),
                                          };
                                          return { ...f, colores: next };
                                        });
                                      }
                                    }}
                                    className="input-base text-xs py-1 w-full"
                                    required={idx === 0}
                                  >
                                    <option value="">—</option>
                                    {variants.map(v => (
                                      <option key={v.id} value={v.tonal}>{v.tonal === 'Base' ? 'Base' : `Tn-${v.tonal}`}</option>
                                    ))}
                                  </select>
                                );
                              })()}
                            </td>
                            <td className="px-2 py-1">
                              <input type="number" min={0} step={0.1} value={det.kgUsados} onChange={setDet('kgUsados')} className="input-base text-xs py-1 text-right w-full min-w-[52px]" placeholder="0" />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="number" min={0} step={0.5}
                                value={det.rollosUsados}
                                onChange={setDet('rollosUsados')}
                                className={`input-base text-xs py-1 text-right w-full min-w-[52px] ${form.telaId && !parseFloat(det.rollosUsados) ? 'border-orange-400 bg-orange-50' : ''}`}
                                placeholder={form.telaId ? 'Requerido' : '0'}
                                required={!!form.telaId}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input type="number" min={0} value={det.tendidas} onChange={setDet('tendidas')} className="input-base text-xs py-1 text-center w-full min-w-[52px]" placeholder="0" />
                            </td>
                            {(['propS','propM','propL','propXL'] as const).map(field => (
                              <td key={field} className="px-1 py-1">
                                <input type="number" min={0} value={det[field]} onChange={setDet(field)} className="input-base text-xs py-1 text-center w-full min-w-[44px] bg-blue-50 border-blue-200" placeholder="0" />
                              </td>
                            ))}
                            {(['cantS','cantM','cantL','cantXL'] as const).map(f => (
                              <td key={f} className="px-2 py-1">
                                <input type="number" min={0} value={det[f]} onChange={setDet(f)} className="input-base text-xs py-1 text-center w-full min-w-[48px]" />
                              </td>
                            ))}
                            <td className="px-2 py-1 text-right font-mono font-bold text-gray-700 whitespace-nowrap">{total}</td>
                            {form.colores.length > 1 && (
                              <td className="px-2 py-1">
                                <button type="button" onClick={() => setForm(f => ({ ...f, colores: f.colores.filter((_, i) => i !== idx) }))} className="text-gray-300 hover:text-red-500">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50">
                      <tr>
                        {form.colores.length > 1 && <td />}
                        <td className="px-2 py-1 text-[10px] font-bold uppercase text-gray-500">Total</td>
                        <td className="px-2 py-1 text-right font-mono font-black text-gray-800">
                          {form.colores.reduce((s, d) => s + (parseFloat(d.kgUsados)||0), 0).toFixed(1)}
                        </td>
                        <td className="px-2 py-1 text-right font-mono font-black text-gray-800">
                          {form.colores.reduce((s, d) => s + (parseFloat(d.rollosUsados)||0), 0).toFixed(1)}
                        </td>
                        {/* tendidas y proporciones: sin suma */}
                        <td colSpan={5} />
                        {(['cantS','cantM','cantL','cantXL'] as const).map(f => (
                          <td key={f} className="px-2 py-1 text-center font-mono font-black text-gray-800">
                            {form.colores.reduce((s, d) => s + (parseInt(d[f])||0), 0)}
                          </td>
                        ))}
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
                      const rendimientoActual = rollosU > 0 ? totalP / rollosU : 0;
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
