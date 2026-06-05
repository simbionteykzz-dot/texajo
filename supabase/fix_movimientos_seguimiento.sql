-- =============================================================
-- FIX: movimientos_tela + seguimiento_filas + boleta_lineas
-- Compatible con old schema (TEXT PKs) y new schema (SERIAL INTEGER PKs).
-- Ejecutar una sola vez en Supabase SQL Editor.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. movimientos_tela
--    Problemas: id SERIAL (app envía UUID TEXT), tipo CHECK con
--    espacios (app usa guiones bajos), columnas faltantes.
-- ─────────────────────────────────────────────────────────────

-- 1a. Cambiar id de INTEGER a TEXT si todavía es entero
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movimientos_tela'
      AND column_name = 'id'
      AND data_type IN ('integer', 'bigint')
  ) THEN
    ALTER TABLE movimientos_tela ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE movimientos_tela ALTER COLUMN id TYPE TEXT USING id::TEXT;
    DROP SEQUENCE IF EXISTS movimientos_tela_id_seq CASCADE;
  END IF;
END $$;

-- 1b. Reemplazar CHECK de tipo para aceptar valores con guión bajo (los que usa la app)
ALTER TABLE movimientos_tela DROP CONSTRAINT IF EXISTS movimientos_tela_tipo_check;
ALTER TABLE movimientos_tela ADD CONSTRAINT movimientos_tela_tipo_check
  CHECK (tipo IN (
    'INGRESO',
    'A_CORTE',    'A CORTE',
    'A_REPROCESO','A REPROCESO',
    'DE_REPROCESO','DE REPROCESO',
    'MUESTRA',
    'AJUSTE_POS', 'AJUSTE+',
    'AJUSTE_NEG', 'AJUSTE-'
  ));

-- 1c. Hacer cliente_id nullable (evita FK-error cuando el form no selecciona cliente)
ALTER TABLE movimientos_tela ALTER COLUMN cliente_id DROP NOT NULL;

-- 1d. Agregar columnas que usa la app y no existen en el new schema
ALTER TABLE movimientos_tela ADD COLUMN IF NOT EXISTS kg_total            NUMERIC(10,2);
ALTER TABLE movimientos_tela ADD COLUMN IF NOT EXISTS categoria_color     TEXT;
ALTER TABLE movimientos_tela ADD COLUMN IF NOT EXISTS stock_rollos_antes  NUMERIC(10,2);
ALTER TABLE movimientos_tela ADD COLUMN IF NOT EXISTS stock_rollos_despues NUMERIC(10,2);
ALTER TABLE movimientos_tela ADD COLUMN IF NOT EXISTS responsable         TEXT;
ALTER TABLE movimientos_tela ADD COLUMN IF NOT EXISTS n_corte             INTEGER;
ALTER TABLE movimientos_tela ADD COLUMN IF NOT EXISTS n_factura           TEXT;
ALTER TABLE movimientos_tela ADD COLUMN IF NOT EXISTS costo_real_fact     NUMERIC(12,2);

-- ─────────────────────────────────────────────────────────────
-- 2. seguimiento_filas
--    Problemas: id SERIAL (app envía UUID), falta columna
--    asignaciones JSONB, y columnas n_corte/fecha/total_pago/pct_avance.
-- ─────────────────────────────────────────────────────────────

-- 2a. Eliminar FK de boleta_lineas → seguimiento_filas si existe
--     (el new schema la define como INTEGER NOT NULL; la vamos a aflojar)
ALTER TABLE boleta_lineas DROP CONSTRAINT IF EXISTS boleta_lineas_seguimiento_fila_id_fkey;

-- 2b. Cambiar id de INTEGER a TEXT si todavía es entero
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seguimiento_filas'
      AND column_name = 'id'
      AND data_type IN ('integer', 'bigint')
  ) THEN
    ALTER TABLE seguimiento_filas ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE seguimiento_filas ALTER COLUMN id TYPE TEXT USING id::TEXT;
    DROP SEQUENCE IF EXISTS seguimiento_filas_id_seq CASCADE;
  END IF;
END $$;

-- 2c. Cambiar corte_id de INTEGER a TEXT si es entero
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seguimiento_filas'
      AND column_name = 'corte_id'
      AND data_type IN ('integer', 'bigint')
  ) THEN
    ALTER TABLE seguimiento_filas DROP CONSTRAINT IF EXISTS seguimiento_filas_corte_id_fkey;
    ALTER TABLE seguimiento_filas ALTER COLUMN corte_id TYPE TEXT USING corte_id::TEXT;
  END IF;
END $$;

-- 2d. Agregar columnas faltantes
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS asignaciones JSONB        NOT NULL DEFAULT '[]';
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS n_corte      INTEGER;
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS fecha        DATE          DEFAULT CURRENT_DATE;
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS total_pago   NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE seguimiento_filas ADD COLUMN IF NOT EXISTS pct_avance   INTEGER       NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────
-- 3. boleta_lineas
--    Problemas: id SERIAL, falta corte_id/tarifa_id y más columnas.
--    La columna seguimiento_fila_id (new schema) se hace nullable.
-- ─────────────────────────────────────────────────────────────

-- 3a. Cambiar id de INTEGER a TEXT si todavía es entero
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'boleta_lineas'
      AND column_name = 'id'
      AND data_type IN ('integer', 'bigint')
  ) THEN
    ALTER TABLE boleta_lineas ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE boleta_lineas ALTER COLUMN id TYPE TEXT USING id::TEXT;
    DROP SEQUENCE IF EXISTS boleta_lineas_id_seq CASCADE;
  END IF;
END $$;

-- 3b. seguimiento_fila_id: hacer nullable para que inserts sin ese campo no fallen
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'boleta_lineas' AND column_name = 'seguimiento_fila_id'
  ) THEN
    ALTER TABLE boleta_lineas ALTER COLUMN seguimiento_fila_id DROP NOT NULL;
  END IF;
END $$;

-- 3c. Agregar columnas que usa la app
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS corte_id      TEXT;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS n_corte       INTEGER;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS producto_id   TEXT;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS tarifa_id     TEXT;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS orden         INTEGER       NOT NULL DEFAULT 0;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS tarifa        NUMERIC(8,4)  NOT NULL DEFAULT 0;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS cant_prendas  INTEGER       NOT NULL DEFAULT 0;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS importe       NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS periodo       TEXT;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS fecha_registro DATE;
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS estado_pago   TEXT          NOT NULL DEFAULT 'PENDIENTE';
ALTER TABLE boleta_lineas ADD COLUMN IF NOT EXISTS fecha_pago    DATE;
