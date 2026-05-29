import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import {
  AlertTriangle, TrendingUp, Scissors, Users, Package, DollarSign,
  ClipboardList, CreditCard, Factory, Tag, Settings,
} from 'lucide-react';

function StatCard({ title, value, sub, icon: Icon, accent }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div
      className="relative bg-white overflow-hidden"
      style={{ border: '1px solid #DDD8CF', borderLeft: `3px solid ${accent}` }}
    >
      <div className="p-5">
        <p className="font-mono font-bold uppercase" style={{ fontSize: '9px', letterSpacing: '0.2em', color: '#9A8F87' }}>
          {title}
        </p>
        <p className="mt-2 font-black leading-none" style={{ fontSize: '1.875rem', color: '#1A1A1A' }}>
          {value}
        </p>
        {sub && <p className="mt-1.5" style={{ fontSize: '10px', color: '#B0A89F' }}>{sub}</p>}
      </div>
      <Icon className="absolute bottom-3 right-3 h-10 w-10" style={{ color: accent, opacity: 0.07 }} />
    </div>
  );
}

function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-rule">
      <span>{children}</span>
    </div>
  );
}

const MODULES = [
  { href: '/inventario', icon: Package, label: 'Inventario', desc: 'Stock de rollos por tela y color', num: '02', accent: '#4B7FA3' },
  { href: '/cortes', icon: Scissors, label: 'Cortes', desc: 'Registro de ordenes de corte', num: '03', accent: '#C4612A' },
  { href: '/produccion', icon: ClipboardList, label: 'Confeccion', desc: 'Asignacion por operacion y talla', num: '04', accent: '#B89B5E' },
  { href: '/destajo', icon: CreditCard, label: 'Destajo', desc: 'Liquidacion de pago a operarios', num: '05', accent: '#3E8C5F' },
  { href: '/programas', icon: Factory, label: 'Programas Zurzam', desc: 'Hilo, tejeduria y tintoreria', num: '06', accent: '#7B5EA7' },
  { href: '/cobros', icon: DollarSign, label: 'Cobros y Entregas', desc: 'Facturacion y detracciones', num: '07', accent: '#C4612A' },
  { href: '/catalogos', icon: Tag, label: 'Catalogos', desc: 'Productos, operarios y tarifas', num: '08', accent: '#B89B5E' },
  { href: '/configuracion', icon: Settings, label: 'Configuracion', desc: 'Parametros y umbrales del sistema', num: '09', accent: '#7A6F67' },
];

const TIPO_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso', A_CORTE: 'A Corte', A_REPROCESO: 'A Reproceso',
  DE_REPROCESO: 'De Reproceso', MUESTRA: 'Muestra', AJUSTE_POS: 'Ajuste +', AJUSTE_NEG: 'Ajuste -',
};

const TIPO_STYLE: Record<string, string> = {
  INGRESO: 'background:#D4EDDA;color:#1A5E2A',
  A_CORTE: 'background:#D0E6F5;color:#1A3F5E',
  A_REPROCESO: 'background:#FDE8D8;color:#7A3010',
  DE_REPROCESO: 'background:#EBE0F7;color:#4A2080',
  MUESTRA: 'background:#F0EBE3;color:#5A5048',
  AJUSTE_POS: 'background:#D4F0E4;color:#1A5E3A',
  AJUSTE_NEG: 'background:#F7D8D4;color:#7A1A14',
};

