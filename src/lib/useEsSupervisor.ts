import { useAuthUser } from './useAuthUser';

export function useEsSupervisor(): boolean {
  const user = useAuthUser();
  return user?.rol === 'Supervisor';
}
