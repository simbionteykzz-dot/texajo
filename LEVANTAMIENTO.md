# Handoff — Sistema de Gestión Textil Texajo
**Última actualización:** 2026-06-26  
**Stack:** React 19 · TypeScript · Tailwind CSS 4 · Vite 6 · Supabase (PostgreSQL)  
**Repositorio:** `texajo---sistema-de-gestión-textil` · Rama: `master`

---

## 1. Contexto del Negocio

**Texajo** es un taller de confección textil en Lima, Perú. Opera como maquilador: compra hilo, lo envía a tejeduría y tintorería, y entrega prendas confeccionadas a sus clientes. Emite facturas con detracción obligatoria del 10% (régimen peruano).

**Clientes:** OverShark · Bravos  
**Moneda base:** Soles (PEN). Precios de hilo/tej/tint en USD con tipo de cambio congelado por fila al momento del registro.

### Flujo general

```
HILO (compra) → TEJEDURÍA (tela cruda) → TINTORERÍA (tela acabada)
                                                  ↓
                                         STOCK DE TELA
                                                  ↓
                               CORTE → CONFECCIÓN → ENTREGA → COBRO
                                          ↓
                                    DESTAJO (pago operarios)
```

---

## 2. Arquitectura Técnica

### Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript |
| Estilos | Tailwind CSS 4 (con `@tailwindcss/vite`) |
| Build | Vite 6 |
| Router | React Router DOM 7 |
| Backend/BD | Supabase (PostgreSQL + Auth + RLS) |
| Gráficos | Recharts 3 |
| Exportación | jsPDF 4 + jspdf-autotable + xlsx 0.18 |
| Iconos | Lucide React |
| Animaciones | Motion 12 |
| IA (futuro) | @google/genai 1.29 |

### Dependencias clave (`package.json`)

```json
{
  "@supabase/supabase-js": "^2.106.2",
  "react": "^19.0.1",
  "react-router-dom": "^7.15.1",
  "recharts": "^3.8.1",
  "jspdf": "^4.2.1",
  "jspdf-autotable": "^5.0.8",
  "xlsx": "^0.18.5"
}
```

### Estructura de archivos

```
src/
├── App.tsx                    # Router principal, guard de auth, sesión
├── main.tsx                   # Entry point
├── types.ts (460 líneas)      # Todos los tipos e interfaces TypeScript
├── data.ts (598 líneas)       # Mock/seed data inicial (catálogos base)
│
├── pages/                     # 13 páginas (ver §3)
├── components/                # Componentes UI reutilizables
│   ├── Header.tsx             # Barra superior (usuario, menú móvil)
│   ├── Sidebar.tsx            # Navegación lateral
│   ├── ConfirmModal.tsx       # Modal de confirmación genérico
│   ├── BoletaOperario.tsx     # Renderizado boleta PDF (334 líneas)
│   ├── ToastProvider.tsx      # Notificaciones toast
│   ├── ModuleInfoBox.tsx      # Caja de info por módulo
│   └── LogoTexajo.tsx         # Logo SVG animado
│
├── store/
│   └── AppContext.tsx (755 líneas)  # Estado global + CRUD + caché
│
├── hooks/
│   ├── useBoletaLineas.ts     # Filtrado y cálculo de boletas
│   └── useCorteOperaciones.ts # Stock, colores agrupados, descuentos
│
└── lib/
    ├── supabase.ts (396 líneas)      # Cliente Supabase configurado
    ├── supabaseDb.ts (679 líneas)    # Capa de acceso a BD (mappers, CRUD)
    ├── useAuthUser.ts                # Hook usuario autenticado
    ├── usePermisos.ts (3.6KB)        # Permisos por rol (SECCIONES, DEFAULTS)
    ├── useEsAdmin.ts (197 líneas)    # Chequeo de rol admin
    ├── useAudit.ts                   # Registro de auditoría
    ├── export.ts (1291 líneas)       # Exportación XLSX/PDF
    ├── storage.ts                    # Session storage (newId)
    ├── utils.ts (288 líneas)         # cn(), capWords()
    ├── destajo.ts                    # Lógica cálculo destajo
    ├── odooService.ts                # Integración Odoo (async)
    └── odooDirectService.ts          # Integración Odoo (directa)
```

