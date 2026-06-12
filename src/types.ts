// ─── Catálogos Maestros ────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  nombre: string;
  contacto: string;
  notas: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  ruc: string;
  contacto: string;
  tipo: 'TELA' | 'COMPLEMENTO' | 'HILO' | 'SERVICIO' | 'ZURZAM';
}

export type CategoriaColor = 'OSCURO' | 'CLARO' | 'MELANGE' | 'PPT';

export interface Tela {
  id: string;
  nombre: string;
  composicion: string;
  kgPorRollo: number; // default 20
  notas: string;
}

export interface Color {
  id: string;
  nombre: string;
  categoria: CategoriaColor;
  prioridad: number;
  notas: string;
}

export interface PrecioTela {
  id: string;
  telaId: string;
  categoriaColor: CategoriaColor;
  precioKg: number;
}

export interface PrecioTejeduria {
  id: string;
  tipoTejido: string;   // Ej: "Jersey 24/1", "Rib 1x1", "Interlock"
  precioKg: number;
}

export interface PrecioTintoreria {
  id: string;
  tipoServicio: TipoServicioTint;  // REACTIVO | DIRECTO | PPT | LAVADO | TERMOFIJADO | COMPACTADO_EN_RAMA
  tipoTela: string;                // nombre libre: "Jersey", "Wafle", "Pique", etc.
  precioKg: number;
  moneda: 'PEN' | 'USD';
  notas: string;
}

export interface PrecioComplemento {
  id: string;
  clave: string; // TIPO_ORIGEN composite key
  tipo: string;  // CUELLO, PUÑO, PRETINA
  origen: string; // COMPRA, CORTE_INTERNO
  talla: 'S' | 'M' | 'L' | 'XL';
  precio: number;
}

export interface RecetaComplemento {
  tipoComplemento: TipoComplemento;
  origen: string;        // COMPRA | CORTE_INTERNO
  cantidad: number;      // unidades por prenda (ej: 1 cuello, 2 puños)
  notas: string;
}

export interface Producto {
  id: string;
  nombre: string;
  costoMoTotal: number; // suma de tarifas de operaciones (S/./prenda)
  precioServicio: number; // precio cobrado al cliente por prenda
  telaId?: string;             // FK a Tela.id — auto-relleno en cortes
  telaBase?: string;           // nombre libre (legacy/fallback)
  limiteConsumo?: number;      // kg/prenda máximo permitido
  limiteRendimiento?: number;  // prendas/kg mínimo permitido
  propS?: number;
  propM?: number;
  propL?: number;
  propXL?: number;
  marca?: string;
  recetaComplementos?: RecetaComplemento[];
  notas: string;
}

export interface ProductoColor {
  id: string;
  productoId: string;
  colorId: string;
  propS: number;
  propM: number;
  propL: number;
  propXL: number;
}

export interface TarifaOperacion {
  id: string;
  productoId: string;
  orden: number;
  operacion: string;
  tarifa: number;
  notas: string;
  clave: string; // formato: "producto_nombre|orden"
}

export interface Operario {
  id: string;
  codigo: string; // OP001..OP024
  nombre: string; // nombres y apellidos combinados
  estado: 'ACTIVO' | 'INACTIVO';
  dni?: string;
  telefono?: string;
  modulo?: string;
  maquina?: string;
  fechaIngreso?: string;
}

// ─── Inventario ────────────────────────────────────────────────────────────

export type TipoMovimientoTela =
  | 'INGRESO'
  | 'A_CORTE'
  | 'A_REPROCESO'
  | 'DE_REPROCESO'
  | 'MUESTRA'
  | 'AJUSTE_POS'
  | 'AJUSTE_NEG';

export interface MovimientoTela {
  id: string;
  fecha: string;
  tipo: TipoMovimientoTela;
  clienteId: string;
  telaId: string;
  colorId: string;
  rollos: number;
  kgTotal: number;
  categoriaColor: CategoriaColor;
  precioKg: number;
  totalSoles: number;
  stockRollosAntes: number;
  stockRollosDespues: number;
  responsable: string;
  proveedorId?: string;
  nFactura?: string;
  costoRealFact?: number;
  corteId?: string;
  nCorte?: string;
  notas: string;
}

// ─── Cortes ────────────────────────────────────────────────────────────────

export interface CorteColorDetalle {
  colorId: string;
  tonalidad?: string;
  kgUsados: number;
  rollosUsados: number;
  tendidas: number;
  propS: number; propM: number; propL: number; propXL: number;
  cantS: number; cantM: number; cantL: number; cantXL: number;
  totalPrendas: number;
}

