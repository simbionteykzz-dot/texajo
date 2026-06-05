-- =============================================================
-- MIGRACIÓN: Tonalidades de colores + producto_colores
-- Fuente: historial de cortes (props.xlsx)
-- Ejecutar una sola vez contra la DB de producción
-- =============================================================

-- ─── 1. Nuevos colores ───────────────────────────────────────
-- Base faltantes: Verde botella (DB tenía "Botella"), Rosa (distinto de "Rosado")
-- Tonalidades numeradas: Negro 1-4, Blanco 1-2, Melange 1-3,
--   Denim 1-2, Cemento 1-3, Rosado 1-3, Pacay 1-2, Palo rosa 1-2
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

-- ─── 2. Poblar producto_colores ──────────────────────────────
-- Mapa de colores válidos por producto derivado del historial de cortes.
-- JOIN usa LOWER() para tolerar diferencias de mayúsculas.
INSERT INTO producto_colores (producto_id, color_id)
SELECT p.id, c.id
FROM (VALUES
  -- wafle camisero (12 colores)
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
  -- pique camisero (14 colores)
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
  -- wafle camisa (5 colores)
  ('wafle camisa', 'Negro'),
  ('wafle camisa', 'Blanco'),
  ('wafle camisa', 'Azul Marino'),
  ('wafle camisa', 'Melange'),
  ('wafle camisa', 'Beige'),
  -- wafle clasico (23 colores)
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
  -- wafle manga larga (8 colores)
  ('wafle manga larga', 'Negro 1'),
  ('wafle manga larga', 'Negro 2'),
  ('wafle manga larga', 'Pacay'),
  ('wafle manga larga', 'Azul Marino'),
  ('wafle manga larga', 'Blanco'),
  ('wafle manga larga', 'Rosa'),
  ('wafle manga larga', 'Melange'),
  ('wafle manga larga', 'Colegial'),
  -- jersey manga corta (16 colores)
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
  -- polera neru (5 colores)
  ('polera neru', 'Melange 1'),
  ('polera neru', 'Melange 2'),
  ('polera neru', 'Melange 3'),
  ('polera neru', 'Blanco 1'),
  ('polera neru', 'Blanco 2')
) AS pc(producto_nombre, color_nombre)
JOIN productos p ON LOWER(p.nombre) = LOWER(pc.producto_nombre)
JOIN colores c ON LOWER(c.nombre) = LOWER(pc.color_nombre)
ON CONFLICT (producto_id, color_id) DO NOTHING;
