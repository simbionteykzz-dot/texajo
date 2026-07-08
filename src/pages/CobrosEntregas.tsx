import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { useEsAdmin } from '../lib/useEsAdmin';
import { Download, Plus, X, FileText, Trash2, BarChart2 } from 'lucide-react';
import { CobroDiario } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';
import { newId } from '../lib/storage';
import { mockColores } from '../data';

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
  const { cobrosDiarios, clientes, productos, colores, cortes, addCobroDiario, updateCobroDiario, deleteCobroDiario } = useAppContext();
  const { addToast } = useToast();
  const esAdmin = useEsAdmin();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CobroForm>(emptyForm());
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tabla' | 'dashboard'>('tabla');
  const [dashMes, setDashMes] = useState(() => new Date().toISOString().slice(0, 7));

  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);
  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c.nombre])), [colores]);
  const corteMap = useMemo(() => new Map(cortes.map(c => [c.nCorte, c])), [cortes]);
  const coloresCanonicos = useMemo(() => {
    const canonicos = new Set(mockColores.map(c => c.nombre.toLowerCase()));
    return colores.filter(c => canonicos.has(c.nombre.toLowerCase()))
      .sort((a, b) => (a.prioridad ?? 999) - (b.prioridad ?? 999) || a.nombre.localeCompare(b.nombre));
  }, [colores]);

  // Auto-rellena campos al ingresar N° Corte
  useEffect(() => {
    const corte = corteMap.get(form.nCorte.trim());
    if (!corte) return;
    setForm(f => ({
      ...f,
      clienteId: corte.clienteId ?? f.clienteId,
      productoId: corte.productoId ?? f.productoId,
      colorId: corte.colorId ?? f.colorId,
      cantS: corte.cantS != null ? String(corte.cantS) : f.cantS,
      cantM: corte.cantM != null ? String(corte.cantM) : f.cantM,
      cantL: corte.cantL != null ? String(corte.cantL) : f.cantL,
      cantXL: corte.cantXL != null ? String(corte.cantXL) : f.cantXL,
    }));
  }, [form.nCorte, corteMap]);

  const precioUnitario = useMemo(() => {
    return productoMap.get(form.productoId)?.precioServicio ?? 0;
  }, [form.productoId, productoMap]);

  const cobrosFiltrados = useMemo(() =>
    [...cobrosDiarios]
      .filter(c =>
        (!filterEstado || c.estado === filterEstado) &&
        (!filterCliente || c.clienteId === filterCliente) &&
        (!filterMes || c.fecha.startsWith(filterMes))
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [cobrosDiarios, filterEstado, filterCliente, filterMes]);

  const totales = useMemo(() => ({
    bruto: cobrosFiltrados.reduce((s, c) => s + c.bruto, 0),
    disponible: cobrosFiltrados.reduce((s, c) => s + c.disponible90Pct, 0),
    pendiente: cobrosFiltrados.filter(c => c.estado === 'PENDIENTE').reduce((s, c) => s + c.bruto, 0),
  }), [cobrosFiltrados]);

  // Resumen por cliente (todos los cobros sin filtro de mes para vista general)
  const resumenClientes = useMemo(() => {
    const map = new Map<string, { bruto: number; pendiente: number; cobrado: number }>();
    cobrosFiltrados.forEach(c => {
      const prev = map.get(c.clienteId) ?? { bruto: 0, pendiente: 0, cobrado: 0 };
      map.set(c.clienteId, {
        bruto: prev.bruto + c.bruto,
        pendiente: prev.pendiente + (c.estado === 'PENDIENTE' ? c.bruto : 0),
        cobrado: prev.cobrado + (c.estado === 'COBRADO' ? c.bruto : 0),
      });
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, nombre: clienteMap.get(id) ?? id, ...v }))
      .sort((a, b) => b.bruto - a.bruto);
  }, [cobrosFiltrados, clienteMap]);

  const datosDashboard = useMemo(() => {
    const cobrosDelMes = cobrosDiarios.filter(c => c.fecha.startsWith(dashMes) && c.estado !== 'ANULADO');

    const porProducto = new Map<string, { cantS: number; cantM: number; cantL: number; cantXL: number; total: number; bruto: number }>();
    for (const c of cobrosDelMes) {
      const prev = porProducto.get(c.productoId) ?? { cantS: 0, cantM: 0, cantL: 0, cantXL: 0, total: 0, bruto: 0 };
      porProducto.set(c.productoId, {
        cantS: prev.cantS + c.cantS,
        cantM: prev.cantM + c.cantM,
        cantL: prev.cantL + c.cantL,
        cantXL: prev.cantXL + c.cantXL,
        total: prev.total + c.totalPrendas,
        bruto: prev.bruto + c.bruto,
      });
    }

    const porColor = new Map<string, { total: number; bruto: number }>();
    for (const c of cobrosDelMes) {
      const prev = porColor.get(c.colorId) ?? { total: 0, bruto: 0 };
      porColor.set(c.colorId, { total: prev.total + c.totalPrendas, bruto: prev.bruto + c.bruto });
    }

    const porCliente = new Map<string, { bruto: number; cobrado: number; pendiente: number }>();
    for (const c of cobrosDelMes) {
      const prev = porCliente.get(c.clienteId) ?? { bruto: 0, cobrado: 0, pendiente: 0 };
      porCliente.set(c.clienteId, {
        bruto: prev.bruto + c.bruto,
        cobrado: prev.cobrado + (c.estado === 'COBRADO' ? c.bruto : 0),
        pendiente: prev.pendiente + (c.estado === 'PENDIENTE' ? c.bruto : 0),
      });
    }

    return {
      totalPrendas: cobrosDelMes.reduce((s, c) => s + c.totalPrendas, 0),
      totalBruto: cobrosDelMes.reduce((s, c) => s + c.bruto, 0),
      porProducto: Array.from(porProducto.entries())
        .map(([id, v]) => ({ id, nombre: productoMap.get(id)?.nombre ?? id, ...v }))
        .sort((a, b) => b.bruto - a.bruto),
      porColor: Array.from(porColor.entries())
        .map(([id, v]) => ({ id, nombre: colorMap.get(id) ?? id, ...v }))
        .sort((a, b) => b.bruto - a.bruto),
      porCliente: Array.from(porCliente.entries())
        .map(([id, v]) => ({
          id,
          nombre: clienteMap.get(id) ?? id,
          ...v,
          pctCobrado: v.bruto > 0 ? (v.cobrado / v.bruto) * 100 : 0,
        }))
        .sort((a, b) => b.bruto - a.bruto),
    };
  }, [cobrosDiarios, dashMes, productoMap, colorMap, clienteMap]);

  const set = (field: keyof CobroForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.productoId) {
      addToast('Selecciona cliente y producto', 'error');
      return;
    }
    if (form.nFactura && cobrosDiarios.some(c => c.nFactura === form.nFactura.trim())) {
      addToast(`La factura ${form.nFactura} ya está registrada`, 'error');
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
      id: newId(),
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
    if (precio === 0) {
      addToast('Cobro registrado con precio S/ 0. Verifica el catálogo de productos.', 'info');
    } else {
      addToast('Cobro registrado', 'success');
    }
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
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Cobros y Entregas</h2>
          <p className="text-xs text-gray-500 mt-1">Registro de facturación y cobros al cliente</p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleInfoBox
            accent="#C4612A"
            titulo="Cobros y Entregas"
            descripcion="Registra cada entrega/factura al cliente con cantidad por talla. Calcula automáticamente el bruto, la detracción 10% y el disponible 90%. Incluye dashboard mensual con totales y estado de cobro."
            items={[
              { label: 'Precio unitario', detail: 'Se toma del precioServicio del producto seleccionado' },
              { label: 'Detracción', detail: 'Bruto × 10% → descontado automáticamente del disponible' },
              { label: 'Estados', detail: 'PENDIENTE → COBRADO / ANULADO con fecha de cobro' },
              { label: 'Dashboard mensual', detail: 'Totales de prendas, bruto, detracción y disponible por mes' },
            ]}
          />
          <button onClick={exportarCobros} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportarCobrosPdf} className="btn-secondary flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF
          </button>
          {esAdmin && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Registrar Cobro
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'tabla', label: 'Registros', Icon: FileText },
          { key: 'dashboard', label: 'Dashboard Mensual', Icon: BarChart2 },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'border-[#B66F35] text-[#B66F35]'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'tabla' && (<>
      {/* Resumen totales */}
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

      {/* Resumen por cliente */}
      {resumenClientes.length > 0 && (
        <div className="bg-white border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Resumen por Cliente</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Cliente', 'Total Facturado', 'Cobrado', 'Pendiente'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumenClientes.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{r.nombre}</td>
                    <td className="px-4 py-2 font-mono text-right">S/ {r.bruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 font-mono text-right text-green-700">S/ {r.cobrado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 font-mono text-right text-yellow-700 font-bold">S/ {r.pendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="month"
          value={filterMes}
          onChange={e => setFilterMes(e.target.value)}
          className="input-base text-xs w-36"
          placeholder="Mes"
        />
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
        {(filterMes || filterEstado || filterCliente) && (
          <button
            onClick={() => { setFilterMes(''); setFilterEstado(''); setFilterCliente(''); }}
            className="text-xs text-gray-400 hover:text-gray-700 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {cobrosFiltrados.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin cobros registrados.</p>
      ) : (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Fecha', 'N° Corte', 'Factura', 'Cliente', 'Producto', 'Color', 'Prendas', 'Precio', 'Bruto', 'Det. 10%', 'Disp. 90%', 'Estado', ''].map(h => (
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
                    <div className="flex items-center gap-2">
                      {c.fechaCobro && <span className="text-[10px] text-gray-400 font-mono">{c.fechaCobro}</span>}
                      {esAdmin && (confirmDelete === c.id ? (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <button onClick={() => { deleteCobroDiario(c.id); setConfirmDelete(null); addToast('Cobro eliminado', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                          <span className="text-gray-300">/</span>
                          <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDelete(c.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </>)}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Selector de mes + KPIs */}
          <div className="flex items-end gap-4 bg-white border border-[#DDD8CF] p-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Mes</label>
              <input
                type="month"
                value={dashMes}
                onChange={e => setDashMes(e.target.value)}
                className="input-base w-36"
              />
            </div>
            <div className="flex gap-6 ml-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Prendas</p>
                <p className="text-2xl font-black">{datosDashboard.totalPrendas.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Bruto</p>
                <p className="text-2xl font-black">S/ {datosDashboard.totalBruto.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Tabla por producto */}
          <div className="bg-white border border-gray-200">
            <div className="border-b border-gray-200 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Produccion por Producto</p>
            </div>
            {datosDashboard.porProducto.length === 0 ? (
              <p className="text-xs text-gray-400 italic px-4 py-3">Sin datos para este mes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Producto', 'S', 'M', 'L', 'XL', 'Total', 'Bruto S/.'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {datosDashboard.porProducto.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium whitespace-nowrap">{r.nombre}</td>
                        <td className="px-4 py-2 font-mono text-right">{r.cantS}</td>
                        <td className="px-4 py-2 font-mono text-right">{r.cantM}</td>
                        <td className="px-4 py-2 font-mono text-right">{r.cantL}</td>
                        <td className="px-4 py-2 font-mono text-right">{r.cantXL}</td>
                        <td className="px-4 py-2 font-mono text-right font-bold">{r.total.toLocaleString()}</td>
                        <td className="px-4 py-2 font-mono text-right font-bold">S/ {r.bruto.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabla por color */}
          <div className="bg-white border border-gray-200">
            <div className="border-b border-gray-200 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Por Color</p>
            </div>
            {datosDashboard.porColor.length === 0 ? (
              <p className="text-xs text-gray-400 italic px-4 py-3">Sin datos para este mes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Color', 'Prendas', 'Bruto S/.'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {datosDashboard.porColor.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium whitespace-nowrap">{r.nombre}</td>
                        <td className="px-4 py-2 font-mono text-right">{r.total.toLocaleString()}</td>
                        <td className="px-4 py-2 font-mono text-right font-bold">S/ {r.bruto.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabla por cliente */}
          <div className="bg-white border border-gray-200">
            <div className="border-b border-gray-200 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Cobros por Cliente</p>
            </div>
            {datosDashboard.porCliente.length === 0 ? (
              <p className="text-xs text-gray-400 italic px-4 py-3">Sin datos para este mes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Cliente', 'Facturado', 'Cobrado', 'Pendiente', '% Cobrado'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {datosDashboard.porCliente.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium whitespace-nowrap">{r.nombre}</td>
                        <td className="px-4 py-2 font-mono text-right">S/ {r.bruto.toFixed(2)}</td>
                        <td className="px-4 py-2 font-mono text-right text-green-700">S/ {r.cobrado.toFixed(2)}</td>
                        <td className="px-4 py-2 font-mono text-right text-yellow-700 font-bold">S/ {r.pendiente.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                            r.pctCobrado >= 100
                              ? 'bg-green-100 text-green-700'
                              : r.pctCobrado >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {r.pctCobrado.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                <F label="N° Corte">
                  <input
                    type="text"
                    value={form.nCorte}
                    onChange={set('nCorte')}
                    className="input-base"
                    placeholder="Auto-rellena campos"
                  />
                </F>
                <F label="N° Factura"><input type="text" value={form.nFactura} onChange={set('nFactura')} className="input-base" /></F>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Cliente">
                  <select value={form.clienteId} onChange={set('clienteId')} className="input-base" required>
                    <option value="">Seleccionar…</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </F>
                <F label="Producto">
                  <select value={form.productoId} onChange={set('productoId')} className="input-base" required>
                    <option value="">Seleccionar…</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </F>
                <F label="Color">
                  <select value={form.colorId} onChange={set('colorId')} className="input-base">
                    <option value="">—</option>
                    {coloresCanonicos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
                      {precioUnitario === 0 && (
                        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded text-[10px] font-bold">
                          <span>&#x26A0;</span>
                          <span>Precio S/ 0.00 — el cobro se registrará con bruto S/ 0. Actualiza el catálogo si es un error.</span>
                        </div>
                      )}
                      <div className="flex justify-between"><span className="text-gray-500">Total prendas</span><span className="font-mono">{total}</span></div>
                      <div className="flex justify-between font-bold"><span>Bruto</span><span className="font-mono">S/ {bruto.toFixed(2)}</span></div>
                      <div className="flex justify-between text-red-700"><span>Detracción 10%</span><span className="font-mono">- S/ {(bruto*0.10).toFixed(2)}</span></div>
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
