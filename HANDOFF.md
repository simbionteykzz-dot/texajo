# HANDOFF — Texajo Sistema de Gestión Textil

**Fecha:** 2026-07-08
**Servidor local:** http://localhost:3000
**Branch:** master

---

## Estado del servidor

El servidor de desarrollo está corriendo en `http://localhost:3000` (Vite 6, React 19 + TypeScript).
El backend proxy de Odoo (Flask) corre en `http://localhost:5001` — ver sección "Stock Odoo" abajo.

---

## Bugs corregidos en esta sesión (2026-07-08)

### 1. "Confirmar avance" de operarios no se guardaba (código 23502)
- **Causa:** `boleta_lineas.id` es `text` **sin** `column_default` (a diferencia de `seguimiento_filas.id`, que sí tiene `gen_random_uuid()`). El insert genérico stripeaba `id` del payload asumiendo que todas las tablas tenían default, dejando `id` en `null`.
- **Fix:** `dbInsert` ahora acepta un flag `keepId`; `db.boleta_lineas.add` lo usa para enviar el `id` (UUID generado en cliente con `newId()`). `addBoletaLineas` en `AppContext.tsx` también reconcilia el id real devuelto por Supabase con el estado local (igual que ya hacía `addCorte`).
- **Ubicación:** `src/lib/supabaseDb.ts` (`dbInsert`, `fromBoletaLineaInsert`, `db.boletaLineas.add`), `src/store/AppContext.tsx` (`addBoletaLineas`)

### 2. "+ Nueva Fila" en Seguimiento Confección fallaba con `invalid input syntax for type integer: "1-C"` (código 22P02)
- **Causa:** en la tabla `seguimiento_filas`, las columnas `corte_id` y `n_corte` estaban **invertidas** respecto al resto del esquema: `corte_id` era `text` y `n_corte` era `integer` (al revés de `cortes`, donde `id` es integer y `n_corte` es text). El código siempre asumió `corte_id: integer` / `n_corte: text`.
- **Efecto colateral:** por este bug de tipos, 47 de 109 filas existentes tenían `corte_id` guardado como el **UUID temporal client-side** (nunca reconciliado al id entero real), apuntando a cortes que ya habían sido eliminados — filas huérfanas.
- **Fix aplicado en Supabase (ejecutado manualmente en el SQL Editor):**
  ```sql
  BEGIN;
  DELETE FROM seguimiento_filas WHERE corte_id !~ '^[0-9]+$';
  ALTER TABLE seguimiento_filas
    ALTER COLUMN corte_id TYPE integer USING corte_id::integer,
    ALTER COLUMN n_corte TYPE text USING n_corte::text;
  COMMIT;
  ```
- **Fix en código:** `DbSeguimiento.id` corregido de `number` a `string` en `src/lib/supabaseDb.ts` (solo anotación de tipos, sin efecto en runtime — pero evita confusión futura).

### 3. Dashboard "Prendas por Hacer" — investigado, no confirmado como bug real
- Se sospechó que sumaba filas de cortes anulados, pero el usuario confirmó que esos cortes no tenían filas de seguimiento asociadas. El cambio especulativo en `Dashboard.tsx` fue revertido. **Sigue pendiente de diagnóstico** si el usuario reporta un número específico incorrecto.

### 4. Stock Odoo — diseño no responsive en móvil
- **Fix:** panel de filtros ahora es un drawer deslizable con backdrop en móvil (antes era un bloque fijo que desordenaba el layout). Tabla de variantes se reemplaza por tarjetas apiladas en pantallas chicas. Botones Excel/PDF agrupados bajo un menú "Exportar".
- **Ubicación:** `src/pages/OdooStock.tsx`

### 5. Stock Odoo — "Failed to fetch" en local
- **Causa:** el backend proxy de Odoo (`backend/odoo_server.py`, Flask en `localhost:5001`) no estaba corriendo, y/o falta la variable de entorno `ODOO_PASS`.
- **Para usarlo en local:** ejecutar `python backend/odoo_server.py` con `ODOO_PASS` configurada en el entorno (no está en `.env` — ese archivo no se carga automáticamente en el script Flask, hay que exportarla en el shell o agregar `python-dotenv` al arranque).
- **Pendiente:** el usuario no confirmó tener la contraseña de Odoo a mano; el proxy sigue sin poder autenticar en este entorno.

---

## Bugs corregidos en sesión anterior (2026-07-07)

### `duplicate key value violates unique constraint "seguimiento_filas_pkey"` (23505)
- `fromSeguimientoFilaInsert` enviaba un `id` entero aleatorio que colisionaba con filas existentes → se eliminó `id` del payload de insert genérico.

### `null value in column "id"` (23502) en `seguimiento_filas`
- `dbInsert` ahora hace destructuring universal `{ id: _id, ...payload }` antes de insertar (con excepción vía `keepId` para tablas sin default, ver bug #1 de arriba).

### `nCorte` con letra sufijo se borraba al editar (ej: `63-B` → `63`)
- Regex de validación no permitía guion + `fromCorte` hacía `parseInt` truncando la letra + columna `n_corte` en `cortes`/`movimientos_tela` era `integer`.
- Fix: regex `^\d+[-]?[A-Za-z]?$` + mappers sin `parseInt` + migración SQL de esas columnas a `text`.

---

## Arquitectura del proyecto

```
React 19 + TypeScript + Vite 6
    ↕ supabase-js
Supabase (PostgreSQL) — tablas principales:
  cortes, seguimiento_filas, movimientos_tela,
  cobros_diarios, movimientos_complemento,
  operarios, boleta_lineas, programas_zurzam, ...

Backend secundario: Flask (backend/odoo_server.py) — proxy XML-RPC a Odoo,
  solo usado por el módulo Stock Odoo (src/pages/OdooStock.tsx)
```

**Capa de datos:** `src/lib/supabaseDb.ts`
**Estado global:** `src/store/AppContext.tsx`
**Páginas principales:** Cortes, InventarioTelas, CobrosEntregas, Complementos, ProgramasZurzam, Destajo, ProduccionConfeccion, OdooStock

---

## Notas para la próxima sesión

- **Verificar tipos de columna antes de asumir el esquema**: esta sesión reveló que `supabase/supabase_schema.sql` (el archivo versionado) está significativamente desactualizado respecto a la DB real — no reflejaba `asignaciones` (jsonb), `pct_avance`, `total_pago`, ni los tipos reales de `id`/`corte_id`/`n_corte`. Ante cualquier error `22P02`/`23502`/`23505`, consultar `information_schema.columns` directamente en Supabase antes de tocar el código.
- El módulo Stock Odoo en local requiere `ODOO_PASS` en el entorno del proceso Flask — pendiente de credenciales.
- Dashboard "Prendas por Hacer": si el usuario reporta un número incorrecto de nuevo, pedir el valor exacto observado y el esperado antes de tocar `Dashboard.tsx`.
