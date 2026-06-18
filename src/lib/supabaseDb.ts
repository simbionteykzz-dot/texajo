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

// ─── Tipos fila DB (snake_case) ──────────────────────────────────────────────
// Permiten que TypeScript detecte en compilación si una columna se renombra.

type TallaDB         = 'S' | 'M' | 'L' | 'XL';
type CategoriaDB     = 'OSCURO' | 'CLARO' | 'MELANGE' | 'PPT';
type TipoProvDB      = 'TELA' | 'COMPLEMENTO' | 'HILO' | 'SERVICIO' | 'ZURZAM';
type TipoMovTelaDB   = 'INGRESO' | 'A_CORTE' | 'A_REPROCESO' | 'DE_REPROCESO' | 'MUESTRA' | 'AJUSTE_POS' | 'AJUSTE_NEG';
type TipoServTintDB  = 'REACTIVO' | 'DIRECTO' | 'PPT' | 'LAVADO' | 'TERMOFIJADO' | 'COMPACTADO_EN_RAMA';
type MonedaDB        = 'PEN' | 'USD';
type EstadoPagoGenDB = 'PENDIENTE' | 'PAGADO';
type EstadoProgramaDB = 'NUEVO' | 'EN_COMPRA' | 'EN_TEJEDURIA' | 'EN_TINTORERIA' | 'EN_PLANTA' | 'CERRADO';
type TipoDescDB      = 'ADELANTO' | 'DESCUENTO' | 'MULTA' | 'OTRO';
type TipoMovComplDB  = 'INGRESO' | 'A_CORTE' | 'DE_CORTE' | 'MUESTRA' | 'AJUSTE_POS' | 'AJUSTE_NEG';

interface DbCliente        { id: number; nombre: string; contacto: string | null; notas: string | null }
interface DbProveedor      { id: number; nombre: string; ruc: string | null; contacto: string | null; tipo: TipoProvDB }
interface DbTela           { id: number; nombre: string; composicion: string | null; kg_por_rollo: number; notas: string | null }
interface DbColor          { id: number; nombre: string; categoria: CategoriaDB; prioridad: number; notas: string | null }
interface DbPrecioTela     { id: number; tela_id: number; categoria: CategoriaDB | null; categoria_color: CategoriaDB | null; precio_kg: number }
interface DbPrecioCompl    { id: number; clave: string; tipo: string; origen: string; talla: TallaDB; precio: number }
interface DbPrecioTej      { id: number; tipo_tejido: string; precio_kg: number }
interface DbPrecioTint     { id: number; tipo_servicio: TipoServTintDB; tipo_tela: string; precio_kg: number; moneda: MonedaDB; notas: string | null }
interface DbProducto       { id: number; nombre: string; marca: string | null; costo_mo: number | null; precio_venta: number | null; tela_id: number | null; limite_consumo: number | null; limite_rendimiento: number | null; prop_s: number | null; prop_m: number | null; prop_l: number | null; prop_xl: number | null; notas: string | null }
interface DbTarifa         { id: number; producto_id: number; orden: number; operacion: string; tarifa: number; notas: string | null; clave: string | null }
interface DbOperario       { id: number; codigo: string; nombre_completo: string; estado: 'ACTIVO' | 'INACTIVO' | null; activo: boolean | null; dni: string | null; telefono: string | null; modulo: string | null; maquina: string | null; fecha_ingreso: string | null }
interface DbMovTela        { id: number; fecha: string; tipo: TipoMovTelaDB; cliente_id: number | null; tela_id: number; color_id: number; rollos: number; kg_total: number; categoria_color: CategoriaDB; precio_kg: number; total_soles: number; stock_rollos_antes: number; stock_rollos_despues: number; responsable: string; proveedor_id: number | null; n_factura: string | null; costo_real_fact: number | null; corte_id: number | null; n_corte: number | null; notas: string }
interface DbCorte          { id: number; n_corte: number; fecha: string; cliente_id: number; producto_id: number; color_id: number; tonalidad: string | null; colores_detalle: unknown | null; tela_id: number | null; cortador: string; ayudante: string; tendedor: string | null; kg_usados: number; rollos_usados: number; tendidas: number; mts_por_tendida: number; ancho_cm: number | null; ancho: number | null; cant_s: number; cant_m: number; cant_l: number; cant_xl: number; total_prendas: number; consumo: number; rendimiento: number; revision: boolean | string | null; traslado: boolean | null; estado: 'EN_PROCESO' | 'COMPLETADO' | 'ANULADO' | null; pago_cliente: number | string | null; pago_planilla: number | string | null; costo_mo_corte: number | null; notas: string | null; hora_inicio: string | null; hora_fin: string | null }
interface DbSeguimiento    { id: number; corte_id: number; n_corte: string; producto_id: number; fecha: string; color_id: number; talla: TallaDB; cantidad: number; asignaciones: unknown | null; pct_avance: number | null; porcentaje_avance: number | null; estado: string; total_pago: number }
interface DbBoletaLinea    { id: number; operario_id: number; corte_id: number | null; n_corte: number | string | null; producto_id: number | null; color_id: number | null; talla: TallaDB | null; tarifa_id: number | null; operacion: string | null; orden: number | null; tarifa: number | null; cant_prendas: number | null; importe: number | null; periodo: string | null; fecha_registro: string | null; estado_pago: EstadoPagoGenDB | null; fecha_pago: string | null }
interface DbDescuento      { id: number; operario_id: number; semana_inicio: string; tipo: string; monto: number; descripcion: string | null }
interface DbPrograma       { id: number; nombre: string; fecha: string; cliente_id: number; rollos_objetivo: number; kg_objetivo: number; estado: EstadoProgramaDB; comision_jose: number; estado_pago_comision: EstadoPagoGenDB | null; dias_entrega: number; notas: string | null }
interface DbDetalle        { id: number; programa_id: number; color_id: number; categoria_color: CategoriaDB | null; tipo_servicio: TipoServTintDB | null; prioridad: 'MEDIA' | 'URGENTE' | 'ALTA' | 'OPCIONAL'; kg_tej_enviado: number; kg_tej_retornado: number; precio_kg_tej: number; moneda_tej: MonedaDB | null; tc_tej: number | null; costo_tejido: number; estado_pago_tej: EstadoPagoGenDB | null; kg_tint_enviado: number; kg_tint_retornado: number; rollos_final: number; precio_kg_tint: number; moneda_tint: MonedaDB | null; tc_tint: number | null; costo_tint: number; estado_pago_tint: EstadoPagoGenDB | null; costo_hilo_prorrateado: number; costo_total_color: number; notas: string | null }
interface DbCompraHilo     { id: number; fecha: string; programa_id: number; tipo_hilo: string; kg_asignados: number; precio_kg: number; moneda: MonedaDB; tipo_cambio: number; total_soles: number; proveedor_id: number; n_factura: string | null; costo_real_fact: number; diferencia: number; estado_pago: EstadoPagoGenDB; fecha_pago: string | null; monto_pagado: number; saldo: number; notas: string | null }
interface DbExtorno        { id: number; programa_id: number; programa_detalle_id: number | null; fecha: string; kg_conos: number; precio_kg_hilo: number; total_soles: number; usado: boolean; notas: string | null }
interface DbCobro          { id: number; fecha: string; n_corte: number | null; n_factura: string | null; cliente_id: number; producto_id: number; color_id: number; cant_s: number; cant_m: number; cant_l: number; cant_xl: number; total_prendas: number | null; precio_unitario: number; bruto: number | null; detraccion_10pct: number | null; disponible_90pct: number | null; estado: 'ANULADO' | 'PENDIENTE' | 'COBRADO'; notas: string | null; fecha_cobro: string | null }
interface DbMovComplemento { id: number; fecha: string; tipo: string; tipo_complemento: string; color_id: number; talla: TallaDB; cantidad: number; precio_unit: number; total_soles: number; stock_antes: number; stock_despues: number; corte_id: number | null; n_corte: string | null; producto_destino_id: number | null; proveedor_id: number | null; n_factura: string | null; responsable: string; notas: string | null }
interface DbProductoColor  { id: number; producto_id: number; color_id: number; prop_s: number; prop_m: number; prop_l: number; prop_xl: number }
interface DbConfig         { clave: string; valor: string }

