/**
 * Capa de acceso a Supabase.
 * Mapea snake_case (DB) ↔ camelCase (app).
 * Datos compartidos entre todos los usuarios autenticados (sin RLS).
 */
import { supabase } from './supabase';
import type {
  Cliente, Proveedor, Tela, Color, PrecioTela, PrecioTejeduria, PrecioComplemento,
  Producto, TarifaOperacion, Operario, Config,
  MovimientoTela, Corte, SeguimientoFila, BoletaLinea, DescuentoBoleta,
  ProgramaZurzam, ProgramaDetalle, CompraHilo, StockExtorno, CobroDiario,
  MovimientoComplemento, PrecioTintoreria, ProductoColor,
} from '../types';

// ─── Mappers DB → App ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCliente = (r: any): Cliente => ({ id: r.id, nombre: r.nombre, contacto: r.contacto, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProveedor = (r: any): Proveedor => ({ id: r.id, nombre: r.nombre, ruc: r.ruc, contacto: r.contacto, tipo: r.tipo });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toTela = (r: any): Tela => ({ id: r.id, nombre: r.nombre, composicion: r.composicion, kgPorRollo: r.kg_por_rollo, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toColor = (r: any): Color => ({ id: r.id, nombre: r.nombre, categoria: r.categoria, prioridad: r.prioridad, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPrecioTela = (r: any): PrecioTela => ({ id: r.id, telaId: r.tela_id, categoriaColor: r.categoria_color, precioKg: r.precio_kg });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPrecioComplemento = (r: any): PrecioComplemento => ({ id: r.id, clave: r.clave, tipo: r.tipo, origen: r.origen, talla: r.talla, precio: r.precio });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPrecioTejeduria = (r: any): PrecioTejeduria => ({ id: r.id, tipoTejido: r.tipo_tejido, precioKg: r.precio_kg });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProducto = (r: any): Producto => ({ id: r.id, nombre: r.nombre, marca: r.marca ?? undefined, costoMoTotal: r.costo_mo_total, precioServicio: r.precio_servicio, telaBase: r.tela_base ?? undefined, limiteConsumo: r.limite_consumo ?? undefined, limiteRendimiento: r.limite_rendimiento ?? undefined, propS: r.prop_s ?? undefined, propM: r.prop_m ?? undefined, propL: r.prop_l ?? undefined, propXL: r.prop_xl ?? undefined, recetaComplementos: r.receta_complementos ?? undefined, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toTarifa = (r: any): TarifaOperacion => ({ id: r.id, productoId: r.producto_id, orden: r.orden, operacion: r.operacion, tarifa: r.tarifa, notas: r.notas, clave: r.clave });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toOperario = (r: any): Operario => ({ id: r.id, codigo: r.codigo, nombre: r.nombre, estado: r.estado, dni: r.dni ?? undefined, telefono: r.telefono ?? undefined, modulo: r.modulo ?? undefined, maquina: r.maquina ?? undefined, fechaIngreso: r.fecha_ingreso ?? undefined });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMovTela = (r: any): MovimientoTela => ({ id: r.id, fecha: r.fecha, tipo: r.tipo, clienteId: r.cliente_id, telaId: r.tela_id, colorId: r.color_id, rollos: r.rollos, kgTotal: r.kg_total, categoriaColor: r.categoria_color, precioKg: r.precio_kg, totalSoles: r.total_soles, stockRollosAntes: r.stock_rollos_antes, stockRollosDespues: r.stock_rollos_despues, responsable: r.responsable, proveedorId: r.proveedor_id ?? undefined, nFactura: r.n_factura ?? undefined, costoRealFact: r.costo_real_fact ?? undefined, corteId: r.corte_id ?? undefined, nCorte: r.n_corte ?? undefined, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCorte = (r: any): Corte => ({ id: r.id, nCorte: r.n_corte, fecha: r.fecha, clienteId: r.cliente_id, productoId: r.producto_id, colorId: r.color_id, tonalidad: r.tonalidad ?? undefined, telaId: r.tela_id ?? undefined, cortador: r.cortador, ayudante: r.ayudante, kgUsados: r.kg_usados, rollosUsados: r.rollos_usados, tendidas: r.tendidas, mtsPorTendida: r.mts_por_tendida, ancho: r.ancho_cm ?? r.ancho, cantS: r.cant_s, cantM: r.cant_m, cantL: r.cant_l, cantXL: r.cant_xl, totalPrendas: r.total_prendas, consumo: r.consumo, rendimiento: r.rendimiento, revision: r.revision, traslado: r.traslado, estado: r.estado, pagoCliente: r.pago_cliente, pagoPlanilla: r.pago_planilla, costoMoCorte: r.costo_mo_corte, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSeguimientoFila = (r: any): SeguimientoFila => ({ id: r.id, corteId: r.corte_id, nCorte: r.n_corte, productoId: r.producto_id, fecha: r.fecha, colorId: r.color_id, talla: r.talla, cantidad: r.cantidad, asignaciones: r.asignaciones ?? [], pctAvance: r.pct_avance, estado: r.estado, totalPago: r.total_pago });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toBoletaLinea = (r: any): BoletaLinea => ({ id: r.id, operarioId: r.operario_id, corteId: r.corte_id, nCorte: r.n_corte, productoId: r.producto_id, tarifaId: r.tarifa_id, operacion: r.operacion, orden: r.orden, tarifa: r.tarifa, cantPrendas: r.cant_prendas, importe: r.importe, periodo: r.periodo, fechaRegistro: r.fecha_registro ?? undefined, estadoPago: r.estado_pago, fechaPago: r.fecha_pago ?? undefined });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDescuento = (r: any): DescuentoBoleta => ({ id: r.id, operarioId: r.operario_id, periodo: r.periodo, tipo: r.tipo, monto: r.monto, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPrograma = (r: any): ProgramaZurzam => ({ id: r.id, nombre: r.nombre, fecha: r.fecha, clienteId: r.cliente_id, rollosObjetivo: r.rollos_objetivo, kgObjetivo: r.kg_objetivo, estado: r.estado, comisionJose: r.comision_jose, estadoPagoComision: r.estado_pago_comision, diasEntrega: r.dias_entrega, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDetalle = (r: any): ProgramaDetalle => ({ id: r.id, programaId: r.programa_id, colorId: r.color_id, categoriaColor: r.categoria_color, tipoServicio: r.tipo_servicio, prioridad: r.prioridad, kgTejEnviado: r.kg_tej_enviado, kgTejRetornado: r.kg_tej_retornado, precioKgTej: r.precio_kg_tej, monedaTej: r.moneda_tej, tcTej: r.tc_tej, costoTejido: r.costo_tejido, estadoPagoTej: r.estado_pago_tej, kgTintEnviado: r.kg_tint_enviado, kgTintRetornado: r.kg_tint_retornado, rollosFinal: r.rollos_final, precioKgTint: r.precio_kg_tint, monedaTint: r.moneda_tint, tcTint: r.tc_tint, costoTint: r.costo_tint, estadoPagoTint: r.estado_pago_tint, costoHiloProrrateado: r.costo_hilo_prorrateado, costoTotalColor: r.costo_total_color, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCompraHilo = (r: any): CompraHilo => ({ id: r.id, fecha: r.fecha, programaId: r.programa_id, tipoHilo: r.tipo_hilo, kgAsignados: r.kg_asignados, precioKg: r.precio_kg, moneda: r.moneda, tipoCambio: r.tipo_cambio, totalSoles: r.total_soles, proveedorId: r.proveedor_id, nFactura: r.n_factura, costoRealFact: r.costo_real_fact, diferencia: r.diferencia, estadoPago: r.estado_pago, fechaPago: r.fecha_pago ?? undefined, montoPagado: r.monto_pagado, saldo: r.saldo, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toExtorno = (r: any): StockExtorno => ({ id: r.id, programaId: r.programa_id, programaDetalleId: r.programa_detalle_id ?? undefined, fecha: r.fecha, kgConos: r.kg_conos, precioKgHilo: r.precio_kg_hilo, totalSoles: r.total_soles, usado: r.usado, notas: r.notas });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toCobro = (r: any): CobroDiario => ({ id: r.id, fecha: r.fecha, nCorte: r.n_corte, nFactura: r.n_factura, clienteId: r.cliente_id, productoId: r.producto_id, colorId: r.color_id, cantS: r.cant_s, cantM: r.cant_m, cantL: r.cant_l, cantXL: r.cant_xl, totalPrendas: r.total_prendas, precioUnitario: r.precio_unitario, bruto: r.bruto, detraccion10Pct: r.detraccion_10pct, disponible90Pct: r.disponible_90pct, estado: r.estado, notas: r.notas, fechaCobro: r.fecha_cobro ?? undefined });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMovComplemento = (r: any): MovimientoComplemento => ({ id: r.id, fecha: r.fecha, tipo: r.tipo, tipoComplemento: r.tipo_complemento, colorId: r.color_id, talla: r.talla, cantidad: r.cantidad, precioUnit: r.precio_unit, totalSoles: r.total_soles, stockAntes: r.stock_antes, stockDespues: r.stock_despues, corteId: r.corte_id ?? undefined, nCorte: r.n_corte ?? undefined, productoDestinoId: r.producto_destino_id ?? undefined, proveedorId: r.proveedor_id ?? undefined, nFactura: r.n_factura ?? undefined, responsable: r.responsable, notas: r.notas });
// Config es tabla key-value: [{clave, valor}]. Convertimos el array a objeto Config.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toConfig = (rows: any[]): Config => {
  const kv: Record<string, string> = {};
  for (const r of rows) kv[r.clave] = r.valor;
  const num = (k: string, def: number) => parseFloat(kv[k] ?? String(def));
  return {
    umbralCritico:    num('umbral_critico',     5),
    umbralBajo:       num('umbral_bajo',        15),
    mermaPct:         num('merma_estandar',   0.15),
    detraccionPct:    num('detraccion',         0.10),
    igvPct:           num('igv',               0.18),
    incluirIgv:       (kv['incluir_igv'] ?? 'NO') === 'SI',
    tipoCambioUsd:    num('tc_default',         3.50),
    kgPorRolloDefault:num('kg_por_rollo',       20),
    comisionJoseKg:   num('comision_jose_kg',   0.30),
    mermaMaxTej:      5,
    mermaMaxTint:     10,
  };
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProductoColor = (r: any): ProductoColor => ({ id: r.id, productoId: r.producto_id, colorId: r.color_id, propS: r.prop_s, propM: r.prop_m, propL: r.prop_l, propXL: r.prop_xl });

