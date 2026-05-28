import * as XLSX from 'xlsx';
import {
  AsignacionOperacion,
  Cliente,
  Color,
  CompraHilo,
  Config,
  Corte,
  MovimientoComplemento,
  MovimientoTela,
  Operario,
  PrecioTela,
  Producto,
  ProgramaDetalle,
  ProgramaZurzam,
  Proveedor,
  TarifaOperacion,
  Tela,
  TexajoImportPayload,
  TexajoImportResult,
} from '../types';

type CatalogSource = Partial<{
  clientes: Cliente[];
  proveedores: Proveedor[];
  telas: Tela[];
  colores: Color[];
  preciosTelas: PrecioTela[];
  productos: Producto[];
  operarios: Operario[];
  tarifasOperaciones: TarifaOperacion[];
  config: Config;
}>;

type RowRecord = Record<string, string>;

export const TEXAJO_GOOGLE_SHEET_CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQlfrHtQJreAlZSHDEt2Ys_AVqesYo4bvDpfu4IR2gOIbDwM3g7EMBs1On4KI__pf3vHf0piBINtzF/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTePiz4wqeKpAnl7V5ShKVpUmycOo2BeQUc_SyuxWAzCSw9qG_EFvFnHJMi9G5Hkzu8pk8HNkRBGpO1/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTkQIjR9jUtQOOEcVpcgm-lJ_3nydA9KWLi0TxKbDLn4QwN6zUUJZxyNc122IfyM0LanrDxWnpO_hkt/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGZVLLg3L2QS7MReXfyfKqZHG9oiFAfuDD9jm29ZqrS2ogAngk48Fs7i3124R8DQ5ZyTFSfdsulXa8/pub?output=csv',
] as const;

const asXlsxUrl = (url: string) => url.replace(/output=csv/i, 'output=xlsx');

const emptyPayload = (): Required<Omit<TexajoImportPayload, 'config'>> => ({
  clientes: [],
  proveedores: [],
  telas: [],
  colores: [],
  preciosTelas: [],
  productos: [],
  movimientosTela: [],
  movimientosComplementos: [],
  cobrosDiarios: [],
  programasZurzam: [],
  comprasHilo: [],
  programaDetalles: [],
  operarios: [],
  cortes: [],
  tarifasOperaciones: [],
  asignacionesOperacion: [],
  auditLogs: [],
});

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const slug = (value: unknown, fallback: string) => {
  const raw = normalize(value).replace(/\s+/g, '-').toUpperCase();
  return raw || fallback;
};

const n = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const text = (value: unknown) => String(value ?? '').trim();

const cleanCorteNumber = (value: unknown) => {
  const raw = text(value);
  const parsed = Number(raw);
  if (raw && Number.isFinite(parsed) && Number.isInteger(parsed)) return String(parsed);
  return raw.replace(/\.0+$/, '');
};

const cleanOperarioCode = (value: unknown) => text(value).replace(/\*/g, '').trim();

const excelDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = text(value);
  if (!raw) return new Date().toISOString().slice(0, 10);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return raw.slice(0, 10);
};

const isBlankRow = (row: string[]) => row.every(cell => !text(cell));

const readRows = (workbook: XLSX.WorkBook, sheetName: string) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });
};

const rowsAsRecords = (workbook: XLSX.WorkBook, sheetName: string, requiredHeaders: string[]) => {
  const rows = readRows(workbook, sheetName);
  const required = requiredHeaders.map(normalize);
  const headerIndex = rows.findIndex(row => {
    const normalized = row.map(normalize);
    const matchedColumns = new Set<number>();
    required.forEach(req => {
      const index = normalized.findIndex(cell => cell !== '' && (cell === req || cell.includes(req) || req.includes(cell)));
      if (index >= 0) matchedColumns.add(index);
    });
    return matchedColumns.size >= Math.min(2, required.length);
  });
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map(normalize);
  return rows
    .slice(headerIndex + 1)
    .filter(row => !isBlankRow(row))
    .map(row => {
      const out: RowRecord = {};
      headers.forEach((header, index) => {
        if (header) out[header] = text(row[index]);
      });
      return out;
    });
};

const pick = (row: RowRecord, aliases: string[]) => {
  const normalizedAliases = aliases.map(normalize);
  for (const alias of normalizedAliases) {
    const exact = row[alias];
    if (exact !== undefined && exact !== '') return exact;
    const fuzzyKey = Object.keys(row).find(key => key.includes(alias) || alias.includes(key));
    if (fuzzyKey && row[fuzzyKey] !== '') return row[fuzzyKey];
  }
  return '';
};

const inferColorCategory = (name: string): Color['categoria'] => {
  const key = normalize(name);
  if (['perla', 'blanco'].some(v => key.includes(v))) return 'PPT';
  if (['melange'].some(v => key.includes(v))) return 'MELANGE';
  if (['beige', 'topo', 'cemento', 'pacay', 'denim', 'palo rosa', 'camote', 'rosa'].some(v => key.includes(v))) {
    return 'CLARO';
  }
  return 'OSCURO';
};

const isCatalogNoise = (value: string) => {
  const raw = String(value ?? '').toLowerCase();
  const key = normalize(value);
  if (!key) return true;
  if (['color', 'cliente', 'producto', 'proveedor', 'tela', 'notas', 'contacto'].includes(key)) return true;
  if (key.length > 34 && ['oscuro', 'claro', 'melange', 'ppt'].some(token => key.includes(token))) return true;
  if ((raw.includes('|') || raw.includes(':') || raw.includes('\\')) && ['oscuro', 'claro', 'melange', 'ppt'].some(token => key.includes(token))) return true;
  return [
    'catalogo',
    'categor',
    'configuracion',
    'instrucciones',
    'dashboard',
    'movimientos',
    'auto desde',
    'filtro',
    'llenar solo',
    'vista para imprimir',
  ].some(token => key.includes(token));
};

