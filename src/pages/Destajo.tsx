import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, FileText, Receipt } from 'lucide-react';
import { BoletaLinea } from '../types';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';
import { BoletaOperario } from '../components/BoletaOperario';

const uid = () => crypto.randomUUID();

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
    boletaLineas, operarios, cortes, productos, tarifasOperaciones,
    addBoletaLinea, addBoletaLineas, updateBoletaLinea,
  } = useAppContext();
  const { addToast } = useToast();

  const [selectedOperario, setSelectedOperario] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState(PERIODOS[0]);
  const [showForm, setShowForm] = useState(false);
  const [bulkCorteId, setBulkCorteId] = useState('');
  const [showBoleta, setShowBoleta] = useState(false);

  // Líneas del modal multi-fila
  type DraftLinea = { id: string; corteId: string; tarifaId: string; cantPrendas: string };
  const [draftLineas, setDraftLineas] = useState<DraftLinea[]>([{ id: uid(), corteId: '', tarifaId: '', cantPrendas: '' }]);

  const addDraftRow = () => setDraftLineas(prev => [...prev, { id: uid(), corteId: '', tarifaId: '', cantPrendas: '' }]);
  const removeDraftRow = (id: string) => setDraftLineas(prev => prev.filter(r => r.id !== id));
  const updateDraftRow = (id: string, patch: Partial<DraftLinea>) =>
    setDraftLineas(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const operarioMap = useMemo(() => new Map(operarios.map(o => [o.id, o])), [operarios]);
  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const corteMap = useMemo(() => new Map(cortes.map(c => [c.id, c])), [cortes]);

  const tarifasPorCorte = useMemo(() => {
    const map = new Map<string, typeof tarifasOperaciones>();
    cortes.forEach(c => {
      map.set(c.id, tarifasOperaciones.filter(t => t.productoId === c.productoId).sort((a, b) => a.orden - b.orden));
    });
    return map;
  }, [cortes, tarifasOperaciones]);

  const lineasFiltradas = useMemo(() =>
    boletaLineas
      .filter(b => b.operarioId === selectedOperario && b.periodo === selectedPeriodo)
      .sort((a, b) => a.nCorte.localeCompare(b.nCorte) || a.orden - b.orden),
    [boletaLineas, selectedOperario, selectedPeriodo]);

  const totalBruto = lineasFiltradas.reduce((s, b) => s + b.importe, 0);
  const descuento1pct = totalBruto * 0.01;
  const totalNeto = totalBruto - descuento1pct;

  const pendientes = lineasFiltradas.filter(b => b.estadoPago === 'PENDIENTE');
  const pagadas = lineasFiltradas.filter(b => b.estadoPago === 'PAGADO');

  const handleAddLineas = (e: React.FormEvent) => {
    e.preventDefault();
    const validas = draftLineas.filter(r => r.corteId && r.tarifaId && r.cantPrendas);
    if (validas.length === 0) {
      addToast('Completa al menos una línea con corte, operación y cantidad', 'error');
      return;
    }
    const nuevas: BoletaLinea[] = [];
    for (const r of validas) {
      const tarifa = tarifasOperaciones.find(t => t.id === r.tarifaId);
      const corte = corteMap.get(r.corteId);
      if (!tarifa || !corte) continue;
      const cant = parseInt(r.cantPrendas) || 0;
      nuevas.push({
        id: uid(),
        operarioId: selectedOperario,
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
        estadoPago: 'PENDIENTE',
      });
    }
    addBoletaLineas(nuevas);
    addToast(`${nuevas.length} línea${nuevas.length !== 1 ? 's' : ''} agregada${nuevas.length !== 1 ? 's' : ''}`, 'success');
    setShowForm(false);
    setDraftLineas([{ id: uid(), corteId: '', tarifaId: '', cantPrendas: '' }]);
  };

  const handleBulkAdd = () => {
    if (!selectedOperario || !bulkCorteId) {
      addToast('Selecciona operario y corte', 'error');
      return;
    }
    const corte = corteMap.get(bulkCorteId);
    if (!corte) return;
    const tarifas = tarifasOperaciones.filter(t => t.productoId === corte.productoId).sort((a, b) => a.orden - b.orden);
    if (tarifas.length === 0) {
      addToast('No hay tarifas para ese producto', 'error');
      return;
    }
    const lineas: BoletaLinea[] = tarifas.map(t => ({
      id: uid(),
      operarioId: selectedOperario,
      corteId: bulkCorteId,
      nCorte: corte.nCorte,
      productoId: corte.productoId,
      tarifaId: t.id,
      operacion: t.operacion,
      orden: t.orden,
      tarifa: t.tarifa,
      cantPrendas: 0,
      importe: 0,
      periodo: selectedPeriodo,
      estadoPago: 'PENDIENTE',
    }));
    addBoletaLineas(lineas);
    addToast(`${lineas.length} operaciones cargadas`, 'success');
    setBulkCorteId('');
  };

  const handleMarcarPagado = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    pendientes.forEach(b => updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: hoy }));
    addToast('Boleta marcada como pagada', 'success');
  };

  const buildDestajoRows = () => lineasFiltradas.map((b) => ({
    NCorte: b.nCorte,
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Destajo</h2>
        <p className="text-xs text-gray-500 mt-1">Pago por destajo — prendas × tarifa, descuento 1%</p>
      </div>

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
          <select value={selectedPeriodo} onChange={e => setSelectedPeriodo(e.target.value)} className="input-base w-36">
            {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {selectedOperario && (
          <div className="flex items-end gap-2">
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-xs">
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
            <select value={bulkCorteId} onChange={e => setBulkCorteId(e.target.value)} className="input-base w-48">
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
                    {['N° Corte', 'Operación', 'Tarifa', 'Prendas', 'Importe', 'Estado', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineasFiltradas.map(b => (
                    <tr key={b.id} className={`hover:bg-gray-50 ${b.estadoPago === 'PAGADO' ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2 font-mono">{b.nCorte}</td>
                      <td className="px-3 py-2">{b.operacion}</td>
                      <td className="px-3 py-2 font-mono text-right">S/ {b.tarifa.toFixed(3)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0}
                          value={b.cantPrendas}
                          onChange={e => updateBoletaLinea(b.id, {
                            cantPrendas: parseInt(e.target.value) || 0,
                            importe: (parseInt(e.target.value) || 0) * b.tarifa,
                          })}
                          className="w-20 input-base text-right text-xs py-0.5"
                          disabled={b.estadoPago === 'PAGADO'}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-right font-bold">S/ {b.importe.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold uppercase ${b.estadoPago === 'PAGADO' ? 'text-green-700' : 'text-yellow-700'}`}>
                          {b.estadoPago}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {b.estadoPago === 'PENDIENTE' && (
                          <button
                            onClick={() => updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: new Date().toISOString().slice(0, 10) })}
                            className="text-[10px] text-green-600 hover:text-green-800 font-bold uppercase"
                          >Pagar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lineasFiltradas.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="bg-white border border-gray-200 p-4 w-64 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase">Bruto</span>
                  <span className="font-mono">S/ {totalBruto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-red-700">
                  <span className="font-bold uppercase">Descuento 1%</span>
                  <span className="font-mono">- S/ {descuento1pct.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-2">
                  <span className="uppercase">Neto a Pagar</span>
                  <span className="font-mono">S/ {totalNeto.toFixed(2)}</span>
                </div>
                {pagadas.length > 0 && (
                  <p className="text-[10px] text-gray-500 pt-1">
                    {pagadas.length} líneas pagadas de {lineasFiltradas.length}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Boleta operario */}
      {showBoleta && selectedOperario && (() => {
        const operario = operarioMap.get(selectedOperario);
        return operario ? <BoletaOperario operario={operario} periodo={selectedPeriodo} onClose={() => setShowBoleta(false)} /> : null;
      })()}

      {/* Modal agregar múltiples líneas */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white border border-gray-300 w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Agregar Líneas</h3>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest">
                  {operarioMap.get(selectedOperario)?.nombre} — {selectedPeriodo}
                </p>
              </div>
              <button onClick={() => { setShowForm(false); setDraftLineas([{ id: uid(), corteId: '', tarifaId: '', cantPrendas: '' }]); }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddLineas} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {/* Cabecera */}
                <div className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 px-1">
                  {['Corte', 'Operación', 'Prendas', ''].map(h => (
                    <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</span>
                  ))}
                </div>

                {draftLineas.map((row, idx) => {
                  const tarifasRow = row.corteId ? (tarifasPorCorte.get(row.corteId) ?? []) : [];
                  return (
                    <div key={row.id} className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 items-center">
                      {/* Corte */}
                      <select
                        value={row.corteId}
                        onChange={e => updateDraftRow(row.id, { corteId: e.target.value, tarifaId: '' })}
                        className="input-base text-xs"
                      >
                        <option value="">Seleccionar…</option>
                        {cortes.filter(c => c.estado !== 'ANULADO').map(c => (
                          <option key={c.id} value={c.id}>{c.nCorte} — {productoMap.get(c.productoId)?.nombre}</option>
                        ))}
                      </select>

                      {/* Operación */}
                      <select
                        value={row.tarifaId}
                        onChange={e => updateDraftRow(row.id, { tarifaId: e.target.value })}
                        className="input-base text-xs"
                        disabled={!row.corteId}
                      >
                        <option value="">Seleccionar…</option>
                        {tarifasRow.map(t => (
                          <option key={t.id} value={t.id}>{t.orden}. {t.operacion} — S/{t.tarifa.toFixed(3)}</option>
                        ))}
                      </select>

                      {/* Cantidad */}
                      <input
                        type="number" min={0}
                        value={row.cantPrendas}
                        onChange={e => updateDraftRow(row.id, { cantPrendas: e.target.value })}
                        placeholder="0"
                        className="input-base text-xs text-right"
                      />

                      {/* Quitar fila */}
                      <button
                        type="button"
                        onClick={() => draftLineas.length > 1 ? removeDraftRow(row.id) : null}
                        className="flex items-center justify-center text-gray-300 hover:text-red-500 disabled:opacity-20"
                        disabled={draftLineas.length === 1}
                        tabIndex={-1}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addDraftRow}
                  className="mt-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#173A25] hover:text-[#B66F35] transition-colors"
                >
                  <Plus className="h-3 w-3" /> Agregar otra línea
                </button>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setDraftLineas([{ id: uid(), corteId: '', tarifaId: '', cantPrendas: '' }]); }}
                  className="btn-secondary"
                >Cancelar</button>
                <button type="submit" className="btn-primary">
                  Guardar {draftLineas.filter(r => r.corteId && r.tarifaId && r.cantPrendas).length > 0
                    ? `(${draftLineas.filter(r => r.corteId && r.tarifaId && r.cantPrendas).length} línea${draftLineas.filter(r => r.corteId && r.tarifaId && r.cantPrendas).length !== 1 ? 's' : ''})`
                    : ''}
                </button>
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
