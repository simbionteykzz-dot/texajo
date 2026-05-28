import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { ToastProvider } from './components/ToastProvider';
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
import { Configuracion } from './pages/Configuracion';
import introAnim from './assets/login/logo-animado-texajo.gif';

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [mostrarIntro, setMostrarIntro] = useState(false);
  const [sidebarColapsado, setSidebarColapsado] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  useEffect(() => {
    if (!mostrarIntro) return;
    const timer = window.setTimeout(() => setMostrarIntro(false), 2600);
    return () => window.clearTimeout(timer);
  }, [mostrarIntro]);

  if (!autenticado) {
    return <Login onLogin={() => { setAutenticado(true); setMostrarIntro(true); }} />;
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

  return (
    <AppProvider>
      <ToastProvider>
        <Router>
          <div className="flex h-screen overflow-hidden bg-[#F4F2EE] font-sans text-[#1A1A1A]">

            {/* Overlay móvil — toca fuera para cerrar */}
            {sidebarMobileOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                onClick={() => setSidebarMobileOpen(false)}
              />
            )}

            {/* Sidebar — drawer en móvil, fijo en desktop */}
            <div className={`
              fixed inset-y-0 left-0 z-50 transition-transform duration-200
              md:relative md:translate-x-0 md:z-auto md:flex md:shrink-0
              ${sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
              <Sidebar
                colapsado={sidebarColapsado}
                onToggle={() => setSidebarColapsado(prev => !prev)}
                onLogout={() => {
                  setAutenticado(false);
                  setMostrarIntro(false);
                  setSidebarMobileOpen(false);
                }}
                onMobileClose={() => setSidebarMobileOpen(false)}
              />
            </div>

            {/* Contenido principal */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0" style={{ borderLeft: '1px solid #DDD8CF' }}>
              <Header onMenuClick={() => setSidebarMobileOpen(prev => !prev)} />
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
                    <Route path="/catalogos" element={<Catalogos />} />
                    <Route path="/configuracion" element={<Configuracion />} />
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