class ImportBuilder {
  payload = emptyPayload();
  config: Partial<Config> = {};
  warnings: string[] = [];

  private clientes = new Map<string, Cliente>();
  private proveedores = new Map<string, Proveedor>();
  private telas = new Map<string, Tela>();
  private colores = new Map<string, Color>();
  private productos = new Map<string, Producto>();
  private operarios = new Map<string, Operario>();
  private tarifas = new Map<string, TarifaOperacion>();
  private asignaciones = new Map<string, AsignacionOperacion>();

  constructor(source: CatalogSource) {
    source.clientes?.forEach(item => this.clientes.set(normalize(item.nombre), item));
    source.proveedores?.forEach(item => this.proveedores.set(normalize(item.nombre), item));
    source.telas?.forEach(item => this.telas.set(normalize(item.nombre), item));
    source.colores?.forEach(item => this.colores.set(normalize(item.nombre), item));
    source.productos?.forEach(item => this.productos.set(normalize(item.nombre), item));
    source.operarios?.forEach(item => {
      this.operarios.set(normalize(item.codigo), item);
      this.operarios.set(normalize(`${item.nombres} ${item.apellidos}`), item);
    });
    source.tarifasOperaciones?.forEach(item => this.tarifas.set(`${item.productoId}|${item.orden}`, item));
  }

  ensureCliente(nombre: string, extras: Partial<Cliente> = {}) {
    const clean = text(nombre) || 'Sin cliente';
    if (isCatalogNoise(clean)) return '';
    const key = normalize(clean);
    const existing = this.clientes.get(key);
    if (existing) return existing.id;
    const item: Cliente = {
      id: `CLI-${slug(clean, String(this.clientes.size + 1))}`,
      nombre: clean,
      contacto: extras.contacto ?? '',
      notas: extras.notas ?? '',
    };
    this.clientes.set(key, item);
    this.payload.clientes.push(item);
    return item.id;
  }

  ensureProveedor(nombre: string, extras: Partial<Proveedor> = {}) {
    const clean = text(nombre) || 'Sin proveedor';
    if (isCatalogNoise(clean)) return '';
    const key = normalize(clean);
    const existing = this.proveedores.get(key);
    if (existing) return existing.id;
    const item: Proveedor = {
      id: `PROV-${slug(clean, String(this.proveedores.size + 1))}`,
      nombre: clean,
      ruc: extras.ruc ?? '',
      contacto: extras.contacto ?? '',
      tipo: extras.tipo ?? 'General',
    };
    this.proveedores.set(key, item);
    this.payload.proveedores.push(item);
    return item.id;
  }

  ensureTela(nombre: string, extras: Partial<Tela> = {}) {
    const clean = text(nombre) || 'Tela sin nombre';
    if (isCatalogNoise(clean)) return '';
    const key = normalize(clean);
    const existing = this.telas.get(key);
    if (existing) return existing.id;
    const item: Tela = {
      id: `TEL-${slug(clean, String(this.telas.size + 1))}`,
      nombre: clean,
      composicion: extras.composicion ?? '',
      kgPorRollo: extras.kgPorRollo || 20,
    };
    this.telas.set(key, item);
    this.payload.telas.push(item);
    return item.id;
  }

  ensureColor(nombre: string, extras: Partial<Color> = {}) {
    const clean = text(nombre) || 'Sin color';
    if (isCatalogNoise(clean)) return '';
    const key = normalize(clean);
    const existing = this.colores.get(key);
    if (existing) return existing.id;
    const item: Color = {
      id: `COL-${slug(clean, String(this.colores.size + 1))}`,
      nombre: clean,
      categoria: extras.categoria ?? inferColorCategory(clean),
      prioridad: extras.prioridad ?? 99,
    };
    this.colores.set(key, item);
    this.payload.colores.push(item);
    return item.id;
  }

  ensureProducto(nombre: string, extras: Partial<Producto> = {}) {
    const clean = text(nombre) || 'Producto sin nombre';
    if (isCatalogNoise(clean)) return '';
    const key = normalize(clean);
    const existing = this.productos.get(key);
    if (existing) return existing.id;
    const telaBaseId = extras.telaBaseId || this.ensureTela(pick({ tela: clean }, ['tela']) || clean);
    const item: Producto = {
      id: `PROD-${slug(clean, String(this.productos.size + 1))}`,
      nombre: clean,
      telaBaseId,
      rendimiento: extras.rendimiento || 1,
      costoMoTotal: extras.costoMoTotal || 0,
      precioServicio: extras.precioServicio || 0,
    };
    this.productos.set(key, item);
    this.payload.productos.push(item);
    return item.id;
  }

  ensureOperario(codeOrName: string, extras: Partial<Operario> = {}) {
    const clean = text(codeOrName) || 'OPERARIO';
    const key = normalize(clean);
    const existing = this.operarios.get(key);
    if (existing) return existing.id;
    const [apellidos = clean, nombres = ''] = clean.includes(',') ? clean.split(',').map(v => v.trim()) : ['', clean];
    const item: Operario = {
      id: `OP-${slug(clean, String(this.operarios.size + 1))}`,
      codigo: extras.codigo || slug(clean, String(this.operarios.size + 1)),
      nombres: extras.nombres || nombres || clean,
      apellidos: extras.apellidos || apellidos,
      dni: extras.dni || '',
      telefono: extras.telefono || '',
      maquinaAsignada: extras.maquinaAsignada || '',
      modulo: extras.modulo || '',
      fechaIngreso: extras.fechaIngreso || '',
      estado: extras.estado || 'ACTIVO',
    };
    this.operarios.set(key, item);
    this.operarios.set(normalize(item.codigo), item);
    this.payload.operarios.push(item);
    return item.id;
  }

  addPrecioTela(telaId: string, categoriaColor: PrecioTela['categoriaColor'], precioKg: number) {
    if (!telaId || precioKg <= 0) return;
    const id = `PR-${telaId}-${categoriaColor}`;
    if (this.payload.preciosTelas.some(item => item.id === id)) return;
    this.payload.preciosTelas.push({ id, telaId, categoriaColor, precioKg });
  }

