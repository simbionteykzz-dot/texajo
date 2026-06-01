import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { useAuthUser } from '../lib/useAuthUser';
import { Download, Plus, X, FileText, Trash2 } from 'lucide-react';
import { TipoMovimientoTela, CategoriaColor } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';

type InvTab = 'movimientos' | 'matriz' | 'criticos' | 'historico';

const TIPOS: TipoMovimientoTela[] = ['INGRESO', 'A_CORTE', 'A_REPROCESO', 'DE_REPROCESO', 'MUESTRA', 'AJUSTE_POS', 'AJUSTE_NEG'];
const TIPO_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso', A_CORTE: 'A Corte', A_REPROCESO: 'A Reproceso',
  DE_REPROCESO: 'De Reproceso', MUESTRA: 'Muestra', AJUSTE_POS: 'Ajuste +', AJUSTE_NEG: 'Ajuste −',
};

const uid = () => crypto.randomUUID();

interface MovForm {
  fecha: string; tipo: TipoMovimientoTela; clienteId: string; telaId: string;
  colorId: string; rollos: string; kgTotal: string; precioKg: string;
  responsable: string; proveedorId: string; nFactura: string; notas: string;
}

const emptyForm = (): MovForm => ({
  fecha: new Date().toISOString().slice(0, 10), tipo: 'INGRESO', clienteId: '',
  telaId: '', colorId: '', rollos: '', kgTotal: '', precioKg: '',
  responsable: '', proveedorId: '', nFactura: '', notas: '',
});

type SegmentMode = 'ninguno' | 'tipo' | 'tela';

