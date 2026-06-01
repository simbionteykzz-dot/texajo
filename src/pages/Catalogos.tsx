import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Plus, X, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { CategoriaColor, Operario, TipoComplemento, RecetaComplemento } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';

const TIPOS_COMPLEMENTO: TipoComplemento[] = ['CUELLO', 'PUÑO', 'PRETINA'];

const uid = () => crypto.randomUUID();

type Tab = 'productos' | 'telas' | 'colores' | 'operarios' | 'tarifas' | 'clientes' | 'proveedores' | 'tejidos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'productos', label: 'Productos' },
  { id: 'telas', label: 'Telas' },
  { id: 'colores', label: 'Colores' },
  { id: 'operarios', label: 'Operarios' },
  { id: 'tarifas', label: 'Tarifas' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'tejidos', label: 'Precios Tej.' },
];

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function Catalogos() {
  const {
    productos, addProducto, updateProducto, deleteProducto,
    telas, addTela, updateTela, deleteTela,
    colores, addColor, updateColor, deleteColor,
    operarios, addOperario, updateOperario,
    tarifasOperaciones, addTarifaOperacion, updateTarifaOperacion, deleteTarifaOperacion,
    clientes, addCliente, updateCliente,
    proveedores, addProveedor, updateProveedor,
    preciosTejeduria, addPrecioTejeduria, updatePrecioTejeduria, deletePrecioTejeduria,
  } = useAppContext();
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>('productos');

  // --- Telas ---
  const [showTelaForm, setShowTelaForm] = useState(false);
  const [telaForm, setTelaForm] = useState({ nombre: '', composicion: '', kgPorRollo: '20', notas: '' });

  const handleAddTela = (e: React.FormEvent) => {
    e.preventDefault();
    if (!telaForm.nombre) { addToast('Nombre requerido', 'error'); return; }
    addTela({ id: uid(), nombre: telaForm.nombre, composicion: telaForm.composicion, kgPorRollo: parseFloat(telaForm.kgPorRollo) || 20, notas: telaForm.notas });
    addToast('Tela agregada', 'success');
    setShowTelaForm(false);
    setTelaForm({ nombre: '', composicion: '', kgPorRollo: '20', notas: '' });
  };

  // --- Colores ---
  const [showColorForm, setShowColorForm] = useState(false);
  const [colorForm, setColorForm] = useState({ nombre: '', categoria: 'OSCURO' as CategoriaColor, prioridad: '99', notas: '' });

  const handleAddColor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colorForm.nombre) { addToast('Nombre requerido', 'error'); return; }
    addColor({ id: uid(), nombre: colorForm.nombre, categoria: colorForm.categoria, prioridad: parseInt(colorForm.prioridad) || 99, notas: colorForm.notas });
    addToast('Color agregado', 'success');
    setShowColorForm(false);
    setColorForm({ nombre: '', categoria: 'OSCURO', prioridad: '99', notas: '' });
  };

  // --- Productos ---
  const [showProdForm, setShowProdForm] = useState(false);
  const [prodForm, setProdForm] = useState({ nombre: '', notas: '' });
  const [expandedProd, setExpandedProd] = useState<string | null>(null);
  const [recetaForms, setRecetaForms] = useState<Record<string, { tipoComplemento: TipoComplemento; origen: string; cantidad: string; notas: string }>>({});
  // Auto-calc state per product
  const [calcForms, setCalcForms] = useState<Record<string, { margen: string; detraccion: string }>>({});

  const handleAddProducto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.nombre) { addToast('Nombre requerido', 'error'); return; }
    addProducto({ id: uid(), nombre: prodForm.nombre, costoMoTotal: 0, precioServicio: 0, notas: prodForm.notas });
    addToast('Producto agregado', 'success');
    setShowProdForm(false);
    setProdForm({ nombre: '', notas: '' });
  };

  // --- Tarifas ---
  const [showTarifaForm, setShowTarifaForm] = useState(false);
  const [tarifaForm, setTarifaForm] = useState({ productoId: '', orden: '1', operacion: '', tarifa: '0', notas: '' });

  const handleAddTarifa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarifaForm.productoId || !tarifaForm.operacion) { addToast('Producto y operación requeridos', 'error'); return; }
    const prod = productos.find(p => p.id === tarifaForm.productoId);
    const orden = parseInt(tarifaForm.orden) || 1;
    addTarifaOperacion({
      id: uid(),
      productoId: tarifaForm.productoId,
      orden,
      operacion: tarifaForm.operacion,
      tarifa: parseFloat(tarifaForm.tarifa) || 0,
      notas: tarifaForm.notas,
      clave: `${prod?.nombre ?? tarifaForm.productoId}|${orden}`,
    });
    addToast('Tarifa agregada', 'success');
    setShowTarifaForm(false);
    setTarifaForm({ productoId: '', orden: '1', operacion: '', tarifa: '0', notas: '' });
  };

  // --- Operarios ---
  const [showOpForm, setShowOpForm] = useState(false);
  const [opForm, setOpForm] = useState({ codigo: '', nombre: '' });

  const handleAddOperario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opForm.codigo || !opForm.nombre) { addToast('Código y nombre requeridos', 'error'); return; }
    addOperario({ id: uid(), codigo: opForm.codigo, nombre: opForm.nombre, estado: 'ACTIVO' });
    addToast('Operario agregado', 'success');
    setShowOpForm(false);
    setOpForm({ codigo: '', nombre: '' });
  };

  // --- Clientes ---
  const [showCliForm, setShowCliForm] = useState(false);
  const [cliForm, setCliForm] = useState({ nombre: '', contacto: '', notas: '' });

  const handleAddCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliForm.nombre) { addToast('Nombre requerido', 'error'); return; }
    addCliente({ id: uid(), nombre: cliForm.nombre, contacto: cliForm.contacto, notas: cliForm.notas });
    addToast('Cliente agregado', 'success');
    setShowCliForm(false);
    setCliForm({ nombre: '', contacto: '', notas: '' });
  };

  // --- Proveedores ---
  const [showProvForm, setShowProvForm] = useState(false);
  const [provForm, setProvForm] = useState({ nombre: '', ruc: '', contacto: '', tipo: 'TELA' as any });

  const handleAddProveedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provForm.nombre) { addToast('Nombre requerido', 'error'); return; }
    addProveedor({ id: uid(), nombre: provForm.nombre, ruc: provForm.ruc, contacto: provForm.contacto, tipo: provForm.tipo });
    addToast('Proveedor agregado', 'success');
    setShowProvForm(false);
    setProvForm({ nombre: '', ruc: '', contacto: '', tipo: 'TELA' });
  };

  // --- Precios Tejeduría ---
  const [showTejForm, setShowTejForm] = useState(false);
  const [tejForm, setTejForm] = useState({ tipoTejido: '', precioKg: '' });

  const handleAddTejido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tejForm.tipoTejido) { addToast('Tipo de tejido requerido', 'error'); return; }
    addPrecioTejeduria({ id: uid(), tipoTejido: tejForm.tipoTejido, precioKg: parseFloat(tejForm.precioKg) || 0 });
    addToast('Precio de tejido agregado', 'success');
    setShowTejForm(false);
    setTejForm({ tipoTejido: '', precioKg: '' });
  };

  const productoMap = new Map(productos.map(p => [p.id, p.nombre]));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Costos y Catálogos</h2>
            <p className="text-xs text-gray-500 mt-1">Catálogos maestros del sistema</p>
          </div>
          <ModuleInfoBox
            accent="#B89B5E"
            titulo="Costos y Catálogos"
            descripcion="Administra todos los catálogos maestros del sistema: productos con receta de complementos y cálculo automático de precio de servicio, telas, colores, operarios, tarifas de operación, clientes, proveedores y precios de tejeduría."
            items={[
              { label: 'Productos', detail: 'Receta de complementos expandible + cálculo precioServicio = costoMO × (1+margen) / (1−detracción)' },
              { label: 'Operarios', detail: 'Código, módulo, máquina, estado ACTIVO/INACTIVO y fecha de ingreso' },
              { label: 'Tarifas', detail: 'Costo por operación agrupado por producto y ordenado por secuencia' },
              { label: 'Precios Tej.', detail: 'Tarifa S/./kg pagada a Zurzam por tipo de tejido (Jersey, Rib, etc.)' },
            ]}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-300 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* PRODUCTOS */}
      {tab === 'productos' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowProdForm(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="h-3 w-3" /> Agregar Producto
            </button>
          </div>
          <div className="texajo-table-shell">
            <div className="texajo-table-scroll">
              <table className="texajo-table">
                <thead>
                  <tr>
                    {['', 'Producto', 'Costo MO Total', 'Precio Servicio', 'Utilidad S/.', 'Tela Base', 'Lím. Consumo (kg/prenda)', 'Rend. mínimo (prendas/rollo)', 'PropS', 'PropM', 'PropL', 'PropXL', 'Notas', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productos.map(p => {
                    const isOpen = expandedProd === p.id;
                    const receta = p.recetaComplementos ?? [];
                    const calcF = calcForms[p.id] ?? { margen: '', detraccion: '10' };
                    return (
                      <React.Fragment key={p.id}>
                        <tr>
                          <td className="w-6 px-1">
                            <button
                              type="button"
                              onClick={() => setExpandedProd(isOpen ? null : p.id)}
                              className="text-gray-400 hover:text-gray-700"
                              title="Receta complementos"
                            >
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                          <td className="font-bold whitespace-nowrap">
                            {p.nombre}
                            {receta.length > 0 && (
                              <span className="ml-1 text-[10px] text-blue-600 font-normal">{receta.length} compl.</span>
                            )}
                          </td>
                          <td>
                            <input type="number" min={0} step={0.01} value={p.costoMoTotal}
                              onChange={e => updateProducto(p.id, { costoMoTotal: parseFloat(e.target.value) || 0 })}
                              className="w-24 input-base text-right text-xs py-0.5" />
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <input type="number" min={0} step={0.01} value={p.precioServicio}
                                onChange={e => updateProducto(p.id, { precioServicio: parseFloat(e.target.value) || 0 })}
                                className="w-24 input-base text-right text-xs py-0.5" />
                              <button
                                type="button"
                                title="Calcular precio automático"
                                onClick={() => setExpandedProd(isOpen ? p.id : p.id)}
                                className="text-[10px] text-blue-500 hover:text-blue-700 font-bold px-1"
                              >calc</button>
                            </div>
                          </td>
                          <td className={`font-mono font-bold text-right pr-3 ${p.precioServicio - p.costoMoTotal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {(p.precioServicio - p.costoMoTotal).toFixed(3)}
                          </td>
                          <td>
                            <input type="text" value={p.telaBase ?? ''}
                              onChange={e => updateProducto(p.id, { telaBase: e.target.value || undefined })}
                              className="w-36 input-base text-xs py-0.5" placeholder="Ej: Jersey 24/1" />
                          </td>
                          <td>
                            <input type="number" step="0.001" min={0} value={p.limiteConsumo ?? ''}
                              onChange={e => updateProducto(p.id, { limiteConsumo: e.target.value ? parseFloat(e.target.value) : undefined })}
                              className="w-28 input-base text-right text-xs py-0.5" placeholder="0.000" />
                          </td>
                          <td>
                            <input type="number" step="1" min={0} value={p.limiteRendimiento ?? ''}
                              onChange={e => updateProducto(p.id, { limiteRendimiento: e.target.value ? parseFloat(e.target.value) : undefined })}
                              className="w-28 input-base text-right text-xs py-0.5" placeholder="0" />
                          </td>
                          {(['propS','propM','propL','propXL'] as const).map(field => (
                            <td key={field}>
                              <input type="number" step="1" min={0} value={p[field] ?? ''}
                                onChange={e => updateProducto(p.id, { [field]: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="w-16 input-base text-center text-xs py-0.5 bg-blue-50 border-blue-200" placeholder="0" />
                            </td>
                          ))}
                          <td>
                            <input type="text" value={p.notas}
                              onChange={e => updateProducto(p.id, { notas: e.target.value })}
                              className="w-48 input-base text-xs py-0.5" />
                          </td>
                          <td>
                            <button onClick={() => { if (confirm(`¿Eliminar producto "${p.nombre}"? Se eliminarán sus tarifas.`)) deleteProducto(p.id); }}
                              className="text-red-400 hover:text-red-700 p-1"><Trash2 className="h-3 w-3" /></button>
                          </td>
                        </tr>

                        {/* Expanded: Receta complementos + auto-calc precioServicio */}
                        {isOpen && (
                          <tr>
                            <td colSpan={14} className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                              <div className="flex flex-col gap-4">

                                {/* Auto-calc precioServicio */}
                                <div className="border border-blue-200 bg-blue-50 p-3">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-2">Calcular Precio de Servicio</p>
                                  <p className="text-[10px] text-gray-500 mb-2">
                                    Fórmula: PrecioServicio = costoMO × (1 + margen%) ÷ (1 − detracción%)
                                  </p>
                                  <div className="flex items-end gap-3 flex-wrap">
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Costo MO (S/.)</label>
                                      <input type="number" readOnly value={p.costoMoTotal} className="w-20 input-base text-right text-xs py-0.5 bg-gray-100" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Margen (%)</label>
                                      <input type="number" min={0} step={1} value={calcF.margen}
                                        onChange={e => setCalcForms(f => ({ ...f, [p.id]: { ...calcF, margen: e.target.value } }))}
                                        className="w-20 input-base text-right text-xs py-0.5" placeholder="30" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Detracción (%)</label>
                                      <input type="number" min={0} max={99} step={1} value={calcF.detraccion}
                                        onChange={e => setCalcForms(f => ({ ...f, [p.id]: { ...calcF, detraccion: e.target.value } }))}
                                        className="w-20 input-base text-right text-xs py-0.5" placeholder="10" />
                                    </div>
                                    {calcF.margen !== '' && (() => {
                                      const margen = parseFloat(calcF.margen) / 100;
                                      const detrac = parseFloat(calcF.detraccion || '0') / 100;
                                      if (detrac >= 1) return null;
                                      const precio = (p.costoMoTotal * (1 + margen)) / (1 - detrac);
                                      return (
                                        <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Resultado</label>
                                          <div className="flex items-center gap-2">
                                            <span className="font-black text-blue-700 text-sm">S/ {precio.toFixed(3)}</span>
                                            <button
                                              type="button"
                                              onClick={() => { updateProducto(p.id, { precioServicio: parseFloat(precio.toFixed(3)) }); addToast('Precio actualizado', 'success'); }}
                                              className="text-[10px] font-bold uppercase border border-blue-400 text-blue-700 hover:bg-blue-100 px-2 py-1"
                                            >Aplicar</button>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Receta complementos */}
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Receta de Complementos por Prenda</p>
                                  {receta.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic mb-2">Sin complementos definidos.</p>
                                  ) : (
                                    <table className="text-xs mb-3">
                                      <thead>
                                        <tr className="border-b border-gray-200">
                                          {['Tipo', 'Origen', 'Cant./Prenda', 'Notas', ''].map(h => (
                                            <th key={h} className="text-left px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {receta.map((r, idx) => (
                                          <tr key={idx} className="border-b border-gray-100">
                                            <td className="px-2 py-1 font-bold">{r.tipoComplemento}</td>
                                            <td className="px-2 py-1">{r.origen}</td>
                                            <td className="px-2 py-1 font-mono text-right">{r.cantidad}</td>
                                            <td className="px-2 py-1 text-gray-500">{r.notas}</td>
                                            <td className="px-2 py-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newReceta = receta.filter((_, i) => i !== idx);
                                                  updateProducto(p.id, { recetaComplementos: newReceta });
                                                }}
                                                className="text-red-400 hover:text-red-700"
                                              ><X className="h-3 w-3" /></button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}

                                  {/* Inline add form */}
                                  {(() => {
                                    const rf = recetaForms[p.id] ?? { tipoComplemento: 'CUELLO' as TipoComplemento, origen: 'COMPRA', cantidad: '1', notas: '' };
                                    return (
                                      <div className="flex items-end gap-2 flex-wrap">
                                        <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Tipo</label>
                                          <select value={rf.tipoComplemento}
                                            onChange={e => setRecetaForms(f => ({ ...f, [p.id]: { ...rf, tipoComplemento: e.target.value as TipoComplemento } }))}
                                            className="input-base text-xs py-0.5 w-28">
                                            {TIPOS_COMPLEMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Origen</label>
                                          <select value={rf.origen}
                                            onChange={e => setRecetaForms(f => ({ ...f, [p.id]: { ...rf, origen: e.target.value } }))}
                                            className="input-base text-xs py-0.5 w-32">
                                            <option value="COMPRA">COMPRA</option>
                                            <option value="CORTE_INTERNO">CORTE_INTERNO</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Cant.</label>
                                          <input type="number" min={1} step={1} value={rf.cantidad}
                                            onChange={e => setRecetaForms(f => ({ ...f, [p.id]: { ...rf, cantidad: e.target.value } }))}
                                            className="w-16 input-base text-right text-xs py-0.5" />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Notas</label>
                                          <input type="text" value={rf.notas}
                                            onChange={e => setRecetaForms(f => ({ ...f, [p.id]: { ...rf, notas: e.target.value } }))}
                                            className="w-36 input-base text-xs py-0.5" />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newEntry: RecetaComplemento = {
                                              tipoComplemento: rf.tipoComplemento,
                                              origen: rf.origen,
                                              cantidad: parseFloat(rf.cantidad) || 1,
                                              notas: rf.notas,
                                            };
                                            updateProducto(p.id, { recetaComplementos: [...receta, newEntry] });
                                            setRecetaForms(f => ({ ...f, [p.id]: { tipoComplemento: 'CUELLO', origen: 'COMPRA', cantidad: '1', notas: '' } }));
                                            addToast('Complemento agregado', 'success');
                                          }}
                                          className="btn-primary text-xs py-1 px-3 flex items-center gap-1 self-end"
                                        ><Plus className="h-3 w-3" /> Agregar</button>
                                      </div>
                                    );
                                  })()}
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {showProdForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border border-gray-300 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Producto</h3>
                  <button onClick={() => setShowProdForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddProducto} className="p-6 space-y-4">
                  <F label="Nombre"><input type="text" value={prodForm.nombre} onChange={e => setProdForm(f => ({ ...f, nombre: e.target.value }))} className="input-base" required /></F>
                  <F label="Notas"><input type="text" value={prodForm.notas} onChange={e => setProdForm(f => ({ ...f, notas: e.target.value }))} className="input-base" /></F>
                  <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowProdForm(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Guardar</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TELAS */}
      {tab === 'telas' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowTelaForm(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="h-3 w-3" /> Agregar Tela
            </button>
          </div>
          <div className="texajo-table-shell">
            <div className="texajo-table-scroll">
              <table className="texajo-table">
                <thead>
                  <tr>
                    {['Tela', 'Composición', 'Kg/Rollo', 'Notas', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {telas.map(t => (
                    <tr key={t.id}>
                      <td className="font-bold">{t.nombre}</td>
                      <td>
                        <input type="text" value={t.composicion}
                          onChange={e => updateTela(t.id, { composicion: e.target.value })}
                          className="w-40 input-base text-xs py-0.5" />
                      </td>
                      <td>
                        <input type="number" min={0} step={0.5} value={t.kgPorRollo}
                          onChange={e => updateTela(t.id, { kgPorRollo: parseFloat(e.target.value) || 20 })}
                          className="w-20 input-base text-right text-xs py-0.5" />
                      </td>
                      <td>
                        <input type="text" value={t.notas}
                          onChange={e => updateTela(t.id, { notas: e.target.value })}
                          className="w-48 input-base text-xs py-0.5" />
                      </td>
                      <td>
                        <button onClick={() => { if (confirm(`¿Eliminar tela "${t.nombre}"?`)) deleteTela(t.id); }}
                          className="text-red-400 hover:text-red-700 p-1"><Trash2 className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showTelaForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border border-gray-300 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Nueva Tela</h3>
                  <button onClick={() => setShowTelaForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddTela} className="p-6 space-y-4">
                  <F label="Nombre"><input type="text" value={telaForm.nombre} onChange={e => setTelaForm(f => ({ ...f, nombre: e.target.value }))} className="input-base" placeholder="Ej: Jersey 24/1" required /></F>
                  <F label="Composición"><input type="text" value={telaForm.composicion} onChange={e => setTelaForm(f => ({ ...f, composicion: e.target.value }))} className="input-base" placeholder="Ej: 100% Algodón" /></F>
                  <F label="Kg/Rollo"><input type="number" step="0.5" min={0} value={telaForm.kgPorRollo} onChange={e => setTelaForm(f => ({ ...f, kgPorRollo: e.target.value }))} className="input-base" /></F>
                  <F label="Notas"><input type="text" value={telaForm.notas} onChange={e => setTelaForm(f => ({ ...f, notas: e.target.value }))} className="input-base" /></F>
                  <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowTelaForm(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Guardar</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COLORES */}
      {tab === 'colores' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowColorForm(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="h-3 w-3" /> Agregar Color
            </button>
          </div>
          <div className="texajo-table-shell">
            <div className="texajo-table-scroll">
              <table className="texajo-table">
                <thead>
                  <tr>
                    {['Color', 'Categoría', 'Prioridad', 'Notas', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...colores].sort((a, b) => a.prioridad - b.prioridad).map(c => (
                    <tr key={c.id}>
                      <td className="font-bold">{c.nombre}</td>
                      <td>
                        <select value={c.categoria}
                          onChange={e => updateColor(c.id, { categoria: e.target.value as CategoriaColor })}
                          className="input-base text-xs py-0.5">
                          {['OSCURO','CLARO','MELANGE','PPT'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" min={1} value={c.prioridad}
                          onChange={e => updateColor(c.id, { prioridad: parseInt(e.target.value) || 1 })}
                          className="w-16 input-base text-right text-xs py-0.5" />
                      </td>
                      <td>
                        <input type="text" value={c.notas}
                          onChange={e => updateColor(c.id, { notas: e.target.value })}
                          className="w-48 input-base text-xs py-0.5" />
                      </td>
                      <td>
                        <button onClick={() => { if (confirm(`¿Eliminar color "${c.nombre}"?`)) deleteColor(c.id); }}
                          className="text-red-400 hover:text-red-700 p-1"><Trash2 className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showColorForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border border-gray-300 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Color</h3>
                  <button onClick={() => setShowColorForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddColor} className="p-6 space-y-4">
                  <F label="Nombre"><input type="text" value={colorForm.nombre} onChange={e => setColorForm(f => ({ ...f, nombre: e.target.value }))} className="input-base" required /></F>
                  <F label="Categoría">
                    <select value={colorForm.categoria} onChange={e => setColorForm(f => ({ ...f, categoria: e.target.value as CategoriaColor }))} className="input-base">
                      {['OSCURO','CLARO','MELANGE','PPT'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </F>
                  <F label="Prioridad"><input type="number" min={1} value={colorForm.prioridad} onChange={e => setColorForm(f => ({ ...f, prioridad: e.target.value }))} className="input-base" /></F>
                  <F label="Notas"><input type="text" value={colorForm.notas} onChange={e => setColorForm(f => ({ ...f, notas: e.target.value }))} className="input-base" /></F>
                  <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowColorForm(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Guardar</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OPERARIOS */}
      {tab === 'operarios' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowOpForm(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="h-3 w-3" /> Agregar Operario
            </button>
          </div>
          <div className="texajo-table-shell">
            <div className="texajo-table-scroll">
              <table className="texajo-table">
                <thead>
                  <tr>
                    {['Código', 'Nombre', 'Módulo', 'Máquina', 'Estado'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...operarios].sort((a, b) => a.codigo.localeCompare(b.codigo)).map(o => (
                    <tr key={o.id}>
                      <td className="font-mono font-bold">{o.codigo}</td>
                      <td>
                        <input type="text" value={o.nombre}
                          onChange={e => updateOperario(o.id, { nombre: e.target.value })}
                          className="w-52 input-base text-xs py-0.5" />
                      </td>
                      <td>
                        <input type="text" value={o.modulo ?? ''}
                          onChange={e => updateOperario(o.id, { modulo: e.target.value || undefined })}
                          className="w-24 input-base text-xs py-0.5" placeholder="M1" />
                      </td>
                      <td>
                        <input type="text" value={o.maquina ?? ''}
                          onChange={e => updateOperario(o.id, { maquina: e.target.value || undefined })}
                          className="w-24 input-base text-xs py-0.5" placeholder="MQ01" />
                      </td>
                      <td>
                        <select value={o.estado}
                          onChange={e => updateOperario(o.id, { estado: e.target.value as Operario['estado'] })}
                          className={`input-base text-xs py-0.5 font-bold uppercase ${o.estado === 'ACTIVO' ? 'text-green-700' : 'text-gray-400'}`}>
                          <option value="ACTIVO">ACTIVO</option>
                          <option value="INACTIVO">INACTIVO</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showOpForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border border-gray-300 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Operario</h3>
                  <button onClick={() => setShowOpForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddOperario} className="p-6 space-y-4">
                  <F label="Código"><input type="text" value={opForm.codigo} onChange={e => setOpForm(f => ({ ...f, codigo: e.target.value }))} className="input-base" placeholder="OP025" required /></F>
                  <F label="Nombre Completo"><input type="text" value={opForm.nombre} onChange={e => setOpForm(f => ({ ...f, nombre: e.target.value }))} className="input-base" required /></F>
                  <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowOpForm(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Guardar</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TARIFAS */}
      {tab === 'tarifas' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowTarifaForm(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="h-3 w-3" /> Agregar Tarifa
            </button>
          </div>
          <div className="texajo-table-shell">
            <div className="texajo-table-scroll">
              <table className="texajo-table">
                <thead>
                  <tr>
                    {['Producto', 'Orden', 'Operación', 'Tarifa S/.', 'Notas', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...tarifasOperaciones]
                    .sort((a, b) => (productoMap.get(a.productoId) ?? '').localeCompare(productoMap.get(b.productoId) ?? '') || a.orden - b.orden)
                    .map(t => (
                      <tr key={t.id}>
                        <td className="text-gray-500">{productoMap.get(t.productoId)}</td>
                        <td className="font-mono text-center">{t.orden}</td>
                        <td className="font-bold">{t.operacion}</td>
                        <td>
                          <input type="number" min={0} step={0.001} value={t.tarifa}
                            onChange={e => updateTarifaOperacion(t.id, { tarifa: parseFloat(e.target.value) || 0 })}
                            className="w-24 input-base text-right text-xs py-0.5" />
                        </td>
                        <td>
                          <input type="text" value={t.notas}
                            onChange={e => updateTarifaOperacion(t.id, { notas: e.target.value })}
                            className="w-40 input-base text-xs py-0.5" />
                        </td>
                        <td>
                          <button onClick={() => { if (confirm(`¿Eliminar tarifa "${t.operacion}"?`)) deleteTarifaOperacion(t.id); }}
                            className="text-red-400 hover:text-red-700 p-1"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {showTarifaForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border border-gray-300 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Nueva Tarifa</h3>
                  <button onClick={() => setShowTarifaForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddTarifa} className="p-6 space-y-4">
                  <F label="Producto">
                    <select value={tarifaForm.productoId} onChange={e => setTarifaForm(f => ({ ...f, productoId: e.target.value }))} className="input-base" required>
                      <option value="">Seleccionar...</option>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </F>
                  <F label="Orden"><input type="number" min={1} value={tarifaForm.orden} onChange={e => setTarifaForm(f => ({ ...f, orden: e.target.value }))} className="input-base" /></F>
                  <F label="Operación"><input type="text" value={tarifaForm.operacion} onChange={e => setTarifaForm(f => ({ ...f, operacion: e.target.value }))} className="input-base" placeholder="Ej: COSTURA PRINCIPAL" required /></F>
                  <F label="Tarifa S/."><input type="number" step="0.001" min={0} value={tarifaForm.tarifa} onChange={e => setTarifaForm(f => ({ ...f, tarifa: e.target.value }))} className="input-base" /></F>
                  <F label="Notas"><input type="text" value={tarifaForm.notas} onChange={e => setTarifaForm(f => ({ ...f, notas: e.target.value }))} className="input-base" /></F>
                  <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowTarifaForm(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Guardar</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CLIENTES */}
      {tab === 'clientes' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowCliForm(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="h-3 w-3" /> Agregar Cliente
            </button>
          </div>
          <div className="texajo-table-shell">
            <div className="texajo-table-scroll">
              <table className="texajo-table">
                <thead>
                  <tr>
                    {['Nombre', 'Contacto', 'Notas'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id}>
                      <td>
                        <input type="text" value={c.nombre}
                          onChange={e => updateCliente(c.id, { nombre: e.target.value })}
                          className="w-40 input-base text-xs py-0.5 font-bold" />
                      </td>
                      <td>
                        <input type="text" value={c.contacto}
                          onChange={e => updateCliente(c.id, { contacto: e.target.value })}
                          className="w-48 input-base text-xs py-0.5" />
                      </td>
                      <td>
                        <input type="text" value={c.notas}
                          onChange={e => updateCliente(c.id, { notas: e.target.value })}
                          className="w-48 input-base text-xs py-0.5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showCliForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border border-gray-300 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Cliente</h3>
                  <button onClick={() => setShowCliForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddCliente} className="p-6 space-y-4">
                  <F label="Nombre"><input type="text" value={cliForm.nombre} onChange={e => setCliForm(f => ({ ...f, nombre: e.target.value }))} className="input-base" required /></F>
                  <F label="Contacto"><input type="text" value={cliForm.contacto} onChange={e => setCliForm(f => ({ ...f, contacto: e.target.value }))} className="input-base" /></F>
                  <F label="Notas"><input type="text" value={cliForm.notas} onChange={e => setCliForm(f => ({ ...f, notas: e.target.value }))} className="input-base" /></F>
                  <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowCliForm(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Guardar</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROVEEDORES */}
      {tab === 'proveedores' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowProvForm(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="h-3 w-3" /> Agregar Proveedor
            </button>
          </div>
          <div className="texajo-table-shell">
            <div className="texajo-table-scroll">
              <table className="texajo-table">
                <thead>
                  <tr>
                    {['Nombre', 'RUC', 'Contacto', 'Tipo'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proveedores.map(p => (
                    <tr key={p.id}>
                      <td>
                        <input type="text" value={p.nombre}
                          onChange={e => updateProveedor(p.id, { nombre: e.target.value })}
                          className="w-40 input-base text-xs py-0.5 font-bold" />
                      </td>
                      <td>
                        <input type="text" value={p.ruc}
                          onChange={e => updateProveedor(p.id, { ruc: e.target.value })}
                          className="w-28 input-base text-xs py-0.5 font-mono" />
                      </td>
                      <td>
                        <input type="text" value={p.contacto}
                          onChange={e => updateProveedor(p.id, { contacto: e.target.value })}
                          className="w-44 input-base text-xs py-0.5" />
                      </td>
                      <td>
                        <select value={p.tipo}
                          onChange={e => updateProveedor(p.id, { tipo: e.target.value as any })}
                          className="input-base text-xs py-0.5">
                          {['TELA','COMPLEMENTO','HILO','SERVICIO','ZURZAM'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showProvForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border border-gray-300 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Proveedor</h3>
                  <button onClick={() => setShowProvForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddProveedor} className="p-6 space-y-4">
                  <F label="Nombre"><input type="text" value={provForm.nombre} onChange={e => setProvForm(f => ({ ...f, nombre: e.target.value }))} className="input-base" required /></F>
                  <F label="RUC"><input type="text" value={provForm.ruc} onChange={e => setProvForm(f => ({ ...f, ruc: e.target.value }))} className="input-base" /></F>
                  <F label="Contacto"><input type="text" value={provForm.contacto} onChange={e => setProvForm(f => ({ ...f, contacto: e.target.value }))} className="input-base" /></F>
                  <F label="Tipo">
                    <select value={provForm.tipo} onChange={e => setProvForm(f => ({ ...f, tipo: e.target.value }))} className="input-base">
                      {['TELA','COMPLEMENTO','HILO','SERVICIO','ZURZAM'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </F>
                  <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowProvForm(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Guardar</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TEJIDOS */}
      {tab === 'tejidos' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowTejForm(true)} className="btn-primary flex items-center gap-2 text-xs">
              <Plus className="h-3 w-3" /> Agregar Tipo
            </button>
          </div>
          <div className="texajo-table-shell">
            <div className="texajo-table-scroll">
              <table className="texajo-table">
                <thead>
                  <tr>
                    {['Tipo de Tejido', 'Precio S/./kg', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preciosTejeduria.map(pt => (
                    <tr key={pt.id}>
                      <td>
                        <input type="text" value={pt.tipoTejido}
                          onChange={e => updatePrecioTejeduria(pt.id, { tipoTejido: e.target.value })}
                          className="w-48 input-base text-xs py-0.5 font-bold" />
                      </td>
                      <td>
                        <input type="number" min={0} step={0.01} value={pt.precioKg}
                          onChange={e => updatePrecioTejeduria(pt.id, { precioKg: parseFloat(e.target.value) || 0 })}
                          className="w-24 input-base text-right text-xs py-0.5" />
                      </td>
                      <td>
                        <button onClick={() => deletePrecioTejeduria(pt.id)}
                          className="text-red-400 hover:text-red-700 p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {preciosTejeduria.length === 0 && (
                    <tr><td colSpan={3} className="text-center text-xs text-gray-400 py-6">Sin precios registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showTejForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border border-gray-300 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Precio Tejido</h3>
                  <button onClick={() => setShowTejForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddTejido} className="p-6 space-y-4">
                  <F label="Tipo de Tejido"><input type="text" value={tejForm.tipoTejido} onChange={e => setTejForm(f => ({ ...f, tipoTejido: e.target.value }))} className="input-base" placeholder="Ej: Jersey 24/1" required /></F>
                  <F label="Precio S/./kg"><input type="number" step="0.01" min={0} value={tejForm.precioKg} onChange={e => setTejForm(f => ({ ...f, precioKg: e.target.value }))} className="input-base" /></F>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowTejForm(false)} className="btn-secondary">Cancelar</button>
                    <button type="submit" className="btn-primary">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}