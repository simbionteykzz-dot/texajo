import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, FileText } from 'lucide-react';
import { TipoMovimientoTela, CategoriaColor } from '../types';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';

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

export function InventarioTelas() {
  const { movimientosTela, telas, colores, clientes, proveedores, config, addMovimientoTela } = useAppContext();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MovForm>(emptyForm());
  const [filterTela, setFilterTela] = useState('');
  const [filterColor, setFilterColor] = useState('');

  const telaMap = useMemo(() => new Map(telas.map(t => [t.id, t])), [telas]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c])), [colores]);
  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);

  const categoriaColor = useMemo((): CategoriaColor => {
    return (colorMap.get(form.colorId)?.categoria ?? 'OSCURO') as CategoriaColor;
  }, [form.colorId, colorMap]);

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
        return { telaId, colorId, rollos };
      })
      .filter(s => s.rollos > 0)
      .sort((a, b) => (telaMap.get(a.telaId)?.nombre ?? '').localeCompare(telaMap.get(b.telaId)?.nombre ?? ''));
  }, [stockActual, telaMap]);

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
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Inventario de Telas</h2>
          <p className="text-xs text-gray-500 mt-1">Movimientos y stock por tela/color</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Stock actual */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Stock Actual</h3>
        {stockSummary.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin stock registrado.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {stockSummary.map(s => {
              const isCrit = s.rollos <= config.umbralCritico;
              const isBajo = !isCrit && s.rollos <= config.umbralBajo;
              return (
                <div key={`${s.telaId}|${s.colorId}`} className={`border p-3 ${isCrit ? 'border-red-300 bg-red-50' : isBajo ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
                  <p className="text-[10px] font-bold uppercase text-gray-500 truncate">{telaMap.get(s.telaId)?.nombre}</p>
                  <p className="text-xs text-gray-600 truncate">{colorMap.get(s.colorId)?.nombre}</p>
                  <p className={`text-xl font-black mt-1 ${isCrit ? 'text-red-700' : isBajo ? 'text-yellow-700' : ''}`}>{s.rollos} <span className="text-xs font-normal">rollos</span></p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filtros + tabla */}
      <div>
        <div className="flex gap-3 mb-3">
          <select value={filterTela} onChange={e => setFilterTela(e.target.value)} className="input-base text-xs w-40">
            <option value="">Todas las telas</option>
            {telas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <select value={filterColor} onChange={e => setFilterColor(e.target.value)} className="input-base text-xs w-40">
            <option value="">Todos los colores</option>
            {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Historial de Movimientos</h3>
        {movsFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin movimientos.</p>
        ) : (
          <div className="bg-white border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Fecha', 'Tipo', 'Tela', 'Color', 'Cat.', 'Rollos', 'Kg', 'S/. Kg', 'Total S/.', 'Stock Post', 'Responsable', 'Notas'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movsFiltrados.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{m.fecha}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap ${
                        m.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' :
                        m.tipo === 'A_CORTE' ? 'bg-blue-100 text-blue-800' :
                        m.tipo.startsWith('AJUSTE') ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>{TIPO_LABEL[m.tipo] ?? m.tipo}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{telaMap.get(m.telaId)?.nombre ?? m.telaId}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{colorMap.get(m.colorId)?.nombre ?? m.colorId}</td>
                    <td className="px-3 py-2 text-[10px]">{m.categoriaColor}</td>
                    <td className="px-3 py-2 font-mono text-right">{m.rollos}</td>
                    <td className="px-3 py-2 font-mono text-right">{m.kgTotal.toFixed(1)}</td>
                    <td className="px-3 py-2 font-mono text-right">{m.precioKg.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-right">{m.totalSoles.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-right font-bold">{m.stockRollosDespues}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{m.responsable}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[12rem] truncate">{m.notas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                <F label="Rollos"><input type="number" min={1} value={form.rollos} onChange={set('rollos')} className="input-base" required /></F>
                <F label="Kg Total"><input type="number" min={0} step={0.1} value={form.kgTotal} onChange={set('kgTotal')} className="input-base" required /></F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Precio / Kg (S/.)"><input type="number" min={0} step={0.01} value={form.precioKg} onChange={set('precioKg')} className="input-base" /></F>
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
