import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Plus, Trash2, X, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/ToastProvider';
import type { CategoriaColor, TipoServicioTint } from '../types';
import { TIPOS_COMPLEMENTO_LIST } from '../types';
import { newId } from '../lib/storage';

type Seccion = 'operacion' | 'telas' | 'complementos' | 'tejeduria' | 'tintoreria';

const SECCIONES: { id: Seccion; label: string; desc: string }[] = [
  { id: 'operacion',    label: 'Tarifas de Operación',   desc: 'Costo por operación de confección, agrupado por producto' },
  { id: 'telas',        label: 'Precios de Tela',         desc: 'Precio S/./kg por tipo de tela y categoría de color' },
  { id: 'complementos', label: 'Precios de Complementos', desc: 'Precio unitario de cuellos, puños y pretinas por talla' },
  { id: 'tejeduria',    label: 'Precios de Tejeduría',    desc: 'Tarifa S/./kg pagada a Zurzam por tipo de tejido' },
  { id: 'tintoreria',   label: 'Precios de Tintorería',   desc: 'Tarifa S/./kg o USD/kg por tipo de servicio y tipo de tela' },
];

const TIPOS_SERVICIO_TINT: TipoServicioTint[] = ['REACTIVO', 'DIRECTO', 'PPT', 'LAVADO', 'TERMOFIJADO', 'COMPACTADO_EN_RAMA'];

const CATEGORIAS: CategoriaColor[] = ['OSCURO', 'CLARO', 'MELANGE', 'PPT'];
const TALLAS = ['S', 'M', 'L', 'XL'] as const;

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#9A8F87' }}>{label}</label>
      {children}
    </div>
  );
}

