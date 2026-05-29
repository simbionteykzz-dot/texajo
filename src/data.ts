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
  { id: 'TEL-RIB',       nombre: 'Rib 1x1',            composicion: '95% Algodón 5% Elastano', kgPorRollo: 15, notas: '' },
];

// ─── Colores (15) ─────────────────────────────────────────────────────────
export const mockColores: Color[] = [
  { id: 'COL-NEGRO',     nombre: 'Negro',        categoria: 'OSCURO',  prioridad: 1,  notas: '' },
  { id: 'COL-MARINO',    nombre: 'Azul Marino',  categoria: 'OSCURO',  prioridad: 2,  notas: '' },
  { id: 'COL-GRIS-OSC',  nombre: 'Gris Oscuro',  categoria: 'OSCURO',  prioridad: 3,  notas: '' },
  { id: 'COL-MILITAR',   nombre: 'Verde Militar', categoria: 'OSCURO', prioridad: 4,  notas: '' },
  { id: 'COL-MORADO',    nombre: 'Morado',        categoria: 'OSCURO', prioridad: 5,  notas: '' },
  { id: 'COL-BLANCO',    nombre: 'Blanco',        categoria: 'CLARO',  prioridad: 6,  notas: '' },
  { id: 'COL-PERLA',     nombre: 'Gris Perla',    categoria: 'CLARO',  prioridad: 7,  notas: '' },
  { id: 'COL-BEIGE',     nombre: 'Beige',         categoria: 'CLARO',  prioridad: 8,  notas: '' },
  { id: 'COL-CELESTE',   nombre: 'Celeste',        categoria: 'CLARO', prioridad: 9,  notas: '' },
  { id: 'COL-ROSA',      nombre: 'Rosa',           categoria: 'CLARO', prioridad: 10, notas: '' },
  { id: 'COL-MEL-GRIS',  nombre: 'Gris Melange',  categoria: 'MELANGE', prioridad: 11, notas: '' },
  { id: 'COL-MEL-JASPE', nombre: 'Melange Jaspe', categoria: 'MELANGE', prioridad: 12, notas: '' },
  { id: 'COL-PPT-VERDE', nombre: 'Verde PPT',     categoria: 'PPT',    prioridad: 13, notas: '' },
  { id: 'COL-PPT-AZUL',  nombre: 'Azul PPT',      categoria: 'PPT',    prioridad: 14, notas: '' },
  { id: 'COL-PPT-NAR',   nombre: 'Naranja PPT',   categoria: 'PPT',    prioridad: 15, notas: '' },
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
  // Rib
  { id: 'P-RIB-OSC', telaId: 'TEL-RIB', categoriaColor: 'OSCURO',  precioKg: 24.00 },
  { id: 'P-RIB-CLA', telaId: 'TEL-RIB', categoriaColor: 'CLARO',   precioKg: 21.00 },
  { id: 'P-RIB-MEL', telaId: 'TEL-RIB', categoriaColor: 'MELANGE', precioKg: 19.00 },
  { id: 'P-RIB-PPT', telaId: 'TEL-RIB', categoriaColor: 'PPT',     precioKg: 18.00 },
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

  // Cuello Chino Wafle
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