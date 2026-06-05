-- =============================================================
-- MIGRACIÓN: Tonalidades de colores + producto_colores con props
-- Fuente: seguimiento-prodf CORTES (1).csv — props por corte más reciente
-- Ejecutar una sola vez contra la DB de producción
-- =============================================================

-- ─── 0. Agregar columnas de proporciones a producto_colores ──
ALTER TABLE producto_colores
  ADD COLUMN IF NOT EXISTS prop_s  INTEGER,
  ADD COLUMN IF NOT EXISTS prop_m  INTEGER,
  ADD COLUMN IF NOT EXISTS prop_l  INTEGER,
  ADD COLUMN IF NOT EXISTS prop_xl INTEGER;

-- ─── 1. Nuevos colores ───────────────────────────────────────
INSERT INTO colores (nombre, categoria, prioridad) VALUES
  ('Verde botella', 'OSCURO',  28),
  ('Rosa',          'CLARO',   29),
  ('Palo rosa 1',   'CLARO',   30),
  ('Palo rosa 2',   'CLARO',   31),
  ('Negro 1',       'OSCURO',  32),
  ('Negro 2',       'OSCURO',  33),
  ('Negro 3',       'OSCURO',  34),
  ('Negro 4',       'OSCURO',  35),
  ('Blanco 1',      'PPT',     36),
  ('Blanco 2',      'PPT',     37),
  ('Melange 1',     'MELANGE', 38),
  ('Melange 2',     'MELANGE', 39),
  ('Melange 3',     'MELANGE', 40),
  ('Denim 1',       'CLARO',   41),
  ('Denim 2',       'CLARO',   42),
  ('Cemento 1',     'CLARO',   43),
  ('Cemento 2',     'CLARO',   44),
  ('Cemento 3',     'CLARO',   45),
  ('Rosado 1',      'CLARO',   46),
  ('Rosado 2',      'CLARO',   47),
  ('Rosado 3',      'CLARO',   48),
  ('Pacay 1',       'CLARO',   49),
  ('Pacay 2',       'CLARO',   50)
ON CONFLICT (nombre) DO NOTHING;