### State Management (AppContext.tsx)

`AppContext` centraliza todo el estado. Contiene 20+ arrays de entidades. El flujo de datos es:

```
Supabase (BD) ↔ AppContext (estado React + localStorage) ↔ Páginas/Componentes
```

- **Caché local:** `localStorage` con clave `texajo_v3`. Se rellena al inicio desde Supabase.
- **Retry exponencial** para tablas críticas (clientes, telas, productos).
- **Seed automático:** Si las tablas están vacías al iniciar, siembra `data.ts`.
- **Funciones de acción:** `add*`, `update*`, `delete*` para cada entidad — escriben en Supabase y actualizan el estado local.

### Capa de datos (supabaseDb.ts)

Contiene los mappers `snake_case` (DB) ↔ `camelCase` (App). Patrón:
```typescript
// DB: precio_kg_soles → App: precioKgSoles
// DB: categoria → App: categoria (mismo nombre en tipos de tela)
```
**Fix conocido (commit 6d28c56):** Mappers corregidos para `precios_tejeduria` y `precios_telas` (campos `precio_kg_soles`, `categoria`).

---

## 3. Páginas y Módulos

### Mapa de navegación

| # | Página | Archivo | LOC | Estado |
|---|--------|---------|-----|--------|
| 1 | Dashboard | `Dashboard.tsx` | 606 | ✅ Completo |
| 2 | Inventario Telas | `InventarioTelas.tsx` | 749 | ✅ Completo |
| 3 | Cortes | `Cortes.tsx` | 1767 | ✅ Completo |
| 4 | Producción / Confección | `ProduccionConfeccion.tsx` | 1878 | ✅ Completo |
| 5 | Destajo | `Destajo.tsx` | 2251 | ✅ Completo |
| 6 | Programas Zurzam | `ProgramasZurzam.tsx` | 977 | ✅ Completo |
| 7 | Cobros y Entregas | `CobrosEntregas.tsx` | 680 | ✅ Completo |
| 8 | Catálogos | `Catalogos.tsx` | 1360 | ✅ Completo |
| 9 | Tabla de Tarifas | `TablaTarifas.tsx` | 1219 | ✅ Completo |
| 10 | Complementos | `Complementos.tsx` | 434 | ✅ Completo |
| 11 | Stock Odoo | `OdooStock.tsx` | 963 | ✅ Completo |
| 12 | Panel Admin | `PanelAdmin.tsx` | ~100 | ✅ Completo |
| 13 | Historial General | `HistorialGeneral.tsx` | 305 | ✅ Completo (Super Admin) |
| 14 | Login | `Login.tsx` | — | ✅ Completo |
| 15 | Configuración | `Configuracion.tsx` | — | ✅ Completo |

### Descripción funcional por módulo

#### Dashboard
KPIs en tiempo real: stock total/crítico/bajo, cortes activos, operarios, cobros pendientes. Gráficos históricos (Recharts). Últimos movimientos de tela. Desglose de programas Zurzam por etapa. Cards de acceso rápido a módulos.

#### Inventario Telas
CRUD de movimientos: `INGRESO · A_CORTE · A_REPROCESO · DE_REPROCESO · MUESTRA · AJUSTE_POS · AJUSTE_NEG`. Matriz de stock por tela × color (rollos actuales vs comprometidos). Alertas crítico/bajo según umbrales de configuración. Auto-rellena precio según tela + categoría de color. Exportación XLSX/PDF.

**Regla crítica:** NUNCA borrar movimientos. Errores se corrigen con `AJUSTE_NEG`.