  addTarifa(productoId: string, orden: number, operacion: string, tarifa: number, notas = '') {
    if (!productoId || !operacion || orden <= 0) return;
    const key = `${productoId}|${orden}`;
    const existing = this.tarifas.get(key);
    if (existing) return existing.id;
    const item: TarifaOperacion = {
      id: `TAR-${productoId}-${String(orden).padStart(2, '0')}`,
      productoId,
      orden,
      operacion,
      tarifa,
      notas,
    };
    this.tarifas.set(key, item);
    this.payload.tarifasOperaciones.push(item);
    return item.id;
  }

  tarifasForProduct(productoId: string) {
    const imported = [...this.tarifas.values()].filter(item => item.productoId === productoId);
    return imported.sort((a, b) => a.orden - b.orden);
  }

  findCorte(nCorte: string, productoId: string, colorId: string) {
    const corteKey = cleanCorteNumber(nCorte);
    return this.payload.cortes.find(item =>
      cleanCorteNumber(item.nCorte) === corteKey &&
      item.productoId === productoId &&
      item.colorId === colorId
    );
  }

  ensureCorteFromSeguimiento(nCorte: string, fecha: string, productoId: string, colorId: string, talla: string, cantidad: number) {
    const existing = this.findCorte(nCorte, productoId, colorId);
    if (existing) {
      if (existing.id.startsWith('CORTE-SEG-')) addCantidadCorte(existing, talla, cantidad);
      return existing;
    }

    const corte: Corte = {
      id: `CORTE-SEG-${slug(`${nCorte}-${productoId}-${colorId}`, nCorte)}`,
      fecha,
      nCorte,
      clienteId: this.ensureCliente('Sin cliente'),
      productoId,
      colorId,
      cortadorId: '',
      ayudanteId: '',
      telaUsada: 0,
      rollosUsados: 0,
      tendidas: 0,
      mtsPorTendida: 0,
      ancho: 0.9,
      cantS: 0,
      cantM: 0,
      cantL: 0,
      cantXL: 0,
      totalPrendas: 0,
      consumo: 0,
      rendimiento: 0,
      revision: 'PENDIENTE',
      estado: 'EN_PROCESO',
    };
    addCantidadCorte(corte, talla, cantidad);
    this.payload.cortes.push(corte);
    return corte;
  }

  addAsignacionOperacion(item: Omit<AsignacionOperacion, 'id'> & { idBase: string }) {
    const id = `ASIG-SEG-${slug(item.idBase, item.idBase)}`;
    const existing = this.asignaciones.get(id);
    if (existing) {
      existing.cantS += item.cantS;
      existing.cantM += item.cantM;
      existing.cantL += item.cantL;
      existing.cantXL += item.cantXL;
      existing.totalPrendas += item.totalPrendas;
      existing.importe = Number((existing.importe + item.importe).toFixed(2));
      return existing.id;
    }

    const nuevo: AsignacionOperacion = {
      id,
      corteId: item.corteId,
      productoId: item.productoId,
      operarioId: item.operarioId,
      operacionId: item.operacionId,
      operacion: item.operacion,
      orden: item.orden,
      tarifa: item.tarifa,
      cantS: item.cantS,
      cantM: item.cantM,
      cantL: item.cantL,
      cantXL: item.cantXL,
      totalPrendas: item.totalPrendas,
      importe: item.importe,
      estadoPago: item.estadoPago ?? 'PENDIENTE',
    };
    this.asignaciones.set(id, nuevo);
    this.payload.asignacionesOperacion.push(nuevo);
    return nuevo.id;
  }
}

const qtyByTalla = (talla: string, cantidad: number) => ({
  cantS: normalize(talla) === 's' ? cantidad : 0,
  cantM: normalize(talla) === 'm' ? cantidad : 0,
  cantL: normalize(talla) === 'l' ? cantidad : 0,
  cantXL: normalize(talla) === 'xl' ? cantidad : 0,
});

const addCantidadCorte = (corte: Corte, talla: string, cantidad: number) => {
  const qty = qtyByTalla(talla, cantidad);
  corte.cantS += qty.cantS;
  corte.cantM += qty.cantM;
  corte.cantL += qty.cantL;
  corte.cantXL += qty.cantXL;
  corte.totalPrendas = corte.cantS + corte.cantM + corte.cantL + corte.cantXL;
};

