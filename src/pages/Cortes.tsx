import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, CheckCircle, Clock, XCircle, FileText, Trash2 } from 'lucide-react';
import { Corte, SeguimientoAsignacion, SeguimientoFila, MovimientoTela } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';

const uid = () => crypto.randomUUID();

interface CorteForm {
  nCorte: string; fecha: string; clienteId: string; productoId: string; colorIds: string[];
  telaId: string;
  cortador: string; ayudante: string; kgUsados: string; rollosUsados: string;
  tendidas: string; mtsPorTendida: string; ancho: string;
  cantS: string; cantM: string; cantL: string; cantXL: string;
  traslado: boolean; notas: string;
}

const emptyForm = (): CorteForm => ({
  nCorte: '', fecha: new Date().toISOString().slice(0, 10),
  clienteId: '', productoId: '', colorIds: [''], telaId: '',
  cortador: '', ayudante: '', kgUsados: '', rollosUsados: '',
  tendidas: '', mtsPorTendida: '', ancho: '',
  cantS: '0', cantM: '0', cantL: '0', cantXL: '0',
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
    movimientosTela, seguimientoFilas,
    addCorte, updateCorte, deleteCorte,
    addMovimientoTela, addSeguimientoFila,
  } = useAppContext();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [form, setForm] = useState<CorteForm>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);
  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c.nombre])), [colores]);
  const telaMap = useMemo(() => new Map(telas.map(t => [t.id, t])), [telas]);

  // Stock actual de telas para el movimiento A_CORTE
  const stockActualTelas = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of [...movimientosTela].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      map.set(`${m.telaId}|${m.colorId}`, m.stockRollosDespues);
    }
    return map;
  }, [movimientosTela]);

  useEffect(() => {
    if (!form.productoId) return;
    const prod = productoMap.get(form.productoId);
    if (!prod?.telaBase) return;
    const telaMatch = telas.find(t => t.nombre.toLowerCase() === prod.telaBase!.toLowerCase());
    if (telaMatch && !form.telaId) {
      setForm(f => ({ ...f, telaId: telaMatch.id }));
    }
  }, [form.productoId, form.telaId, productoMap, telas]);

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

  // Descuenta inventario automáticamente al completar un corte
  const descontarInventario = (corte: Corte): boolean => {
    if (!corte.telaId || !corte.colorId) return true;
    const key = `${corte.telaId}|${corte.colorId}`;
    const stockAntes = stockActualTelas.get(key) ?? 0;
    const rollos = corte.rollosUsados || 0;
    const stockDespues = stockAntes - rollos;
    if (stockDespues < 0) {
      addToast(`Stock insuficiente: se necesitan ${rollos} rollos pero hay ${stockAntes} disponibles`, 'error');
      return false;
    }
    const kgTotal = corte.kgUsados || 0;
    const color = colores.find(c => c.id === corte.colorId);
    const mov: MovimientoTela = {
      id: uid(),
      fecha: corte.fecha,
      tipo: 'A_CORTE',
      clienteId: corte.clienteId,
      telaId: corte.telaId,
      colorId: corte.colorId,
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
    const cantS = parseInt(form.cantS) || 0;
    const cantM = parseInt(form.cantM) || 0;
    const cantL = parseInt(form.cantL) || 0;
    const cantXL = parseInt(form.cantXL) || 0;
    const totalPrendas = cantS + cantM + cantL + cantXL;
    const kgUsados = parseFloat(form.kgUsados) || 0;
    const rollosUsados = parseFloat(form.rollosUsados) || 0;

    const coloresValidos = form.colorIds.filter(c => c !== '');
    if (!form.nCorte || !form.clienteId || !form.productoId || coloresValidos.length === 0) {
      addToast('Completa nCorte, cliente, producto y al menos un color', 'error');
      return;
    }

    coloresValidos.forEach((colorId, idx) => {
      const sufijo = coloresValidos.length > 1 ? `-${String.fromCharCode(65 + idx)}` : '';
      const corte: Corte = {
        id: uid(),
        nCorte: form.nCorte + sufijo,
        fecha: form.fecha,
        clienteId: form.clienteId,
        productoId: form.productoId,
        colorId,
        telaId: form.telaId || undefined,
        cortador: form.cortador,
        ayudante: form.ayudante,
        kgUsados,
        rollosUsados,
        tendidas: parseInt(form.tendidas) || 0,
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
                {['N° Corte', 'Fecha', 'Cliente', 'Producto', 'Color', 'Prendas', 'Kg', 'Costo MO', 'Estado', 'Pago Cli.', 'Planilla', 'Acciones'].map(h => (
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
                      {confirmDelete === c.id ? (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <button onClick={() => { deleteCorte(c.id); setConfirmDelete(null); addToast('Corte eliminado', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
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
                <td colSpan={7} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</td>
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
          <div className="bg-white border border-gray-300 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Producto">
                  <select value={form.productoId} onChange={set('productoId')} className="input-base" required>
                    <option value="">Seleccionar…</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </F>
                <F label="Tela">
                  <select value={form.telaId} onChange={set('telaId')} className="input-base">
                    <option value="">— (opcional)</option>
                    {telas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </F>
              </div>
              {/* Colores: lista dinámica */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Colores{form.colorIds.filter(c => c).length > 1 && <span className="ml-2 text-[#C4612A]">— se creará un corte por cada color</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, colorIds: [...f.colorIds, ''] }))}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#C4612A] hover:text-[#a04e22] flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Agregar color
                  </button>
                </div>
                <div className="space-y-2">
                  {form.colorIds.map((cid, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {form.colorIds.length > 1 && (
                        <span className="text-[10px] font-mono font-bold text-gray-400 w-5 shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                      )}
                      <select
                        value={cid}
                        onChange={e => setForm(f => {
                          const next = [...f.colorIds];
                          next[idx] = e.target.value;
                          return { ...f, colorIds: next };
                        })}
                        className="input-base flex-1"
                        required={idx === 0}
                      >
                        <option value="">Seleccionar…</option>
                        {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                      {form.colorIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, colorIds: f.colorIds.filter((_, i) => i !== idx) }))}
                          className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Cortador">
                  <select value={form.cortador} onChange={set('cortador')} className="input-base">
                    <option value="">Seleccionar…</option>
                    {[...operarios]
                      .filter(o => o.estado === 'ACTIVO' && (o.nombre === 'Yerson' || o.nombre === 'Jose'))
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
                  </select>
                </F>
                <F label="Ayudante">
                  <select value={form.ayudante} onChange={set('ayudante')} className="input-base">
                    <option value="">Seleccionar…</option>
                    {[...operarios]
                      .filter(o => o.estado === 'ACTIVO' && (o.nombre === 'Yerson' || o.nombre === 'Jose'))
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Kg Usados"><input type="number" min={0} step={0.1} value={form.kgUsados} onChange={set('kgUsados')} className="input-base" /></F>
                <F label="Rollos Usados"><input type="number" min={0} step={0.5} value={form.rollosUsados} onChange={set('rollosUsados')} className="input-base" /></F>
                <F label="Tendidas"><input type="number" min={0} value={form.tendidas} onChange={set('tendidas')} className="input-base" /></F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Mts por Tendida"><input type="number" min={0} step={0.1} value={form.mtsPorTendida} onChange={set('mtsPorTendida')} className="input-base" /></F>
                <F label="Ancho (m)"><input type="number" min={0} step={0.01} value={form.ancho} onChange={set('ancho')} className="input-base" /></F>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Cantidades por Talla</label>
                <div className="grid grid-cols-4 gap-3">
                  {(['cantS', 'cantM', 'cantL', 'cantXL'] as const).map(field => (
                    <F key={field} label={field.replace('cant', '')}>
                      <input type="number" min={0} value={form[field]} onChange={set(field)} className="input-base" />
                    </F>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total: <strong>{(parseInt(form.cantS)||0) + (parseInt(form.cantM)||0) + (parseInt(form.cantL)||0) + (parseInt(form.cantXL)||0)}</strong> prendas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="traslado" checked={form.traslado} onChange={e => setForm(f => ({ ...f, traslado: e.target.checked }))} className="h-4 w-4" />
                <label htmlFor="traslado" className="text-[10px] font-bold uppercase tracking-widest">Traslado</label>
              </div>
              <F label="Notas"><textarea value={form.notas} onChange={set('notas')} rows={2} className="input-base" /></F>
              {(() => {
                const kgU = parseFloat(form.kgUsados) || 0;
                const rollosU = parseFloat(form.rollosUsados) || 0;
                const totalP = (parseInt(form.cantS)||0)+(parseInt(form.cantM)||0)+(parseInt(form.cantL)||0)+(parseInt(form.cantXL)||0);
                const consumoActual = totalP > 0 ? kgU / totalP : 0;
                const rendimientoActual = rollosU > 0 ? totalP / rollosU : 0;
                const prodSeleccionado = productoMap.get(form.productoId);
                return (
                  <>
                    {prodSeleccionado?.limiteConsumo && consumoActual > 0 && consumoActual > prodSeleccionado.limiteConsumo && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 text-[11px] font-bold">
                        ⚠ Consumo {consumoActual.toFixed(3)} kg/prenda supera el límite de {prodSeleccionado.limiteConsumo} kg/prenda
                      </div>
                    )}
                    {prodSeleccionado?.limiteRendimiento && rendimientoActual > 0 && rendimientoActual < prodSeleccionado.limiteRendimiento && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 text-[11px] font-bold">
                        ⚠ Rendimiento {rendimientoActual.toFixed(1)} prendas/rollo está por debajo del mínimo de {prodSeleccionado.limiteRendimiento}
                      </div>
                    )}
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
