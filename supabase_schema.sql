-- ============================================================
-- TEXAJO — Supabase Schema (datos compartidos, sin RLS)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ─── Catálogos ──────────────────────────────────────────────

create table if not exists clientes (
  id          text primary key,
  nombre      text not null,
  contacto    text not null default '',
  notas       text not null default '',
  created_at  timestamptz default now()
);

create table if not exists proveedores (
  id          text primary key,
  nombre      text not null,
  ruc         text not null default '',
  contacto    text not null default '',
  tipo        text not null check (tipo in ('TELA','COMPLEMENTO','HILO','SERVICIO','ZURZAM')),
  created_at  timestamptz default now()
);

create table if not exists telas (
  id           text primary key,
  nombre       text not null,
  composicion  text not null default '',
  kg_por_rollo numeric not null default 20,
  notas        text not null default '',
  created_at   timestamptz default now()
);

create table if not exists colores (
  id         text primary key,
  nombre     text not null,
  categoria  text not null check (categoria in ('OSCURO','CLARO','MELANGE','PPT')),
  prioridad  integer not null default 0,
  notas      text not null default '',
  created_at timestamptz default now()
);

create table if not exists precios_telas (
  id              text primary key,
  tela_id         text not null references telas(id) on delete cascade,
  categoria_color text not null check (categoria_color in ('OSCURO','CLARO','MELANGE','PPT')),
  precio_kg       numeric not null default 0,
  created_at      timestamptz default now()
);

