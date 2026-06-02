import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, AlertCircle, Loader2, X, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  fetchOdooAll,
  buildProductRows,
  type OdooAll,
  type ProductRow,
} from '../lib/odooService';
import { stockBadgeClass, getStockLevel, STOCK_THRESHOLDS, STOCK_LEVELS } from '../lib/stockConfig';

// ── FilterSection colapsable ──────────────────────────────────────────────────

function FilterSection({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
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
          : <ChevronRight className="h-3 w-3 text-[#9A8F87]" />
        }
      </button>
      {open && <div className="pb-3 px-3">{children}</div>}
    </div>
  );
}

// ── CheckList con búsqueda interna ────────────────────────────────────────────

function CheckList({ options, selected, onChange }: {
  options: string[];
  selected: Set<string>;
  onChange: (val: string) => void;
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
            <input
              type="checkbox"
              checked={selected.has(opt)}
              onChange={() => onChange(opt)}
              className="flex-shrink-0"
            />
            <span className={`text-[11px] leading-tight transition-colors ${
              selected.has(opt) ? 'text-[#1A1A1A] font-bold' : 'text-[#7A6F67] group-hover:text-[#1A1A1A]'
            }`}>
              {opt}
            </span>
          </label>
        ))}
        {visible.length === 0 && (
          <p className="text-[10px] text-[#9A8F87] italic">Sin resultados</p>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OdooStock() {
  const [raw, setRaw]           = useState<OdooAll | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Filters
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
    const base = filtroEmpresas.size > 0
      ? allRows.filter(p => filtroEmpresas.has(p.empresa))
      : allRows;
    return [...new Set(base.map(p => p.templateName))].sort();
  }, [allRows, filtroEmpresas]);
  const coloresOpts = useMemo(() => {
    const base = filtroProductos.size > 0
      ? allRows.filter(p => filtroProductos.has(p.templateName))
      : filtroEmpresas.size > 0
      ? allRows.filter(p => filtroEmpresas.has(p.empresa))
      : allRows;
    const s = new Set<string>();
    base.forEach(p => p.variantes.forEach(v => { if (v.color) s.add(v.color); }));
    return [...s].sort();
  }, [allRows, filtroProductos, filtroEmpresas]);

  const tallasOpts = useMemo(() => {
    const base = filtroProductos.size > 0
      ? allRows.filter(p => filtroProductos.has(p.templateName))
      : filtroEmpresas.size > 0
      ? allRows.filter(p => filtroEmpresas.has(p.empresa))
      : allRows;
    const s = new Set<string>();
    base.forEach(p => p.variantes.forEach(v => { if (v.talla) s.add(v.talla); }));
    return [...s].sort();
  }, [allRows, filtroProductos, filtroEmpresas]);

  // Limpiar selecciones en cascada cuando cambian las opciones disponibles
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
          // Opción A: filtrar variantes al nivel de alerta seleccionado
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

  const exportarExcel = () => {
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
    XLSX.writeFile(wb, `stock-odoo-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    const hora  = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const totalVariantes = filtered.reduce((s, p) => s + p.variantes.length, 0);
    const totalStock     = filtered.reduce((s, p) => s + p.totalStock, 0);
    const criticos       = filtered.reduce((s, p) => s + p.variantes.filter(v => getStockLevel(v.stock).label === STOCK_LEVELS.danger.label).length, 0);
    const porAcabar      = filtered.reduce((s, p) => s + p.variantes.filter(v => getStockLevel(v.stock).label === STOCK_LEVELS.warning.label).length, 0);

    // Colores Texajo
    const C = {
      darkGreen:  [23,  58,  37]  as [number,number,number],
      copper:     [182, 111, 53]  as [number,number,number],
      cream:      [245, 242, 234] as [number,number,number],
      border:     [221, 216, 207] as [number,number,number],
      muted:      [122, 111, 103] as [number,number,number],
      ink:        [30,  25,  20]  as [number,number,number],
      danger:     [185, 28,  28]  as [number,number,number],
      warning:    [161, 98,  7]   as [number,number,number],
      ok:         [21,  128, 61]  as [number,number,number],
      rowAlt:     [249, 247, 243] as [number,number,number],
    };

    const drawPage = () => {
      // Fondo blanco
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, W, H, 'F');

      // Línea cobre fina en la parte superior (2 px)
      doc.setFillColor(...C.copper);
      doc.rect(0, 0, W, 1, 'F');

      // Título — texto oscuro, sin fondo de color
      doc.setTextColor(...C.darkGreen);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Stock Odoo', 14, 11);

      // Subtítulo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text('Texajo — Sistema de Gestión Textil', 14, 16);

      // Fecha y filtros a la derecha
      doc.setTextColor(...C.muted);
      doc.setFontSize(7);
      doc.text(`${fecha}  ·  ${hora}`, W - 14, 11, { align: 'right' });
      const filtrosTexto = activeChips.length > 0
        ? activeChips.map(c => c.label).join('  ·  ')
        : 'Sin filtros';
      doc.text(filtrosTexto, W - 14, 16, { align: 'right' });

      // Línea separadora bajo el header
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.3);
      doc.line(14, 20, W - 14, 20);

      // Footer — solo línea y texto pequeño
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

    // ── Resumen en una línea de métricas ─────────────────────────────────────
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
      // Separador
      if (i > 0) {
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.25);
        doc.line(mx, my - 1, mx, my + 8);
        mx += 4;
      }
      // Número grande
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(m.color ?? C.darkGreen));
      doc.text(m.value, mx, my + 6);
      // Label debajo
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(m.label.toUpperCase(), mx, my + 10);
      mx += Math.max(doc.getTextWidth(m.value) + 2, 22);
    });

    // Línea bajo las métricas
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(14, my + 13, W - 14, my + 13);

    // ── Tabla ────────────────────────────────────────────────────────────────
    const head = [['Empresa', 'Producto', 'SKU', 'Color', 'Talla', 'Stock', 'Reservado', 'Disponible', 'Alerta']];
    const body = filtered.flatMap(prod =>
      prod.variantes.map(v => [
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
      styles: {
        fontSize: 7,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        textColor: C.ink,
        lineColor: C.border,
        lineWidth: 0.15,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [245, 242, 234],
        textColor: C.muted,
        fontStyle: 'bold',
        fontSize: 6.5,
        lineColor: C.border,
        lineWidth: 0.3,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
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
        if (val === STOCK_LEVELS.danger.label) {
          data.cell.styles.textColor = C.danger;
          data.cell.styles.fontStyle = 'bold';
        } else if (val === STOCK_LEVELS.warning.label) {
          data.cell.styles.textColor = C.warning;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = C.ok;
        }
      },
      didDrawPage: () => { drawPage(); },
    });

    doc.save(`stock-odoo-${new Date().toISOString().slice(0,10)}.pdf`);
  };

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

  // Active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [
    ...[...filtroEmpresas].map(e => ({ label: e, onRemove: () => setFiltroEmpresas(s => toggleSet(s, e)) })),
    ...[...filtroProductos].map(p => ({ label: p, onRemove: () => setFiltroProductos(s => toggleSet(s, p)) })),
    ...[...filtroColores].map(c => ({ label: c, onRemove: () => setFiltroColores(s => toggleSet(s, c)) })),
    ...[...filtroTallas].map(t => ({ label: t, onRemove: () => setFiltroTallas(s => toggleSet(s, t)) })),
    ...(filtroStock === 'con' ? [{ label: 'Con stock', onRemove: () => setFiltroStock('todos') }] : []),
    ...(filtroStock === 'sin' ? [{ label: 'Sin stock', onRemove: () => setFiltroStock('todos') }] : []),
    ...(filtroAlerta !== 'todos' ? [{ label: STOCK_LEVELS[filtroAlerta].label, onRemove: () => setFiltroAlerta('todos') }] : []),
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A]">Stock Odoo</h2>
          <p className="text-[11px] text-[#9A8F87] mt-0.5">
            {raw
              ? `${allRows.length} productos · ${raw.variants.length} variantes`
              : 'Sin datos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <>
              <button
                onClick={exportarExcel}
                className="btn-secondary flex items-center gap-1.5"
                title="Exportar a Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-700" />
                Excel
              </button>
              <button
                onClick={exportarPDF}
                className="btn-secondary flex items-center gap-1.5"
                title="Exportar a PDF"
              >
                <FileText className="h-3.5 w-3.5 text-red-600" />
                PDF
              </button>
            </>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
          >
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

      {/* Layout principal: sidebar + contenido */}
      {raw && (
        <div className="flex gap-4 items-start">

          {/* ── Panel lateral de filtros ── */}
          <aside className="w-52 flex-shrink-0 border border-[#DDD8CF] bg-[#F5F2EA] sticky top-4">

            {/* Header panel */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#DDD8CF]">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">Filtros</span>
              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#C4612A] hover:text-[#a04e22] transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Filtro por alerta */}
            <FilterSection title="Alerta">
              <div className="flex flex-col gap-1.5">
                {([
                  { key: 'todos',   label: 'Todos',                    dot: 'bg-[#DDD8CF]',    desc: '' },
                  { key: 'ok',      label: STOCK_LEVELS.ok.label,      dot: 'bg-green-500',   desc: `> ${STOCK_THRESHOLDS.OK_MIN}` },
                  { key: 'warning', label: STOCK_LEVELS.warning.label, dot: 'bg-yellow-400',  desc: `${STOCK_THRESHOLDS.WARN_MIN}–${STOCK_THRESHOLDS.WARN_MAX}` },
                  { key: 'danger',  label: STOCK_LEVELS.danger.label,  dot: 'bg-red-500',     desc: `< ${STOCK_THRESHOLDS.WARN_MIN}` },
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
                    <span className={`text-[10px] font-bold flex-1 ${filtroAlerta === key ? 'text-[#F5F2EA]' : 'text-[#1A1A1A]'}`}>
                      {label}
                    </span>
                    {desc && (
                      <span className={`text-[9px] ${filtroAlerta === key ? 'text-[#DDD8CF]' : 'text-[#9A8F87]'}`}>
                        {desc}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Empresa */}
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

            {/* Producto */}
            <FilterSection title="Producto">
              <CheckList
                options={productosOpts}
                selected={filtroProductos}
                onChange={v => setFiltroProductos(s => toggleSet(s, v))}
              />
            </FilterSection>

            {/* Color */}
            <FilterSection title="Color" defaultOpen={false}>
              <CheckList
                options={coloresOpts}
                selected={filtroColores}
                onChange={v => setFiltroColores(s => toggleSet(s, v))}
              />
            </FilterSection>

            {/* Talla */}
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

            {/* Stock */}
            <FilterSection title="Stock" defaultOpen={true}>
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

          {/* ── Contenido principal ── */}
          <div className="flex-1 min-w-0 space-y-2">

            {/* Chips de filtros activos + resumen */}
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
                <button onClick={expandAll}   className="hover:text-[#1A1A1A] underline transition-colors">Expandir</button>
                <button onClick={collapseAll} className="hover:text-[#1A1A1A] underline transition-colors">Colapsar</button>
              </div>
            </div>

            {/* Sin resultados */}
            {filtered.length === 0 && !loading && (
              <p className="text-center text-[11px] text-[#9A8F87] py-16 font-mono uppercase tracking-widest">
                Sin resultados
              </p>
            )}

            {/* Filas de productos */}
            {filtered.map(prod => {
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
                      : <ChevronRight className="h-3.5 w-3.5 text-[#9A8F87] flex-shrink-0" />
                    }
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
                            {['SKU','Color','Talla','Otros','Stock','Reservado','Disponible','Ubicaciones'].map(h => (
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
                            <tr key={v.variantId} className={`border-b border-[#DDD8CF] hover:bg-[#F5F2EA] transition-colors ${
                              esNivelActivo
                                ? filtroAlerta === 'danger'  ? 'bg-red-50 border-l-2 border-l-red-400'
                                : filtroAlerta === 'warning' ? 'bg-yellow-50 border-l-2 border-l-yellow-400'
                                :                              'bg-green-50 border-l-2 border-l-green-400'
                                : i % 2 === 0 ? 'bg-white' : 'bg-[#F7F4EF]'
                            }`}>
                              <td className="px-3 py-1.5 font-mono text-[#7A6F67] text-[11px]">{v.sku || '—'}</td>
                              <td className="px-3 py-1.5 text-[#1A1A1A]">{v.color || '—'}</td>
                              <td className="px-3 py-1.5 text-[#1A1A1A]">{v.talla || '—'}</td>
                              <td className="px-3 py-1.5 text-[#9A8F87] text-[10px]">{v.otrosAttr || '—'}</td>
                              <td className="px-3 py-1.5 text-right">
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: getStockLevel(v.stock).dotColor }}
                                    title={getStockLevel(v.stock).label}
                                  />
                                  <span className={`font-mono font-bold text-[11px] ${stockBadgeClass(v.stock)}`}>
                                    {v.stock.toFixed(0)}
                                  </span>
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