const parseCatalogs = (workbook: XLSX.WorkBook, builder: ImportBuilder) => {
  for (const sheet of ['CLIENTES']) {
    rowsAsRecords(workbook, sheet, ['CLIENTE', 'CONTACTO']).forEach(row => {
      const nombre = pick(row, ['CLIENTE']);
      if (nombre) builder.ensureCliente(nombre, { contacto: pick(row, ['CONTACTO']), notas: pick(row, ['NOTAS']) });
    });
  }

  rowsAsRecords(workbook, 'PROVEEDORES', ['PROVEEDOR', 'TIPO']).forEach(row => {
    const nombre = pick(row, ['PROVEEDOR']);
    if (nombre) {
      builder.ensureProveedor(nombre, {
        tipo: pick(row, ['TIPO']) || 'General',
        ruc: pick(row, ['RUC']),
        contacto: pick(row, ['CONTACTO']),
      });
    }
  });

  rowsAsRecords(workbook, 'COLORES', ['COLOR', 'NOTAS']).forEach(row => {
    const nombre = pick(row, ['COLOR']);
    if (nombre) {
      const categoria = pick(row, ['CATEG', 'CATEGORIA']) as Color['categoria'];
      builder.ensureColor(nombre, { categoria: categoria || inferColorCategory(nombre) });
    }
  });

  rowsAsRecords(workbook, 'TELAS', ['TELA', 'KG']).forEach(row => {
    const nombre = pick(row, ['TELA', 'NOMBRE']);
    if (nombre) {
      builder.ensureTela(nombre, {
        composicion: pick(row, ['COMPOSICION']),
        kgPorRollo: n(pick(row, ['KG POR ROLLO', 'KG/ROLLO']), 20),
      });
    }
  });

  rowsAsRecords(workbook, 'PRODUCTOS', ['PRODUCTO', 'COSTO']).forEach(row => {
    const nombre = pick(row, ['PRODUCTO']);
    if (!nombre) return;
    const telaName = pick(row, ['TELA TIPICA', 'TELA BASE', 'TELA']);
    builder.ensureProducto(nombre, {
      telaBaseId: telaName ? builder.ensureTela(telaName) : undefined,
      rendimiento: n(pick(row, ['RENDIMIENTO', 'LIM RENDIMIENTO']), 1),
      costoMoTotal: n(pick(row, ['COSTO MO', 'COSTO MO INTERNO']), 0),
      precioServicio: n(pick(row, ['PRECIO VENTA ACTUAL', 'PRECIO SERVICIO', 'PRECIO VENTA']), 0),
    });
  });

  rowsAsRecords(workbook, 'PRECIOS', ['TELA']).forEach(row => {
    const telaId = builder.ensureTela(pick(row, ['TELA']));
    (['OSCURO', 'PPT', 'CLARO', 'MELANGE'] as const).forEach(cat => {
      const price = n(pick(row, [cat]), 0);
      builder.addPrecioTela(telaId, cat, price);
    });
  });
};

const parseConfig = (workbook: XLSX.WorkBook, builder: ImportBuilder) => {
  rowsAsRecords(workbook, 'CONFIG', ['PARAMETRO', 'VALOR']).forEach(row => {
    const key = normalize(pick(row, ['PARAMETRO']));
    const value = n(pick(row, ['VALOR']), NaN);
    if (!Number.isFinite(value)) return;
    if (key.includes('margen')) builder.config.margenObjetivo = value;
    if (key.includes('detraccion')) builder.config.detraccionPct = value;
    if (key.includes('igv')) builder.config.igvPct = value;
    if (key.includes('tipo de cambio')) builder.config.tipoCambioUsd = value;
    if (key.includes('costos indirectos')) builder.config.costosIndirectosMensuales = value;
    if (key.includes('prendas mes')) builder.config.prendasMesEstimadas = value;
    if (key.includes('comision')) builder.config.comisionJoseKg = value;
    if (key.includes('umbral critico')) builder.config.umbralCritico = value;
    if (key.includes('umbral bajo')) builder.config.umbralBajo = value;
  });
};

const parseInventario = (workbook: XLSX.WorkBook, builder: ImportBuilder) => {
  rowsAsRecords(workbook, 'MOVIMIENTOS', ['FECHA', 'TIPO', 'TELA']).forEach((row, index) => {
    const tela = pick(row, ['TELA']);
    const color = pick(row, ['COLOR']);
    if (!tela || !color) return;
    const telaId = builder.ensureTela(tela);
    const colorId = builder.ensureColor(color, { categoria: pick(row, ['CATEG COLOR']) as Color['categoria'] });
    const precioKg = n(pick(row, ['PRECIO KG']), 0);
    const categoriaColor = (pick(row, ['CATEG COLOR']) || inferColorCategory(color)) as Color['categoria'];
    builder.addPrecioTela(telaId, categoriaColor, precioKg);
    const fecha = excelDate(pick(row, ['FECHA']));
    const tipo = (pick(row, ['TIPO']) || 'INGRESO').replace(/\s+/g, '_').toUpperCase() as MovimientoTela['tipo'];
    const kgTotal = n(pick(row, ['KG TOTAL']), 0);
    const totalSoles = n(pick(row, ['TOTAL S']), kgTotal * precioKg);
    builder.payload.movimientosTela.push({
      id: `MOV-XLS-${slug(`${fecha}-${tipo}-${tela}-${color}-${index}`, String(index))}`,
      fecha,
      tipo,
      clienteId: pick(row, ['CLIENTE']) ? builder.ensureCliente(pick(row, ['CLIENTE'])) : undefined,
      telaId,
      colorId,
      rollos: n(pick(row, ['ROLLOS']), 0),
      kgTotal,
      categoriaColor,
      precioKg,
      totalSoles,
      stockAntes: n(pick(row, ['STOCK ANTES']), 0),
      stockDespues: n(pick(row, ['STOCK DESPUES']), 0),
      responsable: pick(row, ['RESPONSABLE']) || 'Excel',
      notas: pick(row, ['NOTAS']),
      proveedorId: pick(row, ['PROVEEDOR']) ? builder.ensureProveedor(pick(row, ['PROVEEDOR'])) : undefined,
      nFactura: pick(row, ['FACTURA']),
      costoRealFact: n(pick(row, ['COSTO REAL']), 0) || undefined,
      diferenciaPct: n(pick(row, ['DIFERENCIA']), 0) || undefined,
      nCorte: pick(row, ['CORTE']),
    });
  });

  rowsAsRecords(workbook, 'MOVIMIENTOS_COMPLEMENTOS', ['FECHA', 'TIPO MOV', 'COLOR']).forEach((row, index) => {
    const color = pick(row, ['COLOR']);
    if (!color) return;
    const cantidad = n(pick(row, ['CANTIDAD']), 0);
    if (cantidad <= 0) return;
    const fecha = excelDate(pick(row, ['FECHA']));
    const precioUnitario = n(pick(row, ['PRECIO UNIT']), 0);
    builder.payload.movimientosComplementos.push({
      id: `COMP-XLS-${slug(`${fecha}-${color}-${index}`, String(index))}`,
      fecha,
      tipo: ((pick(row, ['TIPO MOV']) || 'INGRESO').replace(/\s+/g, '_').toUpperCase() as MovimientoComplemento['tipo']) || 'INGRESO',
      clienteId: pick(row, ['CLIENTE']) ? builder.ensureCliente(pick(row, ['CLIENTE'])) : undefined,
      tipoPieza: ((pick(row, ['TIPO PIEZA']) || 'OTRO').replace('PUÑ', 'PUN').replace('PUÃ', 'PUN').toUpperCase() as MovimientoComplemento['tipoPieza']) || 'OTRO',
      origen: ((pick(row, ['ORIGEN']) || 'STOCK').replace(/\s+/g, '_').toUpperCase() as MovimientoComplemento['origen']) || 'STOCK',
      productoDestinoId: pick(row, ['PRODUCTO DESTINO']) ? builder.ensureProducto(pick(row, ['PRODUCTO DESTINO'])) : undefined,
      colorId: builder.ensureColor(color),
      talla: ((pick(row, ['TALLA']) || 'UNICA').toUpperCase() as MovimientoComplemento['talla']) || 'UNICA',
      cantidad,
      precioUnitario,
      totalSoles: n(pick(row, ['TOTAL S']), cantidad * precioUnitario),
      stockAntes: n(pick(row, ['STOCK ANTES']), 0),
      stockDespues: n(pick(row, ['STOCK DESPUES']), 0),
      proveedorId: pick(row, ['PROVEEDOR']) ? builder.ensureProveedor(pick(row, ['PROVEEDOR'])) : undefined,
      nFactura: pick(row, ['FACTURA']),
      costoRealFact: n(pick(row, ['COSTO REAL']), 0) || undefined,
      notas: pick(row, ['NOTAS']),
    });
  });
};

