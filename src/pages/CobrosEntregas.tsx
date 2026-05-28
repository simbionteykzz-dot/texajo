import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, FileText } from 'lucide-react';
import { CobroDiario } from '../types';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';

const uid = () => crypto.randomUUID();

interface CobroForm {
  fecha: string; nCorte: string; nFactura: string;
  clienteId: string; productoId: string; colorId: string;
  cantS: string; cantM: string; cantL: string; cantXL: string;
  notas: string;
}

const emptyForm = (): CobroForm => ({
  fecha: new Date().toISOString().slice(0, 10), nCorte: '', nFactura: '',
  clienteId: '', productoId: '', colorId: '',
  cantS: '0', cantM: '0', cantL: '0', cantXL: '0', notas: '',
});

export function CobrosEntregas() {
  const { cobrosDiarios, clientes, productos, colores, addCobroDiario, updateCobroDiario } = useAppContext();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CobroForm>(emptyForm());
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCliente, setFilterCliente] = useState('');

  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);
  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c.nombre])), [colores]);

  const precioUnitario = useMemo(() => {
    return productoMap.get(form.productoId)?.precioServicio ?? 0;
  }, [form.productoId, productoMap]);

  const cobrosFiltrados = useMemo(() =>
    [...cobrosDiarios]
      .filter(c => (!filterEstado || c.estado === filterEstado) && (!filterCliente || c.clienteId === filterCliente))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [cobrosDiarios, filterEstado, filterCliente]);

  const totales = useMemo(() => ({
    bruto: cobrosFiltrados.reduce((s, c) => s + c.bruto, 0),
    disponible: cobrosFiltrados.reduce((s, c) => s + c.disponible90Pct, 0),
    pendiente: cobrosFiltrados.filter(c => c.estado === 'PENDIENTE').reduce((s, c) => s + c.bruto, 0),
  }), [cobrosFiltrados]);

  const set = (field: keyof CobroForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.productoId) {
      addToast('Selecciona cliente y producto', 'error');
      return;
    }
    const cantS = parseInt(form.cantS) || 0;
    const cantM = parseInt(form.cantM) || 0;
    const cantL = parseInt(form.cantL) || 0;
    const cantXL = parseInt(form.cantXL) || 0;
    const totalPrendas = cantS + cantM + cantL + cantXL;
    const precio = precioUnitario;
    const bruto = totalPrendas * precio;
    const detraccion = bruto * 0.10;

    const cobro: CobroDiario = {
      id: uid(),
      fecha: form.fecha,
      nCorte: form.nCorte,
      nFactura: form.nFactura,
      clienteId: form.clienteId,
      productoId: form.productoId,
      colorId: form.colorId,
      cantS, cantM, cantL, cantXL,
      totalPrendas,
      precioUnitario: precio,
      bruto,
      detraccion10Pct: detraccion,
      disponible90Pct: bruto - detraccion,
      estado: 'PENDIENTE',
      notas: form.notas,
    };

    addCobroDiario(cobro);
    addToast('Cobro registrado', 'success');
    setShowForm(false);
    setForm(emptyForm());
  };

  const buildRows = () => cobrosFiltrados.map((c) => ({
    Fecha: c.fecha,
    NCorte: c.nCorte,
    Factura: c.nFactura,
    Cliente: clienteMap.get(c.clienteId) ?? c.clienteId,
    Producto: productoMap.get(c.productoId)?.nombre ?? c.productoId,
    Color: colorMap.get(c.colorId) ?? c.colorId,
    Prendas: c.totalPrendas,
    PrecioUnitario: c.precioUnitario.toFixed(2),
    Bruto: c.bruto.toFixed(2),
    Detraccion: c.detraccion10Pct.toFixed(2),
    Disponible: c.disponible90Pct.toFixed(2),
    Estado: c.estado,
    FechaCobro: c.fechaCobro ?? '',
  }));

  const exportarCobros = () => {
    exportRowsToXlsx(buildRows(), `cobros_entregas_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Cobros');
    addToast('Excel exportado', 'success');
  };

  const exportarCobrosPdf = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    exportTableToPdf({
      title: 'Cobros y Entregas',
      subtitle: `Facturación y cobros al ${fecha}`,
      fileName: `cobros_entregas_${fecha}`,
      columns: [
        { header: 'Fecha', dataKey: 'Fecha' },
        { header: 'N° Corte', dataKey: 'NCorte' },
        { header: 'Factura', dataKey: 'Factura' },
        { header: 'Cliente', dataKey: 'Cliente' },
        { header: 'Producto', dataKey: 'Producto' },
        { header: 'Color', dataKey: 'Color' },
        { header: 'Prendas', dataKey: 'Prendas' },
        { header: 'Precio Unit.', dataKey: 'PrecioUnitario' },
        { header: 'Bruto S/.', dataKey: 'Bruto' },
        { header: 'Det. 10%', dataKey: 'Detraccion' },
        { header: 'Disp. 90%', dataKey: 'Disponible' },
        { header: 'Estado', dataKey: 'Estado' },
        { header: 'Fecha Cobro', dataKey: 'FechaCobro' },
      ],
      rows: buildRows(),
      rightCols: ['PrecioUnitario', 'Bruto', 'Detraccion', 'Disponible'],
      centerCols: ['Prendas', 'Estado'],
    });
    addToast('PDF exportado', 'success');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Cobros y Entregas</h2>
          <p className="text-xs text-gray-500 mt-1">Registro de facturaciÃ³n y cobros al cliente</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarCobros} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportarCobrosPdf} className="btn-secondary flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Registrar Cobro
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Facturado', val: totales.bruto },
          { label: 'Disponible 90%', val: totales.disponible },
          { label: 'Pendiente de Cobro', val: totales.pendiente },
        ].map(item => (
          <div key={item.label} className="bg-white border border-gray-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</p>
            <p className="text-2xl font-black mt-1">S/ {item.val.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="input-base text-xs w-36">
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="COBRADO">Cobrado</option>
          <option value="ANULADO">Anulado</option>
        </select>
        <select value={filterCliente} onChange={e => setFilterCliente(e.target.value)} className="input-base text-xs w-40">
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {cobrosFiltrados.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin cobros registrados.</p>
      ) : (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Fecha', 'NÂ° Corte', 'Factura', 'Cliente', 'Producto', 'Color', 'Prendas', 'Precio', 'Bruto', 'Det. 10%', 'Disp. 90%', 'Estado', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cobrosFiltrados.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 ${c.estado === 'ANULADO' ? 'opacity-40 line-through' : ''}`}>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">{c.fecha}</td>
                  <td className="px-3 py-2 font-mono">{c.nCorte}</td>
                  <td className="px-3 py-2 font-mono">{c.nFactura}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{clienteMap.get(c.clienteId) ?? c.clienteId}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{productoMap.get(c.productoId)?.nombre ?? c.productoId}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{colorMap.get(c.colorId) ?? c.colorId}</td>
                  <td className="px-3 py-2 font-mono text-right">{c.totalPrendas}</td>
                  <td className="px-3 py-2 font-mono text-right">{c.precioUnitario.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-right font-bold">{c.bruto.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-right text-red-700">{c.detraccion10Pct.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-right text-green-700">{c.disponible90Pct.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={c.estado}
                      onChange={e => {
                        const estado = e.target.value as CobroDiario['estado'];
                        updateCobroDiario(c.id, {
                          estado,
                          fechaCobro: estado === 'COBRADO' ? new Date().toISOString().slice(0, 10) : undefined,
                        });
                      }}
                      className={`text-[10px] font-bold uppercase border-0 bg-transparent cursor-pointer ${
                        c.estado === 'COBRADO' ? 'text-green-700' :
                        c.estado === 'ANULADO' ? 'text-red-500' : 'text-yellow-700'
                      }`}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="COBRADO">Cobrado</option>
                      <option value="ANULADO">Anulado</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {c.fechaCobro && <span className="text-[10px] text-gray-400 font-mono">{c.fechaCobro}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gray-300 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest">Registrar Cobro</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <F label="Fecha"><input type="date" value={form.fecha} onChange={set('fecha')} className="input-base" required /></F>
                <F label="NÂ° Corte"><input type="text" value={form.nCorte} onChange={set('nCorte')} className="input-base" /></F>
                <F label="NÂ° Factura"><input type="text" value={form.nFactura} onChange={set('nFactura')} className="input-base" /></F>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Cliente">
                  <select value={form.clienteId} onChange={set('clienteId')} className="input-base" required>
                    <option value="">Seleccionarâ€¦</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </F>
                <F label="Producto">
                  <select value={form.productoId} onChange={set('productoId')} className="input-base" required>
                    <option value="">Seleccionarâ€¦</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </F>
                <F label="Color">
                  <select value={form.colorId} onChange={set('colorId')} className="input-base">
                    <option value="">â€”</option>
                    {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </F>
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
              </div>
              {form.productoId && (
                <div className="bg-gray-50 border border-gray-200 p-3 space-y-1 text-xs">
                  {(() => {
                    const total = (parseInt(form.cantS)||0)+(parseInt(form.cantM)||0)+(parseInt(form.cantL)||0)+(parseInt(form.cantXL)||0);
                    const bruto = total * precioUnitario;
                    return <>
                      <div className="flex justify-between"><span className="text-gray-500">Precio unitario</span><span className="font-mono">S/ {precioUnitario.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Total prendas</span><span className="font-mono">{total}</span></div>
                      <div className="flex justify-between font-bold"><span>Bruto</span><span className="font-mono">S/ {bruto.toFixed(2)}</span></div>
                      <div className="flex justify-between text-red-700"><span>DetracciÃ³n 10%</span><span className="font-mono">- S/ {(bruto*0.10).toFixed(2)}</span></div>
                      <div className="flex justify-between text-green-700 font-bold"><span>Disponible 90%</span><span className="font-mono">S/ {(bruto*0.90).toFixed(2)}</span></div>
                    </>;
                  })()}
                </div>
              )}
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
