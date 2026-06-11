---
materia: "v1.0-master-architecture"
particula: "deprocast-grimorio"
posicion: "localhost-ubuntu"
onda: "system-specification"
tiempo: "2026-06-11"
espacio: "local-atanor"
field: "cognitive-exo-cortex"
---

# 🌌 Grimorio de Arquitectura: Ecosistema DeProcast & Estudianta

> **Documento vivo.** Especificación técnica definitiva del ecosistema DeProcast operando en circuito cerrado 100 % local.  
> **Autoridad:** Arquitectura de Sistemas · **Ámbito:** `deprocast2` · **Hito de cierre:** 7 de julio de 2026.

---

## Índice

1. [Filosofía del Sistema y Núcleo Binario](#-1-filosofía-del-sistema-y-núcleo-binario)
2. [El Agente del Todo y las Siete Dimensiones](#-2-el-agente-del-todo-y-las-siete-dimensiones)
3. [El Atanor Local: Ingesta y el Tacho de la Boludez](#-3-el-atanor-local-ingesta-de-datos-y-el-tacho-de-la-boludez)
4. [Módulo Laboral Integrado (Despacho Varona)](#-4-módulo-laboral-integrado-ingeniería-inversa-al-despacho-varona)
5. [La Trituradora de Fricción: Gamificación](#-5-la-trituradora-de-fricción-gamificación-y-manipulación-de-dopamina)
6. [Estrategia de Producto y Plan de Cierre](#-6-estrategia-de-producto-y-plan-de-cierre-hito-7-de-julio)
7. [Anexo Técnico: Estado del Repositorio y Contratos](#-anexo-técnico-estado-del-repositorio-y-contratos)

---

## 🏛️ 1. Filosofía del Sistema y Núcleo Binario

### 1.1 Exoesqueleto Cognitivo de Circuito Cerrado

DeProcast no es una app de productividad genérica. Es un **Exoesqueleto Cognitivo** — una capa externa de procesamiento que amplifica la capacidad atencional del usuario sin ceder soberanía sobre sus datos.

El núcleo binario del sistema se compone de dos procesos acoplados que **nunca abandonan la máquina local**:

| Proceso | Rol | Puerto / Ubicación |
|---------|-----|-------------------|
| **Binario local (.exe)** | Daemon de ingesta, esterilización de audio, watchers de carpetas, orquestación de colas, telemetría biométrica futura | Servicio de sistema / tray icon |
| **Next.js en localhost** | UI minimalista, API REST interna, Prisma/SQLite, RAG, gamificación, dashboard de Focus Work | `http://localhost:3000` |

**Principio de soberanía absoluta:** Ningún byte de conocimiento laboral, clínico, legal o personal sale del perímetro local salvo acción explícita del Observador. Las credenciales GCP (`GOOGLE_APPLICATION_CREDENTIALS`) existen como puente opt-in para STT; el diseño objetivo migra hacia Whisper local + VAD para eliminar incluso esa dependencia.

```
┌─────────────────────────────────────────────────────────────┐
│                    MÁQUINA LOCAL (Atanor)                   │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │ Periféri-│───▶│ data/tacho/  │───▶│ Esterilización  │  │
│  │ cos      │    │ (crudo)      │    │ FFmpeg + VAD    │  │
│  └──────────┘    └──────────────┘    └────────┬────────┘  │
│                                                  ▼          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  data/raw_documents/pending/  →  completed/          │   │
│  │  prisma/dev.db  ·  vectores RAG  ·  Boss/Microtask  │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                              ▼                              │
│                    Next.js localhost:3000                   │
│              Dashboard · Focus Work · Estudianta            │
└─────────────────────────────────────────────────────────────┘
         ╳  sin egress por defecto  ╳
```

### 1.2 El Núcleo Binario: Observador y Estudianta

- **Observador:** El usuario humano soberano. Toma decisiones HITL (Human-in-the-Loop), valida transcripciones, cierra sesiones de Focus Work y calibra la fragmentación futura.
- **Estudianta:** El Personaje/Avatar ejecutor dentro del sistema gamificado. Acumula **Puntos de Señal**, ejecuta microtareas atómicas y representa el estado dopaminérgico del ciclo de trabajo. No es un chatbot decorativo: es la interfaz de identidad entre el Observador y la Trituradora de Fricción.

La relación es asimétrica y deliberada: el Observador piensa; Estudianta **hace** en ventanas de menos de 15 minutos.

### 1.3 Principio de Mejora Infinita

El sistema rechaza el paradigma de "tarea terminada = archivo muerto". Cada fragmento ingerido es **luz estructurada** — datos + metadatos vectoriales de siete dimensiones — susceptible de re-indexación, re-pesado y re-encadenamiento.

**Por qué la luz vence al ruido:**

| Dimensión | Luz (señal) | Ruido (procrastinación estática) |
|-----------|-------------|----------------------------------|
| Computacional | Embeddings indexables, chunks Parent/Child, entidades y tags en SQLite | PDFs sueltos, audios sin transcribir, Excel sin transmutar |
| Biológica | Micro-recompensas calibradas (1–12) activan vía dopaminérgica fásica sin agotar la tónica | Listas infinitas de tareas macro generan parálisis prefrontal y scrolling compensatorio |
| Temporal | Cada ingesta lleva `tiempo` y `espacio` → el RAG responde con contexto situado | Notas sin timestamp ni procedencia son alucinaciones esperando ocurrir |

La mejora infinita no es perfeccionismo: es **compostaje continuo** del conocimiento. Un Boss laboral de Varona que pasa de 40 % a 100 % de avance no desaparece; sus `Observaciones` y `Puntos de mejora` alimentan el campo `field` de retos futuros similares.

---

## 🗺️ 2. El Agente del Todo y las Siete Dimensiones

### 2.1 Esquema Universal de Metadatos

Todo fragmento de conocimiento — Markdown en `pending/`, chunk de transcripción, Boss laboral, microtarea — **debe** portar el frontmatter YAML de siete dimensiones. Este esquema es el contrato entre ingesta, RAG y gamificación.

```yaml
---
materia: "<formato físico del soporte>"
particula: "<identificador único estable>"
posicion: "<observador>|<jugador>|<avatar>"
onda: "<taxonomía / área de conocimiento>"
tiempo: "<ISO-8601 o rango temporal>"
espacio: "<entorno de captura>"
field: "<campo de influencia cruzada>"
# Campos operativos adicionales (no dimensionales):
title: "..."
source_type: "..."
base_weight: 1-12
---
```

### 2.2 Definición Rigurosa de Cada Dimensión

| Dimensión | Semántica | Valores Ejemplo | Obligatoriedad |
|-----------|-----------|-----------------|----------------|
| **Materia** | Formato físico o lógico del soporte primario | `"audio/wav"`, `"text/markdown"`, `"application/vnd.ms-excel"`, `"image/png"`, `"nfc/uid"` | Alta |
| **Partícula** | Identificador clave inmutable; clave primaria semántica | `"boss-varona-001"`, `"transcript-7f3a"`, `"deprocast-grimorio"` | Alta |
| **Posición** | Tríada de actores: `Observador` (quién valida), `Jugador` (quién es responsable en el mundo real), `Avatar` (quién ejecuta en UI — Estudianta) | `"lautaro\|margarita\|estudianta"` | Alta en contexto laboral |
| **Onda** | Área taxonómica / dominio jurídico o personal | `"PROCESAL"`, `"LABORAL"`, `"TRIBUTARIO"`, `"PROCESAL LABORAL"`, `"personal-health"` | Alta |
| **Tiempo** | Temporalidad de creación, vigencia o deadline | `"2026-06-11"`, `"2026-07-07/2026-07-07"` (hito) | Alta |
| **Espacio** | Entorno de captura | `"local-atanor"`, `"data/tacho/celulares"`, `"despacho-varona-madrid"` | Media |
| **Field** | Campo de influencia cruzada — qué otros dominios este fragmento afecta o de qué depende | `"cognitive-exo-cortex"`, `"rag-laboral+procesal"`, `"nfc-habit-loop"` | Media |

### 2.3 La Tríada Posicional en Profundidad

```
                    ┌─────────────┐
                    │ OBSERVADOR  │  Soberanía · Validación HITL · Calibración
                    └──────┬──────┘
                           │ delega
                    ┌──────▼──────┐
                    │   JUGADOR   │  Responsable real (ej. Margarita, Mantvydas)
                    └──────┬──────┘
                           │ personifica
                    ┌──────▼──────┐
                    │   AVATAR    │  Estudianta — ejecuta microtareas en Focus Work
                    └─────────────┘
```

En el módulo laboral Varona, la columna **Responsable** del Excel se mapea al segmento **Jugador** de `posicion`. El Observador es quien importa el CSV y valida el peso. Estudianta es siempre el Avatar ejecutor en sesión.

### 2.4 Inyección en el Pipeline RAG

Los chunks actuales (`ParentChunk`, `ChildChunk`, `Entity`, `Tag` en Prisma) se extenderán para almacenar las siete dimensiones como columnas indexadas o como JSON en `ParentChunk.metadata`. La búsqueda vectorial futura **filtra primero por `onda` y `field`**, luego por similitud semántica — evitando que un retiro procesal contamine una query tributaria.

---

## 📥 3. El Atanor Local: Ingesta de Datos y el 'Tacho de la Boludez'

### 3.1 Filosofía del Tacho

El **Tacho de la Boludez** (`data/tacho/`) es el punto de aterrizaje único para todo input crudo del mundo físico. Nada entra directamente al RAG ni a `pending/` sin pasar por el tacho o por un equivalente esterilizado.

**Subcarpetas canónicas** (definidas en `scripts/generate-context.ts`):

```
data/tacho/
├── celulares/     # Exports de voz, screenshots de chat, audios de WhatsApp
├── notas/         # Fotos de cuadernos, scans de lapicera digital, markdown rápido
├── capturas/      # Pantallas, clips, grabaciones de sesión
└── misc/          # NFC dumps, exports de smartwatch, periféricos no clasificados
```

### 3.2 Mapa de Periféricos → Carpetas

| Periférico | Mecanismo de Ingesta Local | Carpeta Destino | Formato Esperado |
|------------|---------------------------|------------------|------------------|
| **Lapicera inteligente** | Sync USB / BLE → watcher `.exe` | `data/tacho/notas/` | SVG, PDF, PNG, strokes JSON |
| **Tarjetas NFC** | Lectura UID → archivo `.nfc.json` con timestamp | `data/tacho/misc/` | JSON `{uid, read_at, label}` |
| **Reloj / Smartwatch** | Export de salud / focus / HRV | `data/tacho/misc/` | CSV, FIT, JSON vendor |
| **Cuadernos físicos** | Foto o scan desde celular | `data/tacho/notas/` | JPG, HEIC, PDF |
| **Pantallas** | Screenshot hotkey o share target | `data/tacho/capturas/` | PNG, WebM |
| **Celulares** | AirDrop local, cable, carpeta sincronizada | `data/tacho/celulares/` | M4A, OGG, JPG, export ZIP |

El daemon `.exe` (futuro) ejecuta `fs.watch` recursivo sobre `data/tacho/**` y encola jobs de normalización. En la fase actual, la ingesta manual ocurre vía UI (`UploadDropzone`, `TextIngestForm`) hacia `public/uploads/` y `data/raw_documents/pending/`.

### 3.3 Pipeline de Esterilización Sin IA (Pre-Whisper)

**Regla de oro:** Ningún modelo de lenguaje ni STT toca audio crudo. La esterilización es determinista.

#### Etapa 1 — Normalización FFmpeg (`loudnorm`)

```bash
ffmpeg -i INPUT -af loudnorm=I=-16:TP=-1.5:LRA=11,highpass=f=200,lowpass=f=3000,afftdn \
  -ar 16000 -ac 1 -c:a pcm_s16le OUTPUT.wav
```

El código actual en `lib/gcp-speech/audio-prep.ts` aplica `highpass`, `lowpass` y `afftdn` pero **aún no incluye `loudnorm`**. La especificación exige añadir `loudnorm` como primer filtro en la cadena `-af` para uniformar niveles entre celular, lapicera y grabadora.

#### Etapa 2 — Voice Activity Detection (VAD)

Tras la normalización, un módulo VAD local (Silero VAD vía ONNX o `webrtcvad`) recorre el WAV y produce un **mapa de segmentos con voz**. Los silencios se eliminan físicamente (concatenación FFmpeg) antes de cualquier STT.

**Objetivo:** Reducir hallucination loops de Whisper causados por:
- Silencios largos interpretados como texto fantasma
- Ruido de fondo de oficina / ventilador
- Repeticiones de "gracias por ver el video" y artefactos de compresión

#### Etapa 3 — Escritura en Cola `pending/`

Solo el audio esterilizado y truncado se mueve a procesamiento STT. Los metadatos de esterilización se escriben en sidecar JSON:

```json
{
  "particula": "audio-20260611-abc12",
  "materia": "audio/wav",
  "original_duration_ms": 342000,
  "sterilized_duration_ms": 187400,
  "vad_segments_removed": 23,
  "loudnorm_applied": true,
  "espacio": "data/tacho/celulares"
}
```

### 3.4 Flujo de Texto (Ya Implementado)

El módulo `lib/documents.ts` escribe Markdown en `data/raw_documents/pending/` con frontmatter:

```yaml
---
title: "..."
source_type: "personal_writing | ai_chat | ai_report | web_clip | book_excerpt"
base_weight: 6
created_at: "2026-06-11T..."
---
```

La extensión laboral añadirá `source_type: "labor_boss"` y las siete dimensiones completas.

### 3.5 Flujo de Audio (Estado Actual vs Objetivo)

| Capa | Estado Actual (`deprocast2`) | Estado Objetivo (Grimorio) |
|------|------------------------------|----------------------------|
| Upload | `POST /api/upload` → `public/uploads/` | + watcher desde `data/tacho/` |
| Esterilización | FFmpeg sin loudnorm, sin VAD | loudnorm + VAD + sidecar JSON |
| STT | GCP Speech `chirp_2` vía `lib/gcp-speech-processor.ts` | Whisper local post-VAD (GCP como fallback opt-in) |
| Almacenamiento | `AudioAsset` + `Transcript` + chunks en SQLite | Igual + dimensiones en chunks |
| Cola | `lib/processing-queue.ts` serial con cancelación | Igual + prioridad por `base_weight` |

---

## 💼 4. Módulo Laboral Integrado (Ingeniería Inversa al Despacho Varona)

### 4.1 Fuente de Verdad

Archivo corporativo: `Control_IA_Despacho_Profesional.xlsx`  
Cada **fila con datos** se transmuta en un **Boss** (reto de alta señal). Las filas vacías o incompletas se marcan como `estado: semilla` hasta completar Prioridad e Impacto.

### 4.2 Esquema del CSV Plano

Columnas origen → destino:

| Columna Excel | Campo Boss / Documento | Dimensión |
|---------------|------------------------|-----------|
| `ID` | `particula: "boss-varona-{ID}"` | Partícula |
| `Área` | `onda` | Onda |
| `Proyecto / Reto IA` | `title` | — |
| `Responsable` | segmento Jugador en `posicion` | Posición |
| `Fecha Inicio` / `Fecha Objetivo` | `tiempo` (rango) | Tiempo |
| `Prioridad (1-5)` | entrada de cálculo de gravedad | — |
| `Impacto (1-5)` | entrada de cálculo de gravedad | — |
| `Dificultad (1-5)` | `difficulty` (factor de fragmentación) | — |
| `Horas Estimadas` / `Horas Realizadas` | telemetría del Boss | — |
| `% Avance` | `progress_pct` | — |
| `Estado` | `boss_status` | — |
| `Observaciones (ventajas)` | cuerpo RAG → `historical_context` | Field |
| `Puntos de mejora` | cuerpo RAG → `improvement_directives` | Field |

### 4.3 Cálculo de Gravedad (`base_weight`: 1–12)

Las variables **Prioridad** (P) e **Impacto** (I) son enteros en [1, 5]. El peso base del Boss se calcula por **suma normalizada** al rango implementado en `lib/document-constants.ts` (`MIN_BASE_WEIGHT = 1`, `MAX_BASE_WEIGHT = 12`):

```
suma = P + I                          # rango [2, 10]
base_weight = round((suma / 10) * 12) # rango [2, 12] → clamp a [1, 12]
```

**Ejemplos:**

| Prioridad | Impacto | Suma | base_weight |
|-----------|---------|------|-------------|
| 5 | 5 | 10 | **12** |
| 5 | 4 | 9 | **11** |
| 4 | 3 | 7 | **8** |
| 3 | 2 | 5 | **6** |
| 1 | 1 | 2 | **2** |

Si Prioridad o Impacto están ausentes, el importador asigna `base_weight = 6` (neutro) y flag `gravity_incomplete: true` para revisión HITL del Observador.

### 4.4 Mapeo Dimensional

```yaml
---
materia: "application/vnd.ms-excel"
particula: "boss-varona-001"
posicion: "observador|margarita|estudianta"
onda: "PROCESAL"
tiempo: "2026-04-15/2026-04-25"
espacio: "despacho-varona"
field: "rag-laboral+procesal+masc-validation"
title: "Comprobar datos de 1.916 matrículas"
source_type: "labor_boss"
base_weight: 12
difficulty: 2
boss_status: "implantado"
progress_pct: 100
jugador: "Margarita"
---
```

El texto combinado de **Observaciones** y **Puntos de mejora** se inyecta como contexto histórico en el cuerpo del Markdown y, tras indexación, como `ParentChunk` con `field` cruzado para que futuros retos de lectura PDF hereden las lecciones aprendidas.

### 4.5 Catálogo de Bosses Reales (Varona)

#### Boss 001 — Validación Masiva MASC (Peso 12)

- **Onda:** PROCESAL
- **Reto:** Comprobar que los datos de **1.916 matrículas**, con número de bastidor y titular que aparecen en una pluralidad de documentos, concuerdan con los burofaxes creados por Varona.
- **Jugador:** Margarita
- **Prioridad / Impacto:** 5 / 5 → `base_weight: 12`
- **Dificultad:** 2
- **Resultado:** Implantado al 100 %. Tiempo estimado 160 h → empleado 48 h → **ahorrado 112 h**.
- **Observaciones (ventaja):** Rapidez extrema para revisar fallos en MASC en formato Word; revisiones completas en 3 días de jornada; marcado exacto del error.
- **Puntos de mejora:** Errores en lectura de PDFs (direcciones, precios); directrices solo al inicio; necesidad de filtros múltiples; 20–30 min de onboarding de directrices para funcionamiento correcto.

#### Boss 002 — Compresión Causal Penal (Peso pendiente / Dificultad 2)

- **Onda:** PROCESAL LABORAL
- **Reto:** Resumir una causa penal de aproximadamente **25.000 páginas** y obtener explicación/resumen consultable.
- **Jugador:** Mantvydas
- **Resultado:** Objetivo conseguido pero **no totalmente fiable**; alucinaciones en resúmenes parciales.
- **Observaciones:** Bot ChatGPT con QA sobre la causa e indicación de ubicación documental sin extraer el PDF completo.
- **Puntos de mejora:** Eliminar alucinaciones en resúmenes por parte (24 partes); citar folio exacto o extraer documento al preguntar por ubicación.

#### Boss 003 — Automatización Remitente MASC

- **Onda:** PROCESAL
- **Reto:** Modificación automática del remitente en MASC realizados + revisión posterior.
- **Jugador:** Margarita

#### Boss 004 — Cartel de Camiones

- **Onda:** PROCESAL
- **Reto:** Revisión de documentación para preparación de demandas de cartel de camiones y verificación de datos en demandas.
- **Jugador:** Margarita

#### Boss 005 — Cruce Cualitativo-Cuantitativo

- **Onda:** PROCESAL LABORAL
- **Reto:** Cruce de datos de diferentes fuentes cualitativas y cuantitativas hacia plantilla de valoración (Ministerio de Igualdad).
- **Jugador:** Ana/Bea

#### Boss 006 — Rentas (Tributario)

- **Onda:** TRIBUTARIO
- **Reto:** Automatizar el proceso de comprobación de rentas.
- **Jugador:** Andrea

#### Bosses 007–010 — Semillas en Ideación

| Reto | Jugador | Estado |
|------|---------|--------|
| Comprobación de mínimos legales en memorias | Alberto/Mayte | Idea |
| Automatización escaneo y comprobación contabilidades | Leo | Idea |
| Revisión en confección de nóminas | Begoña | Idea |
| Confección de nóminas | Nacho | Pruebas |

### 4.6 Script de Transmutación (Contrato)

```typescript
// scripts/import-varona-bosses.ts (por implementar)
type VaronaRow = {
  id: string;
  area: string;
  title: string;
  responsable: string;
  prioridad?: number;
  impacto?: number;
  dificultad?: number;
  observaciones?: string;
  puntosMejora?: string;
  estado?: string;
  avance?: number;
};

function computeBaseWeight(prioridad?: number, impacto?: number): number {
  if (prioridad == null || impacto == null) return 6;
  const suma = prioridad + impacto;
  return Math.min(12, Math.max(1, Math.round((suma / 10) * 12)));
}
```

Salida: un archivo `.md` por Boss en `data/raw_documents/pending/` + registro en tabla `Boss` (Prisma, por implementar) vinculado a `Project`.

---

## 🎮 5. La Trituradora de Fricción: Gamificación y Manipulación de Dopamina

### 5.1 Problema Neurológico que Resuelve

Los Bosses de Varona demuestran el patrón: retos de **25.000 páginas** o **1.916 matrículas** generan parálisis prefrontal si se presentan como unidad de trabajo. La corteza prefrontal dorsolateral tiene capacidad limitada de mantener objetivos abstractos grandes; la amígdala interpreta la magnitud como amenaza; el usuario huye hacia dopamina fácil (scroll, email, otra pestaña).

La Trituradora de Fricción es el subsistema que **deconstruye** macro-retos en unidades ejecutables.

### 5.2 Micro-fragmentación (< 15 minutos)

**Regla:** Ninguna tarea en cola de Focus Work excede 15 minutos estimados. Si excede, el algoritmo la parte recursivamente hasta obtener **microtareas atómicas**.

```
Boss: "Resumir causa penal 25.000 páginas" (base_weight: 11, difficulty: 2)
  └── Microtask: "Indexar parte 1 (pp. 1-400)" — 12 min — weight inherit: 11
  └── Microtask: "Extraer cronología partes 1-3" — 10 min
  └── Microtask: "Validar HITL: ¿alucinaciones en parte 2?" — 8 min
  └── ...
```

El factor `difficulty` del Boss ajusta el tamaño de corte: mayor dificultad → microtareas más pequeñas (target 8 min en lugar de 15 min).

**Modelos Prisma objetivo** (ausentes hoy, definidos en grimorio):

```prisma
model Project {
  id          String      @id @default(uuid())
  particula   String      @unique
  title       String
  onda        String
  baseWeight  Int
  difficulty  Int         @default(3)
  bossStatus  String      @default("semilla")
  microtasks  Microtask[]
}

model Microtask {
  id              String   @id @default(uuid())
  projectId       String
  title           String
  estimatedMin    Int      // <= 15
  baseWeight      Int
  status            String   @default("pending")
  project         Project  @relation(...)
  focusSessions   FocusSession[]
}

model FocusSession {
  id            String   @id @default(uuid())
  microtaskId   String
  startedAt     DateTime
  endedAt       DateTime?
  signalPoints  Int      @default(0)
  frustration   Int?     // 1-5 auto o HITL
  notes         String?
  microtask     Microtask @relation(...)
}
```

### 5.3 Circuitos Dopaminérgicos: Puntos de Señal

Al completar una `FocusSession`, Estudianta suma:

```
signal_points = ceil(base_weight * completion_multiplier * streak_bonus)
```

| Factor | Descripción |
|--------|-------------|
| `base_weight` | 1–12 del Boss/microtarea (gravedad) |
| `completion_multiplier` | 1.0 si completado; 0.5 si abandonado con progreso > 50 % |
| `streak_bonus` | +10 % por cada sesión consecutiva del día (máx 1.5×) |

**Puntos de Señal** no son decorativos: alimentan el `field` de influencia del Observador — umbral mínimo diario configurable, desbloqueo de descanso premium, y priorización de la cola de ingesta.

### 5.4 Bucle HITL de Frustración

Tras cada sesión, el sistema captura:

1. **Log de estado** (completado / abandonado / bloqueado)
2. **Nivel de frustración** (1–5), auto-inferido por tiempo vs estimado o ingresado por el Observador
3. **Notas libres**

**Mecánica de retroalimentación:**

```
SI frustration >= 4:
  próxima_microtarea.estimatedMin *= 0.6   # cortar más fino
  próxima_microtarea.baseWeight = max(1, baseWeight - 1)  # bajar presión
  pausar Boss 30 min (protección dopamina tónica)

SI frustration <= 2 AND completion_multiplier == 1.0:
  permitir microtarea de hasta 15 min (techo normal)
  opcional: subir baseWeight +1 en Boss adyacente (transferencia de momentum)
```

Este bucle evita la espiral de frustración→abandono→culpa que destruye la línea base dopaminérgica **tónica** necesaria para sesiones profundas en retos de peso 11–12 (validación MASC, causas penales).

### 5.5 Focus Work — Contrato de UI

Pantalla dedicada (`/focus`, componentes en `components/focus-work/`) con:

- Una microtarea activa a la vez (corteza prefrontal protegida)
- Timer visible descendente ≤ 15:00
- Estudianta visible con acumulado de Puntos de Señal del día
- Al cierre: modal HITL de frustración (1–5) + notas
- Sin lista de pendientes visible durante sesión (anti-parálisis)

---

## 🚀 6. Estrategia de Producto y Plan de Cierre (Hito 7 de Julio)

### 6.1 Fecha Límite

**7 de julio de 2026** — Cierre del Hito 1: DeProcast local funcional con Sección Laboral importada, trituradora operativa y documentación viva sincronizada.

### 6.2 Core Open-Source (Permanente, Libre)

Componentes que se publican sin restricción:

| Módulo | Entregable 7-Jul | Descripción |
|--------|------------------|-------------|
| Gestión de archivos Markdown | ✅ parcial | `data/raw_documents/`, frontmatter YAML |
| Ingesta de texto manual | ✅ implementado | `TextIngestForm`, `POST /api/documents` |
| Ingesta de audio básica | ✅ implementado | Upload + cola GCP Speech |
| UI minimalista | ✅ implementado | Dashboard Next.js + shadcn |
| Trituradora de tareas | 🔲 por implementar | Project/Microtask/FocusSession |
| Importador Varona CSV | 🔲 por implementar | `scripts/import-varona-bosses.ts` |
| El Reflector | ✅ implementado | `npm run context` → `deprocast_state.md` |
| Grimorio | ✅ este documento | `deprocast_master_plan.md` |

### 6.3 Techo Premium Permanente (Cerrado, Local-First)

Capacidades avanzadas que permanecen fuera del core OSS pero **siguen siendo 100 % locales** (licencia comercial, no SaaS):

| Capacidad Premium | Descripción Técnica |
|-------------------|---------------------|
| **Motor analítico de gravedad contextual** | Ajuste dinámico de `base_weight` según historial HITL, deadlines reales y carga de Bosses activos por `onda` |
| **RAG cuántico de 7 dimensiones** | Embeddings + filtros dimensionales estrictos + re-ranking por `field` cruzado |
| **Optimización biométrica** | Telemetría de smartwatch (HRV, sueño, descanso) modula tamaño de microtarea y ventanas de Focus Work |
| **Whisper + VAD optimizado** | Cadena `loudnorm` → VAD → Whisper con perfiles por `espacio` de captura |
| **Daemon `.exe` de ingesta** | Watchers NFC, lapicera, tacho; esterilización sin intervención |

### 6.4 Cronograma de Implementación (6 semanas)

```
2026-06-11 ─── Grimorio + estado base (HOY)
     │
2026-06-18 ─── Importador Varona + modelos Project/Microtask/FocusSession
     │
2026-06-25 ─── Focus Work UI + Puntos de Señal + bucle frustración
     │
2026-07-02 ─── loudnorm + VAD en pipeline audio + sidecar JSON
     │
2026-07-07 ─── HITO: demo local completa con Boss 001 y 002 fragmentados
```

### 6.5 Criterios de Aceptación del Hito

1. Importar `Control_IA_Despacho_Profesional.xlsx` genera ≥ 6 Bosses en `pending/` con `base_weight` calculado.
2. Boss 001 ("1.916 matrículas") tiene ≥ 8 microtareas hijas, ninguna > 15 min.
3. Completar 3 Focus Sessions consecutivas suma Puntos de Señal visibles en UI.
4. Sesión con frustración 5 reduce tamaño de la siguiente microtarea automáticamente.
5. `npm run context` refleja estado actualizado; grimorio permanece referencia estable.

---

## 📎 Anexo Técnico: Estado del Repositorio y Contratos

### A.1 Stack Actual

- **Framework:** Next.js 16.2.7 (App Router)
- **DB:** SQLite via Prisma 7.8 + `better-sqlite3`
- **STT:** Google Cloud Speech `chirp_2` (config en `.env.example`)
- **Audio:** FFmpeg estático (`ffmpeg-static`, `ffprobe-static`)
- **UI:** React 19, Tailwind 4, shadcn/ui

### A.2 Rutas API Activas

| Ruta | Método | Función |
|------|--------|---------|
| `/api/upload` | POST | Subida de audio |
| `/api/documents` | POST | Ingesta texto → `pending/` |
| `/api/process/queue` | POST | Encolar procesamiento STT |
| `/api/process/[id]` | POST/DELETE | Procesar / cancelar asset |
| `/api/process/status` | GET | Estado de cola |
| `/api/assets` | GET | Listar audios |
| `/api/transcripts/[id]/download` | GET | Export Markdown |

### A.3 Árbol de Datos Canónico

```
data/
├── tacho/
│   ├── celulares/
│   ├── notas/
│   ├── capturas/
│   └── misc/
└── raw_documents/
    ├── pending/      # Markdown con frontmatter (texto + bosses)
    └── completed/    # Procesados e indexados
prisma/
└── dev.db            # AudioAsset, Transcript, chunks, (futuro: Project)
public/
└── uploads/          # Binarios de audio subidos
```

### A.4 Sincronización de Documentos Vivos

| Archivo | Generador | Frecuencia |
|---------|-----------|------------|
| `deprocast_state.md` | `scripts/generate-context.ts` (`npm run context`) | On-demand |
| `deprocast_master_plan.md` | Arquitectura (este grimorio) | Versionado en git; revisión humana |

### A.5 Extensión de `source_type`

Actual (`lib/document-constants.ts`):

```typescript
export const SOURCE_TYPES = [
  "personal_writing",
  "ai_chat",
  "ai_report",
  "web_clip",
  "book_excerpt",
] as const;
```

Añadir en implementación laboral:

```typescript
"labor_boss",      // Fila Varona → Boss
"labor_microtask", // Fragmento de Boss
"focus_log",       // Salida de sesión Focus Work
```

---

## Clausura

Este grimorio es la **fuente de verdad arquitectónica** del ecosistema DeProcast & Estudianta. Toda implementación que contradiga las siete dimensiones, el cálculo de gravedad 1–12, o la regla de microtareas < 15 minutos es deuda técnica consciente y debe documentarse como excepción en `deprocast_state.md`.

La procrastinación es ruido estático. DeProcast procesa luz.

---

_Especificación v1.0 · 2026-06-11 · `particula: deprocast-grimorio` · `field: cognitive-exo-cortex`_
