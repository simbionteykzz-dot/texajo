import {
  Cliente, Proveedor, Tela, Color, PrecioTela, Producto,
  TarifaOperacion, Operario, Config,
  MovimientoTela, CobroDiario, ProgramaZurzam, CompraHilo,
  ProgramaDetalle, Corte, SeguimientoFila, BoletaLinea, PrecioComplemento,
  MovimientoComplemento
} from './types';

// ─── Clientes ─────────────────────────────────────────────────────────────
export const mockClientes: Cliente[] = [
  { id: 'CLI-OVERSHARK', nombre: 'OverShark',  contacto: '', notas: 'Cliente principal (~93% producción)' },
  { id: 'CLI-BRAVOS',    nombre: 'Bravos',      contacto: '', notas: 'Cliente secundario (~7% producción)' },
];

// ─── Proveedores ──────────────────────────────────────────────────────────
export const mockProveedores: Proveedor[] = [
  { id: 'PROV-001', nombre: 'Progreso',            ruc: '', contacto: '', tipo: 'TELA' },
  { id: 'PROV-002', nombre: 'Tejitex',             ruc: '', contacto: '', tipo: 'TELA' },
  { id: 'PROV-003', nombre: 'Textiles Sur',        ruc: '', contacto: '', tipo: 'TELA' },
  { id: 'PROV-004', nombre: 'Accesorios Textil',   ruc: '', contacto: '', tipo: 'COMPLEMENTO' },
  { id: 'PROV-ZUR-001', nombre: 'Zurzam Tejeduría 1', ruc: '', contacto: '', tipo: 'ZURZAM' },
  { id: 'PROV-ZUR-002', nombre: 'Zurzam Tintorería 1', ruc: '', contacto: '', tipo: 'ZURZAM' },
];

// ─── Telas ────────────────────────────────────────────────────────────────
export const mockTelas: Tela[] = [
  { id: 'TEL-JERSEY',    nombre: 'Jersey 30/1',        composicion: '100% Algodón',           kgPorRollo: 20, notas: 'Cobertura: 1.3 meses — URGENTE' },
  { id: 'TEL-JERSEY-24', nombre: 'Jersey 24/1',        composicion: '100% Algodón',           kgPorRollo: 20, notas: '' },
  { id: 'TEL-FT',        nombre: 'French Terry',       composicion: '100% Algodón',           kgPorRollo: 20, notas: '' },
  { id: 'TEL-FT-PIQUE',  nombre: 'French Terry Piqué', composicion: '100% Algodón',           kgPorRollo: 20, notas: '' },
  { id: 'TEL-WAFLE',     nombre: 'Wafle',              composicion: '100% Algodón',           kgPorRollo: 20, notas: '' },
  { id: 'TEL-BABY-TY',   nombre: 'Baby Terry',         composicion: '100% Algodón',           kgPorRollo: 20, notas: '' },
  { id: 'TEL-RIB',       nombre: 'Rib 1x1',              composicion: '95% Algodón 5% Elastano',    kgPorRollo: 15, notas: '' },
  { id: 'TEL-PIQUE',     nombre: 'Pique 30/1',           composicion: '100% Algodón',               kgPorRollo: 20, notas: '' },
  { id: 'TEL-RIB-2X1',   nombre: 'Rib 2x1 Lycrado',      composicion: '95% Algodón 5% Elastano',    kgPorRollo: 15, notas: '' },
  { id: 'TEL-JERSEY-FL', nombre: 'Jersey Full Lycra 30/1', composicion: '85% Algodón 15% Elastano', kgPorRollo: 20, notas: '' },
  { id: 'TEL-FT-24',     nombre: 'French Terry 24/1',    composicion: '100% Algodón',               kgPorRollo: 20, notas: '' },
];

// ─── Colores ──────────────────────────────────────────────────────────────
export const mockColores: Color[] = [
  // OSCURO
  { id: 'COL-NEGRO',       nombre: 'Negro',       categoria: 'OSCURO',  prioridad: 1,  notas: '' },
  { id: 'COL-AZUL',        nombre: 'Azul',        categoria: 'OSCURO',  prioridad: 4,  notas: '' },
  { id: 'COL-BOTELLA',     nombre: 'Botella',     categoria: 'OSCURO',  prioridad: 7,  notas: '' },
  { id: 'COL-VINO',        nombre: 'Vino',        categoria: 'OSCURO',  prioridad: 14, notas: '' },
  { id: 'COL-PLOMO',       nombre: 'Plomo',       categoria: 'OSCURO',  prioridad: 16, notas: '' },
  { id: 'COL-AZUL-MARINO', nombre: 'Azul Marino', categoria: 'OSCURO',  prioridad: 17, notas: '' },
  { id: 'COL-COLEGIAL',    nombre: 'Colegial',    categoria: 'OSCURO',  prioridad: 18, notas: '' },
  { id: 'COL-MARRON',      nombre: 'Marrón',      categoria: 'OSCURO',  prioridad: 19, notas: '' },
  { id: 'COL-ACERO',       nombre: 'Acero',       categoria: 'OSCURO',  prioridad: 20, notas: '' },
  { id: 'COL-HOJA',        nombre: 'Hoja',        categoria: 'OSCURO',  prioridad: 21, notas: '' },
  { id: 'COL-MARINO',      nombre: 'Marino',      categoria: 'OSCURO',  prioridad: 22, notas: '' },
  { id: 'COL-GUINDA',      nombre: 'Guinda',      categoria: 'OSCURO',  prioridad: 23, notas: '' },
  { id: 'COL-VINO-TINTO',  nombre: 'Vino Tinto',  categoria: 'OSCURO',  prioridad: 24, notas: '' },
  // CLARO
  { id: 'COL-PERLA-INV',   nombre: 'Perla',       categoria: 'CLARO',   prioridad: 2,  notas: '' },
  { id: 'COL-BLANCO',      nombre: 'Blanco',      categoria: 'CLARO',   prioridad: 3,  notas: '' },
  { id: 'COL-BEIGE',       nombre: 'Beige',       categoria: 'CLARO',   prioridad: 5,  notas: '' },
  { id: 'COL-PACAY',       nombre: 'Pacay',       categoria: 'CLARO',   prioridad: 8,  notas: '' },
  { id: 'COL-CEMENTO',     nombre: 'Cemento',     categoria: 'CLARO',   prioridad: 9,  notas: '' },
  { id: 'COL-CAMOTE',      nombre: 'Camote',      categoria: 'CLARO',   prioridad: 10, notas: '' },
  { id: 'COL-DENIM',       nombre: 'Denim',       categoria: 'CLARO',   prioridad: 11, notas: '' },
  { id: 'COL-TOPO',        nombre: 'Topo',        categoria: 'CLARO',   prioridad: 13, notas: '' },
  { id: 'COL-P-ROSA',      nombre: 'P. Rosa',     categoria: 'CLARO',   prioridad: 15, notas: '' },
  { id: 'COL-PALO-ROSA',   nombre: 'Palo Rosa',   categoria: 'CLARO',   prioridad: 25, notas: '' },
  { id: 'COL-ROSA',        nombre: 'Rosa',        categoria: 'CLARO',   prioridad: 26, notas: '' },
  { id: 'COL-ROSADO',      nombre: 'Rosado',      categoria: 'CLARO',   prioridad: 27, notas: '' },
  { id: 'COL-V-PACAY',     nombre: 'V. Pacay',    categoria: 'CLARO',   prioridad: 28, notas: '' },
  { id: 'COL-VERDE-HOJA',  nombre: 'Verde Hoja',  categoria: 'CLARO',   prioridad: 29, notas: '' },
  { id: 'COL-PUMICE',      nombre: 'Pumice',      categoria: 'CLARO',   prioridad: 30, notas: '' },
  // PPT
  { id: 'COL-PERLA-PPT',   nombre: 'Perla PPT',   categoria: 'PPT',     prioridad: 31, notas: '' },
  // MELANGE
  { id: 'COL-MELANGE',     nombre: 'Melange',     categoria: 'MELANGE', prioridad: 6,  notas: '' },
];

