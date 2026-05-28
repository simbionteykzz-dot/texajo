import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { Download, Plus, X, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { ProgramaZurzam, ProgramaDetalle, CompraHilo, EstadoPrograma, EstadoPago } from '../types';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';

const uid = () => crypto.randomUUID();

const ESTADOS: EstadoPrograma[] = ['NUEVO', 'EN_COMPRA', 'EN_TEJEDURIA', 'EN_TINTORERIA', 'EN_PLANTA', 'CERRADO'];
const ESTADOS_PAGO: EstadoPago[] = ['PENDIENTE', 'PARCIAL', 'PAGADO', 'ANULADO'];

export function ProgramasZurzam() {
  const {
    programasZurzam, programaDetalles, comprasHilo,
    clientes, colores, proveedores,
    addPrograma, updatePrograma,
    addProgramaDetalle, updateProgramaDetalle,
    addCompraHilo, updateCompraHilo,
  } = useAppContext();
  const { addToast } = useToast();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [showProgForm, setShowProgForm] = useState(false);
  const [showDetalleForm, setShowDetalleForm] = useState<string | null>(null);
  const [showHiloForm, setShowHiloForm] = useState<string | null>(null);

  const [progForm, setProgForm] = useState({
    nombre: '', fecha: new Date().toISOString().slice(0, 10),
    clienteId: '', rollosObjetivo: '', kgObjetivo: '', diasEntrega: '', notas: '',
  });

  const [detForm, setDetForm] = useState({
    colorId: '', tipoServicio: 'REACTIVO' as ProgramaDetalle['tipoServicio'],
    prioridad: 'MEDIA' as ProgramaDetalle['prioridad'],
    kgTejEnviado: '', kgTejRetornado: '', precioKgTej: '', monedaTej: 'PEN' as 'PEN'|'USD', tcTej: '1',
    kgTintEnviado: '', kgTintRetornado: '', rollosFinal: '', precioKgTint: '',
    monedaTint: 'PEN' as 'PEN'|'USD', tcTint: '1', notas: '',
  });

  const [hiloForm, setHiloForm] = useState({
    fecha: new Date().toISOString().slice(0, 10), tipoHilo: '',
    kgAsignados: '', precioKg: '', moneda: 'PEN' as 'PEN'|'USD', tipoCambio: '1',
    proveedorId: '', nFactura: '', notas: '',
  });

  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c.nombre])), [colores]);

  const detallesByProg = useMemo(() => {
    const map = new Map<string, ProgramaDetalle[]>();
    for (const d of programaDetalles) {
      if (!map.has(d.programaId)) map.set(d.programaId, []);
      map.get(d.programaId)!.push(d);
    }
    return map;
  }, [programaDetalles]);

  const hilosByProg = useMemo(() => {
    const map = new Map<string, CompraHilo[]>();
    for (const h of comprasHilo) {
      if (!map.has(h.programaId)) map.set(h.programaId, []);
      map.get(h.programaId)!.push(h);
    }
    return map;
  }, [comprasHilo]);

  const handleAddPrograma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progForm.nombre || !progForm.clienteId) { addToast('Completa nombre y cliente', 'error'); return; }
    addPrograma({
      id: uid(), nombre: progForm.nombre, fecha: progForm.fecha,
      clienteId: progForm.clienteId,
      rollosObjetivo: parseInt(progForm.rollosObjetivo) || 0,
      kgObjetivo: parseFloat(progForm.kgObjetivo) || 0,
      estado: 'NUEVO', comisionJose: 0, estadoPagoComision: 'PENDIENTE',
      diasEntrega: parseInt(progForm.diasEntrega) || 0, notas: progForm.notas,
    });
    addToast('Programa creado', 'success');
    setShowProgForm(false);
    setProgForm({ nombre: '', fecha: new Date().toISOString().slice(0, 10), clienteId: '', rollosObjetivo: '', kgObjetivo: '', diasEntrega: '', notas: '' });
  };

  const handleAddDetalle = (e: React.FormEvent, programaId: string) => {
    e.preventDefault();
    if (!detForm.colorId) { addToast('Selecciona color', 'error'); return; }
    const kgTej = parseFloat(detForm.kgTejEnviado) || 0;
    const precTej = parseFloat(detForm.precioKgTej) || 0;
    const tcTej = parseFloat(detForm.tcTej) || 1;
    const kgTint = parseFloat(detForm.kgTintEnviado) || 0;
    const precTint = parseFloat(detForm.precioKgTint) || 0;
    const tcTint = parseFloat(detForm.tcTint) || 1;
    const costoTej = kgTej * precTej * (detForm.monedaTej === 'USD' ? tcTej : 1);
    const costoTint = kgTint * precTint * (detForm.monedaTint === 'USD' ? tcTint : 1);
    addProgramaDetalle({
      id: uid(), programaId,
      colorId: detForm.colorId,
      categoriaColor: colores.find(c => c.id === detForm.colorId)?.categoria ?? 'OSCURO',
      tipoServicio: detForm.tipoServicio,
      prioridad: detForm.prioridad,
      kgTejEnviado: kgTej,
      kgTejRetornado: parseFloat(detForm.kgTejRetornado) || 0,
      precioKgTej: precTej, monedaTej: detForm.monedaTej, tcTej,
      costoTejido: costoTej, estadoPagoTej: 'PENDIENTE',
      kgTintEnviado: kgTint,
      kgTintRetornado: parseFloat(detForm.kgTintRetornado) || 0,
      rollosFinal: parseInt(detForm.rollosFinal) || 0,
      precioKgTint: precTint, monedaTint: detForm.monedaTint, tcTint,
      costoTint, estadoPagoTint: 'PENDIENTE',
      costoHiloProrrateado: 0,
      costoTotalColor: costoTej + costoTint,
      notas: detForm.notas,
    });
    addToast('Detalle agregado', 'success');
    setShowDetalleForm(null);
  };

  const handleAddHilo = (e: React.FormEvent, programaId: string) => {
    e.preventDefault();
    const kg = parseFloat(hiloForm.kgAsignados) || 0;
    const prec = parseFloat(hiloForm.precioKg) || 0;
    const tc = parseFloat(hiloForm.tipoCambio) || 1;
    const total = kg * prec * (hiloForm.moneda === 'USD' ? tc : 1);
    addCompraHilo({
      id: uid(), fecha: hiloForm.fecha, programaId,
      tipoHilo: hiloForm.tipoHilo, kgAsignados: kg, precioKg: prec,
      moneda: hiloForm.moneda, tipoCambio: tc, totalSoles: total,
      proveedorId: hiloForm.proveedorId, nFactura: hiloForm.nFactura,
      costoRealFact: 0, diferencia: 0, estadoPago: 'PENDIENTE',
      montoPagado: 0, saldo: total, notas: hiloForm.notas,
    });
    addToast('Compra de hilo registrada', 'success');
    setShowHiloForm(null);
  };

  const buildProgramasRows = () => programasZurzam.map((p) => ({
    Programa: p.nombre,
    Fecha: p.fecha,
    Cliente: clienteMap.get(p.clienteId) ?? p.clienteId,
    Estado: p.estado,
    RollosObjetivo: p.rollosObjetivo,
    KgObjetivo: p.kgObjetivo,
    DiasEntrega: p.diasEntrega,
    Notas: p.notas ?? '',
  }));

  const exportarProgramas = () => {
    exportRowsToXlsx(buildProgramasRows(), `programas_zurzam_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Programas');
    addToast('Excel exportado', 'success');
  };

  const exportarProgramasPdf = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    exportTableToPdf({
      title: 'Programas Zurzam',
      subtitle: `Tejeduría y tintorería — ${fecha}`,
      fileName: `programas_zurzam_${fecha}`,
      columns: [
        { header: 'Programa', dataKey: 'Programa' },
        { header: 'Fecha', dataKey: 'Fecha' },
        { header: 'Cliente', dataKey: 'Cliente' },
        { header: 'Estado', dataKey: 'Estado' },
        { header: 'Rollos Obj.', dataKey: 'RollosObjetivo' },
        { header: 'Kg Obj.', dataKey: 'KgObjetivo' },
        { header: 'Días Entrega', dataKey: 'DiasEntrega' },
        { header: 'Notas', dataKey: 'Notas' },
      ],
      rows: buildProgramasRows(),
      centerCols: ['Estado', 'RollosObjetivo', 'DiasEntrega'],
      rightCols: ['KgObjetivo'],
    });
    addToast('PDF exportado', 'success');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Programas Zurzam</h2>
          <p className="text-xs text-gray-500 mt-1">Tejeduría y tintorería por programa</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarProgramas} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportarProgramasPdf} className="btn-secondary flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => setShowProgForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo Programa
          </button>
        </div>
      </div>

      {programasZurzam.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin programas registrados.</p>
      ) : (
        <div className="space-y-3">
          {[...programasZurzam].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(prog => {
            const detalles = detallesByProg.get(prog.id) ?? [];
            const hilos = hilosByProg.get(prog.id) ?? [];
            const isOpen = expanded === prog.id;
            const totalCosto = detalles.reduce((s, d) => s + d.costoTotalColor, 0)
              + hilos.reduce((s, h) => s + h.totalSoles, 0);

            return (
              <div key={prog.id} className="bg-white border border-gray-200">
                <div className="flex items-center justify-between px-5 py-4">
                  <button className="flex items-center gap-3 flex-1 text-left" onClick={() => setExpanded(isOpen ? null : prog.id)}>
                    {isOpen ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                    <span className="font-black text-sm">{prog.nombre}</span>
                    <span className="text-xs text-gray-500">{clienteMap.get(prog.clienteId)}</span>
                    <span className="text-xs text-gray-400">{prog.fecha}</span>
                    <span className="text-xs text-gray-400">{prog.kgObjetivo} kg</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <select value={prog.estado}
                      onChange={e => updatePrograma(prog.id, { estado: e.target.value as EstadoPrograma })}
                      className="text-[10px] font-bold uppercase border border-gray-200 px-2 py-1 bg-white">
                      {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    <span className="text-xs font-mono text-gray-500">S/ {totalCosto.toFixed(0)}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-6">
                    {/* Detalles por color */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Colores / Servicios</h4>
                        <button onClick={() => setShowDetalleForm(prog.id)} className="btn-secondary text-xs flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Agregar Color
                        </button>
                      </div>
                      {detalles.length === 0 ? <p className="text-xs text-gray-400 italic">Sin colores.</p> : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100">
                                {['Color', 'Servicio', 'Prior.', 'Kg Tej', 'Costo Tej', 'Kg Tint', 'Rollos', 'Costo Tint', 'Total', 'Pago Tej', 'Pago Tint'].map(h => (
                                  <th key={h} className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {detalles.map(d => (
                                <tr key={d.id}>
                                  <td className="px-2 py-1.5">{colorMap.get(d.colorId)}</td>
                                  <td className="px-2 py-1.5 text-[10px]">{d.tipoServicio}</td>
                                  <td className="px-2 py-1.5 text-[10px]">{d.prioridad}</td>
                                  <td className="px-2 py-1.5 font-mono text-right">{d.kgTejEnviado}</td>
                                  <td className="px-2 py-1.5 font-mono text-right">S/ {d.costoTejido.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 font-mono text-right">{d.kgTintEnviado}</td>
                                  <td className="px-2 py-1.5 font-mono text-right">{d.rollosFinal}</td>
                                  <td className="px-2 py-1.5 font-mono text-right">S/ {d.costoTint.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 font-mono text-right font-bold">S/ {d.costoTotalColor.toFixed(2)}</td>
                                  <td className="px-2 py-1.5">
                                    <select value={d.estadoPagoTej}
                                      onChange={e => updateProgramaDetalle(d.id, { estadoPagoTej: e.target.value as EstadoPago })}
                                      className="text-[10px] border-0 bg-transparent font-bold uppercase cursor-pointer">
                                      {ESTADOS_PAGO.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <select value={d.estadoPagoTint}
                                      onChange={e => updateProgramaDetalle(d.id, { estadoPagoTint: e.target.value as EstadoPago })}
                                      className="text-[10px] border-0 bg-transparent font-bold uppercase cursor-pointer">
                                      {ESTADOS_PAGO.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Compras hilo */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Compras de Hilo</h4>
                        <button onClick={() => setShowHiloForm(prog.id)} className="btn-secondary text-xs flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Agregar Compra
                        </button>
                      </div>
                      {hilos.length === 0 ? <p className="text-xs text-gray-400 italic">Sin compras de hilo.</p> : (
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              {['Fecha', 'Tipo Hilo', 'Kg', 'Precio', 'Moneda', 'Total S/.', 'Estado', 'Saldo'].map(h => (
                                <th key={h} className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {hilos.map(h => (
                              <tr key={h.id}>
                                <td className="px-2 py-1.5 font-mono">{h.fecha}</td>
                                <td className="px-2 py-1.5">{h.tipoHilo}</td>
                                <td className="px-2 py-1.5 font-mono text-right">{h.kgAsignados}</td>
                                <td className="px-2 py-1.5 font-mono text-right">{h.precioKg.toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-[10px]">{h.moneda}</td>
                                <td className="px-2 py-1.5 font-mono text-right font-bold">S/ {h.totalSoles.toFixed(2)}</td>
                                <td className="px-2 py-1.5">
                                  <select value={h.estadoPago}
                                    onChange={e => updateCompraHilo(h.id, { estadoPago: e.target.value as EstadoPago })}
                                    className="text-[10px] border-0 bg-transparent font-bold uppercase cursor-pointer">
                                    {ESTADOS_PAGO.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                                <td className="px-2 py-1.5 font-mono text-right">S/ {h.saldo.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo programa */}
      {showProgForm && (
        <Modal title="Nuevo Programa" onClose={() => setShowProgForm(false)}>
          <form onSubmit={handleAddPrograma} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <F label="Nombre"><input type="text" value={progForm.nombre} onChange={e => setProgForm(f => ({ ...f, nombre: e.target.value }))} className="input-base" required /></F>
              <F label="Fecha"><input type="date" value={progForm.fecha} onChange={e => setProgForm(f => ({ ...f, fecha: e.target.value }))} className="input-base" /></F>
            </div>
            <F label="Cliente">
              <select value={progForm.clienteId} onChange={e => setProgForm(f => ({ ...f, clienteId: e.target.value }))} className="input-base" required>
                <option value="">Seleccionar…</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </F>
            <div className="grid grid-cols-3 gap-4">
              <F label="Rollos Objetivo"><input type="number" min={0} value={progForm.rollosObjetivo} onChange={e => setProgForm(f => ({ ...f, rollosObjetivo: e.target.value }))} className="input-base" /></F>
              <F label="Kg Objetivo"><input type="number" min={0} step={0.1} value={progForm.kgObjetivo} onChange={e => setProgForm(f => ({ ...f, kgObjetivo: e.target.value }))} className="input-base" /></F>
              <F label="Días Entrega"><input type="number" min={0} value={progForm.diasEntrega} onChange={e => setProgForm(f => ({ ...f, diasEntrega: e.target.value }))} className="input-base" /></F>
            </div>
            <F label="Notas"><textarea value={progForm.notas} onChange={e => setProgForm(f => ({ ...f, notas: e.target.value }))} rows={2} className="input-base" /></F>
            <ModalActions onCancel={() => setShowProgForm(false)} />
          </form>
        </Modal>
      )}

      {/* Modal detalle color */}
      {showDetalleForm && (
        <Modal title="Agregar Color al Programa" onClose={() => setShowDetalleForm(null)}>
          <form onSubmit={e => handleAddDetalle(e, showDetalleForm)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <F label="Color">
                <select value={detForm.colorId} onChange={e => setDetForm(f => ({ ...f, colorId: e.target.value }))} className="input-base" required>
                  <option value="">Seleccionar…</option>
                  {colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </F>
              <F label="Tipo Servicio">
                <select value={detForm.tipoServicio} onChange={e => setDetForm(f => ({ ...f, tipoServicio: e.target.value as any }))} className="input-base">
                  {['REACTIVO','DIRECTO','PPT','LAVADO','TERMOFIJADO','COMPACTADO_EN_RAMA'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
            </div>
            <F label="Prioridad">
              <select value={detForm.prioridad} onChange={e => setDetForm(f => ({ ...f, prioridad: e.target.value as any }))} className="input-base">
                {['URGENTE','ALTA','MEDIA','OPCIONAL'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 pt-1">Tejeduría</p>
            <div className="grid grid-cols-3 gap-3">
              <F label="Kg Enviado"><input type="number" min={0} step={0.1} value={detForm.kgTejEnviado} onChange={e => setDetForm(f => ({ ...f, kgTejEnviado: e.target.value }))} className="input-base" /></F>
              <F label="Precio/Kg"><input type="number" min={0} step={0.01} value={detForm.precioKgTej} onChange={e => setDetForm(f => ({ ...f, precioKgTej: e.target.value }))} className="input-base" /></F>
              <F label="Moneda">
                <select value={detForm.monedaTej} onChange={e => setDetForm(f => ({ ...f, monedaTej: e.target.value as any }))} className="input-base">
                  <option value="PEN">PEN</option><option value="USD">USD</option>
                </select>
              </F>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 pt-1">Tintorería</p>
            <div className="grid grid-cols-3 gap-3">
              <F label="Kg Enviado"><input type="number" min={0} step={0.1} value={detForm.kgTintEnviado} onChange={e => setDetForm(f => ({ ...f, kgTintEnviado: e.target.value }))} className="input-base" /></F>
              <F label="Precio/Kg"><input type="number" min={0} step={0.01} value={detForm.precioKgTint} onChange={e => setDetForm(f => ({ ...f, precioKgTint: e.target.value }))} className="input-base" /></F>
              <F label="Rollos Final"><input type="number" min={0} value={detForm.rollosFinal} onChange={e => setDetForm(f => ({ ...f, rollosFinal: e.target.value }))} className="input-base" /></F>
            </div>
            <ModalActions onCancel={() => setShowDetalleForm(null)} />
          </form>
        </Modal>
      )}

      {/* Modal compra hilo */}
      {showHiloForm && (
        <Modal title="Compra de Hilo" onClose={() => setShowHiloForm(null)}>
          <form onSubmit={e => handleAddHilo(e, showHiloForm)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <F label="Fecha"><input type="date" value={hiloForm.fecha} onChange={e => setHiloForm(f => ({ ...f, fecha: e.target.value }))} className="input-base" /></F>
              <F label="Tipo Hilo"><input type="text" value={hiloForm.tipoHilo} onChange={e => setHiloForm(f => ({ ...f, tipoHilo: e.target.value }))} className="input-base" /></F>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <F label="Kg"><input type="number" min={0} step={0.1} value={hiloForm.kgAsignados} onChange={e => setHiloForm(f => ({ ...f, kgAsignados: e.target.value }))} className="input-base" /></F>
              <F label="Precio/Kg"><input type="number" min={0} step={0.01} value={hiloForm.precioKg} onChange={e => setHiloForm(f => ({ ...f, precioKg: e.target.value }))} className="input-base" /></F>
              <F label="Moneda">
                <select value={hiloForm.moneda} onChange={e => setHiloForm(f => ({ ...f, moneda: e.target.value as any }))} className="input-base">
                  <option value="PEN">PEN</option><option value="USD">USD</option>
                </select>
              </F>
            </div>
            <F label="Proveedor">
              <select value={hiloForm.proveedorId} onChange={e => setHiloForm(f => ({ ...f, proveedorId: e.target.value }))} className="input-base">
                <option value="">—</option>
                {proveedores.filter(p => p.tipo === 'HILO' || p.tipo === 'ZURZAM').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </F>
            <F label="N° Factura"><input type="text" value={hiloForm.nFactura} onChange={e => setHiloForm(f => ({ ...f, nFactura: e.target.value }))} className="input-base" /></F>
            <ModalActions onCancel={() => setShowHiloForm(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white border border-gray-300 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
      <button type="submit" className="btn-primary">Guardar</button>
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
