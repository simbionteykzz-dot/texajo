import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw, ChevronDown, ChevronRight, AlertCircle, Loader2,
  X, FileSpreadsheet, FileText, LayoutDashboard, List,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  fetchOdooAll,
  buildProductRows,
  type OdooAll,
  type ProductRow,
  type VariantRow,
} from '../lib/odooService';
import {
  stockBadgeClass,
  getStockLevel,
  STOCK_THRESHOLDS,
  STOCK_LEVELS,
} from '../lib/stockConfig';

// ── Paleta Texajo ─────────────────────────────────────────────────────────────

const TX = {
  darkGreen: '#173A25',
  copper:    '#B6702A',
  cream:     '#F5F2EA',
  border:    '#DDD8CF',
  muted:     '#9A8F87',
  ink:       '#1A1A1A',
  ok:        '#16a34a',
  warning:   '#ca8a04',
  danger:    '#dc2626',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const TALLA_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function sortTallas(tallas: string[]): string[] {
  return [...tallas].sort((a, b) => {
    const ai = TALLA_ORDER.indexOf(a.toUpperCase());
    const bi = TALLA_ORDER.indexOf(b.toUpperCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

function lerp(t: number, fromHex: string, toHex: string): string {
  const f = parseInt(fromHex.slice(1), 16);
  const g = parseInt(toHex.slice(1), 16);
  const fr = (f >> 16) & 0xff, fg = (f >> 8) & 0xff, fb = f & 0xff;
  const gr = (g >> 16) & 0xff, gg = (g >> 8) & 0xff, gb = g & 0xff;
  const r = Math.round(fr + (gr - fr) * t);
  const gv = Math.round(fg + (gg - fg) * t);
  const b = Math.round(fb + (gb - fb) * t);
  return `rgb(${r},${gv},${b})`;
}

function fmtN(n: number): string {
  return Math.round(n).toLocaleString('es-PE');
}

// ── FilterSection ─────────────────────────────────────────────────────────────

function FilterSection({
  title, children, defaultOpen = true,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#DDD8CF] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2.5 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#7A6F67] hover:text-[#1A1A1A] transition-colors"
      >
        {title}
        {open
          ? <ChevronDown className="h-3 w-3 text-[#9A8F87]" />
          : <ChevronRight className="h-3 w-3 text-[#9A8F87]" />}
      </button>
      {open && <div className="pb-3 px-3">{children}</div>}
    </div>
  );
}

// ── CheckList ─────────────────────────────────────────────────────────────────

function CheckList({ options, selected, onChange }: {
  options: string[]; selected: Set<string>; onChange: (v: string) => void;
}) {
  const [q, setQ] = useState('');
  const visible = q ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className="space-y-1.5">
      {options.length > 6 && (
        <input
          type="text"
          placeholder="Buscar…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="input-base text-[10px] py-1 w-full"
        />
      )}
      <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
        {visible.map(opt => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" checked={selected.has(opt)} onChange={() => onChange(opt)} className="flex-shrink-0" />
            <span className={`text-[11px] leading-tight transition-colors ${selected.has(opt) ? 'text-[#1A1A1A] font-bold' : 'text-[#7A6F67] group-hover:text-[#1A1A1A]'}`}>
              {opt}
            </span>
          </label>
        ))}
        {visible.length === 0 && <p className="text-[10px] text-[#9A8F87] italic">Sin resultados</p>}
      </div>
    </div>
  );
}

// ── PctBar ────────────────────────────────────────────────────────────────────

function PctBar({ pct, color = TX.darkGreen }: { pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#DDD8CF] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono font-bold text-[#7A6F67] w-8 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <span
      className="relative"
      onMouseEnter={e => { setShow(true); setPos({ x: e.clientX, y: e.clientY }); }}
      onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className="fixed z-50 bg-[#1A1A1A] text-[#F5F2EA] text-[10px] px-2 py-1 pointer-events-none whitespace-pre-wrap max-w-[200px]"
          style={{ left: pos.x + 10, top: pos.y + 10 }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

// ── Squarified Treemap ────────────────────────────────────────────────────────

interface TreemapRect {
  x: number; y: number; w: number; h: number;
  name: string; empresa: string; stock: number; pct: number; level: string; templateId: number;
}

function squarify(
  items: { value: number; [k: string]: unknown }[],
  x: number, y: number, w: number, h: number,
): { x: number; y: number; w: number; h: number; idx: number }[] {
  if (items.length === 0) return [];
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0 || w <= 0 || h <= 0) return [];

  const area = w * h;
  const rects: { x: number; y: number; w: number; h: number; idx: number }[] = [];

  function worstRatio(row: number[], rowH: number, rowW: number): number {
    const s = row.reduce((a, b) => a + b, 0);
    const side = rowH > 0 ? s / rowH : rowW;
    let worst = 0;
    for (const v of row) {
      const r1 = (side * side * v) / (s * s);
      const r2 = (s * s) / (side * side * v);
      worst = Math.max(worst, Math.max(r1, r2));
    }
    return worst;
  }

  function layoutRow(
    row: number[], rowStart: number, cx: number, cy: number,
    cw: number, ch: number, horizontal: boolean,
  ) {
    const s = row.reduce((a, b) => a + b, 0);
    let offset = 0;
    for (let k = 0; k < row.length; k++) {
      const frac = s > 0 ? row[k] / s : 0;
      if (horizontal) {
        const rh = ch > 0 ? s / cw : 0;
        rects.push({ x: cx + offset, y: cy, w: frac * cw, h: rh, idx: rowStart + k });
        offset += frac * cw;
      } else {
        const rw = cw > 0 ? s / ch : 0;
        rects.push({ x: cx, y: cy + offset, w: rw, h: frac * ch, idx: rowStart + k });
        offset += frac * ch;
      }
    }
  }

  const scaledValues = items.map(i => (i.value / total) * area);
  let cx = x, cy = y, cw = w, ch = h;
  let start = 0;
  let row: number[] = [];

  for (let i = 0; i < scaledValues.length; i++) {
    const horizontal = cw >= ch;
    const candidate = [...row, scaledValues[i]];
    const newWorst = worstRatio(candidate, horizontal ? ch : cw, horizontal ? cw : ch);

    if (row.length === 0 || newWorst <= worstRatio(row, horizontal ? ch : cw, horizontal ? cw : ch)) {
      row = candidate;
    } else {
      const s = row.reduce((a, b) => a + b, 0);
      if (horizontal) {
        const rowH = ch > 0 ? s / cw : 0;
        layoutRow(row, start, cx, cy, cw, rowH, true);
        cy += rowH; ch -= rowH;
      } else {
        const rowW = cw > 0 ? s / ch : 0;
        layoutRow(row, start, cx, cy, rowW, ch, false);
        cx += rowW; cw -= rowW;
      }
      start = i;
      row = [scaledValues[i]];
    }
  }
  if (row.length > 0) {
    const horizontal = cw >= ch;
    const s = row.reduce((a, b) => a + b, 0);
    if (horizontal) {
      const rowH = ch > 0 ? s / cw : 0;
      layoutRow(row, start, cx, cy, cw, rowH, true);
    } else {
      const rowW = cw > 0 ? s / ch : 0;
      layoutRow(row, start, cx, cy, rowW, ch, false);
    }
  }
  return rects;
}

function buildTreemapRects(rows: ProductRow[], svgW: number, svgH: number): TreemapRect[] {
  const top = [...rows].sort((a, b) => b.totalStock - a.totalStock).slice(0, 20);
  const total = top.reduce((s, p) => s + p.totalStock, 0);
  if (total === 0 || svgW <= 0 || svgH <= 0) return [];
  const items = top.map(p => ({ value: p.totalStock, templateId: p.templateId, name: p.templateName, empresa: p.empresa, stock: p.totalStock }));
  const layout = squarify(items, 0, 0, svgW, svgH);
  return layout.map(r => {
    const item = items[r.idx];
    const level = getStockLevel(item.stock).label;
    return { ...r, name: item.name, empresa: item.empresa, stock: item.stock, pct: total > 0 ? (item.stock / total) * 100 : 0, level, templateId: item.templateId };
  });
}

function treemapFill(level: string): { fill: string; stroke: string } {
  if (level === STOCK_LEVELS.ok.label)      return { fill: '#dcfce7', stroke: '#86efac' };
  if (level === STOCK_LEVELS.warning.label) return { fill: '#fef9c3', stroke: '#fde047' };
  return { fill: '#fee2e2', stroke: '#fca5a5' };
}

function TreemapSection({ rows, onSelectProduct }: {
  rows: ProductRow[];
  onSelectProduct: (name: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgW, setSvgW] = useState(800);
  const SVG_H = 320;
  const [hovered, setHovered] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 800;
      setSvgW(w > 0 ? w : 800);
    });
    obs.observe(containerRef.current);
    setSvgW(containerRef.current.getBoundingClientRect().width || 800);
    return () => obs.disconnect();
  }, []);

  const rects = useMemo(() => buildTreemapRects(rows, svgW, SVG_H), [rows, svgW]);

  if (rows.length === 0) return null;

  return (
    <div className="bg-white border border-[#DDD8CF] px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8F87] mb-2">
        Distribución de stock por producto
        <span className="normal-case font-normal ml-1">(top 20 · clic para filtrar)</span>
      </p>
      <div ref={containerRef} className="w-full">
        <svg
          ref={svgRef}
          width={svgW}
          height={SVG_H}
          className="block"
          style={{ cursor: 'pointer' }}
        >
          {rects.map((r, i) => {
            const isHov = hovered === i;
            const { fill, stroke } = treemapFill(r.level);
            const PAD = 4;
            const innerW = r.w - PAD * 2;
            const innerH = r.h - PAD * 2;
            const showLabel = innerW > 40 && innerH > 20;
            const showEmpresa = innerH > 36;
            const showStock = innerH > 28;
            return (
              <g
                key={i}
                onClick={() => onSelectProduct(r.name)}
                onMouseEnter={e => {
                  setHovered(i);
                  setTooltip({ x: e.clientX, y: e.clientY, text: `${r.name}\n${r.empresa}\nStock: ${fmtN(r.stock)} uds · ${r.pct.toFixed(1)}%` });
                }}
                onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
              >
                <rect
                  x={r.x + 1} y={r.y + 1} width={Math.max(r.w - 2, 0)} height={Math.max(r.h - 2, 0)}
                  fill={fill}
                  stroke={isHov ? TX.copper : stroke}
                  strokeWidth={isHov ? 2 : 0.8}
                  rx={2}
                />
                {showLabel && (
                  <foreignObject x={r.x + PAD} y={r.y + PAD} width={Math.max(innerW, 0)} height={Math.max(innerH, 0)}>
                    <div
                      style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1px' }}
                    >
                      <span style={{ fontSize: Math.max(Math.min(innerW / 8, 11), 8), fontWeight: 700, color: TX.ink, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </span>
                      {showEmpresa && (
                        <span style={{ fontSize: 8, color: TX.muted, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.empresa}
                        </span>
                      )}
                      {showStock && (
                        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: TX.darkGreen, lineHeight: 1.2 }}>
                          {fmtN(r.stock)}
                        </span>
                      )}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {tooltip && (
        <div
          className="fixed z-50 bg-[#1A1A1A] text-[#F5F2EA] text-[10px] px-2.5 py-1.5 pointer-events-none whitespace-pre leading-relaxed"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ── Heatmap Color × Talla ─────────────────────────────────────────────────────

function HeatmapSection({ rows }: { rows: ProductRow[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { colores, tallas, matrix, maxQty } = useMemo(() => {
    const colorStock = new Map<string, number>();
    const tallaStock = new Map<string, number>();
    const matrix = new Map<string, number>();

    for (const p of rows) {
      for (const v of p.variantes) {
        const c = v.color || '(sin color)';
        const t = v.talla || '(sin talla)';
        const key = `${c}||${t}`;
        colorStock.set(c, (colorStock.get(c) ?? 0) + v.stock);
        tallaStock.set(t, (tallaStock.get(t) ?? 0) + v.stock);
        matrix.set(key, (matrix.get(key) ?? 0) + v.stock);
      }
    }

    const colores = [...colorStock.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([c]) => c);

    const tallasRaw = [...tallaStock.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t);

    const tallas = sortTallas(tallasRaw);
    let maxQty = 0;
    for (const v of matrix.values()) if (v > maxQty) maxQty = v;

    return { colores, tallas, matrix, maxQty };
  }, [rows]);

  if (colores.length === 0) return null;

  const CELL_W = 54;
  const CELL_H = 28;
  const COL_LABEL_W = 110;

  return (
    <div className="bg-white border border-[#DDD8CF] px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8F87] mb-3">
        Stock por combinación Color × Talla
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: COL_LABEL_W, minWidth: COL_LABEL_W }} className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A8F87] text-left pb-1 pr-2">
                Color
              </th>
              {tallas.map(t => (
                <th
                  key={t}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className="text-[9px] font-mono font-bold text-center text-[#7A6F67] pb-1"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colores.map(color => (
              <tr key={color}>
                <td className="text-[10px] font-bold text-[#1A1A1A] pr-2 truncate" style={{ maxWidth: COL_LABEL_W }}>
                  {color}
                </td>
                {tallas.map(talla => {
                  const qty = matrix.get(`${color}||${talla}`) ?? 0;
                  const t = maxQty > 0 ? qty / maxQty : 0;
                  const bg = qty === 0 ? '#fee2e2' : lerp(t, '#f0fdf4', TX.darkGreen);
                  const textColor = t > 0.55 ? '#F5F2EA' : TX.ink;
                  return (
                    <td
                      key={talla}
                      style={{ backgroundColor: bg, width: CELL_W, height: CELL_H }}
                      className="text-center border border-white cursor-default"
                      onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: `${color} / ${talla}\nStock: ${fmtN(qty)}` })}
                      onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: textColor }}>
                        {qty === 0 ? '0' : fmtN(qty)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tooltip && (
        <div
          className="fixed z-50 bg-[#1A1A1A] text-[#F5F2EA] text-[10px] px-2.5 py-1.5 pointer-events-none whitespace-pre leading-relaxed"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ── Rotación ──────────────────────────────────────────────────────────────────

interface RotacionRow {
  templateId: number;
  name: string;
  empresa: string;
  stockDisponible: number;
  salidaDiaria: number;
  diasRestantes: number | null;
  sinDatos: boolean;
}

function buildRotacion(rows: ProductRow[], raw: OdooAll): RotacionRow[] {
  const DAYS = 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS);
  const internalLocIds = new Set(raw.locations.map(l => l.id));

  const salidasByTmpl = new Map<number, number>();

  for (const move of raw.moves) {
    if (move.state !== 'done') continue;
    const moveDate = new Date(move.date);
    if (moveDate < cutoff) continue;
    const srcId = move.location_id[0];
    const dstId = move.location_dest_id[0];
    if (!internalLocIds.has(srcId) || internalLocIds.has(dstId)) continue;
    const variantId = move.product_id[0];
    const productRow = rows.find(p => p.variantes.some(v => v.variantId === variantId));
    if (!productRow) continue;
    salidasByTmpl.set(productRow.templateId, (salidasByTmpl.get(productRow.templateId) ?? 0) + move.product_qty);
  }

  const result: RotacionRow[] = rows.map(p => {
    const totalDisp = p.variantes.reduce((s, v) => s + v.stockDisponible, 0);
    const totalSalidas = salidasByTmpl.get(p.templateId) ?? 0;
    const sinDatos = totalSalidas === 0;
    const salidaDiaria = sinDatos ? 0 : totalSalidas / DAYS;
    const diasRestantes = sinDatos ? null : salidaDiaria > 0 ? totalDisp / salidaDiaria : null;
    return {
      templateId: p.templateId,
      name: p.templateName,
      empresa: p.empresa,
      stockDisponible: totalDisp,
      salidaDiaria,
      diasRestantes,
      sinDatos,
    };
  });

  return result
    .filter(r => !r.sinDatos && r.diasRestantes !== null)
    .sort((a, b) => (a.diasRestantes ?? 99999) - (b.diasRestantes ?? 99999))
    .slice(0, 15)
    .concat(result.filter(r => r.sinDatos).slice(0, Math.max(0, 15 - result.filter(r => !r.sinDatos).length)));
}

function diasColor(dias: number | null): string {
  if (dias === null) return TX.muted;
  if (dias < 7) return TX.danger;
  if (dias <= 30) return TX.warning;
  return TX.ok;
}

function RotacionSection({ rows, raw }: { rows: ProductRow[]; raw: OdooAll }) {
  const data = useMemo(() => buildRotacion(rows, raw), [rows, raw]);
  const maxDias = useMemo(() => Math.max(...data.map(r => r.diasRestantes ?? 0), 1), [data]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white border border-[#DDD8CF] px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8F87] mb-3">
        Rotación estimada — días de stock restantes
        <span className="normal-case font-normal ml-1">(top 15 · salidas últimos 30 días)</span>
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#DDD8CF]">
              {['Producto', 'Empresa', 'Stock disp.', 'Salidas/día', 'Días restantes'].map(h => (
                <th key={h} className="text-left text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A8F87] pb-1.5 pr-4 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => {
              const pct = r.diasRestantes !== null ? Math.min((r.diasRestantes / maxDias) * 100, 100) : 0;
              const color = diasColor(r.diasRestantes);
              return (
                <tr key={r.templateId} className={`border-b border-[#DDD8CF] ${i % 2 === 0 ? 'bg-white' : 'bg-[#F7F4EF]'}`}>
                  <td className="py-1.5 pr-4 font-bold text-[#1A1A1A] text-[11px] max-w-[160px] truncate" title={r.name}>
                    {r.name}
                  </td>
                  <td className="py-1.5 pr-4 text-[#7A6F67] text-[10px] whitespace-nowrap">{r.empresa || '—'}</td>
                  <td className="py-1.5 pr-4 font-mono font-bold text-[#173A25] text-[11px] text-right whitespace-nowrap">
                    {fmtN(r.stockDisponible)}
                  </td>
                  <td className="py-1.5 pr-4 font-mono text-[#7A6F67] text-[11px] text-right whitespace-nowrap">
                    {r.sinDatos ? '—' : r.salidaDiaria.toFixed(1)}
                  </td>
                  <td className="py-1.5 pr-0">
                    {r.sinDatos || r.diasRestantes === null ? (
                      <span className="text-[10px] text-[#9A8F87] italic">Sin datos</span>
                    ) : (
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <div className="flex-1 h-1.5 bg-[#DDD8CF] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="font-mono font-bold text-[11px] w-8 text-right" style={{ color }}>
                          {Math.round(r.diasRestantes)}d
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Concentración + Cobertura por talla ──────────────────────────────────────

function ConcentracionSection({ rows }: { rows: ProductRow[] }) {
  const totalStock = rows.reduce((s, p) => s + p.totalStock, 0);
  const top = [...rows].sort((a, b) => b.totalStock - a.totalStock).slice(0, 3);
  const topTotal = top.reduce((s, p) => s + p.totalStock, 0);
  const topPct = totalStock > 0 ? (topTotal / totalStock) * 100 : 0;
  const restoPct = 100 - topPct;

  const COLORS_TOP = ['#173A25', '#2A5C40', '#3D7D5A'];

  const cobertura: { name: string; faltanTallas: string[] }[] = useMemo(() => {
    const results: { name: string; faltanTallas: string[] }[] = [];
    for (const p of rows) {
      const allTallas = [...new Set(p.variantes.map(v => v.talla).filter(Boolean))];
      if (allTallas.length < 2) continue;
      const sinStock = allTallas.filter(t => {
        const totalTalla = p.variantes.filter(v => v.talla === t).reduce((s, v) => s + v.stock, 0);
        return totalTalla === 0;
      });
      if (sinStock.length > 0 && sinStock.length < allTallas.length) {
        results.push({ name: p.templateName, faltanTallas: sortTallas(sinStock) });
      }
      if (results.length >= 8) break;
    }
    return results;
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="bg-white border border-[#DDD8CF] px-4 py-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8F87] mb-1">
          Concentración de stock
        </p>
        <p className="text-[11px] text-[#1A1A1A] mb-2">
          El top 3 productos concentra{' '}
          <span className="font-bold font-mono text-[#173A25]">{topPct.toFixed(1)}%</span>{' '}
          del stock total
        </p>
        <div className="flex h-4 rounded overflow-hidden gap-px mb-2">
          {top.map((p, i) => {
            const pct = totalStock > 0 ? (p.totalStock / totalStock) * 100 : 0;
            return (
              <Tooltip key={p.templateId} text={`${p.templateName}\n${fmtN(p.totalStock)} uds · ${pct.toFixed(1)}%`}>
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, backgroundColor: COLORS_TOP[i] }}
                />
              </Tooltip>
            );
          })}
          {restoPct > 0 && (
            <div className="h-full flex-1" style={{ backgroundColor: TX.border }} />
          )}
        </div>
        <div className="space-y-1">
          {top.map((p, i) => {
            const pct = totalStock > 0 ? (p.totalStock / totalStock) * 100 : 0;
            return (
              <div key={p.templateId} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS_TOP[i] }} />
                <span className="text-[10px] font-bold text-[#1A1A1A] truncate flex-1" title={p.templateName}>{p.templateName}</span>
                <span className="text-[10px] font-mono text-[#7A6F67] whitespace-nowrap">{fmtN(p.totalStock)} uds</span>
                <span className="text-[10px] font-mono font-bold text-[#173A25] w-10 text-right">{pct.toFixed(1)}%</span>
              </div>
            );
          })}
          {restoPct > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-[#DDD8CF]" />
              <span className="text-[10px] text-[#9A8F87] flex-1">Resto</span>
              <span className="text-[10px] font-mono text-[#7A6F67] whitespace-nowrap">{fmtN(totalStock - topTotal)} uds</span>
              <span className="text-[10px] font-mono text-[#9A8F87] w-10 text-right">{restoPct.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#DDD8CF] px-4 py-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8F87] mb-2">
          Cobertura incompleta por talla
        </p>
        {cobertura.length === 0 ? (
          <p className="text-[10px] text-[#9A8F87] italic">Todos los productos tienen cobertura completa en sus tallas.</p>
        ) : (
          <div className="space-y-2">
            {cobertura.map(c => (
              <div key={c.name} className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-[#1A1A1A] flex-1 truncate" title={c.name}>{c.name}</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {c.faltanTallas.map(t => (
                    <span key={t} className="text-[9px] font-mono font-bold px-1 py-0.5 bg-red-100 text-red-700 border border-red-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KpiCards({ rows }: { rows: ProductRow[] }) {
  const totalVariantes = rows.reduce((s, p) => s + p.variantes.length, 0);
  const totalStock     = rows.reduce((s, p) => s + p.totalStock, 0);
  const totalDisp      = rows.reduce((s, p) => s + p.variantes.reduce((a, v) => a + v.stockDisponible, 0), 0);
  const totalRes       = rows.reduce((s, p) => s + p.variantes.reduce((a, v) => a + v.stockReservado, 0), 0);

  const allVariantes = rows.flatMap(p => p.variantes);
  const sinStock  = allVariantes.filter(v => v.stock <= 0).length;
  const porAcabar = allVariantes.filter(v => {
    const lv = getStockLevel(v.stock);
    return lv.label === STOCK_LEVELS.warning.label;
  }).length;

  const kpis = [
    { label: 'Productos',    value: rows.length,          sub: 'en vista',   accent: undefined as string | undefined },
    { label: 'Variantes',    value: totalVariantes,       sub: 'en vista',   accent: undefined as string | undefined },
    { label: 'Stock total',  value: Math.round(totalStock),  sub: 'unidades', accent: undefined as string | undefined },
    { label: 'Disponible',   value: Math.round(totalDisp),   sub: 'unidades', accent: undefined as string | undefined },
    { label: 'Reservado',    value: Math.round(totalRes),    sub: 'unidades', accent: undefined as string | undefined },
    { label: 'Sin stock',    value: sinStock,             sub: 'variantes',  accent: sinStock > 0 ? TX.danger : undefined },
    { label: 'Por acabar',   value: porAcabar,            sub: 'variantes',  accent: porAcabar > 0 ? TX.warning : undefined },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
      {kpis.map(kpi => (
        <div key={kpi.label} className="bg-white border border-[#DDD8CF] px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9A8F87]">{kpi.label}</p>
          <p className="text-xl font-bold font-mono mt-0.5" style={{ color: kpi.accent ?? TX.darkGreen }}>
            {kpi.value.toLocaleString('es-PE')}
          </p>
          <p className="text-[9px] text-[#9A8F87] mt-0.5">{kpi.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ rows, raw, onSelectProduct }: {
  rows: ProductRow[];
  raw: OdooAll;
  onSelectProduct: (name: string) => void;
}) {
  return (
    <div className="space-y-4">
      <KpiCards rows={rows} />
      <TreemapSection rows={rows} onSelectProduct={onSelectProduct} />
      <HeatmapSection rows={rows} />
      <RotacionSection rows={rows} raw={raw} />
      <ConcentracionSection rows={rows} />
    </div>
  );
}

// ── Export Dashboard Excel ────────────────────────────────────────────────────

function exportDashboardExcel(rows: ProductRow[], raw: OdooAll) {
  const wb = XLSX.utils.book_new();

  const totalStock     = rows.reduce((s, p) => s + p.totalStock, 0);
  const totalVariantes = rows.reduce((s, p) => s + p.variantes.length, 0);
  const totalDisp      = rows.reduce((s, p) => s + p.variantes.reduce((a, v) => a + v.stockDisponible, 0), 0);
  const totalRes       = rows.reduce((s, p) => s + p.variantes.reduce((a, v) => a + v.stockReservado, 0), 0);
  const allVar         = rows.flatMap(p => p.variantes);
  const sinStock       = allVar.filter(v => v.stock <= 0).length;
  const porAcabar      = allVar.filter(v => getStockLevel(v.stock).label === STOCK_LEVELS.warning.label).length;

  const wsKpis = XLSX.utils.json_to_sheet([
    { Indicador: 'Productos',   Valor: rows.length },
    { Indicador: 'Variantes',   Valor: totalVariantes },
    { Indicador: 'Stock total', Valor: Math.round(totalStock) },
    { Indicador: 'Disponible',  Valor: Math.round(totalDisp) },
    { Indicador: 'Reservado',   Valor: Math.round(totalRes) },
    { Indicador: 'Sin stock',   Valor: sinStock },
    { Indicador: 'Por acabar',  Valor: porAcabar },
  ]);
  XLSX.utils.book_append_sheet(wb, wsKpis, 'KPIs');

  const porProducto = [...rows]
    .sort((a, b) => b.totalStock - a.totalStock)
    .slice(0, 20)
    .map(p => ({
      Producto: p.templateName,
      Empresa: p.empresa,
      Stock: Math.round(p.totalStock),
      '% del total': totalStock > 0 ? ((p.totalStock / totalStock) * 100).toFixed(2) : '0',
      Alerta: getStockLevel(p.totalStock).label,
    }));
  const wsProd = XLSX.utils.json_to_sheet(porProducto);
  XLSX.utils.book_append_sheet(wb, wsProd, 'Por Producto');

  const colorStock = new Map<string, number>();
  const tallaStock = new Map<string, number>();
  const matrix = new Map<string, number>();
  for (const p of rows) {
    for (const v of p.variantes) {
      const c = v.color || '(sin color)';
      const t = v.talla || '(sin talla)';
      colorStock.set(c, (colorStock.get(c) ?? 0) + v.stock);
      tallaStock.set(t, (tallaStock.get(t) ?? 0) + v.stock);
      matrix.set(`${c}||${t}`, (matrix.get(`${c}||${t}`) ?? 0) + v.stock);
    }
  }
  const coloresH = [...colorStock.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([c]) => c);
  const tallasH  = sortTallas([...tallaStock.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t));
  const heatmapRows = coloresH.map(c => {
    const row: Record<string, string | number> = { Color: c };
    tallasH.forEach(t => { row[t] = matrix.get(`${c}||${t}`) ?? 0; });
    return row;
  });
  const wsHeat = XLSX.utils.json_to_sheet(heatmapRows);
  XLSX.utils.book_append_sheet(wb, wsHeat, 'Heatmap Color×Talla');

  const rotData = buildRotacion(rows, raw);
  const wsRot = XLSX.utils.json_to_sheet(rotData.map(r => ({
    Producto: r.name,
    Empresa: r.empresa,
    'Stock disponible': Math.round(r.stockDisponible),
    'Salidas/día (30d)': r.sinDatos ? '' : r.salidaDiaria.toFixed(2),
    'Días restantes': r.diasRestantes !== null ? Math.round(r.diasRestantes) : 'Sin datos',
  })));
  XLSX.utils.book_append_sheet(wb, wsRot, 'Rotación');

  XLSX.writeFile(wb, `dashboard-stock-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Export Dashboard PDF ──────────────────────────────────────────────────────

function exportDashboardPDF(rows: ProductRow[], raw: OdooAll, activeChips: { label: string }[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const hora  = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const C = {
    darkGreen:  [23,  58,  37]  as [number, number, number],
    copper:     [182, 111, 53]  as [number, number, number],
    cream:      [245, 242, 234] as [number, number, number],
    border:     [221, 216, 207] as [number, number, number],
    muted:      [122, 111, 103] as [number, number, number],
    ink:        [30,  25,  20]  as [number, number, number],
    danger:     [185, 28,  28]  as [number, number, number],
    warning:    [161, 98,  7]   as [number, number, number],
    ok:         [21,  128, 61]  as [number, number, number],
    rowAlt:     [249, 247, 243] as [number, number, number],
  };

  const drawPage = () => {
    doc.setFillColor(...C.copper);
    doc.rect(0, 0, W, 1, 'F');
    doc.setTextColor(...C.darkGreen);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Stock Odoo — Dashboard', 14, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text('Texajo — Sistema de Gestión Textil', 14, 16);
    doc.setTextColor(...C.muted);
    doc.setFontSize(7);
    doc.text(`${fecha}  ·  ${hora}`, W - 14, 11, { align: 'right' });
    const filtrosTexto = activeChips.length > 0 ? activeChips.map(c => c.label).join('  ·  ') : 'Sin filtros';
    doc.text(filtrosTexto, W - 14, 16, { align: 'right' });
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(14, 20, W - 14, 20);
    doc.setDrawColor(...C.border);
    doc.line(14, H - 8, W - 14, H - 8);
    doc.setTextColor(...C.muted);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Texajo', 14, H - 4);
    const pageInfo = (doc as jsPDF & { internal: { getCurrentPageInfo(): { pageNumber: number } } })
      .internal.getCurrentPageInfo();
    doc.text(`${pageInfo.pageNumber}`, W - 14, H - 4, { align: 'right' });
  };

  drawPage();

  const totalStock     = rows.reduce((s, p) => s + p.totalStock, 0);
  const totalVariantes = rows.reduce((s, p) => s + p.variantes.length, 0);
  const totalDisp      = rows.reduce((s, p) => s + p.variantes.reduce((a, v) => a + v.stockDisponible, 0), 0);
  const allVar         = rows.flatMap(p => p.variantes);
  const sinStock       = allVar.filter(v => v.stock <= 0).length;
  const porAcabar      = allVar.filter(v => getStockLevel(v.stock).label === STOCK_LEVELS.warning.label).length;

  const metrics = [
    { label: 'Productos',   value: String(rows.length) },
    { label: 'Variantes',   value: String(totalVariantes) },
    { label: 'Stock total', value: Math.round(totalStock).toLocaleString('es-PE') },
    { label: 'Disponible',  value: Math.round(totalDisp).toLocaleString('es-PE') },
    { label: 'Sin stock',   value: String(sinStock),   color: C.danger },
    { label: 'Por acabar',  value: String(porAcabar),  color: C.warning },
  ];
  let mx = 14;
  const my = 26;
  metrics.forEach((m, i) => {
    if (i > 0) {
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.25);
      doc.line(mx, my - 1, mx, my + 8);
      mx += 4;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(m.color ?? C.darkGreen));
    doc.text(m.value, mx, my + 6);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(m.label.toUpperCase(), mx, my + 10);
    mx += Math.max(doc.getTextWidth(m.value) + 2, 22);
  });
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(14, my + 13, W - 14, my + 13);

  let startY = my + 17;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.darkGreen);
  doc.text('ROTACIÓN ESTIMADA', 14, startY);
  startY += 3;

  const rotData = buildRotacion(rows, raw);
  autoTable(doc, {
    head: [['Producto', 'Empresa', 'Stock disp.', 'Salidas/día', 'Días restantes']],
    body: rotData.map(r => [
      r.name,
      r.empresa || '—',
      Math.round(r.stockDisponible).toLocaleString('es-PE'),
      r.sinDatos ? '—' : r.salidaDiaria.toFixed(1),
      r.diasRestantes !== null ? `${Math.round(r.diasRestantes)}d` : 'Sin datos',
    ]),
    startY,
    margin: { left: 14, right: 14, bottom: 14 },
    styles: { fontSize: 7, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, textColor: C.ink, lineColor: C.border, lineWidth: 0.15 },
    headStyles: { fillColor: C.cream, textColor: C.muted, fontStyle: 'bold', fontSize: 6.5, lineColor: C.border, lineWidth: 0.3 },
    alternateRowStyles: { fillColor: C.rowAlt },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35, textColor: C.muted },
      2: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 26, halign: 'right', textColor: C.muted },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 4) return;
      const val = String(data.cell.raw);
      if (val === 'Sin datos') { data.cell.styles.textColor = C.muted; return; }
      const d = parseInt(val);
      if (d < 7) data.cell.styles.textColor = C.danger;
      else if (d <= 30) data.cell.styles.textColor = C.warning;
      else data.cell.styles.textColor = C.ok;
    },
    didDrawPage: () => { drawPage(); },
  });

  const afterRot = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.darkGreen);
  doc.text('CONCENTRACIÓN DE STOCK — TOP PRODUCTOS', 14, afterRot);

  const topProd = [...rows].sort((a, b) => b.totalStock - a.totalStock).slice(0, 10);
  autoTable(doc, {
    head: [['Producto', 'Empresa', 'Stock', '% del total', 'Alerta']],
    body: topProd.map(p => [
      p.templateName,
      p.empresa || '—',
      Math.round(p.totalStock).toLocaleString('es-PE'),
      totalStock > 0 ? `${((p.totalStock / totalStock) * 100).toFixed(1)}%` : '0%',
      getStockLevel(p.totalStock).label,
    ]),
    startY: afterRot + 3,
    margin: { left: 14, right: 14, bottom: 14 },
    styles: { fontSize: 7, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, textColor: C.ink, lineColor: C.border, lineWidth: 0.15 },
    headStyles: { fillColor: C.cream, textColor: C.muted, fontStyle: 'bold', fontSize: 6.5, lineColor: C.border, lineWidth: 0.3 },
    alternateRowStyles: { fillColor: C.rowAlt },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 35, textColor: C.muted },
      2: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 30 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 4) return;
      const val = String(data.cell.raw);
      if (val === STOCK_LEVELS.danger.label)  { data.cell.styles.textColor = C.danger;  data.cell.styles.fontStyle = 'bold'; }
      else if (val === STOCK_LEVELS.warning.label) { data.cell.styles.textColor = C.warning; data.cell.styles.fontStyle = 'bold'; }
      else data.cell.styles.textColor = C.ok;
    },
    didDrawPage: () => { drawPage(); },
  });

  doc.save(`dashboard-stock-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Export Tabla Excel ────────────────────────────────────────────────────────

function exportTablaExcel(filtered: ProductRow[]) {
  const filas = filtered.flatMap(prod =>
    prod.variantes.map(v => ({
      Empresa:     prod.empresa,
      Producto:    prod.templateName,
      SKU:         v.sku || '',
      Color:       v.color || '',
      Talla:       v.talla || '',
      Otros:       v.otrosAttr || '',
      Stock:       v.stock,
      Reservado:   v.stockReservado,
      Disponible:  v.stockDisponible,
      Alerta:      getStockLevel(v.stock).label,
      Ubicaciones: v.locationBreakdown.map(l => `${l.locationName}: ${l.qty.toFixed(0)}`).join(' | '),
    }))
  );
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Odoo');
  XLSX.writeFile(wb, `stock-odoo-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Export Tabla PDF ──────────────────────────────────────────────────────────

function exportTablaPDF(filtered: ProductRow[], activeChips: { label: string }[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const hora  = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const totalVariantes = filtered.reduce((s, p) => s + p.variantes.length, 0);
  const totalStock     = filtered.reduce((s, p) => s + p.totalStock, 0);
  const criticos       = filtered.reduce((s, p) => s + p.variantes.filter(v => getStockLevel(v.stock).label === STOCK_LEVELS.danger.label).length, 0);
  const porAcabar      = filtered.reduce((s, p) => s + p.variantes.filter(v => getStockLevel(v.stock).label === STOCK_LEVELS.warning.label).length, 0);

  const C = {
    darkGreen:  [23,  58,  37]  as [number, number, number],
    copper:     [182, 111, 53]  as [number, number, number],
    cream:      [245, 242, 234] as [number, number, number],
    border:     [221, 216, 207] as [number, number, number],
    muted:      [122, 111, 103] as [number, number, number],
    ink:        [30,  25,  20]  as [number, number, number],
    danger:     [185, 28,  28]  as [number, number, number],
    warning:    [161, 98,  7]   as [number, number, number],
    ok:         [21,  128, 61]  as [number, number, number],
    rowAlt:     [249, 247, 243] as [number, number, number],
  };

  const drawPage = () => {
    doc.setFillColor(...C.copper);
    doc.rect(0, 0, W, 1, 'F');
    doc.setTextColor(...C.darkGreen);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Stock Odoo', 14, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text('Texajo — Sistema de Gestión Textil', 14, 16);
    doc.setTextColor(...C.muted);
    doc.setFontSize(7);
    doc.text(`${fecha}  ·  ${hora}`, W - 14, 11, { align: 'right' });
    const filtrosTexto = activeChips.length > 0 ? activeChips.map(c => c.label).join('  ·  ') : 'Sin filtros';
    doc.text(filtrosTexto, W - 14, 16, { align: 'right' });
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(14, 20, W - 14, 20);
    doc.setDrawColor(...C.border);
    doc.line(14, H - 8, W - 14, H - 8);
    doc.setTextColor(...C.muted);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Texajo', 14, H - 4);
    const pageInfo = (doc as jsPDF & { internal: { getCurrentPageInfo(): { pageNumber: number } } })
      .internal.getCurrentPageInfo();
    doc.text(`${pageInfo.pageNumber}`, W - 14, H - 4, { align: 'right' });
  };

  drawPage();

  const metrics = [
    { label: 'Productos',  value: String(filtered.length) },
    { label: 'Variantes',  value: String(totalVariantes) },
    { label: 'Total uds',  value: totalStock.toFixed(0) },
    { label: 'Críticos',   value: String(criticos),  color: C.danger },
    { label: 'Por acabar', value: String(porAcabar), color: C.warning },
  ];
  let mx = 14;
  const my = 26;
  metrics.forEach((m, i) => {
    if (i > 0) {
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.25);
      doc.line(mx, my - 1, mx, my + 8);
      mx += 4;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(m.color ?? C.darkGreen));
    doc.text(m.value, mx, my + 6);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(m.label.toUpperCase(), mx, my + 10);
    mx += Math.max(doc.getTextWidth(m.value) + 2, 22);
  });
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(14, my + 13, W - 14, my + 13);

  const head = [['Empresa', 'Producto', 'SKU', 'Color', 'Talla', 'Stock', 'Reservado', 'Disponible', 'Alerta']];
  const body = filtered.flatMap(prod =>
    prod.variantes.map((v: VariantRow) => [
      prod.empresa,
      prod.templateName,
      v.sku || '—',
      v.color || '—',
      v.talla || '—',
      v.stock.toFixed(0),
      v.stockReservado > 0 ? v.stockReservado.toFixed(0) : '—',
      v.stockDisponible.toFixed(0),
      getStockLevel(v.stock).label,
    ])
  );

  autoTable(doc, {
    head,
    body,
    startY: my + 16,
    margin: { left: 14, right: 14, bottom: 14 },
    styles: { fontSize: 7, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, textColor: C.ink, lineColor: C.border, lineWidth: 0.15, font: 'helvetica' },
    headStyles: { fillColor: [245, 242, 234], textColor: C.muted, fontStyle: 'bold', fontSize: 6.5, lineColor: C.border, lineWidth: 0.3, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: C.rowAlt },
    columnStyles: {
      0: { cellWidth: 26, textColor: C.muted },
      1: { cellWidth: 52 },
      2: { cellWidth: 26, textColor: C.muted },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 20, halign: 'right', textColor: C.muted },
      7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 26 },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 8) return;
      const val = String(data.cell.raw);
      if (val === STOCK_LEVELS.danger.label)       { data.cell.styles.textColor = C.danger;  data.cell.styles.fontStyle = 'bold'; }
      else if (val === STOCK_LEVELS.warning.label) { data.cell.styles.textColor = C.warning; data.cell.styles.fontStyle = 'bold'; }
      else                                          { data.cell.styles.textColor = C.ok; }
    },
    didDrawPage: () => { drawPage(); },
  });

  doc.save(`stock-odoo-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OdooStock() {
  const [raw, setRaw]           = useState<OdooAll | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [vista, setVista]       = useState<'tabla' | 'dashboard'>('tabla');

  const [filtroEmpresas, setFiltroEmpresas]   = useState<Set<string>>(new Set());
  const [filtroProductos, setFiltroProductos] = useState<Set<string>>(new Set());
  const [filtroColores, setFiltroColores]     = useState<Set<string>>(new Set());
  const [filtroTallas, setFiltroTallas]       = useState<Set<string>>(new Set());
  const [filtroStock, setFiltroStock]   = useState<'todos' | 'con' | 'sin'>('todos');
  const [filtroAlerta, setFiltroAlerta] = useState<'todos' | 'ok' | 'warning' | 'danger'>('todos');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOdooAll();
      setRaw(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const allRows: ProductRow[] = useMemo(() => {
    if (!raw) return [];
    return buildProductRows(raw);
  }, [raw]);

  const empresasOpts  = useMemo(() => [...new Set(allRows.map(p => p.empresa).filter(Boolean))].sort(), [allRows]);
  const productosOpts = useMemo(() => {
    const base = filtroEmpresas.size > 0 ? allRows.filter(p => filtroEmpresas.has(p.empresa)) : allRows;
    return [...new Set(base.map(p => p.templateName))].sort();
  }, [allRows, filtroEmpresas]);

  const coloresOpts = useMemo(() => {
    const base = filtroProductos.size > 0
      ? allRows.filter(p => filtroProductos.has(p.templateName))
      : filtroEmpresas.size > 0 ? allRows.filter(p => filtroEmpresas.has(p.empresa)) : allRows;
    const s = new Set<string>();
    base.forEach(p => p.variantes.forEach(v => { if (v.color) s.add(v.color); }));
    return [...s].sort();
  }, [allRows, filtroProductos, filtroEmpresas]);

  const tallasOpts = useMemo(() => {
    const base = filtroProductos.size > 0
      ? allRows.filter(p => filtroProductos.has(p.templateName))
      : filtroEmpresas.size > 0 ? allRows.filter(p => filtroEmpresas.has(p.empresa)) : allRows;
    const s = new Set<string>();
    base.forEach(p => p.variantes.forEach(v => { if (v.talla) s.add(v.talla); }));
    return [...s].sort();
  }, [allRows, filtroProductos, filtroEmpresas]);

  useEffect(() => {
    setFiltroProductos(prev => {
      const valid = new Set(productosOpts);
      const next = new Set([...prev].filter(p => valid.has(p)));
      return next.size !== prev.size ? next : prev;
    });
  }, [productosOpts]);

  useEffect(() => {
    setFiltroColores(prev => {
      const valid = new Set(coloresOpts);
      const next = new Set([...prev].filter(c => valid.has(c)));
      return next.size !== prev.size ? next : prev;
    });
    setFiltroTallas(prev => {
      const valid = new Set(tallasOpts);
      const next = new Set([...prev].filter(t => valid.has(t)));
      return next.size !== prev.size ? next : prev;
    });
  }, [coloresOpts, tallasOpts]);

  const toggleSet = (set: Set<string>, val: string): Set<string> => {
    const n = new Set(set);
    n.has(val) ? n.delete(val) : n.add(val);
    return n;
  };

  const filtered: ProductRow[] = useMemo(() => {
    return allRows
      .map(p => {
        if (filtroEmpresas.size  > 0 && !filtroEmpresas.has(p.empresa))       return null;
        if (filtroProductos.size > 0 && !filtroProductos.has(p.templateName)) return null;
        const variantes = p.variantes.filter(v => {
          if (filtroColores.size > 0 && !filtroColores.has(v.color)) return false;
          if (filtroTallas.size  > 0 && !filtroTallas.has(v.talla))  return false;
          if (filtroStock === 'con' && v.stock <= 0) return false;
          if (filtroStock === 'sin' && v.stock > 0)  return false;
          if (filtroAlerta !== 'todos' &&
              getStockLevel(v.stock).label !== STOCK_LEVELS[filtroAlerta].label) return false;
          return true;
        });
        if (variantes.length === 0) return null;
        const totalStock = variantes.reduce((s, v) => s + v.stock, 0);
        return { ...p, variantes, totalStock };
      })
      .filter(Boolean) as ProductRow[];
  }, [allRows, filtroEmpresas, filtroProductos, filtroColores, filtroTallas, filtroStock, filtroAlerta]);

  const toggle      = (id: number) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll   = () => setExpanded(new Set(filtered.map(p => p.templateId)));
  const collapseAll = () => setExpanded(new Set());

  const hasFilters = filtroEmpresas.size > 0 || filtroProductos.size > 0 ||
    filtroColores.size > 0 || filtroTallas.size > 0 ||
    filtroStock !== 'todos' || filtroAlerta !== 'todos';

  const clearAll = () => {
    setFiltroEmpresas(new Set());
    setFiltroProductos(new Set());
    setFiltroColores(new Set());
    setFiltroTallas(new Set());
    setFiltroStock('todos');
    setFiltroAlerta('todos');
  };

  const activeChips: { label: string; onRemove: () => void }[] = [
    ...[...filtroEmpresas].map(e  => ({ label: e, onRemove: () => setFiltroEmpresas(s  => toggleSet(s, e)) })),
    ...[...filtroProductos].map(p => ({ label: p, onRemove: () => setFiltroProductos(s => toggleSet(s, p)) })),
    ...[...filtroColores].map(c   => ({ label: c, onRemove: () => setFiltroColores(s   => toggleSet(s, c)) })),
    ...[...filtroTallas].map(t    => ({ label: t, onRemove: () => setFiltroTallas(s    => toggleSet(s, t)) })),
    ...(filtroStock === 'con' ? [{ label: 'Con stock',  onRemove: () => setFiltroStock('todos') }] : []),
    ...(filtroStock === 'sin' ? [{ label: 'Sin stock',  onRemove: () => setFiltroStock('todos') }] : []),
    ...(filtroAlerta !== 'todos' ? [{ label: STOCK_LEVELS[filtroAlerta].label, onRemove: () => setFiltroAlerta('todos') }] : []),
  ];

  const handleSelectProduct = (name: string) => {
    setFiltroProductos(new Set([name]));
    setVista('tabla');
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A]">Stock Odoo</h2>
          <p className="text-[11px] text-[#9A8F87] mt-0.5">
            {raw ? `${allRows.length} productos · ${raw.variants.length} variantes` : 'Sin datos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {raw && (
            <div className="flex border border-[#DDD8CF] overflow-hidden">
              <button
                onClick={() => setVista('tabla')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${
                  vista === 'tabla' ? 'bg-[#173A25] text-[#F5F2EA]' : 'bg-white text-[#7A6F67] hover:text-[#173A25]'
                }`}
              >
                <List className="h-3 w-3" />
                Tabla
              </button>
              <button
                onClick={() => setVista('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors border-l border-[#DDD8CF] ${
                  vista === 'dashboard' ? 'bg-[#173A25] text-[#F5F2EA]' : 'bg-white text-[#7A6F67] hover:text-[#173A25]'
                }`}
              >
                <LayoutDashboard className="h-3 w-3" />
                Dashboard
              </button>
            </div>
          )}

          {filtered.length > 0 && vista === 'tabla' && (
            <>
              <button onClick={() => exportTablaExcel(filtered)} className="btn-secondary flex items-center gap-1.5" title="Exportar a Excel">
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-700" />
                Excel
              </button>
              <button onClick={() => exportTablaPDF(filtered, activeChips)} className="btn-secondary flex items-center gap-1.5" title="Exportar a PDF">
                <FileText className="h-3.5 w-3.5 text-red-600" />
                PDF
              </button>
            </>
          )}

          {filtered.length > 0 && vista === 'dashboard' && raw && (
            <>
              <button onClick={() => exportDashboardExcel(filtered, raw)} className="btn-secondary flex items-center gap-1.5" title="Exportar dashboard a Excel">
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-700" />
                Excel
              </button>
              <button onClick={() => exportDashboardPDF(filtered, raw, activeChips)} className="btn-secondary flex items-center gap-1.5" title="Exportar dashboard a PDF">
                <FileText className="h-3.5 w-3.5 text-red-600" />
                PDF
              </button>
            </>
          )}

          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 text-red-700 text-xs">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Error al conectar con Odoo</p>
            <p className="mt-0.5 font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !raw && (
        <div className="flex items-center justify-center py-16 text-[#9A8F87] gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Consultando Odoo…</span>
        </div>
      )}

      {/* Layout: sidebar + contenido */}
      {raw && (
        <div className="flex gap-4 items-start">

          {/* Sidebar filtros */}
          <aside className="w-52 flex-shrink-0 border border-[#DDD8CF] bg-[#F5F2EA] sticky top-4">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#DDD8CF]">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Filtros</span>
              {hasFilters && (
                <button onClick={clearAll} className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#C4612A] hover:text-[#a04e22] transition-colors">
                  Limpiar
                </button>
              )}
            </div>

            <FilterSection title="Alerta">
              <div className="flex flex-col gap-1.5">
                {([
                  { key: 'todos',   label: 'Todos',                    dot: 'bg-[#DDD8CF]',   desc: '' },
                  { key: 'ok',      label: STOCK_LEVELS.ok.label,      dot: 'bg-green-500',   desc: `>${STOCK_THRESHOLDS.OK_MIN}` },
                  { key: 'warning', label: STOCK_LEVELS.warning.label, dot: 'bg-yellow-400',  desc: `${STOCK_THRESHOLDS.WARN_MIN}–${STOCK_THRESHOLDS.WARN_MAX}` },
                  { key: 'danger',  label: STOCK_LEVELS.danger.label,  dot: 'bg-red-500',     desc: `<${STOCK_THRESHOLDS.WARN_MIN}` },
                ] as const).map(({ key, label, dot, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFiltroAlerta(key)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 border text-left transition-colors w-full ${
                      filtroAlerta === key
                        ? 'bg-[#173A25] border-[#173A25]'
                        : 'bg-white border-[#DDD8CF] hover:border-[#173A25]'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                    <span className={`text-[10px] font-bold flex-1 ${filtroAlerta === key ? 'text-[#F5F2EA]' : 'text-[#1A1A1A]'}`}>{label}</span>
                    {desc && <span className={`text-[9px] ${filtroAlerta === key ? 'text-[#DDD8CF]' : 'text-[#9A8F87]'}`}>{desc}</span>}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Empresa">
              <div className="flex flex-col gap-1.5">
                {empresasOpts.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setFiltroEmpresas(s => toggleSet(s, e))}
                    className={`text-[10px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 border text-left transition-colors w-full ${
                      filtroEmpresas.has(e)
                        ? 'bg-[#173A25] text-[#F5F2EA] border-[#173A25]'
                        : 'bg-white text-[#7A6F67] border-[#DDD8CF] hover:border-[#173A25] hover:text-[#173A25]'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Producto">
              <CheckList options={productosOpts} selected={filtroProductos} onChange={v => setFiltroProductos(s => toggleSet(s, v))} />
            </FilterSection>

            <FilterSection title="Color" defaultOpen={false}>
              <CheckList options={coloresOpts} selected={filtroColores} onChange={v => setFiltroColores(s => toggleSet(s, v))} />
            </FilterSection>

            <FilterSection title="Talla" defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                {tallasOpts.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFiltroTallas(s => toggleSet(s, t))}
                    className={`text-[10px] font-bold px-2 py-0.5 border transition-colors ${
                      filtroTallas.has(t)
                        ? 'bg-[#173A25] text-[#F5F2EA] border-[#173A25]'
                        : 'bg-white text-[#7A6F67] border-[#DDD8CF] hover:border-[#173A25] hover:text-[#173A25]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Stock">
              <div className="flex flex-col gap-1.5">
                {(['todos', 'con', 'sin'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFiltroStock(opt)}
                    className={`text-[10px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 border text-left transition-colors w-full ${
                      filtroStock === opt
                        ? 'bg-[#173A25] text-[#F5F2EA] border-[#173A25]'
                        : 'bg-white text-[#7A6F67] border-[#DDD8CF] hover:border-[#173A25] hover:text-[#173A25]'
                    }`}
                  >
                    {opt === 'todos' ? 'Todos' : opt === 'con' ? 'Con stock' : 'Sin stock'}
                  </button>
                ))}
              </div>
            </FilterSection>
          </aside>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0 space-y-2">

            {/* Chips + controles */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap gap-1">
                {activeChips.map(chip => (
                  <span
                    key={chip.label}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 bg-[#173A25] text-[#F5F2EA]"
                  >
                    {chip.label}
                    <button type="button" onClick={chip.onRemove} className="hover:text-[#DDD8CF] transition-colors">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9A8F87] ml-auto">
                <span>{filtered.length} productos · {filtered.reduce((s, p) => s + p.variantes.length, 0)} variantes</span>
                {vista === 'tabla' && (
                  <>
                    <button onClick={expandAll}   className="hover:text-[#1A1A1A] underline transition-colors">Expandir</button>
                    <button onClick={collapseAll} className="hover:text-[#1A1A1A] underline transition-colors">Colapsar</button>
                  </>
                )}
              </div>
            </div>

            {/* Dashboard */}
            {vista === 'dashboard' && (
              <Dashboard rows={filtered} raw={raw} onSelectProduct={handleSelectProduct} />
            )}

            {/* Sin resultados */}
            {vista === 'tabla' && filtered.length === 0 && !loading && (
              <p className="text-center text-[11px] text-[#9A8F87] py-16 font-mono uppercase tracking-widest">
                Sin resultados
              </p>
            )}

            {/* Tabla de productos */}
            {vista === 'tabla' && filtered.map(prod => {
              const isOpen = expanded.has(prod.templateId);
              return (
                <div key={prod.templateId} className="bg-white border border-[#DDD8CF] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(prod.templateId)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#F5F2EA] text-left transition-colors"
                  >
                    {isOpen
                      ? <ChevronDown  className="h-3.5 w-3.5 text-[#9A8F87] flex-shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 text-[#9A8F87] flex-shrink-0" />}
                    <span className="text-xs font-bold text-[#1A1A1A] flex-1 truncate">{prod.templateName}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 bg-[#173A25] text-[#F5F2EA]">
                      {prod.empresa || '—'}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 ${stockBadgeClass(prod.totalStock)}`}>
                      {prod.totalStock.toFixed(0)} uds
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getStockLevel(prod.totalStock).dotColor }}
                      title={getStockLevel(prod.totalStock).label}
                    />
                    <span className="text-[9px] text-[#9A8F87]">{prod.variantes.length} var.</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#DDD8CF] overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-[#1A1A1A] text-[#F5F2EA]">
                            {['SKU', 'Color', 'Talla', 'Otros', 'Stock', 'Reservado', 'Disponible', 'Ubicaciones'].map(h => (
                              <th key={h} className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-left whitespace-nowrap font-mono">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {prod.variantes.map((v, i) => {
                            const esNivelActivo = filtroAlerta !== 'todos' &&
                              getStockLevel(v.stock).label === STOCK_LEVELS[filtroAlerta].label;
                            return (
                              <tr
                                key={v.variantId}
                                className={`border-b border-[#DDD8CF] hover:bg-[#F5F2EA] transition-colors ${
                                  esNivelActivo
                                    ? filtroAlerta === 'danger'  ? 'bg-red-50 border-l-2 border-l-red-400'
                                    : filtroAlerta === 'warning' ? 'bg-yellow-50 border-l-2 border-l-yellow-400'
                                    :                              'bg-green-50 border-l-2 border-l-green-400'
                                    : i % 2 === 0 ? 'bg-white' : 'bg-[#F7F4EF]'
                                }`}
                              >
                                <td className="px-3 py-1.5 font-mono text-[#7A6F67] text-[11px]">{v.sku || '—'}</td>
                                <td className="px-3 py-1.5 text-[#1A1A1A]">{v.color || '—'}</td>
                                <td className="px-3 py-1.5 text-[#1A1A1A]">{v.talla || '—'}</td>
                                <td className="px-3 py-1.5 text-[#9A8F87] text-[10px]">{v.otrosAttr || '—'}</td>
                                <td className="px-3 py-1.5 text-right">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStockLevel(v.stock).dotColor }} title={getStockLevel(v.stock).label} />
                                    <span className={`font-mono font-bold text-[11px] ${stockBadgeClass(v.stock)}`}>{v.stock.toFixed(0)}</span>
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-right font-mono text-[#7A6F67] text-[11px]">
                                  {v.stockReservado > 0 ? v.stockReservado.toFixed(0) : '—'}
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <span className={`font-mono font-bold px-1.5 py-0.5 text-[11px] ${stockBadgeClass(v.stockDisponible)}`}>
                                    {v.stockDisponible.toFixed(0)}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-[10px] text-[#9A8F87] max-w-[180px] truncate">
                                  {v.locationBreakdown.length > 0
                                    ? v.locationBreakdown.map(l => `${l.locationName}: ${l.qty.toFixed(0)}`).join(' · ')
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
