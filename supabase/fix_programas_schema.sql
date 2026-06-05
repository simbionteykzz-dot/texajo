-- =============================================================
-- FIX: Recrear tablas de Programas Zurzam con columnas correctas
-- El schema anterior tenía nombres distintos a los que usa el código.
-- EJECUTAR UNA SOLA VEZ. No hay datos que perder (los INSERTs fallaban).
-- =============================================================

-- Eliminar en orden inverso de dependencias
DROP TABLE IF EXISTS stock_extornos     CASCADE;
DROP TABLE IF EXISTS compras_hilo       CASCADE;
DROP TABLE IF EXISTS programa_detalles  CASCADE;
DROP TABLE IF EXISTS programas_zurzam   CASCADE;

-- ─── programas_zurzam ────────────────────────────────────────
CREATE TABLE programas_zurzam (
  id                    SERIAL PRIMARY KEY,
  nombre                TEXT NOT NULL,
  fecha                 DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_id            INTEGER REFERENCES clientes(id),
  rollos_objetivo       INTEGER NOT NULL DEFAULT 0,
  kg_objetivo           NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado                TEXT NOT NULL DEFAULT 'NUEVO'
                          CHECK (estado IN ('NUEVO','EN_COMPRA','EN_TEJEDURIA','EN_TINTORERIA','EN_PLANTA','CERRADO')),
  comision_jose         NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado_pago_comision  TEXT NOT NULL DEFAULT 'PENDIENTE'
                          CHECK (estado_pago_comision IN ('PENDIENTE','PARCIAL','PAGADO','ANULADO')),
  dias_entrega          INTEGER NOT NULL DEFAULT 0,
  notas                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── programa_detalles ───────────────────────────────────────
CREATE TABLE programa_detalles (
  id                      SERIAL PRIMARY KEY,
  programa_id             INTEGER NOT NULL REFERENCES programas_zurzam(id) ON DELETE CASCADE,
  color_id                INTEGER NOT NULL REFERENCES colores(id),
  categoria_color         TEXT,
  tipo_servicio           TEXT,
  prioridad               TEXT NOT NULL DEFAULT 'MEDIA',
  kg_tej_enviado          NUMERIC(10,2) NOT NULL DEFAULT 0,
  kg_tej_retornado        NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_kg_tej           NUMERIC(8,4)  NOT NULL DEFAULT 0,
  moneda_tej              TEXT NOT NULL DEFAULT 'PEN',
  tc_tej                  NUMERIC(6,4)  NOT NULL DEFAULT 1,
  costo_tejido            NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado_pago_tej         TEXT NOT NULL DEFAULT 'PENDIENTE',
  kg_tint_enviado         NUMERIC(10,2) NOT NULL DEFAULT 0,
  kg_tint_retornado       NUMERIC(10,2) NOT NULL DEFAULT 0,
  rollos_final            INTEGER NOT NULL DEFAULT 0,
  precio_kg_tint          NUMERIC(8,4)  NOT NULL DEFAULT 0,
  moneda_tint             TEXT NOT NULL DEFAULT 'PEN',
  tc_tint                 NUMERIC(6,4)  NOT NULL DEFAULT 1,
  costo_tint              NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado_pago_tint        TEXT NOT NULL DEFAULT 'PENDIENTE',
  costo_hilo_prorrateado  NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_total_color       NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── compras_hilo ────────────────────────────────────────────
CREATE TABLE compras_hilo (
  id              SERIAL PRIMARY KEY,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  programa_id     INTEGER NOT NULL REFERENCES programas_zurzam(id) ON DELETE CASCADE,
  tipo_hilo       TEXT NOT NULL,
  kg_asignados    NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_kg       NUMERIC(8,4)  NOT NULL DEFAULT 0,
  moneda          TEXT NOT NULL DEFAULT 'PEN',
  tipo_cambio     NUMERIC(6,4)  NOT NULL DEFAULT 1,
  total_soles     NUMERIC(14,2) NOT NULL DEFAULT 0,
  proveedor_id    INTEGER REFERENCES proveedores(id),
  n_factura       TEXT,
  costo_real_fact NUMERIC(12,2) NOT NULL DEFAULT 0,
  diferencia      NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado_pago     TEXT NOT NULL DEFAULT 'PENDIENTE'
                    CHECK (estado_pago IN ('PENDIENTE','PAGADO','PARCIAL')),
  fecha_pago      DATE,
  monto_pagado    NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo           NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── stock_extornos ──────────────────────────────────────────
CREATE TABLE stock_extornos (
  id                    SERIAL PRIMARY KEY,
  programa_id           INTEGER NOT NULL REFERENCES programas_zurzam(id) ON DELETE CASCADE,
  programa_detalle_id   INTEGER REFERENCES programa_detalles(id) ON DELETE SET NULL,
  fecha                 DATE NOT NULL DEFAULT CURRENT_DATE,
  kg_conos              NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_kg_hilo        NUMERIC(8,4)  NOT NULL DEFAULT 0,
  total_soles           NUMERIC(12,2) NOT NULL DEFAULT 0,
  usado                 BOOLEAN NOT NULL DEFAULT FALSE,
  notas                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
