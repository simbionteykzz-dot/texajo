import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  mensaje: string;
  detalle?: string;
  labelConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmModal({ mensaje, detalle, labelConfirmar = 'Eliminar', onConfirmar, onCancelar }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancelar}>
      <div
        className="bg-white border border-gray-200 shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-900">{mensaje}</p>
            {detalle && <p className="text-xs text-gray-500 mt-1">{detalle}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onCancelar} className="btn-secondary">Cancelar</button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            {labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
