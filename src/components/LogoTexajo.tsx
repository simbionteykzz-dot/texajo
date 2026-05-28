import React from 'react';

interface LogoTexajoProps {
  /** 'full' = mark + wordmark | 'mark' = solo ícono | 'word' = solo texto */
  variant?: 'full' | 'mark' | 'word';
  /** Tema de color */
  theme?: 'dark' | 'light' | 'color';
  width?: number;
  className?: string;
}

/**
 * Paleta oficial TEXAJO
 * #173A25  verde bosque
 * #0F2418  verde profundo
 * #B66F35  cobre
 * #F5F2EA  crema
 */

export function LogoTexajo({
  variant = 'full',
  theme = 'color',
  width,
  className,
}: LogoTexajoProps) {

  const green  = theme === 'light' ? '#F5F2EA' : '#173A25';
  const deep   = theme === 'light' ? 'rgba(245,242,234,0.7)' : '#0F2418';
  const copper = '#B66F35';
  const cream  = '#F5F2EA';

  /* ── Marca geométrica textil ── */
  const Mark = () => (
    <g>
      {/* Base verde profundo */}
      <rect x="0" y="0" width="44" height="44" fill={deep} />

      {/* Cuadrícula de telar — cobre bajo */}
      {[7, 14, 21, 28, 35].map(v => (
        <React.Fragment key={v}>
          <line x1={v} y1="0" x2={v} y2="44" stroke={copper} strokeWidth="0.45" opacity="0.35" />
          <line x1="0" y1={v} x2="44" y2={v} stroke={copper} strokeWidth="0.45" opacity="0.35" />
        </React.Fragment>
      ))}

      {/* Diagonal cobre — trama */}
      <line x1="0" y1="44" x2="44" y2="0" stroke={copper} strokeWidth="1.1" opacity="0.55" />

      {/* Rombo central */}
      <rect x="18" y="18" width="8" height="8" transform="rotate(45 22 22)" fill={copper} opacity="0.9" />

      {/* Borde exterior cobre */}
      <rect x="0.5" y="0.5" width="43" height="43" fill="none" stroke={copper} strokeWidth="0.9" />
      {/* Borde interior */}
      <rect x="3" y="3" width="38" height="38" fill="none" stroke={copper} strokeWidth="0.4" opacity="0.45" />
    </g>
  );

  /* ── Wordmark ── */
  const Wordmark = ({ x = 0 }: { x?: number }) => (
    <g transform={`translate(${x}, 0)`}>
      {/* Línea superior izquierda */}
      <line x1="0" y1="10" x2="90" y2="10" stroke={copper} strokeWidth="0.7" opacity="0.6" />
      {/* Rombo centro-superior */}
      <rect x="96" y="6.5" width="5" height="5" transform="rotate(45 98.5 9)" fill={copper} />
      {/* Línea superior derecha */}
      <line x1="105" y1="10" x2="195" y2="10" stroke={copper} strokeWidth="0.7" opacity="0.6" />

      {/* Texto principal */}
      <text
        x="97"
        y="46"
        fontFamily="'Playfair Display', 'Georgia', serif"
        fontWeight="900"
        fontSize="40"
        fill={green}
        textAnchor="middle"
        letterSpacing="2"
      >
        TEXAJO
      </text>

      {/* Línea inferior */}
      <line x1="0" y1="56" x2="195" y2="56" stroke={copper} strokeWidth="0.6" opacity="0.45" />

      {/* Tagline */}
      <text
        x="97"
        y="68"
        fontFamily="'JetBrains Mono', 'Courier New', monospace"
        fontWeight="700"
        fontSize="6.5"
        fill={green}
        textAnchor="middle"
        letterSpacing="3.5"
        opacity="0.65"
      >
        GESTIÓN TEXTIL
      </text>
    </g>
  );

  /* ── Solo ícono ── */
  if (variant === 'mark') {
    const w = width ?? 44;
    return (
      <svg
        viewBox="0 0 44 44"
        width={w}
        height={w}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Texajo"
      >
        <Mark />
      </svg>
    );
  }

  /* ── Solo wordmark ── */
  if (variant === 'word') {
    const w = width ?? 195;
    return (
      <svg
        viewBox="0 0 195 75"
        width={w}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Texajo"
      >
        <Wordmark />
      </svg>
    );
  }

  /* ── Full: marca + wordmark ── */
  const w = width ?? 260;
  return (
    <svg
      viewBox="0 0 260 75"
      width={w}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Texajo"
    >
      {/* Marca 44×44 centrada verticalmente */}
      <g transform="translate(0, 15)">
        <Mark />
      </g>
      {/* Separador */}
      <line x1="54" y1="15" x2="54" y2="60" stroke={copper} strokeWidth="0.5" opacity="0.25" />
      {/* Wordmark desplazado */}
      <Wordmark x={62} />
    </svg>
  );
}