#### Cortes
CRUD de cortes multi-color (array `coloresDetalle`). Soporte de tonalidades (Negro, Negro 2, Negro 3…). Al guardar: descuenta inventario automáticamente (nueva fila `A_CORTE` en `movimientos_tela`) y crea filas de seguimiento por talla × color × operación. Tiempos de inicio/fin. Estados: `EN_PROCESO · COMPLETADO · ANULADO`. Tabla agrupada por color base con rowSpan expandible.

**Regla:** Un N° CORTE puede tener múltiples colores (varias filas). `total_prendas_corte` = suma de todas las filas del mismo `numero_corte`.

#### Producción Confección
Seguimiento de filas por (corte + talla + color). Asignación multi-operario (`operarioIds[]`; el pago se divide si hay más de uno). % de avance (0–100), estado `PENDIENTE · LISTO · PAGADO`. Al confirmar asignación → crea automáticamente `BoletaLinea`. Exportación PDF de hoja de seguimiento con paleta de 20+ colores dinámicos.

#### Destajo ⭐ módulo más complejo
4 tabs: **Boleta Personal** · **Resumen Mensual** · **Vista General** · **Por Corte**.  
- Filtro por operario × período (mes YYYY-MM) o rango de fechas.
- Descuentos: `ADELANTO · CAFETÍN · PRÉSTAMO · FALTA · OTRO` (modal + eliminar).
- Boletas huérfanas (líneas sin confirmación de seguimiento).
- Creación bulk multi-operario (formulario dinámico por operario, validación corte × tarifa × cantidad).
- Exportación PDF de boleta individual (`BoletaOperario.tsx`).
- Edición inline de cantidad + estado de pago.

**Regla boleta:** Descuento 1% sobre BRUTO, aplicado antes que los demás descuentos. Liquidación semanal.

#### Programas Zurzam
Ciclo de vida: `NUEVO → EN_COMPRA → EN_TEJEDURÍA → EN_TINTORERÍA → EN_PLANTA → CERRADO`.  
Detalle por color: kg enviados/retornados, precio, tipo de cambio congelado, costo calculado.  
Servicios tintorería: `REACTIVO · DIRECTO · PPT · LAVADO · TERMOFIJADO · COMPACTADO_EN_RAMA`.  
Compra de hilo con tracking de diferencia (real vs presupuestado), pagos y saldos.  
Stock extorno de conos sobrantes (marcable como "usado" si se reutiliza).  
Precios sugeridos según categoría de color seleccionado.

**Reglas de cálculo:**
- Tejeduría cobra por kg **RETORNADOS** (no enviados)
- Tintorería cobra por kg **RETORNADOS** según servicio
- `costo_kg_tela = costo_total / kg_tint_retornado`
- `comision_jose = kg_tint_retornado × S/.0,30`
- TC se congela por fila al momento del registro

#### Cobros y Entregas
CRUD de cobros. Auto-rellena desde N° Corte (cliente, producto, color, cantidades). Cálculos automáticos: `bruto = totalPrendas × precioUnit`, `detraccion = bruto × 10%`, `disponible = bruto × 90%`. Dashboard mensual por producto y por cliente. Gráfico de tendencia. Estados: `PENDIENTE · COBRADO · ANULADO`. Exportación XLSX.

#### Catálogos
9 tabs: **Productos · Telas · Colores · Operarios · Tarifas · Clientes · Proveedores · Precios Tej. · Props × Color**.

- **Colores:** Categoría (`OSCURO · CLARO · MELANGE · PPT`), prioridad 1–99. "Agregar Tonalidad" incrementa número automáticamente (Negro → Negro 2).
- **Props × Color:** Importa proporciones por talla desde Google Sheets CSV. Parser robusto (campos con espacios, decimales). Upsert en lotes de 50. Matching: exacto primero, luego nombre base.
- **Productos:** Nombre, costo MO, precio venta, tela referencia, límites consumo/rendimiento.
- **Tarifas:** Por producto + orden secuencial de operación.

**Debug pendiente:** `console.warn('[ImportarCSV] Errores:', errors)` visible en consola — `Catalogos.tsx` ~línea 239.

