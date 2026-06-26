import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';
import { useEsAdmin } from '../lib/useEsAdmin';
import { useEsSupervisor } from '../lib/useEsSupervisor';
import { Download, Plus, X, FileText, Trash2, Pencil } from 'lucide-react';
import { TipoMovimientoTela, CategoriaColor, Tela, Color } from '../types';
import { ModuleInfoBox } from '../components/ModuleInfoBox';
import { exportRowsToXlsx, exportTableToPdf } from '../lib/export';
import { newId } from '../lib/storage';
import { mockColores } from '../data';
import { capWords } from '../lib/utils';
type InvTab = 'movimientos' | 'matriz' | 'criticos' | 'historico' | 'catalogos';

const TIPOS: TipoMovimientoTela[] = ['INGRESO', 'A_CORTE', 'A_REPROCESO', 'DE_REPROCESO', 'MUESTRA', 'AJUSTE_POS', 'AJUSTE_NEG'];
const TIPO_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso', A_CORTE: 'A Corte', A_REPROCESO: 'A Reproceso',
  DE_REPROCESO: 'De Reproceso', MUESTRA: 'Muestra', AJUSTE_POS: 'Ajuste +', AJUSTE_NEG: 'Ajuste −',
};

interface MovForm {
  fecha: string; tipo: TipoMovimientoTela; clienteId: string; telaId: string;
  colorId: string;
  rollos: string; kgTotal: string; precioKg: string;
  responsable: string; proveedorId: string; nFactura: string; notas: string;
}

const emptyForm = (): MovForm => ({
  fecha: new Date().toISOString().slice(0, 10), tipo: 'INGRESO', clienteId: '',
  telaId: '', colorId: '',
  rollos: '', kgTotal: '', precioKg: '',
  responsable: '', proveedorId: '', nFactura: '', notas: '',
});

type SegmentMode = 'ninguno' | 'tipo' | 'tela';