const parseCobros = (workbook: XLSX.WorkBook, builder: ImportBuilder) => {
  rowsAsRecords(workbook, 'COBROS_DIARIOS', ['FECHA', 'CLIENTE', 'PRODUCTO']).forEach((row, index) => {
    const cliente = pick(row, ['CLIENTE']);
    const producto = pick(row, ['PRODUCTO']);
    const color = pick(row, ['COLOR']);
    if (!cliente || !producto || !color) return;
    const totalPrendas = n(pick(row, ['TOTAL']), n(pick(row, ['S'])) + n(pick(row, ['M'])) + n(pick(row, ['L'])) + n(pick(row, ['XL'])));
    if (totalPrendas <= 0) return;
    const precioUnitario = n(pick(row, ['PRECIO UNIT', 'PRECIO']), 0);
    const bruto = n(pick(row, ['BRUTO']), totalPrendas * precioUnitario);
    const detraccion = n(pick(row, ['DETRACC']), bruto * 0.1);
    const nCorte = pick(row, ['N CORTE', 'CORTE']) || `CORTE-${index + 1}`;
    builder.payload.cobrosDiarios.push({
      id: `COB-XLS-${slug(`${nCorte}-${index}`, String(index))}`,
      fecha: excelDate(pick(row, ['FECHA'])),
      nCorte,
      nFactura: pick(row, ['N FACTURA', 'FACTURA']),
      clienteId: builder.ensureCliente(cliente),
      productoId: builder.ensureProducto(producto),
      colorId: builder.ensureColor(color),
      cantS: n(pick(row, ['S']), 0),
      cantM: n(pick(row, ['M']), 0),
      cantL: n(pick(row, ['L']), 0),
      cantXL: n(pick(row, ['XL']), 0),
      totalPrendas,
      precioUnitario,
      bruto,
      detraccion10Pct: detraccion,
      disponible90Pct: n(pick(row, ['DISPONIBLE']), bruto - detraccion),
      estado: (normalize(pick(row, ['ESTADO'])).includes('cobrado') ? 'COBRADO' : 'PENDIENTE'),
      notas: pick(row, ['NOTAS']),
    });
  });
};

