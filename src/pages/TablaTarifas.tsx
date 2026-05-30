import React, { useState } from 'react';
import { DollarSign, Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import type { CategoriaColor } from '../types';

const uid = () => crypto.randomUUID();

type Seccion = 'operacion' | 'telas' | 'complementos' | 'tejeduria';

const SECCIONES: { id: Seccion; label: string; desc: string }[] = [
  { id: 'operacion',    label: 'Tarifas de Operación',   desc: 'Costo por operación de confección, agrupado por producto' },
  { id: 'telas',        label: 'Precios de Tela',         desc: 'Precio S/./kg por tipo de tela y categoría de color' },
  { id: 'complementos', label: 'Precios de Complementos', desc: 'Precio unitario de cuellos, puños y pretinas por talla' },
  { id: 'tejeduria',    label: 'Precios de Tejeduría',    desc: 'Tarifa S/./kg pagada a Zurzam por tipo de tejido' },
];

const CATEGORIAS: CategoriaColor[] = ['OSCURO', 'CLARO', 'MELANGE', 'PPT'];
const TALLAS = ['S', 'M', 'L', 'XL'] as const;
const TIPOS_COMPLEMENTO = ['CUELLO', 'PUÑO', 'PRETINA'];
const ORIGENES = ['COMPRA', 'CORTE_INTERNO'];

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#9A8F87' }}>{label}</label>
      {children}
    </div>
  );
}