export function InventarioTelas() {
  const { movimientosTela, telas, colores, clientes, proveedores, preciosTelas, config, cortes, addMovimientoTela, deleteMovimientoTela, addTela, updateTela, deleteTela, addColor, updateColor, deleteColor } = useAppContext();
  const { addToast } = useToast();
  const esAdmin = useEsAdmin();
  const esSupervisor = useEsSupervisor();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MovForm>(emptyForm());
  const [filterTela, setFilterTela] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [segmentMode, setSegmentMode] = useState<SegmentMode>('ninguno');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InvTab>('matriz');
  const [filterTipo, setFilterTipo] = useState<TipoMovimientoTela | ''>('');

  // --- Catálogos: Telas ---
  type TelaForm = { nombre: string; composicion: string; kgPorRollo: string; notas: string };
  const emptyTelaForm = (): TelaForm => ({ nombre: '', composicion: '', kgPorRollo: '', notas: '' });
  const [showTelaForm, setShowTelaForm] = useState(false);
  const [editTelaId, setEditTelaId] = useState<string | null>(null);
  const [telaForm, setTelaForm] = useState<TelaForm>(emptyTelaForm());
  const [confirmDeleteTela, setConfirmDeleteTela] = useState<string | null>(null);

  // --- Catálogos: Colores ---
  type ColorForm = { nombre: string; categoria: CategoriaColor; prioridad: string; notas: string };
  const emptyColorForm = (): ColorForm => ({ nombre: '', categoria: 'OSCURO', prioridad: '', notas: '' });
  const [showColorForm, setShowColorForm] = useState(false);
  const [editColorId, setEditColorId] = useState<string | null>(null);
  const [colorForm, setColorForm] = useState<ColorForm>(emptyColorForm());
  const [confirmDeleteColor, setConfirmDeleteColor] = useState<string | null>(null);
  const [confirmResetColores, setConfirmResetColores] = useState(false);

  const handleResetColores = async () => {
    const canonicos = new Set(mockColores.map(c => c.nombre.toLowerCase()));
    const BASE_MAP = new Map(mockColores.map(c => [c.nombre.toLowerCase(), c]));
    // Detecta si un ID es UUID local (nunca persistido en Supabase donde id es integer)
    const esUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

    // ── Paso 1: resolver _dup_ de enteros (formato _dup_68) buscando color canónico en cortes ──
    const dupViejos = colores.filter(c => /^_dup_\d+$/.test(c.nombre) && !esUUID(c.id));
    for (const dup of dupViejos) {
      let canonNombre: string | null = null;
      for (const corte of cortes) {
        if (corte.colorId === dup.id && corte.tonalidad) {
          const base = corte.tonalidad.replace(/\s+Tn-?\d+$/i, '').trim();
          if (canonicos.has(base.toLowerCase())) { canonNombre = base; break; }
        }
        const det = corte.coloresDetalle?.find(d => d.colorId === dup.id);
        if (det?.tonalidad) {
          const base = det.tonalidad.replace(/\s+Tn-?\d+$/i, '').trim();
          if (canonicos.has(base.toLowerCase())) { canonNombre = base; break; }
        }
        if (det && corte.colorId !== dup.id) {
          const nombrePrincipal = colores.find(c => c.id === corte.colorId)?.nombre ?? '';
          if (canonicos.has(nombrePrincipal.toLowerCase())) { canonNombre = nombrePrincipal; break; }
        }
      }
      if (canonNombre) {
        const canon = BASE_MAP.get(canonNombre.toLowerCase())!;
        const nuevoNombre = `_dup_${canon.nombre}_${dup.id}`;
        await updateColor(dup.id, { ...dup, nombre: nuevoNombre, categoria: canon.categoria, prioridad: 999 });
      }
    }

    // ── Paso 2: agrupar por nombre base canónico y normalizar ──
    // Construir lista actualizada proyectando los renombres del paso 1
    const coloresActualizados = colores
      .filter(c => !esUUID(c.id))  // Ignorar IDs UUID (nunca persistidos en Supabase)
      .map(c => {
        const dup = dupViejos.find(d => d.id === c.id);
        if (!dup) return c;
        // Proyecto el nuevo nombre que se asignó en paso 1
        for (const corte of cortes) {
          if (corte.colorId === c.id && corte.tonalidad) {
            const base = corte.tonalidad.replace(/\s+Tn-?\d+$/i, '').trim();
            if (canonicos.has(base.toLowerCase()))
              return { ...c, nombre: `_dup_${BASE_MAP.get(base.toLowerCase())!.nombre}_${c.id}` };
          }
        }
        return c;
      });

    // Agrupar solo los que no son _dup_, por nombre base canónico
    const grupos = new Map<string, Color[]>();
    for (const c of coloresActualizados) {
      if (c.nombre.startsWith('_dup_')) continue;
      const baseLow = c.nombre.trim().toLowerCase();
      // Encontrar a qué canónico pertenece (coincidencia exacta o nombre canónico como prefijo)
      const matchKey = canonicos.has(baseLow) ? baseLow : null;
      if (!matchKey) continue;  // Nombre desconocido, no tocar
      if (!grupos.has(matchKey)) grupos.set(matchKey, []);
      grupos.get(matchKey)!.push(c);
    }

    for (const [baseLow, grupo] of grupos) {
      const canon = BASE_MAP.get(baseLow)!;
      // Poner primero los que ya tienen el nombre exacto, luego los demás
      const exactos = grupo.filter(c => c.nombre.trim().toLowerCase() === baseLow);
      const otros = grupo.filter(c => c.nombre.trim().toLowerCase() !== baseLow);
      const ordenado = [...exactos, ...otros];

      let canonAsignado = false;
      for (const c of ordenado) {
        if (!canonAsignado) {
          // Este es el canónico — solo actualizar si algo difiere
          if (c.nombre !== canon.nombre || c.categoria !== canon.categoria || c.prioridad !== canon.prioridad) {
            await updateColor(c.id, { ...c, nombre: canon.nombre, categoria: canon.categoria, prioridad: canon.prioridad ?? c.prioridad });
          }
          canonAsignado = true;
        } else {
          // Duplicado — renombrar a _dup_NOMBRE_id para ocultar
          const nombreOculto = `_dup_${canon.nombre}_${c.id}`;
          await updateColor(c.id, { ...c, nombre: nombreOculto, categoria: canon.categoria, prioridad: 999 });
        }
      }
    }

    // ── Paso 3: crear colores canónicos que no existen en absoluto ──
    const nombresEnDB = new Set(
      coloresActualizados
        .filter(c => !c.nombre.startsWith('_dup_'))
        .map(c => c.nombre.trim().toLowerCase())
    );
    for (const canon of mockColores) {
      if (!nombresEnDB.has(canon.nombre.toLowerCase())) {
        await addColor({ ...canon, id: newId() });
      }
    }

    setConfirmResetColores(false);
    addToast('Colores normalizados al catálogo base', 'success');
  };

  const handleSaveTela = (e: React.FormEvent) => {
    e.preventDefault();
    if (!telaForm.nombre.trim()) { addToast('El nombre es obligatorio', 'error'); return; }
    const data: Tela = {
      id: editTelaId ?? newId(),
      nombre: telaForm.nombre.trim(),
      composicion: telaForm.composicion.trim(),
      kgPorRollo: parseFloat(telaForm.kgPorRollo) || config.kgPorRolloDefault,
      notas: telaForm.notas.trim(),
    };
    if (editTelaId) { updateTela(editTelaId, data); addToast('Tela actualizada', 'success'); }
    else { addTela(data); addToast('Tela agregada', 'success'); }
    setShowTelaForm(false); setEditTelaId(null); setTelaForm(emptyTelaForm());
  };

  const handleSaveColor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colorForm.nombre.trim()) { addToast('El nombre es obligatorio', 'error'); return; }
    const data: Color = {
      id: editColorId ?? newId(),
      nombre: colorForm.nombre.trim(),
      categoria: colorForm.categoria,
      prioridad: parseInt(colorForm.prioridad) || 99,
      notas: colorForm.notas.trim(),
    };
    if (editColorId) { updateColor(editColorId, data); addToast('Color actualizado', 'success'); }
    else { addColor(data); addToast('Color agregado', 'success'); }
    setShowColorForm(false); setEditColorId(null); setColorForm(emptyColorForm());
  };

  const telaMap = useMemo(() => new Map(telas.map(t => [t.id, t])), [telas]);
  const clienteMap = useMemo(() => new Map(clientes.map(c => [c.id, c.nombre])), [clientes]);

  const resolveNombreColor = useMemo(() => {
    const canonicos = new Map(mockColores.map(c => [c.nombre.toLowerCase(), c.nombre]));
    return (nombre: string): string => {
      const n = nombre.toLowerCase();
      if (canonicos.has(n)) return canonicos.get(n)!;
      const mNew = nombre.match(/^_dup_(.+?)_[\w-]+$/);
      if (mNew) {
        const cand = mNew[1].toLowerCase();
        if (canonicos.has(cand)) return canonicos.get(cand)!;
      }
      const mNum = nombre.match(/^_dup_(\d+)$/);
      if (mNum) return `Color ${mNum[1]}`;
      if (nombre.startsWith('_dup_')) return 'Color';
      return nombre;
    };
  }, []);

  const colorMap = useMemo(() => new Map(colores.map(c => [c.id, { ...c, nombre: resolveNombreColor(c.nombre) }])), [colores, resolveNombreColor]);

  // Solo mostrar colores que están en el catálogo canónico (mockColores)
  const coloresVisibles = useMemo(() => {
    const nombresCanonicos = new Set(mockColores.map(c => c.nombre.toLowerCase()));
    return colores
      .filter(c => nombresCanonicos.has(c.nombre.toLowerCase()))
      .sort((a, b) => (a.prioridad ?? 999) - (b.prioridad ?? 999) || a.nombre.localeCompare(b.nombre));
  }, [colores]);

  const categoriaColor = useMemo((): CategoriaColor => {
    return (colorMap.get(form.colorId)?.categoria ?? 'OSCURO') as CategoriaColor;
  }, [form.colorId, colorMap]);

  const precioSugerido = useMemo(() => {
    if (!form.telaId || !form.colorId) return null;
    const cat = colorMap.get(form.colorId)?.categoria;
    if (!cat) return null;
    return preciosTelas.find(p => p.telaId === form.telaId && p.categoriaColor === cat)?.precioKg ?? null;
  }, [form.telaId, form.colorId, colorMap, preciosTelas]);

  // Auto-rellenar precio cuando se conoce el precio sugerido
  useEffect(() => {
    if (precioSugerido !== null) {
      setForm(f => ({ ...f, precioKg: String(precioSugerido) }));
    }
  }, [precioSugerido]);

  // Kg sugeridos desde rollos × kgPorRollo de la tela
  const kgSugerido = useMemo(() => {
    const rollos = parseInt(form.rollos);
    if (!form.telaId || !rollos) return null;
    const kgPorRollo = telaMap.get(form.telaId)?.kgPorRollo ?? config.kgPorRolloDefault;
    return rollos * kgPorRollo;
  }, [form.telaId, form.rollos, telaMap, config.kgPorRolloDefault]);

  const stockActual = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of [...movimientosTela].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      map.set(`${m.telaId}|${m.colorId}`, m.stockRollosDespues);
    }
    return map;
  }, [movimientosTela]);

  // Rollos comprometidos por cortes EN_PROCESO que aún NO fueron descontados físicamente
  const rollосComprometidos = useMemo(() => {
    const yaDescontados = new Set(
      movimientosTela.filter(m => m.tipo === 'A_CORTE' && m.corteId).map(m => m.corteId!),
    );
    const map = new Map<string, number>();
    for (const c of cortes) {
      if (c.estado === 'EN_PROCESO' && c.telaId && c.colorId && c.rollosUsados > 0 && !yaDescontados.has(c.id)) {
        const key = `${c.telaId}|${c.colorId}`;
        map.set(key, (map.get(key) ?? 0) + c.rollosUsados);
      }
    }
    return map;
  }, [cortes, movimientosTela]);

  // Stock disponible real = stock actual − comprometidos EN_PROCESO
  const stockDisponible = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, rollos] of stockActual.entries()) {
      const comprometidos = rollосComprometidos.get(key) ?? 0;
      map.set(key, Math.max(0, rollos - comprometidos));
    }
    return map;
  }, [stockActual, rollосComprometidos]);

  const movsFiltrados = useMemo(() => {
    return [...movimientosTela]
      .filter(m =>
        (!filterTela || m.telaId === filterTela) &&
        (!filterColor || m.colorId === filterColor) &&
        (!filterTipo || m.tipo === filterTipo)
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [movimientosTela, filterTela, filterColor, filterTipo]);

  // Segmentación: agrupa movsFiltrados por tipo o por tela
  const segmentGroups = useMemo(() => {
    if (segmentMode === 'tipo') {
      const order = TIPOS;
      const map = new Map<string, typeof movsFiltrados>();
      order.forEach(t => map.set(t, []));
      movsFiltrados.forEach(m => {
        if (!map.has(m.tipo)) map.set(m.tipo, []);
        map.get(m.tipo)!.push(m);
      });
      return Array.from(map.entries())
        .filter(([, rows]) => rows.length > 0)
        .map(([key, rows]) => ({ key, label: TIPO_LABEL[key] ?? key, rows }));
    }
    if (segmentMode === 'tela') {
      const map = new Map<string, typeof movsFiltrados>();
      movsFiltrados.forEach(m => {
        if (!map.has(m.telaId)) map.set(m.telaId, []);
        map.get(m.telaId)!.push(m);
      });
      return Array.from(map.entries())
        .map(([key, rows]) => ({ key, label: telaMap.get(key)?.nombre ?? key, rows }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return [{ key: 'all', label: 'Historial de Movimientos', rows: movsFiltrados }];
  }, [segmentMode, movsFiltrados, telaMap]);

  const set = (field: keyof MovForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rollos = parseInt(form.rollos);
    const kgTotal = parseFloat(form.kgTotal);
    const precioKg = parseFloat(form.precioKg) || 0;
    if (!form.telaId || !form.colorId || !rollos || !kgTotal) {
      addToast('Completa tela, color, rollos y kg', 'error');
      return;
    }
    const key = `${form.telaId}|${form.colorId}`;
    const stockAntes = stockActual.get(key) ?? 0;
    const positivos: TipoMovimientoTela[] = ['INGRESO', 'DE_REPROCESO', 'AJUSTE_POS'];
    const negativos: TipoMovimientoTela[] = ['A_CORTE', 'A_REPROCESO', 'MUESTRA', 'AJUSTE_NEG'];
    const delta = positivos.includes(form.tipo) ? rollos : negativos.includes(form.tipo) ? -rollos : 0;
    const stockDespues = stockAntes + delta;

    if (stockDespues < 0) {
      addToast(`Stock insuficiente — quedarían ${stockDespues} rollos (actual: ${stockAntes})`, 'error');
      return;
    }

    addMovimientoTela({
      id: newId(),
      fecha: form.fecha,
      tipo: form.tipo,
      clienteId: form.clienteId,
      telaId: form.telaId,
      colorId: form.colorId,
      rollos,
      kgTotal,
      categoriaColor,
      precioKg,
      totalSoles: kgTotal * precioKg,
      stockRollosAntes: stockAntes,
      stockRollosDespues: stockDespues,
      responsable: form.responsable,
      proveedorId: form.proveedorId || undefined,
      nFactura: form.nFactura || undefined,
      notas: form.notas,
    });
    addToast('Movimiento registrado', 'success');
    setShowForm(false);
    setForm(emptyForm());
  };

  const stockSummary = useMemo(() => {
    return Array.from(stockActual.entries())
      .map(([k, rollos]) => {
        const [telaId, colorId] = k.split('|');
        const kgPorRollo = telaMap.get(telaId)?.kgPorRollo ?? config.kgPorRolloDefault;
        const cat = colorMap.get(colorId)?.categoria;
        const precioKg = cat
          ? (preciosTelas.find(p => p.telaId === telaId && p.categoriaColor === cat)?.precioKg ?? null)
          : null;
        const comprometidos = rollосComprometidos.get(k) ?? 0;
        const disponible = Math.max(0, rollos - comprometidos);
        const kgTotal = rollos * kgPorRollo;
        return { telaId, colorId, rollos, disponible, comprometidos, kgTotal, precioKg };
      })
      .filter(s => s.rollos > 0)
      .sort((a, b) => (telaMap.get(a.telaId)?.nombre ?? '').localeCompare(telaMap.get(b.telaId)?.nombre ?? ''));
  }, [stockActual, rollосComprometidos, telaMap, colorMap, preciosTelas, config.kgPorRolloDefault]);

  // Tab Matriz: grilla telas × colores
  const matrizData = useMemo(() => {
    const telasSorted = [...telas].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const coloresSorted = coloresVisibles;
    return { telasSorted, coloresSorted };
  }, [telas, coloresVisibles]);

  // Tab Críticos: tela×color donde stock ≤ umbralCritico
  const criticosList = useMemo(() => {
    return Array.from(stockActual.entries())
      .map(([k, rollos]) => {
        const [telaId, colorId] = k.split('|');
        const comprometidos = rollосComprometidos.get(k) ?? 0;
        const disponible = Math.max(0, rollos - comprometidos);
        return { telaId, colorId, rollos, disponible, comprometidos };
      })
      .filter(s => s.disponible <= config.umbralCritico)
      .sort((a, b) => a.disponible - b.disponible);
  }, [stockActual, rollосComprometidos, config.umbralCritico]);

  // Tab Histórico: resumen mensual (últimos 24 meses)
  const historicoMensual = useMemo(() => {
    const map = new Map<string, { periodo: string; rollосIngresos: number; rollosConsumo: number; ingresos: number; consumo: number; otros: number }>();
    for (const m of movimientosTela) {
      const periodo = m.fecha.slice(0, 7);
      if (!map.has(periodo)) map.set(periodo, { periodo, rollосIngresos: 0, rollosConsumo: 0, ingresos: 0, consumo: 0, otros: 0 });
      const row = map.get(periodo)!;
      if (m.tipo === 'INGRESO') { row.rollосIngresos += m.rollos; row.ingresos += m.kgTotal; }
      else if (m.tipo === 'A_CORTE') { row.rollosConsumo += m.rollos; row.consumo += m.kgTotal; }
      else row.otros += m.kgTotal;
    }
    return Array.from(map.values())
      .sort((a, b) => b.periodo.localeCompare(a.periodo))
      .slice(0, 24);
  }, [movimientosTela]);

  const buildRows = () => movsFiltrados.map((m) => ({
    Fecha: m.fecha,
    Tipo: TIPO_LABEL[m.tipo] ?? m.tipo,
    Tela: telaMap.get(m.telaId)?.nombre ?? m.telaId,
    Color: colorMap.get(m.colorId)?.nombre ?? m.colorId,
    Rollos: m.rollos,
    Kg: m.kgTotal,
    PrecioKg: m.precioKg,
    TotalSoles: m.totalSoles,
    StockDespues: m.stockRollosDespues,
    Responsable: m.responsable,
    Notas: m.notas,
  }));

  const exportarMovimientos = () => {
    exportRowsToXlsx(buildRows(), `inventario_telas_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Inventario');
    addToast('Excel exportado', 'success');
  };

  const exportarMovimientosPdf = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    exportTableToPdf({
      title: 'Inventario de Telas',
      subtitle: `Movimientos al ${fecha}`,
      fileName: `inventario_telas_${fecha}`,
      columns: [
        { header: 'Fecha', dataKey: 'Fecha' },
        { header: 'Tipo', dataKey: 'Tipo' },
        { header: 'Tela', dataKey: 'Tela' },
        { header: 'Color', dataKey: 'Color' },
        { header: 'Rollos', dataKey: 'Rollos' },
        { header: 'Kg', dataKey: 'Kg' },
        { header: 'S/. Kg', dataKey: 'PrecioKg' },
        { header: 'Total S/.', dataKey: 'TotalSoles' },
        { header: 'Stock Post.', dataKey: 'StockDespues' },
        { header: 'Responsable', dataKey: 'Responsable' },
        { header: 'Notas', dataKey: 'Notas' },
      ],
      rows: buildRows(),
      rightCols: ['PrecioKg', 'TotalSoles'],
      centerCols: ['Rollos', 'Kg', 'StockDespues'],
    });
    addToast('PDF exportado', 'success');
  };

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Inventario de Telas</h2>
          <p className="text-xs text-gray-500 mt-1">Movimientos y stock por tela/color</p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleInfoBox
            accent="#4B7FA3"
            titulo="Inventario de Telas"
            descripcion="Controla el stock de rollos de tela agrupado por tipo y color. Registra ingresos, consumos a corte, reprocesos y ajustes. Genera alertas cuando el stock cae por debajo de umbrales configurables."
            items={[
              { label: 'Movimientos', detail: 'Ingreso, A Corte, Reproceso, Muestra, Ajuste +/−' },
              { label: 'Matriz Color × Tela', detail: 'Vista cruzada del stock con semáforo crítico/bajo/ok' },
              { label: 'Tab Críticos', detail: 'Lista filtrada de combinaciones bajo el umbral de alerta' },
              { label: 'Histórico Mensual', detail: 'Ingresos, consumo y balance por mes (últimos 24)' },
            ]}
          />
          <button onClick={exportarMovimientos} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={exportarMovimientosPdf} className="btn-secondary flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF
          </button>
          {(esSupervisor || esAdmin) && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Registrar Movimiento
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'matriz', label: 'Stock Actual' },
          { id: 'movimientos', label: 'Movimientos' },
          { id: 'criticos', label: `Críticos${criticosList.length > 0 ? ` (${criticosList.length})` : ''}` },
          { id: 'historico', label: 'Histórico Mensual' },
          { id: 'catalogos', label: 'Catálogos' },
        ] as { id: InvTab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#1a1a1a] text-[#1a1a1a]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Movimientos */}
      {activeTab === 'movimientos' && <>

      {/* Subtabs por tipo de movimiento */}
      <div className="flex flex-wrap gap-1 border-b border-gray-100 mb-2">
        {([['', 'General'], ...TIPOS.map(t => [t, TIPO_LABEL[t]])] as [string, string][]).map(([val, label]) => {
          const count = val === '' ? movimientosTela.length : movimientosTela.filter(m => m.tipo === val).length;
          return (
            <button
              key={val}
              onClick={() => setFilterTipo(val as TipoMovimientoTela | '')}
              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border-b-2 transition-colors ${
                filterTipo === val
                  ? 'border-[#B66F35] text-[#B66F35]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {label} <span className="font-normal opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filtros + segmentación + tabla */}
      <div className="space-y-4">
        {/* Fila de controles */}
        <div className="flex flex-wrap items-end gap-3">
          <select value={filterTela} onChange={e => setFilterTela(e.target.value)} className="input-base text-xs w-40">
            <option value="">Todas las telas</option>
            {telas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <select value={filterColor} onChange={e => setFilterColor(e.target.value)} className="input-base text-xs w-40">
            <option value="">Todos los colores</option>
            {coloresVisibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {/* Botones de segmentación */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-1">Segmentar:</span>
            {(['ninguno', 'tipo', 'tela'] as SegmentMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setSegmentMode(mode)}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                  segmentMode === mode
                    ? 'bg-[#1a1a1a] text-[#f9f7f2] border-[#1a1a1a]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                }`}
              >
                {mode === 'ninguno' ? 'Ninguno' : mode === 'tipo' ? 'Tipo Mov.' : 'Tipo Tela'}
              </button>
            ))}
          </div>
        </div>

        {movsFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin movimientos.</p>
        ) : (
          <div className="space-y-6">
            {segmentGroups.map(group => (
              <div key={group.key}>
                {segmentMode !== 'ninguno' && (
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-[#B66F35]" />
                    {group.label}
                    <span className="text-gray-300 font-normal">({group.rows.length})</span>
                  </h3>
                )}
                {segmentMode === 'ninguno' && (
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Historial de Movimientos</h3>
                )}
                <div className="texajo-table-shell">
                  <div className="texajo-table-scroll">
                    <table className="texajo-table">
                      <thead>
                        <tr>
                          {['Fecha', 'Tipo', 'Tela', 'Color', 'Rollos', 'Kg', ...(esAdmin ? ['S/. Kg', 'Total S/.', 'Dif. %'] : []), 'Stock Post', 'Responsable', 'Notas', ''].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map(m => (
                          <tr key={m.id}>
                            <td className="font-mono whitespace-nowrap">{m.fecha}</td>
                            <td>
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap ${
                                m.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' :
                                m.tipo === 'A_CORTE' ? 'bg-blue-100 text-blue-800' :
                                m.tipo.startsWith('AJUSTE') ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-700'
                              }`}>{TIPO_LABEL[m.tipo] ?? m.tipo}</span>
                            </td>
                            <td className="whitespace-nowrap">{telaMap.get(m.telaId)?.nombre ?? m.telaId}</td>
                            <td className="whitespace-nowrap">{colorMap.get(m.colorId)?.nombre ?? m.colorId}</td>
                            <td className="font-mono text-right">{m.rollos}</td>
                            <td className="font-mono text-right">{m.kgTotal.toFixed(1)}</td>
                            {esAdmin && <td className="font-mono text-right">{m.precioKg.toFixed(2)}</td>}
                            {esAdmin && <td className="font-mono text-right">{m.totalSoles.toFixed(2)}</td>}
                            {esAdmin && <td className="text-center">
                              {m.tipo === 'INGRESO' && m.costoRealFact && m.costoRealFact > 0 && m.totalSoles > 0 ? (() => {
                                const dif = ((m.costoRealFact - m.totalSoles) / m.totalSoles) * 100;
                                const cls = dif <= 0
                                  ? 'bg-green-100 text-green-800'
                                  : dif <= 10
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800';
                                const label = (dif >= 0 ? '+' : '') + dif.toFixed(1) + '%';
                                return <span className={`inline-block px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
                              })() : <span className="text-gray-300 text-[10px]">—</span>}
                            </td>}
                            <td className="font-mono text-right font-bold">{m.stockRollosDespues}</td>
                            <td className="whitespace-nowrap">{m.responsable}</td>
                            <td className="text-gray-500 max-w-[12rem] truncate">{m.notas}</td>
                            <td className="px-2">
                              {esAdmin && (confirmDelete === m.id ? (
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <button onClick={() => { deleteMovimientoTela(m.id); setConfirmDelete(null); addToast('Movimiento eliminado', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                                  <span className="text-gray-300">/</span>
                                  <button onClick={() => setConfirmDelete(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                                </span>
                              ) : (
                                <button onClick={() => setConfirmDelete(m.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </>}

      {/* Tab: Stock Actual (Matriz Tela × Color) */}
      {activeTab === 'matriz' && (
        <div>
          {esAdmin && (() => {
            const valorTotal = stockSummary.reduce((acc, s) => s.precioKg !== null ? acc + s.kgTotal * s.precioKg : acc, 0);
            return valorTotal > 0 ? (
              <div className="border border-[#B66F35] bg-[#FDF8F3] p-3 mb-6">
                <p className="text-[10px] font-bold uppercase text-[#B66F35] tracking-widest">Valor Total Inventario</p>
                <p className="text-2xl font-black text-[#B66F35] mt-1">S/ {valorTotal.toFixed(0)}</p>
              </div>
            ) : null;
          })()}
          {matrizData.telasSorted.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin telas configuradas. Agrégalas en el tab Catálogos.</p>
          ) : (
            <div className="space-y-8">
              {matrizData.telasSorted.map(t => {
                const kgPorRollo = t.kgPorRollo ?? config.kgPorRolloDefault;
                const coloresConDatos = matrizData.coloresSorted.map(c => {
                  const key = `${t.id}|${c.id}`;
                  const fisicos = stockActual.get(key) ?? 0;
                  const comprometidos = rollосComprometidos.get(key) ?? 0;
                  const disponible = Math.max(0, fisicos - comprometidos);
                  const kgFisicos = fisicos * kgPorRollo;
                  const cat = c.categoria;
                  const precioKg = preciosTelas.find(p => p.telaId === t.id && p.categoriaColor === cat)?.precioKg ?? null;
                  return { c, fisicos, comprometidos, disponible, kgFisicos, precioKg };
                });
                const totalRollos = coloresConDatos.reduce((s, x) => s + x.fisicos, 0);
                const totalKg = coloresConDatos.reduce((s, x) => s + x.kgFisicos, 0);
                const coloresActivos = coloresConDatos.filter(x => x.fisicos > 0).length;

                return (
                  <div key={t.id} className="border border-gray-200 bg-white">
                    {/* Header de tela */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-[#f9f7f2]">
                      <div className="flex items-center gap-3">
                        <span className="inline-block w-3 h-3 bg-[#4B7FA3]" />
                        <span className="text-sm font-black uppercase tracking-widest text-[#1a1a1a]">{t.nombre}</span>
                        {t.composicion && <span className="text-[10px] text-gray-400 font-normal">{t.composicion}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        <span>{coloresActivos} color{coloresActivos !== 1 ? 'es' : ''} con stock</span>
                        <span className="text-[#4B7FA3]">{totalRollos} rollos</span>
                        <span className="text-gray-400">{totalKg.toFixed(0)} kg</span>
                        {esAdmin && (() => {
                          const valor = coloresConDatos.reduce((s, x) => x.precioKg !== null ? s + x.kgFisicos * x.precioKg : s, 0);
                          return valor > 0 ? <span className="text-[#B66F35]">S/ {valor.toFixed(0)}</span> : null;
                        })()}
                      </div>
                    </div>

                    {/* Grid de colores */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-px bg-gray-200">
                      {coloresConDatos.map(({ c, fisicos, comprometidos, disponible, kgFisicos, precioKg }) => {
                        const isCrit = fisicos > 0 && disponible <= config.umbralCritico;
                        const isBajo = fisicos > 0 && !isCrit && disponible <= config.umbralBajo;
                        const isEmpty = fisicos === 0;
                        return (
                          <div
                            key={c.id}
                            className={`bg-white p-3 flex flex-col gap-1 ${isEmpty ? 'opacity-35' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-[11px] font-bold leading-tight text-[#1a1a1a]">{c.nombre}</span>
                              {!isEmpty && (
                                isCrit
                                  ? <span className="shrink-0 inline-block px-1.5 py-0.5 text-[9px] font-black uppercase bg-red-100 text-red-700">CRIT</span>
                                  : isBajo
                                    ? <span className="shrink-0 inline-block px-1.5 py-0.5 text-[9px] font-black uppercase bg-yellow-100 text-yellow-700">BAJO</span>
                                    : <span className="shrink-0 inline-block px-1.5 py-0.5 text-[9px] font-black uppercase bg-green-100 text-green-700">OK</span>
                              )}
                            </div>
                            <div className={`text-2xl font-black leading-none mt-1 ${isCrit ? 'text-red-600' : isBajo ? 'text-yellow-600' : isEmpty ? 'text-gray-300' : 'text-[#1a1a1a]'}`}>
                              {disponible}
                              <span className="text-[10px] font-normal text-gray-400 ml-1">disp.</span>
                            </div>
                            {!isEmpty && comprometidos > 0 && (
                              <div className="text-[10px] text-blue-600 font-bold">{comprometidos} en corte</div>
                            )}
                            <div className="text-[10px] text-gray-400 mt-auto">
                              {isEmpty ? 'Sin stock' : `${fisicos} fís. · ${kgFisicos.toFixed(0)} kg`}
                            </div>
                            {esAdmin && !isEmpty && precioKg !== null && (
                              <div className="text-[10px] text-gray-500 font-mono">S/ {(kgFisicos * precioKg).toFixed(0)}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-gray-400">Disponibles = físicos − en corte activo. Colores sin stock se muestran atenuados.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Críticos */}
      {activeTab === 'criticos' && (
        <div>
          {criticosList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-bold text-green-700">Sin ítems críticos</p>
              <p className="text-xs text-gray-400 mt-1">Todos los stocks están por encima del umbral crítico ({config.umbralCritico} rollos).</p>
            </div>
          ) : (
            <div className="texajo-table-shell">
              <div className="texajo-table-scroll">
                <table className="texajo-table">
                  <thead>
                    <tr>
                      {['Tela', 'Color', 'Disponibles', 'En Corte', 'Físicos', 'Umbral Crítico', 'Estado'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criticosList.map(s => (
                      <tr key={`${s.telaId}|${s.colorId}`}>
                        <td className="font-bold">{telaMap.get(s.telaId)?.nombre ?? s.telaId}</td>
                        <td>{colorMap.get(s.colorId)?.nombre ?? s.colorId}</td>
                        <td className="font-mono text-right font-black text-red-700">{s.disponible}</td>
                        <td className="font-mono text-right text-blue-600">{s.comprometidos > 0 ? s.comprometidos : '—'}</td>
                        <td className="font-mono text-right text-gray-500">{s.rollos}</td>
                        <td className="font-mono text-right text-gray-500">{config.umbralCritico}</td>
                        <td><span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase bg-red-100 text-red-800">CRÍTICO</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Histórico Mensual */}
      {activeTab === 'historico' && (
        <div>
          {historicoMensual.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin movimientos registrados.</p>
          ) : (
            <div className="texajo-table-shell">
              <div className="texajo-table-scroll">
                <table className="texajo-table">
                  <thead>
                    <tr>
                      {['Período', 'Rollos Ingr.', 'Rollos Consumo', 'Ingresos (kg)', 'Consumo A Corte (kg)', 'Otros (kg)', 'Balance (kg)'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historicoMensual.map(row => {
                      const balance = row.ingresos - row.consumo - row.otros;
                      return (
                        <tr key={row.periodo}>
                          <td className="font-mono font-bold">{row.periodo}</td>
                          <td className="font-mono text-right text-green-700">{row.rollосIngresos}</td>
                          <td className="font-mono text-right text-blue-700">{row.rollosConsumo}</td>
                          <td className="font-mono text-right text-green-700">{row.ingresos.toFixed(1)}</td>
                          <td className="font-mono text-right text-blue-700">{row.consumo.toFixed(1)}</td>
                          <td className="font-mono text-right text-gray-500">{row.otros.toFixed(1)}</td>
                          <td className={`font-mono text-right font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>{balance >= 0 ? '+' : ''}{balance.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Catálogos */}
      {activeTab === 'catalogos' && (
        <div className="space-y-10">

          {/* ── TELAS ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-700">Tipos de Tela</h3>
              {esAdmin && (
                <button onClick={() => { setEditTelaId(null); setTelaForm(emptyTelaForm()); setShowTelaForm(true); }} className="btn-primary flex items-center gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Nueva Tela
                </button>
              )}
            </div>
            <div className="texajo-table-shell">
              <div className="texajo-table-scroll">
                <table className="texajo-table">
                  <thead>
                    <tr>
                      {['Nombre', 'Composición', 'Kg/Rollo', 'Notas', ...(esAdmin ? [''] : [])].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...telas].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(t => (
                      <tr key={t.id}>
                        <td className="font-bold">{t.nombre}</td>
                        <td className="text-gray-500">{t.composicion || '—'}</td>
                        <td className="font-mono text-right">{t.kgPorRollo}</td>
                        <td className="text-gray-400 max-w-[14rem] truncate">{t.notas || '—'}</td>
                        {esAdmin && (
                          <td className="px-2">
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setEditTelaId(t.id); setTelaForm({ nombre: t.nombre, composicion: t.composicion ?? '', kgPorRollo: String(t.kgPorRollo), notas: t.notas ?? '' }); setShowTelaForm(true); }} className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {confirmDeleteTela === t.id ? (
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <button onClick={() => { deleteTela(t.id); setConfirmDeleteTela(null); addToast('Tela eliminada', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                                  <span className="text-gray-300">/</span>
                                  <button onClick={() => setConfirmDeleteTela(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                                </span>
                              ) : (
                                <button onClick={() => setConfirmDeleteTela(t.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {telas.length === 0 && <tr><td colSpan={5} className="text-gray-400 italic text-center py-4">Sin telas registradas.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── COLORES ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-700">
                Colores <span className="text-gray-400 font-normal normal-case">({colores.length})</span>
              </h3>
              {esAdmin && (
                <div className="flex items-center gap-2">
                  {confirmResetColores ? (
                    <span className="flex items-center gap-2 text-[10px]">
                      <span className="text-red-600 font-bold">¿Normalizar al catálogo base?</span>
                      <button onClick={handleResetColores} className="font-bold text-red-600 hover:text-red-800 uppercase">Sí, restaurar</button>
                      <span className="text-gray-300">/</span>
                      <button onClick={() => setConfirmResetColores(false)} className="font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmResetColores(true)} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-500 border border-gray-200 px-3 py-1.5 transition-colors">
                      Normalizar colores
                    </button>
                  )}
                  <button onClick={() => { setEditColorId(null); setColorForm(emptyColorForm()); setShowColorForm(true); }} className="btn-primary flex items-center gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Nuevo Color
                  </button>
                </div>
              )}
            </div>
            <div className="texajo-table-shell">
              <div className="texajo-table-scroll">
                <table className="texajo-table">
                  <thead>
                    <tr>
                      {['Nombre', 'Categoría', 'Prioridad', 'Notas', ...(esAdmin ? [''] : [])].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const vistos = new Set<string>();
                      return [...colores]
                        .sort((a, b) => (a.prioridad ?? 999) - (b.prioridad ?? 999) || a.nombre.localeCompare(b.nombre))
                        .filter(c => {
                          // Ocultar _dup_* sin nombre canónico conocido (quedan como "Color N")
                          if (c.nombre.startsWith('_dup_')) return false;
                          const nombreResuelto = resolveNombreColor(c.nombre);
                          if (vistos.has(nombreResuelto.toLowerCase())) return false;
                          vistos.add(nombreResuelto.toLowerCase());
                          return true;
                        });
                    })().map(c => (
                      <tr key={c.id}>
                        <td className="font-bold">{resolveNombreColor(c.nombre)}</td>
                        <td>
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${
                            c.categoria === 'OSCURO' ? 'bg-gray-800 text-white' :
                            c.categoria === 'CLARO' ? 'bg-gray-100 text-gray-700' :
                            c.categoria === 'MELANGE' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>{c.categoria}</span>
                        </td>
                        <td className="font-mono text-right">{c.prioridad ?? '—'}</td>
                        <td className="text-gray-400 max-w-[14rem] truncate">{c.notas || '—'}</td>
                        {esAdmin && (
                          <td className="px-2">
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setEditColorId(c.id); setColorForm({ nombre: resolveNombreColor(c.nombre), categoria: c.categoria, prioridad: String(c.prioridad ?? ''), notas: c.notas ?? '' }); setShowColorForm(true); }} className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {confirmDeleteColor === c.id ? (
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <button onClick={() => { deleteColor(c.id); setConfirmDeleteColor(null); addToast('Color eliminado', 'success'); }} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase">Sí</button>
                                  <span className="text-gray-300">/</span>
                                  <button onClick={() => setConfirmDeleteColor(null)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase">No</button>
                                </span>
                              ) : (
                                <button onClick={() => setConfirmDeleteColor(c.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {colores.length === 0 && <tr><td colSpan={5} className="text-gray-400 italic text-center py-4">Sin colores registrados.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva/Editar Tela */}
      {showTelaForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gray-300 w-full max-w-md">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest">{editTelaId ? 'Editar Tela' : 'Nueva Tela'}</h3>
              <button onClick={() => { setShowTelaForm(false); setEditTelaId(null); setTelaForm(emptyTelaForm()); }}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSaveTela} className="p-6 space-y-4">
              <F label="Nombre *"><input type="text" value={telaForm.nombre} onChange={e => setTelaForm(f => ({ ...f, nombre: e.target.value }))} className="input-base" required /></F>
              <F label="Composición"><input type="text" value={telaForm.composicion} onChange={e => setTelaForm(f => ({ ...f, composicion: e.target.value }))} className="input-base" placeholder="Ej: 100% algodón" /></F>
              <F label="Kg por Rollo"><input type="number" min={0} step={0.01} value={telaForm.kgPorRollo} onChange={e => setTelaForm(f => ({ ...f, kgPorRollo: e.target.value }))} className="input-base" placeholder={String(config.kgPorRolloDefault)} /></F>
              <F label="Notas"><textarea value={telaForm.notas} onChange={e => setTelaForm(f => ({ ...f, notas: e.target.value }))} rows={2} className="input-base" /></F>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowTelaForm(false); setEditTelaId(null); setTelaForm(emptyTelaForm()); }} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nuevo/Editar Color */}
      {showColorForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-gray-300 w-full max-w-md">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-black uppercase tracking-widest">{editColorId ? 'Editar Color' : 'Nuevo Color'}</h3>
              <button onClick={() => { setShowColorForm(false); setEditColorId(null); setColorForm(emptyColorForm()); }}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSaveColor} className="p-6 space-y-4">
              <F label="Nombre *"><input type="text" value={colorForm.nombre} onChange={e => setColorForm(f => ({ ...f, nombre: e.target.value }))} className="input-base" required /></F>
              <F label="Categoría">
                <select value={colorForm.categoria} onChange={e => setColorForm(f => ({ ...f, categoria: e.target.value as CategoriaColor }))} className="input-base">
                  {(['OSCURO', 'CLARO', 'MELANGE', 'PPT'] as CategoriaColor[]).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </F>
              <F label="Prioridad (orden en listas)"><input type="number" min={1} value={colorForm.prioridad} onChange={e => setColorForm(f => ({ ...f, prioridad: e.target.value }))} className="input-base" placeholder="99" /></F>
              <F label="Notas"><textarea value={colorForm.notas} onChange={e => setColorForm(f => ({ ...f, notas: e.target.value }))} rows={2} className="input-base" /></F>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowColorForm(false); setEditColorId(null); setColorForm(emptyColorForm()); }} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* Modal: Registrar Movimiento */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-gray-300 w-full max-w-xl max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-[#f9f7f2] shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Registrar Movimiento</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Ingreso, salida o ajuste de stock de tela</p>
              </div>
              <button onClick={() => { setShowForm(false); setForm(emptyForm()); }} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Sección 1: Qué movimiento */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                  <span className="inline-block w-4 h-px bg-gray-300" /> Tipo de movimiento
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Fecha *">
                    <input type="date" value={form.fecha} onChange={set('fecha')} className="input-base" required />
                  </F>
                  <F label="Tipo *">
                    <select value={form.tipo} onChange={set('tipo')} className="input-base">
                      {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                    </select>
                  </F>
                </div>
              </div>

              {/* Sección 2: Qué tela/color */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                  <span className="inline-block w-4 h-px bg-gray-300" /> Tela y color
                </p>
                {/* Selector de tela — chips */}
                <F label="Tela *">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {[...telas].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, telaId: t.id, colorId: '' }))}
                        className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide border transition-colors ${
                          form.telaId === t.id
                            ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {capWords(t.nombre)}
                      </button>
                    ))}
                  </div>
                </F>
                {/* Selector de color — chips */}
                <F label="Color *">
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {coloresVisibles.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, colorId: c.id }))}
                        className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide border transition-colors ${
                          form.colorId === c.id
                            ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {capWords(c.nombre)}
                      </button>
                    ))}
                  </div>
                </F>
                {/* Stock actual como referencia */}
                {form.telaId && form.colorId && (() => {
                  const key = `${form.telaId}|${form.colorId}`;
                  const actual = stockActual.get(key) ?? 0;
                  return (
                    <div className="mt-2 px-3 py-2 bg-[#f0f4f8] border border-[#c8d8e8] flex items-center gap-4">
                      <span className="text-[10px] font-bold uppercase text-[#4B7FA3] tracking-widest">Stock actual:</span>
                      <span className="text-sm font-black text-[#1a1a1a]">{actual} rollos</span>
                      <span className="text-[10px] text-gray-400">({capWords(telaMap.get(form.telaId)?.nombre ?? '')} · {capWords(colorMap.get(form.colorId)?.nombre ?? '')})</span>
                    </div>
                  );
                })()}
              </div>

              {/* Sección 3: Cantidades */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                  <span className="inline-block w-4 h-px bg-gray-300" /> Cantidades
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Rollos *">
                    <input
                      type="number"
                      min={1}
                      value={form.rollos}
                      onChange={e => {
                        const val = e.target.value;
                        setForm(f => {
                          const rollosNum = parseInt(val);
                          const kgCalc = form.telaId && rollosNum ? (telaMap.get(form.telaId)?.kgPorRollo ?? config.kgPorRolloDefault) * rollosNum : undefined;
                          return { ...f, rollos: val, kgTotal: kgCalc !== undefined ? String(kgCalc) : f.kgTotal };
                        });
                      }}
                      className="input-base"
                      required
                    />
                  </F>
                  <F label={kgSugerido !== null ? `Kg Total (≈ ${kgSugerido} kg)` : 'Kg Total *'}>
                    <input type="number" min={0} step={0.1} value={form.kgTotal} onChange={set('kgTotal')} className="input-base" required />
                  </F>
                </div>
              </div>

              {/* Sección 4: Precio (solo INGRESO, solo admin) */}
              {form.tipo === 'INGRESO' && esAdmin && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                    <span className="inline-block w-4 h-px bg-gray-300" /> Precio y facturación
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <F label={precioSugerido !== null ? `Precio Kg S/. (sugerido: ${precioSugerido})` : 'Precio Kg S/.'}>
                      <input type="number" min={0} step={0.01} value={form.precioKg} onChange={set('precioKg')} className="input-base" placeholder={precioSugerido !== null ? String(precioSugerido) : '0.00'} />
                    </F>
                    {form.kgTotal && form.precioKg && parseFloat(form.precioKg) > 0 && parseFloat(form.kgTotal) > 0 && (
                      <div className="flex flex-col justify-end pb-1">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total estimado</span>
                        <span className="text-xl font-black text-[#B66F35]">S/ {(parseFloat(form.kgTotal) * parseFloat(form.precioKg)).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <F label="Proveedor">
                      <select value={form.proveedorId} onChange={set('proveedorId')} className="input-base">
                        <option value="">—</option>
                        {proveedores.filter(p => p.tipo === 'TELA').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </F>
                    <F label="N° Factura">
                      <input type="text" value={form.nFactura} onChange={set('nFactura')} className="input-base" placeholder="Ej: F001-000123" />
                    </F>
                  </div>
                </div>
              )}

              {/* Sección 5: Datos adicionales */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                  <span className="inline-block w-4 h-px bg-gray-300" /> Datos adicionales
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Cliente">
                    <select value={form.clienteId} onChange={set('clienteId')} className="input-base">
                      <option value="">—</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </F>
                  <F label="Responsable">
                    <input type="text" value={form.responsable} onChange={set('responsable')} className="input-base" placeholder="Nombre del responsable" />
                  </F>
                </div>
                <div className="mt-4">
                  <F label="Notas">
                    <textarea value={form.notas} onChange={set('notas')} rows={2} className="input-base" placeholder="Observaciones opcionales…" />
                  </F>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm()); }} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Movimiento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
