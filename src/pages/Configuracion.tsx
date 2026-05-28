import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { useToast } from '../components/ToastProvider';

export function Configuracion() {
  const { config, updateConfig, clearAllData, importData } = useAppContext();
  const { addToast } = useToast();

  const [form, setForm] = useState({ ...config });
  const [confirmClear, setConfirmClear] = useState(false);

  const handleSave = () => {
    updateConfig({
      umbralCritico: Number(form.umbralCritico),
      umbralBajo: Number(form.umbralBajo),
      mermaPct: Number(form.mermaPct),
      detraccionPct: Number(form.detraccionPct),
      igvPct: Number(form.igvPct),
      incluirIgv: form.incluirIgv,
      tipoCambioUsd: Number(form.tipoCambioUsd),
      kgPorRolloDefault: Number(form.kgPorRolloDefault),
      comisionJoseKg: Number(form.comisionJoseKg),
    });
    addToast('Configuración guardada', 'success');
  };


  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const payload = JSON.parse(ev.target?.result as string);
        importData(payload);
        addToast('Datos importados correctamente', 'success');
      } catch {
        addToast('Error al leer el archivo JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const num = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: parseFloat(e.target.value) || 0 }));

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Configuración</h2>
        <p className="text-xs text-gray-500 mt-1">Parámetros globales del sistema</p>
      </div>

      <div className="bg-white border border-gray-200 p-6 space-y-6">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Inventario</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Umbral Crítico (rollos)">
            <input type="number" min={1} value={form.umbralCritico} onChange={num('umbralCritico')} className="input-base" />
          </Field>
          <Field label="Umbral Bajo (rollos)">
            <input type="number" min={1} value={form.umbralBajo} onChange={num('umbralBajo')} className="input-base" />
          </Field>
          <Field label="Merma %">
            <input type="number" min={0} max={100} step={0.5} value={form.mermaPct} onChange={num('mermaPct')} className="input-base" />
          </Field>
          <Field label="Kg por Rollo (default)">
            <input type="number" min={1} step={0.5} value={form.kgPorRolloDefault} onChange={num('kgPorRolloDefault')} className="input-base" />
          </Field>
        </div>

        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 pt-2">Finanzas</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Detracción %">
            <input type="number" min={0} max={100} step={0.5} value={form.detraccionPct} onChange={num('detraccionPct')} className="input-base" />
          </Field>
          <Field label="IGV %">
            <input type="number" min={0} max={100} step={0.5} value={form.igvPct} onChange={num('igvPct')} className="input-base" />
          </Field>
          <Field label="Tipo de Cambio USD">
            <input type="number" min={1} step={0.01} value={form.tipoCambioUsd} onChange={num('tipoCambioUsd')} className="input-base" />
          </Field>
          <Field label="Comisión José (S/. por kg)">
            <input type="number" min={0} step={0.01} value={form.comisionJoseKg} onChange={num('comisionJoseKg')} className="input-base" />
          </Field>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input
            id="incluirIgv"
            type="checkbox"
            checked={form.incluirIgv}
            onChange={e => setForm(f => ({ ...f, incluirIgv: e.target.checked }))}
            className="h-4 w-4"
          />
          <label htmlFor="incluirIgv" className="text-xs font-bold uppercase tracking-widest">Incluir IGV en cálculos</label>
        </div>

        <button onClick={handleSave} className="btn-primary mt-2">Guardar Configuración</button>
      </div>

      <div className="bg-white border border-gray-200 p-6 space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Datos</h3>
        <div className="flex flex-wrap gap-3">
          <label className="btn-secondary cursor-pointer">
            Importar JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </label>
        </div>
        <div className="pt-2 border-t border-gray-100">
          {!confirmClear ? (
            <button onClick={() => setConfirmClear(true)} className="text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-800">
              Borrar todos los datos…
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-red-700">¿Confirmar? Se perderán todos los registros.</span>
              <button onClick={() => { clearAllData(); setConfirmClear(false); addToast('Datos borrados', 'success'); }}
                className="text-xs font-bold uppercase tracking-widest text-red-600 border border-red-300 px-3 py-1 hover:bg-red-50">
                Sí, borrar
              </button>
              <button onClick={() => setConfirmClear(false)}
                className="text-xs font-bold uppercase tracking-widest text-gray-600 border border-gray-300 px-3 py-1 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}