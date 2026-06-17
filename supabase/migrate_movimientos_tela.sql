-- =============================================================
-- MIGRACIÓN: movimientos_tela
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- 1. Quitar el CHECK constraint viejo de 'tipo'
ALTER TABLE movimientos_tela
  DROP CONSTRAINT IF EXISTS movimientos_tela_tipo_check;

-- 2. Renombrar columnas con nombres incorrectos
ALTER TABLE movimientos_tela RENAME COLUMN kg           TO kg_total;
ALTER TABLE movimientos_tela RENAME COLUMN num_factura  TO n_factura;
ALTER TABLE movimientos_tela RENAME COLUMN costo_factura TO costo_real_fact;

-- 3. Agregar columnas faltantes
ALTER TABLE movimientos_tela
  ADD COLUMN IF NOT EXISTS categoria_color      TEXT CHECK (categoria_color IN ('OSCURO','CLARO','MELANGE','PPT')),
  ADD COLUMN IF NOT EXISTS stock_rollos_antes   NUMERIC(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_rollos_despues NUMERIC(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responsable          TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS n_corte              TEXT;

-- 4. Quitar columna 'tonalidad' (no usada por la app)
ALTER TABLE movimientos_tela DROP COLUMN IF EXISTS tonalidad;

-- 5. Aplicar nuevo CHECK constraint con valores snake_case
ALTER TABLE movimientos_tela
  ADD CONSTRAINT movimientos_tela_tipo_check
  CHECK (tipo IN ('INGRESO','A_CORTE','A_REPROCESO','DE_REPROCESO','MUESTRA','AJUSTE_POS','AJUSTE_NEG'));