#### Panel Admin
Gestión de permisos por rol (Supervisor, Encargado de Área). 12 secciones configurables. Botones reset a defaults y marcar todos. Upsert en BD.

#### Historial General (Super Admin)
Log de todas las operaciones del sistema vía `audit_logs`: usuario, acción, entidad, timestamp. Filtros por usuario, acción y rango de fecha.

#### Stock Odoo
Lectura de stock remoto desde Odoo (HTTP). Comparación con stock local Texajo. Reconciliación visual de diferencias.

---

## 4. Base de Datos — Tablas Supabase

**Total: 23+ tablas.** PK pattern: SERIAL. Timestamps: `created_at`, `updated_at` (TIMESTAMPTZ). JSON fields: `colores_detalle` en cortes, `asignaciones` en seguimiento_filas.

### Catálogos maestros (7 tablas)

| Tabla | Descripción |
|-------|-------------|
| `clientes` | OverShark, Bravos |
| `proveedores` | Tipos: TELA · COMPLEMENTO · HILO · SERVICIO · ZURZAM |
| `telas` | Catálogo con composición y kg/rollo (default 20 kg) |
| `colores` | 27+ colores, categoría, prioridad |
| `productos` | 18 prendas, precio venta, tela ref, límites consumo/rendimiento |
| `operarios` | 24 activos, código + nombre completo |
| `config` | Key-value: TC, detracción, IGV, umbrales, márgenes, mermas, comisión |

### Precios (4 tablas)

| Tabla | Descripción |
|-------|-------------|
| `precios_telas` | Por (tela + categoría color) → S/./kg |
| `precios_complementos` | Por (tipo + origen + talla) → S/./unidad |
| `precios_tejeduria` | Por tipo tejido → S/./kg |
| `precios_tintoreria` | Por (servicio + tipo tejido) → S/./kg |

### Operaciones y tarifas (2 tablas)

| Tabla | Descripción |
|-------|-------------|
| `tarifas_operaciones` | Por (producto + operación), con orden secuencial |
| `producto_colores` | Proporciones por (producto + color) para cada talla S/M/L/XL |

### Inventario (2 tablas)

| Tabla | Descripción |
|-------|-------------|
| `movimientos_tela` | INGRESO · A_CORTE · A_REPROCESO · DE_REPROCESO · MUESTRA · AJUSTE_POS · AJUSTE_NEG |
| `movimientos_complemento` | INGRESO · CONSUMO · AJUSTE_POS · AJUSTE_NEG |

### Producción (4 tablas)

| Tabla | Descripción |
|-------|-------------|
| `cortes` | Órdenes de corte multi-color con tendidas, mts, proporciones |
| `seguimiento_filas` | Por (corte + talla + color), asignaciones operario |
| `boleta_lineas` | Líneas de pago destajo por operario |
| `descuentos_boleta` | Adelantos, préstamos, faltas, cafetín por operario |

### Programas Zurzam (4 tablas)

| Tabla | Descripción |
|-------|-------------|
| `programas_zurzam` | Ciclo hilo → tejeduría → tintorería |
| `programa_detalles` | Detalle por color con costos y KG |
| `compras_hilo` | Compras con tracking pago real vs presupuesto |
| `stock_extornos` | Conos sobrantes de tejeduría |

### Comercial y auditoría (3 tablas)

| Tabla | Descripción |
|-------|-------------|
| `cobros_diarios` | Facturas con detracción automática |
| `audit_logs` | Log completo de acciones del sistema |
| `permisos_roles` | Permisos por rol y sección (upsert desde Panel Admin) |

---

## 5. Permisos y Roles

Hook principal: `usePermisos.ts` + `useEsAdmin.ts`.

**Regla central:**
- **Supervisores:** Pueden CREAR pero NO editar/eliminar.
- **Admins/Super Admins:** CRUD completo.

12 secciones configurables: Dashboard · Inventario · Cortes · Confección · Destajo · Programas · Cobros · Complementos · Catálogos · Tarifas · Stock Odoo · Configuración.

