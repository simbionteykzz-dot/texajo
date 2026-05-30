-- ============================================================
-- TABLA DE AUDITORÍA — Ejecutar en Supabase Dashboard → SQL Editor
-- Registra creaciones, modificaciones, eliminaciones y sesiones
-- ============================================================

create table if not exists audit_logs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid references auth.users(id) on delete set null,
  user_email   text not null default '',
  user_nombre  text not null default '',
  accion       text not null,  -- 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  entidad      text not null,  -- nombre de la tabla/módulo
  entidad_id   text,           -- id del registro afectado
  entidad_desc text,           -- descripción legible del registro
  valores_ant  jsonb,          -- valores antes del cambio (UPDATE/DELETE)
  valores_new  jsonb           -- valores después del cambio (CREATE/UPDATE)
);

-- Sin RLS igual que el resto del sistema
alter table audit_logs disable row level security;

-- Solo lectura para autenticados, escritura para todos (incluye anon para login/logout)
grant select, insert on table audit_logs to authenticated;
grant insert on table audit_logs to anon;

-- Índices para búsqueda eficiente
create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);
create index if not exists audit_logs_user_id_idx    on audit_logs (user_id);
create index if not exists audit_logs_accion_idx     on audit_logs (accion);
create index if not exists audit_logs_entidad_idx    on audit_logs (entidad);
