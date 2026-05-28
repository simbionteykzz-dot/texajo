import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Cliente, Proveedor, Tela, Color, PrecioTela, PrecioComplemento, Producto,
  TarifaOperacion, Operario, Config,
  MovimientoTela, Corte, SeguimientoFila, BoletaLinea,
  ProgramaZurzam, ProgramaDetalle, CompraHilo, CobroDiario,
  TexajoImportPayload
} from '../types';
import {
  mockClientes, mockProveedores, mockTelas, mockColores, mockPreciosTelas,
  mockPreciosComplementos, mockProductos, mockTarifasOperaciones, mockOperarios,
  initialConfig, initialMovimientosTela, initialCortes, initialSeguimientoFilas,
  initialBoletaLineas, initialProgramas, initialProgramaDetalles,
  initialComprasHilo, initialCobros
} from '../data';

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
  programasZurzam: ProgramaZurzam[];
  programaDetalles: ProgramaDetalle[];
  comprasHilo: CompraHilo[];
  cobrosDiarios: CobroDiario[];
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
  movimientosTela: initialMovimientosTela,
  cortes: initialCortes,
  seguimientoFilas: initialSeguimientoFilas,
  boletaLineas: initialBoletaLineas,
  programasZurzam: initialProgramas,
  programaDetalles: initialProgramaDetalles,
  comprasHilo: initialComprasHilo,
  cobrosDiarios: initialCobros,
  config: initialConfig,
});

const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppState>;
      const base = defaultState();
      return {
        clientes:             parsed.clientes?.length          ? parsed.clientes          : base.clientes,
        proveedores:          parsed.proveedores?.length        ? parsed.proveedores       : base.proveedores,
        telas:                parsed.telas?.length              ? parsed.telas             : base.telas,
        colores:              parsed.colores?.length            ? parsed.colores           : base.colores,
        preciosTelas:         parsed.preciosTelas?.length       ? parsed.preciosTelas      : base.preciosTelas,
        preciosComplementos:  parsed.preciosComplementos?.length ? parsed.preciosComplementos : base.preciosComplementos,
        productos:            parsed.productos?.length           ? parsed.productos         : base.productos,
        tarifasOperaciones:   parsed.tarifasOperaciones?.length  ? parsed.tarifasOperaciones : base.tarifasOperaciones,
        operarios:            parsed.operarios?.length           ? parsed.operarios          : base.operarios,
        movimientosTela:      parsed.movimientosTela             ?? base.movimientosTela,
        cortes:               parsed.cortes                      ?? base.cortes,
        seguimientoFilas:     parsed.seguimientoFilas            ?? base.seguimientoFilas,
        boletaLineas:         parsed.boletaLineas                ?? base.boletaLineas,
        programasZurzam:      parsed.programasZurzam             ?? base.programasZurzam,
        programaDetalles:     parsed.programaDetalles            ?? base.programaDetalles,
        comprasHilo:          parsed.comprasHilo                 ?? base.comprasHilo,
        cobrosDiarios:        parsed.cobrosDiarios               ?? base.cobrosDiarios,
        config:               parsed.config ? { ...base.config, ...parsed.config } : base.config,
      };
    }
  } catch (e) {
    console.warn('Error cargando estado local', e);
  }
  return defaultState();
};

const mergeById = <T extends { id: string }>(current: T[], incoming?: T[]): T[] => {
  if (!incoming?.length) return current;
  const map = new Map(current.map(item => [item.id, item]));
  incoming.forEach(item => map.set(item.id, { ...map.get(item.id), ...item }));
  return Array.from(map.values());
};

