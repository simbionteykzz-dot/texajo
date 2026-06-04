-- =============================================================
-- TEXAJO — Seed de datos iniciales
-- Ejecutar DESPUÉS de supabase_schema.sql
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- CONFIG
-- ─────────────────────────────────────────────────────────────
INSERT INTO config (clave, valor, descripcion) VALUES
  ('detraccion',          '0.10',  'Porcentaje de detracción obligatoria (Perú)'),
  ('igv',                 '0.18',  'IGV — solo si emite factura'),
  ('incluir_igv',         'NO',    'Incluir IGV en precio sugerido'),
  ('margen_objetivo',     '0.40',  'Margen sobre costo MO'),
  ('kg_por_rollo',        '20',    'KG promedio por rollo (default global)'),
  ('umbral_critico',      '5',     'Stock < N rollos = crítico (rojo)'),
  ('umbral_bajo',         '15',    'Stock < N rollos = bajo (amarillo)'),
  ('merma_estandar',      '0.15',  'Merma estándar esperada en cortes'),
  ('descuento_planilla',  '0.01',  'Descuento planilla obligatorio sobre bruto'),
  ('tc_default',          '3.50',  'Tipo de cambio USD→PEN por defecto'),
  ('comision_jose_kg',    '0.30',  'Comisión José por kg de tela producida');

-- ─────────────────────────────────────────────────────────────
-- CLIENTES
-- ─────────────────────────────────────────────────────────────
INSERT INTO clientes (nombre, notas) VALUES
  ('OverShark', 'Cliente principal'),
  ('Bravos',    'Cliente principal');

-- ─────────────────────────────────────────────────────────────
-- PROVEEDORES
-- ─────────────────────────────────────────────────────────────
INSERT INTO proveedores (nombre, tipo, ruc, contacto, notas) VALUES
  ('COTTON MIX',           'HILO',         '20111111111', 'Carlos Pérez',   'Policotton 30/1, 20/1'),
  ('FARIDE',               'HILO',         '20222222222', 'Ana López',       'Pima, algodón'),
  ('Tejeduría Andina',     'TEJEDURÍA',    '20333333333', 'Roberto Sotelo',  'Jersey, pique, wafle'),
  ('Tejedos del Norte',    'TEJEDURÍA',    '20444444444', NULL,              'French terry, rib'),
  ('Tintorería Inca Color','TINTORERÍA',   '20555555555', 'María Vargas',    'Reactivo, directo, lavado'),
  ('TermoTeñidos SAC',     'TINTORERÍA',   '20666666666', NULL,              'Termofijado, compactado'),
  ('PROGRESO',             'TELA',         '20123456789', 'Juan Pérez',      'Telas jersey/wafle — tel: 987654321'),
  ('NORTH TEXTIL',         'TELA',         '20987654321', 'María Soto',      'Pique y french terry — email: ventas@hilima.pe'),
  ('YADAH',                'COMPLEMENTO',  '20111222333', 'Carlos Rojas',    'Cuellos y puños camiseros — tel: 999888777'),
  ('TECNOLOGIA Y TINTURA', 'COMPLEMENTO',  '20444555666', NULL,              'Rib 1x1 y 2x1');

-- ─────────────────────────────────────────────────────────────
-- COLORES (27 colores base canónicos — Doc 1 con tonalidades absorbidas)
-- Negro 1/Negro 2 → Negro (tonalidad "1"/"2" en cortes)
-- Palo Rosa / P. Rosa → P. Rosa (único nombre canónico)
-- V. Pacay registrado como color propio
-- ─────────────────────────────────────────────────────────────
INSERT INTO colores (nombre, categoria, prioridad) VALUES
  ('Negro',         'OSCURO',  1),
  ('Perla',         'PPT',     2),
  ('Blanco',        'PPT',     3),
  ('Azul',          'OSCURO',  4),
  ('Beige',         'CLARO',   5),
  ('Melange',       'MELANGE', 6),
  ('Botella',       'OSCURO',  7),
  ('Pacay',         'CLARO',   8),
  ('V. Pacay',      'CLARO',   9),
  ('Cemento',       'CLARO',   10),
  ('Camote',        'CLARO',   11),
  ('Denim',         'CLARO',   12),
  ('Marrón',        'OSCURO',  13),
  ('Topo',          'CLARO',   14),
  ('Vino',          'OSCURO',  15),
  ('P. Rosa',       'CLARO',   16),
  ('Plomo',         'OSCURO',  17),
  ('Azul Marino',   'OSCURO',  18),
  ('Verde Hoja',    'OSCURO',  19),
  ('Rosado',        'CLARO',   20),
  ('Cemento/Hoja',  'CLARO',   21),
  ('Colegial',      'OSCURO',  22),
  ('Hoja',          'OSCURO',  23),
  ('Acero',         'CLARO',   24),
  ('Marino',        'OSCURO',  25),
  ('Pumice',        'CLARO',   26),
  ('Vino Tinto',    'OSCURO',  27);