// ─── Precios de Tela (por tipo × categoría) ───────────────────────────────
export const mockPreciosTelas: PrecioTela[] = [
  // Jersey 30/1
  { id: 'P-JERSEY-OSC', telaId: 'TEL-JERSEY', categoriaColor: 'OSCURO',  precioKg: 24.00 },
  { id: 'P-JERSEY-CLA', telaId: 'TEL-JERSEY', categoriaColor: 'CLARO',   precioKg: 21.00 },
  { id: 'P-JERSEY-MEL', telaId: 'TEL-JERSEY', categoriaColor: 'MELANGE', precioKg: 19.00 },
  { id: 'P-JERSEY-PPT', telaId: 'TEL-JERSEY', categoriaColor: 'PPT',     precioKg: 18.00 },
  // Jersey 24/1
  { id: 'P-JERSEY24-OSC', telaId: 'TEL-JERSEY-24', categoriaColor: 'OSCURO',  precioKg: 23.00 },
  { id: 'P-JERSEY24-CLA', telaId: 'TEL-JERSEY-24', categoriaColor: 'CLARO',   precioKg: 20.00 },
  { id: 'P-JERSEY24-MEL', telaId: 'TEL-JERSEY-24', categoriaColor: 'MELANGE', precioKg: 18.50 },
  { id: 'P-JERSEY24-PPT', telaId: 'TEL-JERSEY-24', categoriaColor: 'PPT',     precioKg: 17.00 },
  // French Terry
  { id: 'P-FT-OSC', telaId: 'TEL-FT', categoriaColor: 'OSCURO',  precioKg: 28.00 },
  { id: 'P-FT-CLA', telaId: 'TEL-FT', categoriaColor: 'CLARO',   precioKg: 24.00 },
  { id: 'P-FT-MEL', telaId: 'TEL-FT', categoriaColor: 'MELANGE', precioKg: 22.00 },
  { id: 'P-FT-PPT', telaId: 'TEL-FT', categoriaColor: 'PPT',     precioKg: 20.00 },
  // French Terry Piqué
  { id: 'P-FTP-OSC', telaId: 'TEL-FT-PIQUE', categoriaColor: 'OSCURO',  precioKg: 29.00 },
  { id: 'P-FTP-CLA', telaId: 'TEL-FT-PIQUE', categoriaColor: 'CLARO',   precioKg: 25.00 },
  { id: 'P-FTP-MEL', telaId: 'TEL-FT-PIQUE', categoriaColor: 'MELANGE', precioKg: 23.00 },
  { id: 'P-FTP-PPT', telaId: 'TEL-FT-PIQUE', categoriaColor: 'PPT',     precioKg: 21.00 },
  // Wafle
  { id: 'P-WAFLE-OSC', telaId: 'TEL-WAFLE', categoriaColor: 'OSCURO',  precioKg: 26.00 },
  { id: 'P-WAFLE-CLA', telaId: 'TEL-WAFLE', categoriaColor: 'CLARO',   precioKg: 22.50 },
  { id: 'P-WAFLE-MEL', telaId: 'TEL-WAFLE', categoriaColor: 'MELANGE', precioKg: 21.00 },
  { id: 'P-WAFLE-PPT', telaId: 'TEL-WAFLE', categoriaColor: 'PPT',     precioKg: 19.00 },
  // Baby Terry
  { id: 'P-BABY-OSC', telaId: 'TEL-BABY-TY', categoriaColor: 'OSCURO',  precioKg: 25.00 },
  { id: 'P-BABY-CLA', telaId: 'TEL-BABY-TY', categoriaColor: 'CLARO',   precioKg: 22.00 },
  { id: 'P-BABY-MEL', telaId: 'TEL-BABY-TY', categoriaColor: 'MELANGE', precioKg: 20.00 },
  { id: 'P-BABY-PPT', telaId: 'TEL-BABY-TY', categoriaColor: 'PPT',     precioKg: 18.00 },
  // Rib 1x1
  { id: 'P-RIB-OSC', telaId: 'TEL-RIB', categoriaColor: 'OSCURO',  precioKg: 24.00 },
  { id: 'P-RIB-CLA', telaId: 'TEL-RIB', categoriaColor: 'CLARO',   precioKg: 21.00 },
  { id: 'P-RIB-MEL', telaId: 'TEL-RIB', categoriaColor: 'MELANGE', precioKg: 19.00 },
  { id: 'P-RIB-PPT', telaId: 'TEL-RIB', categoriaColor: 'PPT',     precioKg: 18.00 },
  // Pique 30/1
  { id: 'P-PIQUE-OSC', telaId: 'TEL-PIQUE', categoriaColor: 'OSCURO',  precioKg: 25.00 },
  { id: 'P-PIQUE-CLA', telaId: 'TEL-PIQUE', categoriaColor: 'CLARO',   precioKg: 22.00 },
  { id: 'P-PIQUE-MEL', telaId: 'TEL-PIQUE', categoriaColor: 'MELANGE', precioKg: 20.00 },
  { id: 'P-PIQUE-PPT', telaId: 'TEL-PIQUE', categoriaColor: 'PPT',     precioKg: 19.00 },
  // Rib 2x1 Lycrado
  { id: 'P-RIB2X1-OSC', telaId: 'TEL-RIB-2X1', categoriaColor: 'OSCURO',  precioKg: 26.00 },
  { id: 'P-RIB2X1-CLA', telaId: 'TEL-RIB-2X1', categoriaColor: 'CLARO',   precioKg: 23.00 },
  { id: 'P-RIB2X1-MEL', telaId: 'TEL-RIB-2X1', categoriaColor: 'MELANGE', precioKg: 21.00 },
  { id: 'P-RIB2X1-PPT', telaId: 'TEL-RIB-2X1', categoriaColor: 'PPT',     precioKg: 19.00 },
  // Jersey Full Lycra 30/1
  { id: 'P-JERSEYFL-OSC', telaId: 'TEL-JERSEY-FL', categoriaColor: 'OSCURO',  precioKg: 28.00 },
  { id: 'P-JERSEYFL-CLA', telaId: 'TEL-JERSEY-FL', categoriaColor: 'CLARO',   precioKg: 25.00 },
  { id: 'P-JERSEYFL-MEL', telaId: 'TEL-JERSEY-FL', categoriaColor: 'MELANGE', precioKg: 23.00 },
  { id: 'P-JERSEYFL-PPT', telaId: 'TEL-JERSEY-FL', categoriaColor: 'PPT',     precioKg: 21.00 },
  // French Terry 24/1
  { id: 'P-FT24-OSC', telaId: 'TEL-FT-24', categoriaColor: 'OSCURO',  precioKg: 27.00 },
  { id: 'P-FT24-CLA', telaId: 'TEL-FT-24', categoriaColor: 'CLARO',   precioKg: 23.00 },
  { id: 'P-FT24-MEL', telaId: 'TEL-FT-24', categoriaColor: 'MELANGE', precioKg: 21.00 },
  { id: 'P-FT24-PPT', telaId: 'TEL-FT-24', categoriaColor: 'PPT',     precioKg: 19.00 },
];

// ─── Precios Complementos ─────────────────────────────────────────────────
export const mockPreciosComplementos: PrecioComplemento[] = [
  { id: 'PC-001', clave: 'CUELLO_COMPRA',  tipo: 'CUELLO',  origen: 'COMPRA',  talla: 'S',  precio: 0.80 },
  { id: 'PC-002', clave: 'CUELLO_COMPRA',  tipo: 'CUELLO',  origen: 'COMPRA',  talla: 'M',  precio: 0.85 },
  { id: 'PC-003', clave: 'CUELLO_COMPRA',  tipo: 'CUELLO',  origen: 'COMPRA',  talla: 'L',  precio: 0.90 },
  { id: 'PC-004', clave: 'CUELLO_COMPRA',  tipo: 'CUELLO',  origen: 'COMPRA',  talla: 'XL', precio: 0.95 },
  { id: 'PC-005', clave: 'PUNO_COMPRA',    tipo: 'PUÑO',    origen: 'COMPRA',  talla: 'S',  precio: 0.50 },
  { id: 'PC-006', clave: 'PUNO_COMPRA',    tipo: 'PUÑO',    origen: 'COMPRA',  talla: 'M',  precio: 0.55 },
  { id: 'PC-007', clave: 'PUNO_COMPRA',    tipo: 'PUÑO',    origen: 'COMPRA',  talla: 'L',  precio: 0.60 },
];

// ─── Productos (19) ───────────────────────────────────────────────────────
export const mockProductos: Producto[] = [
  { id: 'PROD-BABY-TY-CINTA-MC', nombre: 'Baby Ty Cinta MC', costoMoTotal: 0.73, precioServicio: 1.70, notas: '' },
  { id: 'PROD-BABY-TY-CINTA-ML', nombre: 'Baby Ty Cinta ML', costoMoTotal: 0.78, precioServicio: 1.70, notas: '' },
  { id: 'PROD-BABY-TY-MC',       nombre: 'Baby Ty MC',       costoMoTotal: 0.90, precioServicio: 1.70, notas: '' },
  { id: 'PROD-BABY-TY-ML',       nombre: 'Baby Ty ML',       costoMoTotal: 0.95, precioServicio: 1.70, notas: '' },
  { id: 'PROD-BUZO-CAP-MC',      nombre: 'Buzo Capucha MC',  costoMoTotal: 2.50, precioServicio: 5.00, notas: '' },
  { id: 'PROD-BUZO-CAP-ML',      nombre: 'Buzo Capucha ML',  costoMoTotal: 2.70, precioServicio: 5.50, notas: '' },
  { id: 'PROD-CR-MC',            nombre: 'Cuello Redondo MC', costoMoTotal: 1.79, precioServicio: 3.50, notas: '' },
  { id: 'PROD-CR-ML',            nombre: 'Cuello Redondo ML', costoMoTotal: 1.90, precioServicio: 3.80, notas: '' },
  { id: 'PROD-CV-MC',            nombre: 'Cuello V MC',       costoMoTotal: 1.82, precioServicio: 3.60, notas: '' },
  { id: 'PROD-CV-ML',            nombre: 'Cuello V ML',       costoMoTotal: 1.95, precioServicio: 3.90, notas: '' },
  { id: 'PROD-PB-MC',            nombre: 'Polo Básico MC',    costoMoTotal: 0.95, precioServicio: 1.70, notas: '' },
  { id: 'PROD-PB-ML',            nombre: 'Polo Básico ML',    costoMoTotal: 1.00, precioServicio: 2.00, notas: '' },
  { id: 'PROD-PW-MC',            nombre: 'Polo Wafle MC',     costoMoTotal: 0.95, precioServicio: 1.70, notas: '' },
  { id: 'PROD-PW-ML',            nombre: 'Polo Wafle ML',     costoMoTotal: 1.00, precioServicio: 2.00, notas: '' },
  { id: 'PROD-SHORT',            nombre: 'Short Básico',      costoMoTotal: 1.05, precioServicio: 2.50, notas: '' },
  { id: 'PROD-JOGGER',           nombre: 'Jogger',            costoMoTotal: 1.80, precioServicio: 4.00, notas: '' },
  { id: 'PROD-BUZO-PNT',         nombre: 'Buzo Pantalón',     costoMoTotal: 1.60, precioServicio: 3.50, notas: '' },
  { id: 'PROD-CC-PIQUE',         nombre: 'Cuello Chino Piqué', costoMoTotal: 1.82, precioServicio: 4.00, notas: '' },
  { id: 'PROD-CC-WAFLE',         nombre: 'Cuello Chino Wafle', costoMoTotal: 1.82, precioServicio: 4.00, notas: 'Wafle camisa' },
  // Productos con tarifas reales ingresadas
  { id: 'PROD-JERSEY-MC',        nombre: 'Jersey Manga Corta',   costoMoTotal: 0.95, precioServicio: 1.70, notas: '' },
  { id: 'PROD-JERSEY-ML',        nombre: 'Jersey Manga Larga',   costoMoTotal: 1.00, precioServicio: 2.00, notas: '' },
  { id: 'PROD-WAFLE-CLASICO',    nombre: 'Wafle Clasico',        costoMoTotal: 0.95, precioServicio: 1.70, notas: '' },
  { id: 'PROD-WAFLE-ML',         nombre: 'Wafle Manga Larga',    costoMoTotal: 1.00, precioServicio: 2.00, notas: '' },
  { id: 'PROD-WAFLE-CAMISERO',   nombre: 'Wafle Camisero',       costoMoTotal: 1.96, precioServicio: 4.00, notas: '' },
  { id: 'PROD-PIQUE-CAMISERO',   nombre: 'Pique Camisero',       costoMoTotal: 1.96, precioServicio: 4.00, notas: '' },
  { id: 'PROD-TOP-CERO-RIB',     nombre: 'Top Cero Rib',         costoMoTotal: 0.56, precioServicio: 1.20, notas: '' },
  { id: 'PROD-TOP-MC-RIB',       nombre: 'Top MC Rib',           costoMoTotal: 0.72, precioServicio: 1.50, notas: '' },
  { id: 'PROD-TOP-ML-RIB',       nombre: 'Top ML Rib',           costoMoTotal: 0.77, precioServicio: 1.70, notas: '' },
  { id: 'PROD-BABY-TY-MC2',      nombre: 'Baby Ty MC',           costoMoTotal: 0.90, precioServicio: 1.70, notas: 'baby ty mc' },
  { id: 'PROD-BABY-TY-ML2',      nombre: 'Baby Ty ML',           costoMoTotal: 0.95, precioServicio: 1.70, notas: 'baby ty ml' },
  { id: 'PROD-BABY-TY-CINTA-MC2',nombre: 'Baby Ty Cinta MC',     costoMoTotal: 0.72, precioServicio: 1.70, notas: 'baby ty cinta mc' },
  { id: 'PROD-BABY-TY-CINTA-ML2',nombre: 'Baby Ty Cinta ML',     costoMoTotal: 0.77, precioServicio: 1.70, notas: 'baby ty cinta ml' },
  { id: 'PROD-POLERA-NERU',      nombre: 'Polera Neru',          costoMoTotal: 3.15, precioServicio: 6.00, notas: '' },
  { id: 'PROD-POLERAS-CR',       nombre: 'Poleras Cuello Redondo', costoMoTotal: 1.79, precioServicio: 3.50, notas: '' },
  { id: 'PROD-PIQUE-CC',         nombre: 'Pique Cuello Chino',   costoMoTotal: 1.82, precioServicio: 4.00, notas: '' },
  { id: 'PROD-WAFLE-CAMISA',     nombre: 'Wafle Camisa',         costoMoTotal: 3.35, precioServicio: 7.00, notas: '' },
  { id: 'PROD-CUELLO-CHINO-WAFLE', nombre: 'Cuello Chino Wafle', costoMoTotal: 1.82, precioServicio: 4.00, notas: 'cuello chino wafle' },
];

