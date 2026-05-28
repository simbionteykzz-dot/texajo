import React, { useState, useRef, useEffect } from 'react';
import { Bell, UserCircle, Search, X } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { cortes, programasZurzam, telas, movimientosTela, config, cobrosDiarios } = useAppContext();
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getFilteredResults = () => {
    if (!searchTerm.trim()) return [];
    
    const query = searchTerm.toLowerCase();
    const results = [];

    for (const c of cortes) {
      if (c.id.toLowerCase().includes(query)) results.push({ type: 'Corte', id: c.id, desc: `${c.totalPrendas} prendas`, path: '/produccion' });
    }
    for (const p of programasZurzam) {
      if (p.id.toLowerCase().includes(query) || p.estado.toLowerCase().includes(query)) results.push({ type: 'Programa', id: p.id, desc: p.estado, path: '/programas' });
    }
    for (const t of telas) {
      if (t.nombre.toLowerCase().includes(query)) results.push({ type: 'Tela', id: t.nombre, desc: `${t.kgPorRollo}kg/r`, path: '/' });
    }
    return results.slice(0, 5);
  };

  const results = getFilteredResults();

  // Calcular notificaciones
  const calcStockByTela = () => {
    const stockMap = new Map<string, number>();
    movimientosTela.forEach(m => stockMap.set(m.telaId, m.stockRollosDespues));
    return stockMap;
  };
  const stockData = calcStockByTela();
  const umbral = config.umbralBajo;
  const telasCriticas = telas.filter(t => (stockData.get(t.id) || 0) <= umbral);
  const deudasPendientes = cobrosDiarios.filter(c => c.estado === 'PENDIENTE');

  const notifications = [
    ...telasCriticas.map(t => ({ id: t.id, title: 'Stock crítico', message: `${t.nombre} - ${stockData.get(t.id)} rollos restantes`, type: 'critical' })),
    ...deudasPendientes.slice(0, 3).map(c => ({ id: c.id, title: 'Cobro Pendiente', message: `Factura ${c.nFactura || c.nCorte} (S/. ${c.bruto.toFixed(2)})`, type: 'warning' }))
  ];
  
  if (deudasPendientes.length > 3) {
    notifications.push({ id: 'more-debt', title: 'Cobros pendientes', message: `+${deudasPendientes.length - 3} cobros más pendientes`, type: 'info' });
  }

  return (
    <header className="flex h-20 items-end justify-between pb-5 px-10 shrink-0 relative z-50 no-print" style={{ background: '#F7F4EF', borderBottom: '1px solid #DDD8CF' }}>
      <div className="flex flex-1 items-end gap-10">
        {/* Search Bar */}
        <div className="relative w-72">
          <div className="flex items-center border-b border-gray-400 pb-1 focus-within:border-black transition-colors">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar corte, programa, tela..."
              className="bg-transparent border-none text-xs font-mono uppercase tracking-widest w-full focus:outline-none text-[#1A1A1A] placeholder-gray-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-black">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {searchTerm.trim() !== '' && (
            <div className="absolute top-full mt-2 w-96 bg-white border border-gray-300 shadow-2xl p-2 z-50">
               {results.length > 0 ? (
                 <ul className="space-y-1">
                   {results.map((r, i) => (
                     <li key={i}>
                       <button 
                         className="w-full text-left p-3 hover:bg-[#F9F7F2] transition-colors flex justify-between items-center"
                         onClick={() => {
                           navigate(r.path);
                           setSearchTerm('');
                         }}
                       >
                         <div>
                           <div className="font-bold font-sans text-sm text-[#1A1A1A]">{r.id}</div>
                           <div className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">{r.desc}</div>
                         </div>
                         <span className="text-[9px] uppercase tracking-widest font-bold border border-gray-300 px-2 py-0.5 text-gray-500">{r.type}</span>
                       </button>
                     </li>
                   ))}
                 </ul>
               ) : (
                 <div className="p-4 text-center text-xs font-serif italic text-gray-500">
                   No se encontraron resultados para "{searchTerm}"
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-6">
        <div className="text-right border-r pr-6 mr-2" style={{ borderColor: '#DDD8CF' }}>
          <div className="font-mono font-bold uppercase" style={{ fontSize: '9px', letterSpacing: '0.18em', color: '#9A8F87' }}>Mes Activo</div>
          <div className="font-serif italic leading-none mt-1" style={{ fontSize: '1rem', color: '#1A1A1A' }}>
            {new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
            className="text-black hover:text-gray-600 focus:outline-none relative"
          >
            <span className="sr-only">Notificaciones</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-red-600 ring-2 ring-[#F4F2EE]"></span>
            )}
          </button>
          
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-4 w-80 bg-white border border-gray-300 shadow-2xl z-50">
               <div className="p-4 border-b border-gray-200">
                 <h3 className="text-[10px] font-bold uppercase font-mono tracking-widest">Notificaciones</h3>
               </div>
               {notifications.length > 0 ? (
                 <ul className="max-h-96 overflow-y-auto">
                   {notifications.map((n) => (
                     <li key={n.id} className="p-4 border-b border-gray-100 hover:bg-[#F9F7F2] transition-colors cursor-pointer">
                       <div className="flex justify-between items-start">
                         <span className={cn(
                           "text-[9px] uppercase tracking-widest font-bold px-2 py-0.5",
                           n.type === 'critical' ? "bg-red-100 text-red-700" : n.type === 'warning' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                         )}>
                           {n.title}
                         </span>
                       </div>
                       <p className="mt-2 text-xs font-sans text-[#1A1A1A]">{n.message}</p>
                     </li>
                   ))}
                 </ul>
               ) : (
                 <div className="p-6 text-center text-xs font-serif italic text-gray-500">
                   No hay notificaciones pendientes.
                 </div>
               )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <UserCircle className="h-7 w-7 text-black" />
          <span className="text-xs font-bold uppercase tracking-wider text-black">Admin</span>
        </div>
      </div>
    </header>
  );
}