const parseProgramas = (workbook: XLSX.WorkBook, builder: ImportBuilder) => {
  rowsAsRecords(workbook, 'PROGRAMAS', ['ID PROGRAMA', 'FECHA INICIO']).forEach(row => {
    const id = pick(row, ['ID PROGRAMA']);
    if (!id) return;
    const kgHilo = n(pick(row, ['KG HILO COMPRADO', 'KG OBJETIVO']), n(pick(row, ['KG DETALLE']), 0));
    const kgFinal = n(pick(row, ['KG TELA FINAL', 'KG FINAL']), 0);
    const costoHiloTotal = n(pick(row, ['COSTO HILO TOTAL', 'TOTAL HILO']), 0);
    builder.payload.programasZurzam.push({
      id,
      nombre: pick(row, ['DESCRIPCION']) || id,
      fechaInicio: excelDate(pick(row, ['FECHA INICIO'])),
      clienteId: builder.ensureCliente(pick(row, ['CLIENTE']) || 'Sin cliente'),
      tipoTejido: pick(row, ['TIPO TEJIDO']),
      tipoHilo: pick(row, ['TIPO HILO']),
      kgHiloComprado: kgHilo,
      costoHiloTotal,
      kgTejEnviado: n(pick(row, ['KG TEJ ENVIADO']), kgHilo),
      kgTejRetornado: n(pick(row, ['KG TEJ RETORNADO']), 0),
      kgMermaTej: n(pick(row, ['KG MERMA TEJ']), Math.max(0, kgHilo - n(pick(row, ['KG TEJ RETORNADO']), kgHilo))),
      pctMermaTej: n(pick(row, ['PCT MERMA TEJ', '% MERMA TEJ']), 0),
      kgTintEnviado: n(pick(row, ['KG TINT ENVIADO']), 0),
      kgTintRetornado: n(pick(row, ['KG TINT RETORNADO']), kgFinal),
      kgMermaTint: n(pick(row, ['KG MERMA TINT']), 0),
      pctMermaTint: n(pick(row, ['PCT MERMA TINT', '% MERMA TINT']), 0),
      kgTelaFinal: kgFinal,
      comisionJose: n(pick(row, ['COMISION']), 0),
      inversionTotal: n(pick(row, ['INVERSION TOTAL', 'COSTO TOTAL']), costoHiloTotal),
      costoPromedioSolesKg: kgFinal > 0 ? n(pick(row, ['COSTO PROMEDIO']), 0) : 0,
      estado: ((pick(row, ['ESTADO']) || 'NUEVO').replace(/\s+/g, '_').toUpperCase() as ProgramaZurzam['estado']) || 'NUEVO',
      estadoPagoComision: normalize(pick(row, ['PAGO COMISION'])).includes('pagado') ? 'PAGADO' : 'PENDIENTE',
    });
  });

  rowsAsRecords(workbook, 'COMPRAS_HILO', ['FECHA', 'PROGRAMA']).forEach((row, index) => {
    const programaId = pick(row, ['PROGRAMA']);
    if (!programaId) return;
    const total = n(pick(row, ['TOTAL S']), 0);
    const pagado = n(pick(row, ['MONTO PAGADO']), normalize(pick(row, ['ESTADO PAGO'])).includes('pagado') ? total : 0);
    builder.payload.comprasHilo.push({
      id: `HILO-XLS-${slug(`${programaId}-${index}`, String(index))}`,
      fecha: excelDate(pick(row, ['FECHA'])),
      programaId,
      tipoHilo: pick(row, ['TIPO HILO']),
      kgAsignados: n(pick(row, ['KG ASIGNADOS']), 0),
      precioKg: n(pick(row, ['PRECIO KG']), 0),
      moneda: (pick(row, ['MONEDA']).toUpperCase() === 'USD' ? 'USD' : 'PEN'),
      tipoCambio: n(pick(row, ['TC']), 1),
      totalSoles: total,
      proveedorId: builder.ensureProveedor(pick(row, ['PROVEEDOR']) || 'Proveedor hilo', { tipo: 'HILO' }),
      nFactura: pick(row, ['FACTURA']),
      costoRealFact: n(pick(row, ['COSTO REAL FACT']), total),
      diferencia: n(pick(row, ['DIFERENCIA']), 0),
      estadoPago: ((pick(row, ['ESTADO PAGO']) || 'PENDIENTE').toUpperCase() as CompraHilo['estadoPago']) || 'PENDIENTE',
      fechaPago: pick(row, ['FECHA PAGO']) ? excelDate(pick(row, ['FECHA PAGO'])) : undefined,
      montoPagado: pagado,
      saldo: n(pick(row, ['SALDO']), Math.max(0, total - pagado)),
      notas: pick(row, ['NOTAS']),
    });
  });

  rowsAsRecords(workbook, 'PROGRAMA_DETALLE', ['ID PROGRAMA', 'COLOR']).forEach((row, index) => {
    const programaId = pick(row, ['ID PROGRAMA']);
    const color = pick(row, ['COLOR']);
    if (!programaId || !color) return;
    const kgTintEnviado = n(pick(row, ['KG TINT ENVIADO']), 0);
    const kgTintRetornado = n(pick(row, ['KG TINT RETORNADO']), 0);
    const kgMermaTint = n(pick(row, ['KG MERMA TINT']), Math.max(0, kgTintEnviado - kgTintRetornado));
    const precioTej = n(pick(row, ['PRECIO KG TEJ']), 0);
    const precioTint = n(pick(row, ['PRECIO KG TINT']), 0);
    const kgTejEnviado = n(pick(row, ['KG TEJ ENVIADO']), 0);
    const kgTejRetornado = n(pick(row, ['KG TEJ RETORNADO']), 0);
    const costoTejido = n(pick(row, ['COSTO TEJ']), kgTejEnviado * precioTej);
    const costoTint = n(pick(row, ['COSTO TINT']), kgTintEnviado * precioTint);
    const costoHilo = n(pick(row, ['COSTO HILO PRORRATEADO']), 0);
    const costoTotal = n(pick(row, ['COSTO TOTAL COLOR']), costoHilo + costoTejido + costoTint);
    builder.payload.programaDetalles.push({
      id: `DET-XLS-${slug(`${programaId}-${color}-${index}`, String(index))}`,
      programaId,
      colorId: builder.ensureColor(color, { categoria: pick(row, ['CATEG']) as Color['categoria'] }),
      categoriaColor: pick(row, ['CATEG']) || inferColorCategory(color),
      tipoServicio: pick(row, ['TIPO SERVICIO']),
      rollosPlan: n(pick(row, ['ROLLOS PLAN']), 0),
      kgPlan: n(pick(row, ['KG PLAN']), 0),
      prioridad: ((pick(row, ['PRIORIDAD']) || 'MEDIA').toUpperCase() as ProgramaDetalle['prioridad']) || 'MEDIA',
      kgTejEnviado,
      kgTejRetornado,
      precioKgTej: precioTej,
      costoTejido,
      estadoPagoTej: ((pick(row, ['ESTADO PAGO TEJ']) || 'PENDIENTE').toUpperCase() as ProgramaDetalle['estadoPagoTej']) || 'PENDIENTE',
      kgTintEnviado,
      kgTintRetornado,
      rollosFinal: n(pick(row, ['ROLLOS FINAL']), 0),
      kgMermaTint,
      pctMermaTint: kgTintEnviado > 0 ? Number(((kgMermaTint / kgTintEnviado) * 100).toFixed(2)) : 0,
      precioKgTint: precioTint,
      costoTint,
      estadoPagoTint: ((pick(row, ['ESTADO PAGO TINT']) || 'PENDIENTE').toUpperCase() as ProgramaDetalle['estadoPagoTint']) || 'PENDIENTE',
      costoHiloProrrateado: costoHilo,
      costoTotalColor: costoTotal,
      costoKgColor: kgTintRetornado > 0 ? Number((costoTotal / kgTintRetornado).toFixed(2)) : 0,
      notas: pick(row, ['NOTAS']),
    });
  });
};

