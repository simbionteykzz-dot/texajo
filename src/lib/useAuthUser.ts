import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Rol = 'Super Admin' | 'Administrador General' | 'Supervisor' | 'Encargado de Área' | string;

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  const normalizeRol = (raw: string): Rol => {
    const s = (raw ?? '').trim().toUpperCase();
    if (s === 'SUPER ADMIN') return 'Super Admin';
    if (s === 'ADMINISTRADOR GENERAL') return 'Administrador General';
    if (s === 'SUPERVISOR') return 'Supervisor';
    if (s === 'ENCARGADO DE ÁREA' || s === 'ENCARGADO DE AREA') return 'Encargado de Área';
    return raw;
  };

  const fromSession = (session: { user: { id: string; email?: string; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> } } | null) => {
    if (!session) return null;
    if (!session.user.email_confirmed_at) return null;
    const meta = session.user.user_metadata ?? {};
    const rawRol = (meta.rol as string) || (meta.role as string) || '';
    const emailPrefix = (session.user.email ?? '').split('@')[0];
    return {
      id: session.user.id,
      email: session.user.email ?? '',
      nombre: (meta.nombre as string) || (meta.name as string) || emailPrefix,
      rol: normalizeRol(rawRol) || 'Usuario',
    };
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(fromSession(session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(fromSession(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
