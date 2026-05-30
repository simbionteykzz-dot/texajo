import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, ChevronDown, ChevronRight, FileText, Trash2 } from 'lucide-react';
import { SeguimientoFila, SeguimientoAsignacion } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';

const uid = () => crypto.randomUUID();

export function ProduccionConfeccion() {
  const {
    seguimientoFilas, cortes, productos, colores, operarios, tarifasOperaciones,
    boletaLineas,
    addSeguimientoFila, updateSeguimientoFila, deleteSeguimientoFila,
    addBoletaLinea, updateBoletaLinea,
  } = useAppContext();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'seguimiento' | 'porProducto'>('seguimiento');
  const [expandedCorte, setExpandedCorte] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCorteId, setFilterCorteId] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filtroProductoId, setFiltroProductoId] = useState('');

  const [form, setForm] = useState({
    corteId: '', talla: 'M' as 'S' | 'M' | 'L' | 'XL',
    cantidad: '', fecha: new Date().toISOString().slice(0, 10),
  });

  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c.nombre])), [colores]);
  const operarioMap = useMemo(() => new Map(operarios.map(o => [o.id, o])), [operarios]);
  const corteMap = useMemo(() => new Map(cortes.map(c => [c.id, c])), [cortes]);

  const tarifasDelCorte = (corteId: string) => {
    const corte = corteMap.get(corteId);
    if (!corte) return [];
    return tarifasOperaciones.filter(t => t.productoId === corte.productoId).sort((a, b) => a.orden - b.orden);
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
    if (!corte || !form.cantidad) {
      addToast('Selecciona corte y cantidad', 'error');
      return;
    }
    const tarifas = tarifasDelCorte(form.corteId);
    const asignaciones: SeguimientoAsignacion[] = tarifas.map(t => ({
      tarifaId: t.id, operacion: t.operacion, orden: t.orden, operarioId: '', pago: 0,
    }));

    const fila: SeguimientoFila = {
      id: uid(),
      corteId: form.corteId,
      nCorte: corte.nCorte,
      productoId: corte.productoId,
      fecha: form.fecha,
      colorId: corte.colorId,
      talla: form.talla,
      cantidad: parseInt(form.cantidad),
      asignaciones,
      pctAvance: 0,
      estado: 'PENDIENTE',
      totalPago: 0,
    };
    addSeguimientoFila(fila);
    addToast('Fila de seguimiento creada', 'success');
    setShowForm(false);
    setForm({ corteId: '', talla: 'M', cantidad: '', fecha: new Date().toISOString().slice(0, 10) });
  };

  const handleAsignarOperario = (filaId: string, tarifaId: string, operarioId: string) => {
    const fila = seguimientoFilas.find(f => f.id === filaId);
    if (!fila) return;
    const tarifa = tarifasOperaciones.find(t => t.id === tarifaId);
    const pago = operarioId && tarifa ? fila.cantidad * tarifa.tarifa : 0;
    const asignaciones = fila.asignaciones.map(a =>
      a.tarifaId === tarifaId ? { ...a, operarioId, pago } : a
    );
    const totalPago = asignaciones.reduce((s, a) => s + a.pago, 0);
    const assignedCount = asignaciones.filter(a => a.operarioId).length;
    const pctAvance = asignaciones.length > 0 ? Math.round((assignedCount / asignaciones.length) * 100) : 0;
    const estado = pctAvance === 100 ? 'LISTO' : fila.estado;
    updateSeguimientoFila(filaId, { asignaciones, totalPago, pctAvance, estado });

    // Auto-generar BoletaLinea si se asigna operario
    if (operarioId && tarifa) {
      const periodo = fila.fecha.slice(0, 7);
      const existente = boletaLineas.find(
        b => b.operarioId === operarioId && b.corteId === fila.corteId &&
             b.tarifaId === tarifaId && b.periodo === periodo
      );
      if (existente) {
        updateBoletaLinea(existente.id, {
          cantPrendas: fila.cantidad,
          importe: fila.cantidad * tarifa.tarifa,
          estadoPago: 'PENDIENTE',
        });
      } else {
        addBoletaLinea({
          id: uid(),
          operarioId,
          corteId: fila.corteId,
          nCorte: fila.nCorte,
          productoId: fila.productoId,
          tarifaId,
          operacion: tarifa.operacion,
          orden: tarifa.orden,
          tarifa: tarifa.tarifa,
          cantPrendas: fila.cantidad,
          importe: fila.cantidad * tarifa.tarifa,
          periodo,
          estadoPago: 'PENDIENTE',
        });
      }
    }
  };

  const buildRows = () => seguimientoFilas.map((f) => {
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

            return (
              <div key={corte.id} className="bg-white border border-gray-200">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                  onClick={() => setExpandedCorte(isOpen ? null : corte.id)}
                >
                  <div className="flex items-center gap-4">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-black text-sm">{corte.nCorte}</span>
                    <span className="text-xs text-gray-500">{productoMap.get(corte.productoId)?.nombre}</span>
                    <span className="text-xs text-gray-400">{colorMap.get(corte.colorId)}</span>
                    <span className="text-xs text-gray-400">{corte.totalPrendas} prendas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{filas.length} filas</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-200">
                        <div className="h-full bg-black" style={{ width: `${avgAvance}%` }} />
                      </div>
                      <span className="text-xs font-bold">{avgAvance}%</span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200 overflow-x-auto">
                    {filas.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400 italic">Sin filas creadas para este corte.</p>
                    ) : (
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Talla</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Cantidad</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Avance</th>
                            {tarifasDelCorte(corte.id).map(t => (
                              <th key={t.id} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">
                                {t.orden}. {t.operacion}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Pago</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filas.sort((a, b) => a.talla.localeCompare(b.talla)).map(fila => (
                            <tr key={fila.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-bold">{fila.talla}</td>
                              <td className="px-3 py-2 font-mono text-right">{fila.cantidad}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-gray-200">
                                    <div className="h-full bg-black" style={{ width: `${fila.pctAvance}%` }} />
                                  </div>
                                  <span className="text-[10px]">{fila.pctAvance}%</span>
                                </div>
                              </td>
                              {tarifasDelCorte(corte.id).map(t => {
                                const asig = fila.asignaciones.find(a => a.tarifaId === t.id);
                                return (
                                  <td key={t.id} className="px-3 py-2">
                                    <select
                                      value={asig?.operarioId ?? ''}
                                      onChange={e => handleAsignarOperario(fila.id, t.id, e.target.value)}
                                      className="text-[10px] border border-gray-200 bg-white px-1 py-0.5 w-32"
                                    >
                                      <option value="">—</option>
                                      {operarios.filter(o => o.estado === 'ACTIVO').map(o => (
                                        <option key={o.id} value={o.id}>{o.codigo}</option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 font-mono text-right font-bold">S/ {fila.totalPago.toFixed(2)}</td>
                              <td className="px-3 py-2">
                                {confirmDelete === fila.id ? (
                                  <span className="flex items-center gap-1 whitespace-nowrap">
                                    <button onClick={() => { deleteSeguimientoFila(fila.id); setConfirmDelete(null); addToast('Fila eliminada', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                                    <span className="text-gray-300">/</span>
                                    <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                                  </span>
                                ) : (
                                  <button onClick={() => setConfirmDelete(fila.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
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
                  <option key={p.id} value={p.id}>{p.nombre}</option>
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

      {/* Modal nueva fila */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gray-300 w-full max-w-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest">Nueva Fila de Seguimiento</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAddFila} className="p-6 space-y-4">
              <F label="Corte">
                <select value={form.corteId} onChange={e => setForm(f => ({ ...f, corteId: e.target.value }))} className="input-base" required>
                  <option value="">Seleccionar…</option>
                  {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
                    <option key={c.id} value={c.id}>{c.nCorte} — {productoMap.get(c.productoId)?.nombre}</option>
                  ))}
                </select>
              </F>
              <div className="grid grid-cols-2 gap-4">
                <F label="Talla">
                  <select value={form.talla} onChange={e => setForm(f => ({ ...f, talla: e.target.value as 'S'|'M'|'L'|'XL' }))} className="input-base">
                    {['S', 'M', 'L', 'XL'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </F>
                <F label="Cantidad">
                  <input type="number" min={1} value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} className="input-base" required />
                </F>
              </div>
              <F label="Fecha">
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className="input-base" />
              </F>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Crear</button>
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