const parseSeguimiento = (workbook: XLSX.WorkBook, builder: ImportBuilder) => {
  rowsAsRecords(workbook, 'TARIFAS', ['PRODUCTO', 'ORDEN', 'OPERACI']).forEach(row => {
    const productoId = builder.ensureProducto(pick(row, ['PRODUCTO']));
    builder.addTarifa(productoId, n(pick(row, ['ORDEN']), 0), pick(row, ['OPERACI', 'OPERACION']), n(pick(row, ['TARIFA']), 0), pick(row, ['NOTAS']));
  });

  rowsAsRecords(workbook, 'OPERARIOS', ['CODIGO', 'NOMBRES']).forEach(row => {
    const codigo = pick(row, ['CODIGO']);
    const fullName = pick(row, ['NOMBRES Y APELLIDOS', 'NOMBRES']);
    if (!codigo && !fullName) return;
    const [apellidos = '', nombres = fullName] = fullName.includes(',') ? fullName.split(',').map(v => v.trim()) : ['', fullName];
    builder.ensureOperario(codigo || fullName, {
      codigo,
      nombres,
      apellidos,
      dni: pick(row, ['DNI']),
      telefono: pick(row, ['TELEFONO']),
      maquinaAsignada: pick(row, ['MAQUINA']),
      modulo: pick(row, ['MODULO']),
      fechaIngreso: pick(row, ['INGRESO']) ? excelDate(pick(row, ['INGRESO'])) : '',
      estado: normalize(pick(row, ['ESTADO'])).includes('inactivo') ? 'INACTIVO' : 'ACTIVO',
    });
  });

  rowsAsRecords(workbook, 'CORTES', ['N CORTE', 'FECHA', 'PRODUCTO']).forEach((row, index) => {
    const nCorte = pick(row, ['N CORTE', 'CORTE']);
    const producto = pick(row, ['PRODUCTO']);
    if (!nCorte || !producto) return;
    const productoId = builder.ensureProducto(producto, {
      telaBaseId: pick(row, ['TELA']) ? builder.ensureTela(pick(row, ['TELA'])) : undefined,
    });
    const totalPrendas = n(pick(row, ['TOTAL PRENDAS', 'TOTAL']), n(pick(row, ['S'])) + n(pick(row, ['M'])) + n(pick(row, ['L'])) + n(pick(row, ['XL'])));
    const telaUsada = n(pick(row, ['KG']), 0);
    const corteId = `CORTE-XLS-${slug(`${nCorte}-${index}`, String(index))}`;
    const operario = pick(row, ['AYUDANTE']) || pick(row, ['CORTADOR']);
    const operarioId = operario ? builder.ensureOperario(operario) : '';
    builder.payload.cortes.push({
      id: corteId,
      fecha: excelDate(pick(row, ['FECHA'])),
      nCorte,
      clienteId: builder.ensureCliente(pick(row, ['CLIENTE']) || 'Sin cliente'),
      productoId,
      colorId: builder.ensureColor(pick(row, ['COLOR']) || 'Sin color'),
      cortadorId: pick(row, ['CORTADOR']) ? builder.ensureOperario(pick(row, ['CORTADOR'])) : operarioId,
      ayudanteId: operarioId,
      telaUsada,
      rollosUsados: n(pick(row, ['ROLLOS']), 0),
      tendidas: n(pick(row, ['TENDIDAS']), 0),
      mtsPorTendida: n(pick(row, ['MTS']), 0),
      ancho: n(pick(row, ['ANCHO']), 0.9),
      cantS: n(pick(row, ['S']), 0),
      cantM: n(pick(row, ['M']), 0),
      cantL: n(pick(row, ['L']), 0),
      cantXL: n(pick(row, ['XL']), 0),
      totalPrendas,
      consumo: totalPrendas > 0 ? Number((telaUsada / totalPrendas).toFixed(3)) : 0,
      rendimiento: telaUsada > 0 ? Number((totalPrendas / telaUsada).toFixed(2)) : 0,
      revision: normalize(pick(row, ['REVISION'])).includes('verificado') ? 'VERIFICADO' : 'PENDIENTE',
      estado: normalize(pick(row, ['ESTADO'])).includes('entregado') ? 'ENTREGADO' : 'EN_PROCESO',
    });

    if (operarioId) {
      builder.tarifasForProduct(productoId).forEach(tarifa => {
        builder.addAsignacionOperacion({
          idBase: `${corteId}-${operarioId}-${tarifa.orden}`,
          corteId,
          productoId,
          operarioId,
          operacionId: tarifa.id,
          operacion: tarifa.operacion,
          orden: tarifa.orden,
          tarifa: tarifa.tarifa,
          cantS: n(pick(row, ['S']), 0),
          cantM: n(pick(row, ['M']), 0),
          cantL: n(pick(row, ['L']), 0),
          cantXL: n(pick(row, ['XL']), 0),
          totalPrendas,
          importe: Number((totalPrendas * tarifa.tarifa).toFixed(2)),
          estadoPago: 'PENDIENTE',
        });
      });
    }
  });

  parseSeguimientoOperaciones(workbook, builder);
};