-- ─── 2. Poblar producto_colores (pares producto-color) ───────
INSERT INTO producto_colores (producto_id, color_id)
SELECT p.id, c.id
FROM (VALUES
  -- wafle camisero
  ('wafle camisero', 'Negro'),
  ('wafle camisero', 'Blanco'),
  ('wafle camisero', 'Vino'),
  ('wafle camisero', 'Melange'),
  ('wafle camisero', 'Palo rosa 1'),
  ('wafle camisero', 'Palo rosa 2'),
  ('wafle camisero', 'Verde botella'),
  ('wafle camisero', 'Pacay'),
  ('wafle camisero', 'Topo'),
  ('wafle camisero', 'Denim'),
  ('wafle camisero', 'Colegial'),
  ('wafle camisero', 'Azul Marino'),
  -- pique camisero
  ('pique camisero', 'Beige'),
  ('pique camisero', 'Azul Marino'),
  ('pique camisero', 'Vino'),
  ('pique camisero', 'Negro'),
  ('pique camisero', 'Perla'),
  ('pique camisero', 'Blanco 1'),
  ('pique camisero', 'Blanco 2'),
  ('pique camisero', 'Denim 1'),
  ('pique camisero', 'Denim 2'),
  ('pique camisero', 'Colegial'),
  ('pique camisero', 'Pacay'),
  ('pique camisero', 'Rosa'),
  ('pique camisero', 'Melange'),
  ('pique camisero', 'Cemento'),
  -- wafle camisa
  ('wafle camisa', 'Negro'),
  ('wafle camisa', 'Blanco'),
  ('wafle camisa', 'Azul Marino'),
  ('wafle camisa', 'Melange'),
  ('wafle camisa', 'Beige'),
  -- wafle clasico
  ('wafle clasico', 'Azul Marino'),
  ('wafle clasico', 'Melange'),
  ('wafle clasico', 'Verde botella'),
  ('wafle clasico', 'Pacay'),
  ('wafle clasico', 'Cemento'),
  ('wafle clasico', 'Denim'),
  ('wafle clasico', 'Colegial'),
  ('wafle clasico', 'Rosa'),
  ('wafle clasico', 'Negro'),
  ('wafle clasico', 'Blanco'),
  ('wafle clasico', 'Negro 1'),
  ('wafle clasico', 'Negro 2'),
  ('wafle clasico', 'Denim 1'),
  ('wafle clasico', 'Denim 2'),
  ('wafle clasico', 'Melange 1'),
  ('wafle clasico', 'Melange 2'),
  ('wafle clasico', 'Topo'),
  ('wafle clasico', 'Pacay 1'),
  ('wafle clasico', 'Pacay 2'),
  ('wafle clasico', 'Beige'),
  ('wafle clasico', 'Rosado'),
  ('wafle clasico', 'Blanco 1'),
  ('wafle clasico', 'Blanco 2'),
  -- wafle manga larga
  ('wafle manga larga', 'Negro 1'),
  ('wafle manga larga', 'Negro 2'),
  ('wafle manga larga', 'Pacay'),
  ('wafle manga larga', 'Azul Marino'),
  ('wafle manga larga', 'Blanco'),
  ('wafle manga larga', 'Rosa'),
  ('wafle manga larga', 'Melange'),
  ('wafle manga larga', 'Colegial'),
  -- jersey manga corta
  ('jersey manga corta', 'Rosa'),
  ('jersey manga corta', 'Verde botella'),
  ('jersey manga corta', 'Pacay'),
  ('jersey manga corta', 'Cemento'),
  ('jersey manga corta', 'Beige'),
  ('jersey manga corta', 'Denim'),
  ('jersey manga corta', 'Cemento 1'),
  ('jersey manga corta', 'Cemento 2'),
  ('jersey manga corta', 'Cemento 3'),
  ('jersey manga corta', 'Rosado 1'),
  ('jersey manga corta', 'Rosado 2'),
  ('jersey manga corta', 'Rosado 3'),
  ('jersey manga corta', 'Negro 1'),
  ('jersey manga corta', 'Negro 2'),
  ('jersey manga corta', 'Negro 3'),
  ('jersey manga corta', 'Negro 4'),
  -- polera neru
  ('polera neru', 'Melange 1'),
  ('polera neru', 'Melange 2'),
  ('polera neru', 'Melange 3'),
  ('polera neru', 'Blanco 1'),
  ('polera neru', 'Blanco 2')
) AS pc(producto_nombre, color_nombre)
JOIN productos p ON LOWER(p.nombre) = LOWER(pc.producto_nombre)
JOIN colores c ON LOWER(c.nombre) = LOWER(pc.color_nombre)
ON CONFLICT (producto_id, color_id) DO NOTHING;

-- ─── 3. Proporciones por combinación producto+color ──────────
-- Fuente: corte más reciente observado en el historial de cortes.
-- Patrón de UPDATE: usa JOIN a productos+colores para evitar hardcodear IDs.

-- ── wafle camisero ──────────────────────────────────────────
-- Negro (corte 1, 2:4:4:2)
UPDATE producto_colores pc SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle camisero' AND LOWER(c.nombre)='negro';

-- Blanco (corte 53, más reciente 4:6:6:4)
UPDATE producto_colores pc SET prop_s=4, prop_m=6, prop_l=6, prop_xl=4
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle camisero' AND LOWER(c.nombre)='blanco';

-- Vino (corte 1, solo dato: 2:4:4:2)
UPDATE producto_colores pc SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle camisero' AND LOWER(c.nombre)='vino';

-- Melange (corte 53, 4:6:6:4)
UPDATE producto_colores pc SET prop_s=4, prop_m=6, prop_l=6, prop_xl=4
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle camisero' AND LOWER(c.nombre)='melange';

-- Palo rosa 1 (corte 1, 2:4:4:2)
UPDATE producto_colores pc SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle camisero' AND LOWER(c.nombre)='palo rosa 1';

-- Palo rosa 2 (corte 1, 2:4:4:2)
UPDATE producto_colores pc SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle camisero' AND LOWER(c.nombre)='palo rosa 2';

