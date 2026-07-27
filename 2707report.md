# 2707report — Flujo de datos: Génesis → Personas · Proyectos · Grafos

> **Fecha:** 27 de julio de 2026  
> **Propósito:** Documento de handoff para otra IA / profesional. Describe cómo fluye la información desde el Protocolo Génesis (onboarding) hasta las vistas operativas, tras las correcciones de coagulación automática del Observador.  
> **Ámbito:** onboarding (`/yo`), CRM Personas, Atanor Proyectos, Knowledge Graph (`/grafo`), flag `reconocido`, refresh de UI.  
> **Complementa:** `reporte2107.md` (módulos Personas/Proyectos/Enciclopedia/Molecular/Calibrador). Este documento es la fuente de verdad del **cableado de datos** post-fix 27/07.

---

## Índice

1. [Principio operativo](#1-principio-operativo)
2. [Protocolo Génesis (onboarding)](#2-protocolo-génesis-onboarding)
3. [Modelo de coagulación (`reconocido`)](#3-modelo-de-coagulación-reconocido)
4. [Personas](#4-personas)
5. [Proyectos](#5-proyectos)
6. [Grafos](#6-grafos)
7. [Refresh de UI (bus de dominio)](#7-refresh-de-ui-bus-de-dominio)
8. [Inventario de archivos clave](#8-inventario-de-archivos-clave)
9. [Invariantes y anti-patrones](#9-invariantes-y-anti-patrones)
10. [Anexo — prompt para otra IA](#10-anexo--prompt-para-otra-ia)

---

## 1. Principio operativo

Deprocast distingue dos orígenes de conocimiento:

| Origen | Ejemplos | Tratamiento |
|--------|----------|-------------|
| **Observador** (acción humana directa) | Alta en `/personas`, crear/activar proyecto, Consagración (Génesis) | **Coagulación inmediata** → `reconocido: true`. Aparece en listas verificadas y grafos sin HITL adicional. |
| **IA / extracción automática** | Purifier, `motor-kg`, stubs de incubadora, ingest documental LLM | **Pendiente** → `reconocido: false` (o `EntityCandidate`). Entra a Candidatas / triage hasta promote/approve. |

Regla corta: *la IA propone; el Observador confirma* — excepto cuando el Observador **escribe él mismo**, en cuyo caso la escritura ya es la confirmación.

Persistencia: Prisma/SQLite (`KgNode`, `KgEdge`, `Yo`, CRM tipado) + filesystem Markdown (`data/projects/{campo}/*.md`). No hay Zustand ni localStorage para el dominio core.

---

## 2. Protocolo Génesis (onboarding)

No existe carpeta `onboarding`. El flujo vive en **`/yo`** (Consagración / Protocolo Génesis).

**Estados:** `PENDING_NAMES` → `PENDING_MISSIONS` → `COMPLETED`.

Hasta `COMPLETED`, `genesis-gate` restringe navegación al resto de la app.

### 2.1 Mapa de misiones → persistencia

| Paso | UI | Persistencia | ¿Visible en personas / proyectos / grafos? |
|------|-----|--------------|--------------------------------------------|
| **Bautismo** | Terminal: nombre Operador + Exocórtex | `Yo.operatorName`, `Yo.exocortexName`; hub `KgNode` persona del Operador (`reconocido: true`) | Operador sí (hub de grafos). Exocórtex solo en Yo (no es nodo KG). |
| **Misión I — Nosce** | Overlay ADN | `Yo.calibration`: `consecration_exoesqueleto`, `consecration_prima_materia`, `consecration_esperanza` (propósito / expectativa) | Solo telemetría Yo / HUD. No crea nodos KG. |
| **Misión II — Senado** | Overlay alta persona + vínculo | `createPersonaWithRelations` → `KgNode` persona + `PersonToPerson` + `KgEdge`, todos `reconocido: true`, anclados al Operador | **Sí** — lista verificada + grafo personas + grafo general |
| **Misión III — Prima Materia** | Overlay objetivo 90 días | `bootstrapGenesisProject`: crea `.md` en Atanor (campo `babel`), ingesta KG **estructurada** con `reconocido: true`, vincula Operador↔proyecto (`PersonToProject` + `KgEdge` `responsable_de`). Marca `calibration.consecration_prima_objetivo` | **Sí** — `/proyectos` + nodos/aristas en grafos. **Ya no** queda solo como `ProjectProposal` pendiente. |

### 2.2 Archivos Génesis

| Path | Rol |
|------|-----|
| `components/yo/yo-command-center.tsx` | Orquesta terminal → Tabula → HUD |
| `components/yo/mission-board.tsx` | Tres misiones |
| `components/yo/mission-persona-overlay.tsx` | Senado |
| `components/yo/mission-project-overlay.tsx` | Prima Materia |
| `lib/yo/store.ts` | `baptizeOperator`, `saveNosce…`, `savePrimaMissionObjective` |
| `lib/yo/operator-node.ts` | Hub Operador en KG |
| `lib/projects/genesis-bootstrap.ts` | Crear proyecto real + sellar KG + link Operador |
| `lib/yo/consecration.ts` | Progreso derivado (conteo personas / flag misión III) |

### 2.3 Cambio crítico (27/07)

Antes: Prima Materia solo hacía `createProposal({ status: "pending" })` → el usuario no veía el proyecto en Atanor ni en grafos.

Ahora: `savePrimaMissionObjective` → `bootstrapGenesisProject` → proyecto Markdown + KG coagulado + vínculo al hub.

La ingesta de Génesis usa `structuredOnly: true` (sin LLM) para no bloquear el onboarding si Vertex/Cohere no está disponible.

---

## 3. Modelo de coagulación (`reconocido`)

### 3.1 Gate de visibilidad

| Superficie | Filtro |
|------------|--------|
| Lista Personas (`status=verified`) | `KgNode.type === "persona"` **y** `reconocido === true` |
| Grafo Personas | Personas con `reconocido: true` (proyectos en modo mixed: ver `lib/personas/graph.ts`) |
| Grafo general `/api/kg/graph` | Solo nodos/aristas con `reconocido: true` (+ filtro universo Babel si aplica) |
| Tab Candidatas | Personas / candidatos con `reconocido: false` o triage |

### 3.2 Quién escribe `reconocido: true`

| Acción | Entry point | Mecanismo |
|--------|-------------|-----------|
| Alta CRM persona | `createPersonaWithRelations` / `createPersonaAction` | `reconocido: true` en create/upsert |
| Senado (Génesis) | mismo path CRM | idem |
| Create proyecto Atanor | `POST /api/proyectos` (no quick) | `ingestSingleProject(project, { reconocido: true })` |
| Activar propuesta | `activateProposal` | idem |
| Consolidar incubación | `consolidate` | idem |
| Progress / reasignar campo | hooks API | `{ force: true, reconocido: true }` |
| Prima Materia | `genesis-bootstrap` | `{ reconocido: true, structuredOnly: true, force: true }` |
| Promote candidata | `POST /api/personas/[id]/promote` | `promotePersona` + **`sealKgNodeInUniverse`** (universo hijo) |
| Purifier approve / triage | `lib/purifier/approve.ts`, `lib/triage/store.ts` | HITL clásico |

### 3.3 Quién sigue pendiente

- Extracciones `ingestKgExtraction` sin flag (default `reconocido: false`).
- Stubs `ensurePersonaStub` (incubadora / badges) → no aparecen en lista verificada hasta promote.
- Propuestas `quick_create` (`mode: "quick"` en `POST /api/proyectos`) → incubadora; **no** crean proyecto real hasta approve/activate.

### 3.4 Pipeline de ingest documental

```
ingestDocumentSource({ reconocido?, structuredOnly? })
  → (opcional) extractKgFromText
  → merge structured + LLM
  → ingestKgExtraction({ reconocido })
      → resolveEntities / createEdges / mentions
```

Flags nuevos en `lib/kg/sources/common.ts` y `ingestSingleProject`.

---

## 4. Personas

### 4.1 Alta manual

1. UI: `NuevaPersonaSidebar` → `createPersonaAction` (`app/personas/actions.ts`).
2. Dominio: `createPersonaWithRelations` — nodo `reconocido: true`, vínculos CRM + `KgEdge`.
3. Universo: `sealKgNodeInUniverse` si hay Babel hijo.
4. UI: `notifyDomainRefresh("all")` + reload lista; navegación a ficha.

### 4.2 Senado

Misma action CRM con `relationToOperator` (texto libre del vínculo). El progreso de la misión se mide con `countOperatorLinkedPersonas` (target = 3).

### 4.3 Por qué una persona “no aparecía”

Causas típicas (pre y post fix):

1. Nació como **stub** (`reconocido: false`) → solo en Candidatas.
2. Universo Babel hijo sin `BabelRecord(kind=kg_node)` → lista filtrada la oculta. Promote ahora sella universo.
3. Vista grafo sin remount/refresh → mitigado con bus de dominio (`useDomainRefresh`).

---

## 5. Proyectos

### 5.1 Dos capas

| Capa | Persistencia | Lista UI |
|------|--------------|----------|
| Atanor | `data/projects/{campoSlug}/{id}.md` | `/proyectos` lee filesystem |
| Knowledge Graph | `KgNode(type=proyecto)` + edges | `/grafo`, grafo personas mixed |

Un proyecto puede existir en Atanor y aún no en grafo si la ingesta falló; tras el fix 27/07, las acciones del Observador pasan `reconocido: true` en el hook de ingest.

### 5.2 Flujos de creación

```
Captura rápida (mode=quick) → ProjectProposal pending → HITL activate → createProject + ingest reconocido
Incubador LLM → consolidate → createProject + ingest reconocido
Génesis Prima Materia → bootstrapGenesisProject (sin propuesta) + ingest structuredOnly reconocido
POST /api/proyectos (completo) → createProject + ingest reconocido
```

Campo default Génesis: `babel` (`DEFAULT_CAMPO_SLUG`). Responsable = `operatorName`.

### 5.3 Helper Génesis

`lib/projects/genesis-bootstrap.ts`:

1. `createProject(...)`
2. `ingestSingleProject(..., { reconocido: true, structuredOnly: true, force: true })`
3. Resuelve hub Operador + nodo proyecto
4. Upsert `PersonToProject` + `KgEdge` `responsable_de` sellados

---

## 6. Grafos

| Vista | API | Fuente |
|-------|-----|--------|
| `/grafo` | `GET /api/kg/graph` | `getGraphSnapshot()` — nodos `reconocido: true` |
| `/personas?tab=grafo` | `GET /api/personas/graph?mode=` | `buildPersonaGraphSnapshot()` |
| Senado (overlay) | `getSenadoGraphAction` | Snapshot ego Operador |

El hub natural es el `KgNode` del Operador (`ensureOperatorPersonaNode`). Personas del Senado y el proyecto Prima Materia deben colgar de ese hub.

Filtro Babel: si el universo activo no es root, `resolveUniverseKgNodeIds` limita el snapshot; por eso el sello en promote/create es obligatorio en universos hijos.

---

## 7. Refresh de UI (bus de dominio)

Sin store global. Evento browser:

- Evento: `deprocast:domain-refresh`
- Helper: `notifyDomainRefresh(scope, reason?)` — `lib/domain-refresh.ts`
- Hook: `useDomainRefresh(scopes)` — `hooks/use-domain-refresh.ts` → `refreshKey` incremental

**Scopes:** `personas` | `proyectos` | `kg` | `all`

| Emisor | Momento |
|--------|---------|
| Alta persona / Senado / links / triage | `all` o `personas` |
| Prima Materia / activate proposal / incubación | `all` |
| Dashboards | escuchan y re-fetchan |

Consumidores: `personas-dashboard`, `personas-graph-workspace` (`refreshKey` prop), `proyectos-dashboard`, `grafo-workspace`.

---

## 8. Inventario de archivos clave

### Backend / dominio

| Archivo | Cambio / rol 27/07 |
|---------|-------------------|
| `lib/projects/genesis-bootstrap.ts` | **Nuevo** — proyecto Génesis coagulado |
| `lib/yo/store.ts` | Prima Materia → bootstrap (no solo proposal) |
| `lib/kg/sources/common.ts` | Flags `reconocido`, `structuredOnly` |
| `lib/kg/sources/projects.ts` | Propaga flags a ingest |
| `lib/kg/ingest.ts` | Acepta `reconocido` (ya existía) |
| `app/api/proyectos/route.ts` | Create → ingest `reconocido: true` |
| `lib/projects/activate-proposal.ts` | Activate → ingest sellado |
| `lib/projects/incubation/consolidate.ts` | Consolidate → ingest sellado |
| `app/api/proyectos/[id]/progress/route.ts` | Re-ingest sellado |
| `app/api/proyectos/[id]/campo/route.ts` | Re-ingest sellado |
| `app/api/personas/[id]/promote/route.ts` | + `sealKgNodeInUniverse` |
| `lib/domain-refresh.ts` | **Nuevo** — bus de eventos |
| `hooks/use-domain-refresh.ts` | **Nuevo** — hook cliente |

### UI

| Archivo | Rol |
|---------|-----|
| `components/yo/mission-persona-overlay.tsx` | Emite refresh tras Senado |
| `components/yo/mission-project-overlay.tsx` | Emite refresh tras Prima Materia |
| `components/personas/personas-dashboard.tsx` | Escucha + notifica altas |
| `components/personas/personas-graph-workspace.tsx` | `refreshKey` |
| `components/proyectos/proyectos-dashboard.tsx` | Escucha dominio |
| `components/proyectos/proposals-workspace.tsx` | Notifica al activar |
| `components/proyectos/incubation-workspace.tsx` | Notifica al consolidar |
| `components/grafo/grafo-workspace.tsx` | Re-carga grafo/stats en refresh |

---

## 9. Invariantes y anti-patrones

### Invariantes (respetar al cambiar código)

1. **Observador escribe ⇒ `reconocido: true`** en nodos/aristas que deban verse en grafos.
2. **IA extrae ⇒ pendiente** hasta HITL (no romper Purifier/triage).
3. **Génesis Prima Materia** crea proyecto Atanor real, no solo propuesta.
4. **Operador** es hub KG; altas del Senado y el primer proyecto deben vincularse a él.
5. **Universo Babel hijo** requiere `sealKgNodeInUniverse` para visibilidad en listas filtradas.
6. Tras mutaciones de dominio visibles, emitir `notifyDomainRefresh` (o al menos el scope afectado).

### Anti-patrones

- Llamar `ingestSingleProject(project)` sin `{ reconocido: true }` desde una ruta de Observador.
- Crear personas vía `ensurePersonaStub` cuando el usuario está haciendo un alta consciente (usar CRM).
- Esperar que localStorage/Zustand sincronice personas/proyectos (no aplica).
- Confundir `ProjectProposal` (incubadora) con `Project` (Atanor Markdown).
- Confundir `calibrador` (Vibe 1–12) con `calibrador-central` (Molecular) — ver `reporte2107.md`.

---

## 10. Anexo — prompt para otra IA

> Sos arquitecto de Deprocast. Leé `2707report.md` (flujo de datos Génesis→KG) y, si hace falta, `reporte2107.md` (módulos).  
> Quiero cambiar **[X]**.  
> Respetá: (1) Observador = coagulado inmediato; (2) IA = HITL; (3) Prima Materia crea proyecto Atanor + KG; (4) flag `reconocido` como gate de grafos; (5) `notifyDomainRefresh` tras mutaciones UI.  
> Proponé el diff mínimo citando archivos de la sección 8.

---

## Diagrama de flujo (estado corregido)

```
Bautismo ──► Yo + hub Operador (reconocido)
Nosce ──────► Yo.calibration (ADN / propósito)
Senado ─────► KgNode persona + edges (reconocido) ──► /personas · /grafo
Prima ──────► Project.md (babel) + KgNode proyecto (reconocido)
              + PersonToProject / responsable_de ──► /proyectos · /grafo

Alta manual persona ──► mismo path CRM coagulado + domain-refresh
Alta/activate proyecto Observador ──► .md + ingest reconocido + domain-refresh
Extracción IA / stub ──► pendiente ──► promote/triage ──► reconocido
```

---

*Fin de 2707report — generado 2026-07-27 a partir del código en `c:\Dev\deprocast` tras el fix de flujo onboarding→grafos.*