export function TablaTarifas() {
  const navigate = useNavigate();
  const {
    productos, addProducto,
    tarifasOperaciones, addTarifaOperacion, updateTarifaOperacion, deleteTarifaOperacion,
    telas, addTela,
    preciosTelas, addPrecioTela, updatePrecioTela, deletePrecioTela,
    preciosComplementos, addPrecioComplemento, updatePrecioComplemento, deletePrecioComplemento,
    preciosTejeduria, addPrecioTejeduria, updatePrecioTejeduria, deletePrecioTejeduria,
    preciosTintoreria, addPrecioTintoreria, updatePrecioTintoreria, deletePrecioTintoreria,
    config, updateConfig, dbReady,
  } = useAppContext();
  const { addToast } = useToast();

  const [seccion, setSeccion] = useState<Seccion>('operacion');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState<{ accion: () => void; mensaje: string } | null>(null);

  // Edición local de tarifas — mapa id → { operacion, tarifa, notas } con cambios pendientes
  const [tarifaEdits, setTarifaEdits] = useState<Map<string, { operacion: string; tarifa: number; notas: string }>>(new Map());
  const [tarifasDirty, setTarifasDirty] = useState(false);

  // Sincronizar edits locales cuando cambian las tarifas en el contexto (carga inicial)
  useEffect(() => {
    setTarifaEdits(new Map());
    setTarifasDirty(false);
  }, [tarifasOperaciones.length]);

  const getTarifaEdit = (t: { id: string; operacion: string; tarifa: number; notas: string }) => {
    const edit = tarifaEdits.get(t.id);
    return edit ?? { operacion: t.operacion, tarifa: t.tarifa, notas: t.notas ?? '' };
  };

  const setTarifaField = (id: string, field: 'operacion' | 'tarifa' | 'notas', value: string | number) => {
    const base = tarifasOperaciones.find(t => t.id === id);
    if (!base) return;
    const current = getTarifaEdit(base);
    setTarifaEdits(prev => new Map(prev).set(id, { ...current, [field]: value }));
    setTarifasDirty(true);
  };

  const handleGuardarTarifas = () => {
    tarifaEdits.forEach((edit, id) => {
      updateTarifaOperacion(id, { operacion: edit.operacion, tarifa: edit.tarifa, notas: edit.notas });
    });
    setTarifaEdits(new Map());
    setTarifasDirty(false);
    addToast('Tarifas guardadas', 'success');
  };

  const handleDescartarTarifas = () => {
    setTarifaEdits(new Map());
    setTarifasDirty(false);
  };

  // ── Formularios ─────────────────────────────────────────────────────────────
  const [showTarifaForm, setShowTarifaForm]     = useState(false);
  const [tarifaForm, setTarifaForm]             = useState({ productoId: '', orden: '1', operacion: '', tarifa: '0', notas: '' });
  const [showInlineProd, setShowInlineProd]     = useState(false);
  const [inlineProd, setInlineProd]             = useState({ nombre: '', marca: '' });

  // Tipos de complemento — se sincroniza desde config una vez que Supabase carga
  const [tiposComplemento, setTiposComplemento] = useState<string[]>([...TIPOS_COMPLEMENTO_LIST]);
  const [tiposIniciados, setTiposIniciados] = useState(false);
  React.useEffect(() => {
    if (dbReady && !tiposIniciados) {
      setTiposComplemento(config.tiposComplemento?.length ? [...config.tiposComplemento] : [...TIPOS_COMPLEMENTO_LIST]);
      setTiposIniciados(true);
    }
  }, [dbReady, tiposIniciados, config.tiposComplemento]);
  const [nuevoTipoComp, setNuevoTipoComp]       = useState('');
  const [showNuevoTipo, setShowNuevoTipo]        = useState(false);

  const [showPrecioTelaForm, setShowPrecioTelaForm] = useState(false);
  const [precioTelaForm, setPrecioTelaForm]         = useState({ telaId: '', categoriaColor: 'OSCURO' as CategoriaColor, precioKg: '' });
  const [showInlineTela, setShowInlineTela]         = useState(false);
  const [inlineTela, setInlineTela]                 = useState({ nombre: '', composicion: '', kgPorRollo: '20' });

  const [showCompForm, setShowCompForm] = useState(false);
  const [compForm, setCompForm] = useState({
    tipo: '', origen: '',
    precioS: '0', precioM: '0', precioL: '0', precioXL: '0',
  });

  const [showTejForm, setShowTejForm] = useState(false);
  const [tejForm, setTejForm]         = useState({ tipoTejido: '', precioKg: '' });

  const [showTintForm, setShowTintForm] = useState(false);
  const [tintForm, setTintForm]         = useState({ tipoServicio: 'REACTIVO' as TipoServicioTint, tipoTela: '', precioKg: '', moneda: 'PEN' as 'PEN' | 'USD', notas: '' });

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
  const handleAddInlineProd = () => {
    if (!inlineProd.nombre.trim()) { addToast('Nombre requerido', 'error'); return; }
    const generatedId = newId();
    addProducto({ id: generatedId, nombre: inlineProd.nombre.trim(), marca: inlineProd.marca || undefined, costoMoTotal: 0, precioServicio: 0, notas: '' });
    setTarifaForm(f => ({ ...f, productoId: generatedId }));
    addToast('Producto creado', 'success');
    setShowInlineProd(false);
    setInlineProd({ nombre: '', marca: '' });
  };

  const handleAddInlineTela = () => {
    if (!inlineTela.nombre.trim()) { addToast('Nombre requerido', 'error'); return; }
    const generatedId = newId();
    addTela({ id: generatedId, nombre: inlineTela.nombre.trim(), composicion: inlineTela.composicion, kgPorRollo: parseFloat(inlineTela.kgPorRollo) || 20, notas: '' });
    setPrecioTelaForm(f => ({ ...f, telaId: generatedId }));
    addToast('Tela creada', 'success');
    setShowInlineTela(false);
    setInlineTela({ nombre: '', composicion: '', kgPorRollo: '20' });
  };

  const handleAddTarifa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarifaForm.productoId || !tarifaForm.operacion) { addToast('Producto y operación requeridos', 'error'); return; }
    const prod  = productos.find(p => p.id === tarifaForm.productoId);
    const orden = parseInt(tarifaForm.orden) || 1;
    addTarifaOperacion({
      id: newId(), productoId: tarifaForm.productoId, orden,
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
    addPrecioTela({ id: newId(), telaId: precioTelaForm.telaId, categoriaColor: precioTelaForm.categoriaColor, precioKg: parseFloat(precioTelaForm.precioKg) || 0 });
    addToast('Precio de tela agregado', 'success');
    setShowPrecioTelaForm(false);
    setPrecioTelaForm({ telaId: '', categoriaColor: 'OSCURO', precioKg: '' });
  };

  const handleAddTintoreria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tintForm.tipoTela.trim()) { addToast('Tipo de tela requerido', 'error'); return; }
    const existe = preciosTintoreria.find(p => p.tipoServicio === tintForm.tipoServicio && p.tipoTela.toLowerCase() === tintForm.tipoTela.toLowerCase());
    if (existe) { addToast('Ya existe ese precio, edítalo en la tabla', 'error'); return; }
    addPrecioTintoreria({
      id: newId(),
      tipoServicio: tintForm.tipoServicio,
      tipoTela: tintForm.tipoTela.trim(),
      precioKg: parseFloat(tintForm.precioKg) || 0,
      moneda: tintForm.moneda,
      notas: tintForm.notas,
    });
    addToast('Precio de tintorería agregado', 'success');
    setShowTintForm(false);
    setTintForm({ tipoServicio: 'REACTIVO', tipoTela: '', precioKg: '', moneda: 'PEN', notas: '' });
  };

  const handleAddTejido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tejForm.tipoTejido) { addToast('Tipo de tejido requerido', 'error'); return; }
    addPrecioTejeduria({ id: newId(), tipoTejido: tejForm.tipoTejido, precioKg: parseFloat(tejForm.precioKg) || 0 });
    addToast('Precio de tejeduría agregado', 'success');
    setShowTejForm(false);
    setTejForm({ tipoTejido: '', precioKg: '' });
  };

  const handleAddComplemento = (e: React.FormEvent) => {
    e.preventDefault();
    const tipo   = compForm.tipo.trim().toUpperCase();
    const origen = compForm.origen.trim().toUpperCase();
    if (!tipo)   { addToast('Tipo requerido', 'error'); return; }
    if (!origen) { addToast('Origen requerido', 'error'); return; }
    const precios = [
      { talla: 'S'  as const, valor: parseFloat(compForm.precioS)  || 0 },
      { talla: 'M'  as const, valor: parseFloat(compForm.precioM)  || 0 },
      { talla: 'L'  as const, valor: parseFloat(compForm.precioL)  || 0 },
      { talla: 'XL' as const, valor: parseFloat(compForm.precioXL) || 0 },
    ];
    precios.forEach(({ talla, valor }) => {
      if (!getPrecioComp(tipo, origen, talla)) {
        addPrecioComplemento({ id: newId(), clave: `${tipo}_${origen}`, tipo, origen, talla, precio: valor });
      }
    });
    addToast(`Complemento ${tipo} / ${origen} agregado`, 'success');
    setShowCompForm(false);
    setCompForm({ tipo: '', origen: '', precioS: '0', precioM: '0', precioL: '0', precioXL: '0' });
  };

  // ── Precio complemento: busca o indica ausente ────────────────────────────
  const getPrecioComp = (tipo: string, origen: string, talla: string) =>
    preciosComplementos.find(p => p.tipo === tipo && p.origen === origen && p.talla === talla);

  // Orígenes únicos presentes en los datos para un tipo dado
  const getOrigenesParaTipo = (tipo: string) => {
    const set = new Set(preciosComplementos.filter(p => p.tipo === tipo).map(p => p.origen));
    return Array.from(set).sort();
  };

  // Todos los tipos únicos presentes en los datos (complementa tiposComplemento con lo que haya en BD)
  const tiposEnBd = Array.from(new Set(preciosComplementos.map(p => p.tipo))).sort();
  const tiposAMostrar = Array.from(new Set([...tiposComplemento, ...tiposEnBd]));

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
        <ModuleInfoBox
          accent="#173A25"
          titulo="Tabla de Tarifas"
          descripcion="Vista consolidada y editable de todos los precios del sistema. Centraliza tarifas de operación por producto, precios de tela por categoría de color, complementos por talla y tipo, tejeduría y tintorería."
          items={[
            { label: 'Tarifas Operación', detail: 'Costo S/. por operación de confección agrupado por producto' },
            { label: 'Precios Tela', detail: 'S/./kg por tipo de tela y categoría (OSCURO, CLARO, MELANGE, PPT)' },
            { label: 'Precios Complementos', detail: 'S/. unitario por tipo (CUELLO/PUÑO/PRETINA), origen y talla' },
            { label: 'Tintorería', detail: 'S/./kg o USD/kg por tipo de servicio (Reactivo, PPT, Lavado, etc.)' },
          ]}
        />
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
          <div className="flex items-center justify-between gap-3">
            {tarifasDirty ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#C0977A' }}>
                  Cambios sin guardar
                </span>
                <button
                  onClick={handleDescartarTarifas}
                  className="px-3 py-1.5 text-xs font-bold border transition-colors"
                  style={{ borderColor: '#DDD8CF', color: '#6B6058' }}
                >
                  Descartar
                </button>
                <button
                  onClick={handleGuardarTarifas}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors"
                  style={{ background: '#173A25', color: '#fff', borderColor: '#173A25' }}
                >
                  <Save className="h-3 w-3" /> Guardar cambios
                </button>
              </div>
            ) : (
              <div />
            )}
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
                const total   = tarifas.reduce((s, t) => s + (getTarifaEdit(t).tarifa), 0);
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
                            {tarifas.map((t, i) => {
                              const edit = getTarifaEdit(t);
                              const dirty = tarifaEdits.has(t.id);
                              return (
                              <tr key={t.id} style={{ borderTop: i > 0 ? '1px solid #F0EDE8' : undefined, background: dirty ? '#FFFBF5' : undefined }}>
                                <td className="px-4 py-2 font-mono text-center w-8" style={{ color: '#9A8F87' }}>{t.orden}</td>
                                <td className="px-4 py-2 font-bold" style={{ color: '#1A1A1A' }}>
                                  <input
                                    type="text" value={edit.operacion}
                                    onChange={e => setTarifaField(t.id, 'operacion', e.target.value)}
                                    className="w-full border-0 bg-transparent outline-none focus:bg-white focus:border focus:px-1 rounded-sm"
                                    style={{ borderColor: '#DDD8CF' }}
                                  />
                                </td>
                                <td className="px-4 py-2 w-28">
                                  <input
                                    type="number" min={0} step={0.001} value={edit.tarifa}
                                    onChange={e => setTarifaField(t.id, 'tarifa', parseFloat(e.target.value) || 0)}
                                    className="w-full border px-2 py-0.5 text-right font-mono text-xs rounded-sm"
                                    style={{ borderColor: dirty ? '#C0977A' : '#DDD8CF' }}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text" value={edit.notas}
                                    onChange={e => setTarifaField(t.id, 'notas', e.target.value)}
                                    className="w-full border-0 bg-transparent outline-none focus:bg-white focus:border focus:px-1 rounded-sm text-xs"
                                    style={{ color: '#6B6058', borderColor: '#DDD8CF' }}
                                    placeholder="—"
                                  />
                                </td>
                                <td className="px-4 py-2 w-8">
                                  <button
                                    onClick={() => setConfirmDel({ mensaje: `¿Eliminar tarifa "${edit.operacion}"?`, accion: () => { setTarifaEdits(prev => { const m = new Map(prev); m.delete(t.id); return m; }); deleteTarifaOperacion(t.id); } })}
                                    className="p-1 transition-colors"
                                    style={{ color: '#C0977A' }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: '1px solid #DDD8CF' }}>
                              <td colSpan={5} className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextOrden = tarifas.length + 1;
                                    addTarifaOperacion({
                                      id: newId(), productoId: prod.id, orden: nextOrden,
                                      operacion: 'NUEVA OPERACIÓN', tarifa: 0, notas: '',
                                      clave: `${prod.nombre}|${nextOrden}`,
                                    });
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-mono transition-colors hover:text-[#173A25]"
                                  style={{ color: '#9A8F87' }}
                                >
                                  <Plus className="h-3 w-3" /> añadir operación
                                </button>
                              </td>
                            </tr>
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
                    <div className="flex gap-2 items-center">
                      <select value={tarifaForm.productoId} onChange={e => setTarifaForm(f => ({ ...f, productoId: e.target.value }))}
                        className="flex-1 border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} required>
                        <option value="">Seleccionar producto...</option>
                        {[...productos].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        title="Nuevo producto"
                        onClick={() => setShowInlineProd(v => !v)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center border transition-colors"
                        style={showInlineProd
                          ? { background: '#173A25', borderColor: '#173A25', color: '#fff' }
                          : { background: '#F5F2EA', borderColor: '#DDD8CF', color: '#7A6F67' }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {showInlineProd && (
                      <div onSubmit={handleAddInlineProd} className="mt-2 border p-3 space-y-2" style={{ borderColor: '#DDD8CF', background: '#F5F2EA' }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#7A6F67' }}>Nuevo producto</p>
                        <input
                          type="text"
                          placeholder="Nombre *"
                          value={inlineProd.nombre}
                          onChange={e => setInlineProd(f => ({ ...f, nombre: e.target.value }))}
                          className="w-full border px-3 py-1.5 text-xs"
                          style={{ borderColor: '#DDD8CF' }}
                        />
                        <select
                          value={inlineProd.marca}
                          onChange={e => setInlineProd(f => ({ ...f, marca: e.target.value }))}
                          className="w-full border px-3 py-1.5 text-xs"
                          style={{ borderColor: '#DDD8CF' }}
                        >
                          <option value="">Marca (opcional)</option>
                          <option value="Overshark">Overshark</option>
                          <option value="Bravos">Bravos</option>
                        </select>
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => { setShowInlineProd(false); setInlineProd({ nombre: '', marca: '' }); }}
                            className="px-3 py-1 text-xs font-bold border"
                            style={{ borderColor: '#DDD8CF', color: '#6B6058' }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddInlineProd}
                            className="px-3 py-1 text-xs font-bold text-white"
                            style={{ background: '#173A25' }}
                          >
                            Crear y seleccionar
                          </button>
                        </div>
                      </div>
                    )}
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
                          setConfirmDel({ mensaje: `¿Eliminar todos los precios de "${tela.nombre}"?`, accion: () => ids.forEach(id => deletePrecioTela(id)) });
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
                  <button onClick={() => { setShowPrecioTelaForm(false); setShowInlineTela(false); }}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddPrecioTela} className="p-6 space-y-4">
                  <F label="Tela">
                    <div className="flex gap-2 items-center">
                      <select value={precioTelaForm.telaId} onChange={e => setPrecioTelaForm(f => ({ ...f, telaId: e.target.value }))}
                        className="flex-1 border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} required>
                        <option value="">Seleccionar tela...</option>
                        {[...telas].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                      </select>
                      <button
                        type="button"
                        title="Nueva tela"
                        onClick={() => setShowInlineTela(v => !v)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center border transition-colors"
                        style={showInlineTela
                          ? { background: '#173A25', borderColor: '#173A25', color: '#fff' }
                          : { background: '#F5F2EA', borderColor: '#DDD8CF', color: '#7A6F67' }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {showInlineTela && (
                      <div className="mt-2 border p-3 space-y-2" style={{ borderColor: '#DDD8CF', background: '#F5F2EA' }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#7A6F67' }}>Nueva tela</p>
                        <input
                          type="text"
                          placeholder="Nombre *"
                          value={inlineTela.nombre}
                          onChange={e => setInlineTela(f => ({ ...f, nombre: e.target.value }))}
                          className="w-full border px-3 py-1.5 text-xs"
                          style={{ borderColor: '#DDD8CF' }}
                          autoFocus
                        />
                        <input
                          type="text"
                          placeholder="Composición (ej: 100% algodón)"
                          value={inlineTela.composicion}
                          onChange={e => setInlineTela(f => ({ ...f, composicion: e.target.value }))}
                          className="w-full border px-3 py-1.5 text-xs"
                          style={{ borderColor: '#DDD8CF' }}
                        />
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => { setShowInlineTela(false); setInlineTela({ nombre: '', composicion: '', kgPorRollo: '20' }); }}
                            className="px-3 py-1 text-xs font-bold border"
                            style={{ borderColor: '#DDD8CF', color: '#6B6058' }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddInlineTela}
                            className="px-3 py-1 text-xs font-bold text-white"
                            style={{ background: '#173A25' }}
                          >
                            Crear y seleccionar
                          </button>
                        </div>
                      </div>
                    )}
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
                    <button type="button" onClick={() => { setShowPrecioTelaForm(false); setShowInlineTela(false); }}
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

          {/* Botón agregar */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowCompForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white"
              style={{ background: '#173A25' }}
            >
              <Plus className="h-3 w-3" /> Agregar complemento
            </button>
          </div>

          {/* Modal nuevo complemento */}
          {showCompForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border w-full max-w-sm" style={{ borderColor: '#DDD8CF' }}>
                <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#DDD8CF' }}>
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Precio de Complemento</h3>
                  <button onClick={() => setShowCompForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddComplemento} className="p-6 space-y-4">
                  <F label="Tipo (ej: CUELLO, PUÑO, PRETINA)">
                    <input
                      type="text" value={compForm.tipo}
                      onChange={e => setCompForm(f => ({ ...f, tipo: e.target.value.toUpperCase() }))}
                      list="tipos-comp-list"
                      className="w-full border px-3 py-2 text-sm uppercase font-mono" style={{ borderColor: '#DDD8CF' }}
                      placeholder="CUELLO" required autoFocus
                    />
                    <datalist id="tipos-comp-list">
                      {tiposAMostrar.map(t => <option key={t} value={t} />)}
                    </datalist>
                  </F>
                  <F label="Origen (ej: RIB 1x1, RECTILÍNEO)">
                    <input
                      type="text" value={compForm.origen}
                      onChange={e => setCompForm(f => ({ ...f, origen: e.target.value.toUpperCase() }))}
                      list="origenes-comp-list"
                      className="w-full border px-3 py-2 text-sm uppercase font-mono" style={{ borderColor: '#DDD8CF' }}
                      placeholder="RIB 1x1" required
                    />
                    <datalist id="origenes-comp-list">
                      {Array.from(new Set(preciosComplementos.map(p => p.origen))).sort().map(o => <option key={o} value={o} />)}
                    </datalist>
                  </F>
                  <div className="grid grid-cols-4 gap-2">
                    {(['S','M','L','XL'] as const).map(t => (
                      <F key={t} label={`Talla ${t}`}>
                        <input
                          type="number" min={0} step={0.01}
                          value={compForm[`precio${t}` as 'precioS'|'precioM'|'precioL'|'precioXL']}
                          onChange={e => setCompForm(f => ({ ...f, [`precio${t}`]: e.target.value }))}
                          className="w-full border px-2 py-2 text-sm text-right font-mono" style={{ borderColor: '#DDD8CF' }}
                        />
                      </F>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowCompForm(false)}
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

          {tiposAMostrar.map(tipo => {
            const origenes = getOrigenesParaTipo(tipo);
            return (
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
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {origenes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-xs italic" style={{ color: '#9A8F87' }}>
                            Sin precios registrados para este tipo
                          </td>
                        </tr>
                      ) : origenes.map((origen, i) => (
                        <tr key={origen} style={{ borderTop: i > 0 ? '1px solid #F0EDE8' : undefined }}>
                          <td className="px-4 py-2.5 font-bold text-xs" style={{ color: '#1A1A1A' }}>
                            {origen}
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
                          <td className="px-2 py-2.5">
                            <button
                              onClick={() => {
                                const ids = preciosComplementos
                                  .filter(p => p.tipo === tipo && p.origen === origen)
                                  .map(p => p.id);
                                setConfirmDel({ mensaje: `¿Eliminar "${tipo} / ${origen}" (${ids.length} registros)?`, accion: () => ids.forEach(id => deletePrecioComplemento(id)) });
                              }}
                              className="p-1 transition-colors"
                              style={{ color: '#C0977A' }}
                              title="Eliminar este origen"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {tiposAMostrar.length === 0 && (
            <p className="text-xs italic text-center py-10" style={{ color: '#9A8F87' }}>Sin precios de complementos registrados</p>
          )}
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
                        onClick={() => setConfirmDel({ mensaje: `¿Eliminar "${pt.tipoTejido}"?`, accion: () => deletePrecioTejeduria(pt.id) })}
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

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓN 5 — PRECIOS DE TINTORERÍA (matriz tipoServicio × tipoTela)
      ════════════════════════════════════════════════════════════════════════ */}
      {seccion === 'tintoreria' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTintForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors"
              style={{ background: '#173A25', color: '#fff', borderColor: '#173A25' }}
            >
              <Plus className="h-3 w-3" /> Agregar Precio
            </button>
          </div>

          {TIPOS_SERVICIO_TINT.map(servicio => {
            const filas = preciosTintoreria.filter(p => p.tipoServicio === servicio);
            return (
              <div key={servicio}>
                <h3 className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#173A25' }}>
                  {servicio.replace('_', ' ')}
                </h3>
                <div className="border" style={{ borderColor: '#DDD8CF' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: '#F7F4EF', borderBottom: '1px solid #DDD8CF' }}>
                        <th className="px-4 py-3 text-left text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>Tipo de Tela</th>
                        <th className="px-4 py-3 text-right text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>Precio/kg</th>
                        <th className="px-4 py-3 text-center text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>Moneda</th>
                        <th className="px-4 py-3 text-left text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>Notas</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {filas.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-xs italic" style={{ color: '#9A8F87' }}>
                            Sin precios para este servicio
                          </td>
                        </tr>
                      ) : filas.map((pt, i) => (
                        <tr key={pt.id} style={{ borderTop: i > 0 ? '1px solid #F0EDE8' : undefined }}>
                          <td className="px-4 py-2.5">
                            <input
                              type="text" value={pt.tipoTela}
                              onChange={e => updatePrecioTintoreria(pt.id, { tipoTela: e.target.value })}
                              className="w-full border-0 bg-transparent outline-none focus:bg-white focus:border focus:px-1 rounded-sm font-bold"
                              style={{ color: '#1A1A1A', borderColor: '#DDD8CF' }}
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="number" min={0} step={0.01} value={pt.precioKg}
                              onChange={e => updatePrecioTintoreria(pt.id, { precioKg: parseFloat(e.target.value) || 0 })}
                              className="w-24 border px-2 py-0.5 text-right font-mono text-xs rounded-sm ml-auto block"
                              style={{ borderColor: '#DDD8CF' }}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <select
                              value={pt.moneda}
                              onChange={e => updatePrecioTintoreria(pt.id, { moneda: e.target.value as 'PEN' | 'USD' })}
                              className="border px-1 py-0.5 text-xs rounded-sm"
                              style={{ borderColor: '#DDD8CF' }}
                            >
                              <option value="PEN">S/.</option>
                              <option value="USD">USD</option>
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="text" value={pt.notas}
                              onChange={e => updatePrecioTintoreria(pt.id, { notas: e.target.value })}
                              className="w-full border-0 bg-transparent outline-none focus:bg-white focus:border focus:px-1 rounded-sm text-xs"
                              style={{ color: '#6B6058', borderColor: '#DDD8CF' }}
                              placeholder="—"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => setConfirmDel({ mensaje: `¿Eliminar "${pt.tipoTela}" (${servicio})?`, accion: () => deletePrecioTintoreria(pt.id) })}
                              className="p-1 transition-colors"
                              style={{ color: '#C0977A' }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {showTintForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white border w-full max-w-sm" style={{ borderColor: '#DDD8CF' }}>
                <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#DDD8CF' }}>
                  <h3 className="text-sm font-black uppercase tracking-widest">Nuevo Precio Tintorería</h3>
                  <button onClick={() => setShowTintForm(false)}><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddTintoreria} className="p-6 space-y-4">
                  <F label="Tipo de Servicio">
                    <select value={tintForm.tipoServicio} onChange={e => setTintForm(f => ({ ...f, tipoServicio: e.target.value as TipoServicioTint }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }}>
                      {TIPOS_SERVICIO_TINT.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </F>
                  <F label="Tipo de Tela">
                    <input type="text" value={tintForm.tipoTela}
                      onChange={e => setTintForm(f => ({ ...f, tipoTela: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }}
                      placeholder="Ej: Jersey, Wafle, Pique..." required />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Precio/kg">
                      <input type="number" step="0.01" min={0} value={tintForm.precioKg}
                        onChange={e => setTintForm(f => ({ ...f, precioKg: e.target.value }))}
                        className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} />
                    </F>
                    <F label="Moneda">
                      <select value={tintForm.moneda} onChange={e => setTintForm(f => ({ ...f, moneda: e.target.value as 'PEN' | 'USD' }))}
                        className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }}>
                        <option value="PEN">S/. (PEN)</option>
                        <option value="USD">USD</option>
                      </select>
                    </F>
                  </div>
                  <F label="Notas">
                    <input type="text" value={tintForm.notas}
                      onChange={e => setTintForm(f => ({ ...f, notas: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm" style={{ borderColor: '#DDD8CF' }} />
                  </F>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowTintForm(false)}
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

      {confirmDel && (
        <ConfirmModal
          mensaje={confirmDel.mensaje}
          detalle="Esta acción no se puede deshacer."
          onConfirmar={() => {
            confirmDel.accion();
            setConfirmDel(null);
          }}
          onCancelar={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
