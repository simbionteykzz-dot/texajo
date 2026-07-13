import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { Operario } from '../types';
import { useAppContext } from '../store/AppContext';

interface BoletaOperarioProps {
  operario: Operario;
  periodo: string;
  desde?: string; // YYYY-MM-DD — filtro de rango opcional
  hasta?: string; // YYYY-MM-DD
  estadoPago?: '' | 'PENDIENTE' | 'PAGADO';
  onClose: () => void;
}

function soles(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Paleta del documento (misma identidad que el PDF)
const INK    = '#211D18'; // negro cálido, no #000 puro
const GREEN  = '#173A25';
const GREEN2 = '#0F2418';
const COPPER = '#B89B5E';
const CREAM  = '#F5F2EA';
const MUTED  = '#8A7F74';
const BORDER = '#DCD5C6';
const ALERT  = '#A34328';

export function BoletaOperario({ operario, periodo, desde, hasta, estadoPago, onClose }: BoletaOperarioProps) {
  const { boletaLineas, productos, descuentosBoleta } = useAppContext();

  const usaRango = !!(desde || hasta);

  // Activa el modo de impresión aislado (ver reglas @media print / body.boleta-open en index.css)
  useEffect(() => {
    document.body.classList.add('boleta-open');
    return () => { document.body.classList.remove('boleta-open'); };
  }, []);

  const lineas = useMemo(() =>
    boletaLineas
      .filter(b => {
        if (b.operarioId !== operario.id) return false;
        if (estadoPago && b.estadoPago !== estadoPago) return false;
        if (usaRango) {
          const fecha = b.fechaRegistro ?? b.periodo + '-01';
          if (desde && fecha < desde) return false;
          if (hasta && fecha > hasta) return false;
          return true;
        }
        return b.periodo === periodo;
      })
      .sort((a, b) => String(a.nCorte).localeCompare(String(b.nCorte)) || a.orden - b.orden),
    [boletaLineas, operario.id, periodo, desde, hasta, usaRango, estadoPago]
  );

  const productoMap = useMemo(() => new Map(productos.map(p => [p.id, p])), [productos]);

  const totalBruto    = lineas.reduce((s, b) => s + b.importe, 0);
  const merma         = totalBruto * 0.01;
  const descuentos    = descuentosBoleta.filter(d => {
    if (d.operarioId !== operario.id) return false;
    return usaRango ? true : d.periodo === periodo;
  });
  const totalDescuentos = descuentos.reduce((s, d) => s + d.monto, 0);
  const totalNeto     = totalBruto - merma - totalDescuentos;
  const pendiente     = lineas.filter(b => b.estadoPago === 'PENDIENTE').reduce((s, b) => s + b.importe, 0);
  const cortesUnicos  = new Set(lineas.map(b => b.nCorte)).size;
  const totalPrendas  = lineas.reduce((s, b) => s + b.cantPrendas, 0);
  const pendCount     = lineas.filter(b => b.estadoPago === 'PENDIENTE').length;

  const emitido       = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const [anio, mes]   = periodo.split('-');
  const periodoLabel  = usaRango
    ? `${desde ?? '…'} al ${hasta ?? '…'}`
    : new Date(parseInt(anio), parseInt(mes) - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const docId         = usaRango
    ? `BOL-${operario.codigo}-${(desde ?? '').replace(/-/g, '')}-${(hasta ?? '').replace(/-/g, '')}`
    : `BOL-${operario.codigo}-${periodo.replace('-', '')}`;

  const handlePrint = () => window.print();

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '8.5px',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: MUTED,
  };

  return createPortal(
    <div
      className="boleta-portal fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto no-print"
      style={{ background: 'rgba(15,36,24,0.6)', backdropFilter: 'blur(4px)', padding: '2.5rem 1rem' }}
    >
      <div className="w-full max-w-[760px] boleta-print-wrapper">

        {/* Barra de acciones — no se imprime */}
        <div className="flex justify-end gap-2 mb-3 sticky top-4 z-10 no-print">
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </button>
          <button onClick={onClose} className="btn-secondary flex items-center gap-2">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ══════════════ DOCUMENTO ══════════════ */}
        <article
          className="boleta-print-root"
          style={{
            background: '#fff',
            border: `1px solid ${BORDER}`,
            boxShadow: '0 32px 72px -28px rgba(15,36,24,0.5)',
            fontFamily: 'var(--font-sans)',
            color: INK,
          }}
        >
          {/* ── Filete superior cobre ── */}
          <div style={{ height: '4px', background: `linear-gradient(90deg, ${GREEN} 0%, ${GREEN} 55%, ${COPPER} 100%)` }} />

          {/* ── Cabecera: sello + identidad institucional ── */}
          <header style={{ padding: '1.75rem 2.25rem 1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
              {/* Monograma — sello circular tipográfico, sin logo de imagen */}
              <div style={{
                width: '46px', height: '46px', borderRadius: '50%',
                border: `1.5px solid ${COPPER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', flexShrink: 0,
                background: `radial-gradient(circle at 32% 28%, #ffffff, ${CREAM})`,
              }}>
                <span style={{
                  position: 'absolute', inset: '3px', borderRadius: '50%',
                  border: `0.5px solid ${BORDER}`,
                }} />
                <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 900, fontSize: '20px', color: GREEN, letterSpacing: '-0.02em' }}>
                  T
                </span>
              </div>
              <div>
                <p style={{ ...labelStyle, color: COPPER, marginBottom: '3px' }}>
                  Texajo · Sistema de Gestión Textil
                </p>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '21px', fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                  Boleta de Destajo
                </h1>
                <p style={{ ...labelStyle, color: MUTED, marginTop: '4px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'none', fontFamily: 'var(--font-sans)', fontSize: '10.5px' }}>
                  Liquidación de pago por trabajo a destajo
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: GREEN, letterSpacing: '0.02em' }}>{docId}</p>
              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <p style={{ fontSize: '10.5px', color: MUTED }}>
                  <span style={{ ...labelStyle, color: MUTED, fontSize: '8px', marginRight: '5px' }}>Emitido</span>
                  {emitido}
                </p>
                <p style={{ fontSize: '10.5px', color: MUTED, textTransform: 'capitalize' }}>
                  <span style={{ ...labelStyle, color: MUTED, fontSize: '8px', marginRight: '5px', textTransform: 'uppercase' }}>Período</span>
                  {periodoLabel}
                </p>
              </div>
            </div>
          </header>

          {/* ── Identidad del trabajador — pieza central del documento ── */}
          <section style={{ padding: '1.5rem 2.25rem', borderBottom: `1px solid ${BORDER}`, background: CREAM }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ ...labelStyle, color: '#9A8F80', marginBottom: '6px' }}>Trabajador</p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.015em', lineHeight: 1.02 }}>
                  {operario.nombre}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: MUTED }}>
                    Código&nbsp;<strong style={{ color: INK }}>{operario.codigo}</strong>
                  </span>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: BORDER }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                    padding: '2.5px 8px', borderRadius: '2px',
                    color: operario.estado === 'ACTIVO' ? '#1D5B3A' : ALERT,
                    background: operario.estado === 'ACTIVO' ? '#E7F0E5' : '#F6E5DF',
                    border: `1px solid ${operario.estado === 'ACTIVO' ? '#C6DBC1' : '#E4C3B4'}`,
                  }}>
                    {operario.estado}
                  </span>
                </div>
              </div>

              {/* Cifra pendiente — único bloque con color vivo (cobre), destacada porque importa al operario */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ ...labelStyle, color: '#9A8F80', marginBottom: '4px' }}>Pendiente de cobro</p>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 900, fontSize: '24px', color: pendiente > 0 ? '#8A5A1E' : INK, margin: 0, letterSpacing: '-0.01em' }}>
                  S/. {soles(pendiente)}
                </p>
              </div>
            </div>

            {/* Fila de métricas — discretas, separadas por filetes finos, sin bloques de color */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '1.25rem', borderTop: `1px solid ${BORDER}` }}>
              {[
                { label: 'Cortes trabajados', value: cortesUnicos },
                { label: 'Operaciones registradas', value: lineas.length },
                { label: 'Prendas producidas', value: totalPrendas },
              ].map((s, i) => (
                <div key={i} style={{ padding: '10px 4px 0', textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center', borderLeft: i > 0 ? `1px solid ${BORDER}` : 'none', borderRight: i < 2 ? 'none' : 'none' }}>
                  <p style={{ ...labelStyle, fontSize: '7.5px', color: '#9A8F80', marginBottom: '3px' }}>{s.label}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: GREEN, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Tabla de líneas — acabado de imprenta: filetes finos, sin bandas de color sólidas ── */}
          <section style={{ padding: '1.5rem 2.25rem 0' }}>
            <p style={{ ...labelStyle, color: GREEN, marginBottom: '0.6rem' }}>Detalle de operaciones liquidadas</p>
            <div className="texajo-table-shell" style={{ border: `1px solid ${BORDER}`, borderRadius: 0, boxShadow: 'none', background: 'transparent' }}>
              <div className="texajo-table-scroll">
                <table className="texajo-table" style={{ fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ background: GREEN }}>
                      <th>N° Corte</th>
                      <th>Producto</th>
                      <th>Operación</th>
                      <th className="text-center">Prendas</th>
                      <th className="text-center">Estado</th>
                      <th className="text-right">Tarifa</th>
                      <th className="text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.length === 0 && (
                      <tr>
                        <td colSpan={7} className="texajo-empty-row">
                          Sin líneas registradas para este período
                        </td>
                      </tr>
                    )}
                    {lineas.map(ln => (
                      <tr key={ln.id} style={{ background: ln.estadoPago === 'PAGADO' ? 'rgba(23,58,37,0.03)' : 'transparent' }}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', color: INK }}>{ln.nCorte}</td>
                        <td style={{ color: MUTED }}>{productoMap.get(ln.productoId)?.nombre ?? ln.productoId}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: INK }}>
                          <span style={{ color: '#B0A896', marginRight: '4px' }}>{String(ln.orden).padStart(2, '0')}</span>{ln.operacion}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{ln.cantPrendas}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.12em',
                            textTransform: 'uppercase', padding: '2px 7px', display: 'inline-block', borderRadius: '2px',
                            color: ln.estadoPago === 'PAGADO' ? '#1D5B3A' : '#8A5A1E',
                            background: ln.estadoPago === 'PAGADO' ? '#E7F0E5' : '#F5EBDA',
                            border: `1px solid ${ln.estadoPago === 'PAGADO' ? '#C6DBC1' : '#E7D3A8'}`,
                          }}>
                            {ln.estadoPago}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: MUTED, fontSize: '10.5px' }}>S/. {ln.tarifa.toFixed(3)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '13px', color: INK }}>S/. {soles(ln.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {lineas.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK }}>
                          Total período
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: INK }}>
                          {totalPrendas}
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '8.5px', fontWeight: 700, color: pendCount > 0 ? '#8A5A1E' : MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {pendCount} pend.
                        </td>
                        <td style={{ textAlign: 'right', color: '#B0A896' }}>—</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize: '15px', color: GREEN }}>
                          S/. {soles(totalBruto)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </section>

          {/* ── Resumen financiero — tratado como el bloque de cierre del documento ── */}
          {lineas.length > 0 && (
            <section style={{ padding: '1.5rem 2.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ ...labelStyle, color: MUTED }}>Total bruto</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: INK }}>S/. {soles(totalBruto)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ ...labelStyle, color: ALERT }}>Merma (1%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: ALERT }}>&minus; S/. {soles(merma)}</span>
                </div>

                {descuentos.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ ...labelStyle, color: ALERT, fontSize: '8px' }}>
                      {d.tipo}{d.notas ? ` — ${d.notas}` : ''}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: ALERT }}>&minus; S/. {soles(d.monto)}</span>
                  </div>
                ))}

                {descuentos.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ ...labelStyle, color: ALERT }}>Total descuentos</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: ALERT }}>&minus; S/. {soles(totalDescuentos)}</span>
                  </div>
                )}

                {/* Neto — sello de cierre con doble filete cobre, único acento fuerte del documento */}
                <div style={{ marginTop: '14px', borderTop: `2px solid ${COPPER}`, borderBottom: `2px solid ${COPPER}`, padding: '12px 2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ ...labelStyle, color: GREEN, fontSize: '9px' }}>Neto a pagar</span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 900, fontStyle: 'italic', color: GREEN }}>
                      S/. {soles(totalNeto)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Firmas ── */}
          <footer style={{ padding: '1.75rem 2.25rem 1.25rem', borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            {[
              { label: 'Firma del trabajador', name: operario.nombre },
              { label: 'Visto bueno — Gerencia', name: 'Módulo Texajo' },
            ].map((f, i) => (
              <div key={i}>
                <div style={{ borderBottom: `1px solid ${INK}`, height: '2.75rem' }} />
                <p style={{ ...labelStyle, color: MUTED, marginTop: '8px' }}>{f.label}</p>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '11px', color: INK, marginTop: '2px' }}>{f.name}</p>
              </div>
            ))}
          </footer>

          {/* ── Pie institucional ── */}
          <div style={{ padding: '0.85rem 2.25rem', textAlign: 'center', borderTop: `1px solid ${BORDER}`, background: GREEN2 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '7.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7EAA8A', margin: 0 }}>
              Documento generado por el sistema Texajo &nbsp;·&nbsp; Los montos corresponden a destajo según cortes registrados &nbsp;·&nbsp; {docId}
            </p>
          </div>
        </article>

      </div>
    </div>,
    document.body
  );
}
