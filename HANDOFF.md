# HANDOFF — Texajo Sistema de Gestión Textil

**Fecha:** 2026-07-07  
**Servidor local:** http://localhost:3000  
**Branch:** master

---

## Estado del servidor

El servidor de desarrollo está corriendo en `http://localhost:3000` (Vite 6, React 19 + TypeScript).

---

## Cambios recientes aplicados (no commiteados)

Los siguientes archivos tienen cambios en el working tree:

### `src/lib/supabaseDb.ts`
- **`DbCorte.n_corte`**: cambiado de `number` → `string` (DB migrada a `text`)
- **`DbMovTela.n_corte`**: cambiado de `number | null` → `string | null`
- **`fromCorte`**: `n_corte` ya no hace `parseInt(v.nCorte)` — pasa `v.nCorte` directo como string
- **`fromSeguimientoFilaInsert`**: eliminado `parseInt` en `n_corte`; también eliminado `id` del payload (lo genera Supabase con `gen_random_uuid()`)
- **`dbInsert`**: strips `id` de todos los payloads de insert universalmente para evitar errores de PK

### `src/pages/Cortes.tsx`
- Regex de validación de `nCorte` actualizada: `^\d+[-]?[A-Za-z]?$` (antes solo `^\d+[A-Za-z]?$`)
- Placeholder del input: `"Ej: 100, 100A ó 100-A"`

### Otros archivos modificados (cambios anteriores, sin relación con las fixes de hoy):
- `src/data.ts`
- `src/hooks/useCorteOperaciones.ts`
- `src/pages/CobrosEntregas.tsx`
- `src/pages/Complementos.tsx`
- `src/store/AppContext.tsx`

---

## Migraciones SQL ejecutadas en Supabase

```sql
-- Ejecutadas manualmente en el SQL Editor de Supabase
ALTER TABLE cortes ALTER COLUMN n_corte TYPE text;
ALTER TABLE movimientos_tela ALTER COLUMN n_corte TYPE text;
-- seguimiento_filas.id ya era text con gen_random_uuid() como default
```

---

## Bugs corregidos en esta sesión

### 1. `duplicate key value violates unique constraint "seguimiento_filas_pkey"` (código 23505)
- **Causa:** `fromSeguimientoFilaInsert` enviaba un `id` entero aleatorio que colisionaba con filas existentes
- **Fix:** Se eliminó `id` del payload de insert; Supabase lo genera automáticamente con `gen_random_uuid()`
- **Ubicación:** `src/lib/supabaseDb.ts` — función `fromSeguimientoFilaInsert` y `dbInsert`

### 2. `null value in column "id" violates not-null constraint` (código 23502)
- **Causa:** Algún path enviaba `id: null` explícito en el insert
- **Fix:** `dbInsert` ahora hace destructuring universal `{ id: _id, ...payload }` antes de insertar

### 3. `nCorte` con letra sufijo se borraba al editar (ej: `63-B` → `63`)
- **Causa triple:**
  1. Regex de validación no permitía guion (`-`)
  2. `fromCorte` hacía `parseInt(v.nCorte)` truncando la letra
  3. La columna `n_corte` en DB era `integer` (no guardaba letras)
- **Fix:** Regex actualizada + mappers sin `parseInt` + migración SQL a `text`

---

## Arquitectura del proyecto

```
React 19 + TypeScript + Vite 6
    ↕ supabase-js
Supabase (PostgreSQL) — tablas principales:
  cortes, seguimiento_filas, movimientos_tela,
  cobros_diarios, movimientos_complemento,
  operarios, boleta_lineas, programas_zurzam, ...
```

**Capa de datos:** `src/lib/supabaseDb.ts`  
**Estado global:** `src/store/AppContext.tsx`  
**Páginas principales:** Cortes, InventarioTelas, CobrosEntregas, Complementos, ProgramasZurzam, Destajo

---

## Próximos pasos sugeridos

1. **Commitear** los cambios actuales (`src/lib/supabaseDb.ts`, `src/pages/Cortes.tsx`)
2. **Probar** creación y edición de corte con nombre `63-B` end-to-end
3. Verificar que el seguimiento de filas del corte `63-B` se guarda correctamente
