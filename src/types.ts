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

export interface PrecioComplemento {
  id: string;
  clave: string; // TIPO_ORIGEN composite key
  tipo: string;  // CUELLO, PUÑO, PRETINA
  origen: string; // COMPRA, CORTE_INTERNO
  talla: 'S' | 'M' | 'L' | 'XL';
  precio: number;
}

export interface Producto {
  id: string;
  nombre: string;
  costoMoTotal: number; // suma de todas sus tarifas
  precioServicio: number; // precio cobrado al cliente por prenda
  notas: string;
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

export interface Corte {
  id: string;
  nCorte: string;
  fecha: string;
  clienteId: string;
  productoId: string;
  colorId: string;
  cortador: string; // nombre libre, no referencia Operario.id
  ayudante: string;
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
  operarioId: string;
  pago: number; // cantidad × tarifa
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
  tarifaId: string;
  operacion: string;
  orden: number;
  tarifa: number;
  cantPrendas: number;
  importe: number; // cantPrendas × tarifa
  periodo: string; // YYYY-MM
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
  programasZurzam?: ProgramaZurzam[];
  programaDetalles?: ProgramaDetalle[];
  comprasHilo?: CompraHilo[];
  cobrosDiarios?: CobroDiario[];
  config?: Partial<Config>;
}