Los defaults por rol están en `usePermisos.ts`. Los overrides se guardan en la tabla `permisos_roles` y se leen al iniciar sesión.

---

## 6. Catálogos de Negocio

### Colores (30 en LEVANTAMIENTO original, ~27 activos en BD)

| Categoría | Servicio Tintorería | Colores típicos |
|-----------|-------------------|----------------|
| OSCURO | REACTIVO | Negro, Marino, Vino, Botella, Colegial, Marrón, Acero, Azul, Hoja… |
| CLARO | DIRECTO | Beige, Topo, Cemento, Pacay, Denim, Palo Rosa, Camote, Rosado, Plomo, Pumice… |
| PPT | PPT | Perla, Blanco |
| MELANGE | LAVADO | Melange |

### Productos (18 activos)

| Producto | Costo MO S/. | Precio Venta S/. | Tela Base |
|---------|-------------|-----------------|-----------|
| jersey manga corta | 0,95 | 1,70 | jersey 30/1 |
| jersey manga larga | 1,00 | 2,00 | jersey 30/1 |
| wafle clasico | 0,95 | 1,70 | wafle 30/1 |
| wafle manga larga | 1,00 | 2,00 | wafle 30/1 |
| wafle camisero | 1,96 | 4,00 | wafle 30/1 |
| pique camisero | 1,96 | 4,00 | pique 30/1 |
| top cero rib | 0,74 | 1,10 | jersey 30/1 |
| top mc rib | 0,80 | 1,70 | jersey 30/1 |
| top ml rib | 0,85 | 1,70 | jersey 30/1 |
| baby ty mc | 0,76 | 1,70 | jersey 30/1 |
| baby ty ml | 0,83 | 1,70 | jersey 30/1 |
| Baby Tee con S | 0,64 | 1,70 | jersey 30/1 |
| Baby Tee M/L S | 0,74 | 1,70 | jersey 30/1 |
| polera neru | 3,32 | 6,00 | french terry 24/1 |
| polera boxy | 1,66 | 4,00 | french terry 24/1 |
| pique cuello chino | 1,53 | (pendiente) | pique 30/1 |
| wafle camisa | 1,91 | (pendiente) | wafle 30/1 |
| cuello chino wafle | — | — | wafle 30/1 |

### Telas (catálogo con kg/rollo)

| Tela | Composición | KG/Rollo |
|------|------------|---------|
| jersey 30/1 | Policotton 60/40 | 20 |
| pique 30/1 | Policotton | 20 |
| wafle 30/1 | Policotton | 20 |
| french terry 24/1 | Policotton | 20 |
| rib 1x1 | Algodón sin lycra | 20 |
| rib 2x1 lycrado | Con lycra | 20 |
| jersey full lycra 30/1 | 65% poly 31% cotton 4% spandex | 20 |
| interlock 50/1 pima | Algodón pima 100% | 20 |

### Precios de tela por categoría (S/./kg)

| Tela | OSCURO | CLARO | MELANGE | PPT |
|------|--------|-------|---------|-----|
| jersey 30/1 | 24,00 | 21,00 | 18,00 | 18,00 |
| pique 30/1 | 24,00 | 21,00 | 18,00 | 18,00 |
| wafle 30/1 | 26,00 | 22,50 | 19,00 | 19,00 |
| french terry 24/1 | 24,00 | 21,00 | 18,00 | 18,00 |
| rib 1x1 | 24,00 | 21,00 | 18,00 | 18,00 |
| rib 2x1 lycrado | 24,00 | 21,00 | 18,00 | 18,00 |
| jersey full lycra 30/1 | 26,00 | 22,50 | 19,00 | 19,00 |
| interlock 50/1 pima | 35,00 | 35,00 | 36,00 | 38,00 |

### Configuración global (tabla `config`, key-value)