interface AppContextProps extends AppState {
  // Movimientos Tela
  addMovimientoTela: (m: MovimientoTela) => void;
  updateMovimientoTela: (id: string, updates: Partial<MovimientoTela>) => void;
  // Cortes
  addCorte: (c: Corte) => void;
  updateCorte: (id: string, updates: Partial<Corte>) => void;
  // Seguimiento
  addSeguimientoFila: (f: SeguimientoFila) => void;
  updateSeguimientoFila: (id: string, updates: Partial<SeguimientoFila>) => void;
  // Destajo/Boleta
  addBoletaLinea: (b: BoletaLinea) => void;
  addBoletaLineas: (bs: BoletaLinea[]) => void;
  updateBoletaLinea: (id: string, updates: Partial<BoletaLinea>) => void;
  // Cobros
  addCobroDiario: (c: CobroDiario) => void;
  updateCobroDiario: (id: string, updates: Partial<CobroDiario>) => void;
  // Programas
  addPrograma: (p: ProgramaZurzam) => void;
  updatePrograma: (id: string, updates: Partial<ProgramaZurzam>) => void;
  addProgramaDetalle: (d: ProgramaDetalle) => void;
  updateProgramaDetalle: (id: string, updates: Partial<ProgramaDetalle>) => void;
  addCompraHilo: (c: CompraHilo) => void;
  updateCompraHilo: (id: string, updates: Partial<CompraHilo>) => void;
  // Catálogos
  addCliente: (c: Cliente) => void;
  updateCliente: (id: string, updates: Partial<Cliente>) => void;
  addProveedor: (p: Proveedor) => void;
  updateProveedor: (id: string, updates: Partial<Proveedor>) => void;
  updateTela: (id: string, updates: Partial<Tela>) => void;
  updateColor: (id: string, updates: Partial<Color>) => void;
  updatePrecioTela: (id: string, updates: Partial<PrecioTela>) => void;
  updateProducto: (id: string, updates: Partial<Producto>) => void;
  updateTarifaOperacion: (id: string, updates: Partial<TarifaOperacion>) => void;
  addOperario: (o: Operario) => void;
  updateOperario: (id: string, updates: Partial<Operario>) => void;
  // Config
  updateConfig: (updates: Partial<Config>) => void;
  // Import / Reset
  importData: (payload: TexajoImportPayload) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Error guardando en localStorage', e);
    }
  }, [state]);

  const set = (updater: (prev: AppState) => AppState) => setState(updater);

  const addMovimientoTela = (m: MovimientoTela) =>
    set(p => ({ ...p, movimientosTela: [...p.movimientosTela, m] }));

  const updateMovimientoTela = (id: string, updates: Partial<MovimientoTela>) =>
    set(p => ({ ...p, movimientosTela: p.movimientosTela.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addCorte = (c: Corte) =>
    set(p => ({ ...p, cortes: [...p.cortes, c] }));

  const updateCorte = (id: string, updates: Partial<Corte>) =>
    set(p => ({ ...p, cortes: p.cortes.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addSeguimientoFila = (f: SeguimientoFila) =>
    set(p => ({ ...p, seguimientoFilas: [...p.seguimientoFilas, f] }));

  const updateSeguimientoFila = (id: string, updates: Partial<SeguimientoFila>) =>
    set(p => ({ ...p, seguimientoFilas: p.seguimientoFilas.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addBoletaLinea = (b: BoletaLinea) =>
    set(p => ({ ...p, boletaLineas: [...p.boletaLineas, b] }));

  const addBoletaLineas = (bs: BoletaLinea[]) =>
    set(p => ({ ...p, boletaLineas: [...p.boletaLineas, ...bs] }));

  const updateBoletaLinea = (id: string, updates: Partial<BoletaLinea>) =>
    set(p => ({ ...p, boletaLineas: p.boletaLineas.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addCobroDiario = (c: CobroDiario) =>
    set(p => ({ ...p, cobrosDiarios: [...p.cobrosDiarios, c] }));

  const updateCobroDiario = (id: string, updates: Partial<CobroDiario>) =>
    set(p => ({ ...p, cobrosDiarios: p.cobrosDiarios.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addPrograma = (prog: ProgramaZurzam) =>
    set(p => ({ ...p, programasZurzam: [...p.programasZurzam, prog] }));

  const updatePrograma = (id: string, updates: Partial<ProgramaZurzam>) =>
    set(p => ({ ...p, programasZurzam: p.programasZurzam.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addProgramaDetalle = (d: ProgramaDetalle) =>
    set(p => ({ ...p, programaDetalles: [...p.programaDetalles, d] }));

  const updateProgramaDetalle = (id: string, updates: Partial<ProgramaDetalle>) =>
    set(p => ({ ...p, programaDetalles: p.programaDetalles.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addCompraHilo = (c: CompraHilo) =>
    set(p => ({ ...p, comprasHilo: [...p.comprasHilo, c] }));

  const updateCompraHilo = (id: string, updates: Partial<CompraHilo>) =>
    set(p => ({ ...p, comprasHilo: p.comprasHilo.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addCliente = (c: Cliente) =>
    set(p => ({ ...p, clientes: [...p.clientes, c] }));

  const updateCliente = (id: string, updates: Partial<Cliente>) =>
    set(p => ({ ...p, clientes: p.clientes.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addProveedor = (prov: Proveedor) =>
    set(p => ({ ...p, proveedores: [...p.proveedores, prov] }));

  const updateProveedor = (id: string, updates: Partial<Proveedor>) =>
    set(p => ({ ...p, proveedores: p.proveedores.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const updateTela = (id: string, updates: Partial<Tela>) =>
    set(p => ({ ...p, telas: p.telas.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const updateColor = (id: string, updates: Partial<Color>) =>
    set(p => ({ ...p, colores: p.colores.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const updatePrecioTela = (id: string, updates: Partial<PrecioTela>) =>
    set(p => ({ ...p, preciosTelas: p.preciosTelas.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const updateProducto = (id: string, updates: Partial<Producto>) =>
    set(p => ({ ...p, productos: p.productos.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const updateTarifaOperacion = (id: string, updates: Partial<TarifaOperacion>) =>
    set(p => ({ ...p, tarifasOperaciones: p.tarifasOperaciones.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const addOperario = (o: Operario) =>
    set(p => ({ ...p, operarios: [...p.operarios, o] }));

  const updateOperario = (id: string, updates: Partial<Operario>) =>
    set(p => ({ ...p, operarios: p.operarios.map(x => x.id === id ? { ...x, ...updates } : x) }));

  const updateConfig = (updates: Partial<Config>) =>
    set(p => ({ ...p, config: { ...p.config, ...updates } }));

  const importData = (payload: TexajoImportPayload) =>
    set(p => ({
      ...p,
      clientes:            mergeById(p.clientes, payload.clientes),
      proveedores:         mergeById(p.proveedores, payload.proveedores),
      telas:               mergeById(p.telas, payload.telas),
      colores:             mergeById(p.colores, payload.colores),
      preciosTelas:        mergeById(p.preciosTelas, payload.preciosTelas),
      preciosComplementos: mergeById(p.preciosComplementos, payload.preciosComplementos),
      productos:           mergeById(p.productos, payload.productos),
      tarifasOperaciones:  mergeById(p.tarifasOperaciones, payload.tarifasOperaciones),
      operarios:           mergeById(p.operarios, payload.operarios),
      movimientosTela:     mergeById(p.movimientosTela, payload.movimientosTela),
      cortes:              mergeById(p.cortes, payload.cortes),
      seguimientoFilas:    mergeById(p.seguimientoFilas, payload.seguimientoFilas),
      boletaLineas:        mergeById(p.boletaLineas, payload.boletaLineas),
      programasZurzam:     mergeById(p.programasZurzam, payload.programasZurzam),
      programaDetalles:    mergeById(p.programaDetalles, payload.programaDetalles),
      comprasHilo:         mergeById(p.comprasHilo, payload.comprasHilo),
      cobrosDiarios:       mergeById(p.cobrosDiarios, payload.cobrosDiarios),
      config:              payload.config ? { ...p.config, ...payload.config } : p.config,
    }));

  const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState());
  };

  return (
    <AppContext.Provider value={{
      ...state,
      addMovimientoTela, updateMovimientoTela,
      addCorte, updateCorte,
      addSeguimientoFila, updateSeguimientoFila,
      addBoletaLinea, addBoletaLineas, updateBoletaLinea,
      addCobroDiario, updateCobroDiario,
      addPrograma, updatePrograma,
      addProgramaDetalle, updateProgramaDetalle,
      addCompraHilo, updateCompraHilo,
      addCliente, updateCliente,
      addProveedor, updateProveedor,
      updateTela, updateColor, updatePrecioTela,
      updateProducto, updateTarifaOperacion,
      addOperario, updateOperario,
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