-- ─────────────────────────────────────────────────────────────
-- TELAS
-- ─────────────────────────────────────────────────────────────
INSERT INTO telas (nombre, composicion, kg_por_rollo) VALUES
  ('jersey 30/1',          'Policotton 60% algodón 40% poly',              20),
  ('pique 30/1',           'Policotton',                                   20),
  ('wafle 30/1',           'Policotton',                                   20),
  ('french terry 24/1',    'Policotton — para poleras',                    20),
  ('rib 1x1',              'Algodón sin lycra — para cuello redondo',       20),
  ('rib 2x1 lycrado',      'Con lycra — para tops mujer',                  20),
  ('jersey full lycra 30/1','65% poliéster 31% cotton 4% spandex',        20),
  ('interlock 50/1 pima',  'Algodón pima 100%',                            20);

-- ─────────────────────────────────────────────────────────────
-- PRODUCTOS (18 — Doc 4 como canónico para costo_mo)
-- ─────────────────────────────────────────────────────────────
-- Referenciamos telas por nombre para mayor claridad

INSERT INTO productos (
  nombre, tela_id,
  costo_mo, precio_venta, margen_objetivo,
  limite_consumo, limite_rendimiento,
  cuello_origen, cuellos_por_prenda,
  puno_origen, punos_por_prenda,
  pretina_origen, pretinas_por_prenda,
  cierre_origen, cierres_por_prenda
)
SELECT p.nombre,
       t.id,
       p.costo_mo, p.precio_venta, 0.40,
       p.limite_consumo, p.limite_rendimiento,
       p.cuello_origen, p.cuellos_por_prenda,
       p.puno_origen, p.punos_por_prenda,
       p.pretina_origen, p.pretinas_por_prenda,
       p.cierre_origen, p.cierres_por_prenda