// ─── Mappers DB → App ────────────────────────────────────────────────────────

const toCliente = (r: DbCliente): Cliente => ({ id: String(r.id), nombre: r.nombre, contacto: r.contacto ?? '', notas: r.notas ?? '' });
const toProveedor = (r: DbProveedor): Proveedor => ({ id: String(r.id), nombre: r.nombre, ruc: r.ruc ?? '', contacto: r.contacto ?? '', tipo: r.tipo });
const toTela = (r: DbTela): Tela => ({ id: String(r.id), nombre: r.nombre, composicion: r.composicion ?? '', kgPorRollo: r.kg_por_rollo, notas: r.notas ?? '' });
const toColor = (r: DbColor): Color => ({ id: String(r.id), nombre: r.nombre, categoria: r.categoria, prioridad: r.prioridad, notas: r.notas ?? '' });
const toPrecioTela = (r: DbPrecioTela): PrecioTela => ({ id: String(r.id), telaId: String(r.tela_id), categoriaColor: r.categoria ?? r.categoria_color, precioKg: r.precio_kg });
const toPrecioComplemento = (r: DbPrecioCompl): PrecioComplemento => ({ id: String(r.id), clave: r.clave, tipo: r.tipo, origen: r.origen, talla: r.talla, precio: r.precio });
const toPrecioTejeduria = (r: DbPrecioTej): PrecioTejeduria => ({ id: String(r.id), tipoTejido: r.tipo_tejido, precioKg: r.precio_kg });
const toProducto = (r: DbProducto): Producto => ({ id: String(r.id), nombre: r.nombre, marca: r.marca ?? undefined, costoMoTotal: r.costo_mo ?? 0, precioServicio: r.precio_venta ?? 0, telaId: r.tela_id ? String(r.tela_id) : undefined, limiteConsumo: r.limite_consumo ?? undefined, limiteRendimiento: r.limite_rendimiento ?? undefined, propS: r.prop_s ?? undefined, propM: r.prop_m ?? undefined, propL: r.prop_l ?? undefined, propXL: r.prop_xl ?? undefined, notas: r.notas ?? '' });
const toTarifa = (r: DbTarifa): TarifaOperacion => ({ id: String(r.id), productoId: String(r.producto_id), orden: r.orden, operacion: r.operacion, tarifa: r.tarifa, notas: r.notas, clave: r.clave });
const toOperario = (r: DbOperario): Operario => ({ id: String(r.id), codigo: r.codigo, nombre: r.nombre_completo, estado: r.estado ?? (r.activo === false ? 'INACTIVO' : 'ACTIVO'), dni: r.dni ?? undefined, telefono: r.telefono ?? undefined, modulo: r.modulo ?? undefined, maquina: r.maquina ?? undefined, fechaIngreso: r.fecha_ingreso ?? undefined });
const toMovTela = (r: DbMovTela): MovimientoTela => ({ id: String(r.id), fecha: r.fecha, tipo: r.tipo, clienteId: r.cliente_id ? String(r.cliente_id) : '', telaId: String(r.tela_id), colorId: String(r.color_id), rollos: r.rollos, kgTotal: r.kg_total, categoriaColor: r.categoria_color, precioKg: r.precio_kg, totalSoles: r.total_soles, stockRollosAntes: r.stock_rollos_antes, stockRollosDespues: r.stock_rollos_despues, responsable: r.responsable, proveedorId: r.proveedor_id ? String(r.proveedor_id) : undefined, nFactura: r.n_factura ?? undefined, costoRealFact: r.costo_real_fact ?? undefined, corteId: r.corte_id ? String(r.corte_id) : undefined, nCorte: r.n_corte != null ? String(r.n_corte) : undefined, notas: r.notas });
const toCorte = (r: DbCorte): Corte => ({ id: String(r.id), nCorte: String(r.n_corte), fecha: r.fecha, clienteId: String(r.cliente_id), productoId: String(r.producto_id), colorId: String(r.color_id), tonalidad: r.tonalidad ?? undefined, coloresDetalle: (r.colores_detalle as import('../types').CorteColorDetalle[] | null) ?? undefined, telaId: r.tela_id ? String(r.tela_id) : undefined, cortador: r.cortador, ayudante: r.ayudante, tendedor: r.tendedor ?? '', kgUsados: r.kg_usados, rollosUsados: r.rollos_usados, tendidas: r.tendidas, mtsPorTendida: r.mts_por_tendida, ancho: r.ancho_cm ?? r.ancho, cantS: r.cant_s, cantM: r.cant_m, cantL: r.cant_l, cantXL: r.cant_xl, totalPrendas: r.total_prendas, consumo: r.consumo, rendimiento: r.rendimiento, revision: r.revision === true ? 'VERIFICADO' : (r.revision === 'VERIFICADO' ? 'VERIFICADO' : 'PENDIENTE'), traslado: r.traslado ?? false, estado: r.estado ?? 'EN_PROCESO', pagoCliente: r.pago_cliente === 1 || r.pago_cliente === 'COBRADO' ? 'COBRADO' : 'PENDIENTE', pagoPlanilla: r.pago_planilla === 1 || r.pago_planilla === 'PAGADO' ? 'PAGADO' : 'PENDIENTE', costoMoCorte: r.costo_mo_corte ?? 0, notas: r.notas ?? '', horaInicio: r.hora_inicio ?? undefined, horaFin: r.hora_fin ?? undefined });
const toSeguimientoFila = (r: DbSeguimiento): SeguimientoFila => ({ id: String(r.id), corteId: String(r.corte_id), nCorte: r.n_corte, productoId: String(r.producto_id), fecha: r.fecha, colorId: String(r.color_id), talla: r.talla, cantidad: r.cantidad, asignaciones: (r.asignaciones as import('../types').SeguimientoAsignacion[] | null) ?? [], pctAvance: r.pct_avance ?? r.porcentaje_avance ?? 0, estado: r.estado, totalPago: r.total_pago });
const toBoletaLinea = (r: DbBoletaLinea): BoletaLinea => ({ id: String(r.id), operarioId: String(r.operario_id), corteId: r.corte_id ? String(r.corte_id) : '', nCorte: r.n_corte != null ? String(r.n_corte) : '', productoId: r.producto_id ? String(r.producto_id) : '', colorId: r.color_id ? String(r.color_id) : undefined, talla: r.talla ?? undefined, tarifaId: r.tarifa_id ? String(r.tarifa_id) : '', operacion: r.operacion ?? '', orden: r.orden ?? 0, tarifa: r.tarifa ?? 0, cantPrendas: r.cant_prendas ?? 0, importe: r.importe ?? 0, periodo: r.periodo ?? '', fechaRegistro: r.fecha_registro ?? undefined, estadoPago: r.estado_pago ?? 'PENDIENTE', fechaPago: r.fecha_pago ?? undefined });
const toDescuento = (r: DbDescuento): DescuentoBoleta => ({ id: String(r.id), operarioId: String(r.operario_id), periodo: (r.semana_inicio ?? '').slice(0, 7), tipo: r.tipo as import('../types').TipoDescuentoBoleta, monto: r.monto, notas: r.descripcion ?? '' });
const toPrograma = (r: DbPrograma): ProgramaZurzam => ({ id: String(r.id), nombre: r.nombre, fecha: r.fecha, clienteId: String(r.cliente_id), rollosObjetivo: r.rollos_objetivo, kgObjetivo: r.kg_objetivo, estado: r.estado, comisionJose: r.comision_jose, estadoPagoComision: r.estado_pago_comision, diasEntrega: r.dias_entrega, notas: r.notas });
const toDetalle = (r: DbDetalle): ProgramaDetalle => ({ id: String(r.id), programaId: String(r.programa_id), colorId: String(r.color_id), categoriaColor: r.categoria_color, tipoServicio: r.tipo_servicio, prioridad: r.prioridad, kgTejEnviado: r.kg_tej_enviado, kgTejRetornado: r.kg_tej_retornado, precioKgTej: r.precio_kg_tej, monedaTej: r.moneda_tej, tcTej: r.tc_tej, costoTejido: r.costo_tejido, estadoPagoTej: r.estado_pago_tej, kgTintEnviado: r.kg_tint_enviado, kgTintRetornado: r.kg_tint_retornado, rollosFinal: r.rollos_final, precioKgTint: r.precio_kg_tint, monedaTint: r.moneda_tint, tcTint: r.tc_tint, costoTint: r.costo_tint, estadoPagoTint: r.estado_pago_tint, costoHiloProrrateado: r.costo_hilo_prorrateado, costoTotalColor: r.costo_total_color, notas: r.notas });
const toCompraHilo = (r: DbCompraHilo): CompraHilo => ({ id: String(r.id), fecha: r.fecha, programaId: String(r.programa_id), tipoHilo: r.tipo_hilo, kgAsignados: r.kg_asignados, precioKg: r.precio_kg, moneda: r.moneda, tipoCambio: r.tipo_cambio, totalSoles: r.total_soles, proveedorId: String(r.proveedor_id), nFactura: r.n_factura, costoRealFact: r.costo_real_fact, diferencia: r.diferencia, estadoPago: r.estado_pago, fechaPago: r.fecha_pago ?? undefined, montoPagado: r.monto_pagado, saldo: r.saldo, notas: r.notas });
const toExtorno = (r: DbExtorno): StockExtorno => ({ id: String(r.id), programaId: String(r.programa_id), programaDetalleId: r.programa_detalle_id ? String(r.programa_detalle_id) : undefined, fecha: r.fecha, kgConos: r.kg_conos, precioKgHilo: r.precio_kg_hilo, totalSoles: r.total_soles, usado: r.usado, notas: r.notas });
const toCobro = (r: DbCobro): CobroDiario => ({ id: String(r.id), fecha: r.fecha, nCorte: r.n_corte != null ? String(r.n_corte) : '', nFactura: r.n_factura ?? '', clienteId: String(r.cliente_id), productoId: String(r.producto_id), colorId: String(r.color_id), cantS: r.cant_s, cantM: r.cant_m, cantL: r.cant_l, cantXL: r.cant_xl, totalPrendas: r.total_prendas, precioUnitario: r.precio_unitario, bruto: r.bruto, detraccion10Pct: r.detraccion_10pct, disponible90Pct: r.disponible_90pct, estado: r.estado, notas: r.notas, fechaCobro: r.fecha_cobro ?? undefined });
const toMovComplemento = (r: DbMovComplemento): MovimientoComplemento => ({ id: String(r.id), fecha: r.fecha, tipo: r.tipo as import('../types').TipoMovimientoComplemento, tipoComplemento: r.tipo_complemento, colorId: String(r.color_id), talla: r.talla, cantidad: r.cantidad, precioUnit: r.precio_unit, totalSoles: r.total_soles, stockAntes: r.stock_antes, stockDespues: r.stock_despues, corteId: r.corte_id ? String(r.corte_id) : undefined, nCorte: r.n_corte ?? undefined, productoDestinoId: r.producto_destino_id ? String(r.producto_destino_id) : undefined, proveedorId: r.proveedor_id ? String(r.proveedor_id) : undefined, nFactura: r.n_factura ?? undefined, responsable: r.responsable, notas: r.notas });
// Config es tabla key-value: [{clave, valor}]. Convertimos el array a objeto Config.
const toConfig = (rows: DbConfig[]): Config => {
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
const toProductoColor = (r: DbProductoColor): ProductoColor => ({ id: String(r.id), productoId: String(r.producto_id), colorId: String(r.color_id), propS: r.prop_s, propM: r.prop_m, propL: r.prop_l, propXL: r.prop_xl });

// ─── Mappers App → DB ────────────────────────────────────────────────────────

const safeInt = (v: string) => { const n = parseInt(v); return isNaN(n) ? v : n; };

const fromCliente = (v: Cliente) => ({ id: v.id, nombre: v.nombre, contacto: v.contacto, notas: v.notas });
const fromClienteInsert = (v: Cliente) => ({ nombre: v.nombre, contacto: v.contacto, notas: v.notas });
const fromProveedor = (v: Proveedor) => ({ id: v.id, nombre: v.nombre, ruc: v.ruc, contacto: v.contacto, tipo: v.tipo });
const fromProveedorInsert = (v: Proveedor) => ({ nombre: v.nombre, ruc: v.ruc, contacto: v.contacto, tipo: v.tipo });
const fromTela = (v: Tela) => ({ id: v.id, nombre: v.nombre, composicion: v.composicion, kg_por_rollo: v.kgPorRollo, notas: v.notas });
const fromTelaInsert = (v: Tela) => ({ nombre: v.nombre, composicion: v.composicion, kg_por_rollo: v.kgPorRollo, notas: v.notas });
const fromColor = (v: Color) => ({ nombre: v.nombre, categoria: v.categoria, prioridad: v.prioridad, notas: v.notas });
const fromPrecioTela = (v: PrecioTela) => ({ id: v.id, tela_id: v.telaId, categoria_color: v.categoriaColor, precio_kg: v.precioKg });
const fromPrecioTelaInsert = (v: PrecioTela) => ({ tela_id: v.telaId, categoria_color: v.categoriaColor, precio_kg: v.precioKg });
const fromPrecioComplemento = (v: PrecioComplemento) => ({ id: v.id, clave: v.clave, tipo: v.tipo, origen: v.origen, talla: v.talla, precio: v.precio });
const fromPrecioComplementoInsert = (v: PrecioComplemento) => ({ clave: v.clave, tipo: v.tipo, origen: v.origen, talla: v.talla, precio: v.precio });
const fromPrecioTejeduria = (v: PrecioTejeduria) => ({ id: v.id, tipo_tejido: v.tipoTejido, precio_kg: v.precioKg });
const fromPrecioTejeduriaInsert = (v: PrecioTejeduria) => ({ tipo_tejido: v.tipoTejido, precio_kg: v.precioKg });
const toPrecioTintoreria = (r: DbPrecioTint): PrecioTintoreria => ({ id: String(r.id), tipoServicio: r.tipo_servicio, tipoTela: r.tipo_tela, precioKg: r.precio_kg, moneda: r.moneda, notas: r.notas ?? '' });
const fromPrecioTintoreria = (v: PrecioTintoreria) => ({ id: v.id, tipo_servicio: v.tipoServicio, tipo_tela: v.tipoTela, precio_kg: v.precioKg, moneda: v.moneda, notas: v.notas });
const fromPrecioTintoreraInsert = (v: PrecioTintoreria) => ({ tipo_servicio: v.tipoServicio, tipo_tela: v.tipoTela, precio_kg: v.precioKg, moneda: v.moneda, notas: v.notas });
const fromProducto = (v: Producto) => ({ id: v.id, nombre: v.nombre, marca: v.marca ?? null, costo_mo: v.costoMoTotal, precio_venta: v.precioServicio, tela_id: v.telaId ? parseInt(v.telaId) : null, limite_consumo: v.limiteConsumo ?? null, limite_rendimiento: v.limiteRendimiento ?? null, prop_s: v.propS ?? null, prop_m: v.propM ?? null, prop_l: v.propL ?? null, prop_xl: v.propXL ?? null, notas: v.notas });
// Para INSERT omitimos id (PK integer autoincremental)
const fromProductoInsert = (v: Producto) => ({ nombre: v.nombre, marca: v.marca ?? null, costo_mo: v.costoMoTotal, precio_venta: v.precioServicio, tela_id: v.telaId ? parseInt(v.telaId) : null, limite_consumo: v.limiteConsumo ?? null, limite_rendimiento: v.limiteRendimiento ?? null, prop_s: v.propS ?? null, prop_m: v.propM ?? null, prop_l: v.propL ?? null, prop_xl: v.propXL ?? null, notas: v.notas });
const fromTarifa = (v: TarifaOperacion) => {
  const base: Record<string, unknown> = { id: v.id, producto_id: safeInt(v.productoId), orden: v.orden, operacion: v.operacion, tarifa: v.tarifa, notas: v.notas ?? null };
  if (v.clave !== undefined) base.clave = v.clave;
  return base;
};
// Para INSERT omitimos id (PK integer autoincremental)
const fromTarifaInsert = (v: TarifaOperacion) => {
  const base: Record<string, unknown> = { producto_id: safeInt(v.productoId), orden: v.orden, operacion: v.operacion, tarifa: v.tarifa, notas: v.notas ?? null };
  if (v.clave !== undefined) base.clave = v.clave;
  return base;
};
const fromOperario = (v: Operario) => ({ id: v.id, codigo: v.codigo, nombre_completo: v.nombre, activo: v.estado === 'ACTIVO' });
// Para INSERT omitimos id (PK integer autoincremental)
const fromOperarioInsert = (v: Operario) => ({ codigo: v.codigo, nombre_completo: v.nombre, activo: v.estado === 'ACTIVO' });
const fromMovTela = (v: MovimientoTela) => ({ id: v.id, fecha: v.fecha, tipo: v.tipo, cliente_id: v.clienteId ? safeInt(v.clienteId) : null, tela_id: safeInt(v.telaId), color_id: safeInt(v.colorId), rollos: v.rollos, kg_total: v.kgTotal, categoria_color: v.categoriaColor, precio_kg: v.precioKg, total_soles: v.totalSoles, stock_rollos_antes: v.stockRollosAntes, stock_rollos_despues: v.stockRollosDespues, responsable: v.responsable, proveedor_id: v.proveedorId ? safeInt(v.proveedorId) : null, n_factura: v.nFactura ?? null, costo_real_fact: v.costoRealFact ?? null, corte_id: v.corteId ? safeInt(v.corteId) : null, n_corte: v.nCorte ?? null, notas: v.notas });
const fromMovTelaInsert = (v: MovimientoTela) => ({ fecha: v.fecha, tipo: v.tipo, cliente_id: v.clienteId ? safeInt(v.clienteId) : null, tela_id: safeInt(v.telaId), color_id: safeInt(v.colorId), rollos: v.rollos, kg_total: v.kgTotal, categoria_color: v.categoriaColor, precio_kg: v.precioKg, total_soles: v.totalSoles, stock_rollos_antes: v.stockRollosAntes, stock_rollos_despues: v.stockRollosDespues, responsable: v.responsable, proveedor_id: v.proveedorId ? safeInt(v.proveedorId) : null, n_factura: v.nFactura ?? null, costo_real_fact: v.costoRealFact ?? null, corte_id: v.corteId ? safeInt(v.corteId) : null, n_corte: v.nCorte ?? null, notas: v.notas });
// fromCorte omite 'id' porque la PK es integer auto-generada; convierte FKs a integer
const fromCorte = (v: Corte) => {
  const base: Record<string, unknown> = { n_corte: parseInt(v.nCorte), fecha: v.fecha, cliente_id: parseInt(v.clienteId), producto_id: parseInt(v.productoId), color_id: parseInt(v.colorId), tonalidad: v.tonalidad ?? null, colores_detalle: v.coloresDetalle ?? null, tela_id: v.telaId ? parseInt(v.telaId) : null, cortador: v.cortador, ayudante: v.ayudante, tendedor: v.tendedor, kg_usados: v.kgUsados, rollos_usados: v.rollosUsados, tendidas: v.tendidas, mts_por_tendida: v.mtsPorTendida, ancho_cm: v.ancho, cant_s: v.cantS, cant_m: v.cantM, cant_l: v.cantL, cant_xl: v.cantXL, total_prendas: v.totalPrendas, consumo: v.consumo, rendimiento: v.rendimiento, revision: v.revision === 'VERIFICADO', traslado: v.traslado, estado: v.estado, pago_cliente: v.pagoCliente === 'COBRADO' ? 1 : 0, pago_planilla: v.pagoPlanilla === 'PAGADO' ? 1 : 0, costo_mo_corte: v.costoMoCorte, notas: v.notas };
  if (v.horaInicio !== undefined) base.hora_inicio = v.horaInicio ?? null;
  if (v.horaFin !== undefined) base.hora_fin = v.horaFin ?? null;
  return base;
};
const fromSeguimientoFila = (v: SeguimientoFila) => ({ id: v.id, corte_id: safeInt(v.corteId), n_corte: v.nCorte, producto_id: safeInt(v.productoId), fecha: v.fecha, color_id: safeInt(v.colorId), talla: v.talla, cantidad: v.cantidad, asignaciones: v.asignaciones, pct_avance: v.pctAvance, porcentaje_avance: v.pctAvance, estado: v.estado, total_pago: v.totalPago });
const fromSeguimientoFilaInsert = (v: SeguimientoFila) => ({ corte_id: safeInt(v.corteId), n_corte: v.nCorte, producto_id: safeInt(v.productoId), fecha: v.fecha, color_id: safeInt(v.colorId), talla: v.talla, cantidad: v.cantidad, asignaciones: v.asignaciones, pct_avance: v.pctAvance, porcentaje_avance: v.pctAvance, estado: v.estado, total_pago: v.totalPago });
const fromBoletaLinea = (v: BoletaLinea) => ({ id: v.id, operario_id: safeInt(v.operarioId), corte_id: v.corteId ? safeInt(v.corteId) : null, n_corte: v.nCorte, producto_id: v.productoId ? safeInt(v.productoId) : null, color_id: v.colorId ? safeInt(v.colorId) : null, talla: v.talla ?? null, tarifa_id: v.tarifaId ? safeInt(v.tarifaId) : null, operacion: v.operacion, orden: v.orden, tarifa: v.tarifa, cant_prendas: v.cantPrendas, importe: v.importe, periodo: v.periodo, fecha_registro: v.fechaRegistro ?? null, estado_pago: v.estadoPago, fecha_pago: v.fechaPago ?? null });
const fromBoletaLineaInsert = (v: BoletaLinea) => ({ operario_id: safeInt(v.operarioId), corte_id: v.corteId ? safeInt(v.corteId) : null, n_corte: v.nCorte, producto_id: v.productoId ? safeInt(v.productoId) : null, color_id: v.colorId ? safeInt(v.colorId) : null, talla: v.talla ?? null, tarifa_id: v.tarifaId ? safeInt(v.tarifaId) : null, operacion: v.operacion, orden: v.orden, tarifa: v.tarifa, cant_prendas: v.cantPrendas, importe: v.importe, periodo: v.periodo, fecha_registro: v.fechaRegistro ?? null, estado_pago: v.estadoPago, fecha_pago: v.fechaPago ?? null });
const fromDescuento = (v: DescuentoBoleta) => ({ operario_id: safeInt(v.operarioId), semana_inicio: v.periodo + '-01', tipo: v.tipo, monto: v.monto, descripcion: v.notas || null });
const fromPrograma = (v: ProgramaZurzam) => ({ id: v.id, nombre: v.nombre, fecha: v.fecha, cliente_id: safeInt(v.clienteId), rollos_objetivo: v.rollosObjetivo, kg_objetivo: v.kgObjetivo, estado: v.estado, comision_jose: v.comisionJose, estado_pago_comision: v.estadoPagoComision, dias_entrega: v.diasEntrega, notas: v.notas });
const fromProgramaInsert = (v: ProgramaZurzam) => ({ nombre: v.nombre, fecha: v.fecha, cliente_id: safeInt(v.clienteId), rollos_objetivo: v.rollosObjetivo, kg_objetivo: v.kgObjetivo, estado: v.estado, comision_jose: v.comisionJose, estado_pago_comision: v.estadoPagoComision, dias_entrega: v.diasEntrega, notas: v.notas });
const fromDetalle = (v: ProgramaDetalle) => ({ id: v.id, programa_id: safeInt(v.programaId), color_id: safeInt(v.colorId), categoria_color: v.categoriaColor, tipo_servicio: v.tipoServicio, prioridad: v.prioridad, kg_tej_enviado: v.kgTejEnviado, kg_tej_retornado: v.kgTejRetornado, precio_kg_tej: v.precioKgTej, moneda_tej: v.monedaTej, tc_tej: v.tcTej, costo_tejido: v.costoTejido, estado_pago_tej: v.estadoPagoTej, kg_tint_enviado: v.kgTintEnviado, kg_tint_retornado: v.kgTintRetornado, rollos_final: v.rollosFinal, precio_kg_tint: v.precioKgTint, moneda_tint: v.monedaTint, tc_tint: v.tcTint, costo_tint: v.costoTint, estado_pago_tint: v.estadoPagoTint, costo_hilo_prorrateado: v.costoHiloProrrateado, costo_total_color: v.costoTotalColor, notas: v.notas });
const fromDetalleInsert = (v: ProgramaDetalle) => ({ programa_id: safeInt(v.programaId), color_id: safeInt(v.colorId), categoria_color: v.categoriaColor, tipo_servicio: v.tipoServicio, prioridad: v.prioridad, kg_tej_enviado: v.kgTejEnviado, kg_tej_retornado: v.kgTejRetornado, precio_kg_tej: v.precioKgTej, moneda_tej: v.monedaTej, tc_tej: v.tcTej, costo_tejido: v.costoTejido, estado_pago_tej: v.estadoPagoTej, kg_tint_enviado: v.kgTintEnviado, kg_tint_retornado: v.kgTintRetornado, rollos_final: v.rollosFinal, precio_kg_tint: v.precioKgTint, moneda_tint: v.monedaTint, tc_tint: v.tcTint, costo_tint: v.costoTint, estado_pago_tint: v.estadoPagoTint, costo_hilo_prorrateado: v.costoHiloProrrateado, costo_total_color: v.costoTotalColor, notas: v.notas });
const fromCompraHilo = (v: CompraHilo) => ({ id: v.id, fecha: v.fecha, programa_id: safeInt(v.programaId), tipo_hilo: v.tipoHilo, kg_asignados: v.kgAsignados, precio_kg: v.precioKg, moneda: v.moneda, tipo_cambio: v.tipoCambio, total_soles: v.totalSoles, proveedor_id: safeInt(v.proveedorId), n_factura: v.nFactura, costo_real_fact: v.costoRealFact, diferencia: v.diferencia, estado_pago: v.estadoPago, fecha_pago: v.fechaPago ?? null, monto_pagado: v.montoPagado, saldo: v.saldo, notas: v.notas });
const fromCompraHiloInsert = (v: CompraHilo) => ({ fecha: v.fecha, programa_id: safeInt(v.programaId), tipo_hilo: v.tipoHilo, kg_asignados: v.kgAsignados, precio_kg: v.precioKg, moneda: v.moneda, tipo_cambio: v.tipoCambio, total_soles: v.totalSoles, proveedor_id: safeInt(v.proveedorId), n_factura: v.nFactura, costo_real_fact: v.costoRealFact, diferencia: v.diferencia, estado_pago: v.estadoPago, fecha_pago: v.fechaPago ?? null, monto_pagado: v.montoPagado, saldo: v.saldo, notas: v.notas });
const fromExtorno = (v: StockExtorno) => ({ id: v.id, programa_id: safeInt(v.programaId), programa_detalle_id: v.programaDetalleId ? safeInt(v.programaDetalleId) : null, fecha: v.fecha, kg_conos: v.kgConos, precio_kg_hilo: v.precioKgHilo, total_soles: v.totalSoles, usado: v.usado, notas: v.notas });
const fromExtornoInsert = (v: StockExtorno) => ({ programa_id: safeInt(v.programaId), programa_detalle_id: v.programaDetalleId ? safeInt(v.programaDetalleId) : null, fecha: v.fecha, kg_conos: v.kgConos, precio_kg_hilo: v.precioKgHilo, total_soles: v.totalSoles, usado: v.usado, notas: v.notas });
const fromCobro = (v: CobroDiario) => ({ id: v.id, fecha: v.fecha, n_corte: v.nCorte, n_factura: v.nFactura, cliente_id: safeInt(v.clienteId), producto_id: safeInt(v.productoId), color_id: safeInt(v.colorId), cant_s: v.cantS, cant_m: v.cantM, cant_l: v.cantL, cant_xl: v.cantXL, total_prendas: v.totalPrendas, precio_unitario: v.precioUnitario, bruto: v.bruto, detraccion_10pct: v.detraccion10Pct, disponible_90pct: v.disponible90Pct, estado: v.estado, notas: v.notas, fecha_cobro: v.fechaCobro ?? null });
const fromCobroInsert = (v: CobroDiario) => ({ fecha: v.fecha, n_corte: v.nCorte, n_factura: v.nFactura, cliente_id: safeInt(v.clienteId), producto_id: safeInt(v.productoId), color_id: safeInt(v.colorId), cant_s: v.cantS, cant_m: v.cantM, cant_l: v.cantL, cant_xl: v.cantXL, total_prendas: v.totalPrendas, precio_unitario: v.precioUnitario, bruto: v.bruto, detraccion_10pct: v.detraccion10Pct, disponible_90pct: v.disponible90Pct, estado: v.estado, notas: v.notas, fecha_cobro: v.fechaCobro ?? null });
const fromMovComplemento = (v: MovimientoComplemento) => ({ id: v.id, fecha: v.fecha, tipo: v.tipo, tipo_complemento: v.tipoComplemento, color_id: safeInt(v.colorId), talla: v.talla, cantidad: v.cantidad, precio_unit: v.precioUnit, total_soles: v.totalSoles, stock_antes: v.stockAntes, stock_despues: v.stockDespues, corte_id: v.corteId ? safeInt(v.corteId) : null, n_corte: v.nCorte ?? null, producto_destino_id: v.productoDestinoId ? safeInt(v.productoDestinoId) : null, proveedor_id: v.proveedorId ? safeInt(v.proveedorId) : null, n_factura: v.nFactura ?? null, responsable: v.responsable, notas: v.notas });
const fromMovComplementoInsert = (v: MovimientoComplemento) => ({ fecha: v.fecha, tipo: v.tipo, tipo_complemento: v.tipoComplemento, color_id: safeInt(v.colorId), talla: v.talla, cantidad: v.cantidad, precio_unit: v.precioUnit, total_soles: v.totalSoles, stock_antes: v.stockAntes, stock_despues: v.stockDespues, corte_id: v.corteId ? safeInt(v.corteId) : null, n_corte: v.nCorte ?? null, producto_destino_id: v.productoDestinoId ? safeInt(v.productoDestinoId) : null, proveedor_id: v.proveedorId ? safeInt(v.proveedorId) : null, n_factura: v.nFactura ?? null, responsable: v.responsable, notas: v.notas });
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

// ─── Retry con backoff exponencial ──────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 400): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

// ─── Carga inicial completa ──────────────────────────────────────────────────

export async function loadAllFromDb(): Promise<DbAppState> {
  const q = <T>(table: string) => supabase.from(table).select('*') as unknown as Promise<{ data: T[] | null; error: unknown }>;
  // Tablas críticas usan retry; el resto falla graciosamente con array vacío
  const [
    c, p, te, co, pt, pc, ptej, ptint, pr, to, op,
    mt, cor, sf, bl, dbesc,
    pz, pd, ch, se, cd, mc, pcolores, cfg
  ] = await Promise.all([
    withRetry(() => q('clientes')),
    q('proveedores'),
    withRetry(() => q('telas')),
    q('colores'),
    q('precios_telas'),
    q('precios_complementos'),
    q('precios_tejeduria'),
    q('precios_tintoreria'),
    withRetry(() => q('productos')),
    q('tarifas_operaciones'),
    q('operarios'),
    q('movimientos_tela'),
    q('cortes'),
    q('seguimiento_filas'),
    q('boleta_lineas'),
    q('descuentos_boleta'),
    q('programas_zurzam'),
    q('programa_detalles'),
    q('compras_hilo'),
    q('stock_extornos'),
    q('cobros_diarios'),
    q('movimientos_complemento'),
    q('producto_colores'),
    q('config'),
  ]);

  // Loguear errores individuales para diagnóstico
  const checks = { c, p, te, co, pt, pc, ptej, ptint, pr, to, op, mt, cor, sf, bl, dbesc, pz, pd, ch, se, cd, mc, pcolores };
  for (const [name, res] of Object.entries(checks)) {
    if (res.error) console.error(`[Supabase] SELECT ${name} error:`, res.error);
  }
  if (cfg.error) console.error('[Supabase] SELECT config error:', cfg.error);

  // Solo reintentar si hubo error real — no si la tabla simplemente está vacía
  let productoColoresData = pcolores.data ?? [];
  if (pcolores.error) {
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
  const errMsg = (e: unknown) => (e as { message?: string })?.message ?? String(e);
  if (c.error || te.error || pr.error) {
    throw new Error(`Supabase SELECT falló: ${errMsg(c.error ?? te.error ?? pr.error)}`);
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
    config:                 (cfg.data && cfg.data.length > 0) ? toConfig(cfg.data as DbConfig[]) : null,
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

async function dbInsert<T>(table: TableName, row: T, mapper: (v: T) => Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabase.from(table).insert(mapper(row)).select('id').single();
  if (error) throw error;
  return data ? String(data.id) : null;
}

async function dbUpdate<T>(table: TableName, id: string, updates: Partial<T>, fullMapper: (v: T) => Record<string, unknown>, current: T) {
  const merged = { ...current, ...updates } as T;
  const mapped = fullMapper(merged);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, updated_at: _ua, ...fields } = mapped as Record<string, unknown>;
  void _id; void _ca; void _ua;
  const { error } = await supabase.from(table).update(fields).eq('id', id);
  if (error) {
    console.error('[dbUpdate error]', table, id, error);
    throw error;
  }
}

async function dbDelete(table: TableName, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// ─── API pública por entidad ─────────────────────────────────────────────────

export const db = {
  clientes: {
    add: (v: Cliente) => dbInsert('clientes', v, fromClienteInsert),
    update: (id: string, u: Partial<Cliente>, cur: Cliente) => dbUpdate('clientes', id, u, fromCliente, cur),
    delete: (id: string) => dbDelete('clientes', id),
  },
  proveedores: {
    add: (v: Proveedor) => dbInsert('proveedores', v, fromProveedorInsert),
    update: (id: string, u: Partial<Proveedor>, cur: Proveedor) => dbUpdate('proveedores', id, u, fromProveedor, cur),
    delete: (id: string) => dbDelete('proveedores', id),
  },
  telas: {
    add: (v: Tela) => dbInsert('telas', v, fromTelaInsert),
    update: (id: string, u: Partial<Tela>, cur: Tela) => dbUpdate('telas', id, u, fromTela, cur),
    delete: (id: string) => dbDelete('telas', id),
  },
  colores: {
    add: (v: Color) => dbInsert('colores', v, fromColor),
    update: (id: string, u: Partial<Color>, cur: Color) => dbUpdate('colores', id, u, fromColor, cur),
    delete: (id: string) => dbDelete('colores', id),
  },
  preciosTelas: {
    add: (v: PrecioTela) => dbInsert('precios_telas', v, fromPrecioTelaInsert),
    update: (id: string, u: Partial<PrecioTela>, cur: PrecioTela) => dbUpdate('precios_telas', id, u, fromPrecioTela, cur),
    delete: (id: string) => dbDelete('precios_telas', id),
  },
  preciosComplementos: {
    add: (v: PrecioComplemento) => dbInsert('precios_complementos', v, fromPrecioComplementoInsert),
    update: (id: string, u: Partial<PrecioComplemento>, cur: PrecioComplemento) => dbUpdate('precios_complementos', id, u, fromPrecioComplemento, cur),
    delete: (id: string) => dbDelete('precios_complementos', id),
  },
  preciosTejeduria: {
    add: (v: PrecioTejeduria) => dbInsert('precios_tejeduria', v, fromPrecioTejeduriaInsert),
    update: (id: string, u: Partial<PrecioTejeduria>, cur: PrecioTejeduria) => dbUpdate('precios_tejeduria', id, u, fromPrecioTejeduria, cur),
    delete: (id: string) => dbDelete('precios_tejeduria', id),
  },
  preciosTintoreria: {
    add: (v: PrecioTintoreria) => dbInsert('precios_tintoreria', v, fromPrecioTintoreraInsert),
    update: (id: string, u: Partial<PrecioTintoreria>, cur: PrecioTintoreria) => dbUpdate('precios_tintoreria', id, u, fromPrecioTintoreria, cur),
    delete: (id: string) => dbDelete('precios_tintoreria', id),
  },
  productos: {
    add: (v: Producto) => dbInsert('productos', v, fromProductoInsert),
    update: (id: string, u: Partial<Producto>, cur: Producto) => dbUpdate('productos', id, u, fromProducto, cur),
    delete: (id: string) => dbDelete('productos', id),
  },
  tarifasOperaciones: {
    add: (v: TarifaOperacion) => dbInsert('tarifas_operaciones', v, fromTarifaInsert),
    update: (id: string, u: Partial<TarifaOperacion>, cur: TarifaOperacion) => dbUpdate('tarifas_operaciones', id, u, fromTarifa, cur),
    delete: (id: string) => dbDelete('tarifas_operaciones', id),
  },
  operarios: {
    add: (v: Operario) => dbInsert('operarios', v, fromOperarioInsert),
    update: (id: string, u: Partial<Operario>, cur: Operario) => dbUpdate('operarios', id, u, fromOperario, cur),
    delete: (id: string) => dbDelete('operarios', id),
  },
  movimientosTela: {
    add: (v: MovimientoTela) => dbInsert('movimientos_tela', v, fromMovTelaInsert),
    update: (id: string, u: Partial<MovimientoTela>, cur: MovimientoTela) => dbUpdate('movimientos_tela', id, u, fromMovTela, cur),
    delete: (id: string) => dbDelete('movimientos_tela', id),
  },
  cortes: {
    add: (v: Corte): Promise<string | null> => dbInsert('cortes', v, fromCorte),
    update: (id: string, u: Partial<Corte>, cur: Corte) => dbUpdate('cortes', id, u, (v: Corte) => ({ ...fromCorte(v), id: parseInt(id) }), cur),
    delete: async (id: string) => {
      const intId = parseInt(id);
      const numId = isNaN(intId) ? id : intId;
      const { error } = await supabase.from('cortes').delete().eq('id', numId);
      if (error) throw error;
    },
  },
  seguimientoFilas: {
    add: (v: SeguimientoFila): Promise<string | null> => dbInsert('seguimiento_filas', v, fromSeguimientoFilaInsert),
    update: async (id: string, u: Partial<SeguimientoFila>, cur: SeguimientoFila) => {
      const merged = { ...cur, ...u } as SeguimientoFila;
      const mapped = fromSeguimientoFila(merged);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_at: _ca, updated_at: _ua, ...fields } = mapped as Record<string, unknown>;
      void _id; void _ca; void _ua;
      // Upsert directo: garantiza que la fila existe (create or update)
      const { error } = await supabase
        .from('seguimiento_filas')
        .upsert({ id, ...fields }, { onConflict: 'id' })
        .select('id');
      if (error) throw error;
    },
    delete: (id: string) => dbDelete('seguimiento_filas', id),
    deleteByCorteId: async (corteId: string) => {
      const { error } = await supabase.from('seguimiento_filas').delete().eq('corte_id', safeInt(corteId));
      if (error) throw error;
    },
  },
  boletaLineas: {
    add: (v: BoletaLinea) => dbInsert('boleta_lineas', v, fromBoletaLineaInsert),
    update: (id: string, u: Partial<BoletaLinea>, cur: BoletaLinea) => dbUpdate('boleta_lineas', id, u, fromBoletaLinea, cur),
    delete: (id: string) => dbDelete('boleta_lineas', id),
    deleteByCorteId: async (corteId: string) => {
      const { error } = await supabase.from('boleta_lineas').delete().eq('corte_id', safeInt(corteId));
      if (error) throw error;
    },
  },
  descuentosBoleta: {
    add: (v: DescuentoBoleta) => dbInsert('descuentos_boleta', v, fromDescuento),
    update: (id: string, u: Partial<DescuentoBoleta>, cur: DescuentoBoleta) => dbUpdate('descuentos_boleta', id, u, fromDescuento, cur),
    delete: (id: string) => dbDelete('descuentos_boleta', id),
  },
  programasZurzam: {
    add: (v: ProgramaZurzam) => dbInsert('programas_zurzam', v, fromProgramaInsert),
    update: (id: string, u: Partial<ProgramaZurzam>, cur: ProgramaZurzam) => dbUpdate('programas_zurzam', id, u, fromPrograma, cur),
    delete: (id: string) => dbDelete('programas_zurzam', id),
  },
  programaDetalles: {
    add: (v: ProgramaDetalle) => dbInsert('programa_detalles', v, fromDetalleInsert),
    update: (id: string, u: Partial<ProgramaDetalle>, cur: ProgramaDetalle) => dbUpdate('programa_detalles', id, u, fromDetalle, cur),
    delete: (id: string) => dbDelete('programa_detalles', id),
  },
  comprasHilo: {
    add: (v: CompraHilo) => dbInsert('compras_hilo', v, fromCompraHiloInsert),
    update: (id: string, u: Partial<CompraHilo>, cur: CompraHilo) => dbUpdate('compras_hilo', id, u, fromCompraHilo, cur),
    delete: (id: string) => dbDelete('compras_hilo', id),
  },
  stockExtornos: {
    add: (v: StockExtorno) => dbInsert('stock_extornos', v, fromExtornoInsert),
    update: (id: string, u: Partial<StockExtorno>, cur: StockExtorno) => dbUpdate('stock_extornos', id, u, fromExtorno, cur),
    delete: (id: string) => dbDelete('stock_extornos', id),
  },
  cobrosDiarios: {
    add: (v: CobroDiario) => dbInsert('cobros_diarios', v, fromCobroInsert),
    update: (id: string, u: Partial<CobroDiario>, cur: CobroDiario) => dbUpdate('cobros_diarios', id, u, fromCobro, cur),
    delete: (id: string) => dbDelete('cobros_diarios', id),
  },
  movimientosComplemento: {
    add: (v: MovimientoComplemento) => dbInsert('movimientos_complemento', v, fromMovComplementoInsert),
    update: (id: string, u: Partial<MovimientoComplemento>, cur: MovimientoComplemento) => dbUpdate('movimientos_complemento', id, u, fromMovComplemento, cur),
    delete: (id: string) => dbDelete('movimientos_complemento', id),
  },
  productoColores: {
    add: (v: ProductoColor) => dbInsert('producto_colores', v, (x: ProductoColor) => ({ producto_id: x.productoId, color_id: x.colorId, prop_s: x.propS, prop_m: x.propM, prop_l: x.propL, prop_xl: x.propXL })),
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

// ─── Recarga ligera de producto_colores ──────────────────────────────────────
export async function loadProductoColores(): Promise<ProductoColor[]> {
  const { data, error } = await supabase
    .from('producto_colores')
    .select('id,producto_id,color_id,prop_s,prop_m,prop_l,prop_xl');
  if (error || !data) return [];
  return (data as any[]).map(toProductoColor);
}

// ─── Importar proporciones desde CSV de Google Sheets ────────────────────────
// Lee el CSV público, cruza producto+color por nombre normalizado y hace upsert
// en producto_colores. Retorna un resumen: { ok, skipped, errors[] }
export async function importarProporcioesCSV(csvUrl: string): Promise<{
  ok: number; skipped: number; errors: string[];
}> {
  const normalizar = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  // 1. Descargar CSV
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`No se pudo descargar el CSV: ${res.status}`);
  const text = await res.text();

  // 2. Parsear filas (saltar primeras 4 filas de encabezado)
  const lineas = text.split('\n').map(l => l.trim()).filter(Boolean);
  // Fila 4 (índice 3) es el header real: N° CORTE,FECHA,CLIENTE,PRODUCTO,COLOR,...,S,M,L,XL,...
  const headerIdx = lineas.findIndex(l => l.startsWith('N° CORTE') || l.startsWith('N° CORTE'));
  if (headerIdx === -1) throw new Error('No se encontró el encabezado del CSV');

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur);
    return result;
  };

  const headers = parseCSVLine(lineas[headerIdx]).map(h => normalizar(h));
  const iProducto = headers.indexOf(normalizar('PRODUCTO'));
  const iColor    = headers.indexOf(normalizar('COLOR'));
  const iPropS    = headers.indexOf(normalizar('S'));
  const iPropM    = headers.indexOf(normalizar('M'));
  const iPropL    = headers.indexOf(normalizar('L'));
  const iPropXL   = headers.indexOf(normalizar('XL'));

  if ([iProducto, iColor, iPropS, iPropM, iPropL, iPropXL].includes(-1)) {
    throw new Error('El CSV no tiene las columnas esperadas (PRODUCTO, COLOR, S, M, L, XL)');
  }

  const filas = lineas.slice(headerIdx + 1)
    .map(l => parseCSVLine(l))
    .filter(cols => cols[iProducto]?.trim() && cols[iColor]?.trim());

  // 3. Cargar productos y colores actuales de Supabase
  const [{ data: prods }, { data: cols }] = await Promise.all([
    supabase.from('productos').select('id, nombre'),
    supabase.from('colores').select('id, nombre'),
  ]);
  if (!prods || !cols) throw new Error('No se pudieron cargar productos/colores de Supabase');

  const prodMap = new Map(prods.map((p: { id: number; nombre: string }) => [normalizar(p.nombre), String(p.id)]));

  // colorMap exacto: "negro 1" → id
  const colorMap = new Map(cols.map((c: { id: number; nombre: string }) => [normalizar(c.nombre), String(c.id)]));
  // colorBaseMap: agrupa por nombre base sin número: "negro" → [id1, id2, ...]
  // Sirve cuando el CSV dice "Negro" pero en BD están "Negro 1", "Negro 2", etc.
  const colorBaseMap = new Map<string, string[]>();
  for (const c of cols as { id: number; nombre: string }[]) {
    const norm = normalizar(c.nombre);
    const m = norm.match(/^(.+?)\s+\d+$/);
    const base = m ? m[1] : norm;
    if (!colorBaseMap.has(base)) colorBaseMap.set(base, []);
    colorBaseMap.get(base)!.push(String(c.id));
  }

  // 4. Construir registros únicos por producto+color (última fila gana si hay duplicados)
  const parseNum = (s: string) => {
    const cleaned = s.replace(',', '.').replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };
  const registros = new Map<string, { productoId: string; colorId: string; propS: number; propM: number; propL: number; propXL: number }>();
  const errors: string[] = [];

  for (const cols_ of filas) {
    const prodNombre = cols_[iProducto]?.trim() ?? '';
    const colorNombre = cols_[iColor]?.trim() ?? '';
    const prodId = prodMap.get(normalizar(prodNombre));
    if (!prodId) { errors.push(`Producto no encontrado: "${prodNombre}"`); continue; }

    const normColor = normalizar(colorNombre);
    const propS  = parseNum(cols_[iPropS]  ?? '');
    const propM  = parseNum(cols_[iPropM]  ?? '');
    const propL  = parseNum(cols_[iPropL]  ?? '');
    const propXL = parseNum(cols_[iPropXL] ?? '');

    // Buscar coincidencia exacta primero
    const exactId = colorMap.get(normColor);
    if (exactId) {
      registros.set(`${prodId}|${exactId}`, { productoId: prodId, colorId: exactId, propS, propM, propL, propXL });
      continue;
    }

    // Fallback: el CSV dice "Negro" (sin número) → aplicar a todos los "Negro N" de la BD
    const idsBase = colorBaseMap.get(normColor) ?? [];
    if (idsBase.length > 0) {
      for (const colorId of idsBase) {
        // Solo escribir si no hay ya un registro más específico para ese colorId
        const key = `${prodId}|${colorId}`;
        if (!registros.has(key)) {
          registros.set(key, { productoId: prodId, colorId, propS, propM, propL, propXL });
        }
      }
      continue;
    }

    errors.push(`Color no encontrado: "${colorNombre}"`);
  }

  // 5. Upsert en lotes de 50
  const rows = [...registros.values()].map(r => ({
    producto_id: parseInt(r.productoId), color_id: parseInt(r.colorId),
    prop_s: r.propS, prop_m: r.propM, prop_l: r.propL, prop_xl: r.propXL,
  }));

  let ok = 0, skipped = 0;
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('producto_colores')
      .upsert(batch, { onConflict: 'producto_id,color_id', ignoreDuplicates: false });
    if (error) { errors.push(`Batch ${i / BATCH + 1}: ${error.message}`); skipped += batch.length; }
    else ok += batch.length;
  }

  // Deduplicar errores de "no encontrado"
  const erroresUnicos = [...new Set(errors)];
  return { ok, skipped, errors: erroresUnicos };
}
