import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PackageSearch, Receipt, Factory,
  Scissors, Settings, Tag, CreditCard, ClipboardList, PanelLeftClose, PanelLeftOpen, LogOut,
} from 'lucide-react';
import logoDashboard from '../assets/branding/logo-dashboard.png';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inventario', href: '/inventario', icon: PackageSearch },
  { name: 'Cortes', href: '/cortes', icon: Scissors },
  { name: 'Confeccion', href: '/produccion', icon: ClipboardList },
  { name: 'Destajo', href: '/destajo', icon: CreditCard },
  { name: 'Programas Zurzam', href: '/programas', icon: Factory },
  { name: 'Cobros y Entregas', href: '/cobros', icon: Receipt },
  { name: 'Catalogos', href: '/catalogos', icon: Tag },
];

interface SidebarProps {
  colapsado: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

export function Sidebar({ colapsado, onToggle, onLogout }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
    onLogout();
  };

  return (
    <div className={`sidebar-root no-print flex h-full shrink-0 flex-col transition-all duration-200 ${colapsado ? 'w-20' : 'w-60'}`}>
      <div className={`${colapsado ? 'px-3' : 'px-5'} pt-3 pb-3`} style={{ borderBottom: '1px solid rgba(182,111,53,0.12)' }}>
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onToggle}
            className="p-1 transition-colors"
            style={{ color: '#6B6058' }}
            aria-label={colapsado ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {colapsado ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
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
        {NAV_ITEMS.map(({ name, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            end={href === '/'}
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
        <NavLink
          to="/configuracion"
          className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
        >
          <span className="font-mono font-medium flex-shrink-0" style={{ fontSize: '9px', color: '#3A342E', minWidth: '18px' }}>›</span>
          <Settings className="h-3.5 w-3.5 flex-shrink-0" />
          {!colapsado && <span>Configuracion</span>}
        </NavLink>

        <button type="button" onClick={handleLogout} className="sidebar-link mt-1 w-full">
          <span className="font-mono font-medium flex-shrink-0" style={{ fontSize: '9px', color: '#3A342E', minWidth: '18px' }}>›</span>
          <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
          {!colapsado && <span>Cerrar sesion</span>}
        </button>

      </div>
    </div>
  );
}
