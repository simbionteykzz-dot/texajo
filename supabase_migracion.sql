-- ============================================================
-- TEXAJO — Script de Migración
-- Aplica solo los cambios sobre una base ya existente.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Es seguro ejecutarlo varias veces (IF NOT EXISTS / IF NOT ALREADY).
-- ============================================================

-- 1. Nueva tabla: precios_tintoreria
-- ─────────────────────────────────────────────────────────────
create table if not exists precios_tintoreria (
  id            text primary key,
  tipo_servicio text not null check (tipo_servicio in ('REACTIVO','DIRECTO','PPT','LAVADO','TERMOFIJADO','COMPACTADO_EN_RAMA')),
  tipo_tela     text not null,
  precio_kg     numeric not null default 0,
  moneda        text not null check (moneda in ('PEN','USD')) default 'PEN',
  notas         text not null default '',
  created_at    timestamptz default now()
);

alter table precios_tintoreria disable row level security;
grant select, insert, update, delete on table precios_tintoreria to authenticated;


-- 2. Nueva columna en productos: receta_complementos (jsonb)
-- Guarda el array RecetaComplemento[] de cada producto.
-- ─────────────────────────────────────────────────────────────
alter table productos
  add column if not exists receta_complementos jsonb;


-- 3. Nueva columna en movimientos_complemento: producto_destino_id
-- Indica qué producto consumió estos complementos (solo tipo CONSUMO).
-- ─────────────────────────────────────────────────────────────
alter table movimientos_complemento
  add column if not exists producto_destino_id text;


-- 4. Índices de rendimiento para las nuevas columnas
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_precios_tint_servicio
  on precios_tintoreria(tipo_servicio);

create index if not exists idx_mov_comp_producto_destino
  on movimientos_complemento(producto_destino_id)
  where producto_destino_id is not null;


-- ─── Fin de migración ───────────────────────────────────────
-- Verificación: ejecuta esto para confirmar que todo existe:
--
-- select column_name from information_schema.columns
--   where table_name = 'productos' and column_name = 'receta_complementos';
--
-- select column_name from information_schema.columns
--   where table_name = 'movimientos_complemento' and column_name = 'producto_destino_id';
--
-- select count(*) from precios_tintoreria;
