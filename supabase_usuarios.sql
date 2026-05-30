-- ============================================================
-- USUARIOS TEXAJO — Ejecutar en Supabase Dashboard → SQL Editor
-- PASO 1: Actualiza nombre y rol en usuarios ya existentes
-- PASO 2: Crea usuarios nuevos con contraseña y metadata
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PASO 1: Actualizar metadata de usuarios existentes
-- (ejecuta esto primero, no rompe nada si el usuario no existe)
-- ──────────────────────────────────────────────────────────

UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"nombre":"Tino","rol":"Super Admin"}'::jsonb WHERE email = 'tino@texajo-org.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"nombre":"David","rol":"Administrador General"}'::jsonb WHERE email = 'david@texajo-org.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"nombre":"Michael","rol":"Administrador General"}'::jsonb WHERE email = 'michael@texajo-org.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"nombre":"Tomas","rol":"Supervisor"}'::jsonb WHERE email = 'tomas@texajo-org.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"nombre":"Maria","rol":"Supervisor"}'::jsonb WHERE email = 'maria@texajo-org.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"nombre":"Angie","rol":"Encargado de Área"}'::jsonb WHERE email = 'angie@texajo-org.com';
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"nombre":"Chica","rol":"Encargado de Área"}'::jsonb WHERE email = 'chica@texajo-org.com';


-- ──────────────────────────────────────────────────────────
-- PASO 2: Crear usuarios nuevos (solo los que no existan)
-- Supabase requiere insert directo en auth.users con
-- la contraseña hasheada via crypt()
-- ──────────────────────────────────────────────────────────

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  u.email,
  crypt(u.password, gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  u.meta::jsonb,
  now(), now(), '', '', '', ''
FROM (VALUES
  ('tino@texajo-org.com',    '30092023',             '{"nombre":"Tino","rol":"Administrador General"}'),
  ('david@texajo-org.com',   'gerentegeneraltexajo', '{"nombre":"David","rol":"Administrador General"}'),
  ('michael@texajo-org.com', 'overshark-texajo',     '{"nombre":"Michael","rol":"Administrador General"}'),
  ('tomas@texajo-org.com',   '1029410',              '{"nombre":"Tomas","rol":"Supervisor"}'),
  ('maria@texajo-org.com',   '48160641',             '{"nombre":"Maria","rol":"Supervisor"}'),
  ('angie@texajo-org.com',   '89416134',             '{"nombre":"Angie","rol":"Encargado de Área"}'),
  ('chica@texajo-org.com',   '74464613',             '{"nombre":"Chica","rol":"Encargado de Área"}')
) AS u(email, password, meta)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE auth.users.email = u.email
);


-- ──────────────────────────────────────────────────────────
-- PASO 3: Crear identidades para los usuarios nuevos
-- (necesario para que puedan hacer login con email/password)
-- ──────────────────────────────────────────────────────────

INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, created_at, updated_at, last_sign_in_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  'email',
  json_build_object('sub', u.id::text, 'email', u.email)::jsonb,
  now(), now(), now()
FROM auth.users u
WHERE u.email IN (
  'tino@texajo-org.com',
  'david@texajo-org.com',
  'michael@texajo-org.com',
  'tomas@texajo-org.com',
  'maria@texajo-org.com',
  'angie@texajo-org.com',
  'chica@texajo-org.com'
)
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i
  WHERE i.user_id = u.id AND i.provider = 'email'
);