// ─── Mappers App → DB ────────────────────────────────────────────────────────

const fromCliente = (v: Cliente) => ({ id: v.id, nombre: v.nombre, contacto: v.contacto, notas: v.notas });
const fromProveedor = (v: Proveedor) => ({ id: v.id, nombre: v.nombre, ruc: v.ruc, contacto: v.contacto, tipo: v.tipo });
const fromTela = (v: Tela) => ({ id: v.id, nombre: v.nombre, composicion: v.composicion, kg_por_rollo: v.kgPorRollo, notas: v.notas });
const fromColor = (v: Color) => ({ id: v.id, nombre: v.nombre, categoria: v.categoria, prioridad: v.prioridad, notas: v.notas });
const fromPrecioTela = (v: PrecioTela) => ({ id: v.id, tela_id: v.telaId, categoria_color: v.categoriaColor, precio_kg: v.precioKg });
const fromPrecioComplemento = (v: PrecioComplemento) => ({ id: v.id, clave: v.clave, tipo: v.tipo, origen: v.origen, talla: v.talla, precio: v.precio });
const fromPrecioTejeduria = (v: PrecioTejeduria) => ({ id: v.id, tipo_tejido: v.tipoTejido, precio_kg: v.precioKg });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPrecioTintoreria = (r: any): PrecioTintoreria => ({ id: r.id, tipoServicio: r.tipo_servicio, tipoTela: r.tipo_tela, precioKg: r.precio_kg, moneda: r.moneda, notas: r.notas ?? '' });
const fromPrecioTintoreria = (v: PrecioTintoreria) => ({ id: v.id, tipo_servicio: v.tipoServicio, tipo_tela: v.tipoTela, precio_kg: v.precioKg, moneda: v.moneda, notas: v.notas });
const fromProducto = (v: Producto) => ({ id: v.id, nombre: v.nombre, marca: v.marca ?? null, costo_mo_total: v.costoMoTotal, precio_servicio: v.precioServicio, tela_base: v.telaBase ?? null, limite_consumo: v.limiteConsumo ?? null, limite_rendimiento: v.limiteRendimiento ?? null, prop_s: v.propS ?? null, prop_m: v.propM ?? null, prop_l: v.propL ?? null, prop_xl: v.propXL ?? null, receta_complementos: v.recetaComplementos ?? null, notas: v.notas });
const fromTarifa = (v: TarifaOperacion) => ({ id: v.id, producto_id: v.productoId, orden: v.orden, operacion: v.operacion, tarifa: v.tarifa, notas: v.notas, clave: v.clave });
const fromOperario = (v: Operario) => ({ id: v.id, codigo: v.codigo, nombre: v.nombre, estado: v.estado, dni: v.dni ?? null, telefono: v.telefono ?? null, modulo: v.modulo ?? null, maquina: v.maquina ?? null, fecha_ingreso: v.fechaIngreso ?? null });
const fromMovTela = (v: MovimientoTela) => ({ id: v.id, fecha: v.fecha, tipo: v.tipo, cliente_id: v.clienteId, tela_id: v.telaId, color_id: v.colorId, rollos: v.rollos, kg_total: v.kgTotal, categoria_color: v.categoriaColor, precio_kg: v.precioKg, total_soles: v.totalSoles, stock_rollos_antes: v.stockRollosAntes, stock_rollos_despues: v.stockRollosDespues, responsable: v.responsable, proveedor_id: v.proveedorId ?? null, n_factura: v.nFactura ?? null, costo_real_fact: v.costoRealFact ?? null, corte_id: v.corteId ?? null, n_corte: v.nCorte ?? null, notas: v.notas });
const fromCorte = (v: Corte) => ({ id: v.id, n_corte: v.nCorte, fecha: v.fecha, cliente_id: v.clienteId, producto_id: v.productoId, color_id: v.colorId, tonalidad: v.tonalidad ?? null, tela_id: v.telaId ?? null, cortador: v.cortador, ayudante: v.ayudante, kg_usados: v.kgUsados, rollos_usados: v.rollosUsados, tendidas: v.tendidas, mts_por_tendida: v.mtsPorTendida, ancho_cm: v.ancho, cant_s: v.cantS, cant_m: v.cantM, cant_l: v.cantL, cant_xl: v.cantXL, total_prendas: v.totalPrendas, consumo: v.consumo, rendimiento: v.rendimiento, revision: v.revision, traslado: v.traslado, estado: v.estado, pago_cliente: v.pagoCliente, pago_planilla: v.pagoPlanilla, costo_mo_corte: v.costoMoCorte, notas: v.notas });
const fromSeguimientoFila = (v: SeguimientoFila) => ({ id: v.id, corte_id: v.corteId, n_corte: v.nCorte, producto_id: v.productoId, fecha: v.fecha, color_id: v.colorId, talla: v.talla, cantidad: v.cantidad, asignaciones: v.asignaciones, pct_avance: v.pctAvance, estado: v.estado, total_pago: v.totalPago });
const fromBoletaLinea = (v: BoletaLinea) => ({ id: v.id, operario_id: v.operarioId, corte_id: v.corteId, n_corte: v.nCorte, producto_id: v.productoId, tarifa_id: v.tarifaId, operacion: v.operacion, orden: v.orden, tarifa: v.tarifa, cant_prendas: v.cantPrendas, importe: v.importe, periodo: v.periodo, fecha_registro: v.fechaRegistro ?? null, estado_pago: v.estadoPago, fecha_pago: v.fechaPago ?? null });
const fromDescuento = (v: DescuentoBoleta) => ({ id: v.id, operario_id: v.operarioId, periodo: v.periodo, tipo: v.tipo, monto: v.monto, notas: v.notas });
const fromPrograma = (v: ProgramaZurzam) => ({ id: v.id, nombre: v.nombre, fecha: v.fecha, cliente_id: v.clienteId, rollos_objetivo: v.rollosObjetivo, kg_objetivo: v.kgObjetivo, estado: v.estado, comision_jose: v.comisionJose, estado_pago_comision: v.estadoPagoComision, dias_entrega: v.diasEntrega, notas: v.notas });
const fromDetalle = (v: ProgramaDetalle) => ({ id: v.id, programa_id: v.programaId, color_id: v.colorId, categoria_color: v.categoriaColor, tipo_servicio: v.tipoServicio, prioridad: v.prioridad, kg_tej_enviado: v.kgTejEnviado, kg_tej_retornado: v.kgTejRetornado, precio_kg_tej: v.precioKgTej, moneda_tej: v.monedaTej, tc_tej: v.tcTej, costo_tejido: v.costoTejido, estado_pago_tej: v.estadoPagoTej, kg_tint_enviado: v.kgTintEnviado, kg_tint_retornado: v.kgTintRetornado, rollos_final: v.rollosFinal, precio_kg_tint: v.precioKgTint, moneda_tint: v.monedaTint, tc_tint: v.tcTint, costo_tint: v.costoTint, estado_pago_tint: v.estadoPagoTint, costo_hilo_prorrateado: v.costoHiloProrrateado, costo_total_color: v.costoTotalColor, notas: v.notas });
const fromCompraHilo = (v: CompraHilo) => ({ id: v.id, fecha: v.fecha, programa_id: v.programaId, tipo_hilo: v.tipoHilo, kg_asignados: v.kgAsignados, precio_kg: v.precioKg, moneda: v.moneda, tipo_cambio: v.tipoCambio, total_soles: v.totalSoles, proveedor_id: v.proveedorId, n_factura: v.nFactura, costo_real_fact: v.costoRealFact, diferencia: v.diferencia, estado_pago: v.estadoPago, fecha_pago: v.fechaPago ?? null, monto_pagado: v.montoPagado, saldo: v.saldo, notas: v.notas });
const fromExtorno = (v: StockExtorno) => ({ id: v.id, programa_id: v.programaId, programa_detalle_id: v.programaDetalleId ?? null, fecha: v.fecha, kg_conos: v.kgConos, precio_kg_hilo: v.precioKgHilo, total_soles: v.totalSoles, usado: v.usado, notas: v.notas });
const fromCobro = (v: CobroDiario) => ({ id: v.id, fecha: v.fecha, n_corte: v.nCorte, n_factura: v.nFactura, cliente_id: v.clienteId, producto_id: v.productoId, color_id: v.colorId, cant_s: v.cantS, cant_m: v.cantM, cant_l: v.cantL, cant_xl: v.cantXL, total_prendas: v.totalPrendas, precio_unitario: v.precioUnitario, bruto: v.bruto, detraccion_10pct: v.detraccion10Pct, disponible_90pct: v.disponible90Pct, estado: v.estado, notas: v.notas, fecha_cobro: v.fechaCobro ?? null });
const fromMovComplemento = (v: MovimientoComplemento) => ({ id: v.id, fecha: v.fecha, tipo: v.tipo, tipo_complemento: v.tipoComplemento, color_id: v.colorId, talla: v.talla, cantidad: v.cantidad, precio_unit: v.precioUnit, total_soles: v.totalSoles, stock_antes: v.stockAntes, stock_despues: v.stockDespues, corte_id: v.corteId ?? null, n_corte: v.nCorte ?? null, producto_destino_id: v.productoDestinoId ?? null, proveedor_id: v.proveedorId ?? null, n_factura: v.nFactura ?? null, responsable: v.responsable, notas: v.notas });
// Config key-value → array de rows para upsert
const fromConfig = (v: Config): Array<{clave: string; valor: string}> => [
  { clave: 'umbral_critico',    valor: String(v.umbralCritico) },
  { clave: 'umbral_bajo',       valor: String(v.umbralBajo) },
  { clave: 'merma_estandar',    valor: String(v.mermaPct) },
  { clave: 'detraccion',        valor: String(v.detraccionPct) },
  { clave: 'igv',               valor: String(v.igvPct) },
  { clave: 'incluir_igv',       valor: v.incluirIgv ? 'SI' : 'NO' },
  { clave: 'tc_default',        valor: String(v.tipoCambioUsd) },
  { clave: 'kg_por_rollo',      valor: String(v.kgPorRolloDefault) },
  { clave: 'comision_jose_kg',  valor: String(v.comisionJoseKg) },
];

