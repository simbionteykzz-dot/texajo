import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface InfoItem {
  label: string;
  detail: string;
}

interface ModuleInfoBoxProps {
  titulo: string;
  descripcion: string;
  items?: InfoItem[];
  accent?: string;
}

export function ModuleInfoBox({ titulo, descripcion, items = [], accent = '#4B7FA3' }: ModuleInfoBoxProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        title="¿Qué hace este módulo?"
        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
        style={{
          background: open ? accent : `${accent}18`,
          color: open ? '#fff' : accent,
          border: `1px solid ${accent}40`,
        }}
      >
        <Info className="h-3 w-3" />
        Info
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 right-0 w-72 shadow-xl"
          style={{
            background: '#FFFDF9',
            border: `1.5px solid ${accent}`,
            borderLeft: `4px solid ${accent}`,
          }}
        >
          <div className="flex items-start justify-between px-3 pt-3 pb-1">
            <p
              className="font-black uppercase tracking-widest leading-tight"
              style={{ fontSize: '10px', color: accent }}
            >
              {titulo}
            </p>
            <button onClick={() => setOpen(false)} className="ml-2 mt-0.5 opacity-50 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </div>

          <p className="px-3 pb-2 text-[11px] leading-relaxed" style={{ color: '#4A4540' }}>
            {descripcion}
          </p>

          {items.length > 0 && (
            <div
              className="mx-3 mb-3 divide-y"
              style={{ border: `1px solid ${accent}25` }}
            >
              {items.map((item, i) => (
                <div key={i} className="px-2 py-1.5">
                  <p className="font-bold text-[9px] uppercase tracking-widest" style={{ color: accent }}>
                    {item.label}
                  </p>
                  <p className="text-[10px] leading-snug mt-0.5" style={{ color: '#6B6058' }}>
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