export interface Corte {
  id: string;
  nCorte: string;
  fecha: string;
  clienteId: string;
  productoId: string;
  colorId: string;           // color principal (primer color, o el único)
  tonalidad?: string;        // tonalidad del color principal
  coloresDetalle?: CorteColorDetalle[]; // todos los colores del corte (incluye el principal)
  telaId?: string; // referencia a Tela.id para descuento automático de inventario
  cortador: string; // nombre libre, no referencia Operario.id
  ayudante: string;
  tendedor: string;
  kgUsados: number;
  rollosUsados: number;
  tendidas: number;
  mtsPorTendida: number;
  ancho: number;
  cantS: number;
  cantM: number;
  cantL: number;
  cantXL: number;
  totalPrendas: number; // auto = cantS+cantM+cantL+cantXL
  consumo: number;      // auto = kgUsados / totalPrendas
  rendimiento: number;  // auto = totalPrendas / rollosUsados
  revision: 'VERIFICADO' | 'PENDIENTE';
  traslado: boolean;
  estado: 'EN_PROCESO' | 'COMPLETADO' | 'ANULADO';
  pagoCliente: 'PENDIENTE' | 'COBRADO';
  pagoPlanilla: 'PENDIENTE' | 'PAGADO';
  costoMoCorte: number; // calculado desde tarifas × total prendas
  notas: string;
}

// ─── Seguimiento Producción ────────────────────────────────────────────────

export interface SeguimientoAsignacion {
  tarifaId: string;
  operacion: string;
  orden: number;
  operarioId: string;        // primer operario (retrocompatible)
  operarioIds?: string[];    // todos los operarios; si hay >1 se divide en partes iguales
  pago: number;              // pago total de la operación (suma de todos los operarios)
  confirmado?: boolean;
}

export interface SeguimientoFila {
  id: string;
  corteId: string;
  nCorte: string;
  productoId: string;
  fecha: string;
  colorId: string;
  talla: 'S' | 'M' | 'L' | 'XL';
  cantidad: number;
  asignaciones: SeguimientoAsignacion[];
  pctAvance: number; // 0..100
  estado: string;
  totalPago: number;
}

// ─── Destajo ───────────────────────────────────────────────────────────────

export interface BoletaLinea {
  id: string;
  operarioId: string;
  corteId: string;
  nCorte: string;
  productoId: string;
  colorId?: string;
  talla?: 'S' | 'M' | 'L' | 'XL';
  tarifaId: string;
  operacion: string;
  orden: number;
  tarifa: number;
  cantPrendas: number;
  importe: number; // cantPrendas × tarifa
  periodo: string; // YYYY-MM
  fechaRegistro?: string; // YYYY-MM-DD — fecha en que se registró la operación
  estadoPago: 'PENDIENTE' | 'PAGADO';
  fechaPago?: string;
}

// ─── Programas Zurzam ──────────────────────────────────────────────────────

export type EstadoPrograma =
  | 'NUEVO'
  | 'EN_COMPRA'
  | 'EN_TEJEDURIA'
  | 'EN_TINTORERIA'
  | 'EN_PLANTA'
  | 'CERRADO';

export type TipoServicioTint =
  | 'REACTIVO'
  | 'DIRECTO'
  | 'PPT'
  | 'LAVADO'
  | 'TERMOFIJADO'
  | 'COMPACTADO_EN_RAMA';

export type EstadoPago = 'PAGADO' | 'PENDIENTE' | 'PARCIAL' | 'ANULADO';

export interface ProgramaZurzam {
  id: string;
  nombre: string;
  fecha: string;
  clienteId: string;
  rollosObjetivo: number;
  kgObjetivo: number;
  estado: EstadoPrograma;
  comisionJose: number;
  estadoPagoComision: 'PENDIENTE' | 'PAGADO';
  diasEntrega: number;
  notas: string;
}

export interface ProgramaDetalle {
  id: string;
  programaId: string;
  colorId: string;
  categoriaColor: CategoriaColor;
  tipoServicio: TipoServicioTint;
  prioridad: 'URGENTE' | 'ALTA' | 'MEDIA' | 'OPCIONAL';
  kgTejEnviado: number;
  kgTejRetornado: number;
  precioKgTej: number;
  monedaTej: 'PEN' | 'USD';
  tcTej: number;
  costoTejido: number;
  estadoPagoTej: EstadoPago;
  kgTintEnviado: number;
  kgTintRetornado: number;
  rollosFinal: number;
  precioKgTint: number;
  monedaTint: 'PEN' | 'USD';
  tcTint: number;
  costoTint: number;
  estadoPagoTint: EstadoPago;
  costoHiloProrrateado: number;
  costoTotalColor: number;
  notas: string;
}