const parseSeguimientoOperaciones = (workbook: XLSX.WorkBook, builder: ImportBuilder) => {
  workbook.SheetNames
    .filter(sheetName => sheetName.startsWith('SEG_'))
    .forEach(sheetName => {
      const rows = readRows(workbook, sheetName);
      const productoNombre = text(rows[1]?.[1]);
      if (!productoNombre) return;

      const productoId = builder.ensureProducto(productoNombre);
      const headerIndex = rows.findIndex(row => row.some(cell => normalize(cell).includes('n corte')) && row.some(cell => normalize(cell).includes('cant')));
      if (headerIndex < 0) return;

      const header = rows[headerIndex];
      const avanceIndex = header.findIndex(cell => normalize(cell).includes('avance'));
      const pagoStartIndex = header.findIndex(cell => normalize(cell).startsWith('pago'));
      const opStartIndex = 5;
      const opEndIndex = avanceIndex > opStartIndex ? avanceIndex : Math.min(23, header.length);
      const pagoStart = pagoStartIndex >= 0 ? pagoStartIndex : 25;

      rows.slice(headerIndex + 1).forEach((row, rowOffset) => {
        const nCorte = cleanCorteNumber(row[0]);
        const fecha = excelDate(row[1]);
        const color = text(row[2]);
        const talla = text(row[3]).toUpperCase();
        const cantidad = n(row[4], 0);
        if (!nCorte || !color || !['S', 'M', 'L', 'XL'].includes(talla) || cantidad <= 0) return;

        const colorId = builder.ensureColor(color);
        const corte = builder.ensureCorteFromSeguimiento(nCorte, fecha, productoId, colorId, talla, cantidad);
        const cantidades = qtyByTalla(talla, cantidad);
        const tarifas = builder.tarifasForProduct(productoId);

        for (let opIndex = opStartIndex; opIndex < opEndIndex; opIndex += 1) {
          const operacion = text(header[opIndex]);
          const operarioCodigo = cleanOperarioCode(row[opIndex]);
          if (!operacion || !operarioCodigo) continue;

          const orden = opIndex - opStartIndex + 1;
          const tarifaCatalogo = tarifas.find(item => item.orden === orden);
          const pago = n(row[pagoStart + (opIndex - opStartIndex)], 0);
          const tarifa = tarifaCatalogo?.tarifa ?? (cantidad > 0 ? Number((pago / cantidad).toFixed(4)) : 0);
          const importe = pago > 0 ? pago : Number((cantidad * tarifa).toFixed(2));
          if (importe <= 0) continue;

          const operarioId = builder.ensureOperario(operarioCodigo, { codigo: operarioCodigo });
          builder.addAsignacionOperacion({
            idBase: `${sheetName}-${nCorte}-${color}-${talla}-${rowOffset}-${orden}-${operarioId}`,
            corteId: corte.id,
            productoId,
            operarioId,
            operacionId: tarifaCatalogo?.id ?? `OP-${productoId}-${orden}`,
            operacion,
            orden,
            tarifa,
            ...cantidades,
            totalPrendas: cantidad,
            importe: Number(importe.toFixed(2)),
            estadoPago: 'PENDIENTE',
          });
        }
      });
    });
};

export async function parseTexajoExcelFiles(files: File[], source: CatalogSource = {}): Promise<TexajoImportResult> {
  const builder = new ImportBuilder(source);

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    parseCatalogs(workbook, builder);
    parseConfig(workbook, builder);
    parseInventario(workbook, builder);
    parseCobros(workbook, builder);
    parseProgramas(workbook, builder);
    parseSeguimiento(workbook, builder);
  }

  const payload: TexajoImportPayload = Object.fromEntries(
    Object.entries(builder.payload).filter(([, value]) => Array.isArray(value) && value.length > 0)
  ) as TexajoImportPayload;
  if (Object.keys(builder.config).length > 0) payload.config = builder.config;

  return {
    payload,
    warnings: builder.warnings,
    summary: {
      files: files.length,
      clientes: builder.payload.clientes.length,
      proveedores: builder.payload.proveedores.length,
      telas: builder.payload.telas.length,
      colores: builder.payload.colores.length,
      productos: builder.payload.productos.length,
      movimientosTela: builder.payload.movimientosTela.length,
      movimientosComplementos: builder.payload.movimientosComplementos.length,
      cobrosDiarios: builder.payload.cobrosDiarios.length,
      programasZurzam: builder.payload.programasZurzam.length,
      comprasHilo: builder.payload.comprasHilo.length,
      programaDetalles: builder.payload.programaDetalles.length,
      operarios: builder.payload.operarios.length,
      cortes: builder.payload.cortes.length,
      tarifasOperaciones: builder.payload.tarifasOperaciones.length,
    },
  };
}

export async function parseTexajoGoogleSheets(urls: readonly string[] = TEXAJO_GOOGLE_SHEET_CSV_URLS, source: CatalogSource = {}): Promise<TexajoImportResult> {
  const builder = new ImportBuilder(source);
  const warnings: string[] = [];
  let loaded = 0;

  for (const url of urls) {
    try {
      const response = await fetch(asXlsxUrl(url), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      parseCatalogs(workbook, builder);
      parseConfig(workbook, builder);
      parseInventario(workbook, builder);
      parseCobros(workbook, builder);
      parseProgramas(workbook, builder);
      parseSeguimiento(workbook, builder);
      loaded += 1;
    } catch (error) {
      warnings.push(`No se pudo leer Google Sheet: ${url} (${error instanceof Error ? error.message : 'error desconocido'})`);
    }
  }

  const payload: TexajoImportPayload = Object.fromEntries(
    Object.entries(builder.payload).filter(([, value]) => Array.isArray(value) && value.length > 0)
  ) as TexajoImportPayload;
  if (Object.keys(builder.config).length > 0) payload.config = builder.config;

  return {
    payload,
    warnings: [...builder.warnings, ...warnings],
    summary: {
      files: loaded,
      clientes: builder.payload.clientes.length,
      proveedores: builder.payload.proveedores.length,
      telas: builder.payload.telas.length,
      colores: builder.payload.colores.length,
      productos: builder.payload.productos.length,
      movimientosTela: builder.payload.movimientosTela.length,
      movimientosComplementos: builder.payload.movimientosComplementos.length,
      cobrosDiarios: builder.payload.cobrosDiarios.length,
      programasZurzam: builder.payload.programasZurzam.length,
      comprasHilo: builder.payload.comprasHilo.length,
      programaDetalles: builder.payload.programaDetalles.length,
      operarios: builder.payload.operarios.length,
      cortes: builder.payload.cortes.length,
      tarifasOperaciones: builder.payload.tarifasOperaciones.length,
    },
  };
}
