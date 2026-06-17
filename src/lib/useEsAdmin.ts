import { useAuthUser } from './useAuthUser';

export function useEsAdmin(): boolean {
  const user = useAuthUser();
  return user?.rol === 'Super Admin' || user?.rol === 'Administrador General';
}
