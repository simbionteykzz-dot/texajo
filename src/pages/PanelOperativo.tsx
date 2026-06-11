import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowRight, CheckCircle2, Coins, Factory, FileSpreadsheet, History, PackagePlus, Receipt, RotateCcw, Scissors, Truck, Upload, UserCheck, X } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { BoletaLinea, CobroDiario, Corte, MovimientoTela, ProgramaZurzam } from '../types';
import { generateId, todayDate } from '../lib/storage';

type ActionKey = 'ingreso' | 'corte' | 'entrega' | 'cobro' | 'liquidacion' | 'proveedor' | 'cierre' | 'correccion' | 'exportar' | 'importar';
type CorreccionTipo = 'CORTE' | 'COBRO' | 'MOVIMIENTO';

const money = (value: number) => `S/. ${value.toFixed(2)}`;

export function PanelOperativo() {
  const {
    clientes,
    proveedores,
    telas,
    colores,
    preciosTelas,
    productos,
    operarios,
    movimientosTela,
    cortes,
    tarifasOperaciones,
    boletaLineas,
    cobrosDiarios,
    comprasHilo,
    programaDetalles,
    programasZurzam,
    config,
    addMovimientoTela,
    updateMovimientoTela,
    addCorte,
    addBoletaLinea,
    updateBoletaLinea,
    addCobroDiario,
    updateCobroDiario,
    updateCorte,
    updateCompraHilo,
    updateProgramaDetalle,
    updatePrograma,
  } = useAppContext();
  const { addToast } = useToast();
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);

  const [ingreso, setIngreso] = useState({
    telaId: telas[0]?.id ?? '',
    colorId: colores[0]?.id ?? '',
    rollos: 0,
    kgTotal: 0,
    proveedorId: proveedores[0]?.id ?? '',
    nFactura: '',
    costoReal: 0,
  });
  const [corte, setCorte] = useState({
    clienteId: clientes[0]?.id ?? '',
    productoId: productos[0]?.id ?? '',
    colorId: colores[0]?.id ?? '',
    operarioId: operarios[0]?.id ?? '',
    kg: 0,
    rollos: 0,
    cantS: 0,
    cantM: 0,
    cantL: 0,
    cantXL: 0,
  });
  const [entregaCorteId, setEntregaCorteId] = useState('');
  const [cobroId, setCobroId] = useState('');
  const [operarioId, setOperarioId] = useState(operarios[0]?.id ?? '');
  const [pagoKey, setPagoKey] = useState('');
  const [programaId, setProgramaId] = useState(programasZurzam.find(p => p.estado !== 'CERRADO')?.id ?? '');
  const [correccion, setCorreccion] = useState<{ tipo: CorreccionTipo; id: string; motivo: string }>({
    tipo: 'CORTE',
    id: '',
    motivo: '',
  });
  const [importText, setImportText] = useState('');
  const [importLimpiar, setImportLimpiar] = useState(true);

  const stockRollos = (telaId: string, colorId: string) =>
    movimientosTela.reduce((stock, mov) => {
      if (mov.telaId !== telaId || mov.colorId !== colorId) return stock;
      const sign = mov.tipo === 'INGRESO' || mov.tipo === 'DE_REPROCESO' || mov.tipo === 'AJUSTE_POS' ? 1 : -1;
      return stock + sign * mov.rollos;
    }, 0);

  const activeOperarios = operarios.filter(o => o.estado === 'ACTIVO');
  const cortesPendientesEntrega = cortes.filter(corte => !cobrosDiarios.some(c => c.nCorte === corte.nCorte));
  const cobrosPendientes = cobrosDiarios.filter(cobro => cobro.estado === 'PENDIENTE');
  const asignacionesPendientes = boletaLineas.filter(item => item.estadoPago !== 'PAGADO');
  const movimientosActivos = movimientosTela.filter(item => !item.notas.toLowerCase().includes('anulado'));
  const correccionOptions = correccion.tipo === 'CORTE'
    ? cortes.filter(c => c.estado !== 'ANULADO').map(c => [c.id, `${c.nCorte} · ${productoNombre(productos, c.productoId)}`] as [string, string])
    : correccion.tipo === 'COBRO'
      ? cobrosDiarios.filter(c => c.estado !== 'ANULADO').map(c => [c.id, `${c.nCorte} · ${money(c.bruto)} · ${c.estado}`] as [string, string])
      : movimientosActivos.map(m => [m.id, `${m.fecha} · ${m.tipo} · ${telaNombre(telas, m.telaId)} · ${m.rollos} rollos`] as [string, string]);
  const resumenStock = telas.flatMap(tela => colores.map(color => {
    const rollos = stockRollos(tela.id, color.id);
    return { tela, color, rollos };
  })).filter(item => item.rollos > 0);
  const stockCritico = resumenStock.filter(item => item.rollos <= config.umbralCritico);
  const stockBajo = resumenStock.filter(item => item.rollos > config.umbralCritico && item.rollos <= config.umbralBajo);
  const alertas = [
    ...stockCritico.slice(0, 3).map(item => ({
      nivel: 'CRITICO',
      texto: `${item.tela.nombre} ${item.color.nombre}: ${item.rollos.toFixed(1)} rollos`,
    })),
    ...(stockCritico.length === 0 ? stockBajo.slice(0, 2).map(item => ({
      nivel: 'BAJO',
      texto: `${item.tela.nombre} ${item.color.nombre}: ${item.rollos.toFixed(1)} rollos`,
    })) : []),
    ...(cortes.filter(c => c.estado === 'EN_PROCESO').length > 0 ? [{
      nivel: 'CORTE',
      texto: `${cortes.filter(c => c.estado === 'EN_PROCESO').length} cortes siguen en proceso`,
    }] : []),
    ...(cobrosPendientes.length > 0 ? [{
      nivel: 'COBRO',
      texto: `${cobrosPendientes.length} cobros pendientes por ${money(cobrosPendientes.reduce((sum, item) => sum + item.bruto, 0))}`,
    }] : []),
  ];
  const pagosPendientes = [
    ...comprasHilo
      .filter(item => item.estadoPago !== 'PAGADO' && item.saldo > 0)
      .map(item => ({
        key: `hilo:${item.id}`,
        label: `Hilo · ${item.programaId} · ${money(item.saldo)}`,
        pagar: () => updateCompraHilo(item.id, {
          estadoPago: 'PAGADO',
          montoPagado: item.totalSoles,
          saldo: 0,
          fechaPago: todayDate(),
        }),
      })),
    ...programaDetalles.flatMap(item => [
      item.estadoPagoTej !== 'PAGADO' && item.costoTejido > 0 ? {
        key: `tej:${item.id}`,
        label: `Tejeduria · ${item.programaId} · ${money(item.costoTejido)}`,
        pagar: () => updateProgramaDetalle(item.id, { estadoPagoTej: 'PAGADO' }),
      } : null,
      item.estadoPagoTint !== 'PAGADO' && item.costoTint > 0 ? {
        key: `tint:${item.id}`,
        label: `Tintoreria · ${item.programaId} · ${money(item.costoTint)}`,
        pagar: () => updateProgramaDetalle(item.id, { estadoPagoTint: 'PAGADO' }),
      } : null,
    ]).filter(Boolean) as { key: string; label: string; pagar: () => void }[],
  ];

  const totalDestajoOperario = useMemo(
    () => boletaLineas
      .filter(item => item.operarioId === operarioId && item.estadoPago !== 'PAGADO')
      .reduce((sum, item) => sum + item.importe, 0),
    [boletaLineas, operarioId]
  );

  const resumenLiquidacion = useMemo(() =>
    activeOperarios.map(o => {
      const pendientes = boletaLineas.filter(a =>
        a.operarioId === o.id && a.estadoPago !== 'PAGADO'
      );
      return {
        operario: o,
        operaciones: pendientes.length,
        prendas: pendientes.reduce((s, a) => s + a.cantPrendas, 0),
        importe: pendientes.reduce((s, a) => s + a.importe, 0),
      };
    }).filter(item => item.importe > 0),
    [activeOperarios, boletaLineas]
  );

  const log = (_accion: string, _entidad: string, _detalle: string, _entidadId?: string, _monto?: number) => {
    // audit log removed from schema — kept as no-op to preserve handler signatures
  };

  const precioKgTela = (telaId: string, colorId: string) => {
    const categoriaColor = colores.find(c => c.id === colorId)?.categoria ?? 'OSCURO';
    return preciosTelas.find(p => p.telaId === telaId && p.categoriaColor === categoriaColor)?.precioKg ?? 0;
  };

  const close = () => setActiveAction(null);

  const handleIngreso = () => {
    if (ingreso.rollos <= 0 || ingreso.kgTotal <= 0 || !ingreso.telaId || !ingreso.colorId) {
      addToast('Completa tela, color, rollos y kg.', 'error');
      return;
    }
    const precioKg = precioKgTela(ingreso.telaId, ingreso.colorId);
    const stockRollosAntes = stockRollos(ingreso.telaId, ingreso.colorId);
    const movimiento: MovimientoTela = {
      id: generateId('MOV'),
      fecha: todayDate(),
      tipo: 'INGRESO',
      clienteId: '',
      telaId: ingreso.telaId,
      colorId: ingreso.colorId,
      rollos: ingreso.rollos,
      kgTotal: ingreso.kgTotal,
      categoriaColor: colores.find(c => c.id === ingreso.colorId)?.categoria ?? 'OSCURO',
      precioKg,
      totalSoles: ingreso.kgTotal * precioKg,
      stockRollosAntes,
      stockRollosDespues: stockRollosAntes + ingreso.rollos,
      responsable: 'Panel operativo',
      notas: 'Ingreso guiado',
      proveedorId: ingreso.proveedorId || undefined,
      nFactura: ingreso.nFactura.trim() || undefined,
      costoRealFact: ingreso.costoReal || undefined,
    };
    addMovimientoTela(movimiento);
    log('Ingreso de tela', 'TELA', `${telaNombre(telas, ingreso.telaId)} / ${colorNombre(colores, ingreso.colorId)}: ${ingreso.rollos} rollos, ${ingreso.kgTotal} kg`, movimiento.id, movimiento.totalSoles);
    addToast('Tela ingresada y stock actualizado.', 'success');
    close();
  };

  const handleCorte = () => {
    const totalPrendas = corte.cantS + corte.cantM + corte.cantL + corte.cantXL;
    const producto = productos.find(p => p.id === corte.productoId);
    if (!producto || totalPrendas <= 0 || corte.kg <= 0 || !corte.operarioId) {
      addToast('Completa producto, kg, prendas y operario.', 'error');
      return;
    }
    const telaId = telas.find(t => t.nombre === producto.telaBase)?.id ?? '';
    const tela = telas.find(t => t.id === telaId);
    const rollosUsados = corte.rollos || Number((corte.kg / (tela?.kgPorRollo || 20)).toFixed(2));
    const stockAntes = telaId ? stockRollos(telaId, corte.colorId) : 0;
    if (telaId && rollosUsados > stockAntes) {
      addToast(`Stock insuficiente: disponible ${stockAntes} rollos.`, 'error');
      return;
    }

    const corteId = generateId('CORTE');
    const nCorte = `CORTE-${Date.now().toString().slice(-6)}`;
    const nuevoCorte: Corte = {
      id: corteId,
      fecha: todayDate(),
      nCorte,
      clienteId: corte.clienteId,
      productoId: corte.productoId,
      colorId: corte.colorId,
      cortador: operarios.find(o => o.id === corte.operarioId)?.nombre ?? corte.operarioId,
      ayudante: '',
      tendedor: '',
      kgUsados: corte.kg,
      rollosUsados,
      tendidas: 0,
      mtsPorTendida: 0,
      ancho: 0.9,
      cantS: corte.cantS,
      cantM: corte.cantM,
      cantL: corte.cantL,
      cantXL: corte.cantXL,
      totalPrendas,
      consumo: Number((corte.kg / totalPrendas).toFixed(3)),
      rendimiento: Number((totalPrendas / corte.kg).toFixed(2)),
      revision: 'PENDIENTE',
      traslado: false,
      estado: 'EN_PROCESO',
      pagoCliente: 'PENDIENTE',
      pagoPlanilla: 'PENDIENTE',
      costoMoCorte: 0,
      notas: '',
    };
    addCorte(nuevoCorte);

    const precioKg = precioKgTela(telaId, corte.colorId);
    addMovimientoTela({
      id: generateId('MOV'),
      fecha: todayDate(),
      tipo: 'A_CORTE',
      clienteId: corte.clienteId,
      telaId,
      colorId: corte.colorId,
      rollos: rollosUsados,
      kgTotal: corte.kg,
      categoriaColor: colores.find(c => c.id === corte.colorId)?.categoria ?? 'OSCURO',
      precioKg,
      totalSoles: corte.kg * precioKg,
      stockRollosAntes: stockAntes,
      stockRollosDespues: stockAntes - rollosUsados,
      responsable: 'Panel operativo',
      notas: `Consumo automatico ${nCorte}`,
      corteId,
      nCorte,
    });

    const mesActual = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
    const tarifas = tarifasOperaciones.filter(t => t.productoId === corte.productoId).sort((a, b) => a.orden - b.orden);
    const boletasNuevas: BoletaLinea[] = tarifas.map(tarifa => ({
      id: generateId(`BL-${tarifa.orden}`),
      operarioId: corte.operarioId,
      corteId,
      nCorte,
      productoId: corte.productoId,
      tarifaId: tarifa.id,
      operacion: tarifa.operacion,
      orden: tarifa.orden,
      tarifa: tarifa.tarifa,
      cantPrendas: totalPrendas,
      importe: Number((totalPrendas * tarifa.tarifa).toFixed(2)),
      periodo: mesActual,
      estadoPago: 'PENDIENTE',
    }));
    boletasNuevas.forEach(b => addBoletaLinea(b));
    log('Creacion de corte', 'CORTE', `${nCorte}: ${totalPrendas} prendas, ${corte.kg} kg descontados`, corteId);
    addToast('Corte creado, tela descontada y destajo generado.', 'success');
    close();
  };

  const handleEntrega = () => {
    const selected = cortes.find(corte => corte.id === entregaCorteId) ?? cortesPendientesEntrega[0];
    if (!selected) {
      addToast('No hay cortes pendientes de entrega.', 'error');
      return;
    }
    const producto = productos.find(p => p.id === selected.productoId);
    const precioUnitario = producto?.precioServicio ?? 0;
    const bruto = selected.totalPrendas * precioUnitario;
    const detraccion = bruto * config.detraccionPct;
    const cobro: CobroDiario = {
      id: generateId('COB'),
      fecha: todayDate(),
      nCorte: selected.nCorte,
      nFactura: '',
      clienteId: selected.clienteId,
      productoId: selected.productoId,
      colorId: selected.colorId,
      cantS: selected.cantS,
      cantM: selected.cantM,
      cantL: selected.cantL,
      cantXL: selected.cantXL,
      totalPrendas: selected.totalPrendas,
      precioUnitario,
      bruto,
      detraccion10Pct: detraccion,
      disponible90Pct: bruto - detraccion,
      estado: 'PENDIENTE',
      notas: 'Entrega guiada desde panel operativo',
    };
    addCobroDiario(cobro);
    updateCorte(selected.id, { estado: 'COMPLETADO', revision: 'VERIFICADO' });
    log('Entrega de corte', 'COBRO', `${selected.nCorte}: cobro pendiente por ${money(bruto)}`, cobro.id, bruto);
    addToast('Entrega creada y corte marcado como entregado.', 'success');
    close();
  };

  const handleCobro = () => {
    const selected = cobrosPendientes.find(cobro => cobro.id === cobroId) ?? cobrosPendientes[0];
    if (!selected) {
      addToast('No hay cobros pendientes.', 'error');
      return;
    }
    updateCobroDiario(selected.id, { estado: 'COBRADO', fechaCobro: todayDate() });
    log('Cobro registrado', 'COBRO', `${selected.nCorte}: cobrado por ${money(selected.bruto)}`, selected.id, selected.bruto);
    addToast('Cobro registrado.', 'success');
    close();
  };

  const handleLiquidarOperario = () => {
    const pendientes = boletaLineas.filter(item =>
      item.operarioId === operarioId && item.estadoPago !== 'PAGADO'
    );
    if (!pendientes.length) {
      addToast('No hay destajos pendientes para este operario.', 'error');
      return;
    }
    pendientes.forEach(item => updateBoletaLinea(item.id, {
      estadoPago: 'PAGADO',
      fechaPago: todayDate(),
    }));
    const total = pendientes.reduce((sum, item) => sum + item.importe, 0);
    log('Liquidacion de operario', 'OPERARIO', `${operarioNombre(operarios, operarioId)}: ${pendientes.length} operaciones pagadas`, undefined, total);
    addToast('Liquidacion registrada y operaciones marcadas como pagadas.', 'success');
    close();
  };

  type ImportRow = { operario: string; nCorte: string; operacion: string; importe: number; error?: string };

  const importRows = useMemo((): ImportRow[] => {
    return importText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const cols = line.split(/\t|;/).map(c => c.trim());
        if (cols.length < 3) return { operario: '', nCorte: '', operacion: '', importe: 0, error: `Línea con menos de 3 columnas: "${line}"` };
        const [col1, col2, col3, col4] = cols;
        const importe = parseFloat((col4 ?? col3).replace(',', '.'));
        if (isNaN(importe)) return { operario: col1, nCorte: col2, operacion: col3, importe: 0, error: `Importe inválido en: "${line}"` };
        if (cols.length >= 4) return { operario: col1, nCorte: col2, operacion: col3, importe };
        return { operario: col1, nCorte: col2, operacion: 'Destajo', importe };
      });
  }, [importText]);
  const importErrors = importRows.filter(r => r.error);

  const handleImportar = () => {
    const rows = importRows.filter(r => !r.error);
    if (!rows.length) {
      addToast('No hay filas válidas para importar.', 'error');
      return;
    }

    const normName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

    if (importLimpiar) {
      boletaLineas
        .filter(b => b.estadoPago !== 'PAGADO')
        .forEach(b => updateBoletaLinea(b.id, { estadoPago: 'PAGADO', fechaPago: todayDate() }));
    }

    const nuevas: BoletaLinea[] = [];
    const errores: string[] = [];
    const mesActual = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();

    for (const row of rows) {
      const corte = cortes.find(c => c.nCorte.trim().toLowerCase() === row.nCorte.toLowerCase());
      if (!corte) { errores.push(`Corte no encontrado: "${row.nCorte}"`); continue; }

      const opNorm = normName(row.operario);
      const operario = operarios.find(o => normName(o.nombre).includes(opNorm));
      if (!operario) { errores.push(`Operario no encontrado: "${row.operario}"`); continue; }

      const tarifa = corte.totalPrendas > 0 ? Number((row.importe / corte.totalPrendas).toFixed(4)) : 0;

      nuevas.push({
        id: generateId('BL-IMP'),
        operarioId: operario.id,
        corteId: corte.id,
        nCorte: corte.nCorte,
        productoId: corte.productoId,
        tarifaId: '',
        operacion: row.operacion,
        orden: 1,
        tarifa,
        cantPrendas: corte.totalPrendas,
        importe: row.importe,
        periodo: mesActual,
        estadoPago: 'PENDIENTE',
      });
    }

    if (nuevas.length) nuevas.forEach(b => addBoletaLinea(b));

    if (errores.length) {
      addToast(`Importado con ${errores.length} error(es): ${errores[0]}`, 'error');
    } else {
      addToast(`${nuevas.length} registros importados correctamente.`, 'success');
      setImportText('');
      close();
    }
  };

  const handleLiquidarTodos = () => {
    const pendientes = boletaLineas.filter(item => item.estadoPago !== 'PAGADO');
    if (!pendientes.length) {
      addToast('No hay destajos pendientes.', 'error');
      return;
    }
    pendientes.forEach(item => updateBoletaLinea(item.id, {
      estadoPago: 'PAGADO',
      fechaPago: todayDate(),
    }));
    const total = pendientes.reduce((sum, item) => sum + item.importe, 0);
    log('Liquidacion masiva', 'OPERARIO', `${pendientes.length} operaciones liquidadas — ${resumenLiquidacion.length} operarios`, undefined, total);
    addToast(`${pendientes.length} operaciones liquidadas — ${money(total)}`, 'success');
    close();
  };

  const handlePagoProveedor = () => {
    const selected = pagosPendientes.find(item => item.key === pagoKey) ?? pagosPendientes[0];
    if (!selected) {
      addToast('No hay pagos pendientes.', 'error');
      return;
    }
    selected.pagar();
    log('Pago a proveedor', 'PROVEEDOR', selected.label, selected.key);
    addToast('Pago a proveedor registrado.', 'success');
    close();
  };

  const handleCerrarPrograma = () => {
    const selected = programasZurzam.find(p => p.id === programaId) ?? programasZurzam.find(p => p.estado !== 'CERRADO');
    if (!selected) {
      addToast('No hay programas activos.', 'error');
      return;
    }
    const detalles = programaDetalles.filter(item => item.programaId === selected.id);
    const kgFinal = detalles.reduce((sum, item) => sum + item.kgTintRetornado, 0);
    const costoProcesos = detalles.reduce((sum, item) => sum + item.costoTejido + item.costoTint, 0);
    const comisionJose = kgFinal * config.comisionJoseKg;
    const inversionTotal = costoProcesos + comisionJose;
    const updates: Partial<ProgramaZurzam> = {
      comisionJose,
      kgObjetivo: kgFinal || selected.kgObjetivo,
      estado: 'CERRADO',
    };
    updatePrograma(selected.id, updates);
    log('Cierre de programa', 'PROGRAMA', `${selected.nombre}: inversion ${money(inversionTotal)}`, selected.id, inversionTotal);
    addToast('Programa cerrado con costos recalculados.', 'success');
    close();
  };

  const handleCorreccion = () => {
    if (!correccion.id) {
      addToast('Selecciona el registro a corregir.', 'error');
      return;
    }
    const motivo = correccion.motivo.trim() || 'Correccion operativa';
    if (correccion.tipo === 'CORTE') {
      const selected = cortes.find(item => item.id === correccion.id);
      if (!selected) return;
      updateCorte(selected.id, { estado: 'ANULADO' });
      cobrosDiarios
        .filter(cobro => cobro.nCorte === selected.nCorte)
        .forEach(cobro => updateCobroDiario(cobro.id, { estado: 'ANULADO', notas: `${cobro.notas} | Anulado: ${motivo}` }));
      boletaLineas
        .filter(item => item.corteId === selected.id)
        .forEach(item => updateBoletaLinea(item.id, { estadoPago: 'PAGADO', fechaPago: todayDate() }));
      movimientosTela
        .filter(item => item.corteId === selected.id && item.tipo === 'A_CORTE')
        .forEach(item => addMovimientoTela({
          ...item,
          id: generateId('AJUSTE'),
          fecha: todayDate(),
          tipo: 'AJUSTE_POS',
          stockRollosAntes: stockRollos(item.telaId, item.colorId),
          stockRollosDespues: stockRollos(item.telaId, item.colorId) + item.rollos,
          responsable: 'Panel operativo',
          notas: `Reingreso por anulacion ${selected.nCorte}: ${motivo}`,
        }));
      log('Anulacion de corte', 'CORTE', `${selected.nCorte}: ${motivo}`, selected.id);
    }
    if (correccion.tipo === 'COBRO') {
      const selected = cobrosDiarios.find(item => item.id === correccion.id);
      if (!selected) return;
      updateCobroDiario(selected.id, { estado: 'ANULADO', notas: `${selected.notas} | Anulado: ${motivo}` });
      log('Anulacion de cobro', 'COBRO', `${selected.nCorte}: ${motivo}`, selected.id, selected.bruto);
    }
    if (correccion.tipo === 'MOVIMIENTO') {
      const selected = movimientosTela.find(item => item.id === correccion.id);
      if (!selected) return;
      const reverseType = selected.tipo === 'INGRESO' || selected.tipo === 'DE_REPROCESO' || selected.tipo === 'AJUSTE_POS' ? 'AJUSTE_NEG' : 'AJUSTE_POS';
      const stockAntes = stockRollos(selected.telaId, selected.colorId);
      const sign = reverseType === 'AJUSTE_POS' ? 1 : -1;
      addMovimientoTela({
        ...selected,
        id: generateId('AJUSTE'),
        fecha: todayDate(),
        tipo: reverseType,
        stockRollosAntes: stockAntes,
        stockRollosDespues: stockAntes + sign * selected.rollos,
        responsable: 'Panel operativo',
        notas: `Ajuste por anulacion de ${selected.id}: ${motivo}`,
      });
      updateMovimientoTela(selected.id, { notas: `${selected.notas} | Anulado con ajuste: ${motivo}` });
      log('Correccion de movimiento', 'TELA', `${selected.tipo}: ${motivo}`, selected.id, selected.totalSoles);
    }
    addToast('Correccion registrada con historial.', 'success');
    close();
  };

  const buildExportRows = () => ({
    Stock: resumenStock.map(item => ({
      tela: item.tela.nombre,
      color: item.color.nombre,
      rollos: item.rollos,
    })),
    Cortes: cortes.map(item => ({
      fecha: item.fecha,
      corte: item.nCorte,
      producto: productoNombre(productos, item.productoId),
      prendas: item.totalPrendas,
      estado: item.estado,
    })),
    Cobros: cobrosDiarios.map(item => ({
      fecha: item.fecha,
      corte: item.nCorte,
      bruto: item.bruto,
      disponible: item.disponible90Pct,
      estado: item.estado,
    })),
    DestajoPendiente: asignacionesPendientes.map(item => ({
      corte: cortes.find(c => c.id === item.corteId)?.nCorte ?? item.corteId,
      operario: operarioNombre(operarios, item.operarioId),
      operacion: item.operacion,
      prendas: item.cantPrendas,
      importe: item.importe,
      estado: item.estadoPago,
    })),
  });

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    Object.entries(buildExportRows()).forEach(([name, rows]) => {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
    });
    XLSX.writeFile(workbook, `Modulo_Texajo_Operacion_${todayDate()}.xlsx`);
    log('Exportacion Excel', 'EXPORTACION', 'Resumen operativo exportado a Excel');
    addToast('Excel operativo exportado.', 'success');
  };

  const exportPdf = () => {
    const rows = buildExportRows();
    const date = todayDate();
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Resumen Operativo — Modulo Texajo</title>
  <style>
    @page { margin: 14mm 12mm; size: A4 portrait; }
    * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #fff;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      line-height: 1.4;
    }
    /* ── Document header ── */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2pt solid #1a1a1a;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .brand-label {
      font-family: 'Courier New', monospace;
      font-size: 6.5pt;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      color: #888;
      margin: 0 0 3px;
    }
    .doc-title {
      font-size: 22pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.5pt;
      margin: 0;
      line-height: 1;
    }
    .doc-subtitle {
      font-family: 'Courier New', monospace;
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #555;
      margin: 5px 0 0;
    }
    .doc-meta {
      font-family: 'Courier New', monospace;
      font-size: 7.5pt;
      text-align: right;
      color: #444;
      line-height: 2;
    }
    .doc-meta strong { color: #1a1a1a; }
    /* ── Sections ── */
    .section { margin-top: 18px; break-inside: avoid-page; }
    .section-header {
      background: #1a1a1a;
      color: #f9f7f2;
      padding: 5px 9px;
      font-family: 'Courier New', monospace;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-count {
      font-weight: 400;
      opacity: 0.6;
      font-size: 7pt;
    }
    .section-empty {
      padding: 9px 10px;
      font-family: 'Courier New', monospace;
      font-size: 7.5pt;
      color: #999;
      border: 0.75pt solid #ddd;
      border-top: none;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    thead tr { background: #e5e2da; }
    th {
      padding: 5pt 7pt;
      text-align: left;
      font-family: 'Courier New', monospace;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-bottom: 1.5pt solid #1a1a1a;
      border-right: 0.5pt solid #ccc;
      white-space: nowrap;
      vertical-align: middle;
    }
    th:last-child { border-right: none; }
    td {
      padding: 4pt 7pt;
      border-bottom: 0.5pt solid #e0ddd6;
      border-right: 0.5pt solid #ede9e0;
      vertical-align: top;
    }
    td:last-child { border-right: none; }
    tbody tr:nth-child(even) { background: #f7f5f0; }
    tbody tr { break-inside: avoid; }
    /* ── Footer ── */
    .doc-footer {
      margin-top: 28px;
      padding-top: 7px;
      border-top: 0.75pt solid #ccc;
      font-family: 'Courier New', monospace;
      font-size: 6.5pt;
      color: #aaa;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }
    @media screen {
      body { padding: 24px; background: #f4f2ee; }
      .doc-wrapper { background: #fff; max-width: 210mm; margin: 0 auto; padding: 20mm 16mm; box-shadow: 0 4px 32px rgba(0,0,0,0.12); }
    }
  </style>
</head>
<body>
  <div class="doc-wrapper">
    <div class="doc-header">
      <div>
        <p class="brand-label">Sistema de gestión textil</p>
        <h1 class="doc-title">Modulo Texajo</h1>
        <p class="doc-subtitle">Resumen operativo general</p>
      </div>
      <div class="doc-meta">
        <div><strong>Fecha de emisión</strong> &nbsp; ${date}</div>
        <div><strong>Documento</strong> &nbsp; RPT-OP-${date.replace(/-/g, '')}</div>
      </div>
    </div>

    ${Object.entries(rows).map(([title, data]) => renderPrintableTable(title, data.slice(0, 100))).join('')}

    <div class="doc-footer">
      Documento generado automáticamente · Modulo Texajo · ${date} · Los datos corresponden al estado actual del sistema
    </div>
  </div>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (!win) {
      addToast('El navegador bloqueo la ventana de impresion.', 'error');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
    log('Exportacion PDF', 'EXPORTACION', 'Resumen operativo enviado a impresion/PDF');
  };

  const actions = [
    { key: 'ingreso' as const, title: 'Ingresar tela', desc: 'Actualiza stock y costo automaticamente.', icon: PackagePlus },
    { key: 'corte' as const, title: 'Crear corte', desc: 'Descuenta tela y genera destajo.', icon: Scissors },
    { key: 'entrega' as const, title: 'Entregar corte', desc: 'Crea cuenta por cobrar desde corte.', icon: Truck },
    { key: 'cobro' as const, title: 'Registrar cobro', desc: 'Marca pago y actualiza dashboard.', icon: Receipt },
    { key: 'liquidacion' as const, title: 'Liquidar operario', desc: 'Revisa total por destajo generado.', icon: UserCheck },
    { key: 'proveedor' as const, title: 'Pagar proveedor', desc: 'Cancela hilo, tejeduria o tintoreria.', icon: Coins },
    { key: 'cierre' as const, title: 'Cerrar programa', desc: 'Recalcula merma, costo e inversion.', icon: Factory },
    { key: 'correccion' as const, title: 'Anular o corregir', desc: 'Reversa errores sin borrar historial.', icon: RotateCcw },
    { key: 'exportar' as const, title: 'Exportar reportes', desc: 'Descarga Excel o imprime PDF.', icon: FileSpreadsheet },
    { key: 'importar' as const, title: 'Importar destajo', desc: 'Pega datos del Sheets para cuadrar montos.', icon: Upload },
  ];

  return (
    <motion.div
      className="space-y-12"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="border-b border-gray-300 pb-8">
        <h2 className="text-5xl uppercase">Panel Operativo</h2>
        <p className="mt-4 text-sm font-mono uppercase tracking-widest text-gray-500 leading-relaxed">
          Registra acciones reales del taller. El sistema calcula y mueve lo demas.
        </p>
      </div>

      <div className="bg-[#fff7ed] border border-amber-300 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-700 mt-1" />
          <div className="flex-1">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-900">Alertas automaticas</h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {alertas.length > 0 ? alertas.slice(0, 6).map((alerta, index) => (
                <div key={`${alerta.nivel}-${index}`} className="bg-white/70 border border-amber-200 px-4 py-3 text-xs font-mono uppercase tracking-widest text-amber-900">
                  <span className="font-bold">{alerta.nivel}</span> · {alerta.texto}
                </div>
              )) : (
                <div className="text-xs font-mono uppercase tracking-widest text-amber-900">Sin alertas criticas por ahora.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => setActiveAction(action.key)}
              className="group bg-[#F9F7F2] border border-gray-300 p-8 text-left hover:bg-white hover:border-black transition-colors"
            >
              <div className="flex items-start justify-between gap-6">
                <Icon className="h-7 w-7 text-gray-400 group-hover:text-black" />
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-black" />
              </div>
              <h3 className="mt-8 text-2xl font-serif italic text-[#1A1A1A]">{action.title}</h3>
              <p className="mt-3 text-[10px] uppercase font-mono tracking-widest leading-relaxed text-gray-500">{action.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Metric label="Cortes pendientes" value={cortes.filter(c => c.estado === 'EN_PROCESO').length} />
        <Metric label="Cobros pendientes" value={money(cobrosPendientes.reduce((sum, item) => sum + item.bruto, 0))} />
        <Metric label="Pagos proveedor" value={pagosPendientes.length} />
        <Metric label="Destajo pendiente" value={money(asignacionesPendientes.reduce((sum, item) => sum + item.importe, 0))} />
      </div>

      <div className="bg-[#F9F7F2] border border-gray-300 p-8">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
            <History className="h-4 w-4" />
            Resumen de actividad
          </h3>
        </div>
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Cortes en proceso</div>
            <div className="mt-1 text-sm font-bold">{cortes.filter(c => c.estado === 'EN_PROCESO').length} cortes activos</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Destajo pendiente</div>
            <div className="mt-1 text-sm font-bold">{money(asignacionesPendientes.reduce((s, b) => s + b.importe, 0))}</div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Cobros pendientes</div>
            <div className="mt-1 text-sm font-bold">{money(cobrosPendientes.reduce((s, c) => s + c.bruto, 0))}</div>
          </div>
        </div>
      </div>

      {activeAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className="bg-[#F9F7F2] border border-gray-300 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-300 flex items-center justify-between">
              <h3 className="text-2xl font-serif font-black uppercase tracking-tighter">{actions.find(a => a.key === activeAction)?.title}</h3>
              <button onClick={close} className="text-gray-500 hover:text-black"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {activeAction === 'ingreso' && (
                <FormGrid>
                  <Select label="Tela" value={ingreso.telaId} onChange={value => setIngreso({ ...ingreso, telaId: value })} options={telas.map(t => [t.id, t.nombre])} />
                  <Select label="Color" value={ingreso.colorId} onChange={value => setIngreso({ ...ingreso, colorId: value })} options={colores.map(c => [c.id, c.nombre])} />
                  <NumberInput label="Rollos" value={ingreso.rollos} onChange={value => setIngreso({ ...ingreso, rollos: value })} />
                  <NumberInput label="Kg total" value={ingreso.kgTotal} onChange={value => setIngreso({ ...ingreso, kgTotal: value })} />
                  <Select label="Proveedor" value={ingreso.proveedorId} onChange={value => setIngreso({ ...ingreso, proveedorId: value })} options={proveedores.map(p => [p.id, p.nombre])} />
                  <TextInput label="Factura" value={ingreso.nFactura} onChange={value => setIngreso({ ...ingreso, nFactura: value })} />
                  <NumberInput label="Costo real factura" value={ingreso.costoReal} onChange={value => setIngreso({ ...ingreso, costoReal: value })} />
                </FormGrid>
              )}
              {activeAction === 'corte' && (
                <FormGrid>
                  <Select label="Cliente" value={corte.clienteId} onChange={value => setCorte({ ...corte, clienteId: value })} options={clientes.map(c => [c.id, c.nombre])} />
                  <Select label="Producto" value={corte.productoId} onChange={value => setCorte({ ...corte, productoId: value })} options={productos.map(p => [p.id, p.nombre])} />
                  <Select label="Color" value={corte.colorId} onChange={value => setCorte({ ...corte, colorId: value })} options={colores.map(c => [c.id, c.nombre])} />
                  <Select label="Operario" value={corte.operarioId} onChange={value => setCorte({ ...corte, operarioId: value })} options={activeOperarios.map(o => [o.id, o.nombre])} />
                  <NumberInput label="Kg usados" value={corte.kg} onChange={value => setCorte({ ...corte, kg: value })} />
                  <NumberInput label="Rollos usados" value={corte.rollos} onChange={value => setCorte({ ...corte, rollos: value })} />
                  <NumberInput label="Talla S" value={corte.cantS} onChange={value => setCorte({ ...corte, cantS: value })} />
                  <NumberInput label="Talla M" value={corte.cantM} onChange={value => setCorte({ ...corte, cantM: value })} />
                  <NumberInput label="Talla L" value={corte.cantL} onChange={value => setCorte({ ...corte, cantL: value })} />
                  <NumberInput label="Talla XL" value={corte.cantXL} onChange={value => setCorte({ ...corte, cantXL: value })} />
                </FormGrid>
              )}
              {activeAction === 'entrega' && (
                <Select label="Corte a entregar" value={entregaCorteId} onChange={setEntregaCorteId} options={cortesPendientesEntrega.map(c => [c.id, `${c.nCorte} · ${productoNombre(productos, c.productoId)} · ${c.totalPrendas} prendas`])} />
              )}
              {activeAction === 'cobro' && (
                <Select label="Cobro pendiente" value={cobroId} onChange={setCobroId} options={cobrosPendientes.map(c => [c.id, `${c.nCorte} · ${money(c.bruto)}`])} />
              )}
              {activeAction === 'liquidacion' && (
                <div className="space-y-5">
                  <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500">
                    Selecciona un operario para liquidar individualmente, o usa "Liquidar todos" para procesar el período completo.
                  </p>
                  {resumenLiquidacion.length === 0 ? (
                    <div className="bg-white border border-gray-200 p-8 text-center">
                      <p className="text-xs font-mono uppercase tracking-widest text-gray-500">No hay destajos pendientes.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 border border-gray-300 overflow-hidden">
                      {resumenLiquidacion.map(item => (
                        <button
                          key={item.operario.id}
                          type="button"
                          onClick={() => setOperarioId(item.operario.id)}
                          className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                            operarioId === item.operario.id ? 'bg-[#1A1A1A] text-white' : 'bg-[#F9F7F2] hover:bg-white'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-bold">{item.operario.nombre}</div>
                            <div className={`text-[9px] uppercase tracking-widest font-mono mt-0.5 ${
                              operarioId === item.operario.id ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {item.operaciones} ops · {item.prendas} prendas
                            </div>
                          </div>
                          <div className={`text-xl font-serif italic font-black ${
                            operarioId === item.operario.id ? 'text-white' : 'text-[#1A1A1A]'
                          }`}>
                            {money(item.importe)}
                          </div>
                        </button>
                      ))}
                      <div className="px-5 py-3 bg-[#E5E2DA] flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-700">Total pendiente</span>
                        <span className="font-serif italic font-black">
                          {money(resumenLiquidacion.reduce((s, i) => s + i.importe, 0))}
                        </span>
                      </div>
                    </div>
                  )}
                  {resumenLiquidacion.length > 0 && (
                    <button
                      type="button"
                      onClick={handleLiquidarTodos}
                      className="w-full bg-[#1A1A1A] text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-black flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Liquidar todos — {money(resumenLiquidacion.reduce((s, i) => s + i.importe, 0))}
                    </button>
                  )}
                  {totalDestajoOperario > 0 && (
                    <div className="bg-white border border-gray-300 p-5">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-gray-500">
                        Al ejecutar "Ejecutar acción" se liquida solo el operario seleccionado.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {activeAction === 'proveedor' && (
                <Select label="Pago pendiente" value={pagoKey} onChange={setPagoKey} options={pagosPendientes.map(p => [p.key, p.label])} />
              )}
              {activeAction === 'cierre' && (
                <Select label="Programa activo" value={programaId} onChange={setProgramaId} options={programasZurzam.filter(p => p.estado !== 'CERRADO').map(p => [p.id, `${p.nombre} · ${p.estado}`])} />
              )}
              {activeAction === 'correccion' && (
                <div className="space-y-5">
                  <Select
                    label="Tipo de registro"
                    value={correccion.tipo}
                    onChange={value => setCorreccion({ tipo: value as CorreccionTipo, id: '', motivo: correccion.motivo })}
                    options={[['CORTE', 'Corte'], ['COBRO', 'Cobro'], ['MOVIMIENTO', 'Movimiento de tela']]}
                  />
                  <Select
                    label="Registro"
                    value={correccion.id}
                    onChange={value => setCorreccion({ ...correccion, id: value })}
                    options={correccionOptions}
                  />
                  <TextInput label="Motivo / correccion" value={correccion.motivo} onChange={value => setCorreccion({ ...correccion, motivo: value })} />
                  <div className="bg-white border border-gray-300 p-5 text-xs font-mono uppercase tracking-widest text-gray-500">
                    La anulacion no borra datos: crea un ajuste o cambia estado y queda en historial.
                  </div>
                </div>
              )}
              {activeAction === 'exportar' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <button onClick={exportExcel} className="bg-white border border-gray-300 p-8 text-left hover:border-black">
                    <FileSpreadsheet className="h-7 w-7 text-gray-500" />
                    <div className="mt-6 text-xl font-serif italic">Exportar Excel</div>
                    <p className="mt-2 text-[10px] uppercase tracking-widest font-mono text-gray-500">Stock, cortes, cobros, destajo e historial.</p>
                  </button>
                  <button onClick={exportPdf} className="bg-white border border-gray-300 p-8 text-left hover:border-black">
                    <Receipt className="h-7 w-7 text-gray-500" />
                    <div className="mt-6 text-xl font-serif italic">Imprimir PDF</div>
                    <p className="mt-2 text-[10px] uppercase tracking-widest font-mono text-gray-500">Abre impresion para guardar como PDF.</p>
                  </button>
                </div>
              )}
              {activeAction === 'importar' && (
                <div className="space-y-5">
                  <div className="bg-[#E5E2DA] border border-gray-300 p-5 text-xs font-mono space-y-2">
                    <p className="font-bold uppercase tracking-widest text-[10px]">Formato esperado (separado por tabulaciones o punto y coma)</p>
                    <p className="text-gray-600">Operario &nbsp;|&nbsp; N°Corte &nbsp;|&nbsp; Importe</p>
                    <p className="text-gray-500">Ejemplo: <span className="font-bold">LUISA&nbsp;&nbsp;C-001&nbsp;&nbsp;740.40</span></p>
                    <p className="text-gray-500">Con operación: <span className="font-bold">LUISA&nbsp;&nbsp;C-001&nbsp;&nbsp;Hombro&nbsp;&nbsp;100.00</span></p>
                    <p className="text-gray-500">El N°Corte debe coincidir exactamente con el registrado en el sistema.</p>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-gray-500 block mb-2">Pega aquí los datos del Sheets</label>
                    <textarea
                      rows={8}
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder={"LUISA\tC-001\t740.40\nMARIA\tC-001\t120.00\n..."}
                      className="w-full border border-gray-300 p-3 font-mono text-xs focus:outline-none focus:border-black resize-none"
                    />
                  </div>
                  {importErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 p-4 text-xs font-mono space-y-1">
                      {importErrors.map((r, i) => <p key={i} className="text-red-700">{r.error}</p>)}
                    </div>
                  )}
                  {importRows.filter(r => !r.error).length > 0 && (
                    <div className="border border-gray-200 divide-y divide-gray-100 text-xs font-mono max-h-40 overflow-y-auto">
                      {importRows.filter(r => !r.error).map((r, i) => (
                        <div key={i} className="flex justify-between px-3 py-1.5">
                          <span className="font-bold">{r.operario}</span>
                          <span className="text-gray-500">{r.nCorte}</span>
                          <span className="text-gray-500">{r.operacion}</span>
                          <span className="font-bold text-green-700">S/. {r.importe.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importLimpiar}
                      onChange={e => setImportLimpiar(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-mono uppercase tracking-widest text-gray-700">
                      Anular asignaciones pendientes actuales antes de importar
                    </span>
                  </label>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-300 bg-white flex justify-end gap-4">
              <button onClick={close} className="text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-black">Cancelar</button>
              <button
                onClick={() => {
                  if (activeAction === 'ingreso') handleIngreso();
                  if (activeAction === 'corte') handleCorte();
                  if (activeAction === 'entrega') handleEntrega();
                  if (activeAction === 'cobro') handleCobro();
                  if (activeAction === 'liquidacion') handleLiquidarOperario();
                  if (activeAction === 'proveedor') handlePagoProveedor();
                  if (activeAction === 'cierre') handleCerrarPrograma();
                  if (activeAction === 'correccion') handleCorreccion();
                  if (activeAction === 'exportar') close();
                  if (activeAction === 'importar') handleImportar();
                }}
                className="bg-black text-white px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-gray-800 inline-flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Ejecutar accion
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#F9F7F2] border border-gray-300 p-6">
      <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{label}</div>
      <div className="mt-4 text-3xl font-serif italic font-black">{value}</div>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-widest font-bold text-gray-500 block mb-2">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full bg-transparent border-b border-gray-300 pb-2 text-sm font-bold focus:outline-none focus:border-black">
        <option value="">Seleccionar</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-widest font-bold text-gray-500 block mb-2">{label}</span>
      <input type="number" min="0" step="0.01" value={value} onChange={event => onChange(Number(event.target.value))} className="w-full bg-transparent border-b border-gray-300 pb-2 text-lg font-bold focus:outline-none focus:border-black" />
    </label>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-widest font-bold text-gray-500 block mb-2">{label}</span>
      <input type="text" value={value} onChange={event => onChange(event.target.value)} className="w-full bg-transparent border-b border-gray-300 pb-2 text-lg font-bold focus:outline-none focus:border-black" />
    </label>
  );
}

function productoNombre(productos: { id: string; nombre: string }[], id: string) {
  return productos.find(producto => producto.id === id)?.nombre ?? id;
}

function telaNombre(telas: { id: string; nombre: string }[], id: string) {
  return telas.find(tela => tela.id === id)?.nombre ?? id;
}

function colorNombre(colores: { id: string; nombre: string }[], id: string) {
  return colores.find(color => color.id === id)?.nombre ?? id;
}

function operarioNombre(operarios: { id: string; nombre: string }[], id: string) {
  return operarios.find(item => item.id === id)?.nombre ?? id;
}

function renderPrintableTable(title: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return `
    <div class="section">
      <div class="section-header"><span>${escapeHtml(title)}</span></div>
      <div class="section-empty">Sin datos registrados.</div>
    </div>`;
  const headers = Object.keys(rows[0]);
  const bodyRows = rows
    .map(row => `<tr>${headers.map(h => `<td>${escapeHtml(String(row[h] ?? ''))}</td>`).join('')}</tr>`)
    .join('');
  return `
    <div class="section">
      <div class="section-header">
        <span>${escapeHtml(title)}</span>
        <span class="section-count">${rows.length} registro${rows.length !== 1 ? 's' : ''}</span>
      </div>
      <table>
        <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
