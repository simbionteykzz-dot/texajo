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


  -- 5. Nueva columna en boleta_lineas: fecha_registro
  -- Guarda la fecha exacta (YYYY-MM-DD) en que se registró la operación,
  -- permite filtrar el desempeño de un operario por rango de fechas libre.
  -- ─────────────────────────────────────────────────────────────
  alter table boleta_lineas
    add column if not exists fecha_registro date;

  create index if not exists idx_boleta_lineas_fecha_registro
    on boleta_lineas(operario_id, fecha_registro)
    where fecha_registro is not null;


  -- 6. Insertar operarios de corte: Yerson y Jose
  -- ─────────────────────────────────────────────────────────────
  insert into operarios (id, codigo, nombre, estado)
  values
    ('cortador-yerson-01', 'COR001', 'Yerson', 'ACTIVO'),
    ('cortador-jose-01',   'COR002', 'Jose',   'ACTIVO')
  on conflict (id) do nothing;


  -- 7. Nuevas columnas en productos: marca y proporciones por talla
  -- ─────────────────────────────────────────────────────────────
  alter table productos add column if not exists marca    text;
  alter table productos add column if not exists prop_s   integer;
  alter table productos add column if not exists prop_m   integer;
  alter table productos add column if not exists prop_l   integer;
  alter table productos add column if not exists prop_xl  integer;


  -- 9. Insertar todos los productos del catálogo
  -- Fuente: props.xlsx columnas CLIENTE (marca) y PRODUCTO
  -- Las proporciones se dejan en NULL para configurar manualmente en el catálogo.
  -- ─────────────────────────────────────────────────────────────
  insert into productos (id, nombre, marca, costo_mo_total, precio_servicio, notas)
  values
    ('prod-overshark-jersey-ml',      'jersey manga larga',    'OverShark', 0, 0, ''),
    ('prod-overshark-wafle-clasico',  'wafle clasico',         'OverShark', 0, 0, ''),
    ('prod-overshark-baby-cinta-ml',  'baby ty cinta ml',      'OverShark', 0, 0, ''),
    ('prod-overshark-baby-cinta-mc',  'baby ty cinta mc',      'OverShark', 0, 0, ''),
    ('prod-overshark-top-mc-rib',     'top mc rib',            'OverShark', 0, 0, ''),
    ('prod-overshark-top-cero-rib',   'top cero rib',          'OverShark', 0, 0, ''),
    ('prod-overshark-top-ml-rib',     'top ml rib',            'OverShark', 0, 0, ''),
    ('prod-overshark-jersey-mc',      'jersey manga corta',    'OverShark', 0, 0, ''),
    ('prod-overshark-wafle-camisero', 'wafle camisero',        'OverShark', 0, 0, ''),
    ('prod-overshark-pique-camisero', 'pique camisero',        'OverShark', 0, 0, ''),
    ('prod-overshark-wafle-camisa',   'wafle camisa',          'OverShark', 0, 0, ''),
    ('prod-overshark-wafle-ml',       'wafle manga larga',     'OverShark', 0, 0, ''),
    ('prod-overshark-pique-chino',    'pique cuello chino',    'OverShark', 0, 0, ''),
    ('prod-overshark-baby-mc',        'baby ty mc',            'OverShark', 0, 0, ''),
    ('prod-overshark-baby-ml',        'baby ty ml',            'OverShark', 0, 0, ''),
    ('prod-bravos-polera-neru',       'polera neru',           'Bravos',    0, 0, ''),
    ('prod-bravos-polera-cr',         'poleras cuello redondo','Bravos',    0, 0, '')
  on conflict (id) do nothing;

  -- 8. Actualizar proporciones por producto extraídas del registro de cortes
  -- Fuente: props.xlsx (histórico completo de cortes)
  -- Nota: para productos con proporciones variables se usa la variante más
  --       frecuente como plantilla; el operario puede ajustar por corte.
  -- ─────────────────────────────────────────────────────────────

  -- Proporciones fijas (1 sola variante en todo el histórico)
  update productos set prop_s=2, prop_m=4, prop_l=4, prop_xl=2 where lower(nombre) = 'jersey manga larga';
  update productos set prop_s=1, prop_m=2, prop_l=2, prop_xl=1 where lower(nombre) = 'wafle camisa';
  update productos set prop_s=2, prop_m=4, prop_l=4, prop_xl=2 where lower(nombre) = 'pique cuello chino';
  update productos set prop_s=2, prop_m=3, prop_l=2, prop_xl=0 where lower(nombre) = 'poleras cuello redondo';
  update productos set prop_s=2, prop_m=2, prop_l=2, prop_xl=0 where lower(nombre) = 'baby ty cinta ml';
  update productos set prop_s=2, prop_m=2, prop_l=2, prop_xl=0 where lower(nombre) = 'baby ty cinta mc';
  update productos set prop_s=4, prop_m=4, prop_l=4, prop_xl=0 where lower(nombre) = 'baby ty mc';
  update productos set prop_s=2, prop_m=2, prop_l=2, prop_xl=0 where lower(nombre) = 'baby ty ml';
  update productos set prop_s=8, prop_m=0, prop_l=0, prop_xl=0 where lower(nombre) = 'top mc rib';
  update productos set prop_s=0, prop_m=0, prop_l=4, prop_xl=0 where lower(nombre) = 'top cero rib';
  update productos set prop_s=0, prop_m=6, prop_l=0, prop_xl=0 where lower(nombre) = 'top ml rib';

  -- Proporciones variables → variante más frecuente como plantilla
  -- jersey manga corta: 4-6-6-4 (19x) vs 2-4-4-2 (15x)
  update productos set prop_s=4, prop_m=6, prop_l=6, prop_xl=4 where lower(nombre) = 'jersey manga corta';
  -- wafle clasico: 4-6-6-4 (28x) vs 2-4-4-2 (15x)
  update productos set prop_s=4, prop_m=6, prop_l=6, prop_xl=4 where lower(nombre) = 'wafle clasico';
  -- wafle camisero: 2-4-4-2 (10x) vs 4-6-6-4 (8x)
  update productos set prop_s=2, prop_m=4, prop_l=4, prop_xl=2 where lower(nombre) = 'wafle camisero';
  -- wafle manga larga: 3-6-6-0 (8x) vs 2-4-4-2 (6x)
  update productos set prop_s=3, prop_m=6, prop_l=6, prop_xl=0 where lower(nombre) = 'wafle manga larga';
  -- pique camisero: 2-4-4-2 (27x) vs 4-4-4-8 (11x)
  update productos set prop_s=2, prop_m=4, prop_l=4, prop_xl=2 where lower(nombre) = 'pique camisero';
  -- polera neru: 4-2-4-0 (13x) vs 2-4-2-0 (9x) vs 4-6-4-0 (6x) vs otras
  update productos set prop_s=4, prop_m=2, prop_l=4, prop_xl=0 where lower(nombre) = 'polera neru';


  -- 10. Insertar colores del catálogo de productos (deduplicados por nombre normalizado)
  -- Fuente: props.xlsx columna COLOR
  -- Categoría inferida por nombre: MELANGE si contiene "melange", CLARO/OSCURO por color base.
  -- ─────────────────────────────────────────────────────────────
  insert into colores (id, nombre, categoria, prioridad, notas)
  values
    ('azul',         'Azul',         'CLARO',   0, ''),
    ('azul-marino',  'Azul Marino',  'CLARO',   0, ''),
    ('azul-marino-1','Azul Marino 1','CLARO',   0, ''),
    ('azul-marino-2','Azul Marino 2','CLARO',   0, ''),
    ('beige',        'Beige',        'CLARO',   0, ''),
    ('blanco',       'Blanco',       'CLARO',   0, ''),
    ('blanco-1',     'Blanco 1',     'CLARO',   0, ''),
    ('blanco-2',     'Blanco 2',     'CLARO',   0, ''),
    ('botella',      'Botella',      'OSCURO',  0, ''),
    ('cemento',      'Cemento',      'CLARO',   0, ''),
    ('cemento-1',    'Cemento 1',    'CLARO',   0, ''),
    ('cemento-2',    'Cemento 2',    'CLARO',   0, ''),
    ('colegial',     'Colegial',     'OSCURO',  0, ''),
    ('colegial-1',   'Colegial 1',   'OSCURO',  0, ''),
    ('colegial-2',   'Colegial 2',   'OSCURO',  0, ''),
    ('denim',        'Denim',        'OSCURO',  0, ''),
    ('denim-1',      'Denim 1',      'OSCURO',  0, ''),
    ('denim-2',      'Denim 2',      'OSCURO',  0, ''),
    ('melange',      'Melange',      'MELANGE', 0, ''),
    ('melange-1',    'Melange 1',    'MELANGE', 0, ''),
    ('melange-2',    'Melange 2',    'MELANGE', 0, ''),
    ('melange-3',    'Melange 3',    'MELANGE', 0, ''),
    ('negro',        'Negro',        'OSCURO',  0, ''),
    ('negro-1',      'Negro 1',      'OSCURO',  0, ''),
    ('negro-2',      'Negro 2',      'OSCURO',  0, ''),
    ('negro-3',      'Negro 3',      'OSCURO',  0, ''),
    ('negro-4',      'Negro 4',      'OSCURO',  0, ''),
    ('pacay',        'Pacay',        'CLARO',   0, ''),
    ('palo-rosa-1',  'Palo Rosa 1',  'CLARO',   0, ''),
    ('palo-rosa-2',  'Palo Rosa 2',  'CLARO',   0, ''),
    ('perla',        'Perla',        'CLARO',   0, ''),
    ('perla-1',      'Perla 1',      'CLARO',   0, ''),
    ('rosa',         'Rosa',         'CLARO',   0, ''),
    ('rosado',       'Rosado',       'CLARO',   0, ''),
    ('topo',         'Topo',         'CLARO',   0, ''),
    ('verde-botella','Verde Botella','OSCURO',  0, ''),
    ('vino',         'Vino',         'OSCURO',  0, ''),
    ('vino-1',       'Vino 1',       'OSCURO',  0, ''),
    ('vino-2',       'Vino 2',       'OSCURO',  0, '')
  on conflict (id) do nothing;


  -- 11. Nueva tabla: producto_colores