FROM (VALUES
  -- (nombre, tela_nombre, costo_mo, precio_venta, lim_consumo, lim_rend, cuello_origen, cuellos, puno_origen, punos, pretina_origen, pretinas, cierre_origen, cierres)
  ('jersey manga corta',       'jersey 30/1',        0.95, 1.70, 0.65, 6.0,  'RIB 1x1',     1, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('jersey manga larga',       'jersey 30/1',        1.00, 2.00, 0.81, 5.5,  'RIB 1x1',     1, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('wafle clasico',            'wafle 30/1',         0.95, 1.70, 0.60, 5.0,  'NINGUNO',     0, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('wafle manga larga',        'wafle 30/1',         1.00, 2.00, 0.70, 5.0,  'NINGUNO',     0, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('wafle camisero',           'wafle 30/1',         1.96, 4.00, 0.65, 4.5,  'RECTILÍNEO',  1, 'RECTILÍNEO', 2, 'NINGUNO', 0, 'NINGUNO', 0),
  ('pique camisero',           'pique 30/1',         1.96, 4.00, 0.65, 5.0,  'RECTILÍNEO',  1, 'RECTILÍNEO', 2, 'NINGUNO', 0, 'NINGUNO', 0),
  ('top cero rib',             'jersey 30/1',        0.56, 1.10, 0.55, 7.0,  'RIB 2x1',     1, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('top mc rib',               'jersey 30/1',        0.72, 1.70, 0.55, 7.0,  'RIB 2x1',     1, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('top ml rib',               'jersey 30/1',        0.77, 1.70, 0.60, 6.5,  'RIB 2x1',     1, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('baby ty mc',               'jersey 30/1',        0.90, 1.70, 0.55, 7.0,  'NINGUNO',     0, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('baby ty ml',               'jersey 30/1',        0.95, 1.70, 0.60, 6.5,  'NINGUNO',     0, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('baby ty cinta mc',         'jersey 30/1',        0.73, 1.70, 0.55, 7.0,  'NINGUNO',     0, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('baby ty cinta ml',         'jersey 30/1',        0.78, 1.70, 0.60, 6.5,  'NINGUNO',     0, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('poleras cuello redondo',   'french terry 24/1',  1.79, NULL, 0.80, 4.5,  'RIB 2x1',     1, 'RIB 2x1', 2, 'RIB 2x1', 1, 'NINGUNO', 0),
  ('polera neru',              'french terry 24/1',  3.15, 6.00, 0.85, 4.0,  'NINGUNO',     0, 'RIB 2x1', 2, 'RIB 2x1', 1, 'DIRECTO', 1),
  ('pique cuello chino',       'pique 30/1',         1.82, NULL, 0.65, 5.0,  'RIB 1x1',     1, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('cuello chino wafle',       'wafle 30/1',         1.82, NULL, 0.70, 5.0,  'RIB 1x1',     1, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0),
  ('wafle camisa',             'wafle 30/1',         3.80, NULL, 0.80, 4.0,  'NINGUNO',     0, 'NINGUNO', 0, 'NINGUNO', 0, 'NINGUNO', 0)
) AS p(nombre, tela_nombre, costo_mo, precio_venta, limite_consumo, limite_rendimiento,
        cuello_origen, cuellos_por_prenda, puno_origen, punos_por_prenda,
        pretina_origen, pretinas_por_prenda, cierre_origen, cierres_por_prenda)
JOIN telas t ON t.nombre = p.tela_nombre;

-- ─────────────────────────────────────────────────────────────
-- OPERARIOS (24 activos — Doc 4 padrón)
-- ─────────────────────────────────────────────────────────────
INSERT INTO operarios (codigo, nombre_completo) VALUES
  ('LUISA',    'Apaza Arrapea, Luisa Marcela'),
  ('ADOLFO',   'Arboñil Siesquen, Adolfo Kallin'),
  ('RICHARD',  'Conga Castro, Richard'),
  ('VICTOR',   'Dominguez Malpartida, Victor Neiser'),
  ('EDWID',    'Ellizca Urbano, Edwid'),
  ('GREY',     'Felles Claros, Isrrael Isaias'),
  ('EFRAIN',   'Garcia Luis, Efrain Walter'),
  ('EDGAR',    'Herrera Daga, Edgar Luigui'),
  ('NAZARIO',  'Inga Yarleque, Jose Nazario'),
  ('RISTER',   'Ochavano Ahuanari, Rister'),
  ('RAUL',     'Peña Roman, Raul Benigno'),
  ('JANISI',   'Perez Carrasco, Janisi Yaela'),
  ('ROQUE',    'Roque Celestino, Rafael'),
  ('ALEX J',   'Rutti Gallo, Alexander'),
  ('JESUS',    'Sanchez Toribe, Jesus Antonio'),
  ('JAVIER',   'Sanz Ortiz, Javier Arturo'),
  ('ALEX',     'Yngunza Pachas, Alejandro Javier'),
  ('ARNALDO',  'Yucra Castillo, Arnaldo Simon'),
  ('CARLOS',   'Zeña Alamo, Carlos Rosario'),
  ('FABIOLA',  'Moreno Castañeda, Lorennys Fabiola'),
  ('KARLA',    'Palacios Piñero, Karla Sinay'),
  ('MILAGROS', 'Antich Pereira, Luismari Demilagro'),
  ('RICARDO',  'Suarez Cadillo, Jose Ricardo'),
  ('HAYDE',    'Hayde (apellido no registrado)');

-- ─────────────────────────────────────────────────────────────
-- PRECIOS TELAS (lookup tela + categoría → S/./kg)
-- ─────────────────────────────────────────────────────────────
INSERT INTO precios_telas (tela_id, categoria, precio_kg)
SELECT t.id, cat.categoria, cat.precio_kg
FROM telas t
JOIN (VALUES
  ('jersey 30/1',           'OSCURO',  24.00),
  ('jersey 30/1',           'CLARO',   21.00),
  ('jersey 30/1',           'MELANGE', 18.00),
  ('jersey 30/1',           'PPT',     18.00),
  ('pique 30/1',            'OSCURO',  24.00),
  ('pique 30/1',            'CLARO',   21.00),
  ('pique 30/1',            'MELANGE', 18.00),
  ('pique 30/1',            'PPT',     18.00),
  ('wafle 30/1',            'OSCURO',  26.00),
  ('wafle 30/1',            'CLARO',   22.50),
  ('wafle 30/1',            'MELANGE', 19.00),
  ('wafle 30/1',            'PPT',     19.00),
  ('french terry 24/1',     'OSCURO',  24.00),
  ('french terry 24/1',     'CLARO',   21.00),
  ('french terry 24/1',     'MELANGE', 18.00),
  ('french terry 24/1',     'PPT',     18.00),
  ('rib 1x1',               'OSCURO',  24.00),
  ('rib 1x1',               'CLARO',   21.00),
  ('rib 1x1',               'MELANGE', 18.00),
  ('rib 1x1',               'PPT',     18.00),
  ('rib 2x1 lycrado',       'OSCURO',  24.00),
  ('rib 2x1 lycrado',       'CLARO',   21.00),
  ('rib 2x1 lycrado',       'MELANGE', 18.00),
  ('rib 2x1 lycrado',       'PPT',     18.00),
  ('interlock 50/1 pima',   'OSCURO',  35.00),
  ('interlock 50/1 pima',   'CLARO',   35.00),
  ('interlock 50/1 pima',   'MELANGE', 36.00),
  ('interlock 50/1 pima',   'PPT',     38.00),
  ('jersey full lycra 30/1','OSCURO',  26.00),
  ('jersey full lycra 30/1','CLARO',   22.50),
  ('jersey full lycra 30/1','MELANGE', 19.00),
  ('jersey full lycra 30/1','PPT',     19.00)
) AS cat(tela_nombre, categoria, precio_kg)
ON t.nombre = cat.tela_nombre;

-- ─────────────────────────────────────────────────────────────
-- PRECIOS COMPLEMENTOS (tipo + origen + talla → S/. unit)
-- ─────────────────────────────────────────────────────────────
INSERT INTO precios_complementos (tipo, origen, talla, precio_unit) VALUES
  -- CUELLO RECTILÍNEO: solo M y L
  ('CUELLO', 'RECTILÍNEO', 'M',  0.70),
  ('CUELLO', 'RECTILÍNEO', 'L',  0.75),
  -- PUÑO RECTILÍNEO: solo M y L
  ('PUÑO',   'RECTILÍNEO', 'M',  0.30),
  ('PUÑO',   'RECTILÍNEO', 'L',  0.35),
  -- CUELLO RIB 1x1: S, M, L, XL
  ('CUELLO', 'RIB 1x1',    'S',  0.40),
  ('CUELLO', 'RIB 1x1',    'M',  0.45),
  ('CUELLO', 'RIB 1x1',    'L',  0.50),
  ('CUELLO', 'RIB 1x1',    'XL', 0.55),
  -- CUELLO RIB 2x1: S, M, L, XL (precio fijo)
  ('CUELLO', 'RIB 2x1',    'S',  0.40),
  ('CUELLO', 'RIB 2x1',    'M',  0.40),
  ('CUELLO', 'RIB 2x1',    'L',  0.40),
  ('CUELLO', 'RIB 2x1',    'XL', 0.40),
  -- PUÑO RIB 2x1: precio fijo
  ('PUÑO',   'RIB 2x1',    'S',  0.30),
  ('PUÑO',   'RIB 2x1',    'M',  0.30),
  ('PUÑO',   'RIB 2x1',    'L',  0.30),
  ('PUÑO',   'RIB 2x1',    'XL', 0.30),
  -- PRETINA RIB 2x1: precio fijo
  ('PRETINA','RIB 2x1',    'S',  0.60),
  ('PRETINA','RIB 2x1',    'M',  0.60),
  ('PRETINA','RIB 2x1',    'L',  0.60),
  ('PRETINA','RIB 2x1',    'XL', 0.60),
  -- CIERRE DIRECTO: precio fijo (largo varía S=20/M=25/L=30/XL=35 cm)
  ('CIERRE', 'DIRECTO',    'S',  0.45),
  ('CIERRE', 'DIRECTO',    'M',  0.45),
  ('CIERRE', 'DIRECTO',    'L',  0.45),
  ('CIERRE', 'DIRECTO',    'XL', 0.45);

-- ─────────────────────────────────────────────────────────────
-- PRECIOS TEJEDURÍA (S/./kg recibido)
-- ─────────────────────────────────────────────────────────────
INSERT INTO precios_tejeduria (tipo_tejido, precio_kg_soles) VALUES
  ('Jersey cotton',       0.50),
  ('Pique 30/1',          0.50),
  ('Wafle 30/1',          0.45),
  ('French terry 30/1',   0.40),
  ('Rib 1x1',             0.60),
  ('Rib 2x1 lycrado',     0.80),
  ('Interlock 50/1 Pima', 1.20),
  ('Jersey 20/1',         0.45),
  ('full lycra',          0.70),
  ('Pique pima',          0.70),
  ('Wafle pima',          0.70),
  ('French terry pima',   0.70),
  ('Jersey PC',           0.70);

-- ─────────────────────────────────────────────────────────────
-- PRECIOS TINTORERÍA (S/./kg recibido — matriz servicio × tejido)
-- ─────────────────────────────────────────────────────────────
INSERT INTO precios_tintoreria (servicio, tipo_tejido, precio_kg_soles) VALUES
  -- REACTIVO (oscuros)
  ('REACTIVO', 'Jersey cotton',       4.00),
  ('REACTIVO', 'Pique 30/1',          2.70),
  ('REACTIVO', 'Wafle 30/1',          3.00),
  ('REACTIVO', 'French terry',        3.50),
  ('REACTIVO', 'Rib 1x1',             3.00),
  ('REACTIVO', 'Rib 2x1 lycrado',     3.20),
  ('REACTIVO', 'Interlock Pima',      4.00),
  ('REACTIVO', 'Jersey 20/1',         3.00),
  ('REACTIVO', 'Jersey full lycra',   3.05),
  ('REACTIVO', 'Pique pima',          3.50),
  ('REACTIVO', 'Wafle pima',          3.30),
  ('REACTIVO', 'French terry pima',   3.80),
  ('REACTIVO', 'Jersey PC',           3.00),
  -- DIRECTO (claros)
  ('DIRECTO', 'Jersey cotton',        1.90),
  ('DIRECTO', 'Pique 30/1',           1.95),
  ('DIRECTO', 'Wafle 30/1',           1.90),
  ('DIRECTO', 'French terry',         2.30),
  ('DIRECTO', 'Rib 1x1',              1.90),
  ('DIRECTO', 'Rib 2x1 lycrado',      2.10),
  ('DIRECTO', 'Interlock Pima',       2.50),
  ('DIRECTO', 'Jersey 20/1',          1.90),
  ('DIRECTO', 'Jersey full lycra',    2.30),
  ('DIRECTO', 'Pique pima',           2.30),
  ('DIRECTO', 'Wafle pima',           2.10),
  ('DIRECTO', 'French terry pima',    2.50),
  ('DIRECTO', 'Jersey PC',            3.00),
  -- PPT (perla/blanco)
  ('PPT', 'Jersey cotton',            1.20),
  ('PPT', 'Pique 30/1',               1.10),
  ('PPT', 'Wafle 30/1',               1.20),
  ('PPT', 'French terry',             1.50),
  ('PPT', 'Rib 1x1',                  1.20),
  ('PPT', 'Rib 2x1 lycrado',          1.30),
  ('PPT', 'Interlock Pima',           1.80),
  ('PPT', 'Jersey 20/1',              1.20),
  ('PPT', 'Jersey full lycra',        1.50),
  ('PPT', 'Pique pima',               1.50),
  ('PPT', 'Wafle pima',               1.30),
  ('PPT', 'French terry pima',        1.80),
  ('PPT', 'Jersey PC',                3.00),
  -- LAVADO (melange)
  ('LAVADO', 'Jersey cotton',         1.00),
  ('LAVADO', 'Pique 30/1',            1.10),
  ('LAVADO', 'Wafle 30/1',            1.00),
  ('LAVADO', 'French terry',          1.20),
  ('LAVADO', 'Rib 1x1',               1.00),
  ('LAVADO', 'Rib 2x1 lycrado',       1.10),
  ('LAVADO', 'Interlock Pima',        1.50),
  ('LAVADO', 'Jersey 20/1',           1.00),
  ('LAVADO', 'Jersey full lycra',     1.20),
  ('LAVADO', 'Pique pima',            1.20),
  ('LAVADO', 'Wafle pima',            1.10),
  ('LAVADO', 'French terry pima',     1.50),
  ('LAVADO', 'Jersey PC',             3.00),
  -- TERMOFIJADO (solo telas con lycra)
  ('TERMOFIJADO', 'Rib 2x1 lycrado',  1.50),
  ('TERMOFIJADO', 'Jersey full lycra',1.50),
  -- COMPACTADO EN RAMA
  ('COMPACTADO EN RAMA', 'Jersey cotton',      0.80),
  ('COMPACTADO EN RAMA', 'Pique 30/1',         0.85),
  ('COMPACTADO EN RAMA', 'Wafle 30/1',         0.80),
  ('COMPACTADO EN RAMA', 'French terry',       0.90),
  ('COMPACTADO EN RAMA', 'Rib 1x1',            0.80),
  ('COMPACTADO EN RAMA', 'Interlock Pima',     1.00),
  ('COMPACTADO EN RAMA', 'Jersey 20/1',        0.80),
  ('COMPACTADO EN RAMA', 'Jersey full lycra',  0.90),
  ('COMPACTADO EN RAMA', 'Pique pima',         1.00),
  ('COMPACTADO EN RAMA', 'Wafle pima',         0.95),
  ('COMPACTADO EN RAMA', 'French terry pima',  1.05),
  ('COMPACTADO EN RAMA', 'Jersey PC',          3.00);

-- ─────────────────────────────────────────────────────────────
-- TARIFAS OPERACIONES DESTAJO (Doc 4 — canónico)
-- ─────────────────────────────────────────────────────────────
INSERT INTO tarifas_operaciones (producto_id, operacion, tarifa, orden)
SELECT p.id, op.operacion, op.tarifa, op.orden
FROM productos p
JOIN (VALUES
  -- jersey manga corta (total 0.95)
  ('jersey manga corta', 'Hombro',      0.10, 1),
  ('jersey manga corta', 'Cuello',      0.15, 2),
  ('jersey manga corta', 'Despunte',    0.08, 3),
  ('jersey manga corta', 'Tapeta',      0.11, 4),
  ('jersey manga corta', 'B.Manga',     0.10, 5),
  ('jersey manga corta', 'Manga y CC',  0.30, 6),
  ('jersey manga corta', 'Faldón',      0.11, 7),

  -- jersey manga larga (total 1.00)
  ('jersey manga larga', 'Hombro',      0.10, 1),
  ('jersey manga larga', 'Cuello',      0.15, 2),
  ('jersey manga larga', 'Despunte',    0.08, 3),
  ('jersey manga larga', 'Tapeta',      0.11, 4),
  ('jersey manga larga', 'B.Manga',     0.10, 5),
  ('jersey manga larga', 'Manga y CC',  0.35, 6),
  ('jersey manga larga', 'Faldón',      0.11, 7),

  -- wafle clasico (total 0.95)
  ('wafle clasico', 'Hombro',      0.10, 1),
  ('wafle clasico', 'Cuello',      0.15, 2),
  ('wafle clasico', 'Despunte',    0.08, 3),
  ('wafle clasico', 'Tapeta',      0.11, 4),
  ('wafle clasico', 'B.Manga',     0.10, 5),
  ('wafle clasico', 'Manga y CC',  0.30, 6),
  ('wafle clasico', 'Faldón',      0.11, 7),

  -- wafle manga larga (total 1.00)
  ('wafle manga larga', 'Hombro',      0.10, 1),
  ('wafle manga larga', 'Cuello',      0.15, 2),
  ('wafle manga larga', 'Despunte',    0.08, 3),
  ('wafle manga larga', 'Tapeta',      0.11, 4),
  ('wafle manga larga', 'B.Manga',     0.10, 5),
  ('wafle manga larga', 'Manga y CC',  0.35, 6),
  ('wafle manga larga', 'Faldón',      0.11, 7),

  -- wafle camisero (total 1.96)
  ('wafle camisero', 'Bast.Plaqueta',   0.10, 1),
  ('wafle camisero', 'Peg.Plaqueta',    0.20, 2),
  ('wafle camisero', 'Hombro',          0.10, 3),
  ('wafle camisero', 'Cuello',          0.20, 4),
  ('wafle camisero', 'Peg.Cinta',       0.15, 5),
  ('wafle camisero', 'Tumbado',         0.60, 6),
  ('wafle camisero', 'Manga y cerrado', 0.50, 7),
  ('wafle camisero', 'Faldón',          0.11, 8),

  -- pique camisero (total 1.96)
  ('pique camisero', 'Bast.Plaqueta',   0.10, 1),
  ('pique camisero', 'Peg.Plaqueta',    0.20, 2),
  ('pique camisero', 'Hombro',          0.10, 3),
  ('pique camisero', 'Cuello',          0.20, 4),
  ('pique camisero', 'Peg.Cinta',       0.15, 5),
  ('pique camisero', 'Tumbado',         0.60, 6),
  ('pique camisero', 'Manga y cerrado', 0.50, 7),
  ('pique camisero', 'Faldón',          0.11, 8),

  -- top cero rib (total 0.56)
  ('top cero rib', 'Hombro1',    0.08, 1),
  ('top cero rib', 'Cinta',      0.20, 2),
  ('top cero rib', 'Manga y C',  0.15, 3),
  ('top cero rib', 'Faldón',     0.08, 4),
  ('top cero rib', 'Atraque',    0.05, 5),

  -- top mc rib (total 0.72)
  ('top mc rib', 'Hombro1',  0.05, 1),
  ('top mc rib', 'Cinta',    0.10, 2),
  ('top mc rib', 'Hombro2',  0.05, 3),
  ('top mc rib', 'Atraque',  0.05, 4),
  ('top mc rib', 'B.Manga',  0.08, 5),
  ('top mc rib', 'Manga y C',0.30, 6),
  ('top mc rib', 'Faldón',   0.09, 7),

  -- top ml rib (total 0.77)
  ('top ml rib', 'Hombro1',  0.05, 1),
  ('top ml rib', 'Cinta',    0.10, 2),
  ('top ml rib', 'Hombro2',  0.05, 3),
  ('top ml rib', 'Atraque',  0.05, 4),
  ('top ml rib', 'B.Manga',  0.08, 5),
  ('top ml rib', 'Manga y C',0.35, 6),
  ('top ml rib', 'Faldón',   0.09, 7),

  -- baby ty mc (total 0.90)
  ('baby ty mc', 'Hombro',      0.08, 1),
  ('baby ty mc', 'Cuello',      0.18, 2),
  ('baby ty mc', 'Despunte',    0.07, 3),
  ('baby ty mc', 'Tapeta',      0.09, 4),
  ('baby ty mc', 'B.Manga',     0.08, 5),
  ('baby ty mc', 'Manga y C',   0.30, 6),
  ('baby ty mc', 'Faldón',      0.10, 7),

  -- baby ty ml (total 0.95)
  ('baby ty ml', 'Hombro',      0.08, 1),
  ('baby ty ml', 'Cuello',      0.18, 2),
  ('baby ty ml', 'Despunte',    0.07, 3),
  ('baby ty ml', 'Tapeta',      0.09, 4),
  ('baby ty ml', 'B.Manga',     0.08, 5),
  ('baby ty ml', 'Manga y C',   0.35, 6),
  ('baby ty ml', 'Faldón',      0.10, 7),

  -- baby ty cinta mc (total 0.73)
  ('baby ty cinta mc', 'Hombro1',  0.05, 1),
  ('baby ty cinta mc', 'Cinta',    0.10, 2),
  ('baby ty cinta mc', 'B.Manga',  0.08, 3),
  ('baby ty cinta mc', 'Manga y C',0.30, 4),
  ('baby ty cinta mc', 'Faldón',   0.10, 5),
  ('baby ty cinta mc', 'Atraque',  0.10, 6),

  -- baby ty cinta ml (total 0.78)
  ('baby ty cinta ml', 'Hombro1',  0.05, 1),
  ('baby ty cinta ml', 'Cinta',    0.10, 2),
  ('baby ty cinta ml', 'B.Manga',  0.08, 3),
  ('baby ty cinta ml', 'Manga y C',0.35, 4),
  ('baby ty cinta ml', 'Faldón',   0.10, 5),
  ('baby ty cinta ml', 'Atraque',  0.10, 6),

  -- poleras cuello redondo (total 1.79)
  ('poleras cuello redondo', 'Hombro',         0.10, 1),
  ('poleras cuello redondo', 'Cuello',         0.15, 2),
  ('poleras cuello redondo', 'Despunte',       0.08, 3),
  ('poleras cuello redondo', 'Tapeta',         0.11, 4),
  ('poleras cuello redondo', 'Manga y Cerrado',0.35, 5),
  ('poleras cuello redondo', 'R.PyP',          0.60, 6),
  ('poleras cuello redondo', 'D.PyP',          0.40, 7),

  -- polera neru (total 3.15)
  ('polera neru', 'Hombro',        0.10, 1),
  ('polera neru', 'C.Cadena',      0.10, 2),
  ('polera neru', 'C.Nuca',        0.20, 3),
  ('polera neru', 'Cierre',        0.80, 4),
  ('polera neru', 'Desp.Cuello',   0.15, 5),
  ('polera neru', 'Asentado',      0.30, 6),
  ('polera neru', 'Desp.Cierre',   0.15, 7),
  ('polera neru', 'Manga y cerrado',0.35, 8),
  ('polera neru', 'R.PyP',         0.60, 9),
  ('polera neru', 'D.PyP',         0.40, 10),

  -- pique cuello chino (total 1.82)
  ('pique cuello chino', 'Peg.Pech',         0.50, 1),
  ('pique cuello chino', 'Orill.Borde',      0.10, 2),
  ('pique cuello chino', 'Desp.Pechera',     0.10, 3),
  ('pique cuello chino', 'Hombro',           0.10, 4),
  ('pique cuello chino', 'Cuello',           0.25, 5),
  ('pique cuello chino', 'Desp.Cuello',      0.15, 6),
  ('pique cuello chino', 'Peg.Cinta tapeta', 0.11, 7),
  ('pique cuello chino', 'Manga y cerrado',  0.30, 8),
  ('pique cuello chino', 'Basta manga',      0.10, 9),
  ('pique cuello chino', 'Basta faldón',     0.11, 10),

  -- cuello chino wafle (total 1.82 — mismas ops que pique cuello chino)
  ('cuello chino wafle', 'Peg.Pech',         0.50, 1),
  ('cuello chino wafle', 'Orill.Borde',      0.10, 2),
  ('cuello chino wafle', 'Desp.Pechera',     0.10, 3),
  ('cuello chino wafle', 'Hombro',           0.10, 4),
  ('cuello chino wafle', 'Cuello',           0.25, 5),
  ('cuello chino wafle', 'Desp.Cuello',      0.15, 6),
  ('cuello chino wafle', 'Peg.Cinta tapeta', 0.11, 7),
  ('cuello chino wafle', 'Manga y cerrado',  0.30, 8),
  ('cuello chino wafle', 'Basta manga',      0.10, 9),
  ('cuello chino wafle', 'Basta faldón',     0.11, 10),

  -- wafle camisa (total 3.80 — 18 operaciones)
  ('wafle camisa', 'Peg.Canesú',       0.20, 1),
  ('wafle camisa', 'Desp.Canesú',      0.10, 2),
  ('wafle camisa', 'Basta bolsillo',   0.04, 3),
  ('wafle camisa', 'Peg.Bolsillo',     0.40, 4),
  ('wafle camisa', 'Orillado solapa',  0.16, 5),
  ('wafle camisa', 'Dobles solapa',    0.20, 6),
  ('wafle camisa', 'Peg.Solapa',       0.20, 7),
  ('wafle camisa', 'Unión hombro',     0.25, 8),
  ('wafle camisa', 'Desp.Hombro',      0.15, 9),
  ('wafle camisa', 'Desp.Solapa',      0.20, 10),
  ('wafle camisa', 'Desp.Pechera',     0.30, 11),
  ('wafle camisa', 'Orillado cuello',  0.15, 12),
  ('wafle camisa', 'Desp.Cuello',      0.15, 13),
  ('wafle camisa', 'Peg.Cuello',       0.50, 14),
  ('wafle camisa', 'Asentado cuello',  0.25, 15),
  ('wafle camisa', 'Basta manga',      0.10, 16),
  ('wafle camisa', 'Manga y cerrado',  0.35, 17),
  ('wafle camisa', 'Basta faldón',     0.10, 18)

) AS op(producto_nombre, operacion, tarifa, orden)
ON p.nombre = op.producto_nombre;

-- ─────────────────────────────────────────────────────────────
-- PROGRAMAS ZURZAM (datos reales — 5 programas)
-- ─────────────────────────────────────────────────────────────
INSERT INTO programas_zurzam (
  codigo, descripcion, tipo_hilo, kg_hilo, tipo_tejido, cliente_id,
  estado, kg_tej_enviado, kg_tej_retornado, kg_conos_extorno,
  kg_tint_enviado, kg_tint_retornado, rollos_producidos,
  costo_total, costo_kg, comision_jose, fecha_inicio, fecha_cierre
)
SELECT
  pz.codigo, pz.descripcion, pz.tipo_hilo, pz.kg_hilo, pz.tipo_tejido,
  c.id,
  pz.estado, pz.kg_tej_enviado, pz.kg_tej_retornado, pz.kg_conos_extorno,
  pz.kg_tint_enviado, pz.kg_tint_retornado, pz.rollos_producidos,
  pz.costo_total, pz.costo_kg, pz.comision_jose,
  pz.fecha_inicio::DATE, pz.fecha_cierre::DATE
FROM (VALUES
  ('PIQUE-001',            'PIQUE',               'Hilo 30/1 PC',            1000, 'Pique 30/1',       'OverShark', 'CERRADO',       980, 980, 5,  980, 890, 50, 19171.18, 21.54, 267.00, '2026-04-01', '2026-04-30'),
  ('FULL LYCRA 50/1-001',  '50/1 ALGODON 100%',   'hilo 50/1 cotton+lycra 4%', 500, 'full lycra',    'OverShark', 'EN TEJEDURÍA',  NULL,NULL,NULL, NULL,NULL, NULL, 9625.00, NULL,  NULL,   '2026-05-10', NULL),
  ('frecnh terry - 001',   'french terry 30/1',   'Hilo 30/1 PC',            3000, 'French terry 30/1','Bravos',   'EN TEJEDURÍA',  NULL,NULL,NULL, NULL,NULL, NULL,31050.00, NULL,  NULL,   NULL,         NULL),
  ('jersey algodon - 001', 'ALGODON 30/1',        'Hilo 30/1 ALGODON',        660, 'Jersey 30/1',     'OverShark', 'EN TINTORERÍA', NULL,NULL,NULL, NULL,NULL, NULL, 9108.00, NULL,  NULL,   NULL,         NULL),
  ('rib 1x1- jersey algodon -001','rib complemento ja-001','Hilo 30/1 ALGODON', 40, 'Rib 1x1',        'OverShark', 'EN TINTORERÍA', NULL,NULL,NULL, NULL,NULL, NULL,    NULL, NULL,  NULL,   NULL,         NULL)
) AS pz(codigo, descripcion, tipo_hilo, kg_hilo, tipo_tejido, cliente_nombre, estado,
         kg_tej_enviado, kg_tej_retornado, kg_conos_extorno,
         kg_tint_enviado, kg_tint_retornado, rollos_producidos,
         costo_total, costo_kg, comision_jose, fecha_inicio, fecha_cierre)
JOIN clientes c ON c.nombre = pz.cliente_nombre;

-- Programa detalles de PIQUE-001
INSERT INTO programa_detalles (
  programa_id, color_id, servicio_tintoreria,
  rollos_plan, kg_plan,
  kg_tej_retornado, precio_tej_usd, tipo_cambio_tej, costo_tej,
  kg_tint_retornado, precio_tint_usd, tipo_cambio_tint, costo_tint,
  costo_hilo, costo_total, costo_kg
)
SELECT
  prog.id, col.id, pd.servicio,
  pd.rollos_plan, pd.kg_plan,
  pd.kg_tej_ret, pd.precio_tej_usd, 3.55, pd.costo_tej,
  pd.kg_tint_ret, pd.precio_tint_usd, 3.55, pd.costo_tint,
  pd.costo_hilo, pd.costo_total, pd.costo_kg
FROM (VALUES
  ('Negro',   'REACTIVO', 20, 400, 395, 0.50, 710.00, 380, 2.70, 3786.08, 4200.00, 8696.08, 22.88),
  ('Perla',   'PPT',      10, 200, 195, 0.50, 355.00, 170, 1.10,  761.48, 2100.00, 3216.48, 18.92),
  ('Beige',   'DIRECTO',  10, 200, 195, 0.50, 355.00, 170, 1.95, 1330.88, 2100.00, 3785.88, 22.27),
  ('Melange', 'LAVADO',   10, 200, 195, 0.50, 355.00, 170, 1.10,  750.75, 2100.00, 3205.75, 18.86)
) AS pd(color_nombre, servicio, rollos_plan, kg_plan, kg_tej_ret, precio_tej_usd, costo_tej,
         kg_tint_ret, precio_tint_usd, costo_tint, costo_hilo, costo_total, costo_kg)
JOIN programas_zurzam prog ON prog.codigo = 'PIQUE-001'
JOIN colores col ON col.nombre = pd.color_nombre;

-- ─────────────────────────────────────────────────────────────
-- COMPRAS DE HILO (datos reales)
-- ─────────────────────────────────────────────────────────────
INSERT INTO compras_hilo (
  programa_id, fecha, tipo_hilo, kg,
  precio_kg_usd, tipo_cambio, total_soles,
  proveedor_id, num_factura, estado_pago
)
SELECT
  prog.id,
  COALESCE(ch.fecha::DATE, CURRENT_DATE),
  ch.tipo_hilo, ch.kg,
  ch.precio_kg_usd, ch.tipo_cambio, ch.total_soles,
  prov.id, ch.num_factura, ch.estado_pago
FROM (VALUES
  ('PIQUE-001',            '2026-04-01', 'Hilo 30/1 PC',              1000.0, 3.00, 3.500, 10500.00, 'COTTON MIX', 'COTTOON-001', 'PAGADO'),
  ('FULL LYCRA 50/1-001',  '2026-05-10', 'hilo 50/1 cotton+lycra 4%',  500.0, 5.50, 3.500,  9625.00, 'COTTON MIX', 'f002-4472',   'PAGADO'),
  ('frecnh terry - 001',   NULL,         'Hilo 30/1 PC',              3000.0, 3.00, 3.450, 31050.00, 'COTTON MIX', NULL,          'PAGADO'),
  ('jersey algodon - 001', NULL,         'Hilo 30/1 ALGODON',          660.0, 4.00, 3.450,  9108.00, 'COTTON MIX', NULL,          'PAGADO')
) AS ch(programa_codigo, fecha, tipo_hilo, kg, precio_kg_usd, tipo_cambio, total_soles, proveedor_nombre, num_factura, estado_pago)
JOIN programas_zurzam prog ON prog.codigo = ch.programa_codigo
JOIN proveedores prov ON prov.nombre = ch.proveedor_nombre;

-- Stock extorno PIQUE-001
INSERT INTO stock_extornos (programa_id, tipo_hilo, kg, precio_kg, valor_total, fecha)
SELECT prog.id, 'Hilo 30/1 PC', 5, 10.39, 51.94, '2026-04-30'
FROM programas_zurzam prog WHERE prog.codigo = 'PIQUE-001';
