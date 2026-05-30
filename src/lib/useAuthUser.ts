import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Rol = 'Administrador General' | 'Supervisor' | 'Encargado de Área' | string;

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  const fromSession = (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
    if (!session) return null;
    const meta = session.user.user_metadata ?? {};
    return {
      id: session.user.id,
      email: session.user.email ?? '',
      nombre: (meta.nombre as string) || (session.user.email ?? '').split('@')[0],
      rol: (meta.rol as string) || 'Usuario',
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
