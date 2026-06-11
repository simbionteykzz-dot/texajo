import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  Cliente, Proveedor, Tela, Color, PrecioTela, PrecioComplemento, PrecioTejeduria, PrecioTintoreria, Producto,
  TarifaOperacion, Operario, Config,
  MovimientoTela, Corte, SeguimientoFila, BoletaLinea, DescuentoBoleta,
  ProgramaZurzam, ProgramaDetalle, CompraHilo, StockExtorno, CobroDiario,
  MovimientoComplemento, ProductoColor,
  TexajoImportPayload
} from '../types';
import {
  mockClientes, mockProveedores, mockTelas, mockColores, mockPreciosTelas,
  mockPreciosComplementos, mockProductos, mockTarifasOperaciones, mockOperarios,
  initialConfig,
} from '../data';
import { db, loadAllFromDb, seedInitialData, loadProductoColores } from '../lib/supabaseDb';
import { supabase } from '../lib/supabase';
import type { AuthUser } from '../lib/useAuthUser';

const STORAGE_KEY = 'texajo_v3';

interface AppState {
  clientes: Cliente[];
  proveedores: Proveedor[];
  telas: Tela[];
  colores: Color[];
  preciosTelas: PrecioTela[];
  preciosComplementos: PrecioComplemento[];
  productos: Producto[];
  tarifasOperaciones: TarifaOperacion[];
  operarios: Operario[];
  movimientosTela: MovimientoTela[];
  cortes: Corte[];
  seguimientoFilas: SeguimientoFila[];
  boletaLineas: BoletaLinea[];
  descuentosBoleta: DescuentoBoleta[];
  movimientosComplemento: MovimientoComplemento[];
  programasZurzam: ProgramaZurzam[];
  programaDetalles: ProgramaDetalle[];
  comprasHilo: CompraHilo[];
  stockExtornos: StockExtorno[];
  cobrosDiarios: CobroDiario[];
  preciosTejeduria: PrecioTejeduria[];
  preciosTintoreria: PrecioTintoreria[];
  productoColores: ProductoColor[];
  config: Config;
}

const defaultState = (): AppState => ({
  clientes: mockClientes,
  proveedores: mockProveedores,
  telas: mockTelas,
  colores: mockColores,
  preciosTelas: mockPreciosTelas,
  preciosComplementos: mockPreciosComplementos,
  productos: mockProductos,
  tarifasOperaciones: mockTarifasOperaciones,
  operarios: mockOperarios,
  movimientosTela: [],
  cortes: [],
  seguimientoFilas: [],
  boletaLineas: [],
  descuentosBoleta: [],
  movimientosComplemento: [],
  programasZurzam: [],
  programaDetalles: [],
  comprasHilo: [],
  stockExtornos: [],
  cobrosDiarios: [],
  preciosTejeduria: [],
  preciosTintoreria: [],
  productoColores: [],
  config: initialConfig,
});

const loadLocalState = (): AppState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as AppState;
  } catch { /* ignorar */ }
  return null;
};

const mergeById = <T extends { id: string }>(current: T[], incoming?: T[]): T[] => {
  if (!incoming?.length) return current;
  const map = new Map(current.map(item => [item.id, item]));
  incoming.forEach(item => map.set(item.id, { ...map.get(item.id), ...item }));
  return Array.from(map.values());
};