-- Verde botella, Pacay, Topo, Denim, Colegial, Azul Marino (corte 53, 4:6:6:4)
UPDATE producto_colores pc SET prop_s=4, prop_m=6, prop_l=6, prop_xl=4
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle camisero'
AND LOWER(c.nombre) IN ('verde botella','pacay','topo','denim','colegial','azul marino');

-- ── pique camisero ───────────────────────────────────────────
-- Beige, Vino, Perla (corte 7, 2:4:4:2 — solo estos colores aparecen en corte 7)
UPDATE producto_colores pc SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='pique camisero'
AND LOWER(c.nombre) IN ('beige','vino','perla');

-- Azul Marino, Negro, Blanco 1, Blanco 2, Denim 1, Denim 2, Colegial, Pacay, Rosa, Melange, Cemento (corte 46, 4:4:4:8)
UPDATE producto_colores pc SET prop_s=4, prop_m=4, prop_l=4, prop_xl=8
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='pique camisero'
AND LOWER(c.nombre) IN ('azul marino','negro','blanco 1','blanco 2','denim 1','denim 2','colegial','pacay','rosa','melange','cemento');

-- ── wafle camisa ─────────────────────────────────────────────
-- Todos los colores (corte 47, 1:2:2:1)
UPDATE producto_colores pc SET prop_s=1, prop_m=2, prop_l=2, prop_xl=1
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle camisa'
AND LOWER(c.nombre) IN ('negro','blanco','azul marino','melange','beige');

-- ── wafle clasico ────────────────────────────────────────────
-- Grupo 2:4:4:2 (cortes más recientes 56/57/50)
UPDATE producto_colores pc SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle clasico'
AND LOWER(c.nombre) IN (
  'azul marino','negro','melange','verde botella','cemento',
  'negro 1','negro 2','melange 1','melange 2','rosado','blanco 1','blanco 2'
);

-- Grupo 4:6:6:4 (cortes 49/55)
UPDATE producto_colores pc SET prop_s=4, prop_m=6, prop_l=6, prop_xl=4
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle clasico'
AND LOWER(c.nombre) IN (
  'pacay','denim','colegial','rosa','blanco',
  'denim 1','denim 2','topo','pacay 1','pacay 2','beige'
);

-- ── wafle manga larga ────────────────────────────────────────
-- Todos los colores (corte 51, 3:6:6:0 — sin XL)
UPDATE producto_colores pc SET prop_s=3, prop_m=6, prop_l=6, prop_xl=0
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='wafle manga larga'
AND LOWER(c.nombre) IN ('negro 1','negro 2','pacay','azul marino','blanco','rosa','melange','colegial');

-- ── jersey manga corta ───────────────────────────────────────
-- Colores base (corte 45, 2:4:4:2)
UPDATE producto_colores pc SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='jersey manga corta'
AND LOWER(c.nombre) IN ('rosa','verde botella','pacay','cemento','beige','denim');

-- Colores numerados (corte 54, 0:4:0:4 — solo tallas M y XL)
UPDATE producto_colores pc SET prop_s=0, prop_m=4, prop_l=0, prop_xl=4
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='jersey manga corta'
AND LOWER(c.nombre) IN (
  'cemento 1','cemento 2','cemento 3',
  'rosado 1','rosado 2','rosado 3',
  'negro 1','negro 2','negro 3','negro 4'
);

-- ── polera neru ──────────────────────────────────────────────
-- Todos los colores (corte 52, 2:4:2:0 — sin XL, L=2 no L=4)
UPDATE producto_colores pc SET prop_s=2, prop_m=4, prop_l=2, prop_xl=0
FROM productos p, colores c WHERE pc.producto_id=p.id AND pc.color_id=c.id
AND LOWER(p.nombre)='polera neru'
AND LOWER(c.nombre) IN ('melange 1','melange 2','melange 3','blanco 1','blanco 2');

-- ─── 4. Corregir prop de polera neru a nivel producto ────────
-- El valor anterior (4,6,4,0) era incorrecto — el CSV muestra 2,4,2,0
UPDATE productos SET prop_s=2, prop_m=4, prop_l=2, prop_xl=0
WHERE LOWER(nombre) = 'polera neru';
