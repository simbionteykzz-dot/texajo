import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';

export const SECCIONES = [
  { key: 'dashboard',    label: 'Dashboard',         href: '/' },
  { key: 'inventario',   label: 'Inventario',         href: '/inventario' },
  { key: 'cortes',       label: 'Cortes',             href: '/cortes' },
  { key: 'produccion',   label: 'Confeccion',         href: '/produccion' },
  { key: 'destajo',      label: 'Destajo',            href: '/destajo' },
  { key: 'programas',    label: 'Programas Zurzam',   href: '/programas' },
  { key: 'cobros',       label: 'Cobros y Entregas',  href: '/cobros' },
  { key: 'complementos', label: 'Complementos',       href: '/complementos' },
  { key: 'catalogos',    label: 'Catalogos',          href: '/catalogos' },
  { key: 'tarifas',      label: 'Tabla de Tarifas',   href: '/tarifas' },
  { key: 'stock_odoo',   label: 'Stock Odoo',         href: '/stock-odoo' },
  { key: 'configuracion',label: 'Configuracion',      href: '/configuracion' },
] as const;

export type SeccionKey = typeof SECCIONES[number]['key'];

export type PermisosRol = Record<SeccionKey, boolean>;

const DEFAULT_PERMISOS_ADMIN: PermisosRol = Object.fromEntries(
  SECCIONES.map(s => [s.key, true])
) as PermisosRol;

const DEFAULT_PERMISOS_SUPERVISOR: PermisosRol = {
  dashboard: true,
  inventario: true,
  cortes: true,
  produccion: true,
  destajo: true,
  programas: true,
  cobros: true,
  complementos: true,
  catalogos: false,
  tarifas: true,
  stock_odoo: true,
  configuracion: false,
};

const DEFAULT_PERMISOS_ENCARGADO: PermisosRol = {
  dashboard: true,
  inventario: false,
  cortes: false,
  produccion: true,
  destajo: true,
  programas: false,
  cobros: false,
  complementos: false,
  catalogos: false,
  tarifas: false,
  stock_odoo: false,
  configuracion: false,
};

export const ROLES_SIMULABLES = ['Super Admin', 'Administrador General', 'Supervisor', 'Encargado de Área'] as const;

export const DEFAULTS_POR_ROL: Record<string, PermisosRol> = {
  'Super Admin':           DEFAULT_PERMISOS_ADMIN,
  'Administrador General': DEFAULT_PERMISOS_ADMIN,
  'Supervisor':            DEFAULT_PERMISOS_SUPERVISOR,
  'Encargado de Área':     DEFAULT_PERMISOS_ENCARGADO,
};

export interface PermisosFull {
  loading: boolean;
  permisosPorRol: Record<string, PermisosRol>;
  savePermisos: (rol: string, permisos: PermisosRol) => Promise<void>;
}

function usePermisosState(): PermisosFull {
  const [loading, setLoading] = useState(true);
  const [permisosPorRol, setPermisosPorRol] = useState<Record<string, PermisosRol>>({
    ...DEFAULTS_POR_ROL,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('permisos_roles').select('*');
        if (data && data.length > 0) {
          const mapa: Record<string, PermisosRol> = { ...DEFAULTS_POR_ROL };
          for (const row of data) {
            mapa[row.rol] = row.permisos as PermisosRol;
          }
          setPermisosPorRol(mapa);
        }
      } catch {
        // usar defaults si falla
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const savePermisos = useCallback(async (rol: string, permisos: PermisosRol) => {
    const result = await supabase
      .from('permisos_roles')
      .upsert({ rol, permisos }, { onConflict: 'rol' });
    if (result.error) throw result.error;
    setPermisosPorRol(prev => ({ ...prev, [rol]: permisos }));
  }, []);

  return { loading, permisosPorRol, savePermisos };
}

export function permisosParaRol(permisosPorRol: Record<string, PermisosRol>, rol: string): PermisosRol {
  return permisosPorRol[rol] ?? DEFAULT_PERMISOS_ADMIN;
}

const PermisosContext = createContext<PermisosFull | undefined>(undefined);

export function PermisosProvider({ children }: { children: ReactNode }) {
  const value = usePermisosState();
  return <PermisosContext.Provider value={value}>{children}</PermisosContext.Provider>;
}

export function usePermisos(): PermisosFull {
  const ctx = useContext(PermisosContext);
  if (!ctx) throw new Error('usePermisos must be used within PermisosProvider');
  return ctx;
}
