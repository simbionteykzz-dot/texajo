-- ═══════════════════════════════════════════════════════
--  SEED DATOS — Texajo
--  Ejecutar en Supabase SQL Editor
--  Usa INSERT ... ON CONFLICT DO NOTHING para idempotencia
-- ═══════════════════════════════════════════════════════

-- ─── 1. TELAS ───────────────────────────────────────────
INSERT INTO telas (id, nombre, composicion, kg_por_rollo, notas) VALUES
  (gen_random_uuid(), 'Jersey cotton',       '100% algodón',       20, ''),
  (gen_random_uuid(), 'Pique 30/1',          '100% algodón',       20, ''),
  (gen_random_uuid(), 'Wafle 30/1',          '100% algodón',       20, ''),
  (gen_random_uuid(), 'French terry 24/1',   '100% algodón',       20, ''),
  (gen_random_uuid(), 'Rib 1x1',             '100% algodón',       20, ''),
  (gen_random_uuid(), 'Rib 2x1 lycrado',     '95% algodón 5% lycra', 20, 'Más caro por lycra'),
  (gen_random_uuid(), 'Interlock 50/1 Pima', '100% algodón pima',  20, ''),
  (gen_random_uuid(), 'Jersey 20/1',         '100% algodón',       20, ''),
  (gen_random_uuid(), 'Jersey full lycra',   'algodón/lycra',      20, ''),
  (gen_random_uuid(), 'Pique pima',          '100% algodón pima',  20, ''),
  (gen_random_uuid(), 'Wafle pima',          '100% algodón pima',  20, ''),
  (gen_random_uuid(), 'French terry pima',   '100% algodón pima',  20, ''),
  (gen_random_uuid(), 'Jersey pc',           'poliéster/algodón',  20, '')
ON CONFLICT DO NOTHING;

-- ─── 2. PRECIOS TEJEDURÍA ───────────────────────────────
INSERT INTO precios_tejeduria (id, tipo_tejido, precio_kg) VALUES
  (gen_random_uuid(), 'Jersey cotton',       0.50),
  (gen_random_uuid(), 'Pique 30/1',          0.50),
  (gen_random_uuid(), 'Wafle 30/1',          0.45),
  (gen_random_uuid(), 'French terry 30/1',   0.40),
  (gen_random_uuid(), 'Rib 1x1',             0.60),
  (gen_random_uuid(), 'Rib 2x1 lycrado',     0.80),
  (gen_random_uuid(), 'Interlock 50/1 Pima', 1.20),
  (gen_random_uuid(), 'Jersey 20/1',         0.45),
  (gen_random_uuid(), 'Full lycra',          0.70),
  (gen_random_uuid(), 'Pique pima',          0.70),
  (gen_random_uuid(), 'Wafle pima',          0.70),
  (gen_random_uuid(), 'French terry pima',   0.70),
  (gen_random_uuid(), 'Jersey pc',           0.70)
ON CONFLICT DO NOTHING;

