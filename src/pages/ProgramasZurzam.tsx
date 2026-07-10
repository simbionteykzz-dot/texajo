import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { useEsAdmin } from '../lib/useEsAdmin';
import { Download, Plus, X, ChevronDown, ChevronRight, FileText, Trash2 } from 'lucide-react';
import { ProgramaZurzam, ProgramaDetalle, CompraHilo, EstadoPrograma, EstadoPago, StockExtorno } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { ConfirmModal } from '../components/ConfirmModal';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';
import { newId } from '../lib/storage';

const ESTADOS: EstadoPrograma[] = ['NUEVO', 'EN_COMPRA', 'EN_TEJEDURIA', 'EN_TINTORERIA', 'EN_PLANTA', 'CERRADO'];
const ESTADOS_PAGO: EstadoPago[] = ['PENDIENTE', 'PARCIAL', 'PAGADO', 'ANULADO'];

export function ProgramasZurzam() {
  const {
    programasZurzam, programaDetalles, comprasHilo,
    clientes, colores, proveedores, preciosTelas, preciosTejeduria, config,
    stockExtornos,
    addPrograma, updatePrograma, deletePrograma,
    addProgramaDetalle, updateProgramaDetalle, deleteProgramaDetalle,
    addCompraHilo, updateCompraHilo, deleteCompraHilo,
    addStockExtorno, updateStockExtorno, deleteStockExtorno,
  } = useAppContext();
  const { addToast } = useToast();
  const esAdmin = useEsAdmin();

  const [activeTab, setActiveTab] = useState<'programas' | 'resumen'>('programas');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ accion: () => void; mensaje: string; detalle?: string } | null>(null);
  const [showProgForm, setShowProgForm] = useState(false);
  const [showDetalleForm, setShowDetalleForm] = useState<string | null>(null);
  const [showHiloForm, setShowHiloForm] = useState<string | null>(null);
  const [showExtornoForm, setShowExtornoForm] = useState<string | null>(null);
  const [showStockPorEtapa, setShowStockPorEtapa] = useState<Set<string>>(new Set());

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
    tipoTejidoId: '',
  });

  const [hiloForm, setHiloForm] = useState({
    fecha: new Date().toISOString().slice(0, 10), tipoHilo: '',
    kgAsignados: '', precioKg: '', moneda: 'PEN' as 'PEN'|'USD', tipoCambio: '1',
    proveedorId: '', nFactura: '', notas: '',
  });

  const [extornoForm, setExtornoForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    kgConos: '',
    precioKgHilo: '',
    notas: '',
  });

  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);
  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, c])), [colores]);
  const colorNombreMap = useMemo(() => new Map(colores.map(c => [c.id, c.nombre])), [colores]);

  // Precio sugerido para tejeduría y tintorería según color seleccionado en detalle
  const precioSugeridoDet = useMemo(() => {
    if (!detForm.colorId) return null;
    const color = colorMap.get(detForm.colorId);
    if (!color) return null;
    const match = preciosTelas.find(p => p.categoriaColor === color.categoria);
    return match?.precioKg ?? null;
  }, [detForm.colorId, colorMap, preciosTelas]);

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

  const extornosByProg = useMemo(() => {
    const map = new Map<string, StockExtorno[]>();
    for (const s of stockExtornos) {
      if (!map.has(s.programaId)) map.set(s.programaId, []);
      map.get(s.programaId)!.push(s);
    }
    return map;
  }, [stockExtornos]);

  const dashboardResumen = useMemo(() => {
    const activos = programasZurzam.filter(p => p.estado !== 'CERRADO');

    // kg producidos = suma de kgTintRetornado de todos los detalles de programas NO cerrados
    const kgProducidos = programaDetalles
      .filter(d => programasZurzam.find(p => p.id === d.programaId)?.estado !== 'CERRADO')
      .reduce((s, d) => s + d.kgTintRetornado, 0);

    // Inversión total = suma de comprasHilo totalSoles + costoTejido + costoTint de todos los detalles
    const inversionHilo = comprasHilo.reduce((s, h) => s + h.totalSoles, 0);
    const inversionTej = programaDetalles.reduce((s, d) => s + d.costoTejido, 0);
    const inversionTint = programaDetalles.reduce((s, d) => s + d.costoTint, 0);
    const inversionTotal = inversionHilo + inversionTej + inversionTint;

    // Costo/kg promedio global
    const totalKgTint = programaDetalles.reduce((s, d) => s + d.kgTintRetornado, 0);
    const costoKgPromedio = totalKgTint > 0 ? inversionTotal / totalKgTint : 0;

    // Comisión José pendiente
    const comisionPendiente = programasZurzam
      .filter(p => p.estadoPagoComision === 'PENDIENTE')
      .reduce((s, p) => s + p.comisionJose, 0);

    // CXP (cuentas por pagar) = detalles con estadoPagoTej o estadoPagoTint PENDIENTE/PARCIAL + compras PENDIENTE
    const cxpTej = programaDetalles
      .filter(d => d.estadoPagoTej === 'PENDIENTE' || d.estadoPagoTej === 'PARCIAL')
      .reduce((s, d) => s + d.costoTejido, 0);
    const cxpTint = programaDetalles
      .filter(d => d.estadoPagoTint === 'PENDIENTE' || d.estadoPagoTint === 'PARCIAL')
      .reduce((s, d) => s + d.costoTint, 0);
    const cxpHilo = comprasHilo
      .filter(h => h.estadoPago === 'PENDIENTE' || h.estadoPago === 'PARCIAL')
      .reduce((s, h) => s + h.saldo, 0);
    const cxpTotal = cxpTej + cxpTint + cxpHilo;

    // Por estado
    const porEstado = ESTADOS.map(estado => ({
      estado,
      count: programasZurzam.filter(p => p.estado === estado).length,
    }));

    return {
      totalProgramas: programasZurzam.length,
      activos: activos.length,
      kgProducidos,
      inversionTotal,
      costoKgPromedio,
      comisionPendiente,
      cxpTotal,
      porEstado,
      inversionHilo,
      inversionTej,
      inversionTint,
    };
  }, [programasZurzam, programaDetalles, comprasHilo]);

  const handleAddPrograma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progForm.nombre || !progForm.clienteId) { addToast('Completa nombre y cliente', 'error'); return; }
    const kgObjetivo = parseFloat(progForm.kgObjetivo) || 0;
    addPrograma({
      id: newId(), nombre: progForm.nombre, fecha: progForm.fecha,
      clienteId: progForm.clienteId,
      rollosObjetivo: parseInt(progForm.rollosObjetivo) || 0,
      kgObjetivo,
      estado: 'NUEVO',
      comisionJose: kgObjetivo * config.comisionJoseKg,
      estadoPagoComision: 'PENDIENTE',
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
      id: newId(), programaId,
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

    // Avance automático de estado del programa
    const prog = programasZurzam.find(p => p.id === programaId);
    if (prog) {
      const nuevoEstado = (() => {
        if (kgTej > 0 && (prog.estado === 'NUEVO' || prog.estado === 'EN_COMPRA')) return 'EN_TEJEDURIA';
        if (kgTint > 0 && prog.estado !== 'EN_PLANTA' && prog.estado !== 'CERRADO') return 'EN_TINTORERIA';
        if (parseInt(detForm.rollosFinal) > 0) return 'EN_PLANTA';
        return null;
      })();
      if (nuevoEstado) updatePrograma(programaId, { estado: nuevoEstado as EstadoPrograma });
    }

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
      id: newId(), fecha: hiloForm.fecha, programaId,
      tipoHilo: hiloForm.tipoHilo, kgAsignados: kg, precioKg: prec,
      moneda: hiloForm.moneda, tipoCambio: tc, totalSoles: total,
      proveedorId: hiloForm.proveedorId, nFactura: hiloForm.nFactura,
      costoRealFact: 0, diferencia: 0, estadoPago: 'PENDIENTE',
      montoPagado: 0, saldo: total, notas: hiloForm.notas,
    });

    // Avance de estado: si el programa estaba en NUEVO, pasar a EN_COMPRA
    const progH = programasZurzam.find(p => p.id === programaId);
    if (progH && progH.estado === 'NUEVO') {
      updatePrograma(programaId, { estado: 'EN_COMPRA' });
    }

    // Recalcular costoHiloProrrateado en todos los detalles del programa
    const detallesDelProg = programaDetalles.filter(d => d.programaId === programaId);
    const totalHiloActual = comprasHilo.filter(h => h.programaId === programaId).reduce((s, h) => s + h.totalSoles, 0) + total;
    const kgObjetivoP = progH?.kgObjetivo ?? 1;
    const costoHiloPorKg = kgObjetivoP > 0 ? totalHiloActual / kgObjetivoP : 0;
    for (const det of detallesDelProg) {
      updateProgramaDetalle(det.id, {
        costoHiloProrrateado: costoHiloPorKg,
        costoTotalColor: det.costoTejido + det.costoTint + costoHiloPorKg,
      });
    }

    addToast('Compra de hilo registrada', 'success');
    setShowHiloForm(null);
  };

  const handleAddExtorno = (e: React.FormEvent, programaId: string) => {
    e.preventDefault();
    const kg = parseFloat(extornoForm.kgConos) || 0;
    const precio = parseFloat(extornoForm.precioKgHilo) || 0;
    if (kg <= 0) { addToast('Ingresa Kg de conos', 'error'); return; }
    addStockExtorno({
      id: newId(),
      programaId,
      fecha: extornoForm.fecha,
      kgConos: kg,
      precioKgHilo: precio,
      totalSoles: kg * precio,
      usado: false,
      notas: extornoForm.notas,
    });
    addToast('Extorno registrado', 'success');
    setShowExtornoForm(null);
    setExtornoForm({ fecha: new Date().toISOString().slice(0, 10), kgConos: '', precioKgHilo: '', notas: '' });
  };

  const toggleStockEtapa = (progId: string) => {
    setShowStockPorEtapa(prev => {
      const next = new Set(prev);
      if (next.has(progId)) next.delete(progId);
      else next.add(progId);
      return next;
    });
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
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Programas Zurzam</h2>
          <p className="text-xs text-gray-500 mt-1">Tejeduría y tintorería por programa</p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleInfoBox
            accent="#7B5EA7"
            titulo="Programas Zurzam"
            descripcion="Gestiona los programas de producción de hilo, tejeduría y tintorería coordinados con Zurzam. Controla kg enviados/retornados, costos por etapa, pagos y extornos de conos sobrantes."
            items={[
              { label: 'Flujo', detail: 'NUEVO → EN_COMPRA → EN_TEJEDURIA → EN_TINTORERIA → EN_PLANTA → CERRADO' },
              { label: 'Detalles por color', detail: 'Kg, precio, TC, costo y estado de pago para tejeduría y tintorería' },
              { label: 'Compras de hilo', detail: 'Registro de facturas con diferencia costo real vs. estimado' },
              { label: 'Extornos', detail: 'Conos devueltos por tejeduría: kg × precio hilo = valor recuperado' },
            ]}
          />
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

      <div className="flex gap-1 mt-4 border-b border-[#DDD8CF]">
        {([
          { key: 'programas', label: 'Programas' },
          { key: 'resumen', label: 'Resumen Ejecutivo' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-[#B66F35] text-[#1a1a1a]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'programas' && (<>
      {programasZurzam.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin programas registrados.</p>
      ) : (
        <div className="space-y-3">
          {[...programasZurzam].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '')).map(prog => {
            const detalles = detallesByProg.get(prog.id) ?? [];
            const hilos = hilosByProg.get(prog.id) ?? [];
            const extornos = extornosByProg.get(prog.id) ?? [];
            const isOpen = expanded === prog.id;

            const totalCosto = detalles.reduce((s, d) => s + d.costoTotalColor, 0)
              + hilos.reduce((s, h) => s + h.totalSoles, 0);

            // F1.2 — Costo/kg sobre kg tint retornado total
            const kgTintRetornadoTotal = detalles.reduce((s, d) => s + d.kgTintRetornado, 0);
            const costoKgFinal = kgTintRetornadoTotal > 0 ? totalCosto / kgTintRetornadoTotal : null;

            // F1.4 — Stock en proceso (calculado, no persistido)
            const kgHiloTotal = hilos.reduce((s, h) => s + h.kgAsignados, 0);
            const kgTejEnviadoTotal = detalles.reduce((s, d) => s + d.kgTejEnviado, 0);
            const kgTejRetornadoTotal = detalles.reduce((s, d) => s + d.kgTejRetornado, 0);
            const kgTintEnviadoTotal = detalles.reduce((s, d) => s + d.kgTintEnviado, 0);
            const kgTintFinalTotal = detalles.reduce((s, d) => s + d.kgTintRetornado, 0);

            const enTejeduria = Math.max(0, kgTejEnviadoTotal - kgTejRetornadoTotal);
            const enCrudo = Math.max(0, kgTejRetornadoTotal - kgTintEnviadoTotal);

            return (
              <div key={prog.id} className="bg-white border border-gray-200">
                {/* Header row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <button className="flex items-center gap-3 flex-1 text-left" onClick={() => setExpanded(isOpen ? null : prog.id)}>
                    {isOpen ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                    <span className="font-black text-sm">{prog.nombre}</span>
                    <span className="text-xs text-gray-500">{clienteMap.get(prog.clienteId)}</span>
                    <span className="text-xs text-gray-400">{prog.fecha}</span>
                    <span className="text-xs text-gray-400">{prog.kgObjetivo} kg</span>
                    {prog.estado !== 'CERRADO' && prog.diasEntrega > 0 && (() => {
                      const fechaLimite = new Date(prog.fecha);
                      fechaLimite.setDate(fechaLimite.getDate() + prog.diasEntrega);
                      fechaLimite.setHours(0, 0, 0, 0);
                      const hoy = new Date();
                      hoy.setHours(0, 0, 0, 0);
                      const diasRestantes = Math.round((fechaLimite.getTime() - hoy.getTime()) / 86400000);
                      if (diasRestantes < 0) {
                        return <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase bg-red-100 text-red-700">Vencido hace {Math.abs(diasRestantes)}d</span>;
                      }
                      if (diasRestantes <= 3) {
                        return <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase bg-yellow-100 text-yellow-700">{diasRestantes === 0 ? 'Vence hoy' : `Vence en ${diasRestantes}d`}</span>;
                      }
                      return <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase bg-gray-100 text-gray-500">Entrega en {diasRestantes}d</span>;
                    })()}
                  </button>
                  <div className="flex items-center gap-3">
                    <select value={prog.estado}
                      onChange={e => updatePrograma(prog.id, { estado: e.target.value as EstadoPrograma })}
                      className="text-[10px] font-bold uppercase border border-gray-200 px-2 py-1 bg-white">
                      {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    {/* F1.2 — Costo total y costo/kg */}
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-mono text-gray-500">S/ {totalCosto.toFixed(0)}</span>
                      {costoKgFinal !== null && (
                        <span className="text-xs text-gray-500 font-mono">
                          Costo/kg: S/ {costoKgFinal.toFixed(2)}
                        </span>
                      )}
                    </div>
                      {esAdmin && (
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete({ mensaje: `¿Eliminar programa "${prog.nombre}"?`, detalle: 'Se eliminarán todos sus detalles y compras de hilo.', accion: () => { deletePrograma(prog.id); addToast('Programa eliminado', 'success'); } }); }} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
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
                                {['Color', 'Servicio', 'Prior.', 'Kg Tej', 'Costo Tej', '% Merma Tej', 'Kg Tint', 'Rollos', 'Costo Tint', '% Merma Tint', 'Total', 'Pago Tej', 'Pago Tint', ''].map(h => (
                                  <th key={h} className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {detalles.map(d => {
                                // F1.2 — % merma cálculo
                                const hasMermaTej = d.kgTejEnviado > 0 && d.kgTejRetornado > 0;
                                const hasMermaTint = d.kgTintEnviado > 0 && d.kgTintRetornado > 0;
                                const pctMermaTej = hasMermaTej
                                  ? (d.kgTejEnviado - d.kgTejRetornado) / d.kgTejEnviado * 100
                                  : null;
                                const pctMermaTint = hasMermaTint
                                  ? (d.kgTintEnviado - d.kgTintRetornado) / d.kgTintEnviado * 100
                                  : null;

                                const mermaTejColor = pctMermaTej !== null
                                  ? pctMermaTej <= config.mermaMaxTej
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                  : null;
                                const mermaTintColor = pctMermaTint !== null
                                  ? pctMermaTint <= config.mermaMaxTint
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                  : null;

                                return (
                                  <tr key={d.id}>
                                    <td className="px-2 py-1.5">{colorNombreMap.get(d.colorId)}</td>
                                    <td className="px-2 py-1.5 text-[10px]">{d.tipoServicio}</td>
                                    <td className="px-2 py-1.5 text-[10px]">{d.prioridad}</td>
                                    <td className="px-2 py-1.5 font-mono text-right">{d.kgTejEnviado}</td>
                                    <td className="px-2 py-1.5 font-mono text-right">S/ {d.costoTejido.toFixed(2)}</td>
                                    {/* F1.2 — % Merma Tej badge */}
                                    <td className="px-2 py-1.5 text-center">
                                      {mermaTejColor && pctMermaTej !== null ? (
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${mermaTejColor}`}>
                                          {pctMermaTej.toFixed(1)}%
                                        </span>
                                      ) : (
                                        <span className="text-gray-300 text-[10px]">—</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 font-mono text-right">{d.kgTintEnviado}</td>
                                    <td className="px-2 py-1.5 font-mono text-right">{d.rollosFinal}</td>
                                    <td className="px-2 py-1.5 font-mono text-right">S/ {d.costoTint.toFixed(2)}</td>
                                    {/* F1.2 — % Merma Tint badge */}
                                    <td className="px-2 py-1.5 text-center">
                                      {mermaTintColor && pctMermaTint !== null ? (
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${mermaTintColor}`}>
                                          {pctMermaTint.toFixed(1)}%
                                        </span>
                                      ) : (
                                        <span className="text-gray-300 text-[10px]">—</span>
                                      )}
                                    </td>
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
                                    <td className="px-2 py-1.5">
                                        {esAdmin && (
                                          <button onClick={() => setConfirmDelete({ mensaje: '¿Eliminar este detalle?', accion: () => { deleteProgramaDetalle(d.id); addToast('Detalle eliminado', 'success'); } })} className="text-gray-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                    </td>
                                  </tr>
                                );
                              })}
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
                              {['Fecha', 'Tipo Hilo', 'Kg', 'Precio', 'Moneda', 'Total S/.', 'Estado', 'Saldo', ''].map(h => (
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
                                <td className="px-2 py-1.5">
                                    {esAdmin && (
                                      <button onClick={() => setConfirmDelete({ mensaje: '¿Eliminar esta compra de hilo?', accion: () => { deleteCompraHilo(h.id); addToast('Compra eliminada', 'success'); } })} className="text-gray-300 hover:text-red-500 transition-colors">
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* F1.3 — Stock Extorno */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Stock Extorno</h4>
                        <button onClick={() => { setShowExtornoForm(prog.id); setExtornoForm({ fecha: new Date().toISOString().slice(0, 10), kgConos: '', precioKgHilo: '', notas: '' }); }} className="btn-secondary text-xs flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Agregar Extorno
                        </button>
                      </div>
                      {extornos.length === 0 ? <p className="text-xs text-gray-400 italic">Sin extornos registrados.</p> : (
                        <>
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100">
                                {['Fecha', 'Kg Conos', 'Precio/kg', 'Total S/.', 'Usado', 'Notas', ''].map(h => (
                                  <th key={h} className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {extornos.map(s => (
                                <tr key={s.id}>
                                  <td className="px-2 py-1.5 font-mono">{s.fecha}</td>
                                  <td className="px-2 py-1.5 font-mono text-right">{s.kgConos.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 font-mono text-right">S/ {s.precioKgHilo.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 font-mono text-right font-bold">S/ {s.totalSoles.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={s.usado}
                                      onChange={() => updateStockExtorno(s.id, { usado: !s.usado })}
                                      className="cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-500">{s.notas}</td>
                                  <td className="px-2 py-1.5">
                                      {esAdmin && (
                                        <button onClick={() => setConfirmDelete({ mensaje: '¿Eliminar este extorno?', accion: () => { deleteStockExtorno(s.id); addToast('Extorno eliminado', 'success'); } })} className="text-gray-300 hover:text-red-500 transition-colors">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex gap-6 mt-2 px-2 text-xs text-gray-500 font-mono">
                            <span>Total kg extornados: <strong>{extornos.reduce((s, e) => s + e.kgConos, 0).toFixed(2)} kg</strong></span>
                            <span>Valor total: <strong>S/ {extornos.reduce((s, e) => s + e.totalSoles, 0).toFixed(2)}</strong></span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* F1.4 — Stock en Proceso (colapsable) */}
                    <div>
                      <button
                        onClick={() => toggleStockEtapa(prog.id)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showStockPorEtapa.has(prog.id)
                          ? <ChevronDown className="h-3 w-3" />
                          : <ChevronRight className="h-3 w-3" />
                        }
                        Stock en Proceso
                      </button>
                      {showStockPorEtapa.has(prog.id) && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="min-w-full text-xs border border-gray-100">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Etapa</th>
                                <th className="px-3 py-1.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">KG</th>
                                <th className="px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Descripción</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="bg-amber-50">
                                <td className="px-3 py-1.5 font-bold">En hilo</td>
                                <td className="px-3 py-1.5 font-mono text-right">{kgHiloTotal.toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-gray-500">Hilo comprado</td>
                              </tr>
                              <tr className="bg-blue-50">
                                <td className="px-3 py-1.5 font-bold">En tejeduría</td>
                                <td className="px-3 py-1.5 font-mono text-right">{enTejeduria.toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-gray-500">Enviado, no retornado</td>
                              </tr>
                              <tr className="bg-gray-50">
                                <td className="px-3 py-1.5 font-bold">En crudo</td>
                                <td className="px-3 py-1.5 font-mono text-right">{enCrudo.toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-gray-500">Tejido sin teñir</td>
                              </tr>
                              <tr className="bg-green-50">
                                <td className="px-3 py-1.5 font-bold">Tela final</td>
                                <td className="px-3 py-1.5 font-mono text-right">{kgTintFinalTotal.toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-gray-500">Tela teñida disponible</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
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
            {preciosTejeduria.length > 0 && (
              <F label="Tipo Tejido (precio ref.)">
                <select
                  value={detForm.tipoTejidoId}
                  onChange={e => {
                    const pt = preciosTejeduria.find(p => p.id === e.target.value);
                    setDetForm(f => ({
                      ...f,
                      tipoTejidoId: e.target.value,
                      precioKgTej: pt ? String(pt.precioKg) : f.precioKgTej,
                    }));
                  }}
                  className="input-base"
                >
                  <option value="">— seleccionar —</option>
                  {preciosTejeduria.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.tipoTejido} — S/ {pt.precioKg.toFixed(2)}/kg</option>
                  ))}
                </select>
              </F>
            )}
            <div className="grid grid-cols-3 gap-3">
              <F label="Kg Enviado"><input type="number" min={0} step={0.1} value={detForm.kgTejEnviado} onChange={e => setDetForm(f => ({ ...f, kgTejEnviado: e.target.value }))} className="input-base" /></F>
              <F label={precioSugeridoDet ? `Precio/Kg (sug: S/${precioSugeridoDet})` : 'Precio/Kg'}>
                <div className="flex gap-1">
                  <input type="number" min={0} step={0.01} value={detForm.precioKgTej} onChange={e => setDetForm(f => ({ ...f, precioKgTej: e.target.value }))} className="input-base flex-1" />
                  {precioSugeridoDet && !detForm.precioKgTej && (
                    <button type="button" onClick={() => setDetForm(f => ({ ...f, precioKgTej: String(precioSugeridoDet) }))} className="text-[10px] font-bold text-blue-600 border border-blue-200 px-1">Usar</button>
                  )}
                </div>
              </F>
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

      {/* F1.3 — Modal extorno */}
      {showExtornoForm && (
        <Modal title="Agregar Extorno de Hilo" onClose={() => setShowExtornoForm(null)}>
          <form onSubmit={e => handleAddExtorno(e, showExtornoForm)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <F label="Fecha">
                <input type="date" value={extornoForm.fecha} onChange={e => setExtornoForm(f => ({ ...f, fecha: e.target.value }))} className="input-base" />
              </F>
              <F label="Kg Conos">
                <input type="number" min={0} step={0.01} value={extornoForm.kgConos} onChange={e => setExtornoForm(f => ({ ...f, kgConos: e.target.value }))} className="input-base" required />
              </F>
            </div>
            <F label="Precio/kg hilo">
              <input type="number" min={0} step={0.01} value={extornoForm.precioKgHilo} onChange={e => setExtornoForm(f => ({ ...f, precioKgHilo: e.target.value }))} className="input-base" />
            </F>
            {extornoForm.kgConos && extornoForm.precioKgHilo && (
              <p className="text-xs font-mono text-gray-500">
                Total calculado: <strong>S/ {(parseFloat(extornoForm.kgConos) * parseFloat(extornoForm.precioKgHilo)).toFixed(2)}</strong>
              </p>
            )}
            <F label="Notas">
              <input type="text" value={extornoForm.notas} onChange={e => setExtornoForm(f => ({ ...f, notas: e.target.value }))} className="input-base" />
            </F>
            <ModalActions onCancel={() => setShowExtornoForm(null)} />
          </form>
        </Modal>
      )}
      </>)}

      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Programas Activos', val: String(dashboardResumen.activos), sub: `${dashboardResumen.totalProgramas} total` },
              { label: 'Kg Producidos', val: `${dashboardResumen.kgProducidos.toFixed(1)} kg`, sub: 'tela retornada de tintorería' },
              { label: 'Inversión Total', val: `S/ ${dashboardResumen.inversionTotal.toFixed(0)}`, sub: 'hilo + tejeduría + tintorería' },
              { label: 'Costo/kg Promedio', val: dashboardResumen.costoKgPromedio > 0 ? `S/ ${dashboardResumen.costoKgPromedio.toFixed(2)}` : '—', sub: 'costo total / kg tela' },
            ].map(card => (
              <div key={card.label} className="bg-white border border-[#DDD8CF] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{card.label}</p>
                <p className="text-2xl font-black mt-1">{card.val}</p>
                <p className="text-[10px] text-gray-400 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Segunda fila de KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-amber-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Comisión José Pendiente</p>
              <p className="text-2xl font-black mt-1">S/ {dashboardResumen.comisionPendiente.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-1">programas con pago pendiente</p>
            </div>
            <div className="bg-white border border-red-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">CXP Total</p>
              <p className="text-2xl font-black mt-1">S/ {dashboardResumen.cxpTotal.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-1">tejeduría + tintorería + hilo pendiente</p>
            </div>
          </div>

          {/* Desglose inversión */}
          <div className="bg-white border border-[#DDD8CF] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Desglose Inversión</p>
            <div className="space-y-2">
              {[
                { label: 'Hilo', val: dashboardResumen.inversionHilo },
                { label: 'Tejeduría', val: dashboardResumen.inversionTej },
                { label: 'Tintorería', val: dashboardResumen.inversionTint },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-mono font-bold">S/ {item.val.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-black border-t border-gray-200 pt-2 mt-2">
                <span>Total</span>
                <span className="font-mono">S/ {dashboardResumen.inversionTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Por estado */}
          <div className="bg-white border border-[#DDD8CF] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Programas por Estado</p>
            <div className="flex flex-wrap gap-2">
              {dashboardResumen.porEstado.map(({ estado, count }) => (
                <div key={estado} className="flex items-center gap-2 border border-gray-200 px-3 py-2 text-xs">
                  <span className="font-mono text-gray-500">{estado}</span>
                  <span className="font-black text-lg">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          mensaje={confirmDelete.mensaje}
          detalle={confirmDelete.detalle ?? 'Esta acción no se puede deshacer.'}
          onConfirmar={() => {
            confirmDelete.accion();
            setConfirmDelete(null);
          }}
          onCancelar={() => setConfirmDelete(null)}
        />
      )}
    </motion.div>
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
