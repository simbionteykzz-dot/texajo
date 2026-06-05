-- =============================================================
-- MIGRACIÓN: Agregar proporciones S/M/L/XL a productos existentes
-- Fuente: props.xlsx — proporciones más frecuentes por producto
-- Ejecutar una sola vez contra la DB de producción
-- =============================================================

UPDATE productos SET prop_s=4, prop_m=6, prop_l=6, prop_xl=4 WHERE LOWER(nombre) = 'jersey manga corta';
UPDATE productos SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2 WHERE LOWER(nombre) = 'jersey manga larga';
UPDATE productos SET prop_s=4, prop_m=6, prop_l=6, prop_xl=4 WHERE LOWER(nombre) = 'wafle clasico';
UPDATE productos SET prop_s=3, prop_m=6, prop_l=6, prop_xl=0 WHERE LOWER(nombre) = 'wafle manga larga';
UPDATE productos SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2 WHERE LOWER(nombre) = 'wafle camisero';
UPDATE productos SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2 WHERE LOWER(nombre) = 'pique camisero';
UPDATE productos SET prop_s=0, prop_m=0, prop_l=4, prop_xl=0 WHERE LOWER(nombre) = 'top cero rib';
UPDATE productos SET prop_s=8, prop_m=0, prop_l=0, prop_xl=0 WHERE LOWER(nombre) = 'top mc rib';
UPDATE productos SET prop_s=0, prop_m=6, prop_l=0, prop_xl=0 WHERE LOWER(nombre) = 'top ml rib';
UPDATE productos SET prop_s=4, prop_m=4, prop_l=4, prop_xl=0 WHERE LOWER(nombre) = 'baby ty mc';
UPDATE productos SET prop_s=2, prop_m=2, prop_l=2, prop_xl=0 WHERE LOWER(nombre) = 'baby ty ml';
UPDATE productos SET prop_s=2, prop_m=2, prop_l=2, prop_xl=0 WHERE LOWER(nombre) = 'baby ty cinta mc';
UPDATE productos SET prop_s=2, prop_m=2, prop_l=2, prop_xl=0 WHERE LOWER(nombre) = 'baby ty cinta ml';
UPDATE productos SET prop_s=2, prop_m=3, prop_l=2, prop_xl=0 WHERE LOWER(nombre) = 'poleras cuello redondo';
UPDATE productos SET prop_s=4, prop_m=6, prop_l=4, prop_xl=0 WHERE LOWER(nombre) = 'polera neru';
UPDATE productos SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2 WHERE LOWER(nombre) = 'pique cuello chino';
UPDATE productos SET prop_s=2, prop_m=4, prop_l=4, prop_xl=2 WHERE LOWER(nombre) = 'cuello chino wafle';
UPDATE productos SET prop_s=1, prop_m=2, prop_l=2, prop_xl=1 WHERE LOWER(nombre) = 'wafle camisa';