create table if not exists producto_colores (
  id          text primary key,
  producto_id text not null references productos(id) on delete cascade,
  color_id    text not null references colores(id) on delete cascade,
  prop_s      integer not null default 0,
  prop_m      integer not null default 0,
  prop_l      integer not null default 0,
  prop_xl     integer not null default 0,
  created_at  timestamptz default now()
);

alter table producto_colores disable row level security;
grant select, insert, update, delete on table producto_colores to authenticated;

create index if not exists idx_producto_colores_producto
  on producto_colores(producto_id);

create index if not exists idx_producto_colores_color
  on producto_colores(color_id);

insert into producto_colores (id, producto_id, color_id, prop_s, prop_m, prop_l, prop_xl)
values
  ('prod-overshark-jersey-ml--cemento--001', 'prod-overshark-jersey-ml', 'cemento', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--rosa--002', 'prod-overshark-jersey-ml', 'rosa', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--negro-1--003', 'prod-overshark-jersey-ml', 'negro-1', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--negro-2--004', 'prod-overshark-jersey-ml', 'negro-2', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--negro-3--005', 'prod-overshark-jersey-ml', 'negro-3', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--azul-marino-1--006', 'prod-overshark-jersey-ml', 'azul-marino-1', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--azul-marino-2--007', 'prod-overshark-jersey-ml', 'azul-marino-2', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--vino--008', 'prod-overshark-jersey-ml', 'vino', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--denim--009', 'prod-overshark-jersey-ml', 'denim', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--blanco--010', 'prod-overshark-jersey-ml', 'blanco', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--negro--011', 'prod-overshark-wafle-clasico', 'negro', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--azul-marino--012', 'prod-overshark-wafle-clasico', 'azul-marino', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--vino--013', 'prod-overshark-wafle-clasico', 'vino', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--colegial--014', 'prod-overshark-wafle-clasico', 'colegial', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--cemento--015', 'prod-overshark-wafle-clasico', 'cemento', 2, 4, 4, 2),
  ('prod-overshark-baby-ty-cinta-ml--blanco--016', 'prod-overshark-baby-ty-cinta-ml', 'blanco', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-ml--pacay--017', 'prod-overshark-baby-ty-cinta-ml', 'pacay', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-ml--azul-marino--018', 'prod-overshark-baby-ty-cinta-ml', 'azul-marino', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-ml--vino--019', 'prod-overshark-baby-ty-cinta-ml', 'vino', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-ml--colegial--020', 'prod-overshark-baby-ty-cinta-ml', 'colegial', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-ml--negro--021', 'prod-overshark-baby-ty-cinta-ml', 'negro', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-mc--blanco--022', 'prod-overshark-baby-ty-cinta-mc', 'blanco', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-mc--pacay--023', 'prod-overshark-baby-ty-cinta-mc', 'pacay', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-mc--azul-marino--024', 'prod-overshark-baby-ty-cinta-mc', 'azul-marino', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-mc--vino--025', 'prod-overshark-baby-ty-cinta-mc', 'vino', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-mc--colegial--026', 'prod-overshark-baby-ty-cinta-mc', 'colegial', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-cinta-mc--negro--027', 'prod-overshark-baby-ty-cinta-mc', 'negro', 2, 2, 2, 0),
  ('prod-overshark-top-mc-rib--negro--028', 'prod-overshark-top-mc-rib', 'negro', 8, 0, 0, 0),
  ('prod-overshark-top-mc-rib--azul-marino--029', 'prod-overshark-top-mc-rib', 'azul-marino', 8, 0, 0, 0),
  ('prod-overshark-top-mc-rib--denim--030', 'prod-overshark-top-mc-rib', 'denim', 8, 0, 0, 0),
  ('prod-overshark-top-mc-rib--blanco--031', 'prod-overshark-top-mc-rib', 'blanco', 8, 0, 0, 0),
  ('prod-overshark-top-mc-rib--pacay--032', 'prod-overshark-top-mc-rib', 'pacay', 8, 0, 0, 0),
  ('prod-overshark-top-mc-rib--cemento--033', 'prod-overshark-top-mc-rib', 'cemento', 8, 0, 0, 0),
  ('prod-overshark-top-mc-rib--rosado--034', 'prod-overshark-top-mc-rib', 'rosado', 8, 0, 0, 0),
  ('prod-overshark-top-mc-rib--beige--035', 'prod-overshark-top-mc-rib', 'beige', 8, 0, 0, 0),
  ('prod-overshark-top-mc-rib--vino--036', 'prod-overshark-top-mc-rib', 'vino', 8, 0, 0, 0),
  ('prod-overshark-top-cero-rib--negro--037', 'prod-overshark-top-cero-rib', 'negro', 0, 0, 4, 0),
  ('prod-overshark-top-cero-rib--azul-marino--038', 'prod-overshark-top-cero-rib', 'azul-marino', 0, 0, 4, 0),
  ('prod-overshark-top-cero-rib--denim--039', 'prod-overshark-top-cero-rib', 'denim', 0, 0, 4, 0),
  ('prod-overshark-top-cero-rib--blanco--040', 'prod-overshark-top-cero-rib', 'blanco', 0, 0, 4, 0),
  ('prod-overshark-top-cero-rib--pacay--041', 'prod-overshark-top-cero-rib', 'pacay', 0, 0, 4, 0),
  ('prod-overshark-top-cero-rib--cemento--042', 'prod-overshark-top-cero-rib', 'cemento', 0, 0, 4, 0),
  ('prod-overshark-top-cero-rib--rosado--043', 'prod-overshark-top-cero-rib', 'rosado', 0, 0, 4, 0),
  ('prod-overshark-top-cero-rib--beige--044', 'prod-overshark-top-cero-rib', 'beige', 0, 0, 4, 0),
  ('prod-overshark-top-cero-rib--vino--045', 'prod-overshark-top-cero-rib', 'vino', 0, 0, 4, 0),
  ('prod-overshark-top-ml-rib--negro--046', 'prod-overshark-top-ml-rib', 'negro', 0, 6, 0, 0),
  ('prod-overshark-top-ml-rib--azul-marino--047', 'prod-overshark-top-ml-rib', 'azul-marino', 0, 6, 0, 0),
  ('prod-overshark-top-ml-rib--denim--048', 'prod-overshark-top-ml-rib', 'denim', 0, 6, 0, 0),
  ('prod-overshark-top-ml-rib--blanco--049', 'prod-overshark-top-ml-rib', 'blanco', 0, 6, 0, 0),
  ('prod-overshark-top-ml-rib--pacay--050', 'prod-overshark-top-ml-rib', 'pacay', 0, 6, 0, 0),
  ('prod-overshark-top-ml-rib--cemento--051', 'prod-overshark-top-ml-rib', 'cemento', 0, 6, 0, 0),
  ('prod-overshark-top-ml-rib--rosado--052', 'prod-overshark-top-ml-rib', 'rosado', 0, 6, 0, 0),
  ('prod-overshark-top-ml-rib--beige--053', 'prod-overshark-top-ml-rib', 'beige', 0, 6, 0, 0),
  ('prod-overshark-top-ml-rib--vino--054', 'prod-overshark-top-ml-rib', 'vino', 0, 6, 0, 0),
  ('prod-overshark-wafle-clasico--beige--055', 'prod-overshark-wafle-clasico', 'beige', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--blanco--056', 'prod-overshark-wafle-clasico', 'blanco', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--rosa--057', 'prod-overshark-wafle-clasico', 'rosa', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--denim--058', 'prod-overshark-wafle-clasico', 'denim', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--negro--059', 'prod-overshark-wafle-clasico', 'negro', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--negro--060', 'prod-overshark-wafle-clasico', 'negro', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--blanco--061', 'prod-overshark-wafle-clasico', 'blanco', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--azul-marino--062', 'prod-overshark-wafle-clasico', 'azul-marino', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--verde-botella--063', 'prod-overshark-wafle-clasico', 'verde-botella', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--rosa--064', 'prod-overshark-wafle-clasico', 'rosa', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--topo--065', 'prod-overshark-wafle-clasico', 'topo', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--vino--066', 'prod-overshark-wafle-clasico', 'vino', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--colegial-2--067', 'prod-overshark-jersey-mc', 'colegial-2', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--beige--068', 'prod-overshark-jersey-mc', 'beige', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--negro--069', 'prod-overshark-jersey-mc', 'negro', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--vino-1--070', 'prod-overshark-jersey-mc', 'vino-1', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--denim--071', 'prod-overshark-jersey-mc', 'denim', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--verde-botella--072', 'prod-overshark-jersey-mc', 'verde-botella', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--colegial-1--073', 'prod-overshark-jersey-mc', 'colegial-1', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--vino-2--074', 'prod-overshark-jersey-mc', 'vino-2', 4, 6, 6, 4),
  ('prod-overshark-wafle-camisero--negro--075', 'prod-overshark-wafle-camisero', 'negro', 2, 4, 4, 2),
  ('prod-overshark-wafle-camisero--blanco--076', 'prod-overshark-wafle-camisero', 'blanco', 2, 4, 4, 2),
  ('prod-overshark-wafle-camisero--vino--077', 'prod-overshark-wafle-camisero', 'vino', 2, 4, 4, 2),
  ('prod-overshark-wafle-camisero--melange--078', 'prod-overshark-wafle-camisero', 'melange', 2, 4, 4, 2),
  ('prod-overshark-wafle-camisero--palo-rosa-1--079', 'prod-overshark-wafle-camisero', 'palo-rosa-1', 2, 4, 4, 2),
  ('prod-overshark-wafle-camisero--palo-rosa-2--080', 'prod-overshark-wafle-camisero', 'palo-rosa-2', 2, 4, 4, 2),
  ('prod-overshark-wafle-camisero--azul-marino--081', 'prod-overshark-wafle-camisero', 'azul-marino', 2, 4, 4, 2),
  ('prod-overshark-wafle-camisero--melange--082', 'prod-overshark-wafle-camisero', 'melange', 2, 4, 4, 2),
  ('prod-overshark-wafle-camisero--blanco--083', 'prod-overshark-wafle-camisero', 'blanco', 2, 4, 4, 2),
  ('prod-overshark-wafle-camisero--negro--084', 'prod-overshark-wafle-camisero', 'negro', 2, 4, 4, 2),
  ('prod-bravos-polera-neru--negro-2--085', 'prod-bravos-polera-neru', 'negro-2', 4, 6, 4, 0),
  ('prod-bravos-polera-neru--azul-marino--086', 'prod-bravos-polera-neru', 'azul-marino', 4, 6, 4, 0),
  ('prod-bravos-polera-neru--vino--087', 'prod-bravos-polera-neru', 'vino', 4, 6, 4, 0),
  ('prod-bravos-polera-neru--colegial--088', 'prod-bravos-polera-neru', 'colegial', 4, 6, 4, 0),
  ('prod-bravos-polera-neru--verde-botella--089', 'prod-bravos-polera-neru', 'verde-botella', 4, 6, 4, 0),
  ('prod-bravos-polera-neru--negro-1--090', 'prod-bravos-polera-neru', 'negro-1', 4, 6, 4, 0),
  ('prod-bravos-polera-neru--perla-1--091', 'prod-bravos-polera-neru', 'perla-1', 2, 3, 2, 0),
  ('prod-overshark-pique-camisero--beige--092', 'prod-overshark-pique-camisero', 'beige', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--azul-marino--093', 'prod-overshark-pique-camisero', 'azul-marino', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--vino--094', 'prod-overshark-pique-camisero', 'vino', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--negro--095', 'prod-overshark-pique-camisero', 'negro', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--perla--096', 'prod-overshark-pique-camisero', 'perla', 2, 4, 4, 2),
  ('prod-bravos-polera-cr--negro-1--097', 'prod-bravos-polera-cr', 'negro-1', 2, 3, 2, 0),
  ('prod-bravos-polera-cr--negro-2--098', 'prod-bravos-polera-cr', 'negro-2', 2, 3, 2, 0),
  ('prod-bravos-polera-cr--colegial--099', 'prod-bravos-polera-cr', 'colegial', 2, 3, 2, 0),
  ('prod-bravos-polera-cr--azul-marino--100', 'prod-bravos-polera-cr', 'azul-marino', 2, 3, 2, 0),
  ('prod-bravos-polera-cr--pacay--101', 'prod-bravos-polera-cr', 'pacay', 2, 3, 2, 0),
  ('prod-bravos-polera-cr--verde-botella--102', 'prod-bravos-polera-cr', 'verde-botella', 2, 3, 2, 0),
  ('prod-bravos-polera-cr--vino--103', 'prod-bravos-polera-cr', 'vino', 2, 3, 2, 0),
  ('prod-overshark-pique-camisero--melange--104', 'prod-overshark-pique-camisero', 'melange', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--azul-marino--105', 'prod-overshark-pique-camisero', 'azul-marino', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--rosa--106', 'prod-overshark-pique-camisero', 'rosa', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--topo--107', 'prod-overshark-pique-camisero', 'topo', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--verde-botella--108', 'prod-overshark-pique-camisero', 'verde-botella', 2, 4, 4, 2),
  ('prod-bravos-polera-neru--negro-2--109', 'prod-bravos-polera-neru', 'negro-2', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--azul-marino--110', 'prod-bravos-polera-neru', 'azul-marino', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--negro-1--111', 'prod-bravos-polera-neru', 'negro-1', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--pacay--112', 'prod-bravos-polera-neru', 'pacay', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--vino--113', 'prod-bravos-polera-neru', 'vino', 4, 2, 4, 0),
  ('prod-overshark-pique-camisero--verde-botella--114', 'prod-overshark-pique-camisero', 'verde-botella', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--pacay--115', 'prod-overshark-pique-camisero', 'pacay', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--rosa--116', 'prod-overshark-pique-camisero', 'rosa', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--denim--117', 'prod-overshark-pique-camisero', 'denim', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--topo--118', 'prod-overshark-pique-camisero', 'topo', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--vino--119', 'prod-overshark-pique-camisero', 'vino', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--melange--120', 'prod-overshark-pique-camisero', 'melange', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--cemento--121', 'prod-overshark-pique-camisero', 'cemento', 2, 4, 4, 2),
  ('prod-bravos-polera-neru--rosa--122', 'prod-bravos-polera-neru', 'rosa', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--denim--123', 'prod-bravos-polera-neru', 'denim', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--beige--124', 'prod-bravos-polera-neru', 'beige', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--pacay--125', 'prod-bravos-polera-neru', 'pacay', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--azul-marino--126', 'prod-bravos-polera-neru', 'azul-marino', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--verde-botella--127', 'prod-bravos-polera-neru', 'verde-botella', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--colegial--128', 'prod-bravos-polera-neru', 'colegial', 4, 2, 4, 0),
  ('prod-bravos-polera-neru--negro--129', 'prod-bravos-polera-neru', 'negro', 4, 2, 4, 0),
  ('prod-overshark-wafle-camisa--negro--130', 'prod-overshark-wafle-camisa', 'negro', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--blanco--131', 'prod-overshark-wafle-camisa', 'blanco', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--vino--132', 'prod-overshark-wafle-camisa', 'vino', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--melange--133', 'prod-overshark-wafle-camisa', 'melange', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--denim--134', 'prod-overshark-wafle-camisa', 'denim', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--pacay--135', 'prod-overshark-wafle-camisa', 'pacay', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--rosa--136', 'prod-overshark-wafle-camisa', 'rosa', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--cemento--137', 'prod-overshark-wafle-camisa', 'cemento', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--azul-marino--138', 'prod-overshark-wafle-camisa', 'azul-marino', 1, 2, 2, 1),
  ('prod-bravos-polera-neru--negro-1--139', 'prod-bravos-polera-neru', 'negro-1', 2, 2, 2, 0),
  ('prod-bravos-polera-neru--blanco--140', 'prod-bravos-polera-neru', 'blanco', 2, 2, 2, 0),
  ('prod-bravos-polera-neru--azul-marino--141', 'prod-bravos-polera-neru', 'azul-marino', 2, 2, 2, 0),
  ('prod-bravos-polera-neru--negro-2--142', 'prod-bravos-polera-neru', 'negro-2', 2, 2, 2, 0),
  ('prod-overshark-wafle-ml--beige--143', 'prod-overshark-wafle-ml', 'beige', 2, 4, 4, 2),
  ('prod-overshark-wafle-ml--colegial-2--144', 'prod-overshark-wafle-ml', 'colegial-2', 2, 4, 4, 2),
  ('prod-overshark-wafle-ml--vino--145', 'prod-overshark-wafle-ml', 'vino', 2, 4, 4, 2),
  ('prod-overshark-wafle-ml--verde-botella--146', 'prod-overshark-wafle-ml', 'verde-botella', 2, 4, 4, 2),
  ('prod-overshark-wafle-ml--azul-marino--147', 'prod-overshark-wafle-ml', 'azul-marino', 2, 4, 4, 2),
  ('prod-overshark-wafle-ml--colegial-1--148', 'prod-overshark-wafle-ml', 'colegial-1', 2, 4, 4, 2),
  ('prod-overshark-pique-chino--negro--149', 'prod-overshark-pique-chino', 'negro', 2, 4, 4, 2),
  ('prod-overshark-pique-chino--blanco--150', 'prod-overshark-pique-chino', 'blanco', 2, 4, 4, 2),
  ('prod-overshark-pique-chino--pacay--151', 'prod-overshark-pique-chino', 'pacay', 2, 4, 4, 2),
  ('prod-overshark-pique-chino--denim--152', 'prod-overshark-pique-chino', 'denim', 2, 4, 4, 2),
  ('prod-overshark-pique-chino--rosa--153', 'prod-overshark-pique-chino', 'rosa', 2, 4, 4, 2),
  ('prod-overshark-pique-chino--cemento--154', 'prod-overshark-pique-chino', 'cemento', 2, 4, 4, 2),
  ('prod-overshark-pique-chino--azul-marino--155', 'prod-overshark-pique-chino', 'azul-marino', 2, 4, 4, 2),
  ('prod-overshark-pique-chino--botella--156', 'prod-overshark-pique-chino', 'botella', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--azul-marino--157', 'prod-overshark-wafle-clasico', 'azul-marino', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--topo--158', 'prod-overshark-wafle-clasico', 'topo', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--negro--159', 'prod-overshark-wafle-clasico', 'negro', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--blanco--160', 'prod-overshark-wafle-clasico', 'blanco', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--vino--161', 'prod-overshark-wafle-clasico', 'vino', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--rosa--162', 'prod-overshark-wafle-clasico', 'rosa', 4, 6, 6, 4),
  ('prod-overshark-baby-ty-mc--negro--163', 'prod-overshark-baby-ty-mc', 'negro', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-mc--blanco--164', 'prod-overshark-baby-ty-mc', 'blanco', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-mc--azul-marino--165', 'prod-overshark-baby-ty-mc', 'azul-marino', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-mc--pacay--166', 'prod-overshark-baby-ty-mc', 'pacay', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-mc--vino--167', 'prod-overshark-baby-ty-mc', 'vino', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-mc--colegial--168', 'prod-overshark-baby-ty-mc', 'colegial', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-mc--denim--169', 'prod-overshark-baby-ty-mc', 'denim', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-mc--beige--170', 'prod-overshark-baby-ty-mc', 'beige', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-mc--cemento-1--171', 'prod-overshark-baby-ty-mc', 'cemento-1', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-mc--cemento-2--172', 'prod-overshark-baby-ty-mc', 'cemento-2', 4, 4, 4, 0),
  ('prod-overshark-baby-ty-ml--negro--173', 'prod-overshark-baby-ty-ml', 'negro', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-ml--blanco--174', 'prod-overshark-baby-ty-ml', 'blanco', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-ml--azul-marino--175', 'prod-overshark-baby-ty-ml', 'azul-marino', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-ml--pacay--176', 'prod-overshark-baby-ty-ml', 'pacay', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-ml--vino--177', 'prod-overshark-baby-ty-ml', 'vino', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-ml--colegial--178', 'prod-overshark-baby-ty-ml', 'colegial', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-ml--denim--179', 'prod-overshark-baby-ty-ml', 'denim', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-ml--beige--180', 'prod-overshark-baby-ty-ml', 'beige', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-ml--cemento-1--181', 'prod-overshark-baby-ty-ml', 'cemento-1', 2, 2, 2, 0),
  ('prod-overshark-baby-ty-ml--cemento-2--182', 'prod-overshark-baby-ty-ml', 'cemento-2', 2, 2, 2, 0),
  ('prod-overshark-jersey-mc--blanco--183', 'prod-overshark-jersey-mc', 'blanco', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--azul--184', 'prod-overshark-jersey-mc', 'azul', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--beige--185', 'prod-overshark-jersey-mc', 'beige', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--vino--186', 'prod-overshark-jersey-mc', 'vino', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--denim--187', 'prod-overshark-jersey-mc', 'denim', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--colegial--188', 'prod-overshark-jersey-mc', 'colegial', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--negro--189', 'prod-overshark-jersey-mc', 'negro', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--verde-botella--190', 'prod-overshark-jersey-mc', 'verde-botella', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--rosa--191', 'prod-overshark-jersey-mc', 'rosa', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--pacay--192', 'prod-overshark-jersey-mc', 'pacay', 4, 6, 6, 4),
  ('prod-overshark-jersey-mc--cemento--193', 'prod-overshark-jersey-mc', 'cemento', 4, 6, 6, 4),
  ('prod-overshark-pique-camisero--blanco--194', 'prod-overshark-pique-camisero', 'blanco', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--melange--195', 'prod-overshark-pique-camisero', 'melange', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--denim--196', 'prod-overshark-pique-camisero', 'denim', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--verde-botella--197', 'prod-overshark-pique-camisero', 'verde-botella', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--negro--198', 'prod-overshark-pique-camisero', 'negro', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--cemento--199', 'prod-overshark-pique-camisero', 'cemento', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--vino--200', 'prod-overshark-pique-camisero', 'vino', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--topo--201', 'prod-overshark-pique-camisero', 'topo', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--pacay--202', 'prod-overshark-pique-camisero', 'pacay', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--negro--203', 'prod-overshark-wafle-clasico', 'negro', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--azul-marino--204', 'prod-overshark-wafle-clasico', 'azul-marino', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--pacay--205', 'prod-overshark-wafle-clasico', 'pacay', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--cemento--206', 'prod-overshark-wafle-clasico', 'cemento', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--denim--207', 'prod-overshark-wafle-clasico', 'denim', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--colegial--208', 'prod-overshark-wafle-clasico', 'colegial', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--blanco--209', 'prod-overshark-wafle-clasico', 'blanco', 4, 6, 6, 4),
  ('prod-bravos-polera-neru--negro-3--210', 'prod-bravos-polera-neru', 'negro-3', 2, 4, 2, 0),
  ('prod-bravos-polera-neru--negro-4--211', 'prod-bravos-polera-neru', 'negro-4', 2, 4, 2, 0),
  ('prod-bravos-polera-neru--negro-1--212', 'prod-bravos-polera-neru', 'negro-1', 2, 4, 2, 0),
  ('prod-bravos-polera-neru--negro-2--213', 'prod-bravos-polera-neru', 'negro-2', 2, 4, 2, 0),
  ('prod-overshark-jersey-ml--colegial--214', 'prod-overshark-jersey-ml', 'colegial', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--verde-botella--215', 'prod-overshark-jersey-ml', 'verde-botella', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--beige--216', 'prod-overshark-jersey-ml', 'beige', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--negro--217', 'prod-overshark-jersey-ml', 'negro', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--pacay--218', 'prod-overshark-jersey-ml', 'pacay', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--azul-marino--219', 'prod-overshark-jersey-ml', 'azul-marino', 2, 4, 4, 2),
  ('prod-overshark-jersey-ml--blanco--220', 'prod-overshark-jersey-ml', 'blanco', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--negro-1--221', 'prod-overshark-jersey-mc', 'negro-1', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--negro-2--222', 'prod-overshark-jersey-mc', 'negro-2', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--azul-marino--223', 'prod-overshark-jersey-mc', 'azul-marino', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--cemento--224', 'prod-overshark-jersey-mc', 'cemento', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--denim-1--225', 'prod-overshark-jersey-mc', 'denim-1', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--denim-2--226', 'prod-overshark-jersey-mc', 'denim-2', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--blanco--227', 'prod-overshark-jersey-mc', 'blanco', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--beige--228', 'prod-overshark-jersey-mc', 'beige', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--vino--229', 'prod-overshark-jersey-mc', 'vino', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--rosa--230', 'prod-overshark-jersey-mc', 'rosa', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--verde-botella--231', 'prod-overshark-jersey-mc', 'verde-botella', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--pacay--232', 'prod-overshark-jersey-mc', 'pacay', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--cemento--233', 'prod-overshark-jersey-mc', 'cemento', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--beige--234', 'prod-overshark-jersey-mc', 'beige', 2, 4, 4, 2),
  ('prod-overshark-jersey-mc--denim--235', 'prod-overshark-jersey-mc', 'denim', 2, 4, 4, 2),
  ('prod-overshark-pique-camisero--azul-marino--236', 'prod-overshark-pique-camisero', 'azul-marino', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--blanco-1--237', 'prod-overshark-pique-camisero', 'blanco-1', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--blanco-2--238', 'prod-overshark-pique-camisero', 'blanco-2', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--denim-1--239', 'prod-overshark-pique-camisero', 'denim-1', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--denim-2--240', 'prod-overshark-pique-camisero', 'denim-2', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--negro--241', 'prod-overshark-pique-camisero', 'negro', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--colegial--242', 'prod-overshark-pique-camisero', 'colegial', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--pacay--243', 'prod-overshark-pique-camisero', 'pacay', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--rosa--244', 'prod-overshark-pique-camisero', 'rosa', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--melange--245', 'prod-overshark-pique-camisero', 'melange', 4, 4, 4, 8),
  ('prod-overshark-pique-camisero--cemento--246', 'prod-overshark-pique-camisero', 'cemento', 4, 4, 4, 8),
  ('prod-overshark-wafle-camisa--negro--247', 'prod-overshark-wafle-camisa', 'negro', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--blanco--248', 'prod-overshark-wafle-camisa', 'blanco', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--azul-marino--249', 'prod-overshark-wafle-camisa', 'azul-marino', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--melange--250', 'prod-overshark-wafle-camisa', 'melange', 1, 2, 2, 1),
  ('prod-overshark-wafle-camisa--beige--251', 'prod-overshark-wafle-camisa', 'beige', 1, 2, 2, 1),
  ('prod-overshark-wafle-clasico--azul-marino--252', 'prod-overshark-wafle-clasico', 'azul-marino', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--melange--253', 'prod-overshark-wafle-clasico', 'melange', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--verde-botella--254', 'prod-overshark-wafle-clasico', 'verde-botella', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--pacay--255', 'prod-overshark-wafle-clasico', 'pacay', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--cemento--256', 'prod-overshark-wafle-clasico', 'cemento', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--denim--257', 'prod-overshark-wafle-clasico', 'denim', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--colegial--258', 'prod-overshark-wafle-clasico', 'colegial', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--rosa--259', 'prod-overshark-wafle-clasico', 'rosa', 4, 6, 6, 4),
  ('prod-overshark-wafle-clasico--negro--260', 'prod-overshark-wafle-clasico', 'negro', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--blanco--261', 'prod-overshark-wafle-clasico', 'blanco', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--azul-marino--262', 'prod-overshark-wafle-clasico', 'azul-marino', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--colegial--263', 'prod-overshark-wafle-clasico', 'colegial', 2, 4, 4, 2),
  ('prod-overshark-wafle-clasico--melange--264', 'prod-overshark-wafle-clasico', 'melange', 2, 4, 4, 2),
  ('prod-overshark-wafle-ml--negro-2--265', 'prod-overshark-wafle-ml', 'negro-2', 3, 6, 6, 0),
  ('prod-overshark-wafle-ml--pacay--266', 'prod-overshark-wafle-ml', 'pacay', 3, 6, 6, 0),
  ('prod-overshark-wafle-ml--azul-marino--267', 'prod-overshark-wafle-ml', 'azul-marino', 3, 6, 6, 0),
  ('prod-overshark-wafle-ml--blanco--268', 'prod-overshark-wafle-ml', 'blanco', 3, 6, 6, 0),
  ('prod-overshark-wafle-ml--rosa--269', 'prod-overshark-wafle-ml', 'rosa', 3, 6, 6, 0),
  ('prod-overshark-wafle-ml--melange--270', 'prod-overshark-wafle-ml', 'melange', 3, 6, 6, 0),
  ('prod-overshark-wafle-ml--colegial--271', 'prod-overshark-wafle-ml', 'colegial', 3, 6, 6, 0),
  ('prod-overshark-wafle-ml--negro-1--272', 'prod-overshark-wafle-ml', 'negro-1', 3, 6, 6, 0),
  ('prod-bravos-polera-neru--melange-3--273', 'prod-bravos-polera-neru', 'melange-3', 2, 4, 2, 0),
  ('prod-bravos-polera-neru--blanco-2--274', 'prod-bravos-polera-neru', 'blanco-2', 2, 4, 2, 0),
  ('prod-bravos-polera-neru--melange-2--275', 'prod-bravos-polera-neru', 'melange-2', 2, 4, 2, 0),
  ('prod-bravos-polera-neru--blanco-1--276', 'prod-bravos-polera-neru', 'blanco-1', 2, 4, 2, 0),
  ('prod-bravos-polera-neru--melange-1--277', 'prod-bravos-polera-neru', 'melange-1', 2, 4, 2, 0),
  ('prod-overshark-wafle-camisero--blanco--278', 'prod-overshark-wafle-camisero', 'blanco', 4, 6, 6, 4),
  ('prod-overshark-wafle-camisero--verde-botella--279', 'prod-overshark-wafle-camisero', 'verde-botella', 4, 6, 6, 4),
  ('prod-overshark-wafle-camisero--pacay--280', 'prod-overshark-wafle-camisero', 'pacay', 4, 6, 6, 4),
  ('prod-overshark-wafle-camisero--topo--281', 'prod-overshark-wafle-camisero', 'topo', 4, 6, 6, 4),
  ('prod-overshark-wafle-camisero--denim--282', 'prod-overshark-wafle-camisero', 'denim', 4, 6, 6, 4),
  ('prod-overshark-wafle-camisero--colegial--283', 'prod-overshark-wafle-camisero', 'colegial', 4, 6, 6, 4),
  ('prod-overshark-wafle-camisero--melange--284', 'prod-overshark-wafle-camisero', 'melange', 4, 6, 6, 4),
  ('prod-overshark-wafle-camisero--azul-marino--285', 'prod-overshark-wafle-camisero', 'azul-marino', 4, 6, 6, 4)
on conflict (id) do nothing;