// ─── Tipos de AppState para carga inicial ────────────────────────────────────

export interface DbAppState {
  clientes: Cliente[];
  proveedores: Proveedor[];
  telas: Tela[];
  colores: Color[];
  preciosTelas: PrecioTela[];
  preciosComplementos: PrecioComplemento[];
  preciosTejeduria: PrecioTejeduria[];
  preciosTintoreria: PrecioTintoreria[];
  productos: Producto[];
  tarifasOperaciones: TarifaOperacion[];
  operarios: Operario[];
  movimientosTela: MovimientoTela[];
  cortes: Corte[];
  seguimientoFilas: SeguimientoFila[];
  boletaLineas: BoletaLinea[];
  descuentosBoleta: DescuentoBoleta[];
  programasZurzam: ProgramaZurzam[];
  programaDetalles: ProgramaDetalle[];
  comprasHilo: CompraHilo[];
  stockExtornos: StockExtorno[];
  cobrosDiarios: CobroDiario[];
  movimientosComplemento: MovimientoComplemento[];
  productoColores: ProductoColor[];
  config: Config | null;
}

// ─── Carga inicial completa ──────────────────────────────────────────────────

export async function loadAllFromDb(): Promise<DbAppState> {
  const [
    c, p, te, co, pt, pc, ptej, ptint, pr, to, op,
    mt, cor, sf, bl, dbesc,
    pz, pd, ch, se, cd, mc, pcolores, cfg
  ] = await Promise.all([
    supabase.from('clientes').select('*'),
    supabase.from('proveedores').select('*'),
    supabase.from('telas').select('*'),
    supabase.from('colores').select('*'),
    supabase.from('precios_telas').select('*'),
    supabase.from('precios_complementos').select('*'),
    supabase.from('precios_tejeduria').select('*'),
    supabase.from('precios_tintoreria').select('*'),
    supabase.from('productos').select('*'),
    supabase.from('tarifas_operaciones').select('*'),
    supabase.from('operarios').select('*'),
    supabase.from('movimientos_tela').select('*'),
    supabase.from('cortes').select('*'),
    supabase.from('seguimiento_filas').select('*'),
    supabase.from('boleta_lineas').select('*'),
    supabase.from('descuentos_boleta').select('*'),
    supabase.from('programas_zurzam').select('*'),
    supabase.from('programa_detalles').select('*'),
    supabase.from('compras_hilo').select('*'),
    supabase.from('stock_extornos').select('*'),
    supabase.from('cobros_diarios').select('*'),
    supabase.from('movimientos_complemento').select('*'),
    supabase.from('producto_colores').select('*'),
    supabase.from('config').select('*'),
  ]);

  // Loguear errores individuales para diagnóstico
  const checks = { c, p, te, co, pt, pc, ptej, ptint, pr, to, op, mt, cor, sf, bl, dbesc, pz, pd, ch, se, cd, mc, pcolores };
  for (const [name, res] of Object.entries(checks)) {
    if (res.error) console.error(`[Supabase] SELECT ${name} error:`, res.error);
  }
  if (cfg.error) console.error('[Supabase] SELECT config error:', cfg.error);

  // Si producto_colores falló (permisos), reintentar con fetch directo REST
  let productoColoresData = pcolores.data ?? [];
  if (pcolores.error || !productoColoresData.length) {
    console.log('[Supabase] Reintentando producto_colores con fetch directo...');
    try {
      const { data: pcRetry, error: pcErr } = await supabase
        .from('producto_colores')
        .select('id,producto_id,color_id,prop_s,prop_m,prop_l,prop_xl');
      if (!pcErr && pcRetry) {
        productoColoresData = pcRetry;
        console.log(`[Supabase] producto_colores reintento OK: ${pcRetry.length} registros`);
      } else {
        console.error('[Supabase] producto_colores reintento falló:', pcErr);
      }
    } catch (e) {
      console.error('[Supabase] producto_colores reintento excepción:', e);
    }
  }

  // Si alguna tabla crítica tiene error (no solo vacía), lanzar para que AppContext use caché
  if (c.error || te.error || pr.error) {
    throw new Error(`Supabase SELECT falló: ${c.error?.message ?? te.error?.message ?? pr.error?.message}`);
  }

  return {
    clientes:               (c.data    ?? []).map(toCliente),
    proveedores:            (p.data    ?? []).map(toProveedor),
    telas:                  (te.data   ?? []).map(toTela),
    colores:                (co.data   ?? []).map(toColor),
    preciosTelas:           (pt.data   ?? []).map(toPrecioTela),
    preciosComplementos:    (pc.data   ?? []).map(toPrecioComplemento),
    preciosTejeduria:       (ptej.data ?? []).map(toPrecioTejeduria),
    preciosTintoreria:      (ptint.data ?? []).map(toPrecioTintoreria),
    productos:              (pr.data   ?? []).map(toProducto),
    tarifasOperaciones:     (to.data   ?? []).map(toTarifa),
    operarios:              (op.data   ?? []).map(toOperario),
    movimientosTela:        (mt.data   ?? []).map(toMovTela),
    cortes:                 (cor.data  ?? []).map(toCorte),
    seguimientoFilas:       (sf.data   ?? []).map(toSeguimientoFila),
    boletaLineas:           (bl.data   ?? []).map(toBoletaLinea),
    descuentosBoleta:       (dbesc.data   ?? []).map(toDescuento),
    programasZurzam:        (pz.data   ?? []).map(toPrograma),
    programaDetalles:       (pd.data   ?? []).map(toDetalle),
    comprasHilo:            (ch.data   ?? []).map(toCompraHilo),
    stockExtornos:          (se.data   ?? []).map(toExtorno),
    cobrosDiarios:          (cd.data   ?? []).map(toCobro),
    movimientosComplemento: (mc.data       ?? []).map(toMovComplemento),
    productoColores:        productoColoresData.map(toProductoColor),
    config:                 (cfg.data && cfg.data.length > 0) ? toConfig(cfg.data) : null,
  };
}

