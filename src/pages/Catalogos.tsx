import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Plus, X } from 'lucide-react';
import { Operario, Cliente } from '../types';

const uid = () => crypto.randomUUID();

type Tab = 'productos' | 'telas' | 'colores' | 'operarios' | 'tarifas' | 'clientes' | 'proveedores';

const TABS: { id: Tab; label: string }[] = [
  { id: 'productos', label: 'Productos' },
  { id: 'telas', label: 'Telas' },
  { id: 'colores', label: 'Colores' },
  { id: 'operarios', label: 'Operarios' },
  { id: 'tarifas', label: 'Tarifas' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'proveedores', label: 'Proveedores' },
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
    productos, updateProducto,
    telas, updateTela,
    colores, updateColor,
    operarios, addOperario, updateOperario,
    tarifasOperaciones, updateTarifaOperacion,
    clientes, addCliente, updateCliente,
    proveedores, addProveedor, updateProveedor,
  } = useAppContext();
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>('productos');

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

  const productoMap = new Map(productos.map(p => [p.id, p.nombre]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Costos y Catálogos</h2>
        <p className="text-xs text-gray-500 mt-1">Catálogos maestros del sistema</p>
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
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Producto', 'Costo MO Total', 'Precio Servicio', 'Notas'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold">{p.nombre}</td>
                  <td className="px-4 py-2">
                    <input type="number" min={0} step={0.01} value={p.costoMoTotal}
                      onChange={e => updateProducto(p.id, { costoMoTotal: parseFloat(e.target.value) || 0 })}
                      className="w-24 input-base text-right text-xs py-0.5" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min={0} step={0.01} value={p.precioServicio}
                      onChange={e => updateProducto(p.id, { precioServicio: parseFloat(e.target.value) || 0 })}
                      className="w-24 input-base text-right text-xs py-0.5" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" value={p.notas}
                      onChange={e => updateProducto(p.id, { notas: e.target.value })}
                      className="w-48 input-base text-xs py-0.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TELAS */}
      {tab === 'telas' && (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Tela', 'Composición', 'Kg/Rollo', 'Notas'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {telas.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold">{t.nombre}</td>
                  <td className="px-4 py-2">
                    <input type="text" value={t.composicion}
                      onChange={e => updateTela(t.id, { composicion: e.target.value })}
                      className="w-40 input-base text-xs py-0.5" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min={0} step={0.5} value={t.kgPorRollo}
                      onChange={e => updateTela(t.id, { kgPorRollo: parseFloat(e.target.value) || 20 })}
                      className="w-20 input-base text-right text-xs py-0.5" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" value={t.notas}
                      onChange={e => updateTela(t.id, { notas: e.target.value })}
                      className="w-48 input-base text-xs py-0.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* COLORES */}
      {tab === 'colores' && (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Color', 'Categoría', 'Prioridad', 'Notas'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...colores].sort((a, b) => a.prioridad - b.prioridad).map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold">{c.nombre}</td>
                  <td className="px-4 py-2">
                    <select value={c.categoria}
                      onChange={e => updateColor(c.id, { categoria: e.target.value as any })}
                      className="input-base text-xs py-0.5">
                      {['OSCURO','CLARO','MELANGE','PPT'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min={1} value={c.prioridad}
                      onChange={e => updateColor(c.id, { prioridad: parseInt(e.target.value) || 1 })}
                      className="w-16 input-base text-right text-xs py-0.5" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" value={c.notas}
                      onChange={e => updateColor(c.id, { notas: e.target.value })}
                      className="w-48 input-base text-xs py-0.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <div className="bg-white border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Código', 'Nombre', 'Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...operarios].sort((a, b) => a.codigo.localeCompare(b.codigo)).map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-bold">{o.codigo}</td>
                    <td className="px-4 py-2">
                      <input type="text" value={o.nombre}
                        onChange={e => updateOperario(o.id, { nombre: e.target.value })}
                        className="w-64 input-base text-xs py-0.5" />
                    </td>
                    <td className="px-4 py-2">
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
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Producto', 'Orden', 'Operación', 'Tarifa S/.', 'Notas'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...tarifasOperaciones]
                .sort((a, b) => (productoMap.get(a.productoId) ?? '').localeCompare(productoMap.get(b.productoId) ?? '') || a.orden - b.orden)
                .map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{productoMap.get(t.productoId)}</td>
                    <td className="px-4 py-2 font-mono text-center">{t.orden}</td>
                    <td className="px-4 py-2 font-bold">{t.operacion}</td>
                    <td className="px-4 py-2">
                      <input type="number" min={0} step={0.001} value={t.tarifa}
                        onChange={e => updateTarifaOperacion(t.id, { tarifa: parseFloat(e.target.value) || 0 })}
                        className="w-24 input-base text-right text-xs py-0.5" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" value={t.notas}
                        onChange={e => updateTarifaOperacion(t.id, { notas: e.target.value })}
                        className="w-40 input-base text-xs py-0.5" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
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
          <div className="bg-white border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Nombre', 'Contacto', 'Notas'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input type="text" value={c.nombre}
                        onChange={e => updateCliente(c.id, { nombre: e.target.value })}
                        className="w-40 input-base text-xs py-0.5 font-bold" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" value={c.contacto}
                        onChange={e => updateCliente(c.id, { contacto: e.target.value })}
                        className="w-48 input-base text-xs py-0.5" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" value={c.notas}
                        onChange={e => updateCliente(c.id, { notas: e.target.value })}
                        className="w-48 input-base text-xs py-0.5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div className="bg-white border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Nombre', 'RUC', 'Contacto', 'Tipo'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proveedores.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input type="text" value={p.nombre}
                        onChange={e => updateProveedor(p.id, { nombre: e.target.value })}
                        className="w-40 input-base text-xs py-0.5 font-bold" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" value={p.ruc}
                        onChange={e => updateProveedor(p.id, { ruc: e.target.value })}
                        className="w-28 input-base text-xs py-0.5 font-mono" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" value={p.contacto}
                        onChange={e => updateProveedor(p.id, { contacto: e.target.value })}
                        className="w-40 input-base text-xs py-0.5" />
                    </td>
                    <td className="px-4 py-2">
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
    </div>
  );
}