create table if not exists precios_complementos (
  id         text primary key,
  clave      text not null,
  tipo       text not null,
  origen     text not null,
  talla      text not null check (talla in ('S','M','L','XL')),
  precio     numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists precios_tejeduria (
  id           text primary key,
  tipo_tejido  text not null,
  precio_kg    numeric not null default 0,
  created_at   timestamptz default now()
);

create table if not exists productos (
  id                  text primary key,
  nombre              text not null,
  costo_mo_total      numeric not null default 0,
  precio_servicio     numeric not null default 0,
  tela_base           text,
  limite_consumo      numeric,
  limite_rendimiento  numeric,
  receta_complementos jsonb,          -- RecetaComplemento[]
  notas               text not null default '',
  created_at          timestamptz default now()
);

create table if not exists tarifas_operaciones (
  id          text primary key,
  producto_id text not null references productos(id) on delete cascade,
  orden       integer not null default 0,
  operacion   text not null,
  tarifa      numeric not null default 0,
  notas       text not null default '',
  clave       text not null default '',
  created_at  timestamptz default now()
);

create table if not exists operarios (
  id            text primary key,
  codigo        text not null,
  nombre        text not null,
  estado        text not null check (estado in ('ACTIVO','INACTIVO')) default 'ACTIVO',
  dni           text,
  telefono      text,
  modulo        text,
  maquina       text,
  fecha_ingreso text,
  created_at    timestamptz default now()
);

-- ─── Inventario ─────────────────────────────────────────────

create table if not exists movimientos_tela (
  id                   text primary key,
  fecha                text not null,
  tipo                 text not null check (tipo in ('INGRESO','A_CORTE','A_REPROCESO','DE_REPROCESO','MUESTRA','AJUSTE_POS','AJUSTE_NEG')),
  cliente_id           text not null,
  tela_id              text not null,
  color_id             text not null,
  rollos               numeric not null default 0,
  kg_total             numeric not null default 0,
  categoria_color      text not null check (categoria_color in ('OSCURO','CLARO','MELANGE','PPT')),
  precio_kg            numeric not null default 0,
  total_soles          numeric not null default 0,
  stock_rollos_antes   numeric not null default 0,
  stock_rollos_despues numeric not null default 0,
  responsable          text not null default '',
  proveedor_id         text,
  n_factura            text,
  costo_real_fact      numeric,
  corte_id             text,
  n_corte              text,
  notas                text not null default '',
  created_at           timestamptz default now()
);

-- ─── Cortes ─────────────────────────────────────────────────

create table if not exists cortes (
  id              text primary key,
  n_corte         text not null,
  fecha           text not null,
  cliente_id      text not null,
  producto_id     text not null,
  color_id        text not null,
  tela_id         text,
  cortador        text not null default '',
  ayudante        text not null default '',
  kg_usados       numeric not null default 0,
  rollos_usados   numeric not null default 0,
  tendidas        integer not null default 0,
  mts_por_tendida numeric not null default 0,
  ancho           numeric not null default 0,
  cant_s          integer not null default 0,
  cant_m          integer not null default 0,
  cant_l          integer not null default 0,
  cant_xl         integer not null default 0,
  total_prendas   integer not null default 0,
  consumo         numeric not null default 0,
  rendimiento     numeric not null default 0,
  revision        text not null check (revision in ('VERIFICADO','PENDIENTE')) default 'PENDIENTE',
  traslado        boolean not null default false,
  estado          text not null check (estado in ('EN_PROCESO','COMPLETADO','ANULADO')) default 'EN_PROCESO',
  pago_cliente    text not null check (pago_cliente in ('PENDIENTE','COBRADO')) default 'PENDIENTE',
  pago_planilla   text not null check (pago_planilla in ('PENDIENTE','PAGADO')) default 'PENDIENTE',
  costo_mo_corte  numeric not null default 0,
  notas           text not null default '',
  created_at      timestamptz default now()
);

-- ─── Seguimiento Producción ─────────────────────────────────

create table if not exists seguimiento_filas (
  id           text primary key,
  corte_id     text not null references cortes(id) on delete cascade,
  n_corte      text not null,
  producto_id  text not null,
  fecha        text not null,
  color_id     text not null,
  talla        text not null check (talla in ('S','M','L','XL')),
  cantidad     integer not null default 0,
  asignaciones jsonb not null default '[]',
  pct_avance   numeric not null default 0,
  estado       text not null default 'PENDIENTE',
  total_pago   numeric not null default 0,
  created_at   timestamptz default now()
);

-- ─── Destajo ────────────────────────────────────────────────

create table if not exists boleta_lineas (
  id           text primary key,
  operario_id  text not null,
  corte_id     text not null,
  n_corte      text not null,
  producto_id  text not null,
  tarifa_id    text not null,
  operacion    text not null,
  orden        integer not null default 0,
  tarifa       numeric not null default 0,
  cant_prendas integer not null default 0,
  importe      numeric not null default 0,
  periodo      text not null,
  estado_pago  text not null check (estado_pago in ('PENDIENTE','PAGADO')) default 'PENDIENTE',
  fecha_pago   text,
  created_at   timestamptz default now()
);

create table if not exists descuentos_boleta (
  id          text primary key,
  operario_id text not null,
  periodo     text not null,
  tipo        text not null check (tipo in ('ADELANTO','CAFETÍN','PRÉSTAMO','FALTA','OTRO')),
  monto       numeric not null default 0,
  notas       text not null default '',
  created_at  timestamptz default now()
);

-- ─── Programas Zurzam ───────────────────────────────────────

create table if not exists programas_zurzam (
  id                   text primary key,
  nombre               text not null,
  fecha                text not null,
  cliente_id           text not null,
  rollos_objetivo      numeric not null default 0,
  kg_objetivo          numeric not null default 0,
  estado               text not null check (estado in ('NUEVO','EN_COMPRA','EN_TEJEDURIA','EN_TINTORERIA','EN_PLANTA','CERRADO')) default 'NUEVO',
  comision_jose        numeric not null default 0,
  estado_pago_comision text not null check (estado_pago_comision in ('PENDIENTE','PAGADO')) default 'PENDIENTE',
  dias_entrega         integer not null default 0,
  notas                text not null default '',
  created_at           timestamptz default now()
);

create table if not exists programa_detalles (
  id                     text primary key,
  programa_id            text not null references programas_zurzam(id) on delete cascade,
  color_id               text not null,
  categoria_color        text not null check (categoria_color in ('OSCURO','CLARO','MELANGE','PPT')),
  tipo_servicio          text not null check (tipo_servicio in ('REACTIVO','DIRECTO','PPT','LAVADO','TERMOFIJADO','COMPACTADO_EN_RAMA')),
  prioridad              text not null check (prioridad in ('URGENTE','ALTA','MEDIA','OPCIONAL')) default 'MEDIA',
  kg_tej_enviado         numeric not null default 0,
  kg_tej_retornado       numeric not null default 0,
  precio_kg_tej          numeric not null default 0,
  moneda_tej             text not null check (moneda_tej in ('PEN','USD')) default 'PEN',
  tc_tej                 numeric not null default 1,
  costo_tejido           numeric not null default 0,
  estado_pago_tej        text not null check (estado_pago_tej in ('PAGADO','PENDIENTE','PARCIAL','ANULADO')) default 'PENDIENTE',
  kg_tint_enviado        numeric not null default 0,
  kg_tint_retornado      numeric not null default 0,
  rollos_final           numeric not null default 0,
  precio_kg_tint         numeric not null default 0,
  moneda_tint            text not null check (moneda_tint in ('PEN','USD')) default 'PEN',
  tc_tint                numeric not null default 1,
  costo_tint             numeric not null default 0,
  estado_pago_tint       text not null check (estado_pago_tint in ('PAGADO','PENDIENTE','PARCIAL','ANULADO')) default 'PENDIENTE',
  costo_hilo_prorrateado numeric not null default 0,
  costo_total_color      numeric not null default 0,
  notas                  text not null default '',
  created_at             timestamptz default now()
);

create table if not exists compras_hilo (
  id              text primary key,
  fecha           text not null,
  programa_id     text not null references programas_zurzam(id) on delete cascade,
  tipo_hilo       text not null,
  kg_asignados    numeric not null default 0,
  precio_kg       numeric not null default 0,
  moneda          text not null check (moneda in ('PEN','USD')) default 'PEN',
  tipo_cambio     numeric not null default 1,
  total_soles     numeric not null default 0,
  proveedor_id    text not null,
  n_factura       text not null default '',
  costo_real_fact numeric not null default 0,
  diferencia      numeric not null default 0,
  estado_pago     text not null check (estado_pago in ('PAGADO','PENDIENTE','PARCIAL','ANULADO')) default 'PENDIENTE',
  fecha_pago      text,
  monto_pagado    numeric not null default 0,
  saldo           numeric not null default 0,
  notas           text not null default '',
  created_at      timestamptz default now()
);

create table if not exists stock_extornos (
  id                  text primary key,
  programa_id         text not null references programas_zurzam(id) on delete cascade,
  programa_detalle_id text,
  fecha               text not null,
  kg_conos            numeric not null default 0,
  precio_kg_hilo      numeric not null default 0,
  total_soles         numeric not null default 0,
  usado               boolean not null default false,
  notas               text not null default '',
  created_at          timestamptz default now()
);

-- ─── Cobros ─────────────────────────────────────────────────

create table if not exists cobros_diarios (
  id               text primary key,
  fecha            text not null,
  n_corte          text not null,
  n_factura        text not null default '',
  cliente_id       text not null,
  producto_id      text not null,
  color_id         text not null,
  cant_s           integer not null default 0,
  cant_m           integer not null default 0,
  cant_l           integer not null default 0,
  cant_xl          integer not null default 0,
  total_prendas    integer not null default 0,
  precio_unitario  numeric not null default 0,
  bruto            numeric not null default 0,
  detraccion_10pct numeric not null default 0,
  disponible_90pct numeric not null default 0,
  estado           text not null check (estado in ('PENDIENTE','COBRADO','ANULADO')) default 'PENDIENTE',
  notas            text not null default '',
  fecha_cobro      text,
  created_at       timestamptz default now()
);

-- ─── Complementos ───────────────────────────────────────────

create table if not exists movimientos_complemento (
  id                   text primary key,
  fecha                text not null,
  tipo                 text not null check (tipo in ('INGRESO','CONSUMO','AJUSTE_POS','AJUSTE_NEG')),
  tipo_complemento     text not null check (tipo_complemento in ('CUELLO','PUÑO','PRETINA')),
  color_id             text not null,
  talla                text not null check (talla in ('S','M','L','XL')),
  cantidad             integer not null default 0,
  precio_unit          numeric not null default 0,
  total_soles          numeric not null default 0,
  stock_antes          integer not null default 0,
  stock_despues        integer not null default 0,
  corte_id             text,
  n_corte              text,
  producto_destino_id  text,          -- producto que consumió estos complementos
  proveedor_id         text,
  n_factura            text,
  responsable          text not null default '',
  notas                text not null default '',
  created_at           timestamptz default now()
);

-- ─── Configuración ──────────────────────────────────────────

create table if not exists config (
  id                   text primary key default 'singleton',
  umbral_critico       numeric not null default 5,
  umbral_bajo          numeric not null default 10,
  merma_pct            numeric not null default 15,
  detraccion_pct       numeric not null default 10,
  igv_pct              numeric not null default 18,
  incluir_igv          boolean not null default false,
  tipo_cambio_usd      numeric not null default 3.7,
  kg_por_rollo_default numeric not null default 20,
  comision_jose_kg     numeric not null default 0,
  merma_max_tej        numeric not null default 5,
  merma_max_tint       numeric not null default 3,
  created_at           timestamptz default now(),
  constraint config_singleton check (id = 'singleton')
);

-- ─── Precios Tintorería ─────────────────────────────────────

create table if not exists precios_tintoreria (
  id            text primary key,
  tipo_servicio text not null check (tipo_servicio in ('REACTIVO','DIRECTO','PPT','LAVADO','TERMOFIJADO','COMPACTADO_EN_RAMA')),
  tipo_tela     text not null,
  precio_kg     numeric not null default 0,
  moneda        text not null check (moneda in ('PEN','USD')) default 'PEN',
  notas         text not null default '',
  created_at    timestamptz default now()
);

-- ─── Acceso público (anon key puede leer/escribir) ──────────
-- Sin RLS: todos los usuarios autenticados comparten los mismos datos

alter table clientes               disable row level security;
alter table proveedores            disable row level security;
alter table telas                  disable row level security;
alter table colores                disable row level security;
alter table precios_telas          disable row level security;
alter table precios_complementos   disable row level security;
alter table precios_tejeduria      disable row level security;
alter table productos              disable row level security;
alter table tarifas_operaciones    disable row level security;
alter table operarios              disable row level security;
alter table movimientos_tela       disable row level security;
alter table cortes                 disable row level security;
alter table seguimiento_filas      disable row level security;
alter table boleta_lineas          disable row level security;
alter table descuentos_boleta      disable row level security;
alter table programas_zurzam       disable row level security;
alter table programa_detalles      disable row level security;
alter table compras_hilo           disable row level security;
alter table stock_extornos         disable row level security;
alter table cobros_diarios         disable row level security;
alter table precios_tintoreria      disable row level security;
alter table movimientos_complemento disable row level security;
alter table config                 disable row level security;

-- Permitir acceso a usuarios autenticados
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on schema public to authenticated;

-- ─── Índices para rendimiento ───────────────────────────────

create index if not exists idx_movimientos_tela_tela    on movimientos_tela(tela_id);
create index if not exists idx_movimientos_tela_color   on movimientos_tela(color_id);
create index if not exists idx_movimientos_tela_fecha   on movimientos_tela(fecha);
create index if not exists idx_cortes_estado            on cortes(estado);
create index if not exists idx_cortes_fecha             on cortes(fecha);
create index if not exists idx_boleta_lineas_operario   on boleta_lineas(operario_id);
create index if not exists idx_boleta_lineas_periodo    on boleta_lineas(periodo);
create index if not exists idx_seguimiento_corte        on seguimiento_filas(corte_id);
create index if not exists idx_cobros_estado            on cobros_diarios(estado);
create index if not exists idx_programas_estado         on programas_zurzam(estado);
create index if not exists idx_tarifas_producto         on tarifas_operaciones(producto_id);