// ─── Seed inicial (solo cuando las tablas están vacías) ──────────────────────

export async function seedInitialData(state: Omit<DbAppState, 'config'> & { config: Config }) {
  await Promise.all([
    supabase.from('clientes').upsert(state.clientes.map(fromCliente)),
    supabase.from('proveedores').upsert(state.proveedores.map(fromProveedor)),
    supabase.from('telas').upsert(state.telas.map(fromTela)),
    supabase.from('colores').upsert(state.colores.map(fromColor)),
    supabase.from('precios_telas').upsert(state.preciosTelas.map(fromPrecioTela)),
    supabase.from('precios_complementos').upsert(state.preciosComplementos.map(fromPrecioComplemento)),
    supabase.from('precios_tejeduria').upsert(state.preciosTejeduria.map(fromPrecioTejeduria)),
    supabase.from('productos').upsert(state.productos.map(fromProducto)),
    supabase.from('tarifas_operaciones').upsert(state.tarifasOperaciones.map(fromTarifa)),
    supabase.from('operarios').upsert(state.operarios.map(fromOperario)),
    supabase.from('config').upsert(fromConfig(state.config), { onConflict: 'clave' }),
  ]);
}

// ─── CRUD genérico por tabla ─────────────────────────────────────────────────

type TableName = string;

