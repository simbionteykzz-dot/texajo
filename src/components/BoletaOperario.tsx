import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText } from 'lucide-react';
import { Operario } from '../types';
import { useAppContext } from '../store/AppContext';
import { exportBoletaToPdf } from '../lib/export';
import logoDashboard from '../assets/branding/logo-dashboard.png';

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

export function BoletaOperario({ operario, periodo, desde, hasta, estadoPago, onClose }: BoletaOperarioProps) {
  const { boletaLineas, productos, descuentosBoleta } = useAppContext();

  const usaRango = !!(desde || hasta);

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

  const emitido       = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const [anio, mes]   = periodo.split('-');
  const periodoLabel  = usaRango
    ? `${desde ?? '…'} al ${hasta ?? '…'}`
    : new Date(parseInt(anio), parseInt(mes) - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const docId         = usaRango
    ? `BOL-${operario.codigo}-${(desde ?? '').replace(/-/g, '')}-${(hasta ?? '').replace(/-/g, '')}`
    : `BOL-${operario.codigo}-${periodo.replace('-', '')}`;

  const handlePrint = () => window.print();

  const handleExportPdf = () => {
    exportBoletaToPdf({
      docId,
      emitido,
      periodoLabel,
      operarioNombre:    operario.nombre,
      operarioCodigo:    operario.codigo,
      modulo:            '',
      fechaIngreso:      '',
      estado:            operario.estado,
      totalesCortes:     cortesUnicos,
      totalesOperaciones: lineas.length,
      totalesPrendas:    lineas.reduce((s, b) => s + b.cantPrendas, 0),
      totalesPendiente:  pendiente,
      totalesImporte:    totalBruto,
      descuentoOverride: totalDescuentos,
      lineas: lineas.map(ln => ({
        fecha:        ln.fechaPago ?? ln.periodo,
        nCorte:       ln.nCorte,
        estadoCorte:  '',
        cliente:      '',
        producto:     productoMap.get(ln.productoId)?.nombre ?? ln.productoId,
        color:        '',
        operacion:    ln.operacion,
        orden:        ln.orden,
        cantS:        0,
        cantM:        0,
        cantL:        0,
        cantXL:       0,
        totalPrendas: ln.cantPrendas,
        estadoPago:   ln.estadoPago,
        tarifa:       ln.tarifa,
        importe:      ln.importe,
      })),
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto no-print"
         style={{ background: 'rgba(15,36,24,0.55)', backdropFilter: 'blur(4px)', padding: '2rem 1rem' }}>

      <div className="w-full max-w-3xl">

        {/* Barra de acciones */}
        <div className="flex justify-end gap-2 mb-3 sticky top-4 z-10">
          <button onClick={handleExportPdf} className="btn-primary flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" /> Exportar PDF
          </button>
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </button>
          <button onClick={onClose} className="btn-secondary flex items-center gap-2">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Documento */}
        <article style={{ background: '#F5F2EA', border: '1px solid #DDD8CF', boxShadow: '0 24px 64px -24px rgba(15,36,24,0.45)' }}>

          {/* Header */}
          <header style={{ background: '#173A25', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#F5F2EA', borderRadius: '4px', padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
                <img src={logoDashboard} alt="Texajo" style={{ height: '32px', width: 'auto', display: 'block' }} />
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7EAA8A', marginBottom: '2px' }}>
                  Taller textil · Sistema de Gestión Textil
                </p>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 900, color: '#F5F2EA', margin: 0, letterSpacing: '-0.02em' }}>
                  Boleta de Destajo
                </h1>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B89B5E', marginTop: '3px' }}>
                  Liquidación de trabajo
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#B0C8B8', lineHeight: 1.7 }}>
              <p style={{ color: '#F5F2EA', fontWeight: 700, fontSize: '11px' }}>{docId}</p>
              <p><span style={{ color: '#7EAA8A', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Emitido </span>{emitido}</p>
              <p><span style={{ color: '#7EAA8A', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Período </span><span style={{ textTransform: 'capitalize' }}>{periodoLabel}</span></p>
            </div>
          </header>

          {/* Banda de datos operario */}
          <section style={{ borderBottom: '1px solid #DDD8CF', padding: '1.25rem 2rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center', background: '#fff' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9A8F87', marginBottom: '4px' }}>
                Trabajador
              </p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 900, color: '#1A1A1A', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {operario.nombre}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A6F67', marginTop: '4px' }}>
                Cód. {operario.codigo}
                <span style={{ margin: '0 6px', color: '#DDD8CF' }}>·</span>
                <span style={{ display: 'inline-block', padding: '1px 7px', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                  background: operario.estado === 'ACTIVO' ? '#EDFAEF' : '#FEF2F2',
                  color: operario.estado === 'ACTIVO' ? '#166534' : '#991B1B',
                  border: `1px solid ${operario.estado === 'ACTIVO' ? '#BBF7D0' : '#FECACA'}` }}>
                  {operario.estado}
                </span>
              </p>
            </div>

            {/* Stats inline */}
            <div style={{ display: 'flex', gap: '0', border: '1px solid #DDD8CF' }}>
              {[
                { label: 'Cortes',       value: cortesUnicos,    dark: false },
                { label: 'Operaciones',  value: lineas.length,   dark: false },
                { label: 'Prendas',      value: lineas.reduce((s, b) => s + b.cantPrendas, 0), dark: false },
                { label: 'Pendiente',    value: `S/. ${soles(pendiente)}`, dark: true },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '12px 16px', textAlign: 'center', minWidth: '80px',
                  borderLeft: i > 0 ? '1px solid #DDD8CF' : 'none',
                  background: s.dark ? '#173A25' : 'transparent',
                  color: s.dark ? '#F5F2EA' : '#1A1A1A',
                }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: s.dark ? '#7EAA8A' : '#9A8F87', marginBottom: '4px' }}>
                    {s.label}
                  </p>
                  <p style={{ fontFamily: s.dark ? 'var(--font-mono)' : 'var(--font-serif)', fontSize: s.dark ? '13px' : '20px', fontWeight: 900, margin: 0, letterSpacing: s.dark ? '0' : '-0.02em', lineHeight: 1 }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Tabla de líneas */}
          <div className="texajo-table-shell" style={{ border: 'none', borderRadius: 0, boxShadow: 'none', background: 'transparent' }}>
            <div className="texajo-table-scroll">
              <table className="texajo-table">
                <thead>
                  <tr>
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
                    <tr key={ln.id} style={{ opacity: ln.estadoPago === 'PAGADO' ? 0.55 : 1 }}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px' }}>{ln.nCorte}</td>
                      <td style={{ color: '#7A6F67' }}>{productoMap.get(ln.productoId)?.nombre ?? ln.productoId}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{ln.orden}. {ln.operacion}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{ln.cantPrendas}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em',
                          textTransform: 'uppercase', padding: '2px 7px', display: 'inline-block',
                          background: ln.estadoPago === 'PAGADO' ? '#EDFAEF' : '#FEF9EE',
                          color:      ln.estadoPago === 'PAGADO' ? '#166534' : '#92400E',
                          border:     `1px solid ${ln.estadoPago === 'PAGADO' ? '#BBF7D0' : '#FDE68A'}`,
                        }}>
                          {ln.estadoPago}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#7A6F67', fontSize: '11px' }}>S/. {ln.tarifa.toFixed(3)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-serif)', fontWeight: 900, fontStyle: 'italic', fontSize: '13px' }}>S/. {soles(ln.importe)}</td>
                    </tr>
                  ))}
                </tbody>
                {lineas.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                        Total período
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize: '15px', fontStyle: 'italic' }}>
                        {lineas.reduce((s, b) => s + b.cantPrendas, 0)}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {lineas.filter(b => b.estadoPago === 'PENDIENTE').length} pend.
                      </td>
                      <td style={{ textAlign: 'right', color: '#9A8F87' }}>—</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-serif)', fontWeight: 900, fontStyle: 'italic', fontSize: '15px' }}>
                        S/. {soles(totalBruto)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Resumen financiero */}
          {lineas.length > 0 && (
            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #DDD8CF', display: 'flex', justifyContent: 'flex-end', background: '#fff' }}>
              <div style={{ width: '260px' }}>
                {/* Fila Bruto */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #EDE9E0' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9A8F87' }}>Bruto</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>S/. {soles(totalBruto)}</span>
                </div>

                {/* Merma 1% */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #EDE9E0' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C84B1A' }}>Merma (1%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#C84B1A' }}>− S/. {soles(merma)}</span>
                </div>

                {/* Filas de descuentos */}
                {descuentos.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #EDE9E0' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C84B1A' }}>
                      {d.tipo}{d.notas ? ` — ${d.notas}` : ''}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#C84B1A' }}>− S/. {soles(d.monto)}</span>
                  </div>
                ))}

                {/* Fila total descuentos (solo si hay más de 1) */}
                {descuentos.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #EDE9E0' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C84B1A' }}>Total Descuentos</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#C84B1A' }}>− S/. {soles(totalDescuentos)}</span>
                  </div>
                )}

                {/* Fila Neto */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', marginTop: '6px', background: '#173A25' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7EAA8A' }}>Neto a Pagar</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', color: '#F5F2EA' }}>S/. {soles(totalNeto)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Firmas */}
          <footer style={{ padding: '1.5rem 2rem', borderTop: '1px solid #DDD8CF', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', background: '#F5F2EA' }}>
            {[
              { label: 'Firma trabajador', name: operario.nombre },
              { label: 'Firma / visto bueno gerencia', name: 'Modulo Texajo — Gerencia' },
            ].map((f, i) => (
              <div key={i}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9A8F87', marginBottom: '2rem' }}>
                  {f.label}
                </p>
                <div style={{ borderBottom: '1px solid #1A1A1A', height: '2rem' }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A6F67', marginTop: '6px' }}>{f.name}</p>
              </div>
            ))}
          </footer>

          <p style={{ padding: '0.75rem 2rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B0A898', borderTop: '1px solid #EDE9E0', background: '#F5F2EA' }}>
            Documento generado por el sistema Modulo Texajo · Los montos corresponden a destajo según cortes registrados
          </p>
        </article>

      </div>
    </div>,
    document.body
  );
}