-- ─── 3. PRECIOS TINTORERÍA ──────────────────────────────
-- Formato: (tipo_servicio, tipo_tela, precio_kg, moneda, notas)
INSERT INTO precios_tintoreria (id, tipo_servicio, tipo_tela, precio_kg, moneda, notas) VALUES
  -- REACTIVO
  (gen_random_uuid(), 'REACTIVO', 'Jersey cotton',       4.00, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Pique 30/1',          2.70, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Wafle 30/1',          3.00, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'French terry 24/1',   3.50, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Rib 1x1',             3.00, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Rib 2x1 lycrado',     3.20, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Interlock 50/1 Pima', 4.00, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Jersey 20/1',         3.00, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Jersey full lycra',   3.05, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Pique pima',          3.50, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Wafle pima',          3.30, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'French terry pima',   3.80, 'PEN', ''),
  (gen_random_uuid(), 'REACTIVO', 'Jersey pc',           3.00, 'PEN', ''),
  -- DIRECTO
  (gen_random_uuid(), 'DIRECTO',  'Jersey cotton',       1.90, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Pique 30/1',          1.95, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Wafle 30/1',          1.90, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'French terry 24/1',   2.30, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Rib 1x1',             1.90, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Rib 2x1 lycrado',     2.10, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Interlock 50/1 Pima', 2.50, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Jersey 20/1',         1.90, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Jersey full lycra',   2.30, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Pique pima',          2.30, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Wafle pima',          2.10, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'French terry pima',   2.50, 'PEN', ''),
  (gen_random_uuid(), 'DIRECTO',  'Jersey pc',           3.00, 'PEN', ''),
  -- PPT
  (gen_random_uuid(), 'PPT',      'Jersey cotton',       1.20, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Pique 30/1',          1.10, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Wafle 30/1',          1.20, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'French terry 24/1',   1.50, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Rib 1x1',             1.20, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Rib 2x1 lycrado',     1.30, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Interlock 50/1 Pima', 1.80, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Jersey 20/1',         1.20, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Jersey full lycra',   1.50, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Pique pima',          1.50, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Wafle pima',          1.30, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'French terry pima',   1.80, 'PEN', ''),
  (gen_random_uuid(), 'PPT',      'Jersey pc',           3.00, 'PEN', ''),
  -- LAVADO
  (gen_random_uuid(), 'LAVADO',   'Jersey cotton',       1.00, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Pique 30/1',          1.10, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Wafle 30/1',          1.00, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'French terry 24/1',   1.20, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Rib 1x1',             1.00, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Rib 2x1 lycrado',     1.10, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Interlock 50/1 Pima', 1.50, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Jersey 20/1',         1.00, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Jersey full lycra',   1.20, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Pique pima',          1.20, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Wafle pima',          1.10, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'French terry pima',   1.50, 'PEN', ''),
  (gen_random_uuid(), 'LAVADO',   'Jersey pc',           3.00, 'PEN', ''),
  -- TERMOFIJADO (solo los que tienen valor en la imagen)
  (gen_random_uuid(), 'TERMOFIJADO', 'Rib 2x1 lycrado',   1.50, 'PEN', ''),
  (gen_random_uuid(), 'TERMOFIJADO', 'Jersey full lycra',  1.50, 'PEN', ''),
  -- COMPACTADO EN RAMA
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Jersey cotton',       0.80, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Pique 30/1',          0.85, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Wafle 30/1',          0.80, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'French terry 24/1',   0.90, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Rib 1x1',             0.80, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Rib 2x1 lycrado',     1.00, 'PEN', ''),  -- valor interpolado visible
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Jersey 20/1',         0.80, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Jersey full lycra',   0.90, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Pique pima',          1.00, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Wafle pima',          0.95, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'French terry pima',   1.05, 'PEN', ''),
  (gen_random_uuid(), 'COMPACTADO_EN_RAMA', 'Jersey pc',           3.00, 'PEN', '')
ON CONFLICT DO NOTHING;

-- ─── 4. PRECIOS COMPLEMENTOS ────────────────────────────
-- Limpiamos primero para evitar duplicados (seed idempotente)
DELETE FROM precios_complementos WHERE clave IN (
  'CUELLO_RECTILÍNEO','PUÑO_RECTILÍNEO',
  'CUELLO_RIB 1x1','CUELLO_RIB 2x1',
  'PUÑO_RIB 2x1','PRETINA_RIB 2x1','CIERRE_DIRECTO'
);

INSERT INTO precios_complementos (id, clave, tipo, origen, talla, precio) VALUES
  -- CUELLO RECTILÍNEO (Solo M y L. Para camiseros)
  (gen_random_uuid(), 'CUELLO_RECTILÍNEO', 'CUELLO',  'RECTILÍNEO', 'S',  0.00),
  (gen_random_uuid(), 'CUELLO_RECTILÍNEO', 'CUELLO',  'RECTILÍNEO', 'M',  0.70),
  (gen_random_uuid(), 'CUELLO_RECTILÍNEO', 'CUELLO',  'RECTILÍNEO', 'L',  0.75),
  (gen_random_uuid(), 'CUELLO_RECTILÍNEO', 'CUELLO',  'RECTILÍNEO', 'XL', 0.00),
  -- PUÑO RECTILÍNEO (Solo M y L. Cada camisero lleva 2)
  (gen_random_uuid(), 'PUÑO_RECTILÍNEO',   'PUÑO',    'RECTILÍNEO', 'S',  0.00),
  (gen_random_uuid(), 'PUÑO_RECTILÍNEO',   'PUÑO',    'RECTILÍNEO', 'M',  0.30),
  (gen_random_uuid(), 'PUÑO_RECTILÍNEO',   'PUÑO',    'RECTILÍNEO', 'L',  0.35),
  (gen_random_uuid(), 'PUÑO_RECTILÍNEO',   'PUÑO',    'RECTILÍNEO', 'XL', 0.00),
  -- CUELLO RIB 1x1 (Cortado de rib 1x1. Para polos jersey)
  (gen_random_uuid(), 'CUELLO_RIB 1x1',   'CUELLO',  'RIB 1x1',   'S',  0.40),
  (gen_random_uuid(), 'CUELLO_RIB 1x1',   'CUELLO',  'RIB 1x1',   'M',  0.45),
  (gen_random_uuid(), 'CUELLO_RIB 1x1',   'CUELLO',  'RIB 1x1',   'L',  0.50),
  (gen_random_uuid(), 'CUELLO_RIB 1x1',   'CUELLO',  'RIB 1x1',   'XL', 0.55),
  -- CUELLO RIB 2x1 (Cortado de rib 2x1. Para polera redondo / top)
  (gen_random_uuid(), 'CUELLO_RIB 2x1',   'CUELLO',  'RIB 2x1',   'S',  0.40),
  (gen_random_uuid(), 'CUELLO_RIB 2x1',   'CUELLO',  'RIB 2x1',   'M',  0.40),
  (gen_random_uuid(), 'CUELLO_RIB 2x1',   'CUELLO',  'RIB 2x1',   'L',  0.40),
  (gen_random_uuid(), 'CUELLO_RIB 2x1',   'CUELLO',  'RIB 2x1',   'XL', 0.40),
  -- PUÑO RIB 2x1 (Cortado de rib 2x1. Para poleras genérico)
  (gen_random_uuid(), 'PUÑO_RIB 2x1',     'PUÑO',    'RIB 2x1',   'S',  0.30),
  (gen_random_uuid(), 'PUÑO_RIB 2x1',     'PUÑO',    'RIB 2x1',   'M',  0.30),
  (gen_random_uuid(), 'PUÑO_RIB 2x1',     'PUÑO',    'RIB 2x1',   'L',  0.30),
  (gen_random_uuid(), 'PUÑO_RIB 2x1',     'PUÑO',    'RIB 2x1',   'XL', 0.30),
  -- PRETINA RIB 2x1 (Específica por producto destino)
  (gen_random_uuid(), 'PRETINA_RIB 2x1',  'PRETINA', 'RIB 2x1',   'S',  0.60),
  (gen_random_uuid(), 'PRETINA_RIB 2x1',  'PRETINA', 'RIB 2x1',   'M',  0.60),
  (gen_random_uuid(), 'PRETINA_RIB 2x1',  'PRETINA', 'RIB 2x1',   'L',  0.60),
  (gen_random_uuid(), 'PRETINA_RIB 2x1',  'PRETINA', 'RIB 2x1',   'XL', 0.60),
  -- CIERRE DIRECTO (Tamaños: S=20cm, M=25cm, L=30cm, XL=30cm)
  (gen_random_uuid(), 'CIERRE_DIRECTO',   'CIERRE',  'DIRECTO',   'S',  0.45),
  (gen_random_uuid(), 'CIERRE_DIRECTO',   'CIERRE',  'DIRECTO',   'M',  0.45),
  (gen_random_uuid(), 'CIERRE_DIRECTO',   'CIERRE',  'DIRECTO',   'L',  0.45),
  (gen_random_uuid(), 'CIERRE_DIRECTO',   'CIERRE',  'DIRECTO',   'XL', 0.45);

-- ─── 5. PRODUCTOS ───────────────────────────────────────
-- receta_complementos como jsonb
INSERT INTO productos (id, nombre, marca, costo_mo_total, precio_servicio, tela_base, limite_consumo, limite_rendimiento, prop_s, prop_m, prop_l, prop_xl, receta_complementos, notas) VALUES
  (gen_random_uuid(), 'Polo clásico jersey',      NULL, 0, 0, 'Jersey cotton',     NULL, 6.0, NULL, NULL, NULL, NULL,
   '[{"tipoComplemento":"CUELLO","origen":"RIB 1x1","cantidad":1,"notas":"Cuello rib 1x1 cortado"}]', ''),

  (gen_random_uuid(), 'Polo clásico wafle',       NULL, 0, 0, 'Wafle 30/1',        NULL, 5.5, NULL, NULL, NULL, NULL,
   '[]', ''),

  (gen_random_uuid(), 'Polo manga larga jersey',  NULL, 0, 0, 'Jersey cotton',     NULL, 5.0, NULL, NULL, NULL, NULL,
   '[{"tipoComplemento":"CUELLO","origen":"RIB 1x1","cantidad":1,"notas":"Cuello rib 1x1 cortado"}]', ''),

  (gen_random_uuid(), 'Polo manga larga wafle',   NULL, 0, 0, 'Wafle 30/1',        NULL, 4.5, NULL, NULL, NULL, NULL,
   '[]', ''),

  (gen_random_uuid(), 'Camisero pique',           NULL, 0, 0, 'Pique 30/1',        NULL, 5.0, NULL, NULL, NULL, NULL,
   '[{"tipoComplemento":"CUELLO","origen":"RECTILÍNEO","cantidad":1,"notas":"1 cuello + 2 puños rectilíneos"},{"tipoComplemento":"PUÑO","origen":"RECTILÍNEO","cantidad":2,"notas":""}]', ''),

  (gen_random_uuid(), 'Camisero wafle',           NULL, 0, 0, 'Wafle 30/1',        NULL, 4.5, NULL, NULL, NULL, NULL,
   '[{"tipoComplemento":"CUELLO","origen":"RECTILÍNEO","cantidad":1,"notas":"1 cuello + 2 puños rectilíneos"},{"tipoComplemento":"PUÑO","origen":"RECTILÍNEO","cantidad":2,"notas":""}]', ''),

  (gen_random_uuid(), 'Camisa wafle',             NULL, 0, 0, 'Wafle 30/1',        NULL, 4.0, NULL, NULL, NULL, NULL,
   '[]', ''),

  (gen_random_uuid(), 'Top cero rib mujer',       NULL, 0, 0, 'Jersey cotton',     NULL, 7.0, NULL, NULL, NULL, NULL,
   '[{"tipoComplemento":"CUELLO","origen":"RIB 2x1","cantidad":1,"notas":"Cuello rib 2x1"}]', ''),

  (gen_random_uuid(), 'Baby ty mc',               NULL, 0, 0, 'Jersey cotton',     NULL, 6.5, NULL, NULL, NULL, NULL,
   '[]', ''),

  (gen_random_uuid(), 'Polera neru',              NULL, 0, 0, 'French terry 24/1', NULL, 4.0, NULL, NULL, NULL, NULL,
   '[{"tipoComplemento":"PUÑO","origen":"RIB 2x1","cantidad":2,"notas":"2 puños + 1 pretina rib 2x1 + 1 cierre 20cm"},{"tipoComplemento":"PRETINA","origen":"RIB 2x1","cantidad":1,"notas":""},{"tipoComplemento":"CIERRE","origen":"DIRECTO","cantidad":1,"notas":""}]', ''),

  (gen_random_uuid(), 'Polera cuello redondo',    NULL, 0, 0, 'French terry 24/1', NULL, 4.5, NULL, NULL, NULL, NULL,
   '[{"tipoComplemento":"CUELLO","origen":"RIB 2x1","cantidad":1,"notas":"1 cuello + 2 puños + 1 pretina rib 2x1"},{"tipoComplemento":"PUÑO","origen":"RIB 2x1","cantidad":2,"notas":""},{"tipoComplemento":"PRETINA","origen":"RIB 2x1","cantidad":1,"notas":""}]', ''),

  (gen_random_uuid(), 'Pique cuello chino',       NULL, 0, 0, 'Pique 30/1',        NULL, 5.0, NULL, NULL, NULL, NULL,
   '[{"tipoComplemento":"CUELLO","origen":"RIB 1x1","cantidad":1,"notas":"Cuello rib 1x1"}]', '')
ON CONFLICT DO NOTHING;

-- ─── 6. PRECIOS POR TELA + CATEGORÍA DE COLOR ──────────
-- Primero obtenemos los IDs de las telas por nombre y los usamos.
-- Como no podemos hacer subquery con gen_random_uuid() + ON CONFLICT fácil,
-- usamos DO $$ para resolverlo dinámicamente.
DO $$
DECLARE
  t_id text;
BEGIN
  -- jersey 30/1
  SELECT id INTO t_id FROM telas WHERE nombre ILIKE 'Jersey cotton' OR nombre ILIKE 'jersey 30/1' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO precios_telas (id, tela_id, categoria_color, precio_kg) VALUES
      (gen_random_uuid(), t_id, 'OSCURO',  24.00),
      (gen_random_uuid(), t_id, 'CLARO',   21.00),
      (gen_random_uuid(), t_id, 'MELANGE', 18.00),
      (gen_random_uuid(), t_id, 'PPT',     18.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- pique 30/1
  SELECT id INTO t_id FROM telas WHERE nombre ILIKE 'Pique 30/1' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO precios_telas (id, tela_id, categoria_color, precio_kg) VALUES
      (gen_random_uuid(), t_id, 'OSCURO',  24.00),
      (gen_random_uuid(), t_id, 'CLARO',   21.00),
      (gen_random_uuid(), t_id, 'MELANGE', 18.00),
      (gen_random_uuid(), t_id, 'PPT',     18.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- wafle 30/1
  SELECT id INTO t_id FROM telas WHERE nombre ILIKE 'Wafle 30/1' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO precios_telas (id, tela_id, categoria_color, precio_kg) VALUES
      (gen_random_uuid(), t_id, 'OSCURO',  26.00),
      (gen_random_uuid(), t_id, 'CLARO',   22.50),
      (gen_random_uuid(), t_id, 'MELANGE', 19.00),
      (gen_random_uuid(), t_id, 'PPT',     19.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- french terry 24/1
  SELECT id INTO t_id FROM telas WHERE nombre ILIKE 'French terry 24/1' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO precios_telas (id, tela_id, categoria_color, precio_kg) VALUES
      (gen_random_uuid(), t_id, 'OSCURO',  24.00),
      (gen_random_uuid(), t_id, 'CLARO',   21.00),
      (gen_random_uuid(), t_id, 'MELANGE', 18.00),
      (gen_random_uuid(), t_id, 'PPT',     18.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- rib 1x1
  SELECT id INTO t_id FROM telas WHERE nombre ILIKE 'Rib 1x1' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO precios_telas (id, tela_id, categoria_color, precio_kg) VALUES
      (gen_random_uuid(), t_id, 'OSCURO',  24.00),
      (gen_random_uuid(), t_id, 'CLARO',   21.00),
      (gen_random_uuid(), t_id, 'MELANGE', 18.00),
      (gen_random_uuid(), t_id, 'PPT',     18.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- rib 2x1 lycrado
  SELECT id INTO t_id FROM telas WHERE nombre ILIKE 'Rib 2x1 lycrado' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO precios_telas (id, tela_id, categoria_color, precio_kg) VALUES
      (gen_random_uuid(), t_id, 'OSCURO',  24.00),
      (gen_random_uuid(), t_id, 'CLARO',   21.00),
      (gen_random_uuid(), t_id, 'MELANGE', 18.00),
      (gen_random_uuid(), t_id, 'PPT',     18.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- interlock 50/1 pima
  SELECT id INTO t_id FROM telas WHERE nombre ILIKE 'Interlock 50/1 Pima' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO precios_telas (id, tela_id, categoria_color, precio_kg) VALUES
      (gen_random_uuid(), t_id, 'OSCURO',  35.00),
      (gen_random_uuid(), t_id, 'CLARO',   35.00),
      (gen_random_uuid(), t_id, 'MELANGE', 36.00),
      (gen_random_uuid(), t_id, 'PPT',     38.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- jersey full lycra 30/1
  SELECT id INTO t_id FROM telas WHERE nombre ILIKE 'Jersey full lycra%' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO precios_telas (id, tela_id, categoria_color, precio_kg) VALUES
      (gen_random_uuid(), t_id, 'OSCURO',  26.00),
      (gen_random_uuid(), t_id, 'CLARO',   22.50),
      (gen_random_uuid(), t_id, 'MELANGE', 19.00),
      (gen_random_uuid(), t_id, 'PPT',     19.00)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ─── 7. PROVEEDORES ─────────────────────────────────────
INSERT INTO proveedores (id, nombre, ruc, contacto, tipo) VALUES
  (gen_random_uuid(), 'PROGRESO',             '20123456789', 'Juan Pérez',   'TELA'),
  (gen_random_uuid(), 'NORTH TEXTIL',         '20987654321', 'María Soto',   'TELA'),
  (gen_random_uuid(), 'YADAH',                '20111222333', 'Carlos Rojas', 'COMPLEMENTO'),
  (gen_random_uuid(), 'TECNOLOGIA Y TINTURA', '20444555666', '',             'SERVICIO')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════
--  FIN DEL SCRIPT
-- ═══════════════════════════════════════════════════════
