import { useEffect, useState, useCallback } from 'react';
import { History, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AuditLog } from '../lib/useAudit';
import { ENTIDAD_LABELS } from '../lib/useAudit';

const ACCION_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  CREATE:  { label: 'Creación',      bg: '#EFF8F2', color: '#173A25' },
  UPDATE:  { label: 'Modificación',  bg: '#FDF8F0', color: '#7A5020' },
  DELETE:  { label: 'Eliminación',   bg: '#FEF0EC', color: '#7A2C0E' },
  LOGIN:   { label: 'Inicio sesión', bg: '#EFF4FB', color: '#1A3A6B' },
  LOGOUT:  { label: 'Cierre sesión', bg: '#F4F2EE', color: '#6B6058' },
};

const PAGE_SIZE = 50;

export function HistorialGeneral() {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtros
  const [filtroAccion, setFiltroAccion]   = useState('');
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filtroAccion)   query = query.eq('accion', filtroAccion);
      if (filtroEntidad)  query = query.eq('entidad', filtroEntidad);
      if (filtroUsuario)  query = query.ilike('user_nombre', `%${filtroUsuario}%`);

      const { data, count } = await query;
      setLogs((data as AuditLog[]) ?? []);
      setTotal(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, filtroAccion, filtroEntidad, filtroUsuario]);

  useEffect(() => { cargar(); }, [cargar]);

  const resetFiltros = () => {
    setFiltroAccion('');
    setFiltroEntidad('');
    setFiltroUsuario('');
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const entidadesUnicas = Array.from(new Set(Object.values(ENTIDAD_LABELS))).sort();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" style={{ color: '#173A25' }} />
            <h1 className="font-serif text-2xl font-bold" style={{ color: '#173A25' }}>
              Historial General
            </h1>
          </div>
          <p className="mt-1 text-xs font-mono uppercase tracking-widest" style={{ color: '#9A8F87' }}>
            Registro completo de actividad del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono" style={{ color: '#9A8F87' }}>
            {total.toLocaleString()} registros
          </span>
          <button
            onClick={cargar}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-colors"
            style={{ borderColor: '#DDD8CF', color: '#6B6058' }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 border p-4" style={{ borderColor: '#DDD8CF', background: '#F7F4EF' }}>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#9A8F87' }}>Acción</label>
          <select
            value={filtroAccion}
            onChange={e => { setFiltroAccion(e.target.value); setPage(0); }}
            className="border px-2 py-1 text-xs bg-white"
            style={{ borderColor: '#DDD8CF' }}
          >
            <option value="">Todas</option>
            {Object.entries(ACCION_STYLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#9A8F87' }}>Módulo</label>
          <select
            value={filtroEntidad}
            onChange={e => { setFiltroEntidad(e.target.value); setPage(0); }}
            className="border px-2 py-1 text-xs bg-white"
            style={{ borderColor: '#DDD8CF' }}
          >
            <option value="">Todos</option>
            {Object.entries(ENTIDAD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#9A8F87' }}>Usuario</label>
          <input
            type="text"
            value={filtroUsuario}
            onChange={e => { setFiltroUsuario(e.target.value); setPage(0); }}
            placeholder="Buscar por nombre..."
            className="border px-2 py-1 text-xs bg-white w-40"
            style={{ borderColor: '#DDD8CF' }}
          />
        </div>

        {(filtroAccion || filtroEntidad || filtroUsuario) && (
          <div className="flex items-end">
            <button
              onClick={resetFiltros}
              className="flex items-center gap-1 text-xs font-bold px-2 py-1 border"
              style={{ borderColor: '#F5C4B0', color: '#7A2C0E', background: '#FEF0EC' }}
            >
              <Trash2 className="h-3 w-3" />
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="border" style={{ borderColor: '#DDD8CF' }}>
        {/* Cabecera */}
        <div
          className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest"
          style={{ background: '#F7F4EF', borderBottom: '1px solid #DDD8CF', color: '#9A8F87' }}
        >
          <div className="col-span-2">Fecha / Hora</div>
          <div className="col-span-2">Usuario</div>
          <div className="col-span-2">Acción</div>
          <div className="col-span-2">Módulo</div>
          <div className="col-span-3">Registro</div>
          <div className="col-span-1">Detalle</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#173A25] border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm font-serif italic" style={{ color: '#9A8F87' }}>
            No hay registros de actividad todavía.
          </div>
        ) : (
          <ul>
            {logs.map((log, i) => {
              const accion = ACCION_STYLES[log.accion] ?? { label: log.accion, bg: '#F4F2EE', color: '#6B6058' };
              const entidadLabel = ENTIDAD_LABELS[log.entidad] ?? log.entidad;
              const isExpanded = expandedId === log.id;
              const fecha = new Date(log.created_at);
              const tieneDetalle = log.valores_ant || log.valores_new;

              return (
                <li
                  key={log.id}
                  style={{ borderBottom: i < logs.length - 1 ? '1px solid #F0EDE8' : undefined }}
                >
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[#FAFAF8] transition-colors">
                    <div className="col-span-2">
                      <div className="text-xs font-mono" style={{ color: '#1A1A1A' }}>
                        {fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: '#9A8F87' }}>
                        {fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-xs font-bold truncate" style={{ color: '#1A1A1A' }}>
                        {log.user_nombre || '—'}
                      </div>
                      <div className="text-[10px] font-mono truncate" style={{ color: '#9A8F87' }}>
                        {log.user_email}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <span
                        className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider"
                        style={{ background: accion.bg, color: accion.color }}
                      >
                        {accion.label}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-xs font-mono" style={{ color: '#6B6058' }}>
                        {entidadLabel}
                      </span>
                    </div>

                    <div className="col-span-3">
                      <span className="text-xs" style={{ color: '#1A1A1A' }}>
                        {log.entidad_desc || log.entidad_id || '—'}
                      </span>
                    </div>

                    <div className="col-span-1 flex justify-end">
                      {tieneDetalle && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="p-1 transition-colors"
                          style={{ color: '#9A8F87' }}
                          title="Ver detalle"
                        >
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalle expandible */}
                  {isExpanded && tieneDetalle && (
                    <div className="px-4 pb-4 grid grid-cols-2 gap-4" style={{ background: '#FAFAF8', borderTop: '1px solid #F0EDE8' }}>
                      {log.valores_ant && (
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-2 mt-3" style={{ color: '#9A8F87' }}>
                            Valores anteriores
                          </div>
                          <pre className="text-[11px] font-mono p-3 overflow-x-auto rounded" style={{ background: '#FEF0EC', color: '#7A2C0E' }}>
                            {JSON.stringify(log.valores_ant, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.valores_new && (
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-2 mt-3" style={{ color: '#9A8F87' }}>
                            Valores nuevos
                          </div>
                          <pre className="text-[11px] font-mono p-3 overflow-x-auto rounded" style={{ background: '#EFF8F2', color: '#173A25' }}>
                            {JSON.stringify(log.valores_new, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: '#9A8F87' }}>
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs font-bold border transition-colors disabled:opacity-40"
              style={{ borderColor: '#DDD8CF', color: '#6B6058' }}
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs font-bold border transition-colors disabled:opacity-40"
              style={{ borderColor: '#DDD8CF', color: '#6B6058' }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