export function TablaTarifas() {
  const {
    productos,
    tarifasOperaciones, addTarifaOperacion, updateTarifaOperacion, deleteTarifaOperacion,
    telas,
    preciosTelas, addPrecioTela, updatePrecioTela, deletePrecioTela,
    preciosComplementos, updatePrecioComplemento,
    preciosTejeduria, addPrecioTejeduria, updatePrecioTejeduria, deletePrecioTejeduria,
  } = useAppContext();
  const { addToast } = useToast();

  const [seccion, setSeccion] = useState<Seccion>('operacion');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // ── Formularios ─────────────────────────────────────────────────────────────
  const [showTarifaForm, setShowTarifaForm]     = useState(false);
  const [tarifaForm, setTarifaForm]             = useState({ productoId: '', orden: '1', operacion: '', tarifa: '0', notas: '' });

  const [showPrecioTelaForm, setShowPrecioTelaForm] = useState(false);
  const [precioTelaForm, setPrecioTelaForm]         = useState({ telaId: '', categoriaColor: 'OSCURO' as CategoriaColor, precioKg: '' });

  const [showTejForm, setShowTejForm] = useState(false);
  const [tejForm, setTejForm]         = useState({ tipoTejido: '', precioKg: '' });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const productoMap = new Map(productos.map(p => [p.id, p.nombre]));
  const telaMap     = new Map(telas.map(t => [t.id, t.nombre]));

  const toggleExpandido = (id: string) =>
    setExpandidos(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // Agrupa tarifas por producto
  const tarifasPorProducto = productos.map(prod => ({
    prod,
    tarifas: [...tarifasOperaciones]
      .filter(t => t.productoId === prod.id)
      .sort((a, b) => a.orden - b.orden),
  })).filter(g => g.tarifas.length > 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAddTarifa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarifaForm.productoId || !tarifaForm.operacion) { addToast('Producto y operación requeridos', 'error'); return; }
    const prod  = productos.find(p => p.id === tarifaForm.productoId);
    const orden = parseInt(tarifaForm.orden) || 1;
    addTarifaOperacion({
      id: uid(), productoId: tarifaForm.productoId, orden,
      operacion: tarifaForm.operacion,
      tarifa:    parseFloat(tarifaForm.tarifa) || 0,
      notas:     tarifaForm.notas,
      clave:     `${prod?.nombre ?? tarifaForm.productoId}|${orden}`,
    });
    addToast('Tarifa agregada', 'success');
    setShowTarifaForm(false);
    setTarifaForm({ productoId: '', orden: '1', operacion: '', tarifa: '0', notas: '' });
    // Expandir el producto recién modificado
    setExpandidos(prev => new Set([...prev, tarifaForm.productoId]));
  };

  const handleAddPrecioTela = (e: React.FormEvent) => {
    e.preventDefault();
    if (!precioTelaForm.telaId) { addToast('Tela requerida', 'error'); return; }
    const existe = preciosTelas.find(p => p.telaId === precioTelaForm.telaId && p.categoriaColor === precioTelaForm.categoriaColor);
    if (existe) { addToast('Ya existe ese precio, edítalo en la tabla', 'error'); return; }
    addPrecioTela({ id: uid(), telaId: precioTelaForm.telaId, categoriaColor: precioTelaForm.categoriaColor, precioKg: parseFloat(precioTelaForm.precioKg) || 0 });
    addToast('Precio de tela agregado', 'success');
    setShowPrecioTelaForm(false);
    setPrecioTelaForm({ telaId: '', categoriaColor: 'OSCURO', precioKg: '' });
  };

  const handleAddTejido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tejForm.tipoTejido) { addToast('Tipo de tejido requerido', 'error'); return; }
    addPrecioTejeduria({ id: uid(), tipoTejido: tejForm.tipoTejido, precioKg: parseFloat(tejForm.precioKg) || 0 });
    addToast('Precio de tejeduría agregado', 'success');
    setShowTejForm(false);
    setTejForm({ tipoTejido: '', precioKg: '' });
  };

  // ── Precio complemento: busca o indica ausente ────────────────────────────
  const getPrecioComp = (tipo: string, origen: string, talla: string) =>
    preciosComplementos.find(p => p.tipo === tipo && p.origen === origen && p.talla === talla);

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" style={{ color: '#173A25' }} />
            <h1 className="font-serif text-2xl font-bold" style={{ color: '#173A25' }}>
              Tabla de Tarifas
            </h1>
          </div>
          <p className="mt-1 text-xs font-mono uppercase tracking-widest" style={{ color: '#9A8F87' }}>
            Precios y tarifas maestras del sistema
          </p>
        </div>
      </div>

      {/* Tabs de sección */}
      <div className="flex gap-0 border-b overflow-x-auto" style={{ borderColor: '#DDD8CF' }}>
        {SECCIONES.map(s => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap border-b-2 -mb-px transition-colors"
            style={{
              borderBottomColor: seccion === s.id ? '#173A25' : 'transparent',
              color: seccion === s.id ? '#173A25' : '#9A8F87',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Descripción de sección */}
      <p className="text-xs font-mono" style={{ color: '#9A8F87' }}>
        {SECCIONES.find(s => s.id === seccion)?.desc}
      </p>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 1 — TARIFAS DE OPERACIÓN
      ════════════════════════════════════════════════════════════════════════ */}
      {seccion === 'operacion' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTarifaForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors"
              style={{ background: '#173A25', color: '#fff', borderColor: '#173A25' }}
            >
              <Plus className="h-3 w-3" /> Agregar Tarifa
            </button>
          </div>

          {tarifasPorProducto.length === 0 ? (
            <div className="py-16 text-center text-sm font-serif italic" style={{ color: '#9A8F87' }}>
              No hay tarifas registradas.
            </div>
          ) : (
            <div className="space-y-2">
              {tarifasPorProducto.map(({ prod, tarifas }) => {
                const abierto = expandidos.has(prod.id);
                const total   = tarifas.reduce((s, t) => s + t.tarifa, 0);
                return (
                  <div key={prod.id} className="border" style={{ borderColor: '#DDD8CF' }}>
                    {/* Cabecera del grupo */}
                    <button
                      onClick={() => toggleExpandido(prod.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#F7F4EF]"
                      style={{ background: abierto ? '#F7F4EF' : '#FAFAF8' }}
                    >
                      <div className="flex items-center gap-2">
                        {abierto
                          ? <ChevronDown className="h-3.5 w-3.5" style={{ color: '#9A8F87' }} />
                          : <ChevronRight className="h-3.5 w-3.5" style={{ color: '#9A8F87' }} />
                        }
                        <span className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{prod.nombre}</span>
                        <span className="text-[10px] font-mono" style={{ color: '#9A8F87' }}>
                          {tarifas.length} operaciones
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold" style={{ color: '#173A25' }}>
                        S/ {total.toFixed(3)} total
                      </span>
                    </button>

                    {/* Filas de tarifas */}
                    {abierto && (
                      <div className="border-t" style={{ borderColor: '#F0EDE8' }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: '#F0EDE8' }}>
                              {['#', 'Operación', 'Tarifa S/.', 'Notas', ''].map(h => (
                                <th key={h} className="px-4 py-2 text-left text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tarifas.map((t, i) => (
                              <tr key={t.id} style={{ borderTop: i > 0 ? '1px solid #F0EDE8' : undefined }}>
                                <td className="px-4 py-2 font-mono text-center w-8" style={{ color: '#9A8F87' }}>{t.orden}</td>
                                <td className="px-4 py-2 font-bold" style={{ color: '#1A1A1A' }}>
                                  <input
                                    type="text" value={t.operacion}
                                    onChange={e => updateTarifaOperacion(t.id, { operacion: e.target.value })}
                                    className="w-full border-0 bg-transparent outline-none focus:bg-white focus:border focus:px-1 rounded-sm"
                                    style={{ borderColor: '#DDD8CF' }}
                                  />
                                </td>
                                <td className="px-4 py-2 w-28">
                                  <input
                                    type="number" min={0} step={0.001} value={t.tarifa}
                                    onChange={e => updateTarifaOperacion(t.id, { tarifa: parseFloat(e.target.value) || 0 })}
                                    className="w-full border px-2 py-0.5 text-right font-mono text-xs rounded-sm"
                                    style={{ borderColor: '#DDD8CF' }}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text" value={t.notas}
                                    onChange={e => updateTarifaOperacion(t.id, { notas: e.target.value })}
                                    className="w-full border-0 bg-transparent outline-none focus:bg-white focus:border focus:px-1 rounded-sm text-xs"
                                    style={{ color: '#6B6058', borderColor: '#DDD8CF' }}
                                    placeholder="—"
                                  />
                                </td>
                                <td className="px-4 py-2 w-8">
                                  <button
                                    onClick={() => { if (confirm(`¿Eliminar "${t.operacion}"?`)) deleteTarifaOperacion(t.id); }}
                                    className="p-1 transition-colors"
                                    style={{ color: '#C0977A' }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: '1px solid #DDD8CF', background: '#F7F4EF' }}>
                              <td colSpan={2} className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-right" style={{ color: '#9A8F87' }}>
                                Costo MO Total
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-bold text-xs" style={{ color: '#173A25' }}>
                                S/ {total.toFixed(3)}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal nueva tarifa */}
          {showTarifaForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border w-full max-w-sm" style={{ borderColor: '#DDD8CF' }}>
                <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#DDD8CF' }}>
                  <h3 className="text-sm font-black uppercase tracking-widest">Nueva Tarifa</h3>
                  <button onClick={() => setShowTarifaForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddTarifa} className="p-6 space-y-4">
                  <F label="Producto">
                    <select value={tarifaForm.productoId} onChange={e => setTarifaForm(f => ({ ...f, productoId: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} required>
                      <option value="">Seleccionar producto...</option>
                      {[...productos].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Orden">
                      <input type="number" min={1} value={tarifaForm.orden}
                        onChange={e => setTarifaForm(f => ({ ...f, orden: e.target.value }))}
                        className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} />
                    </F>
                    <F label="Tarifa S/.">
                      <input type="number" step="0.001" min={0} value={tarifaForm.tarifa}
                        onChange={e => setTarifaForm(f => ({ ...f, tarifa: e.target.value }))}
                        className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} />
                    </F>
                  </div>
                  <F label="Nombre de la Operación">
                    <input type="text" value={tarifaForm.operacion}
                      onChange={e => setTarifaForm(f => ({ ...f, operacion: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }}
                      placeholder="Ej: COSTURA PRINCIPAL" required />
                  </F>
                  <F label="Notas">
                    <input type="text" value={tarifaForm.notas}
                      onChange={e => setTarifaForm(f => ({ ...f, notas: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} />
                  </F>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowTarifaForm(false)}
                      className="px-4 py-2 text-xs font-bold border" style={{ borderColor: '#DDD8CF', color: '#6B6058' }}>
                      Cancelar
                    </button>
                    <button type="submit"
                      className="px-4 py-2 text-xs font-bold text-white" style={{ background: '#173A25' }}>
                      Guardar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 2 — PRECIOS DE TELA (matriz tela × categoría color)
      ════════════════════════════════════════════════════════════════════════ */}
      {seccion === 'telas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowPrecioTelaForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors"
              style={{ background: '#173A25', color: '#fff', borderColor: '#173A25' }}
            >
              <Plus className="h-3 w-3" /> Agregar Precio
            </button>
          </div>

          <div className="border overflow-x-auto" style={{ borderColor: '#DDD8CF' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#F7F4EF', borderBottom: '1px solid #DDD8CF' }}>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>Tipo de Tela</th>
                  {CATEGORIAS.map(cat => (
                    <th key={cat} className="px-4 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>
                      {cat}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {telas.map((tela, i) => (
                  <tr key={tela.id} style={{ borderTop: i > 0 ? '1px solid #F0EDE8' : undefined }}>
                    <td className="px-4 py-2.5 font-bold" style={{ color: '#1A1A1A' }}>{tela.nombre}</td>
                    {CATEGORIAS.map(cat => {
                      const precio = preciosTelas.find(p => p.telaId === tela.id && p.categoriaColor === cat);
                      return (
                        <td key={cat} className="px-4 py-2.5 text-center">
                          {precio ? (
                            <input
                              type="number" min={0} step={0.01} value={precio.precioKg}
                              onChange={e => updatePrecioTela(precio.id, { precioKg: parseFloat(e.target.value) || 0 })}
                              className="w-20 border px-2 py-0.5 text-right font-mono text-xs rounded-sm mx-auto block"
                              style={{ borderColor: '#DDD8CF' }}
                            />
                          ) : (
                            <span className="text-[10px] font-mono" style={{ color: '#C0977A' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5">
                      {/* Botón para eliminar precios de esa tela */}
                      <button
                        onClick={() => {
                          const ids = preciosTelas.filter(p => p.telaId === tela.id).map(p => p.id);
                          if (ids.length === 0) return;
                          if (confirm(`¿Eliminar todos los precios de "${tela.nombre}"?`))
                            ids.forEach(id => deletePrecioTela(id));
                        }}
                        className="p-1 transition-colors"
                        style={{ color: '#C0977A' }}
                        title="Eliminar precios de esta tela"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                {telas.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-xs italic" style={{ color: '#9A8F87' }}>Sin telas registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Modal nuevo precio tela */}
          {showPrecioTelaForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border w-full max-w-sm" style={{ borderColor: '#DDD8CF' }}>
                <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#DDD8CF' }}>
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Precio de Tela</h3>
                  <button onClick={() => setShowPrecioTelaForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddPrecioTela} className="p-6 space-y-4">
                  <F label="Tela">
                    <select value={precioTelaForm.telaId} onChange={e => setPrecioTelaForm(f => ({ ...f, telaId: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} required>
                      <option value="">Seleccionar tela...</option>
                      {telas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </F>
                  <F label="Categoría de Color">
                    <select value={precioTelaForm.categoriaColor} onChange={e => setPrecioTelaForm(f => ({ ...f, categoriaColor: e.target.value as CategoriaColor }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }}>
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </F>
                  <F label="Precio S/./kg">
                    <input type="number" step="0.01" min={0} value={precioTelaForm.precioKg}
                      onChange={e => setPrecioTelaForm(f => ({ ...f, precioKg: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} />
                  </F>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowPrecioTelaForm(false)}
                      className="px-4 py-2 text-xs font-bold border" style={{ borderColor: '#DDD8CF', color: '#6B6058' }}>
                      Cancelar
                    </button>
                    <button type="submit"
                      className="px-4 py-2 text-xs font-bold text-white" style={{ background: '#173A25' }}>
                      Guardar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 3 — PRECIOS DE COMPLEMENTOS (matriz tipo × origen × talla)
      ════════════════════════════════════════════════════════════════════════ */}
      {seccion === 'complementos' && (
        <div className="space-y-6">
          {TIPOS_COMPLEMENTO.map(tipo => (
            <div key={tipo}>
              <h3 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#173A25' }}>{tipo}</h3>
              <div className="border overflow-x-auto" style={{ borderColor: '#DDD8CF' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: '#F7F4EF', borderBottom: '1px solid #DDD8CF' }}>
                      <th className="px-4 py-3 text-left text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>Origen</th>
                      {TALLAS.map(t => (
                        <th key={t} className="px-4 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>
                          Talla {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ORIGENES.map((origen, i) => (
                      <tr key={origen} style={{ borderTop: i > 0 ? '1px solid #F0EDE8' : undefined }}>
                        <td className="px-4 py-2.5 font-bold text-xs" style={{ color: '#1A1A1A' }}>
                          {origen === 'COMPRA' ? 'Compra' : 'Corte Interno'}
                        </td>
                        {TALLAS.map(talla => {
                          const precio = getPrecioComp(tipo, origen, talla);
                          return (
                            <td key={talla} className="px-4 py-2.5 text-center">
                              {precio ? (
                                <input
                                  type="number" min={0} step={0.01} value={precio.precio}
                                  onChange={e => updatePrecioComplemento(precio.id, { precio: parseFloat(e.target.value) || 0 })}
                                  className="w-20 border px-2 py-0.5 text-right font-mono text-xs rounded-sm mx-auto block"
                                  style={{ borderColor: '#DDD8CF' }}
                                />
                              ) : (
                                <span className="text-[10px] font-mono" style={{ color: '#C0977A' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="text-[11px] font-mono" style={{ color: '#9A8F87' }}>
            Los complementos sin precio (—) no tienen registro en el sistema. Puedes agregarlos desde la sección de catálogos.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 4 — PRECIOS DE TEJEDURÍA
      ════════════════════════════════════════════════════════════════════════ */}
      {seccion === 'tejeduria' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTejForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors"
              style={{ background: '#173A25', color: '#fff', borderColor: '#173A25' }}
            >
              <Plus className="h-3 w-3" /> Agregar Tipo
            </button>
          </div>

          <div className="border" style={{ borderColor: '#DDD8CF' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#F7F4EF', borderBottom: '1px solid #DDD8CF' }}>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>Tipo de Tejido</th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>Precio S/./kg</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {preciosTejeduria.map((pt, i) => (
                  <tr key={pt.id} style={{ borderTop: i > 0 ? '1px solid #F0EDE8' : undefined }}>
                    <td className="px-4 py-2.5">
                      <input
                        type="text" value={pt.tipoTejido}
                        onChange={e => updatePrecioTejeduria(pt.id, { tipoTejido: e.target.value })}
                        className="w-full border-0 bg-transparent outline-none focus:bg-white focus:border focus:px-1 rounded-sm font-bold"
                        style={{ color: '#1A1A1A', borderColor: '#DDD8CF' }}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number" min={0} step={0.01} value={pt.precioKg}
                        onChange={e => updatePrecioTejeduria(pt.id, { precioKg: parseFloat(e.target.value) || 0 })}
                        className="w-24 border px-2 py-0.5 text-right font-mono text-xs rounded-sm ml-auto block"
                        style={{ borderColor: '#DDD8CF' }}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => { if (confirm(`¿Eliminar "${pt.tipoTejido}"?`)) deletePrecioTejeduria(pt.id); }}
                        className="p-1 transition-colors"
                        style={{ color: '#C0977A' }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                {preciosTejeduria.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-xs italic" style={{ color: '#9A8F87' }}>Sin precios registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Modal nuevo precio tejeduría */}
          {showTejForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border w-full max-w-sm" style={{ borderColor: '#DDD8CF' }}>
                <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#DDD8CF' }}>
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Precio Tejeduría</h3>
                  <button onClick={() => setShowTejForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddTejido} className="p-6 space-y-4">
                  <F label="Tipo de Tejido">
                    <input type="text" value={tejForm.tipoTejido}
                      onChange={e => setTejForm(f => ({ ...f, tipoTejido: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }}
                      placeholder="Ej: Jersey 24/1" required />
                  </F>
                  <F label="Precio S/./kg">
                    <input type="number" step="0.01" min={0} value={tejForm.precioKg}
                      onChange={e => setTejForm(f => ({ ...f, precioKg: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} />
                  </F>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowTejForm(false)}
                      className="px-4 py-2 text-xs font-bold border" style={{ borderColor: '#DDD8CF', color: '#6B6058' }}>
                      Cancelar
                    </button>
                    <button type="submit"
                      className="px-4 py-2 text-xs font-bold text-white" style={{ background: '#173A25' }}>
                      Guardar
                    </button>
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