const sectionAnim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function Dashboard() {
  const navigate = useNavigate();
  const { movimientosTela, cortes, cobrosDiarios, operarios, telas, colores, config,
    seguimientoFilas, boletaLineas, programasZurzam } = useAppContext();

  const stockResumen = useMemo(() => {
    const byKey = new Map<string, { telaId: string; colorId: string; rollos: number }>();
    for (const m of [...movimientosTela].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      byKey.set(`${m.telaId}|${m.colorId}`, { telaId: m.telaId, colorId: m.colorId, rollos: m.stockRollosDespues });
    }
    return Array.from(byKey.values());
  }, [movimientosTela]);

  const criticos = stockResumen.filter(s => s.rollos > 0 && s.rollos <= config.umbralCritico);
  const bajos = stockResumen.filter(s => s.rollos > config.umbralCritico && s.rollos <= config.umbralBajo);
  const totalRollos = stockResumen.reduce((sum, s) => sum + Math.max(0, s.rollos), 0);

  const cortesActivos = cortes.filter(c => c.estado === 'EN_PROCESO').length;
  const operariosActivos = operarios.filter(o => o.estado === 'ACTIVO').length;
  const cobrosPendientes = cobrosDiarios.filter(c => c.estado === 'PENDIENTE').reduce((s, c) => s + c.bruto, 0);
  const cobrosTotal = cobrosDiarios.reduce((s, c) => s + c.bruto, 0);

  const metricas = useMemo(() => {
    // Producción: prendas cortadas (completadas) vs producidas (filas LISTO/PAGADO) vs pendientes
    const prendasCortadas = cortes
      .filter(c => c.estado === 'COMPLETADO')
      .reduce((s, c) => s + c.totalPrendas, 0);
    const prendasProducidas = seguimientoFilas
      .filter(f => f.estado === 'LISTO' || f.estado === 'PAGADO')
      .reduce((s, f) => s + f.cantidad, 0);
    const prendasPorHacer = seguimientoFilas
      .filter(f => f.estado !== 'LISTO' && f.estado !== 'PAGADO' && f.estado !== 'ANULADO')
      .reduce((s, f) => s + f.cantidad, 0);

    // Recaudación: cobrado vs facturado total
    const totalFacturado = cobrosDiarios
      .filter(c => c.estado !== 'ANULADO')
      .reduce((s, c) => s + c.bruto, 0);
    const totalCobrado = cobrosDiarios
      .filter(c => c.estado === 'COBRADO')
      .reduce((s, c) => s + c.bruto, 0);
    const pctRecaudado = totalFacturado > 0 ? (totalCobrado / totalFacturado) * 100 : 0;

    // Costo MO: suma de boletaLineas importe
    const costoMoTotal = boletaLineas.reduce((s, b) => s + b.importe, 0);
    const costoMoPagado = boletaLineas
      .filter(b => b.estadoPago === 'PAGADO')
      .reduce((s, b) => s + b.importe, 0);

    // Margen bruto estimado: (totalCobrado - costoMoPagado) / totalCobrado * 100
    const margenPct = totalCobrado > 0
      ? ((totalCobrado - costoMoPagado) / totalCobrado) * 100
      : 0;

    return {
      prendasCortadas,
      prendasProducidas,
      prendasPorHacer,
      totalFacturado,
      totalCobrado,
      pctRecaudado,
      costoMoTotal,
      costoMoPagado,
      margenPct,
    };
  }, [cortes, seguimientoFilas, cobrosDiarios, boletaLineas]);

  const recentMovs = [...movimientosTela].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
  const telaMap = new Map(telas.map(t => [t.id, t.nombre]));
  const colorMap = new Map(colores.map(c => [c.id, c.nombre]));

  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <motion.div
        className="flex items-end justify-between pb-5"
        style={{ borderBottom: '1px solid #DDD8CF' }}
        variants={sectionAnim}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div>
          <h2 className="font-serif font-black uppercase leading-none" style={{ fontSize: '2rem', letterSpacing: '-0.03em', color: '#1A1A1A' }}>
            Dashboard
          </h2>
          <p className="mt-1 font-mono" style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#9A8F87' }}>
            Resumen operativo
          </p>
        </div>
        <p className="font-mono capitalize" style={{ fontSize: '10px', letterSpacing: '0.08em', color: '#9A8F87' }}>
          {today}
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        initial="initial"
        animate="animate"
        variants={{ initial: {}, animate: {} }}
        transition={{ staggerChildren: 0.07, delayChildren: 0.06 }}
      >
        {[{
          title: 'Stock Total',
          value: `${totalRollos} rollos`,
          sub: `${stockResumen.filter(s => s.rollos > 0).length} combinaciones activas`,
          icon: Package,
          accent: '#4B7FA3',
        }, {
          title: 'Cobros Pendientes',
          value: `S/ ${cobrosPendientes.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`,
          sub: `Total facturado S/ ${cobrosTotal.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`,
          icon: DollarSign,
          accent: '#C4612A',
        }, {
          title: 'Cortes Activos',
          value: cortesActivos,
          sub: `${cortes.length} cortes en total`,
          icon: Scissors,
          accent: '#B89B5E',
        }, {
          title: 'Operarios Activos',
          value: operariosActivos,
          sub: `${operarios.length} registrados`,
          icon: Users,
          accent: '#3E8C5F',
        }].map(card => (
          <motion.div
            key={card.title}
            variants={{ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <StatCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      {(criticos.length > 0 || bajos.length > 0) ? (
        <motion.div variants={sectionAnim} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.1 }}>
          <SectionRule>Alertas de inventario</SectionRule>
          <div className="grid gap-2 lg:grid-cols-2">
            {criticos.map(s => (
              <div key={`${s.telaId}|${s.colorId}`} className="flex items-center gap-3 px-4 py-3" style={{ background: '#FEF0EC', border: '1px solid #F5C4B0' }}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#C4612A' }} />
                <div>
                  <p className="font-bold" style={{ fontSize: '11px', color: '#7A2C0E' }}>
                    CRITICO - {telaMap.get(s.telaId)} / {colorMap.get(s.colorId)}
                  </p>
                  <p style={{ fontSize: '10px', color: '#C4612A' }}>{s.rollos} rollos restantes</p>
                </div>
              </div>
            ))}
            {bajos.map(s => (
              <div key={`${s.telaId}|${s.colorId}`} className="flex items-center gap-3 px-4 py-3" style={{ background: '#FDF8EC', border: '1px solid #EDD89A' }}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#B89B5E' }} />
                <div>
                  <p className="font-bold" style={{ fontSize: '11px', color: '#6B5A1E' }}>
                    BAJO - {telaMap.get(s.telaId)} / {colorMap.get(s.colorId)}
                  </p>
                  <p style={{ fontSize: '10px', color: '#B89B5E' }}>{s.rollos} rollos restantes</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : totalRollos > 0 ? (
        <motion.div
          className="flex items-center gap-3 px-4 py-3"
          style={{ background: '#EAF7EE', border: '1px solid #A8D9B8' }}
          variants={sectionAnim}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <TrendingUp className="h-4 w-4 flex-shrink-0" style={{ color: '#3E8C5F' }} />
          <p className="font-bold" style={{ fontSize: '11px', color: '#1E5E38' }}>
            Stock en niveles normales - sin alertas activas
          </p>
        </motion.div>
      ) : null}

      <motion.div variants={sectionAnim} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.25 }}>
        <SectionRule>Métricas gerenciales</SectionRule>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Prendas Cortadas */}
          <StatCard
            title="Prendas Cortadas"
            value={metricas.prendasCortadas.toLocaleString()}
            sub={`${metricas.prendasProducidas.toLocaleString()} producidas`}
            icon={Scissors}
            accent="#B89B5E"
          />
          {/* Por Hacer */}
          <StatCard
            title="Prendas por Hacer"
            value={metricas.prendasPorHacer.toLocaleString()}
            sub="en producción activa"
            icon={ClipboardList}
            accent="#4B7FA3"
          />
          {/* Recaudación */}
          <StatCard
            title="Recaudación"
            value={`${metricas.pctRecaudado.toFixed(1)}%`}
            sub={`S/ ${metricas.totalCobrado.toLocaleString('es-PE', { minimumFractionDigits: 0 })} cobrado`}
            icon={TrendingUp}
            accent="#3E8C5F"
          />
          {/* Margen bruto */}
          <StatCard
            title="Margen Bruto Est."
            value={`${metricas.margenPct.toFixed(1)}%`}
            sub={`Costo MO S/ ${metricas.costoMoPagado.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
            icon={DollarSign}
            accent={metricas.margenPct >= 30 ? '#3E8C5F' : metricas.margenPct >= 15 ? '#B89B5E' : '#C4612A'}
          />
        </div>
        {/* Barra de desglose */}
        <div className="mt-3 bg-white border border-[#DDD8CF] p-4">
          <div className="grid grid-cols-3 gap-6 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Producción</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Cortadas</span><span className="font-mono font-bold">{metricas.prendasCortadas.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Producidas</span><span className="font-mono font-bold text-green-700">{metricas.prendasProducidas.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Por hacer</span><span className="font-mono font-bold text-amber-700">{metricas.prendasPorHacer.toLocaleString()}</span></div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Facturación</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Total facturado</span><span className="font-mono font-bold">S/ {metricas.totalFacturado.toLocaleString('es-PE', { minimumFractionDigits: 0 })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Cobrado</span><span className="font-mono font-bold text-green-700">S/ {metricas.totalCobrado.toLocaleString('es-PE', { minimumFractionDigits: 0 })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">% Cobrado</span><span className="font-mono font-bold">{metricas.pctRecaudado.toFixed(1)}%</span></div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Costo MO</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Total MO</span><span className="font-mono font-bold">S/ {metricas.costoMoTotal.toLocaleString('es-PE', { minimumFractionDigits: 0 })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Pagado</span><span className="font-mono font-bold text-green-700">S/ {metricas.costoMoPagado.toLocaleString('es-PE', { minimumFractionDigits: 0 })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Margen bruto</span><span className={`font-mono font-bold ${metricas.margenPct >= 30 ? 'text-green-700' : metricas.margenPct >= 15 ? 'text-amber-700' : 'text-red-700'}`}>{metricas.margenPct.toFixed(1)}%</span></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={sectionAnim} initial="initial" animate="animate" transition={{ duration: 0.45, delay: 0.16 }}>
        <SectionRule>Modulos</SectionRule>
        <motion.div
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          initial="initial"
          animate="animate"
          variants={{ initial: {}, animate: {} }}
          transition={{ staggerChildren: 0.05 }}
        >
          {MODULES.map(({ href, icon: Icon, label, desc, num, accent }) => (
            <motion.button
              key={href}
              onClick={() => navigate(href)}
              className="module-btn group"
              variants={{ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
            >
              <div className="flex items-start justify-between mb-5">
                <span className="font-mono font-black leading-none" style={{ fontSize: '1.1rem', color: accent, transition: 'opacity 150ms' }}>
                  {num}
                </span>
                <Icon className="h-4 w-4 transition-colors duration-150" style={{ color: '#C0B8B0' }} aria-hidden />
              </div>
              <p className="font-black uppercase leading-snug transition-colors duration-150 group-hover:text-white" style={{ fontSize: '11px', letterSpacing: '0.05em', color: '#1A1A1A' }}>
                {label}
              </p>
              <p className="mt-1.5 leading-relaxed transition-colors duration-150 group-hover:text-gray-500" style={{ fontSize: '10px', color: '#9A8F87' }}>
                {desc}
              </p>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      <motion.div variants={sectionAnim} initial="initial" animate="animate" transition={{ duration: 0.45, delay: 0.22 }}>
        <SectionRule>Ultimos movimientos de tela</SectionRule>
        {recentMovs.length === 0 ? (
          <p className="italic" style={{ fontSize: '13px', color: '#B0A89F' }}>Sin movimientos registrados.</p>
        ) : (
          <div className="overflow-x-auto" style={{ border: '1px solid #DDD8CF' }}>
            <table className="min-w-full" style={{ fontSize: '11px', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#1C1915' }}>
                  {['Fecha', 'Tipo', 'Tela', 'Color', 'Rollos', 'Kg', 'Stock'].map(h => (
                    <th
                      key={h}
                      className="font-mono font-bold uppercase text-left px-4 py-3"
                      style={{ fontSize: '9px', letterSpacing: '0.18em', color: '#6B6058', borderBottom: '1px solid #2E2924', whiteSpace: 'nowrap' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentMovs.map((m, i) => (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#FAF8F5', borderBottom: '1px solid #EDE9E3' }}>
                    <td className="px-4 py-2.5 font-mono">{m.fecha}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-block px-2 py-0.5 font-mono font-bold uppercase"
                        style={{
                          fontSize: '9px',
                          letterSpacing: '0.1em',
                          ...Object.fromEntries(
                            (TIPO_STYLE[m.tipo] ?? 'background:#F0EBE3;color:#5A5048')
                              .split(';')
                              .filter(Boolean)
                              .map(s => s.split(':') as [string, string]),
                          ),
                        }}
                      >
                        {TIPO_LABEL[m.tipo] ?? m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: '#3A3430' }}>{telaMap.get(m.telaId) ?? m.telaId}</td>
                    <td className="px-4 py-2.5" style={{ color: '#3A3430' }}>{colorMap.get(m.colorId) ?? m.colorId}</td>
                    <td className="px-4 py-2.5 font-mono text-right">{m.rollos}</td>
                    <td className="px-4 py-2.5 font-mono text-right">{m.kgTotal.toFixed(1)}</td>
                    <td className="px-4 py-2.5 font-mono text-right font-bold">{m.stockRollosDespues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
