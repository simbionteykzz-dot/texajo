import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, FileText, Trash2 } from 'lucide-react';
import { TipoComplemento, TipoMovimientoComplemento, MovimientoComplemento, TIPOS_COMPLEMENTO_LIST } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';

const uid = () => crypto.randomUUID();

const TIPOS_MOV: TipoMovimientoComplemento[] = ['INGRESO', 'CONSUMO', 'AJUSTE_POS', 'AJUSTE_NEG'];
const MOV_LABEL: Record<TipoMovimientoComplemento, string> = {
  INGRESO: 'Ingreso', CONSUMO: 'Consumo', AJUSTE_POS: 'Ajuste +', AJUSTE_NEG: 'Ajuste −',
};
const TALLAS = ['S', 'M', 'L', 'XL'] as const;

interface MovCompForm {
  fecha: string;
  tipo: TipoMovimientoComplemento;
  tipoComplemento: TipoComplemento;
  colorId: string;
  talla: 'S' | 'M' | 'L' | 'XL';
  cantidad: string;
  precioUnit: string;
  productoDestinoId: string;
  proveedorId: string;
  nFactura: string;
  responsable: string;
  notas: string;
}

const emptyForm = (): MovCompForm => ({
  fecha: new Date().toISOString().slice(0, 10),
  tipo: 'INGRESO',
  tipoComplemento: 'CUELLO',
  colorId: '',
  talla: 'M',
  cantidad: '',
  precioUnit: '',
  productoDestinoId: '',
  proveedorId: '',
  nFactura: '',
  responsable: '',
  notas: '',
});