| Parámetro | Valor actual |
|-----------|-------------|
| tipo_cambio_usd | 3,50 |
| detraccion_pct | 10% |
| igv_pct | 18% |
| margen_objetivo_pct | 40% |
| merma_tej_estandar | 0,5% |
| merma_tej_max | 1,0% |
| merma_tint_estandar | 5,0% |
| merma_tint_max | 7,0% |
| comision_jose_kg | 0,30 S/. |
| kg_por_rollo_default | 20 |
| umbral_critico_rollos | 5 |
| umbral_bajo_rollos | 15 |
| merma_estandar_corte | 15% |

---

## 7. Flujos de Negocio Clave (implementados)

### Flujo crear corte (Cortes.tsx)
1. Formulario con N° corte, cliente, producto, color(es), tendidas, metros, proporciones S/M/L/XL
2. `addCorte()` → INSERT en `cortes`
3. `makeDescontarInventario()` → nueva fila `A_CORTE` en `movimientos_tela`
4. `makeCrearFilasSeguimiento()` → filas en `seguimiento_filas` por talla × color
5. AppContext actualiza estado → Dashboard se refresca

### Flujo confirmar seguimiento (ProduccionConfeccion.tsx)
1. Operario asignado(s) + confirmación en modal
2. `updateSeguimientoFila()` con `confirmado: true`
3. Trigger automático → `addBoletaLinea()` por tarifa

### Flujo generar boleta (Destajo.tsx)
1. Agrupa `boleta_lineas` + `descuentos_boleta` por operario × período
2. Calcula: `descuento_1pct = bruto × 0,01`
3. `neto = bruto − adelantos − cafetín − préstamos − faltas − descuento_1pct`
4. Exporta PDF via `BoletaOperario.tsx` (jsPDF)

### Flujo programa Zurzam (ProgramasZurzam.tsx)
1. Crear programa (`NUEVO`) con tipo hilo, kg, cliente
2. Registrar compras de hilo → `compras_hilo` (precio USD + TC congelado)
3. Enviar a tejeduría → registrar kg enviados/retornados + precio (TC congelado)
4. Enviar a tintorería → registrar kg enviados/retornados + precio por servicio
5. Calcular costo/kg = costo_total / kg_retornados_tint
6. Cerrar programa → estado `CERRADO`, costo congelado definitivamente

---

## 8. Integraciones Externas

### Supabase
- **Auth:** email/password. Hook `useAuthUser.ts`.
- **RLS:** políticas por rol. Tabla `permisos_roles`.
- **Auditoría:** `audit_logs` con usuario, acción, entidad, timestamp.

### Google Sheets → CSV (Catálogos › Props × Color)
- URL pública de la hoja en formato CSV
- Parser robusto: campos con espacios, decimales coma/punto
- Upsert en lotes de 50 en `producto_colores`
- Matching: exacto primero, luego nombre base (Negro → Negro 1, Negro 2…)

### Odoo (OdooStock.tsx)
- Lectura HTTP de stock remoto
- Comparación visual con stock local
- `odooService.ts` (async) + `odooDirectService.ts` (directa)

---

## 9. Bugs y Deuda Técnica Conocida

| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `Catalogos.tsx` | ~239 | `console.warn('[ImportarCSV] Errores:', errors)` — debug visible en producción |
| `App.tsx` | ~121–143 | Bloque LOGIN posiblemente duplicado — revisar |
| `supabaseDb.ts` | 62 | `precio_kg_soles` no existe en tipo `DbPrecioTej` — error TS pre-existente |
| `usePermisos.ts` | 37, 53 | `panel` no existe en `PermisosRol` — error TS pre-existente |
| `AppContext.tsx` | 415 | Conversión de tipo `T[]` en `makeUpdate` — error TS pre-existente |

---

## 10. Convenciones del Código

