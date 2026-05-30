import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PackageSearch, Receipt, Factory,
  Scissors, Settings, Tag, CreditCard, ClipboardList,
  PanelLeftClose, PanelLeftOpen, LogOut, X, Layers, Zap, Shield, History, TableProperties,
} from 'lucide-react';
import logoDashboard from '../assets/branding/logo-dashboard.png';
import type { PermisosRol } from '../lib/usePermisos';

const NAV_ITEMS = [
  { key: 'dashboard',     name: 'Dashboard',        href: '/',            icon: LayoutDashboard },
  { key: 'inventario',    name: 'Inventario',        href: '/inventario',  icon: PackageSearch },
  { key: 'cortes',        name: 'Cortes',            href: '/cortes',      icon: Scissors },
  { key: 'produccion',    name: 'Confeccion',        href: '/produccion',  icon: ClipboardList },
  { key: 'destajo',       name: 'Destajo',           href: '/destajo',     icon: CreditCard },
  { key: 'programas',     name: 'Programas Zurzam',  href: '/programas',   icon: Factory },
  { key: 'cobros',        name: 'Cobros y Entregas', href: '/cobros',      icon: Receipt },
  { key: 'complementos',  name: 'Complementos',      href: '/complementos',icon: Layers },
  { key: 'catalogos',     name: 'Catalogos',         href: '/catalogos',   icon: Tag },
  { key: 'panel',         name: 'Panel Operativo',   href: '/panel',       icon: Zap },
  { key: 'tarifas',       name: 'Tabla de Tarifas',  href: '/tarifas',     icon: TableProperties },
] as const;

interface SidebarProps {
  colapsado: boolean;
  onToggle: () => void;
  onLogout: () => void;
  onMobileClose?: () => void;
  permisos: PermisosRol | null;
  esAdmin: boolean;
  esSuperAdmin: boolean;
}

export function Sidebar({ colapsado, onToggle, onLogout, onMobileClose, permisos, esAdmin, esSuperAdmin }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
    onLogout();
  };

  const handleNavClick = () => {
    onMobileClose?.();
  };

  const itemsVisibles = NAV_ITEMS.filter(item => {
    if (!permisos) return true;
    return permisos[item.key] !== false;
  });

  return (
    <div className={`sidebar-root no-print flex h-full shrink-0 flex-col transition-all duration-200 ${colapsado ? 'w-20' : 'w-60'}`}>
      <div className={`${colapsado ? 'px-3' : 'px-5'} pt-3 pb-3`} style={{ borderBottom: '1px solid rgba(182,111,53,0.12)' }}>
        <div className="mb-2 flex items-center justify-between">
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="p-1 transition-colors md:hidden"
              style={{ color: '#6B6058' }}
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onToggle}
              className="hidden md:block p-1 transition-colors"
              style={{ color: '#6B6058' }}
              aria-label={colapsado ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {colapsado ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {colapsado ? (
          <p className="text-center font-mono text-[10px] font-bold tracking-[0.18em]" style={{ color: '#2E2924' }}>
            TX
          </p>
        ) : (
          <img src={logoDashboard} alt="Texajo" className="mx-auto block h-auto w-full max-w-[156px]" />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-px">
        {itemsVisibles.map(({ key, name, href, icon: Icon }) => (
          <NavLink
            key={key}
            to={href}
            end={href === '/'}
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
          >
            <span className="font-mono font-medium flex-shrink-0" style={{ fontSize: '9px', color: '#3A342E', minWidth: '18px' }}>
              ›
            </span>
            <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            {!colapsado && <span>{name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
        {(!permisos || permisos['configuracion']) && (
          <NavLink
            to="/configuracion"
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
          >
            <span className="font-mono font-medium flex-shrink-0" style={{ fontSize: '9px', color: '#3A342E', minWidth: '18px' }}>›</span>
            <Settings className="h-3.5 w-3.5 flex-shrink-0" />
            {!colapsado && <span>Configuracion</span>}
          </NavLink>
        )}

        {esAdmin && (
          <NavLink
            to="/admin"
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
          >
            <span className="font-mono font-medium flex-shrink-0" style={{ fontSize: '9px', color: '#3A342E', minWidth: '18px' }}>›</span>
            <Shield className="h-3.5 w-3.5 flex-shrink-0" />
            {!colapsado && <span>Panel Admin</span>}
          </NavLink>
        )}

        {esSuperAdmin && (
          <NavLink
            to="/historial"
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
          >
            <span className="font-mono font-medium flex-shrink-0" style={{ fontSize: '9px', color: '#3A342E', minWidth: '18px' }}>›</span>
            <History className="h-3.5 w-3.5 flex-shrink-0" />
            {!colapsado && <span>Historial General</span>}
          </NavLink>
        )}

        <button type="button" onClick={handleLogout} className="sidebar-link mt-1 w-full">
          <span className="font-mono font-medium flex-shrink-0" style={{ fontSize: '9px', color: '#3A342E', minWidth: '18px' }}>›</span>
          <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
          {!colapsado && <span>Cerrar sesion</span>}
        </button>
      </div>
    </div>
  );
}