export function Complementos() {
  const {
    movimientosComplemento, colores, proveedores, productos, preciosComplementos, config,
    addMovimientoComplemento, deleteMovimientoComplemento,
  } = useAppContext();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MovCompForm>(emptyForm());
  const [filterTipo, setFilterTipo] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterTalla, setFilterTalla] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const tiposComp = useMemo(() => {
    const fromDb = preciosComplementos.map(p => p.tipo);
    return Array.from(new Set([...TIPOS_COMPLEMENTO_LIST, ...fromDb])).sort();
  }, [preciosComplementos]);

  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c])), [colores]);
  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p.nombre])), [productos]);

  const set = (field: keyof MovCompForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  // Stock actual por tipoComplemento|colorId|talla
  const stockActual = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of [...movimientosComplemento].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      map.set(`${m.tipoComplemento}|${m.colorId}|${m.talla}`, m.stockDespues);
    }
    return map;
  }, [movimientosComplemento]);

  // Precio sugerido desde catálogo según tipoComplemento + talla
  const precioSugerido = useMemo(() => {
    if (!form.tipoComplemento || !form.talla) return null;
    const match = preciosComplementos.find(
      p => p.tipo === form.tipoComplemento && p.talla === form.talla
    );
    return match?.precio ?? null;
  }, [form.tipoComplemento, form.talla, preciosComplementos]);

  const movsFiltrados = useMemo(() =>
    [...movimientosComplemento]
      .filter(m =>
        (!filterTipo || m.tipoComplemento === filterTipo) &&
        (!filterColor || m.colorId === filterColor) &&
        (!filterTalla || m.talla === filterTalla)
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [movimientosComplemento, filterTipo, filterColor, filterTalla]
  );

  // Resumen de stock para las tarjetas
  const stockSummary = useMemo(() =>
    Array.from(stockActual.entries())
      .map(([k, stock]) => {
        const [tipoComplemento, colorId, talla] = k.split('|') as [TipoComplemento, string, 'S' | 'M' | 'L' | 'XL'];
        return { tipoComplemento, colorId, talla, stock };
      })
      .filter(s => s.stock > 0)
      .sort((a, b) => a.tipoComplemento.localeCompare(b.tipoComplemento) || a.talla.localeCompare(b.talla)),
    [stockActual]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cantidad = parseInt(form.cantidad);
    const precioUnit = parseFloat(form.precioUnit) || 0;
    if (!form.colorId || !cantidad) {
      addToast('Completa color y cantidad', 'error');
      return;
    }
    const key = `${form.tipoComplemento}|${form.colorId}|${form.talla}`;
    const stockAntes = stockActual.get(key) ?? 0;
    const positivos: TipoMovimientoComplemento[] = ['INGRESO', 'AJUSTE_POS'];
    const negativos: TipoMovimientoComplemento[] = ['CONSUMO', 'AJUSTE_NEG'];
    const delta = positivos.includes(form.tipo) ? cantidad : negativos.includes(form.tipo) ? -cantidad : 0;
    const stockDespues = stockAntes + delta;

    if (stockDespues < 0) {
      addToast(`Stock insuficiente — quedarían ${stockDespues} unidades (actual: ${stockAntes})`, 'error');
      return;
    }

    const mov: MovimientoComplemento = {
      id: uid(),
      fecha: form.fecha,
      tipo: form.tipo,
      tipoComplemento: form.tipoComplemento,
      colorId: form.colorId,
      talla: form.talla,
      cantidad,
      precioUnit,
      totalSoles: cantidad * precioUnit,
      stockAntes,
      stockDespues,
      productoDestinoId: form.productoDestinoId || undefined,
      proveedorId: form.proveedorId || undefined,
      nFactura: form.nFactura || undefined,
      responsable: form.responsable,
      notas: form.notas,
    };
    addMovimientoComplemento(mov);
    addToast('Movimiento registrado', 'success');
    setShowForm(false);
    setForm(emptyForm());
  };

  const buildRows = () => movsFiltrados.map(m => ({
    Fecha: m.fecha,
    Tipo: MOV_LABEL[m.tipo],
    Complemento: m.tipoComplemento,
    Color: colorMap.get(m.colorId)?.nombre ?? m.colorId,
    Talla: m.talla,
    Cantidad: m.cantidad,
    PrecioUnit: m.precioUnit.toFixed(2),
    Total: m.totalSoles.toFixed(2),
    StockDespues: m.stockDespues,
    Responsable: m.responsable,
    Notas: m.notas,
  }));

  const exportarExcel = () => {
    exportRowsToXlsx(buildRows(), `complementos_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Complementos');
    addToast('Excel exportado', 'success');
  };

  const exportarPdf = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    exportTableToPdf({
      title: 'Inventario de Complementos',
      subtitle: `Movimientos al ${fecha}`,
      fileName: `complementos_${fecha}`,
      columns: [
        { header: 'Fecha', dataKey: 'Fecha' },
        { header: 'Tipo', dataKey: 'Tipo' },
        { header: 'Complemento', dataKey: 'Complemento' },
        { header: 'Color', dataKey: 'Color' },
        { header: 'Talla', dataKey: 'Talla' },
        { header: 'Cant.', dataKey: 'Cantidad' },
        { header: 'S/. Unit', dataKey: 'PrecioUnit' },
        { header: 'Total S/.', dataKey: 'Total' },
        { header: 'Stock Post.', dataKey: 'StockDespues' },
        { header: 'Responsable', dataKey: 'Responsable' },
        { header: 'Notas', dataKey: 'Notas' },
      ],
      rows: buildRows(),
      rightCols: ['PrecioUnit', 'Total'],
      centerCols: ['Cantidad', 'Talla', 'StockDespues'],
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
          <h2 className="text-2xl font-black uppercase tracking-tight">Complementos</h2>
          <p className="text-xs text-gray-500 mt-1">Inventario de cuellos, puños y pretinas</p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleInfoBox
            accent="#7B5EA7"
            titulo="Complementos"
            descripcion="Gestiona el stock de cuellos, puños y pretinas por color y talla. Registra ingresos de compra o corte interno, consumos vinculados a un producto destino y ajustes de inventario."
            items={[
              { label: 'Tipos', detail: 'CUELLO · PUÑO · PRETINA — cada uno con talla S/M/L/XL' },
              { label: 'Movimientos', detail: 'Ingreso, Consumo (vinculado a producto), Ajuste +/−' },
              { label: 'Producto Destino', detail: 'En tipo CONSUMO indica el producto que usó los complementos' },
              { label: 'Stock automático', detail: 'stockAntes y stockDespues calculados al registrar cada movimiento' },
            ]}
          />
          <button onClick={exportarExcel} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportarPdf} className="btn-secondary flex items-center gap-2">
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
              const isCrit = s.stock <= config.umbralCritico;
              const isBajo = !isCrit && s.stock <= config.umbralBajo;
              return (
                <div key={`${s.tipoComplemento}|${s.colorId}|${s.talla}`}
                  className={`border p-3 ${isCrit ? 'border-red-300 bg-red-50' : isBajo ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
                  <p className="text-[10px] font-bold uppercase text-gray-500">{s.tipoComplemento}</p>
                  <p className="text-xs text-gray-600 truncate">{colorMap.get(s.colorId)?.nombre ?? s.colorId}</p>
                  <p className="text-[10px] text-gray-400">Talla {s.talla}</p>
                  <p className={`text-xl font-black mt-1 ${isCrit ? 'text-red-700' : isBajo ? 'text-yellow-700' : ''}`}>
                    {s.stock} <span className="text-xs font-normal">uds</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="input-base text-xs w-36">
          <option value="">Todos los tipos</option>
          {tiposComp.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterColor} onChange={e => setFilterColor(e.target.value)} className="input-base text-xs w-40">
          <option value="">Todos los colores</option>
          {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={filterTalla} onChange={e => setFilterTalla(e.target.value)} className="input-base text-xs w-28">
          <option value="">Todas las tallas</option>
          {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Historial */}
      {movsFiltrados.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin movimientos registrados.</p>
      ) : (
        <div className="texajo-table-shell">
          <div className="texajo-table-scroll">
            <table className="texajo-table">
              <thead>
                <tr>
                  {['Fecha', 'Tipo', 'Complemento', 'Color', 'Talla', 'Cant.', 'S/. Unit', 'Total S/.', 'Stock Post.', 'Producto Destino', 'Responsable', 'Notas', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movsFiltrados.map(m => (
                  <tr key={m.id}>
                    <td className="font-mono whitespace-nowrap">{m.fecha}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap ${
                        m.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' :
                        m.tipo === 'CONSUMO' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>{MOV_LABEL[m.tipo]}</span>
                    </td>
                    <td className="font-bold text-[10px]">{m.tipoComplemento}</td>
                    <td className="whitespace-nowrap">{colorMap.get(m.colorId)?.nombre ?? m.colorId}</td>
                    <td className="text-center font-bold">{m.talla}</td>
                    <td className="font-mono text-right">{m.cantidad}</td>
                    <td className="font-mono text-right">{m.precioUnit.toFixed(2)}</td>
                    <td className="font-mono text-right font-bold">{m.totalSoles.toFixed(2)}</td>
                    <td className="font-mono text-right font-bold">{m.stockDespues}</td>
                    <td className="text-xs text-gray-500 whitespace-nowrap">{m.productoDestinoId ? productoMap.get(m.productoDestinoId) ?? '—' : '—'}</td>
                    <td className="whitespace-nowrap">{m.responsable}</td>
                    <td className="text-gray-500 max-w-[10rem] truncate">{m.notas}</td>
                    <td className="px-2">
                      {confirmDelete === m.id ? (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <button onClick={() => { deleteMovimientoComplemento(m.id); setConfirmDelete(null); addToast('Movimiento eliminado', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
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
      )}

      {/* Modal */}
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
                <F label="Tipo Movimiento">
                  <select value={form.tipo} onChange={set('tipo')} className="input-base">
                    {TIPOS_MOV.map(t => <option key={t} value={t}>{MOV_LABEL[t]}</option>)}
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Complemento">
                  <select value={form.tipoComplemento} onChange={set('tipoComplemento')} className="input-base">
                    {tiposComp.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </F>
                <F label="Color">
                  <select value={form.colorId} onChange={set('colorId')} className="input-base" required>
                    <option value="">Seleccionar…</option>
                    {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </F>
                <F label="Talla">
                  <select value={form.talla} onChange={set('talla')} className="input-base">
                    {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Cantidad"><input type="number" min={1} value={form.cantidad} onChange={set('cantidad')} className="input-base" required /></F>
                <F label={precioSugerido !== null ? `Precio Unitario (sugerido: S/ ${precioSugerido})` : 'Precio Unitario (S/.)'}>
                  <div className="flex gap-2">
                    <input type="number" min={0} step={0.01} value={form.precioUnit} onChange={set('precioUnit')} className="input-base flex-1" />
                    {precioSugerido !== null && form.precioUnit === '' && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, precioUnit: String(precioSugerido) }))} className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800 border border-blue-200 px-2">
                        Usar
                      </button>
                    )}
                  </div>
                </F>
              </div>
              {form.tipo === 'INGRESO' && (
                <div className="grid grid-cols-2 gap-4">
                  <F label="Proveedor">
                    <select value={form.proveedorId} onChange={set('proveedorId')} className="input-base">
                      <option value="">—</option>
                      {proveedores.filter(p => p.tipo === 'COMPLEMENTO').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </F>
                  <F label="N° Factura"><input type="text" value={form.nFactura} onChange={set('nFactura')} className="input-base" /></F>
                </div>
              )}
              {form.tipo === 'CONSUMO' && (
                <F label="Producto Destino">
                  <select value={form.productoDestinoId} onChange={set('productoDestinoId')} className="input-base">
                    <option value="">—</option>
                    {[...productos].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </F>
              )}
              <F label="Responsable"><input type="text" value={form.responsable} onChange={set('responsable')} className="input-base" /></F>
              <F label="Notas"><textarea value={form.notas} onChange={set('notas')} rows={2} className="input-base" /></F>
              {form.cantidad && form.precioUnit && (
                <div className="bg-gray-50 border border-gray-200 p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Cantidad</span><span className="font-mono">{form.cantidad} uds</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span className="font-mono">S/ {(parseInt(form.cantidad) * parseFloat(form.precioUnit)).toFixed(2)}</span></div>
                </div>
              )}
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
