import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { ToastProvider, useToast } from './components/ToastProvider';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { InventarioTelas } from './pages/InventarioTelas';
import { Cortes } from './pages/Cortes';
import { ProduccionConfeccion } from './pages/ProduccionConfeccion';
import { Destajo } from './pages/Destajo';
import { ProgramasZurzam } from './pages/ProgramasZurzam';
import { CobrosEntregas } from './pages/CobrosEntregas';
import { Catalogos } from './pages/Catalogos';
import { Complementos } from './pages/Complementos';
import { Configuracion } from './pages/Configuracion';
import { PanelAdmin } from './pages/PanelAdmin';
import { HistorialGeneral } from './pages/HistorialGeneral';
import { TablaTarifas } from './pages/TablaTarifas';
import OdooStock from './pages/OdooStock';
import { supabase } from './lib/supabase';
import { useAuthUser } from './lib/useAuthUser';
import { usePermisos, permisosParaRol } from './lib/usePermisos';
import introAnim from './assets/login/logo-animado-texajo.gif';

function DbErrorWatcher() {
  const { addToast } = useToast();
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      addToast(`Error al guardar: ${msg}`, 'error');
    };
    window.addEventListener('supabase-error', handler);
    return () => window.removeEventListener('supabase-error', handler);
  }, [addToast]);
  return null;
}

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [mostrarIntro, setMostrarIntro] = useState(false);
  const [sidebarColapsado, setSidebarColapsado] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  // Key estable para AppProvider — se fija al autenticarse y no cambia hasta logout
  const [providerKey, setProviderKey] = useState<string>('guest');

  const authUser = useAuthUser();
  const { permisosPorRol } = usePermisos();
  const permisos = authUser ? permisosParaRol(permisosPorRol, authUser.rol) : null;
  const esAdmin = authUser?.rol === 'Administrador General' || authUser?.rol === 'Super Admin';
  const esSuperAdmin = authUser?.rol === 'Super Admin';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAutenticado(!!session);
      if (session?.user?.id) setProviderKey(session.user.id);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session);
      if (session?.user?.id) setProviderKey(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!mostrarIntro) return;
    const timer = window.setTimeout(() => setMostrarIntro(false), 2600);
    return () => window.clearTimeout(timer);
  }, [mostrarIntro]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#173A25] border-t-transparent" />
      </div>
    );
  }

  // Sesión activa pero email sin confirmar — forzar logout
  if (autenticado && authUser === null) {
    supabase.auth.signOut();
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-6">
        <div className="w-full max-w-md border px-8 py-10" style={{ borderColor: '#F5C4B0', background: '#FEF0EC' }}>
          <p className="text-sm font-bold" style={{ color: '#7A2C0E' }}>Tu cuenta aún no ha sido confirmada.</p>
          <p className="mt-2 text-xs" style={{ color: '#7A2C0E' }}>Revisa tu correo electrónico y confirma tu cuenta antes de ingresar al sistema.</p>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return (
      <Login
        onLogin={async () => {
          // Registrar login — leer sesión antes de setAutenticado para tener el userId
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) setProviderKey(session.user.id);
          setAutenticado(true);
          setMostrarIntro(true);
          if (session) {
            const meta = session.user.user_metadata ?? {};
            await supabase.from('audit_logs').insert({
              user_id: session.user.id,
              user_email: session.user.email ?? '',
              user_nombre: (meta['nombre'] as string) || (session.user.email ?? '').split('@')[0],
              accion: 'LOGIN', entidad: 'session', entidad_id: session.user.id,
              entidad_desc: `${(meta['nombre'] as string) || session.user.email} inició sesión`,
            });
          }
        }}
      />
    );
  }

  if (mostrarIntro) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-6 py-8">
        <img
          src={introAnim}
          alt="Texajo animacion de entrada"
          className="block h-[420px] w-full max-w-[980px] object-contain"
        />
      </div>
    );
  }

  const handleLogout = async () => {
    if (authUser) {
      await supabase.from('audit_logs').insert({
        user_id: authUser.id, user_email: authUser.email, user_nombre: authUser.nombre,
        accion: 'LOGOUT', entidad: 'session', entidad_id: authUser.id,
        entidad_desc: `${authUser.nombre} cerró sesión`,
      });
    }
    await supabase.auth.signOut();
    setAutenticado(false);
    setMostrarIntro(false);
    setSidebarMobileOpen(false);
    setProviderKey('guest');
  };

  return (
    <AppProvider key={providerKey} authUser={authUser}>
      <ToastProvider>
        <DbErrorWatcher />
        <Router>
          <div className="flex h-screen overflow-hidden bg-[#F4F2EE] font-sans text-[#1A1A1A]">

            {sidebarMobileOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                onClick={() => setSidebarMobileOpen(false)}
              />
            )}

            <div className={`
              fixed inset-y-0 left-0 z-50 transition-transform duration-200
              md:relative md:translate-x-0 md:z-auto md:flex md:shrink-0
              ${sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
              <Sidebar
                colapsado={sidebarColapsado}
                onToggle={() => setSidebarColapsado(prev => !prev)}
                onLogout={handleLogout}
                onMobileClose={() => setSidebarMobileOpen(false)}
                permisos={permisos}
                esAdmin={esAdmin}
                esSuperAdmin={esSuperAdmin}
              />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden min-w-0" style={{ borderLeft: '1px solid #DDD8CF' }}>
              <Header
                onMenuClick={() => setSidebarMobileOpen(prev => !prev)}
                authUser={authUser}
              />
              <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-12 lg:py-10">
                <div className="mx-auto max-w-7xl">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/inventario" element={<InventarioTelas />} />
                    <Route path="/cortes" element={<Cortes />} />
                    <Route path="/produccion" element={<ProduccionConfeccion />} />
                    <Route path="/destajo" element={<Destajo />} />
                    <Route path="/programas" element={<ProgramasZurzam />} />
                    <Route path="/cobros" element={<CobrosEntregas />} />
                    <Route path="/complementos" element={<Complementos />} />
                    <Route path="/catalogos" element={<Catalogos />} />
                    <Route path="/configuracion" element={<Configuracion />} />
                    <Route path="/tarifas" element={<TablaTarifas />} />
                    <Route path="/stock-odoo" element={<OdooStock />} />
                    {esAdmin && <Route path="/admin" element={<PanelAdmin />} />}
                    {esSuperAdmin && <Route path="/historial" element={<HistorialGeneral />} />}
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        </Router>
      </ToastProvider>
    </AppProvider>
  );
}
