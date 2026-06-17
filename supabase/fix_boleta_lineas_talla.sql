-- ================================================================
-- FIX: boleta_lineas — agregar columna talla
-- Necesaria para sub-líneas de pago parcial por talla en Destajo.
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ================================================================

ALTER TABLE boleta_lineas
  ADD COLUMN IF NOT EXISTS talla TEXT CHECK (talla IN ('S','M','L','XL'));
