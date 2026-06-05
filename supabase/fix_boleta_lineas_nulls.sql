-- ================================================================
-- FIX: boleta_lineas — columnas nulas post-migración
-- Problema: n_corte, corte_id, producto_id, tarifa_id y periodo
-- fueron añadidas sin DEFAULT → filas antiguas tienen NULL
-- y crashean el sort en Destajo (.localeCompare en null).
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ================================================================

-- 1. Cambiar n_corte de INTEGER a TEXT (la app envía strings como "C001")
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'boleta_lineas'
      AND column_name = 'n_corte'
      AND data_type IN ('integer', 'bigint')
  ) THEN
    ALTER TABLE boleta_lineas ALTER COLUMN n_corte TYPE TEXT USING n_corte::TEXT;
  END IF;
END $$;

-- 2. Backfill n_corte nulo desde la tabla cortes (si el join es posible)
UPDATE boleta_lineas bl
SET n_corte = c.n_corte::TEXT
FROM cortes c
WHERE bl.corte_id = c.id::TEXT
  AND bl.n_corte IS NULL;

-- 3. Poner vacío '' en los que no se pudieron resolver por join
UPDATE boleta_lineas SET n_corte  = ''   WHERE n_corte  IS NULL;
UPDATE boleta_lineas SET corte_id = ''   WHERE corte_id IS NULL;
UPDATE boleta_lineas SET producto_id = '' WHERE producto_id IS NULL;
UPDATE boleta_lineas SET tarifa_id = ''  WHERE tarifa_id IS NULL;
UPDATE boleta_lineas SET periodo = ''    WHERE periodo IS NULL;
UPDATE boleta_lineas SET operacion = ''  WHERE operacion IS NULL;