interface AppContextProps extends AppState {
  dbReady: boolean;
  // Movimientos Tela
  addMovimientoTela: (m: MovimientoTela) => void;
  updateMovimientoTela: (id: string, updates: Partial<MovimientoTela>) => void;
  deleteMovimientoTela: (id: string) => void;
  // Cortes
  addCorte: (c: Corte) => void;
  updateCorte: (id: string, updates: Partial<Corte>) => void;
  deleteCorte: (id: string) => void;
  // Seguimiento
  addSeguimientoFila: (f: SeguimientoFila) => void;
  updateSeguimientoFila: (id: string, updates: Partial<SeguimientoFila>) => void;
  deleteSeguimientoFila: (id: string) => void;
  // Complementos
  addMovimientoComplemento: (m: MovimientoComplemento) => void;
  deleteMovimientoComplemento: (id: string) => void;
  // Destajo/Boleta
  addBoletaLinea: (b: BoletaLinea) => void;
  addBoletaLineas: (bs: BoletaLinea[]) => void;
  updateBoletaLinea: (id: string, updates: Partial<BoletaLinea>) => void;
  deleteBoletaLinea: (id: string) => void;
  addDescuentoBoleta: (d: DescuentoBoleta) => void;
  updateDescuentoBoleta: (id: string, updates: Partial<DescuentoBoleta>) => void;
  deleteDescuentoBoleta: (id: string) => void;
  // Cobros
  addCobroDiario: (c: CobroDiario) => void;
  updateCobroDiario: (id: string, updates: Partial<CobroDiario>) => void;
  deleteCobroDiario: (id: string) => void;
  // Programas
  addPrograma: (p: ProgramaZurzam) => void;
  updatePrograma: (id: string, updates: Partial<ProgramaZurzam>) => void;
  deletePrograma: (id: string) => void;
  addProgramaDetalle: (d: ProgramaDetalle) => void;
  updateProgramaDetalle: (id: string, updates: Partial<ProgramaDetalle>) => void;
  deleteProgramaDetalle: (id: string) => void;
  addCompraHilo: (c: CompraHilo) => void;
  updateCompraHilo: (id: string, updates: Partial<CompraHilo>) => void;
  deleteCompraHilo: (id: string) => void;
  addStockExtorno: (s: StockExtorno) => void;
  updateStockExtorno: (id: string, updates: Partial<StockExtorno>) => void;
  deleteStockExtorno: (id: string) => void;
  // Catálogos
  addCliente: (c: Cliente) => void;
  updateCliente: (id: string, updates: Partial<Cliente>) => void;
  addProveedor: (p: Proveedor) => void;
  updateProveedor: (id: string, updates: Partial<Proveedor>) => void;
  addTela: (t: Tela) => void;
  updateTela: (id: string, updates: Partial<Tela>) => void;
  deleteTela: (id: string) => void;
  addColor: (c: Color) => void;
  updateColor: (id: string, updates: Partial<Color>) => void;
  deleteColor: (id: string) => void;
  addPrecioTela: (p: PrecioTela) => void;
  updatePrecioTela: (id: string, updates: Partial<PrecioTela>) => void;
  deletePrecioTela: (id: string) => void;
  addProducto: (p: Producto) => void;
  updateProducto: (id: string, updates: Partial<Producto>) => void;
  deleteProducto: (id: string) => void;
  addTarifaOperacion: (t: TarifaOperacion) => void;
  updateTarifaOperacion: (id: string, updates: Partial<TarifaOperacion>) => void;
  deleteTarifaOperacion: (id: string) => void;
  addPrecioComplemento: (p: PrecioComplemento) => void;
  updatePrecioComplemento: (id: string, updates: Partial<PrecioComplemento>) => void;
  deletePrecioComplemento: (id: string) => void;
  addOperario: (o: Operario) => void;
  updateOperario: (id: string, updates: Partial<Operario>) => void;
  deleteOperario: (id: string) => void;
  // Precios Tejeduría
  addPrecioTejeduria: (p: PrecioTejeduria) => void;
  updatePrecioTejeduria: (id: string, updates: Partial<PrecioTejeduria>) => void;
  deletePrecioTejeduria: (id: string) => void;
  // Precios Tintorería
  addPrecioTintoreria: (p: PrecioTintoreria) => void;
  updatePrecioTintoreria: (id: string, updates: Partial<PrecioTintoreria>) => void;
  deletePrecioTintoreria: (id: string) => void;
  // Proporciones por color
  addProductoColor: (pc: ProductoColor) => void;
  updateProductoColor: (id: string, updates: Partial<ProductoColor>) => void;
  deleteProductoColor: (id: string) => void;
  // Helper para crear color + producto_color en secuencia (espera ID real de Supabase)
  addColorConProductoColor: (color: Color, pc: Omit<ProductoColor, 'colorId'> | null) => Promise<string>;
  // Config
  updateConfig: (updates: Partial<Config>) => void;
  // Import / Reset
  importData: (payload: TexajoImportPayload) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Mapeo de campo de AppState → nombre de tabla en Supabase
const FIELD_TO_TABLE: Partial<Record<keyof AppState, string>> = {
  movimientosTela:       'movimientos_tela',
  cortes:                'cortes',
  seguimientoFilas:      'seguimiento_filas',
  movimientosComplemento:'movimientos_complemento',
  boletaLineas:          'boleta_lineas',
  descuentosBoleta:      'descuentos_boleta',
  cobrosDiarios:         'cobros_diarios',
  programasZurzam:       'programas_zurzam',
  programaDetalles:      'programa_detalles',
  comprasHilo:           'compras_hilo',
  stockExtornos:         'stock_extornos',
  clientes:              'clientes',
  proveedores:           'proveedores',
  telas:                 'telas',
  colores:               'colores',
  preciosTelas:          'precios_telas',
  preciosComplementos:   'precios_complementos',
  productos:             'productos',
  tarifasOperaciones:    'tarifas_operaciones',
  operarios:             'operarios',
  preciosTejeduria:      'precios_tejeduria',
  preciosTintoreria:     'precios_tintoreria',
  productoColores:       'producto_colores',
};

// Extrae una descripción legible de un registro
function describeRecord(entidad: string, record: Record<string, unknown>): string {
  const r = record as Record<string, unknown>;
  return (r['nombre'] || r['id'] || r['nCorte'] || r['nFactura'] || entidad) as string;
}

export function AppProvider({ children, authUser }: { children: ReactNode; authUser?: AuthUser | null }) {
  const [state, setState] = useState<AppState>(() => loadLocalState() ?? defaultState());
  const [dbReady, setDbReady] = useState(false);
  const authUserRef = useRef(authUser);
  useEffect(() => { authUserRef.current = authUser; }, [authUser]);

  const auditLog = useCallback(async (
    accion: 'CREATE' | 'UPDATE' | 'DELETE',
    entidad: string,
    entidad_id: string,
    entidad_desc: string,
    valores_ant?: Record<string, unknown>,
    valores_new?: Record<string, unknown>,
  ) => {
    const u = authUserRef.current;
    try {
      await supabase.from('audit_logs').insert({
        user_id:     u?.id ?? null,
        user_email:  u?.email ?? '',
        user_nombre: u?.nombre ?? '',
        accion, entidad, entidad_id, entidad_desc,
        valores_ant: valores_ant ?? null,
        valores_new: valores_new ?? null,
      });
    } catch { /* silencioso */ }
  }, []);

  // ── Carga inicial desde Supabase ──────────────────────────────────────────
  useEffect(() => {
    // Limpia caché local para evitar mezcla entre sesiones distintas
    localStorage.removeItem(STORAGE_KEY);
    loadAllFromDb()
      .then(async (remote) => {
        // Solo sembrar datos mock si Supabase respondió sin errores Y las tablas están vacías
        // (primera vez que se usa el sistema). Si hay error en loadAllFromDb, lanza y va al catch.
        const isFirstTime =
          remote.clientes.length === 0 &&
          remote.telas.length === 0 &&
          remote.productos.length === 0 &&
          remote.operarios.length === 0;

        if (isFirstTime) {
          // Primer login: sembrar datos maestros en Supabase
          const base = defaultState();
          await seedInitialData({
            clientes: base.clientes,
            proveedores: base.proveedores,
            telas: base.telas,
            colores: base.colores,
            preciosTelas: base.preciosTelas,
            preciosComplementos: base.preciosComplementos,
            preciosTejeduria: base.preciosTejeduria,
            productos: base.productos,
            tarifasOperaciones: base.tarifasOperaciones,
            operarios: base.operarios,
            movimientosTela: [],
            cortes: [],
            seguimientoFilas: [],
            boletaLineas: [],
            descuentosBoleta: [],
            programasZurzam: [],
            programaDetalles: [],
            comprasHilo: [],
            stockExtornos: [],
            cobrosDiarios: [],
            movimientosComplemento: [],
            preciosTintoreria: [],
            productoColores: [],
            config: base.config,
          });
          setState(base);
        } else {
          setState({
            clientes:              remote.clientes.length          ? remote.clientes              : defaultState().clientes,
            proveedores:           remote.proveedores.length        ? remote.proveedores           : defaultState().proveedores,
            telas:                 remote.telas.length              ? remote.telas                 : defaultState().telas,
            colores:               remote.colores.length            ? remote.colores               : defaultState().colores,
            preciosTelas:          remote.preciosTelas.length       ? remote.preciosTelas          : defaultState().preciosTelas,
            preciosComplementos:   remote.preciosComplementos.length ? remote.preciosComplementos  : defaultState().preciosComplementos,
            preciosTejeduria:      remote.preciosTejeduria,
            preciosTintoreria:     remote.preciosTintoreria,
            productos:             remote.productos.length          ? remote.productos             : defaultState().productos,
            tarifasOperaciones:    remote.tarifasOperaciones.length ? remote.tarifasOperaciones    : defaultState().tarifasOperaciones,
            operarios:             remote.operarios.length          ? remote.operarios             : defaultState().operarios,
            movimientosTela:       remote.movimientosTela,
            cortes:                remote.cortes,
            seguimientoFilas:      remote.seguimientoFilas,
            boletaLineas:          remote.boletaLineas,
            descuentosBoleta:      remote.descuentosBoleta,
            movimientosComplemento: remote.movimientosComplemento,
            programasZurzam:       remote.programasZurzam,
            programaDetalles:      remote.programaDetalles,
            comprasHilo:           remote.comprasHilo,
            stockExtornos:         remote.stockExtornos,
            cobrosDiarios:         remote.cobrosDiarios,
            productoColores:       remote.productoColores,
            config:                remote.config ?? defaultState().config,
          });
        }
        setDbReady(true);
      })
      .catch((err) => {
        console.error('[Supabase] loadAllFromDb falló — usando caché local:', err);
        setDbReady(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-refresh producto_colores cada 3 minutos ─────────────────────────
  useEffect(() => {
    if (!dbReady) return;
    const INTERVAL = 3 * 60 * 1000;
    const tick = () =>
      loadProductoColores().then(fresh => {
        if (fresh.length > 0)
          setState(p => ({ ...p, productoColores: fresh }));
      }).catch(() => { /* silencioso */ });
    const id = setInterval(tick, INTERVAL);
    return () => clearInterval(id);
  }, [dbReady]);

  // ── Caché local (fallback offline) ───────────────────────────────────────
  useEffect(() => {
    if (!dbReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignorar */ }
  }, [state, dbReady]);

  // ── Helper de mutación: actualiza estado local + persiste en Supabase ────
  const set = useCallback((updater: (prev: AppState) => AppState) => setState(updater), []);

  // ─── Helpers de mutación con Supabase ────────────────────────────────────

  const logDbError = (op: string, field: keyof AppState, err: unknown) => {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error(`[Supabase] ${op} en ${String(field)} falló:`, msg, err);
    // Mostrar en pantalla para detectar pérdidas silenciosas de datos
    const detail = (err as { details?: string; hint?: string })?.details ?? (err as { hint?: string })?.hint ?? '';
    window.dispatchEvent(new CustomEvent('supabase-error', { detail: `${op} ${String(field)}: ${msg}${detail ? ' — ' + detail : ''}` }));
  };

  function makeAdd<T>(
    field: keyof AppState,
    dbAdd: (v: T) => Promise<void> | Promise<string | null>
  ) {
    return (v: T) => {
      const tempId = (v as Record<string, unknown>)['id'] as string | undefined;
      set(p => ({ ...p, [field]: [...(p[field] as T[]), v] }));
      dbAdd(v).then(realId => {
        if (realId && tempId && realId !== tempId) {
          set(p => ({
            ...p,
            [field]: (p[field] as { id: string }[]).map(x =>
              x.id === tempId ? { ...x, id: realId } : x
            ) as AppState[typeof field],
          }));
        }
      }).catch(err => logDbError('INSERT', field, err));
      const entidad = FIELD_TO_TABLE[field] ?? String(field);
      const rec = v as Record<string, unknown>;
      auditLog('CREATE', entidad, String(rec['id'] ?? ''), describeRecord(entidad, rec), undefined, rec);
    };
  }

  function makeUpdate<T extends { id: string }>(
    field: keyof AppState,
    dbUpdate: (id: string, updates: Partial<T>, cur: T) => Promise<void>
  ) {
    return (id: string, updates: Partial<T>) => {
      // Leer cur del estado actual del cierre (snapshot síncrono antes del setState)
      const arr = (state[field] as unknown) as T[];
      const cur = arr.find(x => x.id === id);
      set(p => ({ ...p, [field]: (p[field] as unknown as T[]).map(x => x.id === id ? { ...x, ...updates } : x) as AppState[typeof field] }));
      if (cur) {
        const entidad = FIELD_TO_TABLE[field] ?? String(field);
        dbUpdate(id, updates, cur).catch(err => logDbError('UPDATE', field, err));
        auditLog('UPDATE', entidad, id, describeRecord(entidad, cur as Record<string, unknown>),
          cur as Record<string, unknown>,
          { ...cur, ...updates } as Record<string, unknown>
        );
      }
    };
  }

  function makeDelete(
    field: keyof AppState,
    dbDel: (id: string) => Promise<void>
  ) {
    return (id: string) => {
      let cur: { id: string } | undefined;
      set(p => {
        const arr = p[field] as { id: string }[];
        cur = arr.find(x => x.id === id);
        return { ...p, [field]: arr.filter(x => x.id !== id) };
      });
      dbDel(id).catch(err => logDbError('DELETE', field, err));
      if (cur) {
        const entidad = FIELD_TO_TABLE[field] ?? String(field);
        auditLog('DELETE', entidad, id, describeRecord(entidad, cur as Record<string, unknown>), cur as Record<string, unknown>, undefined);
      }
    };
  }

  // ─── Movimientos Tela ────────────────────────────────────────────────────
  const addMovimientoTela = makeAdd<MovimientoTela>('movimientosTela', db.movimientosTela.add);
  const updateMovimientoTela = makeUpdate<MovimientoTela>('movimientosTela', db.movimientosTela.update);
  const deleteMovimientoTela = makeDelete('movimientosTela', db.movimientosTela.delete);

  // ─── Cortes ──────────────────────────────────────────────────────────────
  const addCorte = (v: Corte) => {
    set(p => ({ ...p, cortes: [...p.cortes, v] }));
    db.cortes.add(v)
      .then(realId => {
        if (realId && realId !== v.id) {
          // Actualizar el id local con el integer real de Supabase
          set(p => ({
            ...p,
            cortes: p.cortes.map(c => c.id === v.id ? { ...c, id: realId } : c),
            seguimientoFilas: p.seguimientoFilas.map(f => f.corteId === v.id ? { ...f, corteId: realId } : f),
            boletaLineas: p.boletaLineas.map(b => b.corteId === v.id ? { ...b, corteId: realId } : b),
          }));
        }
      })
      .catch(err => logDbError('INSERT', 'cortes', err));
    const rec = v as unknown as Record<string, unknown>;
    auditLog('CREATE', 'cortes', String(v.id), describeRecord('cortes', rec), undefined, rec);
  };
  const updateCorte = makeUpdate<Corte>('cortes', db.cortes.update);
  const deleteCorte = (id: string) => {
    set(p => ({
      ...p,
      cortes: p.cortes.filter(x => x.id !== id),
      seguimientoFilas: p.seguimientoFilas.filter(x => x.corteId !== id),
      boletaLineas: p.boletaLineas.filter(x => x.corteId !== id),
    }));
    Promise.all([
      db.seguimientoFilas.deleteByCorteId(id),
      db.boletaLineas.deleteByCorteId(id),
    ])
      .then(() => db.cortes.delete(id))
      .catch(err => logDbError('DELETE cascade', 'cortes', err));
  };

  // ─── Seguimiento ─────────────────────────────────────────────────────────
  const addSeguimientoFila = makeAdd<SeguimientoFila>('seguimientoFilas', db.seguimientoFilas.add);
  const updateSeguimientoFila = makeUpdate<SeguimientoFila>('seguimientoFilas', db.seguimientoFilas.update);
  const deleteSeguimientoFila = makeDelete('seguimientoFilas', db.seguimientoFilas.delete);

  // ─── Complementos ────────────────────────────────────────────────────────
  const addMovimientoComplemento = makeAdd<MovimientoComplemento>('movimientosComplemento', db.movimientosComplemento.add);
  const deleteMovimientoComplemento = makeDelete('movimientosComplemento', db.movimientosComplemento.delete);

  // ─── Boleta / Destajo ────────────────────────────────────────────────────
  const addBoletaLinea = makeAdd<BoletaLinea>('boletaLineas', db.boletaLineas.add);
  const addBoletaLineas = (bs: BoletaLinea[]) => {
    set(p => ({ ...p, boletaLineas: [...p.boletaLineas, ...bs] }));
    bs.forEach(b => db.boletaLineas.add(b).catch(console.error));
  };
  const updateBoletaLinea = makeUpdate<BoletaLinea>('boletaLineas', db.boletaLineas.update);
  const deleteBoletaLinea = makeDelete('boletaLineas', db.boletaLineas.delete);

  const addDescuentoBoleta = makeAdd<DescuentoBoleta>('descuentosBoleta', db.descuentosBoleta.add);
  const updateDescuentoBoleta = makeUpdate<DescuentoBoleta>('descuentosBoleta', db.descuentosBoleta.update);
  const deleteDescuentoBoleta = makeDelete('descuentosBoleta', db.descuentosBoleta.delete);

  // ─── Cobros ──────────────────────────────────────────────────────────────
  const addCobroDiario = makeAdd<CobroDiario>('cobrosDiarios', db.cobrosDiarios.add);
  const updateCobroDiario = makeUpdate<CobroDiario>('cobrosDiarios', db.cobrosDiarios.update);
  const deleteCobroDiario = makeDelete('cobrosDiarios', db.cobrosDiarios.delete);

  // ─── Programas Zurzam ────────────────────────────────────────────────────
  const addPrograma = makeAdd<ProgramaZurzam>('programasZurzam', db.programasZurzam.add);
  const updatePrograma = makeUpdate<ProgramaZurzam>('programasZurzam', db.programasZurzam.update);
  const deletePrograma = (id: string) => {
    set(p => ({
      ...p,
      programasZurzam: p.programasZurzam.filter(x => x.id !== id),
      programaDetalles: p.programaDetalles.filter(x => x.programaId !== id),
      comprasHilo: p.comprasHilo.filter(x => x.programaId !== id),
    }));
    db.programasZurzam.delete(id).catch(console.error);
  };

  const addProgramaDetalle = makeAdd<ProgramaDetalle>('programaDetalles', db.programaDetalles.add);
  const updateProgramaDetalle = makeUpdate<ProgramaDetalle>('programaDetalles', db.programaDetalles.update);
  const deleteProgramaDetalle = makeDelete('programaDetalles', db.programaDetalles.delete);

  const addCompraHilo = makeAdd<CompraHilo>('comprasHilo', db.comprasHilo.add);
  const updateCompraHilo = makeUpdate<CompraHilo>('comprasHilo', db.comprasHilo.update);
  const deleteCompraHilo = makeDelete('comprasHilo', db.comprasHilo.delete);

  const addStockExtorno = makeAdd<StockExtorno>('stockExtornos', db.stockExtornos.add);
  const updateStockExtorno = makeUpdate<StockExtorno>('stockExtornos', db.stockExtornos.update);
  const deleteStockExtorno = makeDelete('stockExtornos', db.stockExtornos.delete);

  // ─── Catálogos ───────────────────────────────────────────────────────────
  const addCliente = makeAdd<Cliente>('clientes', db.clientes.add);
  const updateCliente = makeUpdate<Cliente>('clientes', db.clientes.update);

  const addProveedor = makeAdd<Proveedor>('proveedores', db.proveedores.add);
  const updateProveedor = makeUpdate<Proveedor>('proveedores', db.proveedores.update);

  const addTela = makeAdd<Tela>('telas', db.telas.add);
  const updateTela = makeUpdate<Tela>('telas', db.telas.update);
  const deleteTela = makeDelete('telas', db.telas.delete);

  const addColor = makeAdd<Color>('colores', db.colores.add);
  const updateColor = makeUpdate<Color>('colores', db.colores.update);
  const deleteColor = makeDelete('colores', db.colores.delete);

  // Inserta color en Supabase, espera el ID real, luego inserta producto_color con ese ID
  const addColorConProductoColor = useCallback(async (color: Color, pc: Omit<ProductoColor, 'colorId'> | null): Promise<string> => {
    const tempId = color.id;
    set(p => ({ ...p, colores: [...p.colores, color] }));
    let realId: string;
    try {
      realId = await db.colores.add(color) ?? tempId;
    } catch (err) {
      console.error('[addColorConPC] INSERT colores falló RAW:', JSON.stringify(err), err);
      logDbError('INSERT', 'colores', err);
      realId = tempId;
    }
    if (realId !== tempId) {
      set(p => ({ ...p, colores: p.colores.map(c => c.id === tempId ? { ...c, id: realId } : c) }));
    }
    if (pc) {
      const pcFull: ProductoColor = { ...pc, colorId: realId };
      set(p => ({ ...p, productoColores: [...p.productoColores, pcFull] }));
      db.productoColores.add(pcFull).then(realPcId => {
        if (realPcId && realPcId !== pcFull.id) {
          set(p => ({ ...p, productoColores: p.productoColores.map(x => x.id === pcFull.id ? { ...x, id: realPcId } : x) }));
        }
      }).catch(err => logDbError('INSERT', 'productoColores', err));
    }
    return realId;
  }, [set]);

  const addPrecioTela = makeAdd<PrecioTela>('preciosTelas', db.preciosTelas.add);
  const updatePrecioTela = makeUpdate<PrecioTela>('preciosTelas', db.preciosTelas.update);
  const deletePrecioTela = makeDelete('preciosTelas', db.preciosTelas.delete);

  const addProducto = makeAdd<Producto>('productos', db.productos.add);
  const updateProducto = makeUpdate<Producto>('productos', db.productos.update);
  const deleteProducto = (id: string) => {
    set(p => ({
      ...p,
      productos: p.productos.filter(x => x.id !== id),
      tarifasOperaciones: p.tarifasOperaciones.filter(x => x.productoId !== id),
    }));
    db.productos.delete(id).catch(console.error);
  };

  const addTarifaOperacion = makeAdd<TarifaOperacion>('tarifasOperaciones', db.tarifasOperaciones.add);
  const updateTarifaOperacion = makeUpdate<TarifaOperacion>('tarifasOperaciones', db.tarifasOperaciones.update);
  const deleteTarifaOperacion = makeDelete('tarifasOperaciones', db.tarifasOperaciones.delete);

  const addPrecioComplemento = makeAdd<PrecioComplemento>('preciosComplementos', db.preciosComplementos.add);
  const deletePrecioComplemento = makeDelete('preciosComplementos', db.preciosComplementos.delete);

  const updatePrecioComplemento = (id: string, updates: Partial<PrecioComplemento>) => {
    let cur: PrecioComplemento | undefined;
    set(p => {
      cur = p.preciosComplementos.find(x => x.id === id);
      return { ...p, preciosComplementos: p.preciosComplementos.map(x => x.id === id ? { ...x, ...updates } : x) };
    });
    if (cur) {
      db.preciosComplementos.update(id, updates, cur).catch(err => logDbError('UPDATE', 'preciosComplementos', err));
      const curRec = cur as unknown as Record<string, unknown>;
      auditLog('UPDATE', 'precios_complementos', id, describeRecord('precios_complementos', curRec),
        curRec,
        { ...curRec, ...(updates as unknown as Record<string, unknown>) }
      );
    }
  };

  const addOperario = makeAdd<Operario>('operarios', db.operarios.add);
  const updateOperario = makeUpdate<Operario>('operarios', db.operarios.update);
  const deleteOperario = makeDelete('operarios', db.operarios.delete);

  const addPrecioTejeduria = makeAdd<PrecioTejeduria>('preciosTejeduria', db.preciosTejeduria.add);
  const updatePrecioTejeduria = makeUpdate<PrecioTejeduria>('preciosTejeduria', db.preciosTejeduria.update);
  const deletePrecioTejeduria = makeDelete('preciosTejeduria', db.preciosTejeduria.delete);

  const addPrecioTintoreria = makeAdd<PrecioTintoreria>('preciosTintoreria', db.preciosTintoreria.add);
  const updatePrecioTintoreria = makeUpdate<PrecioTintoreria>('preciosTintoreria', db.preciosTintoreria.update);
  const deletePrecioTintoreria = makeDelete('preciosTintoreria', db.preciosTintoreria.delete);

  const addProductoColor = makeAdd<ProductoColor>('productoColores', db.productoColores.add);
  const updateProductoColor = makeUpdate<ProductoColor>('productoColores', db.productoColores.update);
  const deleteProductoColor = makeDelete('productoColores', db.productoColores.delete);

  // ─── Config ──────────────────────────────────────────────────────────────
  const updateConfig = (updates: Partial<Config>) => {
    let newConfig: Config | undefined;
    set(p => {
      newConfig = { ...p.config, ...updates };
      return { ...p, config: newConfig };
    });
    if (newConfig) db.config.upsert(newConfig).catch(err => logDbError('UPSERT', 'config', err));
  };

  // ─── Import / Reset ──────────────────────────────────────────────────────
  const importData = (payload: TexajoImportPayload) =>
    set(p => ({
      ...p,
      clientes:               mergeById(p.clientes, payload.clientes),
      proveedores:            mergeById(p.proveedores, payload.proveedores),
      telas:                  mergeById(p.telas, payload.telas),
      colores:                mergeById(p.colores, payload.colores),
      preciosTelas:           mergeById(p.preciosTelas, payload.preciosTelas),
      preciosComplementos:    mergeById(p.preciosComplementos, payload.preciosComplementos),
      productos:              mergeById(p.productos, payload.productos),
      tarifasOperaciones:     mergeById(p.tarifasOperaciones, payload.tarifasOperaciones),
      operarios:              mergeById(p.operarios, payload.operarios),
      movimientosTela:        mergeById(p.movimientosTela, payload.movimientosTela),
      movimientosComplemento: mergeById(p.movimientosComplemento, payload.movimientosComplemento),
      cortes:                 mergeById(p.cortes, payload.cortes),
      seguimientoFilas:       mergeById(p.seguimientoFilas, payload.seguimientoFilas),
      boletaLineas:           mergeById(p.boletaLineas, payload.boletaLineas),
      descuentosBoleta:       mergeById(p.descuentosBoleta, payload.descuentosBoleta),
      programasZurzam:        mergeById(p.programasZurzam, payload.programasZurzam),
      programaDetalles:       mergeById(p.programaDetalles, payload.programaDetalles),
      comprasHilo:            mergeById(p.comprasHilo, payload.comprasHilo),
      stockExtornos:          mergeById(p.stockExtornos, payload.stockExtornos),
      cobrosDiarios:          mergeById(p.cobrosDiarios, payload.cobrosDiarios),
      preciosTejeduria:       mergeById(p.preciosTejeduria, payload.preciosTejeduria),
      config:                 payload.config ? { ...p.config, ...payload.config } : p.config,
    }));

  const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState());
  };

  return (
    <AppContext.Provider value={{
      ...state,
      dbReady,
      addMovimientoTela, updateMovimientoTela, deleteMovimientoTela,
      addMovimientoComplemento, deleteMovimientoComplemento,
      addCorte, updateCorte, deleteCorte,
      addSeguimientoFila, updateSeguimientoFila, deleteSeguimientoFila,
      addBoletaLinea, addBoletaLineas, updateBoletaLinea, deleteBoletaLinea,
      addDescuentoBoleta, updateDescuentoBoleta, deleteDescuentoBoleta,
      addCobroDiario, updateCobroDiario, deleteCobroDiario,
      addPrograma, updatePrograma, deletePrograma,
      addProgramaDetalle, updateProgramaDetalle, deleteProgramaDetalle,
      addCompraHilo, updateCompraHilo, deleteCompraHilo,
      addStockExtorno, updateStockExtorno, deleteStockExtorno,
      addCliente, updateCliente,
      addProveedor, updateProveedor,
      addTela, updateTela, deleteTela,
      addColor, updateColor, deleteColor, addColorConProductoColor,
      addPrecioTela, updatePrecioTela, deletePrecioTela,
      addProducto, updateProducto, deleteProducto,
      addTarifaOperacion, updateTarifaOperacion, deleteTarifaOperacion,
      addPrecioComplemento, updatePrecioComplemento, deletePrecioComplemento,
      addOperario, updateOperario, deleteOperario,
      addPrecioTejeduria, updatePrecioTejeduria, deletePrecioTejeduria,
      addPrecioTintoreria, updatePrecioTintoreria, deletePrecioTintoreria,
      addProductoColor, updateProductoColor, deleteProductoColor,
      updateConfig, importData, clearAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
