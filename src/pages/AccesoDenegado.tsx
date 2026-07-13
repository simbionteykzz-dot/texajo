import { ShieldOff } from 'lucide-react';

export function AccesoDenegado() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center" style={{ background: '#C0362C15', border: '1px solid #C0362C40' }}>
          <ShieldOff className="h-6 w-6" style={{ color: '#C0362C' }} />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#9A8F87' }}>Acceso restringido</p>
          <h2 className="font-serif text-2xl font-bold leading-tight mt-1" style={{ color: '#1a1a1a' }}>No tienes acceso a esta sección</h2>
          <p className="text-sm text-gray-500 mt-2">Comunícate con el Administrador General para solicitar acceso a este módulo.</p>
        </div>
      </div>
    </div>
  );
}
