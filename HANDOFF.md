# Handoff — Texajo Sistema de Gestión Textil

**Fecha:** 2026-06-16  
**Rama:** `master`  
**Último commit:** `2f72787` — fix: validar colorIds duplicados al guardar corte con múltiples tonalidades

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + TypeScript |
| Estilos | Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL) |
| Backend auxiliar | Flask serverless en Vercel (`/api/`) |
| Deploy | Vercel |
| Repo | https://github.com/simbionteykzz-dot/texajo.git |

---

## Variables de Entorno (`.env` — NO commitear)

```
VITE_SUPABASE_URL=https://gbqujodnryjwqlufhebk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdicXVqb2Rucnlqd3FsdWZoZWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjU1MzMsImV4cCI6MjA5NTY0MTUzM30.JELqH6OxM9GyxKPoUbv3_04zOHYd--Xg6OFFNYH57kU
```

> **IMPORTANTE:** La key debe ser el JWT anon (formato `eyJ...`), NO la Publishable Key (`sb_publishable_...`). La Publishable Key es solo para autenticación de usuarios, no para el cliente JS de Supabase.

---

## Arquitectura de Datos

### Flujo de persistencia

```
Usuario interactúa → AppContext (React state) → supabaseDb.ts → Supabase REST API
                                ↑
                    loadAllFromDb() al iniciar la app
```

- **`src/store/AppContext.tsx`** — Estado global. `makeAdd/makeUpdate/makeDelete` actualizan el estado local y persisten en Supabase en background (fire-and-forget con `.catch(console.error)`).
- **`src/lib/supabaseDb.ts`** — Capa de mapeo snake_case (DB) ↔ camelCase (app). Contiene `loadAllFromDb()` y el objeto `db` con CRUD por entidad.
- **`src/lib/supabase.ts`** — Cliente Supabase inicializado desde env vars.

### Tablas en Supabase

| Tabla | Entidad app |
|-------|------------|
| `productos` | `Producto` |
| `tarifas_operaciones` | `TarifaOperacion` |
| `clientes` | `Cliente` |
| `proveedores` | `Proveedor` |
| `telas` | `Tela` |
| `colores` | `Color` |
| `operarios` | `Operario` |
| `precios_telas` | `PrecioTela` |
| `precios_complementos` | `PrecioComplemento` |
| `precios_tejeduria` | `PrecioTejeduria` |
| `precios_tintoreria` | `PrecioTintoreria` |
| `movimientos_tela` | `MovimientoTela` |
| `cortes` | `Corte` |
| `seguimiento_filas` | `SeguimientoFila` |
| `boleta_lineas` | `BoletaLinea` |
| `descuentos_boleta` | `DescuentoBoleta` |
| `programas_zurzam` | `ProgramaZurzam` |
| `programa_detalles` | `ProgramaDetalle` |
| `compras_hilo` | `CompraHilo` |
| `stock_extornos` | `StockExtorno` |
| `cobros_diarios` | `CobroDiario` |
| `movimientos_complemento` | `MovimientoComplemento` |
| `producto_colores` | `ProductoColor` |
| `config` | `Config` (singleton, id='singleton') |
| `audit_logs` | Log de auditoría automático |

> **Sin RLS** — acceso público con anon key. Todos los usuarios ven y modifican los mismos datos.

---

## Empresas (Odoo)

El módulo `OdooStock` consulta stock directamente a Odoo desde el browser:

| Empresa | ID Odoo |
|---------|---------|
| Overshark | 8 |
| Bravos | 11 |

Box Prime (id 5) fue excluido intencionalmente.

---

## Paleta de Colores (Texajo)

| Token | Valor |
|-------|-------|
| Crema | `#F5F2EA` |
| Verde oscuro | `#173A25` |
| Cobre | `#B66F35` |
| Borde | `#DDD8CF` |
| Muted | `#7A6F67` |

---

## Módulos / Páginas