async function dbInsert<T>(table: TableName, row: T, mapper: (v: T) => Record<string, unknown>) {
  const { error } = await supabase.from(table).insert(mapper(row));
  if (error) throw error;
}

async function dbUpdate<T>(table: TableName, id: string, updates: Partial<T>, fullMapper: (v: T) => Record<string, unknown>, current: T) {
  const merged = { ...current, ...updates } as T;
  const mapped = fullMapper(merged);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, ...fields } = mapped as Record<string, unknown>;
  void _id; void _ca;
  const { error } = await supabase.from(table).update(fields).eq('id', id);
  if (error) throw error;
}

async function dbDelete(table: TableName, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// ─── API pública por entidad ─────────────────────────────────────────────────

export const db = {
  clientes: {
    add: (v: Cliente) => dbInsert('clientes', v, fromCliente),
    update: (id: string, u: Partial<Cliente>, cur: Cliente) => dbUpdate('clientes', id, u, fromCliente, cur),
    delete: (id: string) => dbDelete('clientes', id),
  },
  proveedores: {
    add: (v: Proveedor) => dbInsert('proveedores', v, fromProveedor),
    update: (id: string, u: Partial<Proveedor>, cur: Proveedor) => dbUpdate('proveedores', id, u, fromProveedor, cur),
    delete: (id: string) => dbDelete('proveedores', id),
  },
  telas: {
    add: (v: Tela) => dbInsert('telas', v, fromTela),
    update: (id: string, u: Partial<Tela>, cur: Tela) => dbUpdate('telas', id, u, fromTela, cur),
    delete: (id: string) => dbDelete('telas', id),
  },
  colores: {
    add: (v: Color) => dbInsert('colores', v, fromColor),
    update: (id: string, u: Partial<Color>, cur: Color) => dbUpdate('colores', id, u, fromColor, cur),
    delete: (id: string) => dbDelete('colores', id),
  },
  preciosTelas: {
    add: (v: PrecioTela) => dbInsert('precios_telas', v, fromPrecioTela),
    update: (id: string, u: Partial<PrecioTela>, cur: PrecioTela) => dbUpdate('precios_telas', id, u, fromPrecioTela, cur),
    delete: (id: string) => dbDelete('precios_telas', id),
  },
  preciosComplementos: {
    add: (v: PrecioComplemento) => dbInsert('precios_complementos', v, fromPrecioComplemento),
    update: (id: string, u: Partial<PrecioComplemento>, cur: PrecioComplemento) => dbUpdate('precios_complementos', id, u, fromPrecioComplemento, cur),
    delete: (id: string) => dbDelete('precios_complementos', id),
  },
  preciosTejeduria: {
    add: (v: PrecioTejeduria) => dbInsert('precios_tejeduria', v, fromPrecioTejeduria),
    update: (id: string, u: Partial<PrecioTejeduria>, cur: PrecioTejeduria) => dbUpdate('precios_tejeduria', id, u, fromPrecioTejeduria, cur),
    delete: (id: string) => dbDelete('precios_tejeduria', id),
  },
  preciosTintoreria: {
    add: (v: PrecioTintoreria) => dbInsert('precios_tintoreria', v, fromPrecioTintoreria),
    update: (id: string, u: Partial<PrecioTintoreria>, cur: PrecioTintoreria) => dbUpdate('precios_tintoreria', id, u, fromPrecioTintoreria, cur),
    delete: (id: string) => dbDelete('precios_tintoreria', id),
  },
  productos: {
    add: (v: Producto) => dbInsert('productos', v, fromProducto),
    update: (id: string, u: Partial<Producto>, cur: Producto) => dbUpdate('productos', id, u, fromProducto, cur),
    delete: (id: string) => dbDelete('productos', id),
  },
  tarifasOperaciones: {
    add: (v: TarifaOperacion) => dbInsert('tarifas_operaciones', v, fromTarifa),
    update: (id: string, u: Partial<TarifaOperacion>, cur: TarifaOperacion) => dbUpdate('tarifas_operaciones', id, u, fromTarifa, cur),
    delete: (id: string) => dbDelete('tarifas_operaciones', id),
  },
  operarios: {
    add: (v: Operario) => dbInsert('operarios', v, fromOperario),
    update: (id: string, u: Partial<Operario>, cur: Operario) => dbUpdate('operarios', id, u, fromOperario, cur),
    delete: (id: string) => dbDelete('operarios', id),
  },
  movimientosTela: {
    add: (v: MovimientoTela) => dbInsert('movimientos_tela', v, fromMovTela),
    update: (id: string, u: Partial<MovimientoTela>, cur: MovimientoTela) => dbUpdate('movimientos_tela', id, u, fromMovTela, cur),
    delete: (id: string) => dbDelete('movimientos_tela', id),
  },
  cortes: {
    add: (v: Corte) => dbInsert('cortes', v, fromCorte),
    update: (id: string, u: Partial<Corte>, cur: Corte) => dbUpdate('cortes', id, u, fromCorte, cur),
    delete: (id: string) => dbDelete('cortes', id),
  },
  seguimientoFilas: {
    add: (v: SeguimientoFila) => dbInsert('seguimiento_filas', v, fromSeguimientoFila),
    update: (id: string, u: Partial<SeguimientoFila>, cur: SeguimientoFila) => dbUpdate('seguimiento_filas', id, u, fromSeguimientoFila, cur),
    delete: (id: string) => dbDelete('seguimiento_filas', id),
  },
  boletaLineas: {
    add: (v: BoletaLinea) => dbInsert('boleta_lineas', v, fromBoletaLinea),
    update: (id: string, u: Partial<BoletaLinea>, cur: BoletaLinea) => dbUpdate('boleta_lineas', id, u, fromBoletaLinea, cur),
    delete: (id: string) => dbDelete('boleta_lineas', id),
  },
  descuentosBoleta: {
    add: (v: DescuentoBoleta) => dbInsert('descuentos_boleta', v, fromDescuento),
    update: (id: string, u: Partial<DescuentoBoleta>, cur: DescuentoBoleta) => dbUpdate('descuentos_boleta', id, u, fromDescuento, cur),
    delete: (id: string) => dbDelete('descuentos_boleta', id),
  },
  programasZurzam: {
    add: (v: ProgramaZurzam) => dbInsert('programas_zurzam', v, fromPrograma),
    update: (id: string, u: Partial<ProgramaZurzam>, cur: ProgramaZurzam) => dbUpdate('programas_zurzam', id, u, fromPrograma, cur),
    delete: (id: string) => dbDelete('programas_zurzam', id),
  },
  programaDetalles: {
    add: (v: ProgramaDetalle) => dbInsert('programa_detalles', v, fromDetalle),
    update: (id: string, u: Partial<ProgramaDetalle>, cur: ProgramaDetalle) => dbUpdate('programa_detalles', id, u, fromDetalle, cur),
    delete: (id: string) => dbDelete('programa_detalles', id),
  },
  comprasHilo: {
    add: (v: CompraHilo) => dbInsert('compras_hilo', v, fromCompraHilo),
    update: (id: string, u: Partial<CompraHilo>, cur: CompraHilo) => dbUpdate('compras_hilo', id, u, fromCompraHilo, cur),
    delete: (id: string) => dbDelete('compras_hilo', id),
  },
  stockExtornos: {
    add: (v: StockExtorno) => dbInsert('stock_extornos', v, fromExtorno),
    update: (id: string, u: Partial<StockExtorno>, cur: StockExtorno) => dbUpdate('stock_extornos', id, u, fromExtorno, cur),
    delete: (id: string) => dbDelete('stock_extornos', id),
  },
  cobrosDiarios: {
    add: (v: CobroDiario) => dbInsert('cobros_diarios', v, fromCobro),
    update: (id: string, u: Partial<CobroDiario>, cur: CobroDiario) => dbUpdate('cobros_diarios', id, u, fromCobro, cur),
    delete: (id: string) => dbDelete('cobros_diarios', id),
  },
  movimientosComplemento: {
    add: (v: MovimientoComplemento) => dbInsert('movimientos_complemento', v, fromMovComplemento),
    update: (id: string, u: Partial<MovimientoComplemento>, cur: MovimientoComplemento) => dbUpdate('movimientos_complemento', id, u, fromMovComplemento, cur),
    delete: (id: string) => dbDelete('movimientos_complemento', id),
  },
  productoColores: {
    add: (v: ProductoColor) => dbInsert('producto_colores', v, (x: ProductoColor) => ({ id: x.id, producto_id: x.productoId, color_id: x.colorId, prop_s: x.propS, prop_m: x.propM, prop_l: x.propL, prop_xl: x.propXL })),
    update: (id: string, u: Partial<ProductoColor>, cur: ProductoColor) => dbUpdate('producto_colores', id, u, (x: ProductoColor) => ({ id: x.id, producto_id: x.productoId, color_id: x.colorId, prop_s: x.propS, prop_m: x.propM, prop_l: x.propL, prop_xl: x.propXL }), cur),
    delete: (id: string) => dbDelete('producto_colores', id),
  },
  config: {
    upsert: async (v: Config) => {
      const { error } = await supabase.from('config').upsert(fromConfig(v), { onConflict: 'clave' });
      if (error) throw error;
    },
  },
};
