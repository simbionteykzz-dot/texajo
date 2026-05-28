import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { SeguimientoFila, SeguimientoAsignacion } from '../types';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';

const uid = () => crypto.randomUUID();

export function ProduccionConfeccion() {
  const { seguimientoFilas, cortes, productos, colores, operarios, tarifasOperaciones, addSeguimientoFila, updateSeguimientoFila } = useAppContext();
  const { addToast } = useToast();
  const [expandedCorte, setExpandedCorte] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCorteId, setFilterCorteId] = useState('');

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
    cortes.filter(c => c.estado !== 'ANULADO' && (!filterCorteId || c.id === filterCorteId))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [cortes, filterCorteId]);

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
    updateSeguimientoFila(filaId, { asignaciones, totalPago, pctAvance });
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
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Seguimiento Confección</h2>
          <p className="text-xs text-gray-500 mt-1">Asignación de operarios por operación y talla</p>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="flex gap-3">
        <select value={filterCorteId} onChange={e => setFilterCorteId(e.target.value)} className="input-base text-xs w-48">
          <option value="">Todos los cortes</option>
          {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
            <option key={c.id} value={c.id}>{c.nCorte}</option>
          ))}
        </select>
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
    </div>
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
