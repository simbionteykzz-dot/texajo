import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, FileText, Receipt, Users, BarChart2 } from 'lucide-react';
import { BoletaLinea, TipoDescuentoBoleta } from '../types';
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
    addBoletaLinea, addBoletaLineas, updateBoletaLinea, deleteBoletaLinea,
    descuentosBoleta, addDescuentoBoleta, deleteDescuentoBoleta,
  } = useAppContext();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'boleta' | 'resumen' | 'general'>('boleta');

  // ── Tab: Mi Boleta ──
  const [selectedOperario, setSelectedOperario] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState(PERIODOS[0]);
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

  // ── Tab: Vista General ──
  const [gOperarioId, setGOperarioId] = useState('');
  const [gOperacion, setGOperacion] = useState('');
  const [gPeriodo, setGPeriodo] = useState('');
  const [gEstado, setGEstado] = useState<'' | 'PENDIENTE' | 'PAGADO'>('');

  // Modal multi-operario: cada sección tiene su propio array de líneas draft
  type DraftLinea = { id: string; corteId: string; tarifaId: string; cantPrendas: string };
  type DraftSeccion = { operarioId: string; lineas: DraftLinea[] };

  const emptyLinea = (): DraftLinea => ({ id: uid(), corteId: '', tarifaId: '', cantPrendas: '' });
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

  // Vista general: todas las líneas con filtros opcionales
  const todasOperaciones = useMemo(() => {
    const ops = new Set<string>();
    boletaLineas.forEach(b => ops.add(b.operacion));
    return Array.from(ops).sort();
  }, [boletaLineas]);

  const lineasGenerales = useMemo(() => {
    return boletaLineas
      .filter(b => {
        if (gOperarioId && b.operarioId !== gOperarioId) return false;
        if (gOperacion && b.operacion !== gOperacion) return false;
        if (gPeriodo && b.periodo !== gPeriodo) return false;
        if (gEstado && b.estadoPago !== gEstado) return false;
        return true;
      })
      .sort((a, b) => b.periodo.localeCompare(a.periodo) || a.nCorte.localeCompare(b.nCorte) || a.orden - b.orden);
  }, [boletaLineas, gOperarioId, gOperacion, gPeriodo, gEstado]);

  const totalGeneral = lineasGenerales.reduce((s, b) => s + b.importe, 0);

  // Resumen por operario en un período dado (o rango libre)
  const resumenPorOperario = useMemo(() => {
    const usaRango = rDesde || rHasta;
    const lineasPeriodo = boletaLineas.filter(b => {
      if (usaRango) {
        if (rDesde && b.periodo < rDesde.slice(0, 7)) return false;
        if (rHasta && b.periodo > rHasta.slice(0, 7)) return false;
        return true;
      }
      return b.periodo === rPeriodo;
    });
    const map = new Map<string, { total: number; prendas: number; pagado: number; pendiente: number; nLineas: number }>();
    for (const b of lineasPeriodo) {
      const prev = map.get(b.operarioId) ?? { total: 0, prendas: 0, pagado: 0, pendiente: 0, nLineas: 0 };
      map.set(b.operarioId, {
        total: prev.total + b.importe,
        prendas: prev.prendas + b.cantPrendas,
        pagado: prev.pagado + (b.estadoPago === 'PAGADO' ? b.importe : 0),
        pendiente: prev.pendiente + (b.estadoPago === 'PENDIENTE' ? b.importe : 0),
        nLineas: prev.nLineas + 1,
      });
    }
    return Array.from(map.entries())
      .map(([operarioId, stats]) => ({ operarioId, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [boletaLineas, rPeriodo, rDesde, rHasta]);

  const totalBruto = lineasFiltradas.reduce((s, b) => s + b.importe, 0);

  const descuentosFiltrados = useMemo(() =>
    descuentosBoleta.filter(d => d.operarioId === selectedOperario && d.periodo === selectedPeriodo),
    [descuentosBoleta, selectedOperario, selectedPeriodo]
  );
  const totalDescuentos = descuentosFiltrados.reduce((s, d) => s + d.monto, 0);
  const totalNeto = totalBruto - totalDescuentos;

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
        id: uid(),
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
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {/* Encabezado + tabs */}
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Destajo</h2>
        <p className="text-xs text-gray-500 mt-1">Pago por destajo — prendas × tarifa con descuentos configurables por operario</p>
        <div className="flex gap-1 mt-4 border-b border-[#DDD8CF]">
          {([
            { key: 'boleta', label: 'Mi Boleta', icon: Receipt },
            { key: 'resumen', label: 'Resumen', icon: BarChart2 },
            { key: 'general', label: 'Vista General', icon: Users },
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resumenPorOperario.map(r => {
                    const op = operarioMap.get(r.operarioId);
                    return (
                      <tr key={r.operarioId} className="hover:bg-gray-50">
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
                                      if (rDesde && b.periodo < rDesde.slice(0, 7)) return false;
                                      if (rHasta && b.periodo > rHasta.slice(0, 7)) return false;
                                      return true;
                                    }
                                    return b.periodo === rPeriodo;
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
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Estado</label>
              <select value={gEstado} onChange={e => setGEstado(e.target.value as typeof gEstado)} className="input-base w-36">
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="PAGADO">Pagado</option>
              </select>
            </div>
            {(gOperarioId || gOperacion || gPeriodo || gEstado) && (
              <div className="flex items-end">
                <button
                  onClick={() => { setGOperarioId(''); setGOperacion(''); setGPeriodo(''); setGEstado(''); }}
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
                      {['Período', 'Operario', 'N° Corte', 'Operación', 'Tarifa', 'Prendas', 'Importe', 'Estado', ''].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={9} className="texajo-empty-row">Sin resultados</td></tr>
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
                      return (
                        <tr key={b.id} className={b.estadoPago === 'PAGADO' ? 'opacity-60' : ''}>
                          <td className="font-mono text-xs">{b.periodo}</td>
                          <td>
                            <div className="font-bold text-[11px]">{op?.nombre ?? b.operarioId}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{op?.codigo}</div>
                          </td>
                          <td className="font-mono">{b.nCorte}</td>
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
                                <button onClick={() => { deleteBoletaLinea(b.id); setConfirmDelete(null); addToast('Línea eliminada', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
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
                      <td colSpan={6} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-4 py-3">
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
          <select value={selectedPeriodo} onChange={e => setSelectedPeriodo(e.target.value)} className="input-base w-36">
            {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
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
                        <div className="flex items-center gap-2">
                          {b.estadoPago === 'PENDIENTE' && (
                            <button
                              onClick={() => updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: new Date().toISOString().slice(0, 10) })}
                              className="text-[10px] text-green-600 hover:text-green-800 font-bold uppercase"
                            >Pagar</button>
                          )}
                          {confirmDelete === b.id ? (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <button onClick={() => { deleteBoletaLinea(b.id); setConfirmDelete(null); addToast('Línea eliminada', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lineasFiltradas.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="bg-white border border-gray-200 p-4 w-72 space-y-2">
                {/* Bruto */}
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase">Bruto Destajo</span>
                  <span className="font-mono">S/ {totalBruto.toFixed(2)}</span>
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
              </div>
            </div>
          )}

          {/* ── Gestión de descuentos ── */}
          {selectedOperario && lineasFiltradas.length > 0 && (
            <div className="mt-4 bg-white border border-gray-200 p-4 space-y-3">
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
        return operario ? <BoletaOperario operario={operario} periodo={selectedPeriodo} onClose={() => setShowBoleta(false)} /> : null;
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