export function InventarioTelas() {
  const { movimientosTela, telas, colores, clientes, proveedores, preciosTelas, config, addMovimientoTela, deleteMovimientoTela } = useAppContext();
  const { addToast } = useToast();
  const authUser = useAuthUser();
  const esAdmin = authUser?.rol === 'Administrador General' || authUser?.rol === 'Super Admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MovForm>(emptyForm());
  const [filterTela, setFilterTela] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [segmentMode, setSegmentMode] = useState<SegmentMode>('ninguno');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InvTab>('movimientos');

  const telaMap = useMemo(() => new Map(telas.map(t => [t.id, t])), [telas]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c])), [colores]);
  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);

  const categoriaColor = useMemo((): CategoriaColor => {
    return (colorMap.get(form.colorId)?.categoria ?? 'OSCURO') as CategoriaColor;
  }, [form.colorId, colorMap]);

  // Precio sugerido desde catálogo PrecioTela según telaId + categoriaColor del color
  const precioSugerido = useMemo(() => {
    if (!form.telaId || !form.colorId) return null;
    const cat = colorMap.get(form.colorId)?.categoria;
    if (!cat) return null;
    return preciosTelas.find(p => p.telaId === form.telaId && p.categoriaColor === cat)?.precioKg ?? null;
  }, [form.telaId, form.colorId, colorMap, preciosTelas]);

  // Auto-rellenar precio cuando se conoce el precio sugerido
  useEffect(() => {
    if (precioSugerido !== null) {
      setForm(f => ({ ...f, precioKg: String(precioSugerido) }));
    }
  }, [precioSugerido]);

  // Kg sugeridos desde rollos × kgPorRollo de la tela
  const kgSugerido = useMemo(() => {
    const rollos = parseInt(form.rollos);
    if (!form.telaId || !rollos) return null;
    const kgPorRollo = telaMap.get(form.telaId)?.kgPorRollo ?? config.kgPorRolloDefault;
    return rollos * kgPorRollo;
  }, [form.telaId, form.rollos, telaMap, config.kgPorRolloDefault]);

  const stockActual = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of [...movimientosTela].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      map.set(`${m.telaId}|${m.colorId}`, m.stockRollosDespues);
    }
    return map;
  }, [movimientosTela]);

  const movsFiltrados = useMemo(() => {
    return [...movimientosTela]
      .filter(m => (!filterTela || m.telaId === filterTela) && (!filterColor || m.colorId === filterColor))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [movimientosTela, filterTela, filterColor]);

  // Segmentación: agrupa movsFiltrados por tipo o por tela
  const segmentGroups = useMemo(() => {
    if (segmentMode === 'tipo') {
      const order = TIPOS;
      const map = new Map<string, typeof movsFiltrados>();
      order.forEach(t => map.set(t, []));
      movsFiltrados.forEach(m => {
        if (!map.has(m.tipo)) map.set(m.tipo, []);
        map.get(m.tipo)!.push(m);
      });
      return Array.from(map.entries())
        .filter(([, rows]) => rows.length > 0)
        .map(([key, rows]) => ({ key, label: TIPO_LABEL[key] ?? key, rows }));
    }
    if (segmentMode === 'tela') {
      const map = new Map<string, typeof movsFiltrados>();
      movsFiltrados.forEach(m => {
        if (!map.has(m.telaId)) map.set(m.telaId, []);
        map.get(m.telaId)!.push(m);
      });
      return Array.from(map.entries())
        .map(([key, rows]) => ({ key, label: telaMap.get(key)?.nombre ?? key, rows }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return [{ key: 'all', label: 'Historial de Movimientos', rows: movsFiltrados }];
  }, [segmentMode, movsFiltrados, telaMap]);

  const set = (field: keyof MovForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rollos = parseInt(form.rollos);
    const kgTotal = parseFloat(form.kgTotal);
    const precioKg = parseFloat(form.precioKg) || 0;
    if (!form.telaId || !form.colorId || !rollos || !kgTotal) {
      addToast('Completa tela, color, rollos y kg', 'error');
      return;
    }
    const key = `${form.telaId}|${form.colorId}`;
    const stockAntes = stockActual.get(key) ?? 0;
    const positivos: TipoMovimientoTela[] = ['INGRESO', 'DE_REPROCESO', 'AJUSTE_POS'];
    const negativos: TipoMovimientoTela[] = ['A_CORTE', 'A_REPROCESO', 'MUESTRA', 'AJUSTE_NEG'];
    const delta = positivos.includes(form.tipo) ? rollos : negativos.includes(form.tipo) ? -rollos : 0;
    const stockDespues = stockAntes + delta;

    if (stockDespues < 0) {
      addToast(`Stock insuficiente — quedarían ${stockDespues} rollos (actual: ${stockAntes})`, 'error');
      return;
    }

    addMovimientoTela({
      id: uid(),
      fecha: form.fecha,
      tipo: form.tipo,
      clienteId: form.clienteId,
      telaId: form.telaId,
      colorId: form.colorId,
      rollos,
      kgTotal,
      categoriaColor,
      precioKg,
      totalSoles: kgTotal * precioKg,
      stockRollosAntes: stockAntes,
      stockRollosDespues: stockDespues,
      responsable: form.responsable,
      proveedorId: form.proveedorId || undefined,
      nFactura: form.nFactura || undefined,
      notas: form.notas,
    });
    addToast('Movimiento registrado', 'success');
    setShowForm(false);
    setForm(emptyForm());
  };

  const stockSummary = useMemo(() => {
    return Array.from(stockActual.entries())
      .map(([k, rollos]) => {
        const [telaId, colorId] = k.split('|');
        const kgPorRollo = telaMap.get(telaId)?.kgPorRollo ?? config.kgPorRolloDefault;
        const cat = colorMap.get(colorId)?.categoria;
        const precioKg = cat
          ? (preciosTelas.find(p => p.telaId === telaId && p.categoriaColor === cat)?.precioKg ?? null)
          : null;
        const kgTotal = rollos * kgPorRollo;
        return { telaId, colorId, rollos, kgTotal, precioKg };
      })
      .filter(s => s.rollos > 0)
      .sort((a, b) => (telaMap.get(a.telaId)?.nombre ?? '').localeCompare(telaMap.get(b.telaId)?.nombre ?? ''));
  }, [stockActual, telaMap, colorMap, preciosTelas, config.kgPorRolloDefault]);

  // Tab Matriz: grilla telas × colores
  const matrizData = useMemo(() => {
    const telasSorted = [...telas].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const coloresSorted = [...colores].sort((a, b) => (a.prioridad ?? 999) - (b.prioridad ?? 999) || a.nombre.localeCompare(b.nombre));
    return { telasSorted, coloresSorted };
  }, [telas, colores]);

  // Tab Críticos: tela×color donde stock ≤ umbralCritico
  const criticosList = useMemo(() => {
    return Array.from(stockActual.entries())
      .map(([k, rollos]) => {
        const [telaId, colorId] = k.split('|');
        return { telaId, colorId, rollos };
      })
      .filter(s => s.rollos <= config.umbralCritico)
      .sort((a, b) => a.rollos - b.rollos);
  }, [stockActual, config.umbralCritico]);

  // Tab Histórico: resumen mensual (últimos 24 meses)
  const historicoMensual = useMemo(() => {
    const map = new Map<string, { periodo: string; ingresos: number; consumo: number; otros: number }>();
    for (const m of movimientosTela) {
      const periodo = m.fecha.slice(0, 7);
      if (!map.has(periodo)) map.set(periodo, { periodo, ingresos: 0, consumo: 0, otros: 0 });
      const row = map.get(periodo)!;
      if (m.tipo === 'INGRESO') row.ingresos += m.kgTotal;
      else if (m.tipo === 'A_CORTE') row.consumo += m.kgTotal;
      else row.otros += m.kgTotal;
    }
    return Array.from(map.values())
      .sort((a, b) => b.periodo.localeCompare(a.periodo))
      .slice(0, 24);
  }, [movimientosTela]);

  const buildRows = () => movsFiltrados.map((m) => ({
    Fecha: m.fecha,
    Tipo: TIPO_LABEL[m.tipo] ?? m.tipo,
    Tela: telaMap.get(m.telaId)?.nombre ?? m.telaId,
    Color: colorMap.get(m.colorId)?.nombre ?? m.colorId,
    Categoria: m.categoriaColor,
    Rollos: m.rollos,
    Kg: m.kgTotal,
    PrecioKg: m.precioKg,
    TotalSoles: m.totalSoles,
    StockDespues: m.stockRollosDespues,
    Responsable: m.responsable,
    Notas: m.notas,
  }));

  const exportarMovimientos = () => {
    exportRowsToXlsx(buildRows(), `inventario_telas_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Inventario');
    addToast('Excel exportado', 'success');
  };

  const exportarMovimientosPdf = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    exportTableToPdf({
      title: 'Inventario de Telas',
      subtitle: `Movimientos al ${fecha}`,
      fileName: `inventario_telas_${fecha}`,
      columns: [
        { header: 'Fecha', dataKey: 'Fecha' },
        { header: 'Tipo', dataKey: 'Tipo' },
        { header: 'Tela', dataKey: 'Tela' },
        { header: 'Color', dataKey: 'Color' },
        { header: 'Cat.', dataKey: 'Categoria' },
        { header: 'Rollos', dataKey: 'Rollos' },
        { header: 'Kg', dataKey: 'Kg' },
        { header: 'S/. Kg', dataKey: 'PrecioKg' },
        { header: 'Total S/.', dataKey: 'TotalSoles' },
        { header: 'Stock Post.', dataKey: 'StockDespues' },
        { header: 'Responsable', dataKey: 'Responsable' },
        { header: 'Notas', dataKey: 'Notas' },
      ],
      rows: buildRows(),
      rightCols: ['PrecioKg', 'TotalSoles'],
      centerCols: ['Rollos', 'Kg', 'StockDespues', 'Categoria'],
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
          <h2 className="text-2xl font-black uppercase tracking-tight">Inventario de Telas</h2>
          <p className="text-xs text-gray-500 mt-1">Movimientos y stock por tela/color</p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleInfoBox
            accent="#4B7FA3"
            titulo="Inventario de Telas"
            descripcion="Controla el stock de rollos de tela agrupado por tipo y color. Registra ingresos, consumos a corte, reprocesos y ajustes. Genera alertas cuando el stock cae por debajo de umbrales configurables."
            items={[
              { label: 'Movimientos', detail: 'Ingreso, A Corte, Reproceso, Muestra, Ajuste +/−' },
              { label: 'Matriz Color × Tela', detail: 'Vista cruzada del stock con semáforo crítico/bajo/ok' },
              { label: 'Tab Críticos', detail: 'Lista filtrada de combinaciones bajo el umbral de alerta' },
              { label: 'Histórico Mensual', detail: 'Ingresos, consumo y balance por mes (últimos 24)' },
            ]}
          />
          <button onClick={exportarMovimientos} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportarMovimientosPdf} className="btn-secondary flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Registrar Movimiento
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'movimientos', label: 'Movimientos' },
          { id: 'matriz', label: 'Matriz Color × Tela' },
          { id: 'criticos', label: `Críticos${criticosList.length > 0 ? ` (${criticosList.length})` : ''}` },
          { id: 'historico', label: 'Histórico Mensual' },
        ] as { id: InvTab; label: string }[]).map(tab => (
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

      {/* Tab: Movimientos */}
      {activeTab === 'movimientos' && <>
      {/* Stock actual */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Stock Actual</h3>
        {stockSummary.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin stock registrado.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {(() => {
              const valorTotal = stockSummary.reduce((acc, s) => s.precioKg !== null ? acc + s.kgTotal * s.precioKg : acc, 0);
              return (
                <>
                  {esAdmin && (
                    <div className="border border-[#B66F35] bg-[#FDF8F3] p-3 col-span-2 lg:col-span-4">
                      <p className="text-[10px] font-bold uppercase text-[#B66F35] tracking-widest">Valor Total Inventario</p>
                      <p className="text-2xl font-black text-[#B66F35] mt-1">S/ {valorTotal.toFixed(0)}</p>
                    </div>
                  )}
                  {stockSummary.map(s => {
                    const isCrit = s.rollos <= config.umbralCritico;
                    const isBajo = !isCrit && s.rollos <= config.umbralBajo;
                    return (
                      <div key={`${s.telaId}|${s.colorId}`} className={`border p-3 ${isCrit ? 'border-red-300 bg-red-50' : isBajo ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
                        <p className="text-[10px] font-bold uppercase text-gray-500 truncate">{telaMap.get(s.telaId)?.nombre}</p>
                        <p className="text-xs text-gray-600 truncate">{colorMap.get(s.colorId)?.nombre}</p>
                        <p className={`text-xl font-black mt-1 ${isCrit ? 'text-red-700' : isBajo ? 'text-yellow-700' : ''}`}>{s.rollos} <span className="text-xs font-normal">rollos</span></p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{s.kgTotal.toFixed(0)} kg</p>
                        {esAdmin && s.precioKg !== null && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Valor aprox. S/ {(s.kgTotal * s.precioKg).toFixed(0)}</p>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Filtros + segmentación + tabla */}
      <div className="space-y-4">
        {/* Fila de controles */}
        <div className="flex flex-wrap items-end gap-3">
          <select value={filterTela} onChange={e => setFilterTela(e.target.value)} className="input-base text-xs w-40">
            <option value="">Todas las telas</option>
            {telas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <select value={filterColor} onChange={e => setFilterColor(e.target.value)} className="input-base text-xs w-40">
            <option value="">Todos los colores</option>
            {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {/* Botones de segmentación */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-1">Segmentar:</span>
            {(['ninguno', 'tipo', 'tela'] as SegmentMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setSegmentMode(mode)}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                  segmentMode === mode
                    ? 'bg-[#1a1a1a] text-[#f9f7f2] border-[#1a1a1a]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                }`}
              >
                {mode === 'ninguno' ? 'Ninguno' : mode === 'tipo' ? 'Tipo Mov.' : 'Tipo Tela'}
              </button>
            ))}
          </div>
        </div>

        {movsFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin movimientos.</p>
        ) : (
          <div className="space-y-6">
            {segmentGroups.map(group => (
              <div key={group.key}>
                {segmentMode !== 'ninguno' && (
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-[#B66F35]" />
                    {group.label}
                    <span className="text-gray-300 font-normal">({group.rows.length})</span>
                  </h3>
                )}
                {segmentMode === 'ninguno' && (
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Historial de Movimientos</h3>
                )}
                <div className="texajo-table-shell">
                  <div className="texajo-table-scroll">
                    <table className="texajo-table">
                      <thead>
                        <tr>
                          {['Fecha', 'Tipo', 'Tela', 'Color', 'Cat.', 'Rollos', 'Kg', ...(esAdmin ? ['S/. Kg', 'Total S/.', 'Dif. %'] : []), 'Stock Post', 'Responsable', 'Notas', ''].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map(m => (
                          <tr key={m.id}>
                            <td className="font-mono whitespace-nowrap">{m.fecha}</td>
                            <td>
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap ${
                                m.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' :
                                m.tipo === 'A_CORTE' ? 'bg-blue-100 text-blue-800' :
                                m.tipo.startsWith('AJUSTE') ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-700'
                              }`}>{TIPO_LABEL[m.tipo] ?? m.tipo}</span>
                            </td>
                            <td className="whitespace-nowrap">{telaMap.get(m.telaId)?.nombre ?? m.telaId}</td>
                            <td className="whitespace-nowrap">{colorMap.get(m.colorId)?.nombre ?? m.colorId}</td>
                            <td className="text-[10px]">{m.categoriaColor}</td>
                            <td className="font-mono text-right">{m.rollos}</td>
                            <td className="font-mono text-right">{m.kgTotal.toFixed(1)}</td>
                            {esAdmin && <td className="font-mono text-right">{m.precioKg.toFixed(2)}</td>}
                            {esAdmin && <td className="font-mono text-right">{m.totalSoles.toFixed(2)}</td>}
                            {esAdmin && <td className="text-center">
                              {m.tipo === 'INGRESO' && m.costoRealFact && m.costoRealFact > 0 && m.totalSoles > 0 ? (() => {
                                const dif = ((m.costoRealFact - m.totalSoles) / m.totalSoles) * 100;
                                const cls = dif <= 0
                                  ? 'bg-green-100 text-green-800'
                                  : dif <= 10
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800';
                                const label = (dif >= 0 ? '+' : '') + dif.toFixed(1) + '%';
                                return <span className={`inline-block px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
                              })() : <span className="text-gray-300 text-[10px]">—</span>}
                            </td>}
                            <td className="font-mono text-right font-bold">{m.stockRollosDespues}</td>
                            <td className="whitespace-nowrap">{m.responsable}</td>
                            <td className="text-gray-500 max-w-[12rem] truncate">{m.notas}</td>
                            <td className="px-2">
                              {confirmDelete === m.id ? (
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <button onClick={() => { deleteMovimientoTela(m.id); setConfirmDelete(null); addToast('Movimiento eliminado', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                                  <span className="text-gray-300">/</span>
                                  <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                                </span>
                              ) : (
                                <button onClick={() => setConfirmDelete(m.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </>}

      {/* Tab: Matriz */}
      {activeTab === 'matriz' && (
        <div className="overflow-x-auto">
          {matrizData.telasSorted.length === 0 || matrizData.coloresSorted.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin datos de telas o colores.</p>
          ) : (
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 bg-gray-50 border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-500 sticky left-0 z-10 min-w-[140px]">Tela \ Color</th>
                  {matrizData.coloresSorted.map(c => (
                    <th key={c.id} className="px-2 py-2 bg-gray-50 border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{c.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrizData.telasSorted.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-bold text-gray-700 sticky left-0 bg-white z-10 whitespace-nowrap">{t.nombre}</td>
                    {matrizData.coloresSorted.map(c => {
                      const rollos = stockActual.get(`${t.id}|${c.id}`) ?? 0;
                      const isCrit = rollos > 0 && rollos <= config.umbralCritico;
                      const isBajo = rollos > 0 && !isCrit && rollos <= config.umbralBajo;
                      return (
                        <td key={c.id} className={`px-2 py-2 border border-gray-200 text-center font-mono font-bold ${
                          rollos === 0 ? 'text-gray-300' :
                          isCrit ? 'text-red-700 bg-red-50' :
                          isBajo ? 'text-yellow-700 bg-yellow-50' :
                          'text-green-700 bg-green-50'
                        }`}>
                          {rollos === 0 ? '—' : rollos}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-[10px] text-gray-400 mt-3">Valores en rollos. Verde = sobre umbral, amarillo = bajo, rojo = crítico.</p>
        </div>
      )}

      {/* Tab: Críticos */}
      {activeTab === 'criticos' && (
        <div>
          {criticosList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-bold text-green-700">Sin ítems críticos</p>
              <p className="text-xs text-gray-400 mt-1">Todos los stocks están por encima del umbral crítico ({config.umbralCritico} rollos).</p>
            </div>
          ) : (
            <div className="texajo-table-shell">
              <div className="texajo-table-scroll">
                <table className="texajo-table">
                  <thead>
                    <tr>
                      {['Tela', 'Color', 'Stock Rollos', 'Umbral Crítico', 'Estado'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criticosList.map(s => (
                      <tr key={`${s.telaId}|${s.colorId}`}>
                        <td className="font-bold">{telaMap.get(s.telaId)?.nombre ?? s.telaId}</td>
                        <td>{colorMap.get(s.colorId)?.nombre ?? s.colorId}</td>
                        <td className="font-mono text-right font-black text-red-700">{s.rollos}</td>
                        <td className="font-mono text-right text-gray-500">{config.umbralCritico}</td>
                        <td><span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-800">CRÍTICO</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Histórico Mensual */}
      {activeTab === 'historico' && (
        <div>
          {historicoMensual.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin movimientos registrados.</p>
          ) : (
            <div className="texajo-table-shell">
              <div className="texajo-table-scroll">
                <table className="texajo-table">
                  <thead>
                    <tr>
                      {['Período', 'Ingresos (kg)', 'Consumo A Corte (kg)', 'Otros (kg)', 'Balance (kg)'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historicoMensual.map(row => {
                      const balance = row.ingresos - row.consumo - row.otros;
                      return (
                        <tr key={row.periodo}>
                          <td className="font-mono font-bold">{row.periodo}</td>
                          <td className="font-mono text-right text-green-700">{row.ingresos.toFixed(1)}</td>
                          <td className="font-mono text-right text-blue-700">{row.consumo.toFixed(1)}</td>
                          <td className="font-mono text-right text-gray-500">{row.otros.toFixed(1)}</td>
                          <td className={`font-mono text-right font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>{balance >= 0 ? '+' : ''}{balance.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal / form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gray-300 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest">Registrar Movimiento</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Fecha"><input type="date" value={form.fecha} onChange={set('fecha')} className="input-base" required /></F>
                <F label="Tipo">
                  <select value={form.tipo} onChange={set('tipo')} className="input-base">
                    {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Tela">
                  <select value={form.telaId} onChange={set('telaId')} className="input-base" required>
                    <option value="">Seleccionar…</option>
                    {telas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </F>
                <F label="Color">
                  <select value={form.colorId} onChange={set('colorId')} className="input-base" required>
                    <option value="">Seleccionar…</option>
                    {colores.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.categoria})</option>)}
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Rollos">
                  <input type="number" min={1} value={form.rollos} onChange={e => {
                    const val = e.target.value;
                    setForm(f => {
                      const rollosNum = parseInt(val);
                      const kgCalc = form.telaId && rollosNum ? (telaMap.get(form.telaId)?.kgPorRollo ?? config.kgPorRolloDefault) * rollosNum : undefined;
                      return { ...f, rollos: val, kgTotal: kgCalc !== undefined ? String(kgCalc) : f.kgTotal };
                    });
                  }} className="input-base" required />
                </F>
                <F label={kgSugerido !== null ? `Kg Total (sugerido: ${kgSugerido})` : 'Kg Total'}>
                  <input type="number" min={0} step={0.1} value={form.kgTotal} onChange={set('kgTotal')} className="input-base" required />
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {esAdmin && (
                  <F label={precioSugerido !== null ? `Precio / Kg (sugerido: S/ ${precioSugerido})` : 'Precio / Kg (S/.)'}>
                    <input type="number" min={0} step={0.01} value={form.precioKg} onChange={set('precioKg')} className="input-base" />
                  </F>
                )}
                <F label="Cliente">
                  <select value={form.clienteId} onChange={set('clienteId')} className="input-base">
                    <option value="">—</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </F>
              </div>
              {form.tipo === 'INGRESO' && (
                <div className="grid grid-cols-2 gap-4">
                  <F label="Proveedor">
                    <select value={form.proveedorId} onChange={set('proveedorId')} className="input-base">
                      <option value="">—</option>
                      {proveedores.filter(p => p.tipo === 'TELA').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </F>
                  <F label="N° Factura"><input type="text" value={form.nFactura} onChange={set('nFactura')} className="input-base" /></F>
                </div>
              )}
              <F label="Responsable"><input type="text" value={form.responsable} onChange={set('responsable')} className="input-base" /></F>
              <F label="Notas"><textarea value={form.notas} onChange={set('notas')} rows={2} className="input-base" /></F>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
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
