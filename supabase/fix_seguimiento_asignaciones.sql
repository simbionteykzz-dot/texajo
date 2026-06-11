-- Fix: asegurar que seguimiento_filas tenga todas las columnas que usa la app
-- Ejecutar en Supabase SQL Editor si las asignaciones se pierden al recargar

-- Agregar columna asignaciones si no existe (JSONB array vacío por defecto)
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS asignaciones    JSONB         NOT NULL DEFAULT '[]';
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS n_corte         INTEGER;
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS fecha           DATE          DEFAULT CURRENT_DATE;
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS total_pago      NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS pct_avance      INTEGER       NOT NULL DEFAULT 0;

-- Sincronizar porcentaje_avance → pct_avance en filas existentes (por si hubo datos previos)
UPDATE seguimiento_filas
SET pct_avance = porcentaje_avance::INTEGER
WHERE pct_avance = 0 AND porcentaje_avance > 0;

-- Verificar columnas presentes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'seguimiento_filas'
ORDER BY ordinal_position;
