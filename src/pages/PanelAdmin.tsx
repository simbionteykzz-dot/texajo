import { useState } from 'react';
import { Shield, Save, RotateCcw, CheckSquare, Square } from 'lucide-react';
import { usePermisos, SECCIONES, DEFAULTS_POR_ROL, type PermisosRol, type SeccionKey } from '../lib/usePermisos';

const ROLES_EDITABLES = ['Supervisor', 'Encargado de Área'];

export function PanelAdmin() {
  const { loading, permisosPorRol, savePermisos } = usePermisos();
  const [local, setLocal] = useState<Record<string, PermisosRol> | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const actual = local ?? permisosPorRol;

  const toggle = (rol: string, seccion: SeccionKey) => {
    setLocal(prev => {
      const base = prev ?? permisosPorRol;
      return {
        ...base,
        [rol]: { ...base[rol], [seccion]: !base[rol][seccion] },
      };
    });
    setSavedMsg('');
  };

  const resetRol = (rol: string) => {
    setLocal(prev => ({
      ...(prev ?? permisosPorRol),
      [rol]: { ...DEFAULTS_POR_ROL[rol] },
    }));
    setSavedMsg('');
  };

  const marcarTodos = (rol: string, valor: boolean) => {
    setLocal(prev => {
      const base = prev ?? permisosPorRol;
      const nuevos = Object.fromEntries(SECCIONES.map(s => [s.key, valor])) as PermisosRol;
      return { ...base, [rol]: nuevos };
    });
    setSavedMsg('');
  };

  const handleSave = async () => {
    if (!local) return;
    setSaving(true);
    try {
      await Promise.all(
        ROLES_EDITABLES.map(rol => savePermisos(rol, local[rol]))
      );
      setSavedMsg('Permisos guardados correctamente.');
      setLocal(null);
    } catch {
      setSavedMsg('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#173A25] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: '#173A25' }} />
            <h1 className="font-serif text-2xl font-bold" style={{ color: '#173A25' }}>
              Panel de Administración
            </h1>
          </div>
          <p className="mt-1 text-xs font-mono uppercase tracking-widest" style={{ color: '#9A8F87' }}>
            Control de acceso por rol
          </p>
        </div>

        {local && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white transition-colors"
            style={{ background: saving ? '#2E6645' : '#173A25', cursor: saving ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#0F2418'; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#173A25'; }}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        )}
      </div>

      {savedMsg && (
        <div
          className="border px-4 py-2.5 text-xs font-semibold"
          style={
            savedMsg.includes('Error')
              ? { background: '#FEF0EC', borderColor: '#F5C4B0', color: '#7A2C0E' }
              : { background: '#EFF8F2', borderColor: '#A8D5B5', color: '#173A25' }
          }
        >
          {savedMsg}
        </div>
      )}

      {/* Nota sobre Admin */}
      <div className="border-l-4 px-4 py-3 text-xs" style={{ borderColor: '#B6762A', background: '#FDF8F0', color: '#7A5020' }}>
        <strong>Administrador General</strong> siempre tiene acceso completo a todas las secciones y no puede ser restringido.
      </div>

      {/* Tabla de permisos por rol */}
      {ROLES_EDITABLES.map(rol => (
        <div key={rol} className="border" style={{ borderColor: '#DDD8CF' }}>
          {/* Cabecera del rol */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ background: '#F7F4EF', borderBottom: '1px solid #DDD8CF' }}
          >
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9A8F87' }}>Rol</span>
              <h2 className="mt-0.5 font-bold text-base" style={{ color: '#1A1A1A' }}>{rol}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => marcarTodos(rol, true)}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
                style={{ color: '#173A25' }}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Todo
              </button>
              <span style={{ color: '#DDD8CF' }}>|</span>
              <button
                type="button"
                onClick={() => marcarTodos(rol, false)}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
                style={{ color: '#9A8F87' }}
              >
                <Square className="h-3.5 w-3.5" />
                Ninguno
              </button>
              <span style={{ color: '#DDD8CF' }}>|</span>
              <button
                type="button"
                onClick={() => resetRol(rol)}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
                style={{ color: '#B6762A' }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restablecer
              </button>
            </div>
          </div>

          {/* Grid de secciones */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px" style={{ background: '#DDD8CF' }}>
            {SECCIONES.map(seccion => {
              const habilitado = actual[rol]?.[seccion.key] ?? false;
              return (
                <button
                  key={seccion.key}
                  type="button"
                  onClick={() => toggle(rol, seccion.key)}
                  className="flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                  style={{ background: habilitado ? '#FFFFFF' : '#F7F4EF' }}
                >
                  <div
                    className="h-4 w-4 flex-shrink-0 border-2 transition-colors flex items-center justify-center"
                    style={{
                      borderColor: habilitado ? '#173A25' : '#C4BDB6',
                      background: habilitado ? '#173A25' : 'transparent',
                    }}
                  >
                    {habilitado && (
                      <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color: habilitado ? '#1A1A1A' : '#9A8F87' }}>
                      {seccion.label}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-wider mt-0.5" style={{ color: habilitado ? '#6B6058' : '#C4BDB6' }}>
                      {habilitado ? 'Con acceso' : 'Sin acceso'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
