# mod-calen2107 — Calendario (Simulador de Turnos y Draft de Misiones)

> **Fecha:** 21 de julio de 2026  
> **Ruta UI:** `/calendario`  
> **Agentes:** `reclutador-misiones`, `coagulador-jornada`, `orquestador-temporal`, `extractor-eventos`, `cronista`

---

## Objetivo UX

Convertir el calendario administrativo en un simulador de turnos con tres zooms temporales, mazo lateral de cartas de misión y coagulación HITL. El operador no crea eventos pesados a mano: evalúa huecos, arrastra cartas del mazo y fija bloques con feedback visual Noir. Calendario y Campamento Ludus comparten el mismo SSOT y se sincronizan en tiempo real vía `bumpTemporal()`.

---

## Modelo de datos

### ContextEvent (extendido)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `blockKind` | `IMMUTABLE` \| `ROUTINE` \| `SUGGESTION` | Clasificación mecánica/visual |
| `actionCost` | Int? (1–12) | Gravedad / costo de acción |
| `executionStatus` | `scheduled` \| `confirmed_day` \| `skipped` \| `executed` \| `coagulated` | Estado en el tablero |
| `ecosystemArea` | `legal` \| `salud` \| `finanzas` \| `tecnologia` \| `arte` \| `meta` \| null | Filtro de las 6 áreas |
| `endsAt` | DateTime? | Fin del bloque |
| `durationMin` | Int? | Duración estimada |
| `status` | `proposed` \| `confirmed` \| `rejected` | HITL existente (sin cambios) |
| `pillar` | String | Pilar salud/proyecto (ortogonal a `ecosystemArea`) |

El mazo **no** es tabla: es proyección sobre `PendingTask`, `LudusMicrotask` y `ContextEvent` proposed.

---

## Taxonomía de bloques

| blockKind | Metáfora | Comportamiento |
|-----------|----------|----------------|
| **IMMUTABLE** | Infraestructura fija | Sólido, DnD bloqueado; jornada laboral, reuniones, entregas legales |
| **ROUTINE** | Bucles de vitalidad | Opacidad reducida; confirmar o saltear según el día |
| **SUGGESTION** | Carta de misión | Vive en el mazo hasta coagular en un hueco libre |

### Áreas del ecosistema (`ecosystemArea`)

Legal · Salud · Finanzas · Tecnología · Arte/Entretenimiento · Meta

---

## Flujo de draft y coagulación

```mermaid
flowchart LR
  deck[Mazo lateral] --> select[Seleccionar carta]
  select --> slot[Hueco libre semana/día]
  slot --> coag[POST coagulate]
  coag --> event[ContextEvent coagulated]
  coag --> preview[Preview Puntos de Señal]
  coag --> bump[bumpTemporal]
  bump --> cal[/calendario]
  bump --> camp[/ludus/campamento]
```

1. `reclutador-misiones` arma el mazo desde microtareas, proposed y pendientes.
2. Usuario arrastra o selecciona carta → hueco en vista semanal o diaria.
3. `coagulador-jornada` materializa el bloque (`executionStatus: coagulated`, glow Noir).
4. Preview de Señal = `ceil(actionCost * 0.5)` — anticipación, no acreditación (eso ocurre en Trinchera/asalto).
5. Rutinas: `PATCH` → `confirmed_day` o `skipped`.
6. Cualquier cambio invalida ambas superficies vía Orquestador Temporal.

---

## Tres vistas (zoom de tiempo)

| Vista | Metáfora | Componente |
|-------|----------|------------|
| Mensual | Castillo / Vision Board | `MonthBoard` — hitos, bosses, niebla de guerra |
| Semanal | Campamento / Campaña | `WeekGrid` + `SuggestionDeck` (principal) |
| Diario | Trinchera / Foco Noir | `DayTrinchera` — ayer / hoy / mañana |

---

## Mapa de archivos

```
prisma/schema.prisma
prisma/migrations/20260721130000_calendar_draft_blocks/
lib/calendario/
  constants.ts
  types.ts
  deck.ts
  coagulate.ts
  service.ts
lib/events/types.ts + mappers.ts
lib/temporal/types.ts + queries.ts
app/api/calendario/
  route.ts
  deck/route.ts
  coagulate/route.ts
  blocks/[id]/route.ts
components/temporal/
  week-grid.tsx
  month-board.tsx
  day-trinchera.tsx
  block-chip.tsx
  suggestion-deck.tsx
  view-mode-switch.tsx
components/calendario/
  calendario-workspace.tsx
  calendario-keyboard.tsx
components/ludus/campamento/  → re-exports de temporal
lib/agentes/catalog.ts
```

---

## APIs

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/calendario` | Eventos/bloques por día o rango (`?area=`, `?blockKind=`) |
| GET | `/api/calendario/deck` | Mazo de cartas de misión |
| POST | `/api/calendario/coagulate` | Fijar carta en slot temporal |
| PATCH | `/api/calendario/blocks/[id]` | Actualizar `executionStatus` (rutinas, ejecutado) |

---

## Navegación

- Ruta: `/calendario`
- Hotkey: `Y` (command menu)
- Categoría: `extra` en `lib/navigation/routes.ts`
- Superficie hermana: `/ludus/campamento` (mismos componentes `components/temporal/*`)

---

## Atajos de teclado (Calendario Noir)

| Tecla | Acción |
|-------|--------|
| `1` / `2` / `3` | Vista mensual / semanal / diaria |
| `Enter` | Coagular carta seleccionada en slot activo |
| `S` | Saltear rutina seleccionada |
| `C` | Confirmar rutina del día |
| `F` + área | Filtrar por ecosystemArea |
