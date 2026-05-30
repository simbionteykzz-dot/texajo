import { useCallback } from 'react';
import { supabase } from './supabase';
import type { AuthUser } from './useAuthUser';

export type AuditAccion = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';

export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string;
  user_nombre: string;
  accion: AuditAccion;
  entidad: string;
  entidad_id: string | null;
  entidad_desc: string | null;
  valores_ant: Record<string, unknown> | null;
  valores_new: Record<string, unknown> | null;
}

interface LogParams {
  accion: AuditAccion;
  entidad: string;
  entidad_id?: string;
  entidad_desc?: string;
  valores_ant?: Record<string, unknown>;
  valores_new?: Record<string, unknown>;
}

export function useAudit(authUser: AuthUser | null) {
  const log = useCallback(async (params: LogParams) => {
    try {
      await supabase.from('audit_logs').insert({
        user_id:     authUser?.id ?? null,
        user_email:  authUser?.email ?? '',
        user_nombre: authUser?.nombre ?? '',
        accion:      params.accion,
        entidad:     params.entidad,
        entidad_id:  params.entidad_id ?? null,
        entidad_desc: params.entidad_desc ?? null,
        valores_ant: params.valores_ant ?? null,
        valores_new: params.valores_new ?? null,
      });
    } catch {
      // silencioso — el historial no debe romper la operación principal
    }
  }, [authUser]);

  return { log };
}

// Etiquetas legibles por entidad (tabla → nombre en español)
export const ENTIDAD_LABELS: Record<string, string> = {
  telas:                 'Tela',
  colores:               'Color',
  productos:             'Producto',
  clientes:              'Cliente',
  proveedores:           'Proveedor',
  operarios:             'Operario',
  precios_telas:         'Precio Tela',
  precios_complementos:  'Precio Complemento',
  precios_tejeduria:     'Precio Tejeduría',
  tarifas_operaciones:   'Tarifa Operación',
  movimientos_tela:      'Movimiento Tela',
  cortes:                'Corte',
  seguimiento_filas:     'Seguimiento',
  boleta_lineas:         'Boleta',
  descuentos_boleta:     'Descuento Boleta',
  movimientos_complemento: 'Movimiento Complemento',
  cobros_diarios:        'Cobro/Entrega',
  programas_zurzam:      'Programa Zurzam',
  programa_detalles:     'Detalle Programa',
  compras_hilo:          'Compra Hilo',
  stock_extornos:        'Stock Extorno',
  config:                'Configuración',
  session:               'Sesión',
};
