Eje-- Tabla para almacenar los permisos configurables por rol
-- Ejecutar en Supabase Dashboard → SQL Editor

create table if not exists permisos_roles (
  rol      text primary key,
  permisos jsonb not null default '{}'::jsonb
);

-- Sin RLS, igual que el resto de tablas del sistema
alter table permisos_roles disable row level security;

-- Acceso para usuarios autenticados
grant select, insert, update, delete on table permisos_roles to authenticated;

-- Valores por defecto para Supervisor
insert into permisos_roles (rol, permisos) values (
  'Supervisor',
  '{
    "dashboard": true,
    "inventario": true,
    "cortes": true,
    "produccion": true,
    "destajo": true,
    "programas": true,
    "cobros": true,
    "complementos": true,
    "catalogos": false,
    "panel": true,
    "configuracion": false
  }'::jsonb
) on conflict (rol) do nothing;

-- Valores por defecto para Encargado de Área
insert into permisos_roles (rol, permisos) values (
  'Encargado de Área',
  '{
    "dashboard": true,
    "inventario": false,
    "cortes": false,
    "produccion": true,
    "destajo": true,
    "programas": false,
    "cobros": false,
    "complementos": false,
    "catalogos": false,
    "panel": true,
    "configuracion": false
  }'::jsonb
) on conflict (rol) do nothing;
