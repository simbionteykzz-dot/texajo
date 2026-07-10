import React, { useState } from 'react';
import { GraduationCap, X } from 'lucide-react';

interface TutorialStep {
  titulo: string;
  contenido: React.ReactNode;
}

interface TutorialModalProps {
  titulo: string;
  steps: TutorialStep[];
  accent?: string;
}

export function TutorialModal({ titulo, steps, accent = '#4B7FA3' }: TutorialModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-colors"
        style={{ color: accent, borderColor: `${accent}55`, background: `${accent}0D` }}
      >
        <GraduationCap className="h-3.5 w-3.5" />
        Cómo funciona
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white border border-gray-300 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b px-6 py-4 shrink-0 sticky top-0"
              style={{ background: '#FFFDF9', borderColor: `${accent}40`, borderBottom: `3px solid ${accent}` }}
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" style={{ color: accent }} />
                <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: accent }}>{titulo}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div
                    className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                    style={{ background: accent }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-xs font-black uppercase tracking-widest text-[#1a1a1a] mb-1.5">{step.titulo}</p>
                    <div className="text-[12px] leading-relaxed text-[#4A4540]">{step.contenido}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-gray-100 px-6 py-3">
              <button onClick={() => setOpen(false)} className="btn-secondary text-xs">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