- **Mappers:** snake_case en BD ↔ camelCase en la app. Todos en `supabaseDb.ts`.
- **Permisos:** `useEsAdmin()` devuelve `boolean`. Supervisores: pueden crear, no editar/eliminar.
- **capWords:** función centralizada en `utils.ts` (commit `dc000f6`). Normaliza texto a Title Case.
- **tarifaId / operarioId:** Normalizados a `string` al leer asignaciones desde BD (commit `f4583da`).
- **IDs de programa:** string libre (ej: "PIQUE-001"), no UUID.
- **Exportación:** Toda la lógica en `export.ts`. Fuentes embebidas en `lib/fonts/`.
- **Paleta de colores UI:** 20+ colores dinámicos mapeados por nombre de color. Definidos en `ProduccionConfeccion.tsx`.
- **colorMap:** `_dup_*` son colores duplicados en BD. Se resuelven automáticamente en UI via lógica de 4 passes (ver §12).

---

## 11. Pendientes Formales

- [ ] Limpiar `console.warn` en `Catalogos.tsx` ~línea 239
- [ ] Verificar y resolver posible duplicación en `App.tsx` ~línea 121
- [ ] Redactar `supabase_schema.sql` completo desde el código (para reproducir la BD desde cero)
- [ ] Redactar `seed_datos.sql` con catálogos iniciales canonizados
- [ ] Precios de venta pendientes: `pique cuello chino` y `wafle camisa`

---

## 12. Historial de Cambios Relevantes

### 2026-06-26 — Resolución automática de colores `_dup_*` en UI

**Problema:** Nombres de color internos como `_dup_Topo_68` o `_dup_59` aparecían visibles en Cortes, Producción Confección y Destajo, en lugar del nombre canónico (ej: "Topo").

**Causa raíz:** La tabla `colores` en Supabase acumula registros con nombre `_dup_N` (formato viejo, ID numérico) o `_dup_NOMBRE_id` (formato nuevo) cuando se crean colores duplicados. El `colorMap` de cada página simplemente hacía `new Map(colores.map(c => [c.id, c.nombre]))` sin resolución.

**Solución:** `colorMap` reescrito con lógica de 4 passes en `Cortes.tsx`, `ProduccionConfeccion.tsx` y `Destajo.tsx`:
1. **Pass 1 — Nombre canónico directo:** Si el nombre está en `mockColores` → usar tal cual.
2. **Pass 2 — Regex `_dup_NOMBRE_id`:** Extraer el nombre embebido y verificarlo contra el catálogo canónico.
3. **Pass 3 — Tonalidad del corte (a–e):** Para `_dup_N` sin nombre: buscar en `corte.tonalidad`, `coloresDetalle[].tonalidad` (entrada exacta y cualquier entrada), color principal del corte ya resuelto. Coincidencia parcial incluida (ej: "Azul Marino Tn-2" → "Azul Marino").
4. **Pass 4 — Fallback limpio:** Si aún queda `_dup_*`, mostrar "Color 68" o "Color" en lugar del string interno.

**Archivos modificados:**
- `src/pages/Cortes.tsx` — `colorMap` completamente reescrito (antes solo mapeaba nombres crudos)
- `src/pages/ProduccionConfeccion.tsx` — Passes 3c–3e y Pass 4 añadidos
- `src/pages/Destajo.tsx` — Passes 3c–3e y Pass 4 añadidos

### 2026-06-25 — `updateColor` retorna Promise real

**Problema:** `makeUpdate` en AppContext retorna `void`, por lo que `await updateColor()` no esperaba la escritura en Supabase. Causaba 409/23505 (duplicate key) al ejecutar `handleResetColores` en paralelo.

**Solución:** `updateColor` reescrito en `AppContext.tsx` con implementación directa que retorna `Promise<void>` desde `db.colores.update()`.

### 2026-06-25 — Fix UUID en columna integer de Supabase

**Problema:** Colores creados localmente con `newId()` (formato UUID) no existen en Supabase (que usa `id` INTEGER). `handleResetColores` enviaba estos IDs a Supabase generando error 400/22P02.

**Solución:** Función `esUUID()` en `InventarioTelas.tsx` filtra IDs con formato UUID antes de cualquier operación Supabase.

---

_Documento mantenido por Claude Code. Última actualización: 2026-06-26._