export interface CompraHilo {
  id: string;
  fecha: string;
  programaId: string;
  tipoHilo: string;
  kgAsignados: number;
  precioKg: number;
  moneda: 'PEN' | 'USD';
  tipoCambio: number;
  totalSoles: number;
  proveedorId: string;
  nFactura: string;
  costoRealFact: number;
  diferencia: number;
  estadoPago: EstadoPago;
  fechaPago?: string;
  montoPagado: number;
  saldo: number;
  notas: string;
}

// ─── Cobros ────────────────────────────────────────────────────────────────

export interface CobroDiario {
  id: string;
  fecha: string;
  nCorte: string;
  nFactura: string;
  clienteId: string;
  productoId: string;
  colorId: string;
  cantS: number;
  cantM: number;
  cantL: number;
  cantXL: number;
  totalPrendas: number;    // auto
  precioUnitario: number;  // desde Producto.precioServicio
  bruto: number;           // auto = totalPrendas × precioUnitario
  detraccion10Pct: number; // auto = bruto × 0.10
  disponible90Pct: number; // auto = bruto × 0.90
  estado: 'PENDIENTE' | 'COBRADO' | 'ANULADO';
  notas: string;
  fechaCobro?: string;
}

// ─── Configuración ────────────────────────────────────────────────────────

export interface Config {
  umbralCritico: number;    // rollos — alerta roja
  umbralBajo: number;       // rollos — alerta amarilla
  mermaPct: number;         // % merma (15%)
  detraccionPct: number;    // 10%
  igvPct: number;           // 18%
  incluirIgv: boolean;      // false — IGV no aplicado actualmente
  tipoCambioUsd: number;
  kgPorRolloDefault: number; // 20
  comisionJoseKg: number;
  mermaMaxTej: number;       // % máximo merma tejeduría antes de alerta (default 5)
  mermaMaxTint: number;      // % máximo merma tintorería antes de alerta (default 3)
  tiposComplemento?: string[];
}

// ─── Stock Extorno (conos hilo sobrantes devueltos por tejeduría) ──────────

export interface StockExtorno {
  id: string;
  programaId: string;
  programaDetalleId?: string;
  fecha: string;
  kgConos: number;
  precioKgHilo: number;  // precio del hilo del programa para valorizar
  totalSoles: number;    // kgConos × precioKgHilo
  usado: boolean;        // true cuando se reutiliza en otro programa
  notas: string;
}

// ─── Descuentos de Boleta (por operario + período) ─────────────────────────

export type TipoDescuentoBoleta = 'ADELANTO' | 'CAFETÍN' | 'PRÉSTAMO' | 'FALTA' | 'OTRO';

export interface DescuentoBoleta {
  id: string;
  operarioId: string;
  periodo: string;   // YYYY-MM
  tipo: TipoDescuentoBoleta;
  monto: number;
  notas: string;
}

// ─── Complementos ─────────────────────────────────────────────────────────

export const TIPOS_COMPLEMENTO_LIST = ['CUELLO', 'PUÑO', 'PRETINA'] as const;
export type TipoComplemento = typeof TIPOS_COMPLEMENTO_LIST[number] | string;
export type TipoMovimientoComplemento = 'INGRESO' | 'CONSUMO' | 'AJUSTE_POS' | 'AJUSTE_NEG';

export interface MovimientoComplemento {
  id: string;
  fecha: string;
  tipo: TipoMovimientoComplemento;
  tipoComplemento: TipoComplemento;
  colorId: string;
  talla: 'S' | 'M' | 'L' | 'XL';
  cantidad: number;
  precioUnit: number;
  totalSoles: number;
  stockAntes: number;
  stockDespues: number;
  corteId?: string;
  nCorte?: string;
  productoDestinoId?: string;
  proveedorId?: string;
  nFactura?: string;
  responsable: string;
  notas: string;
}

// ─── Import/Export ────────────────────────────────────────────────────────

export interface TexajoImportPayload {
  clientes?: Cliente[];
  proveedores?: Proveedor[];
  telas?: Tela[];
  colores?: Color[];
  preciosTelas?: PrecioTela[];
  preciosComplementos?: PrecioComplemento[];
  productos?: Producto[];
  tarifasOperaciones?: TarifaOperacion[];
  operarios?: Operario[];
  movimientosTela?: MovimientoTela[];
  cortes?: Corte[];
  seguimientoFilas?: SeguimientoFila[];
  boletaLineas?: BoletaLinea[];
  descuentosBoleta?: DescuentoBoleta[];
  movimientosComplemento?: MovimientoComplemento[];
  programasZurzam?: ProgramaZurzam[];
  programaDetalles?: ProgramaDetalle[];
  comprasHilo?: CompraHilo[];
  stockExtornos?: StockExtorno[];
  cobrosDiarios?: CobroDiario[];
  preciosTejeduria?: PrecioTejeduria[];
  preciosTintoreria?: PrecioTintoreria[];
  config?: Partial<Config>;
}