// ─── Tarifas de Operación ─────────────────────────────────────────────────
export const mockTarifasOperaciones: TarifaOperacion[] = [
  // Baby Ty Cinta MC
  { id: 'T-BTCMC-01', productoId: 'PROD-BABY-TY-CINTA-MC', orden: 1, operacion: 'Hombro 1',  tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta MC|1' },
  { id: 'T-BTCMC-02', productoId: 'PROD-BABY-TY-CINTA-MC', orden: 2, operacion: 'Cinta',      tarifa: 0.10, notas: '', clave: 'Baby Ty Cinta MC|2' },
  { id: 'T-BTCMC-03', productoId: 'PROD-BABY-TY-CINTA-MC', orden: 3, operacion: 'Hombro 2',  tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta MC|3' },
  { id: 'T-BTCMC-04', productoId: 'PROD-BABY-TY-CINTA-MC', orden: 4, operacion: 'Atraque',   tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta MC|4' },
  { id: 'T-BTCMC-05', productoId: 'PROD-BABY-TY-CINTA-MC', orden: 5, operacion: 'B. Manga',  tarifa: 0.08, notas: '', clave: 'Baby Ty Cinta MC|5' },
  { id: 'T-BTCMC-06', productoId: 'PROD-BABY-TY-CINTA-MC', orden: 6, operacion: 'Manga y C', tarifa: 0.30, notas: '', clave: 'Baby Ty Cinta MC|6' },
  { id: 'T-BTCMC-07', productoId: 'PROD-BABY-TY-CINTA-MC', orden: 7, operacion: 'Faldón',    tarifa: 0.10, notas: '', clave: 'Baby Ty Cinta MC|7' },

  // Baby Ty Cinta ML
  { id: 'T-BTCML-01', productoId: 'PROD-BABY-TY-CINTA-ML', orden: 1, operacion: 'Hombro 1',  tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta ML|1' },
  { id: 'T-BTCML-02', productoId: 'PROD-BABY-TY-CINTA-ML', orden: 2, operacion: 'Cinta',      tarifa: 0.10, notas: '', clave: 'Baby Ty Cinta ML|2' },
  { id: 'T-BTCML-03', productoId: 'PROD-BABY-TY-CINTA-ML', orden: 3, operacion: 'Hombro 2',  tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta ML|3' },
  { id: 'T-BTCML-04', productoId: 'PROD-BABY-TY-CINTA-ML', orden: 4, operacion: 'Atraque',   tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta ML|4' },
  { id: 'T-BTCML-05', productoId: 'PROD-BABY-TY-CINTA-ML', orden: 5, operacion: 'B. Manga',  tarifa: 0.08, notas: '', clave: 'Baby Ty Cinta ML|5' },
  { id: 'T-BTCML-06', productoId: 'PROD-BABY-TY-CINTA-ML', orden: 6, operacion: 'Manga y C', tarifa: 0.35, notas: '', clave: 'Baby Ty Cinta ML|6' },
  { id: 'T-BTCML-07', productoId: 'PROD-BABY-TY-CINTA-ML', orden: 7, operacion: 'Faldón',    tarifa: 0.10, notas: '', clave: 'Baby Ty Cinta ML|7' },

  // Baby Ty MC
  { id: 'T-BTMC-01', productoId: 'PROD-BABY-TY-MC', orden: 1, operacion: 'Hombro',    tarifa: 0.08, notas: '', clave: 'Baby Ty MC|1' },
  { id: 'T-BTMC-02', productoId: 'PROD-BABY-TY-MC', orden: 2, operacion: 'Cuello',    tarifa: 0.18, notas: '', clave: 'Baby Ty MC|2' },
  { id: 'T-BTMC-03', productoId: 'PROD-BABY-TY-MC', orden: 3, operacion: 'Despunte',  tarifa: 0.07, notas: '', clave: 'Baby Ty MC|3' },
  { id: 'T-BTMC-04', productoId: 'PROD-BABY-TY-MC', orden: 4, operacion: 'Tapeta',    tarifa: 0.10, notas: '', clave: 'Baby Ty MC|4' },
  { id: 'T-BTMC-05', productoId: 'PROD-BABY-TY-MC', orden: 5, operacion: 'B. Manga',  tarifa: 0.08, notas: '', clave: 'Baby Ty MC|5' },
  { id: 'T-BTMC-06', productoId: 'PROD-BABY-TY-MC', orden: 6, operacion: 'Manga y C', tarifa: 0.30, notas: '', clave: 'Baby Ty MC|6' },
  { id: 'T-BTMC-07', productoId: 'PROD-BABY-TY-MC', orden: 7, operacion: 'Faldón',    tarifa: 0.09, notas: '', clave: 'Baby Ty MC|7' },

  // Baby Ty ML
  { id: 'T-BTML-01', productoId: 'PROD-BABY-TY-ML', orden: 1, operacion: 'Hombro',    tarifa: 0.08, notas: '', clave: 'Baby Ty ML|1' },
  { id: 'T-BTML-02', productoId: 'PROD-BABY-TY-ML', orden: 2, operacion: 'Cuello',    tarifa: 0.18, notas: '', clave: 'Baby Ty ML|2' },
  { id: 'T-BTML-03', productoId: 'PROD-BABY-TY-ML', orden: 3, operacion: 'Despunte',  tarifa: 0.07, notas: '', clave: 'Baby Ty ML|3' },
  { id: 'T-BTML-04', productoId: 'PROD-BABY-TY-ML', orden: 4, operacion: 'Tapeta',    tarifa: 0.09, notas: '', clave: 'Baby Ty ML|4' },
  { id: 'T-BTML-05', productoId: 'PROD-BABY-TY-ML', orden: 5, operacion: 'B. Manga',  tarifa: 0.08, notas: '', clave: 'Baby Ty ML|5' },
  { id: 'T-BTML-06', productoId: 'PROD-BABY-TY-ML', orden: 6, operacion: 'Manga y C', tarifa: 0.35, notas: '', clave: 'Baby Ty ML|6' },
  { id: 'T-BTML-07', productoId: 'PROD-BABY-TY-ML', orden: 7, operacion: 'Faldón',    tarifa: 0.10, notas: '', clave: 'Baby Ty ML|7' },

  // Polo Básico MC
  { id: 'T-PBMC-01', productoId: 'PROD-PB-MC', orden: 1, operacion: 'Hombro',    tarifa: 0.10, notas: '', clave: 'Polo Básico MC|1' },
  { id: 'T-PBMC-02', productoId: 'PROD-PB-MC', orden: 2, operacion: 'Cuello',    tarifa: 0.15, notas: '', clave: 'Polo Básico MC|2' },
  { id: 'T-PBMC-03', productoId: 'PROD-PB-MC', orden: 3, operacion: 'Despunte',  tarifa: 0.08, notas: '', clave: 'Polo Básico MC|3' },
  { id: 'T-PBMC-04', productoId: 'PROD-PB-MC', orden: 4, operacion: 'Tapeta',    tarifa: 0.11, notas: '', clave: 'Polo Básico MC|4' },
  { id: 'T-PBMC-05', productoId: 'PROD-PB-MC', orden: 5, operacion: 'B. Manga',  tarifa: 0.10, notas: '', clave: 'Polo Básico MC|5' },
  { id: 'T-PBMC-06', productoId: 'PROD-PB-MC', orden: 6, operacion: 'Manga y C', tarifa: 0.30, notas: '', clave: 'Polo Básico MC|6' },
  { id: 'T-PBMC-07', productoId: 'PROD-PB-MC', orden: 7, operacion: 'Faldón',    tarifa: 0.11, notas: '', clave: 'Polo Básico MC|7' },

  // Polo Básico ML
  { id: 'T-PBML-01', productoId: 'PROD-PB-ML', orden: 1, operacion: 'Hombro',    tarifa: 0.10, notas: '', clave: 'Polo Básico ML|1' },
  { id: 'T-PBML-02', productoId: 'PROD-PB-ML', orden: 2, operacion: 'Cuello',    tarifa: 0.15, notas: '', clave: 'Polo Básico ML|2' },
  { id: 'T-PBML-03', productoId: 'PROD-PB-ML', orden: 3, operacion: 'Despunte',  tarifa: 0.08, notas: '', clave: 'Polo Básico ML|3' },
  { id: 'T-PBML-04', productoId: 'PROD-PB-ML', orden: 4, operacion: 'Tapeta',    tarifa: 0.11, notas: '', clave: 'Polo Básico ML|4' },
  { id: 'T-PBML-05', productoId: 'PROD-PB-ML', orden: 5, operacion: 'B. Manga',  tarifa: 0.10, notas: '', clave: 'Polo Básico ML|5' },
  { id: 'T-PBML-06', productoId: 'PROD-PB-ML', orden: 6, operacion: 'Manga y C', tarifa: 0.35, notas: '', clave: 'Polo Básico ML|6' },
  { id: 'T-PBML-07', productoId: 'PROD-PB-ML', orden: 7, operacion: 'Faldón',    tarifa: 0.11, notas: '', clave: 'Polo Básico ML|7' },

  // Polo Wafle MC
  { id: 'T-PWMC-01', productoId: 'PROD-PW-MC', orden: 1, operacion: 'Hombro',    tarifa: 0.10, notas: '', clave: 'Polo Wafle MC|1' },
  { id: 'T-PWMC-02', productoId: 'PROD-PW-MC', orden: 2, operacion: 'Cuello',    tarifa: 0.15, notas: '', clave: 'Polo Wafle MC|2' },
  { id: 'T-PWMC-03', productoId: 'PROD-PW-MC', orden: 3, operacion: 'Despunte',  tarifa: 0.08, notas: '', clave: 'Polo Wafle MC|3' },
  { id: 'T-PWMC-04', productoId: 'PROD-PW-MC', orden: 4, operacion: 'Tapeta',    tarifa: 0.11, notas: '', clave: 'Polo Wafle MC|4' },
  { id: 'T-PWMC-05', productoId: 'PROD-PW-MC', orden: 5, operacion: 'B. Manga',  tarifa: 0.10, notas: '', clave: 'Polo Wafle MC|5' },
  { id: 'T-PWMC-06', productoId: 'PROD-PW-MC', orden: 6, operacion: 'Manga y C', tarifa: 0.30, notas: '', clave: 'Polo Wafle MC|6' },
  { id: 'T-PWMC-07', productoId: 'PROD-PW-MC', orden: 7, operacion: 'Faldón',    tarifa: 0.11, notas: '', clave: 'Polo Wafle MC|7' },

  // Polo Wafle ML
  { id: 'T-PWML-01', productoId: 'PROD-PW-ML', orden: 1, operacion: 'Hombro',    tarifa: 0.10, notas: '', clave: 'Polo Wafle ML|1' },
  { id: 'T-PWML-02', productoId: 'PROD-PW-ML', orden: 2, operacion: 'Cuello',    tarifa: 0.15, notas: '', clave: 'Polo Wafle ML|2' },
  { id: 'T-PWML-03', productoId: 'PROD-PW-ML', orden: 3, operacion: 'Despunte',  tarifa: 0.08, notas: '', clave: 'Polo Wafle ML|3' },
  { id: 'T-PWML-04', productoId: 'PROD-PW-ML', orden: 4, operacion: 'Tapeta',    tarifa: 0.11, notas: '', clave: 'Polo Wafle ML|4' },
  { id: 'T-PWML-05', productoId: 'PROD-PW-ML', orden: 5, operacion: 'B. Manga',  tarifa: 0.10, notas: '', clave: 'Polo Wafle ML|5' },
  { id: 'T-PWML-06', productoId: 'PROD-PW-ML', orden: 6, operacion: 'Manga y C', tarifa: 0.35, notas: '', clave: 'Polo Wafle ML|6' },
  { id: 'T-PWML-07', productoId: 'PROD-PW-ML', orden: 7, operacion: 'Faldón',    tarifa: 0.11, notas: '', clave: 'Polo Wafle ML|7' },

  // Cuello Redondo MC
  { id: 'T-CRMC-01', productoId: 'PROD-CR-MC', orden: 1, operacion: 'Hombro',          tarifa: 0.10, notas: '', clave: 'Cuello Redondo MC|1' },
  { id: 'T-CRMC-02', productoId: 'PROD-CR-MC', orden: 2, operacion: 'Cuello',          tarifa: 0.15, notas: '', clave: 'Cuello Redondo MC|2' },
  { id: 'T-CRMC-03', productoId: 'PROD-CR-MC', orden: 3, operacion: 'Despunte',        tarifa: 0.08, notas: '', clave: 'Cuello Redondo MC|3' },
  { id: 'T-CRMC-04', productoId: 'PROD-CR-MC', orden: 4, operacion: 'Tapeta',          tarifa: 0.11, notas: '', clave: 'Cuello Redondo MC|4' },
  { id: 'T-CRMC-05', productoId: 'PROD-CR-MC', orden: 5, operacion: 'Manga y Cerrado', tarifa: 0.35, notas: '', clave: 'Cuello Redondo MC|5' },
  { id: 'T-CRMC-06', productoId: 'PROD-CR-MC', orden: 6, operacion: 'R.PyP',           tarifa: 0.60, notas: '', clave: 'Cuello Redondo MC|6' },
  { id: 'T-CRMC-07', productoId: 'PROD-CR-MC', orden: 7, operacion: 'D.PyP',           tarifa: 0.40, notas: '', clave: 'Cuello Redondo MC|7' },

  // Cuello Redondo ML
  { id: 'T-CRML-01', productoId: 'PROD-CR-ML', orden: 1, operacion: 'Hombro',          tarifa: 0.10, notas: '', clave: 'Cuello Redondo ML|1' },
  { id: 'T-CRML-02', productoId: 'PROD-CR-ML', orden: 2, operacion: 'Cuello',          tarifa: 0.15, notas: '', clave: 'Cuello Redondo ML|2' },
  { id: 'T-CRML-03', productoId: 'PROD-CR-ML', orden: 3, operacion: 'Despunte',        tarifa: 0.08, notas: '', clave: 'Cuello Redondo ML|3' },
  { id: 'T-CRML-04', productoId: 'PROD-CR-ML', orden: 4, operacion: 'Tapeta',          tarifa: 0.11, notas: '', clave: 'Cuello Redondo ML|4' },
  { id: 'T-CRML-05', productoId: 'PROD-CR-ML', orden: 5, operacion: 'Manga y Cerrado', tarifa: 0.40, notas: '', clave: 'Cuello Redondo ML|5' },
  { id: 'T-CRML-06', productoId: 'PROD-CR-ML', orden: 6, operacion: 'R.PyP',           tarifa: 0.60, notas: '', clave: 'Cuello Redondo ML|6' },
  { id: 'T-CRML-07', productoId: 'PROD-CR-ML', orden: 7, operacion: 'D.PyP',           tarifa: 0.40, notas: '', clave: 'Cuello Redondo ML|7' },

  // Cuello V MC
  { id: 'T-CVMC-01', productoId: 'PROD-CV-MC', orden: 1, operacion: 'Hombro',          tarifa: 0.10, notas: '', clave: 'Cuello V MC|1' },
  { id: 'T-CVMC-02', productoId: 'PROD-CV-MC', orden: 2, operacion: 'Cuello V',        tarifa: 0.20, notas: '', clave: 'Cuello V MC|2' },
  { id: 'T-CVMC-03', productoId: 'PROD-CV-MC', orden: 3, operacion: 'Despunte',        tarifa: 0.08, notas: '', clave: 'Cuello V MC|3' },
  { id: 'T-CVMC-04', productoId: 'PROD-CV-MC', orden: 4, operacion: 'Tapeta',          tarifa: 0.11, notas: '', clave: 'Cuello V MC|4' },
  { id: 'T-CVMC-05', productoId: 'PROD-CV-MC', orden: 5, operacion: 'Manga y Cerrado', tarifa: 0.33, notas: '', clave: 'Cuello V MC|5' },
  { id: 'T-CVMC-06', productoId: 'PROD-CV-MC', orden: 6, operacion: 'R.PyP',           tarifa: 0.60, notas: '', clave: 'Cuello V MC|6' },
  { id: 'T-CVMC-07', productoId: 'PROD-CV-MC', orden: 7, operacion: 'D.PyP',           tarifa: 0.40, notas: '', clave: 'Cuello V MC|7' },

  // Cuello V ML
  { id: 'T-CVML-01', productoId: 'PROD-CV-ML', orden: 1, operacion: 'Hombro',          tarifa: 0.10, notas: '', clave: 'Cuello V ML|1' },
  { id: 'T-CVML-02', productoId: 'PROD-CV-ML', orden: 2, operacion: 'Cuello V',        tarifa: 0.20, notas: '', clave: 'Cuello V ML|2' },
  { id: 'T-CVML-03', productoId: 'PROD-CV-ML', orden: 3, operacion: 'Despunte',        tarifa: 0.08, notas: '', clave: 'Cuello V ML|3' },
  { id: 'T-CVML-04', productoId: 'PROD-CV-ML', orden: 4, operacion: 'Tapeta',          tarifa: 0.11, notas: '', clave: 'Cuello V ML|4' },
  { id: 'T-CVML-05', productoId: 'PROD-CV-ML', orden: 5, operacion: 'Manga y Cerrado', tarifa: 0.38, notas: '', clave: 'Cuello V ML|5' },
  { id: 'T-CVML-06', productoId: 'PROD-CV-ML', orden: 6, operacion: 'R.PyP',           tarifa: 0.60, notas: '', clave: 'Cuello V ML|6' },
  { id: 'T-CVML-07', productoId: 'PROD-CV-ML', orden: 7, operacion: 'D.PyP',           tarifa: 0.40, notas: '', clave: 'Cuello V ML|7' },

  // Buzo Capucha MC
  { id: 'T-BCMC-01', productoId: 'PROD-BUZO-CAP-MC', orden: 1, operacion: 'Hombro',     tarifa: 0.10, notas: '', clave: 'Buzo Capucha MC|1' },
  { id: 'T-BCMC-02', productoId: 'PROD-BUZO-CAP-MC', orden: 2, operacion: 'Capucha',    tarifa: 0.50, notas: '', clave: 'Buzo Capucha MC|2' },
  { id: 'T-BCMC-03', productoId: 'PROD-BUZO-CAP-MC', orden: 3, operacion: 'Bolsillos',  tarifa: 0.40, notas: '', clave: 'Buzo Capucha MC|3' },
  { id: 'T-BCMC-04', productoId: 'PROD-BUZO-CAP-MC', orden: 4, operacion: 'Puños',      tarifa: 0.20, notas: '', clave: 'Buzo Capucha MC|4' },
  { id: 'T-BCMC-05', productoId: 'PROD-BUZO-CAP-MC', orden: 5, operacion: 'Manga y C',  tarifa: 0.50, notas: '', clave: 'Buzo Capucha MC|5' },
  { id: 'T-BCMC-06', productoId: 'PROD-BUZO-CAP-MC', orden: 6, operacion: 'Pretina',    tarifa: 0.40, notas: '', clave: 'Buzo Capucha MC|6' },
  { id: 'T-BCMC-07', productoId: 'PROD-BUZO-CAP-MC', orden: 7, operacion: 'Faldón',     tarifa: 0.40, notas: '', clave: 'Buzo Capucha MC|7' },

  // Buzo Capucha ML
  { id: 'T-BCML-01', productoId: 'PROD-BUZO-CAP-ML', orden: 1, operacion: 'Hombro',     tarifa: 0.10, notas: '', clave: 'Buzo Capucha ML|1' },
  { id: 'T-BCML-02', productoId: 'PROD-BUZO-CAP-ML', orden: 2, operacion: 'Capucha',    tarifa: 0.50, notas: '', clave: 'Buzo Capucha ML|2' },
  { id: 'T-BCML-03', productoId: 'PROD-BUZO-CAP-ML', orden: 3, operacion: 'Bolsillos',  tarifa: 0.40, notas: '', clave: 'Buzo Capucha ML|3' },
  { id: 'T-BCML-04', productoId: 'PROD-BUZO-CAP-ML', orden: 4, operacion: 'Puños',      tarifa: 0.20, notas: '', clave: 'Buzo Capucha ML|4' },
  { id: 'T-BCML-05', productoId: 'PROD-BUZO-CAP-ML', orden: 5, operacion: 'Manga y C',  tarifa: 0.60, notas: '', clave: 'Buzo Capucha ML|5' },
  { id: 'T-BCML-06', productoId: 'PROD-BUZO-CAP-ML', orden: 6, operacion: 'Pretina',    tarifa: 0.40, notas: '', clave: 'Buzo Capucha ML|6' },
  { id: 'T-BCML-07', productoId: 'PROD-BUZO-CAP-ML', orden: 7, operacion: 'Faldón',     tarifa: 0.40, notas: '', clave: 'Buzo Capucha ML|7' },

  // Short Básico
  { id: 'T-SHORT-01', productoId: 'PROD-SHORT', orden: 1, operacion: 'Remalle piernas', tarifa: 0.15, notas: '', clave: 'Short Básico|1' },
  { id: 'T-SHORT-02', productoId: 'PROD-SHORT', orden: 2, operacion: 'Tiro delante',    tarifa: 0.20, notas: '', clave: 'Short Básico|2' },
  { id: 'T-SHORT-03', productoId: 'PROD-SHORT', orden: 3, operacion: 'Tiro trasero',    tarifa: 0.20, notas: '', clave: 'Short Básico|3' },
  { id: 'T-SHORT-04', productoId: 'PROD-SHORT', orden: 4, operacion: 'Pretina',         tarifa: 0.40, notas: '', clave: 'Short Básico|4' },
  { id: 'T-SHORT-05', productoId: 'PROD-SHORT', orden: 5, operacion: 'Basta piernas',   tarifa: 0.10, notas: '', clave: 'Short Básico|5' },

  // Jogger
  { id: 'T-JOG-01', productoId: 'PROD-JOGGER', orden: 1, operacion: 'Remalle piernas', tarifa: 0.15, notas: '', clave: 'Jogger|1' },
  { id: 'T-JOG-02', productoId: 'PROD-JOGGER', orden: 2, operacion: 'Tiro delante',    tarifa: 0.20, notas: '', clave: 'Jogger|2' },
  { id: 'T-JOG-03', productoId: 'PROD-JOGGER', orden: 3, operacion: 'Tiro trasero',    tarifa: 0.20, notas: '', clave: 'Jogger|3' },
  { id: 'T-JOG-04', productoId: 'PROD-JOGGER', orden: 4, operacion: 'Pretina',         tarifa: 0.40, notas: '', clave: 'Jogger|4' },
  { id: 'T-JOG-05', productoId: 'PROD-JOGGER', orden: 5, operacion: 'Puños',           tarifa: 0.20, notas: '', clave: 'Jogger|5' },
  { id: 'T-JOG-06', productoId: 'PROD-JOGGER', orden: 6, operacion: 'Basta/Cerrado',   tarifa: 0.65, notas: '', clave: 'Jogger|6' },

  // Buzo Pantalón
  { id: 'T-BPNT-01', productoId: 'PROD-BUZO-PNT', orden: 1, operacion: 'Remalle piernas', tarifa: 0.15, notas: '', clave: 'Buzo Pantalón|1' },
  { id: 'T-BPNT-02', productoId: 'PROD-BUZO-PNT', orden: 2, operacion: 'Tiro delante',    tarifa: 0.20, notas: '', clave: 'Buzo Pantalón|2' },
  { id: 'T-BPNT-03', productoId: 'PROD-BUZO-PNT', orden: 3, operacion: 'Tiro trasero',    tarifa: 0.20, notas: '', clave: 'Buzo Pantalón|3' },
  { id: 'T-BPNT-04', productoId: 'PROD-BUZO-PNT', orden: 4, operacion: 'Pretina',         tarifa: 0.40, notas: '', clave: 'Buzo Pantalón|4' },
  { id: 'T-BPNT-05', productoId: 'PROD-BUZO-PNT', orden: 5, operacion: 'Puños',           tarifa: 0.20, notas: '', clave: 'Buzo Pantalón|5' },
  { id: 'T-BPNT-06', productoId: 'PROD-BUZO-PNT', orden: 6, operacion: 'Basta/Cerrado',   tarifa: 0.45, notas: '', clave: 'Buzo Pantalón|6' },

  // Cuello Chino Piqué
  { id: 'T-CCPQ-01', productoId: 'PROD-CC-PIQUE', orden: 1,  operacion: 'Pegado Pechera 2pzas',   tarifa: 0.50, notas: '', clave: 'Cuello Chino Piqué|1' },
  { id: 'T-CCPQ-02', productoId: 'PROD-CC-PIQUE', orden: 2,  operacion: 'Orill pechera+remallé',  tarifa: 0.10, notas: '', clave: 'Cuello Chino Piqué|2' },
  { id: 'T-CCPQ-03', productoId: 'PROD-CC-PIQUE', orden: 3,  operacion: 'Despunte pechera',       tarifa: 0.10, notas: '', clave: 'Cuello Chino Piqué|3' },
  { id: 'T-CCPQ-04', productoId: 'PROD-CC-PIQUE', orden: 4,  operacion: 'Hombro',                 tarifa: 0.10, notas: '', clave: 'Cuello Chino Piqué|4' },
  { id: 'T-CCPQ-05', productoId: 'PROD-CC-PIQUE', orden: 5,  operacion: 'Cuello',                 tarifa: 0.25, notas: '', clave: 'Cuello Chino Piqué|5' },
  { id: 'T-CCPQ-06', productoId: 'PROD-CC-PIQUE', orden: 6,  operacion: 'Despunte cuello',        tarifa: 0.15, notas: '', clave: 'Cuello Chino Piqué|6' },
  { id: 'T-CCPQ-07', productoId: 'PROD-CC-PIQUE', orden: 7,  operacion: 'Pegado cinta tapeta',    tarifa: 0.11, notas: '', clave: 'Cuello Chino Piqué|7' },
  { id: 'T-CCPQ-08', productoId: 'PROD-CC-PIQUE', orden: 8,  operacion: 'Manga y cerrado',        tarifa: 0.30, notas: '', clave: 'Cuello Chino Piqué|8' },
  { id: 'T-CCPQ-09', productoId: 'PROD-CC-PIQUE', orden: 9,  operacion: 'Basta manga',            tarifa: 0.10, notas: '', clave: 'Cuello Chino Piqué|9' },
  { id: 'T-CCPQ-10', productoId: 'PROD-CC-PIQUE', orden: 10, operacion: 'Basta faldón',           tarifa: 0.11, notas: '', clave: 'Cuello Chino Piqué|10' },

  // Cuello Chino Wafle (legacy)
  { id: 'T-CCWF-01', productoId: 'PROD-CC-WAFLE', orden: 1,  operacion: 'Pegado Pechera 2pzas',   tarifa: 0.50, notas: '', clave: 'Cuello Chino Wafle|1' },
  { id: 'T-CCWF-02', productoId: 'PROD-CC-WAFLE', orden: 2,  operacion: 'Orill pechera+remallé',  tarifa: 0.10, notas: '', clave: 'Cuello Chino Wafle|2' },
  { id: 'T-CCWF-03', productoId: 'PROD-CC-WAFLE', orden: 3,  operacion: 'Despunte pechera',       tarifa: 0.10, notas: '', clave: 'Cuello Chino Wafle|3' },
  { id: 'T-CCWF-04', productoId: 'PROD-CC-WAFLE', orden: 4,  operacion: 'Hombro',                 tarifa: 0.10, notas: '', clave: 'Cuello Chino Wafle|4' },
  { id: 'T-CCWF-05', productoId: 'PROD-CC-WAFLE', orden: 5,  operacion: 'Cuello',                 tarifa: 0.25, notas: '', clave: 'Cuello Chino Wafle|5' },
  { id: 'T-CCWF-06', productoId: 'PROD-CC-WAFLE', orden: 6,  operacion: 'Despunte cuello',        tarifa: 0.15, notas: '', clave: 'Cuello Chino Wafle|6' },
  { id: 'T-CCWF-07', productoId: 'PROD-CC-WAFLE', orden: 7,  operacion: 'Pegado cinta tapeta',    tarifa: 0.11, notas: '', clave: 'Cuello Chino Wafle|7' },
  { id: 'T-CCWF-08', productoId: 'PROD-CC-WAFLE', orden: 8,  operacion: 'Manga y cerrado',        tarifa: 0.30, notas: '', clave: 'Cuello Chino Wafle|8' },
  { id: 'T-CCWF-09', productoId: 'PROD-CC-WAFLE', orden: 9,  operacion: 'Basta manga',            tarifa: 0.10, notas: '', clave: 'Cuello Chino Wafle|9' },
  { id: 'T-CCWF-10', productoId: 'PROD-CC-WAFLE', orden: 10, operacion: 'Basta faldón',           tarifa: 0.11, notas: '', clave: 'Cuello Chino Wafle|10' },

  // ── Tarifas reales ingresadas ────────────────────────────────────────────

  // Jersey Manga Corta
  { id: 'T-JMC-01', productoId: 'PROD-JERSEY-MC', orden: 1, operacion: 'Hombro',    tarifa: 0.10, notas: '', clave: 'Jersey Manga Corta|1' },
  { id: 'T-JMC-02', productoId: 'PROD-JERSEY-MC', orden: 2, operacion: 'Cuello',    tarifa: 0.15, notas: '', clave: 'Jersey Manga Corta|2' },
  { id: 'T-JMC-03', productoId: 'PROD-JERSEY-MC', orden: 3, operacion: 'Despunte',  tarifa: 0.08, notas: '', clave: 'Jersey Manga Corta|3' },
  { id: 'T-JMC-04', productoId: 'PROD-JERSEY-MC', orden: 4, operacion: 'Tapeta',    tarifa: 0.11, notas: '', clave: 'Jersey Manga Corta|4' },
  { id: 'T-JMC-05', productoId: 'PROD-JERSEY-MC', orden: 5, operacion: 'B. Manga',  tarifa: 0.10, notas: '', clave: 'Jersey Manga Corta|5' },
  { id: 'T-JMC-06', productoId: 'PROD-JERSEY-MC', orden: 6, operacion: 'Manga y CC',tarifa: 0.30, notas: '', clave: 'Jersey Manga Corta|6' },
  { id: 'T-JMC-07', productoId: 'PROD-JERSEY-MC', orden: 7, operacion: 'Faldón',    tarifa: 0.11, notas: '', clave: 'Jersey Manga Corta|7' },

  // Jersey Manga Larga
  { id: 'T-JML-01', productoId: 'PROD-JERSEY-ML', orden: 1, operacion: 'Hombro',    tarifa: 0.10, notas: '', clave: 'Jersey Manga Larga|1' },
  { id: 'T-JML-02', productoId: 'PROD-JERSEY-ML', orden: 2, operacion: 'Cuello',    tarifa: 0.15, notas: '', clave: 'Jersey Manga Larga|2' },
  { id: 'T-JML-03', productoId: 'PROD-JERSEY-ML', orden: 3, operacion: 'Despunte',  tarifa: 0.08, notas: '', clave: 'Jersey Manga Larga|3' },
  { id: 'T-JML-04', productoId: 'PROD-JERSEY-ML', orden: 4, operacion: 'Tapeta',    tarifa: 0.11, notas: '', clave: 'Jersey Manga Larga|4' },
  { id: 'T-JML-05', productoId: 'PROD-JERSEY-ML', orden: 5, operacion: 'B. Manga',  tarifa: 0.10, notas: '', clave: 'Jersey Manga Larga|5' },
  { id: 'T-JML-06', productoId: 'PROD-JERSEY-ML', orden: 6, operacion: 'Manga y CC',tarifa: 0.35, notas: '', clave: 'Jersey Manga Larga|6' },
  { id: 'T-JML-07', productoId: 'PROD-JERSEY-ML', orden: 7, operacion: 'Faldón',    tarifa: 0.11, notas: '', clave: 'Jersey Manga Larga|7' },

  // Wafle Clasico
  { id: 'T-WFC-01', productoId: 'PROD-WAFLE-CLASICO', orden: 1, operacion: 'Hombro',    tarifa: 0.10, notas: '', clave: 'Wafle Clasico|1' },
  { id: 'T-WFC-02', productoId: 'PROD-WAFLE-CLASICO', orden: 2, operacion: 'Cuello',    tarifa: 0.15, notas: '', clave: 'Wafle Clasico|2' },
  { id: 'T-WFC-03', productoId: 'PROD-WAFLE-CLASICO', orden: 3, operacion: 'Despunte',  tarifa: 0.08, notas: '', clave: 'Wafle Clasico|3' },
  { id: 'T-WFC-04', productoId: 'PROD-WAFLE-CLASICO', orden: 4, operacion: 'Tapeta',    tarifa: 0.11, notas: '', clave: 'Wafle Clasico|4' },
  { id: 'T-WFC-05', productoId: 'PROD-WAFLE-CLASICO', orden: 5, operacion: 'B. Manga',  tarifa: 0.10, notas: '', clave: 'Wafle Clasico|5' },
  { id: 'T-WFC-06', productoId: 'PROD-WAFLE-CLASICO', orden: 6, operacion: 'Manga y CC',tarifa: 0.30, notas: '', clave: 'Wafle Clasico|6' },
  { id: 'T-WFC-07', productoId: 'PROD-WAFLE-CLASICO', orden: 7, operacion: 'Faldón',    tarifa: 0.11, notas: '', clave: 'Wafle Clasico|7' },

  // Wafle Manga Larga
  { id: 'T-WFML-01', productoId: 'PROD-WAFLE-ML', orden: 1, operacion: 'Hombro',        tarifa: 0.10, notas: '', clave: 'Wafle Manga Larga|1' },
  { id: 'T-WFML-02', productoId: 'PROD-WAFLE-ML', orden: 2, operacion: 'Cuello',        tarifa: 0.15, notas: '', clave: 'Wafle Manga Larga|2' },
  { id: 'T-WFML-03', productoId: 'PROD-WAFLE-ML', orden: 3, operacion: 'Despunte',      tarifa: 0.08, notas: '', clave: 'Wafle Manga Larga|3' },
  { id: 'T-WFML-04', productoId: 'PROD-WAFLE-ML', orden: 4, operacion: 'Tapeta',        tarifa: 0.11, notas: '', clave: 'Wafle Manga Larga|4' },
  { id: 'T-WFML-05', productoId: 'PROD-WAFLE-ML', orden: 5, operacion: 'B. Manga',      tarifa: 0.10, notas: '', clave: 'Wafle Manga Larga|5' },
  { id: 'T-WFML-06', productoId: 'PROD-WAFLE-ML', orden: 6, operacion: 'Manga y Cerrado', tarifa: 0.35, notas: '', clave: 'Wafle Manga Larga|6' },
  { id: 'T-WFML-07', productoId: 'PROD-WAFLE-ML', orden: 7, operacion: 'Faldón',        tarifa: 0.11, notas: '', clave: 'Wafle Manga Larga|7' },

  // Wafle Camisero
  { id: 'T-WFCAM-01', productoId: 'PROD-WAFLE-CAMISERO', orden: 1, operacion: 'Bastillado de plaqueta', tarifa: 0.10, notas: '', clave: 'Wafle Camisero|1' },
  { id: 'T-WFCAM-02', productoId: 'PROD-WAFLE-CAMISERO', orden: 2, operacion: 'Pegado de plaqueta',     tarifa: 0.20, notas: '', clave: 'Wafle Camisero|2' },
  { id: 'T-WFCAM-03', productoId: 'PROD-WAFLE-CAMISERO', orden: 3, operacion: 'Hombro',                 tarifa: 0.10, notas: '', clave: 'Wafle Camisero|3' },
  { id: 'T-WFCAM-04', productoId: 'PROD-WAFLE-CAMISERO', orden: 4, operacion: 'Cuello',                 tarifa: 0.20, notas: '', clave: 'Wafle Camisero|4' },
  { id: 'T-WFCAM-05', productoId: 'PROD-WAFLE-CAMISERO', orden: 5, operacion: 'Pegado de cinta',        tarifa: 0.15, notas: '', clave: 'Wafle Camisero|5' },
  { id: 'T-WFCAM-06', productoId: 'PROD-WAFLE-CAMISERO', orden: 6, operacion: 'Tumbado',                tarifa: 0.60, notas: '', clave: 'Wafle Camisero|6' },
  { id: 'T-WFCAM-07', productoId: 'PROD-WAFLE-CAMISERO', orden: 7, operacion: 'Manga y cerrado',        tarifa: 0.50, notas: '', clave: 'Wafle Camisero|7' },
  { id: 'T-WFCAM-08', productoId: 'PROD-WAFLE-CAMISERO', orden: 8, operacion: 'Faldón',                 tarifa: 0.11, notas: '', clave: 'Wafle Camisero|8' },

  // Pique Camisero
  { id: 'T-PQCAM-01', productoId: 'PROD-PIQUE-CAMISERO', orden: 1, operacion: 'Bastillado de plaqueta', tarifa: 0.10, notas: '', clave: 'Pique Camisero|1' },
  { id: 'T-PQCAM-02', productoId: 'PROD-PIQUE-CAMISERO', orden: 2, operacion: 'Pegado de plaqueta',     tarifa: 0.20, notas: '', clave: 'Pique Camisero|2' },
  { id: 'T-PQCAM-03', productoId: 'PROD-PIQUE-CAMISERO', orden: 3, operacion: 'Hombro',                 tarifa: 0.10, notas: '', clave: 'Pique Camisero|3' },
  { id: 'T-PQCAM-04', productoId: 'PROD-PIQUE-CAMISERO', orden: 4, operacion: 'Cuello',                 tarifa: 0.20, notas: '', clave: 'Pique Camisero|4' },
  { id: 'T-PQCAM-05', productoId: 'PROD-PIQUE-CAMISERO', orden: 5, operacion: 'Pegado de cinta',        tarifa: 0.15, notas: '', clave: 'Pique Camisero|5' },
  { id: 'T-PQCAM-06', productoId: 'PROD-PIQUE-CAMISERO', orden: 6, operacion: 'Tumbado',                tarifa: 0.60, notas: '', clave: 'Pique Camisero|6' },
  { id: 'T-PQCAM-07', productoId: 'PROD-PIQUE-CAMISERO', orden: 7, operacion: 'Manga y cerrado',        tarifa: 0.50, notas: '', clave: 'Pique Camisero|7' },
  { id: 'T-PQCAM-08', productoId: 'PROD-PIQUE-CAMISERO', orden: 8, operacion: 'Faldón',                 tarifa: 0.11, notas: '', clave: 'Pique Camisero|8' },

  // Top Cero Rib
  { id: 'T-TCR-01', productoId: 'PROD-TOP-CERO-RIB', orden: 1, operacion: 'Hombro',  tarifa: 0.08, notas: '', clave: 'Top Cero Rib|1' },
  { id: 'T-TCR-02', productoId: 'PROD-TOP-CERO-RIB', orden: 2, operacion: 'Cinta',   tarifa: 0.20, notas: '', clave: 'Top Cero Rib|2' },
  { id: 'T-TCR-03', productoId: 'PROD-TOP-CERO-RIB', orden: 3, operacion: 'Atraque', tarifa: 0.05, notas: '', clave: 'Top Cero Rib|3' },
  { id: 'T-TCR-04', productoId: 'PROD-TOP-CERO-RIB', orden: 4, operacion: 'Cerrado', tarifa: 0.15, notas: '', clave: 'Top Cero Rib|4' },
  { id: 'T-TCR-05', productoId: 'PROD-TOP-CERO-RIB', orden: 5, operacion: 'Faldón',  tarifa: 0.08, notas: '', clave: 'Top Cero Rib|5' },

  // Top MC Rib
  { id: 'T-TMCR-01', productoId: 'PROD-TOP-MC-RIB', orden: 1, operacion: 'Hombro 1', tarifa: 0.05, notas: '', clave: 'Top MC Rib|1' },
  { id: 'T-TMCR-02', productoId: 'PROD-TOP-MC-RIB', orden: 2, operacion: 'Cinta',    tarifa: 0.10, notas: '', clave: 'Top MC Rib|2' },
  { id: 'T-TMCR-03', productoId: 'PROD-TOP-MC-RIB', orden: 3, operacion: 'Hombro 2', tarifa: 0.05, notas: '', clave: 'Top MC Rib|3' },
  { id: 'T-TMCR-04', productoId: 'PROD-TOP-MC-RIB', orden: 4, operacion: 'Atraque',  tarifa: 0.05, notas: '', clave: 'Top MC Rib|4' },
  { id: 'T-TMCR-05', productoId: 'PROD-TOP-MC-RIB', orden: 5, operacion: 'B. Manga', tarifa: 0.08, notas: '', clave: 'Top MC Rib|5' },
  { id: 'T-TMCR-06', productoId: 'PROD-TOP-MC-RIB', orden: 6, operacion: 'Manga y C',tarifa: 0.30, notas: '', clave: 'Top MC Rib|6' },
  { id: 'T-TMCR-07', productoId: 'PROD-TOP-MC-RIB', orden: 7, operacion: 'Faldón',   tarifa: 0.09, notas: '', clave: 'Top MC Rib|7' },

  // Top ML Rib
  { id: 'T-TMLR-01', productoId: 'PROD-TOP-ML-RIB', orden: 1, operacion: 'Hombro 1', tarifa: 0.05, notas: '', clave: 'Top ML Rib|1' },
  { id: 'T-TMLR-02', productoId: 'PROD-TOP-ML-RIB', orden: 2, operacion: 'Cinta',    tarifa: 0.10, notas: '', clave: 'Top ML Rib|2' },
  { id: 'T-TMLR-03', productoId: 'PROD-TOP-ML-RIB', orden: 3, operacion: 'Hombro 2', tarifa: 0.05, notas: '', clave: 'Top ML Rib|3' },
  { id: 'T-TMLR-04', productoId: 'PROD-TOP-ML-RIB', orden: 4, operacion: 'Atraque',  tarifa: 0.05, notas: '', clave: 'Top ML Rib|4' },
  { id: 'T-TMLR-05', productoId: 'PROD-TOP-ML-RIB', orden: 5, operacion: 'B. Manga', tarifa: 0.08, notas: '', clave: 'Top ML Rib|5' },
  { id: 'T-TMLR-06', productoId: 'PROD-TOP-ML-RIB', orden: 6, operacion: 'Manga y C',tarifa: 0.35, notas: '', clave: 'Top ML Rib|6' },
  { id: 'T-TMLR-07', productoId: 'PROD-TOP-ML-RIB', orden: 7, operacion: 'Faldón',   tarifa: 0.09, notas: '', clave: 'Top ML Rib|7' },

  // Baby Ty MC (tarifas reales)
  { id: 'T-BTMC2-01', productoId: 'PROD-BABY-TY-MC2', orden: 1, operacion: 'Hombro',    tarifa: 0.08, notas: '', clave: 'Baby Ty MC|1' },
  { id: 'T-BTMC2-02', productoId: 'PROD-BABY-TY-MC2', orden: 2, operacion: 'Cuello',    tarifa: 0.18, notas: '', clave: 'Baby Ty MC|2' },
  { id: 'T-BTMC2-03', productoId: 'PROD-BABY-TY-MC2', orden: 3, operacion: 'Despunte',  tarifa: 0.07, notas: '', clave: 'Baby Ty MC|3' },
  { id: 'T-BTMC2-04', productoId: 'PROD-BABY-TY-MC2', orden: 4, operacion: 'Tapeta',    tarifa: 0.09, notas: '', clave: 'Baby Ty MC|4' },
  { id: 'T-BTMC2-05', productoId: 'PROD-BABY-TY-MC2', orden: 5, operacion: 'B. Manga',  tarifa: 0.08, notas: '', clave: 'Baby Ty MC|5' },
  { id: 'T-BTMC2-06', productoId: 'PROD-BABY-TY-MC2', orden: 6, operacion: 'Manga y C', tarifa: 0.30, notas: '', clave: 'Baby Ty MC|6' },
  { id: 'T-BTMC2-07', productoId: 'PROD-BABY-TY-MC2', orden: 7, operacion: 'Faldón',    tarifa: 0.10, notas: '', clave: 'Baby Ty MC|7' },

  // Baby Ty ML (tarifas reales)
  { id: 'T-BTML2-01', productoId: 'PROD-BABY-TY-ML2', orden: 1, operacion: 'Hombro',    tarifa: 0.08, notas: '', clave: 'Baby Ty ML|1' },
  { id: 'T-BTML2-02', productoId: 'PROD-BABY-TY-ML2', orden: 2, operacion: 'Cuello',    tarifa: 0.18, notas: '', clave: 'Baby Ty ML|2' },
  { id: 'T-BTML2-03', productoId: 'PROD-BABY-TY-ML2', orden: 3, operacion: 'Despunte',  tarifa: 0.07, notas: '', clave: 'Baby Ty ML|3' },
  { id: 'T-BTML2-04', productoId: 'PROD-BABY-TY-ML2', orden: 4, operacion: 'Tapeta',    tarifa: 0.09, notas: '', clave: 'Baby Ty ML|4' },
  { id: 'T-BTML2-05', productoId: 'PROD-BABY-TY-ML2', orden: 5, operacion: 'B. Manga',  tarifa: 0.08, notas: '', clave: 'Baby Ty ML|5' },
  { id: 'T-BTML2-06', productoId: 'PROD-BABY-TY-ML2', orden: 6, operacion: 'Manga y C', tarifa: 0.35, notas: '', clave: 'Baby Ty ML|6' },
  { id: 'T-BTML2-07', productoId: 'PROD-BABY-TY-ML2', orden: 7, operacion: 'Faldón',    tarifa: 0.10, notas: '', clave: 'Baby Ty ML|7' },

  // Baby Ty Cinta MC (tarifas reales)
  { id: 'T-BTCMC2-01', productoId: 'PROD-BABY-TY-CINTA-MC2', orden: 1, operacion: 'Hombro 1', tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta MC|1' },
  { id: 'T-BTCMC2-02', productoId: 'PROD-BABY-TY-CINTA-MC2', orden: 2, operacion: 'Cinta',    tarifa: 0.10, notas: '', clave: 'Baby Ty Cinta MC|2' },
  { id: 'T-BTCMC2-03', productoId: 'PROD-BABY-TY-CINTA-MC2', orden: 3, operacion: 'Hombro 2', tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta MC|3' },
  { id: 'T-BTCMC2-04', productoId: 'PROD-BABY-TY-CINTA-MC2', orden: 4, operacion: 'Atraque',  tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta MC|4' },
  { id: 'T-BTCMC2-05', productoId: 'PROD-BABY-TY-CINTA-MC2', orden: 5, operacion: 'B. Manga', tarifa: 0.08, notas: '', clave: 'Baby Ty Cinta MC|5' },
  { id: 'T-BTCMC2-06', productoId: 'PROD-BABY-TY-CINTA-MC2', orden: 6, operacion: 'Manga y C',tarifa: 0.30, notas: '', clave: 'Baby Ty Cinta MC|6' },
  { id: 'T-BTCMC2-07', productoId: 'PROD-BABY-TY-CINTA-MC2', orden: 7, operacion: 'Faldón',   tarifa: 0.10, notas: '', clave: 'Baby Ty Cinta MC|7' },

  // Baby Ty Cinta ML (tarifas reales)
  { id: 'T-BTCML2-01', productoId: 'PROD-BABY-TY-CINTA-ML2', orden: 1, operacion: 'Hombro 1', tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta ML|1' },
  { id: 'T-BTCML2-02', productoId: 'PROD-BABY-TY-CINTA-ML2', orden: 2, operacion: 'Cinta',    tarifa: 0.10, notas: '', clave: 'Baby Ty Cinta ML|2' },
  { id: 'T-BTCML2-03', productoId: 'PROD-BABY-TY-CINTA-ML2', orden: 3, operacion: 'Hombro 2', tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta ML|3' },
  { id: 'T-BTCML2-04', productoId: 'PROD-BABY-TY-CINTA-ML2', orden: 4, operacion: 'Atraque',  tarifa: 0.05, notas: '', clave: 'Baby Ty Cinta ML|4' },
  { id: 'T-BTCML2-05', productoId: 'PROD-BABY-TY-CINTA-ML2', orden: 5, operacion: 'B. Manga', tarifa: 0.08, notas: '', clave: 'Baby Ty Cinta ML|5' },
  { id: 'T-BTCML2-06', productoId: 'PROD-BABY-TY-CINTA-ML2', orden: 6, operacion: 'Manga y C',tarifa: 0.35, notas: '', clave: 'Baby Ty Cinta ML|6' },
  { id: 'T-BTCML2-07', productoId: 'PROD-BABY-TY-CINTA-ML2', orden: 7, operacion: 'Faldón',   tarifa: 0.10, notas: '', clave: 'Baby Ty Cinta ML|7' },

  // Polera Neru
  { id: 'T-PNERU-01', productoId: 'PROD-POLERA-NERU', orden: 1,  operacion: 'Hombro',          tarifa: 0.10, notas: '', clave: 'Polera Neru|1' },
  { id: 'T-PNERU-02', productoId: 'PROD-POLERA-NERU', orden: 2,  operacion: 'C. Cadena',       tarifa: 0.10, notas: '', clave: 'Polera Neru|2' },
  { id: 'T-PNERU-03', productoId: 'PROD-POLERA-NERU', orden: 3,  operacion: 'C. Nuca',         tarifa: 0.20, notas: '', clave: 'Polera Neru|3' },
  { id: 'T-PNERU-04', productoId: 'PROD-POLERA-NERU', orden: 4,  operacion: 'Cierre',          tarifa: 0.80, notas: '', clave: 'Polera Neru|4' },
  { id: 'T-PNERU-05', productoId: 'PROD-POLERA-NERU', orden: 5,  operacion: 'Despunte cuello', tarifa: 0.15, notas: '', clave: 'Polera Neru|5' },
  { id: 'T-PNERU-06', productoId: 'PROD-POLERA-NERU', orden: 6,  operacion: 'Asentado',        tarifa: 0.30, notas: '', clave: 'Polera Neru|6' },
  { id: 'T-PNERU-07', productoId: 'PROD-POLERA-NERU', orden: 7,  operacion: 'Desp. Cierre',    tarifa: 0.15, notas: '', clave: 'Polera Neru|7' },
  { id: 'T-PNERU-08', productoId: 'PROD-POLERA-NERU', orden: 8,  operacion: 'Manga y cerrado', tarifa: 0.35, notas: '', clave: 'Polera Neru|8' },
  { id: 'T-PNERU-09', productoId: 'PROD-POLERA-NERU', orden: 9,  operacion: 'R.PyP',           tarifa: 0.60, notas: '', clave: 'Polera Neru|9' },
  { id: 'T-PNERU-10', productoId: 'PROD-POLERA-NERU', orden: 10, operacion: 'D.PyP',           tarifa: 0.40, notas: '', clave: 'Polera Neru|10' },

  // Poleras Cuello Redondo
  { id: 'T-PCR-01', productoId: 'PROD-POLERAS-CR', orden: 1, operacion: 'Hombro',          tarifa: 0.10, notas: '', clave: 'Poleras Cuello Redondo|1' },
  { id: 'T-PCR-02', productoId: 'PROD-POLERAS-CR', orden: 2, operacion: 'Cuello',          tarifa: 0.15, notas: '', clave: 'Poleras Cuello Redondo|2' },
  { id: 'T-PCR-03', productoId: 'PROD-POLERAS-CR', orden: 3, operacion: 'Despunte',        tarifa: 0.08, notas: '', clave: 'Poleras Cuello Redondo|3' },
  { id: 'T-PCR-04', productoId: 'PROD-POLERAS-CR', orden: 4, operacion: 'Tapeta',          tarifa: 0.11, notas: '', clave: 'Poleras Cuello Redondo|4' },
  { id: 'T-PCR-05', productoId: 'PROD-POLERAS-CR', orden: 5, operacion: 'Manga y Cerrado', tarifa: 0.35, notas: '', clave: 'Poleras Cuello Redondo|5' },
  { id: 'T-PCR-06', productoId: 'PROD-POLERAS-CR', orden: 6, operacion: 'R.PyP',           tarifa: 0.60, notas: '', clave: 'Poleras Cuello Redondo|6' },
  { id: 'T-PCR-07', productoId: 'PROD-POLERAS-CR', orden: 7, operacion: 'D.PyP',           tarifa: 0.40, notas: '', clave: 'Poleras Cuello Redondo|7' },

  // Pique Cuello Chino
  { id: 'T-PQCC-01', productoId: 'PROD-PIQUE-CC', orden: 1,  operacion: 'Pegado de Pech - 2 pzas',         tarifa: 0.50, notas: '', clave: 'Pique Cuello Chino|1' },
  { id: 'T-PQCC-02', productoId: 'PROD-PIQUE-CC', orden: 2,  operacion: 'Orill borde de pechera+remallé base', tarifa: 0.10, notas: '', clave: 'Pique Cuello Chino|2' },
  { id: 'T-PQCC-03', productoId: 'PROD-PIQUE-CC', orden: 3,  operacion: 'Despunte de pechera',             tarifa: 0.10, notas: '', clave: 'Pique Cuello Chino|3' },
  { id: 'T-PQCC-04', productoId: 'PROD-PIQUE-CC', orden: 4,  operacion: 'Hombro',                          tarifa: 0.10, notas: '', clave: 'Pique Cuello Chino|4' },
  { id: 'T-PQCC-05', productoId: 'PROD-PIQUE-CC', orden: 5,  operacion: 'Cuello',                          tarifa: 0.25, notas: '', clave: 'Pique Cuello Chino|5' },
  { id: 'T-PQCC-06', productoId: 'PROD-PIQUE-CC', orden: 6,  operacion: 'Despunte cuello',                 tarifa: 0.15, notas: '', clave: 'Pique Cuello Chino|6' },
  { id: 'T-PQCC-07', productoId: 'PROD-PIQUE-CC', orden: 7,  operacion: 'Pegado de cinta Tapeta',          tarifa: 0.11, notas: '', clave: 'Pique Cuello Chino|7' },
  { id: 'T-PQCC-08', productoId: 'PROD-PIQUE-CC', orden: 8,  operacion: 'Manga y cerrado',                 tarifa: 0.30, notas: '', clave: 'Pique Cuello Chino|8' },
  { id: 'T-PQCC-09', productoId: 'PROD-PIQUE-CC', orden: 9,  operacion: 'Basta manga',                     tarifa: 0.10, notas: '', clave: 'Pique Cuello Chino|9' },
  { id: 'T-PQCC-10', productoId: 'PROD-PIQUE-CC', orden: 10, operacion: 'Basta faldón',                    tarifa: 0.11, notas: '', clave: 'Pique Cuello Chino|10' },

  // Wafle Camisa
  { id: 'T-WFCS-01', productoId: 'PROD-WAFLE-CAMISA', orden: 1,  operacion: 'Pegado canesú',      tarifa: 0.20, notas: '', clave: 'Wafle Camisa|1' },
  { id: 'T-WFCS-02', productoId: 'PROD-WAFLE-CAMISA', orden: 2,  operacion: 'Despunte canesú',    tarifa: 0.10, notas: '', clave: 'Wafle Camisa|2' },
  { id: 'T-WFCS-03', productoId: 'PROD-WAFLE-CAMISA', orden: 3,  operacion: 'Basta bolsillo',     tarifa: 0.04, notas: '', clave: 'Wafle Camisa|3' },
  { id: 'T-WFCS-04', productoId: 'PROD-WAFLE-CAMISA', orden: 4,  operacion: 'Pegado bolsillo',    tarifa: 0.40, notas: '', clave: 'Wafle Camisa|4' },
  { id: 'T-WFCS-05', productoId: 'PROD-WAFLE-CAMISA', orden: 5,  operacion: 'Orillado solapa',    tarifa: 0.16, notas: '', clave: 'Wafle Camisa|5' },
  { id: 'T-WFCS-06', productoId: 'PROD-WAFLE-CAMISA', orden: 6,  operacion: 'Dobles solapa',      tarifa: 0.20, notas: '', clave: 'Wafle Camisa|6' },
  { id: 'T-WFCS-07', productoId: 'PROD-WAFLE-CAMISA', orden: 7,  operacion: 'Pegado solapa',      tarifa: 0.20, notas: '', clave: 'Wafle Camisa|7' },
  { id: 'T-WFCS-08', productoId: 'PROD-WAFLE-CAMISA', orden: 8,  operacion: 'Unión hombro',       tarifa: 0.25, notas: '', clave: 'Wafle Camisa|8' },
  { id: 'T-WFCS-09', productoId: 'PROD-WAFLE-CAMISA', orden: 9,  operacion: 'Despunte hombro',    tarifa: 0.15, notas: '', clave: 'Wafle Camisa|9' },
  { id: 'T-WFCS-10', productoId: 'PROD-WAFLE-CAMISA', orden: 10, operacion: 'Despunte solapa',    tarifa: 0.20, notas: '', clave: 'Wafle Camisa|10' },
  { id: 'T-WFCS-11', productoId: 'PROD-WAFLE-CAMISA', orden: 11, operacion: 'Despunte pechera',   tarifa: 0.30, notas: '', clave: 'Wafle Camisa|11' },
  { id: 'T-WFCS-12', productoId: 'PROD-WAFLE-CAMISA', orden: 12, operacion: 'Orillado cuello',    tarifa: 0.15, notas: '', clave: 'Wafle Camisa|12' },
  { id: 'T-WFCS-13', productoId: 'PROD-WAFLE-CAMISA', orden: 13, operacion: 'Despunte cuello',    tarifa: 0.15, notas: '', clave: 'Wafle Camisa|13' },
  { id: 'T-WFCS-14', productoId: 'PROD-WAFLE-CAMISA', orden: 14, operacion: 'Pegado de cuello',   tarifa: 0.50, notas: '', clave: 'Wafle Camisa|14' },
  { id: 'T-WFCS-15', productoId: 'PROD-WAFLE-CAMISA', orden: 15, operacion: 'Asentado de cuello', tarifa: 0.25, notas: '', clave: 'Wafle Camisa|15' },
  { id: 'T-WFCS-16', productoId: 'PROD-WAFLE-CAMISA', orden: 16, operacion: 'Basta manga',        tarifa: 0.10, notas: '', clave: 'Wafle Camisa|16' },
  { id: 'T-WFCS-17', productoId: 'PROD-WAFLE-CAMISA', orden: 17, operacion: 'Manga y cerrado',    tarifa: 0.35, notas: '', clave: 'Wafle Camisa|17' },
  { id: 'T-WFCS-18', productoId: 'PROD-WAFLE-CAMISA', orden: 18, operacion: 'Basta faldón',       tarifa: 0.10, notas: '', clave: 'Wafle Camisa|18' },

  // Cuello Chino Wafle (nuevo, con tarifas reales)
  { id: 'T-CCWF2-01', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 1,  operacion: 'Pegado de Pech - 2 pzas',         tarifa: 0.50, notas: '', clave: 'Cuello Chino Wafle2|1' },
  { id: 'T-CCWF2-02', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 2,  operacion: 'Orill borde de pechera+remallé base', tarifa: 0.10, notas: '', clave: 'Cuello Chino Wafle2|2' },
  { id: 'T-CCWF2-03', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 3,  operacion: 'Despunte de pechera',             tarifa: 0.10, notas: '', clave: 'Cuello Chino Wafle2|3' },
  { id: 'T-CCWF2-04', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 4,  operacion: 'Hombro',                          tarifa: 0.10, notas: '', clave: 'Cuello Chino Wafle2|4' },
  { id: 'T-CCWF2-05', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 5,  operacion: 'Cuello',                          tarifa: 0.25, notas: '', clave: 'Cuello Chino Wafle2|5' },
  { id: 'T-CCWF2-06', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 6,  operacion: 'Despunte cuello',                 tarifa: 0.15, notas: '', clave: 'Cuello Chino Wafle2|6' },
  { id: 'T-CCWF2-07', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 7,  operacion: 'Pegado de cinta Tapeta',          tarifa: 0.11, notas: '', clave: 'Cuello Chino Wafle2|7' },
  { id: 'T-CCWF2-08', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 8,  operacion: 'Manga y cerrado',                 tarifa: 0.30, notas: '', clave: 'Cuello Chino Wafle2|8' },
  { id: 'T-CCWF2-09', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 9,  operacion: 'Basta manga',                     tarifa: 0.10, notas: '', clave: 'Cuello Chino Wafle2|9' },
  { id: 'T-CCWF2-10', productoId: 'PROD-CUELLO-CHINO-WAFLE', orden: 10, operacion: 'Basta faldón',                    tarifa: 0.11, notas: '', clave: 'Cuello Chino Wafle2|10' },
];

// ─── Operarios (24 reales) ─────────────────────────────────────────────────
export const mockOperarios: Operario[] = [
  { id: 'OPE-LUISA',    codigo: 'OP001', nombre: 'Luisa Marcela Apaza Arrapea',         estado: 'ACTIVO' },
  { id: 'OPE-ADOLFO',   codigo: 'OP002', nombre: 'Adolfo Kallin Arboñil Siesquen',      estado: 'ACTIVO' },
  { id: 'OPE-RICHARD',  codigo: 'OP003', nombre: 'Richard Conga Castro',                estado: 'ACTIVO' },
  { id: 'OPE-VICTOR',   codigo: 'OP004', nombre: 'Victor Neiser Dominguez Malpartida',  estado: 'ACTIVO' },
  { id: 'OPE-EDWID',    codigo: 'OP005', nombre: 'Edwid Ellizca Urbano',                estado: 'ACTIVO' },
  { id: 'OPE-GREY',     codigo: 'OP006', nombre: 'Isrrael Isaias Felles Claros',        estado: 'ACTIVO' },
  { id: 'OPE-EFRAIN',   codigo: 'OP007', nombre: 'Efrain Walter Garcia Luis',           estado: 'ACTIVO' },
  { id: 'OPE-EDGAR',    codigo: 'OP008', nombre: 'Edgar Luigui Herrera Daga',           estado: 'ACTIVO' },
  { id: 'OPE-NAZARIO',  codigo: 'OP009', nombre: 'Jose Nazario Inga Yarleque',          estado: 'ACTIVO' },
  { id: 'OPE-RISTER',   codigo: 'OP010', nombre: 'Rister Ochavano Ahuanari',            estado: 'ACTIVO' },
  { id: 'OPE-RAUL',     codigo: 'OP011', nombre: 'Raul Benigno Peña Roman',             estado: 'ACTIVO' },
  { id: 'OPE-JANISI',   codigo: 'OP012', nombre: 'Janisi Yaela Perez Carrasco',         estado: 'ACTIVO' },
  { id: 'OPE-ROQUE',    codigo: 'OP013', nombre: 'Rafael Roque Celestino',              estado: 'ACTIVO' },
  { id: 'OPE-ALEXJ',    codigo: 'OP014', nombre: 'Alexander Rutti Gallo',              estado: 'ACTIVO' },
  { id: 'OPE-JESUS',    codigo: 'OP015', nombre: 'Jesus Antonio Sanchez Toribe',        estado: 'ACTIVO' },
  { id: 'OPE-JAVIER',   codigo: 'OP016', nombre: 'Javier Arturo Sanz Ortiz',            estado: 'ACTIVO' },
  { id: 'OPE-ALEX',     codigo: 'OP017', nombre: 'Alejandro Javier Yngunza Pachas',     estado: 'ACTIVO' },
  { id: 'OPE-ARNALDO',  codigo: 'OP018', nombre: 'Arnaldo Simon Yucra Castillo',        estado: 'ACTIVO' },
  { id: 'OPE-CARLOS',   codigo: 'OP019', nombre: 'Carlos Rosario Zeña Alamo',           estado: 'ACTIVO' },
  { id: 'OPE-FABIOLA',  codigo: 'OP020', nombre: 'Lorennys Fabiola Moreno Castañeda',   estado: 'ACTIVO' },
  { id: 'OPE-KARLA',    codigo: 'OP021', nombre: 'Karla Sinay Palacios Piñero',         estado: 'ACTIVO' },
  { id: 'OPE-MILAGROS', codigo: 'OP022', nombre: 'Luismari Demilagro Antich Pereira',   estado: 'ACTIVO' },
  { id: 'OPE-RICARDO',  codigo: 'OP023', nombre: 'Jose Ricardo Suarez Cadillo',         estado: 'ACTIVO' },
  { id: 'OPE-HAYDE',    codigo: 'OP024', nombre: 'Hayde',                               estado: 'ACTIVO' },
];

// ─── Configuración inicial ─────────────────────────────────────────────────
export const initialConfig: Config = {
  umbralCritico: 5,
  umbralBajo: 15,
  mermaPct: 15,
  detraccionPct: 10,
  igvPct: 18,
  incluirIgv: false,
  tipoCambioUsd: 3.75,
  kgPorRolloDefault: 20,
  comisionJoseKg: 0,
  mermaMaxTej: 5,
  mermaMaxTint: 3,
};

// ─── Datos iniciales vacíos ────────────────────────────────────────────────
export const initialMovimientosTela: MovimientoTela[] = [];
export const initialCortes: Corte[] = [];
export const initialSeguimientoFilas: SeguimientoFila[] = [];
export const initialBoletaLineas: BoletaLinea[] = [];
export const initialMovimientosComplemento: MovimientoComplemento[] = [];
export const initialProgramas: ProgramaZurzam[] = [];
export const initialProgramaDetalles: ProgramaDetalle[] = [];
export const initialComprasHilo: CompraHilo[] = [];
export const initialCobros: CobroDiario[] = [];