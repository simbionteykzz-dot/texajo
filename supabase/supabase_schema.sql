-- =============================================================
-- TEXAJO — Sistema de Gestión Textil
-- Schema completo desde cero
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. DROP ALL (orden correcto por dependencias FK)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS cobros_diarios CASCADE;
DROP TABLE IF EXISTS movimientos_complemento CASCADE;
DROP TABLE IF EXISTS movimientos_tela CASCADE;
DROP TABLE IF EXISTS descuentos_boleta CASCADE;
DROP TABLE IF EXISTS boleta_lineas CASCADE;
DROP TABLE IF EXISTS seguimiento_filas CASCADE;
DROP TABLE IF EXISTS stock_extornos CASCADE;
DROP TABLE IF EXISTS compras_hilo CASCADE;
DROP TABLE IF EXISTS programa_detalles CASCADE;
DROP TABLE IF EXISTS programas_zurzam CASCADE;
DROP TABLE IF EXISTS producto_colores CASCADE;
DROP TABLE IF EXISTS tarifas_operaciones CASCADE;
DROP TABLE IF EXISTS cortes CASCADE;
DROP TABLE IF EXISTS precios_complementos CASCADE;
DROP TABLE IF EXISTS precios_telas CASCADE;
DROP TABLE IF EXISTS precios_tejeduria CASCADE;
DROP TABLE IF EXISTS precios_tintoreria CASCADE;
DROP TABLE IF EXISTS operarios CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS colores CASCADE;
DROP TABLE IF EXISTS telas CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS config CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 1. CATÁLOGOS BASE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE config (
  id          SERIAL PRIMARY KEY,
  clave       TEXT NOT NULL UNIQUE,
  valor       TEXT NOT NULL,
  descripcion TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clientes (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proveedores (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('HILO','TELA','TEJEDURÍA','TINTORERÍA','COMPLEMENTO','OTRO')),
  ruc         TEXT,
  contacto    TEXT,
  telefono    TEXT,
  email       TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Colores base (27 colores canónicos — sin tonalidades)
-- La tonalidad se registra en cortes.tonalidad (TEXT nullable)
CREATE TABLE colores (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE,
  categoria   TEXT NOT NULL CHECK (categoria IN ('OSCURO','CLARO','MELANGE','PPT')),
  prioridad   INTEGER NOT NULL DEFAULT 99,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  notas       TEXT
);

CREATE TABLE telas (
  id             SERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL UNIQUE,
  composicion    TEXT,
  kg_por_rollo   NUMERIC(6,2) NOT NULL DEFAULT 20,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  notas          TEXT
);

CREATE TABLE productos (
  id                SERIAL PRIMARY KEY,
  nombre            TEXT NOT NULL UNIQUE,
  tela_id           INTEGER NOT NULL REFERENCES telas(id),
  costo_mo          NUMERIC(8,4) NOT NULL,       -- S/. por prenda (Doc 4 canónico)
  precio_venta      NUMERIC(8,4),                -- S/. por prenda (null = sin precio aún)
  margen_objetivo   NUMERIC(5,4) NOT NULL DEFAULT 0.40,
  limite_consumo    NUMERIC(6,4),                -- kg/prenda
  limite_rendimiento NUMERIC(6,4),               -- prendas/kg
  -- complementos
  cuello_origen     TEXT CHECK (cuello_origen IN ('RIB 1x1','RIB 2x1','RECTILÍNEO','NINGUNO')),
  cuellos_por_prenda INTEGER NOT NULL DEFAULT 0,
  puno_origen       TEXT CHECK (puno_origen IN ('RIB 2x1','RECTILÍNEO','NINGUNO')),
  punos_por_prenda  INTEGER NOT NULL DEFAULT 0,
  pretina_origen    TEXT CHECK (pretina_origen IN ('RIB 2x1','NINGUNO')),
  pretinas_por_prenda INTEGER NOT NULL DEFAULT 0,
  cierre_origen     TEXT CHECK (cierre_origen IN ('DIRECTO','NINGUNO')),
  cierres_por_prenda INTEGER NOT NULL DEFAULT 0,
  -- proporciones default por producto (fallback al crear cortes)
  prop_s            NUMERIC(6,2) DEFAULT 0,
  prop_m            NUMERIC(6,2) DEFAULT 0,
  prop_l            NUMERIC(6,2) DEFAULT 0,
  prop_xl           NUMERIC(6,2) DEFAULT 0,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  notas             TEXT
);

CREATE TABLE operarios (
  id             SERIAL PRIMARY KEY,
  codigo         TEXT NOT NULL UNIQUE,
  nombre_completo TEXT NOT NULL,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  notas          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. PRECIOS
-- ─────────────────────────────────────────────────────────────

-- Precio tela por (tela + categoría de color) — tabla canónica
CREATE TABLE precios_telas (
  id          SERIAL PRIMARY KEY,
  tela_id     INTEGER NOT NULL REFERENCES telas(id),
  categoria   TEXT NOT NULL CHECK (categoria IN ('OSCURO','CLARO','MELANGE','PPT')),
  precio_kg   NUMERIC(8,2) NOT NULL,
  vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (tela_id, categoria)
);

-- Precio complementos por (tipo + origen + talla)
CREATE TABLE precios_complementos (
  id          SERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL CHECK (tipo IN ('CUELLO','PUÑO','PRETINA','CIERRE')),
  origen      TEXT NOT NULL CHECK (origen IN ('RIB 1x1','RIB 2x1','RECTILÍNEO','DIRECTO')),
  talla       TEXT NOT NULL CHECK (talla IN ('S','M','L','XL')),
  precio_unit NUMERIC(8,4) NOT NULL,
  vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (tipo, origen, talla)
);

-- Precio tejeduría por tipo de tejido
CREATE TABLE precios_tejeduria (
  id              SERIAL PRIMARY KEY,
  tipo_tejido     TEXT NOT NULL UNIQUE,
  precio_kg_soles NUMERIC(8,4) NOT NULL,    -- S/. por kg recibido
  vigente_desde   DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Precio tintorería por (servicio + tipo de tejido)
CREATE TABLE precios_tintoreria (
  id              SERIAL PRIMARY KEY,
  servicio        TEXT NOT NULL CHECK (servicio IN ('REACTIVO','DIRECTO','PPT','LAVADO','TERMOFIJADO','COMPACTADO EN RAMA')),
  tipo_tejido     TEXT NOT NULL,
  precio_kg_soles NUMERIC(8,4) NOT NULL,    -- S/. por kg recibido
  vigente_desde   DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (servicio, tipo_tejido)
);

-- ─────────────────────────────────────────────────────────────
-- 3. TARIFAS DESTAJO (por producto × operación)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE tarifas_operaciones (
  id          SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  operacion   TEXT NOT NULL,
  tarifa      NUMERIC(8,4) NOT NULL,
  orden       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (producto_id, operacion)
);

-- ─────────────────────────────────────────────────────────────
-- 4. INVENTARIO TELAS — MOVIMIENTOS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE movimientos_tela (
  id           SERIAL PRIMARY KEY,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo         TEXT NOT NULL CHECK (tipo IN (
                 'INGRESO','A CORTE','A REPROCESO','DE REPROCESO',
                 'MUESTRA','AJUSTE+','AJUSTE-')),
  cliente_id   INTEGER REFERENCES clientes(id),
  tela_id      INTEGER NOT NULL REFERENCES telas(id),
  color_id     INTEGER NOT NULL REFERENCES colores(id),
  tonalidad    TEXT,                              -- ej: "1", "2", null
  rollos       NUMERIC(8,2) NOT NULL,
  kg           NUMERIC(10,2),                     -- calculado: rollos × kg_por_rollo
  precio_kg    NUMERIC(8,2),                      -- lookup precios_telas
  total_soles  NUMERIC(12,2),                     -- calculado: kg × precio_kg
  proveedor_id INTEGER REFERENCES proveedores(id),
  num_factura  TEXT,
  costo_factura NUMERIC(12,2),
  corte_id     INTEGER,                           -- FK a cortes (se agrega AFTER cortes)
  notas        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 5. CORTES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE cortes (
  id              SERIAL PRIMARY KEY,
  n_corte         INTEGER NOT NULL,       -- número de corte del lote (puede repetirse entre clientes)
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
  producto_id     INTEGER NOT NULL REFERENCES productos(id),
  color_id        INTEGER NOT NULL REFERENCES colores(id),
  tonalidad       TEXT,                   -- ej: "1", "2", null
  tela_id         INTEGER REFERENCES telas(id),
  cortador        TEXT,
  ayudante        TEXT,
  -- tela usada
  kg_usados       NUMERIC(10,2),
  rollos_usados   NUMERIC(8,2),
  tendidas        INTEGER,
  mts_por_tendida NUMERIC(8,2),
  ancho_cm        NUMERIC(6,2),
  -- proporciones (ratios del pedido)
  prop_s          NUMERIC(6,2) DEFAULT 0,
  prop_m          NUMERIC(6,2) DEFAULT 0,
  prop_l          NUMERIC(6,2) DEFAULT 0,
  prop_xl         NUMERIC(6,2) DEFAULT 0,
  -- cantidades reales
  cant_s          INTEGER DEFAULT 0,
  cant_m          INTEGER DEFAULT 0,
  cant_l          INTEGER DEFAULT 0,
  cant_xl         INTEGER DEFAULT 0,
  total_prendas   INTEGER,
  -- métricas calculadas
  consumo         NUMERIC(10,6),          -- kg/prenda
  rendimiento     NUMERIC(10,6),          -- prendas/kg
  -- flujo
  revision        BOOLEAN DEFAULT FALSE,
  traslado        BOOLEAN DEFAULT FALSE,
  estado          TEXT NOT NULL DEFAULT 'PENDIENTE'
                    CHECK (estado IN ('PENDIENTE','EN_PROCESO','LISTO','ENTREGADO')),
  -- costos
  pago_cliente    NUMERIC(12,2),          -- precio_venta × total_prendas
  pago_planilla   NUMERIC(12,2),          -- total destajo del corte
  costo_mo_corte  NUMERIC(12,2),          -- costo_mo × total_prendas
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- FK diferida: movimientos_tela → cortes
ALTER TABLE movimientos_tela
  ADD CONSTRAINT fk_movimientos_tela_corte
  FOREIGN KEY (corte_id) REFERENCES cortes(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- 6. SEGUIMIENTO CONFECCIÓN Y BOLETA
-- ─────────────────────────────────────────────────────────────

-- 1 fila = 1 corte × 1 color × 1 talla
CREATE TABLE seguimiento_filas (
  id            SERIAL PRIMARY KEY,
  corte_id      INTEGER NOT NULL REFERENCES cortes(id) ON DELETE CASCADE,
  producto_id   INTEGER NOT NULL REFERENCES productos(id),
  color_id      INTEGER NOT NULL REFERENCES colores(id),
  tonalidad     TEXT,
  talla         TEXT NOT NULL CHECK (talla IN ('S','M','L','XL')),
  cantidad      INTEGER NOT NULL DEFAULT 0,
  porcentaje_avance NUMERIC(5,2) NOT NULL DEFAULT 0,
  estado        TEXT NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado IN ('PENDIENTE','EN_PROCESO','LISTO')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Líneas de boleta: 1 fila = 1 seguimiento_fila × 1 operación × 1 operario
CREATE TABLE boleta_lineas (
  id                   SERIAL PRIMARY KEY,
  seguimiento_fila_id  INTEGER NOT NULL REFERENCES seguimiento_filas(id) ON DELETE CASCADE,
  operario_id          INTEGER NOT NULL REFERENCES operarios(id),
  operacion            TEXT NOT NULL,
  tarifa               NUMERIC(8,4) NOT NULL,
  cantidad             INTEGER NOT NULL DEFAULT 0,
  subtotal             NUMERIC(12,4),   -- tarifa × cantidad
  semana_inicio        DATE,            -- lunes de la semana de pago
  confirmado           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Descuentos de boleta (adelantos, préstamos, cafetín, faltas)
CREATE TABLE descuentos_boleta (
  id            SERIAL PRIMARY KEY,
  operario_id   INTEGER NOT NULL REFERENCES operarios(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('ADELANTO','CAFETÍN','PRÉSTAMO','FALTA','TARDANZA','OTRO')),
  monto         NUMERIC(12,2) NOT NULL,
  descripcion   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 7. PROGRAMAS ZURZAM (hilo → tejeduría → tintorería)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE programas_zurzam (
  id                    SERIAL PRIMARY KEY,
  codigo                TEXT NOT NULL UNIQUE,    -- ej: PIQUE-001
  descripcion           TEXT,
  tipo_hilo             TEXT,
  kg_hilo               NUMERIC(10,2),
  tipo_tejido           TEXT,
  cliente_id            INTEGER REFERENCES clientes(id),
  estado                TEXT NOT NULL DEFAULT 'NUEVO'
                          CHECK (estado IN ('NUEVO','EN COMPRA','EN TEJEDURÍA','EN TINTORERÍA','EN PLANTA','CERRADO')),
  -- tejeduría
  kg_tej_enviado        NUMERIC(10,2),
  kg_tej_retornado      NUMERIC(10,2),
  kg_conos_extorno      NUMERIC(10,2),
  -- tintorería
  kg_tint_enviado       NUMERIC(10,2),
  kg_tint_retornado     NUMERIC(10,2),
  rollos_producidos     INTEGER,
  -- costos totales
  costo_total           NUMERIC(14,2),
  costo_kg              NUMERIC(10,4),
  comision_jose         NUMERIC(12,2),
  -- fechas
  fecha_inicio          DATE,
  fecha_cierre          DATE,
  notas                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Detalle por color dentro de un programa
CREATE TABLE programa_detalles (
  id                    SERIAL PRIMARY KEY,
  programa_id           INTEGER NOT NULL REFERENCES programas_zurzam(id) ON DELETE CASCADE,
  color_id              INTEGER NOT NULL REFERENCES colores(id),
  tonalidad             TEXT,
  servicio_tintoreria   TEXT CHECK (servicio_tintoreria IN ('REACTIVO','DIRECTO','PPT','LAVADO','TERMOFIJADO','COMPACTADO EN RAMA')),
  rollos_plan           INTEGER,
  kg_plan               NUMERIC(10,2),
  -- tejeduría
  kg_tej_retornado      NUMERIC(10,2),
  precio_tej_usd        NUMERIC(8,4),
  tipo_cambio_tej       NUMERIC(6,4) DEFAULT 3.50,
  costo_tej             NUMERIC(12,2),
  -- tintorería
  kg_tint_retornado     NUMERIC(10,2),
  precio_tint_usd       NUMERIC(8,4),
  tipo_cambio_tint      NUMERIC(6,4) DEFAULT 3.50,
  costo_tint            NUMERIC(12,2),
  -- hilo (prorrateado)
  costo_hilo            NUMERIC(12,2),
  costo_total           NUMERIC(12,2),
  costo_kg              NUMERIC(10,4),
  notas                 TEXT
);

-- Compras de hilo vinculadas a programas
CREATE TABLE compras_hilo (
  id              SERIAL PRIMARY KEY,
  programa_id     INTEGER REFERENCES programas_zurzam(id) ON DELETE SET NULL,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_hilo       TEXT NOT NULL,
  kg              NUMERIC(10,2) NOT NULL,
  precio_kg_usd   NUMERIC(8,4),
  precio_kg_soles NUMERIC(8,4),
  tipo_cambio     NUMERIC(6,4) DEFAULT 3.50,
  total_soles     NUMERIC(14,2),
  proveedor_id    INTEGER REFERENCES proveedores(id),
  num_factura     TEXT,
  estado_pago     TEXT NOT NULL DEFAULT 'PENDIENTE'
                    CHECK (estado_pago IN ('PENDIENTE','PAGADO','PARCIAL')),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Stock extorno (conos sobrantes de tejeduría)
CREATE TABLE stock_extornos (
  id              SERIAL PRIMARY KEY,
  programa_id     INTEGER REFERENCES programas_zurzam(id) ON DELETE SET NULL,
  tipo_hilo       TEXT NOT NULL,
  kg              NUMERIC(10,2) NOT NULL,
  precio_kg       NUMERIC(8,4),
  valor_total     NUMERIC(12,2),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  notas           TEXT
);

-- ─────────────────────────────────────────────────────────────
-- 8. COBROS DIARIOS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE cobros_diarios (
  id              SERIAL PRIMARY KEY,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  corte_id        INTEGER REFERENCES cortes(id) ON DELETE SET NULL,
  num_factura     TEXT,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
  producto_id     INTEGER NOT NULL REFERENCES productos(id),
  color_id        INTEGER NOT NULL REFERENCES colores(id),
  tonalidad       TEXT,
  -- cantidades
  cant_s          INTEGER NOT NULL DEFAULT 0,
  cant_m          INTEGER NOT NULL DEFAULT 0,
  cant_l          INTEGER NOT NULL DEFAULT 0,
  cant_xl         INTEGER NOT NULL DEFAULT 0,
  total_prendas   INTEGER,            -- calculado: suma cantidades
  -- montos
  precio_unit     NUMERIC(8,4) NOT NULL,
  bruto           NUMERIC(14,2),      -- calculado: precio_unit × total_prendas
  detraccion      NUMERIC(14,2),      -- calculado: bruto × 10%
  disponible      NUMERIC(14,2),      -- calculado: bruto × 90%
  estado          TEXT NOT NULL DEFAULT 'POR COBRAR'
                    CHECK (estado IN ('POR COBRAR','COBRADO','ANULADO')),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 9. MOVIMIENTOS COMPLEMENTOS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE movimientos_complemento (
  id              SERIAL PRIMARY KEY,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo            TEXT NOT NULL CHECK (tipo IN (
                    'INGRESO','DE CORTE','A CORTE','MUESTRA','AJUSTE+','AJUSTE-')),
  complemento_tipo TEXT NOT NULL CHECK (complemento_tipo IN ('CUELLO','PUÑO','PRETINA','CIERRE')),
  complemento_origen TEXT NOT NULL CHECK (complemento_origen IN ('RIB 1x1','RIB 2x1','RECTILÍNEO','DIRECTO')),
  talla           TEXT CHECK (talla IN ('S','M','L','XL')),
  color_id        INTEGER REFERENCES colores(id),
  tonalidad       TEXT,
  cantidad        INTEGER NOT NULL DEFAULT 0,
  precio_unit     NUMERIC(8,4),
  total_soles     NUMERIC(12,2),
  proveedor_id    INTEGER REFERENCES proveedores(id),
  num_factura     TEXT,
  costo_factura   NUMERIC(12,2),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 10. TABLA AUXILIAR PRODUCTO-COLORES (colores habituales por producto)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE producto_colores (
  id          SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  color_id    INTEGER NOT NULL REFERENCES colores(id) ON DELETE CASCADE,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  prop_s      INTEGER,
  prop_m      INTEGER,
  prop_l      INTEGER,
  prop_xl     INTEGER,
  UNIQUE (producto_id, color_id)
);

-- ─────────────────────────────────────────────────────────────
-- 11. ÍNDICES
-- ─────────────────────────────────────────────────────────────

CREATE INDEX idx_cortes_n_corte        ON cortes(n_corte);
CREATE INDEX idx_cortes_fecha          ON cortes(fecha);
CREATE INDEX idx_cortes_cliente        ON cortes(cliente_id);
CREATE INDEX idx_cortes_producto       ON cortes(producto_id);
CREATE INDEX idx_cortes_color          ON cortes(color_id);
CREATE INDEX idx_cortes_estado         ON cortes(estado);

CREATE INDEX idx_mov_tela_fecha        ON movimientos_tela(fecha);
CREATE INDEX idx_mov_tela_color        ON movimientos_tela(color_id);
CREATE INDEX idx_mov_tela_tela         ON movimientos_tela(tela_id);
CREATE INDEX idx_mov_tela_tipo         ON movimientos_tela(tipo);

CREATE INDEX idx_seg_filas_corte       ON seguimiento_filas(corte_id);
CREATE INDEX idx_seg_filas_color       ON seguimiento_filas(color_id);

CREATE INDEX idx_boleta_operario       ON boleta_lineas(operario_id);
CREATE INDEX idx_boleta_semana         ON boleta_lineas(semana_inicio);

CREATE INDEX idx_cobros_fecha          ON cobros_diarios(fecha);
CREATE INDEX idx_cobros_cliente        ON cobros_diarios(cliente_id);
CREATE INDEX idx_cobros_estado         ON cobros_diarios(estado);

-- ─────────────────────────────────────────────────────────────
-- 12. TRIGGER updated_at automático
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cortes_updated_at
  BEFORE UPDATE ON cortes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_seg_filas_updated_at
  BEFORE UPDATE ON seguimiento_filas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