| Archivo | Módulo |
|---------|--------|
| `Dashboard.tsx` | Panel principal |
| `Catalogos.tsx` | Productos, Tarifas, Clientes, Proveedores, Telas, Colores, Operarios |
| `InventarioTelas.tsx` | Movimientos de tela y stock |
| `Cortes.tsx` | Órdenes de corte |
| `ProduccionConfeccion.tsx` | Seguimiento de confección |
| `Destajo.tsx` | Boletas de destajo |
| `CobrosEntregas.tsx` | Cobros diarios |
| `ProgramasZurzam.tsx` | Programas de tejido/tintorería |
| `Complementos.tsx` | Stock de complementos |
| `OdooStock.tsx` | Stock Odoo (Overshark + Bravos) |
| `TablaTarifas.tsx` | Vista de tarifas |
| `PanelOperativo.tsx` | Panel operario |
| `PanelAdmin.tsx` | Panel administrador |
| `HistorialGeneral.tsx` | Auditoría / historial |
| `Configuracion.tsx` | Config del sistema |
| `Login.tsx` | Autenticación |

---

## Bug Fix Reciente — Destajo: prendas por operario incorrectas

### Síntoma
Cuando dos operarios distintos estaban asignados a tallas diferentes de un mismo color/corte, la vista de Destajo mostraba a cada operario el total de prendas del color completo en vez de solo las prendas de sus tallas.

**Ejemplo:** Corte 58, Blanco 1 — EDWID (M/L/XL = 320) y Alexander (S = 80). Ambos veían 400 prendas.

### Causa
En `Destajo.tsx`, las funciones `tallasDisp`, `tallasFilas` y `cantPrendasReal` filtraban filas de `seguimientoFilas` por `corteId+colorId+tarifaId+confirmado` pero **no verificaban si `b.operarioId` estaba asignado a esa talla**. Resultado: sumaban cantidades de todas las tallas sin importar el operario.

### Fix aplicado (`src/pages/Destajo.tsx`)
Los cuatro lugares donde se calculan tallas y cantidades por operario ahora incluyen:
```ts
const ids = asig.operarioIds?.filter(Boolean).length
  ? asig.operarioIds!.filter(Boolean)
  : (asig.operarioId ? [asig.operarioId] : []);
return ids.includes(b.operarioId);  // filtro clave
```

### Fix también en `src/pages/ProduccionConfeccion.tsx`
- `guardarModalAvance` y `reconstruirBoletasColor` usan `addBoletaLineas` (batch) en vez de `addBoletaLinea` en loop para evitar race conditions en el estado React.

---

## Bug Pendiente — CRÍTICO

### Columna `marca` faltante en tabla `productos`

**Síntoma:** Al crear un producto, el INSERT falla con:
```
POST .../rest/v1/productos 400 (Bad Request)
{"code":"PGRST204","message":"Could not find the 'marca' column of 'productos' in the schema cache"}
```

**Causa:** La tabla `productos` en Supabase no tiene la columna `marca`. El mapper `fromProducto` en `supabaseDb.ts` sí la envía, pero la DB la rechaza.

**Fix — ejecutar en Supabase SQL Editor:**
```sql
ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca text;
```

**Impacto:** Sin este fix, ningún producto nuevo persiste al recargar la página (el INSERT falla en background, el estado local se pierde al refrescar).

---

## Historial de Cambios Recientes

| Commit | Descripción |
|--------|------------|
| (pendiente) | fix: Destajo muestra prendas correctas por operario cuando hay operarios distintos por talla |
| `2f72787` | Fix validar colorIds duplicados al guardar corte con múltiples tonalidades |
| `debb5ad` | PDF hoja seguimiento con paginación automática y tipografía suave |
| `18a7be4` | Fix PDF solo muestra operario si operación está confirmada |
| `48c97c0` | Descuento merma 1% en boleta de destajo |
| `48d3fc5` | Fix props de tonalidad cargan al seleccionar color |
| `5ac2c66` | Refactor seguridad, tipado fuerte y extracción de lógica a hooks |
| `8370ca5` | Fix detección huérfanas incluye operarioId |
| `25e009e` | Fix detección boletas huérfanas no debe exigir colorId |

---

## Notas de Desarrollo

- Los errores de Supabase fallan silenciosamente (solo `console.error`). Si algo no persiste, revisar DevTools → Console buscando `[Supabase] INSERT/UPDATE/DELETE en X falló`.
- `loadAllFromDb()` lanza si fallan las tablas `clientes`, `telas` o `productos` — en ese caso se usa caché local de localStorage (key `texajo_v3`).
- El campo `marca` en Catalogos.tsx usa dropdown Overshark/Bravos (no texto libre) tanto en el form principal como en el inline del modal de Tarifas.
- El formulario inline de nuevo producto en el modal de Tarifas es un `<div>` (no `<form>`) para evitar que el submit burbujee al form padre.
