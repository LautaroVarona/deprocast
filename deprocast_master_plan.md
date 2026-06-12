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
4. [Módulo Laboral e Ingesta de Proyectos](#-4-módulo-laboral-e-ingesta-de-proyectos)
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

## 💼 4. Módulo Laboral e Ingesta de Proyectos

El módulo laboral no es un importador de Excel disfrazado. Es la **capa de organización del conocimiento accionable** — el mapa donde el Observador declara qué retos existen, dónde viven, cuánto pesan en la gravedad atencional del sistema, y cómo cada fragmento de voz o texto futuro encontrará su hogar semántico. Todo ocurre en circuito cerrado: el despacho no sube nada a la nube; el Observador trae el archivo, DeProcast lo transmuta en estructura viva.

### 4.1 Campos y Proyectos: La Arquitectura de Contención

Antes de hablar de Bosses, microtareas o Focus Work, el sistema necesita una **jerarquía de dos niveles** que el Observador reconoce intuitivamente:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CAMPO (contenedor global)                 │
│  "Laboral — Varona"  ·  "Proyectos Personales"  ·  "Estudianta" │
│                                                                   │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│   │  PROYECTO    │  │  PROYECTO    │  │  PROYECTO    │           │
│   │  (Boss/Reto) │  │  (Boss/Reto) │  │  (semilla)   │           │
│   └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

#### Qué es un Campo

Un **Campo** es un contenedor soberano de influencia. No es una carpeta del disco ni una etiqueta suelta: es el **marco de gravedad** dentro del cual los proyectos compiten por atención y acumulan contexto cruzado.

| Campo ejemplo | Naturaleza | Quién lo gobierna |
|---------------|------------|-------------------|
| **Laboral — Varona** | Retos del despacho profesional, importados o creados manualmente | Observador + Jugadores (Margarita, Mantvydas, etc.) |
| **Proyectos Personales** | Escritura, salud, aprendizaje, side projects sin vínculo laboral | Solo el Observador |
| **Estudianta** (futuro) | Retos de fragmentación y hábitos del avatar gamificado | Observador delega ejecución al Avatar |

Los Campos **no se mezclan en la UI por defecto**. Un audio capturado en el trayecto a casa sobre la causa penal de 25.000 páginas pertenece al Campo laboral; una nota de voz sobre el protocolo de sueño pertenece al Campo personal. La separación protege al RAG de contaminación cruzada y protege al Observador de la parálisis de "¿esto era trabajo o era yo?".

#### Qué es un Proyecto

Un **Proyecto** es la unidad atómica de reto dentro de un Campo. En el lenguaje del grimorio, un Proyecto de gravedad alta es un **Boss**; uno de gravedad baja o incompleta es una **semilla**. Todo Proyecto porta obligatoriamente:

- **Título** — la formulación humana del reto ("Comprobar 1.916 matrículas", "Resumir causa penal 25.000 páginas").
- **Área (Onda)** — la taxonomía temática que agrupa proyectos afines: PROCESAL, LABORAL, TRIBUTARIO, PROCESAL LABORAL, personal-health, etc.
- **Gravedad (1–12)** — el peso dopaminérgico del reto en el ecosistema. No es urgencia subjetiva del Observador en el momento: es la **densidad de señal** que el sistema usará para priorizar Focus Work, fragmentación y recompensas.
- **Campo padre** — el contenedor al que pertenece; inmutable tras la creación salvo acción explícita de reubicación.

Un Proyecto sin Campo asignado **no existe** en DeProcast. Es ruido esperando clasificación.

#### Relación Campo ↔ Proyecto ↔ Fragmento

Cada pieza de conocimiento ingerida — audio del móvil, texto de chat, fila de Excel — debe poder responder tres preguntas antes de entrar al Atanor:

1. **¿A qué Campo pertenece?** (¿laboral, personal, otro?)
2. **¿A qué Proyecto alimenta?** (¿cuál reto concreto?)
3. **¿Qué Área (Onda) lo contextualiza?** (heredada del Proyecto salvo override HITL)

Esta tríada es el **ancla semántica** que evita que la Súper Máquina de Contexto produzca luz difusa.

### 4.2 Interfaz de Ingesta de Proyectos

La ingesta de proyectos es una **sección dedicada** del dashboard — no un modal escondido ni un script de terminal. El Observador debe poder poblar su universo de retos en dos modos complementarios, sin fricción y sin salir del localhost.

#### Modo A — Arrastre Masivo (Población del Campo Laboral)

Pensado para el ritual de inicio de ciclo o actualización trimestral del despacho.

```
┌────────────────────────────────────────────────────────────┐
│  INGESTA DE PROYECTOS                                      │
│                                                            │
│  Campo destino: [ Laboral — Varona          ▼ ]           │
│                                                            │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │                                                     │  │
│  │     Arrastrá acá el CSV / Excel del despacho        │  │
│  │     Control_IA_Despacho_Profesional.xlsx          │  │
│  │                                                     │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                                            │
│  Vista previa: 10 filas detectadas · 6 Bosses · 4 semillas│
│  [ Confirmar ingesta ]   [ Cancelar ]                     │
└────────────────────────────────────────────────────────────┘
```

**Flujo lógico:**

1. El Observador selecciona el **Campo destino** (por defecto: Laboral — Varona).
2. Arrastra el archivo corporativo (`Control_IA_Despacho_Profesional.xlsx` o su exportación CSV).
3. El sistema muestra **vista previa no destructiva**: cuántas filas se convertirán en Proyectos, cuáles tienen gravedad calculable, cuáles quedan como semillas por datos incompletos.
4. El Observador confirma. Cada fila con datos se transmuta en un Proyecto dentro del Campo elegido.
5. Filas vacías o sin Prioridad/Impacto nacen como **semillas** — visibles en el panel pero sin entrar a la cola de Focus Work hasta que el Observador complete su gravedad.

**Mapeo conceptual Excel → Proyecto** (sin magia, solo traducción):

| Columna del despacho | Se convierte en |
|---------------------|-----------------|
| ID | Identificador estable del Proyecto |
| Área | Onda temática |
| Proyecto / Reto IA | Título |
| Responsable | Jugador (quién ejecuta en el mundo real) |
| Fecha Inicio / Fecha Objetivo | Ventana temporal del reto |
| Prioridad + Impacto | Entrada para calcular Gravedad (1–12) |
| Dificultad | Factor de fragmentación (microtareas más finas si es alta) |
| Horas Estimadas / Realizadas | Telemetría de avance |
| % Avance | Progreso visible en el panel |
| Estado | Ciclo de vida (idea, pruebas, implantado, etc.) |
| Observaciones + Puntos de mejora | Contexto histórico que alimentará el RAG |

#### Modo B — Formulario Limpio (Creación Manual en Cualquier Campo)

Para proyectos que no vienen del Excel: retos personales, ideas espontáneas, semillas que el Observador quiere plantar sin esperar al próximo export del despacho.

```
┌────────────────────────────────────────────────────────────┐
│  NUEVO PROYECTO                                            │
│                                                            │
│  Campo:      [ Proyectos Personales        ▼ ]            │
│  Título:     [ Protocolo de sueño Q3 2026            ]    │
│  Área:       [ personal-health              ▼ ]            │
│  Gravedad:   [ ●●●●●●○○○○○○ ]  6 / 12                     │
│  Jugador:    [ Observador                   ]            │
│                                                            │
│  [ Crear Proyecto ]                                        │
└────────────────────────────────────────────────────────────┘
```

**Flujo lógico:**

1. El Observador elige **cualquier Campo** — laboral, personal u otro definido.
2. Completa título, área y gravedad con un control visual de 1 a 12 (slider o dial, no un campo numérico crudo).
3. Opcionalmente asigna Jugador y fechas.
4. Al crear, el Proyecto aparece inmediatamente en el panel de visualización del Campo correspondiente, listo para recibir fragmentos de voz o texto.

**Principio de diseño:** el formulario manual y el arrastre masivo son **dos puertas al mismo santuario**. No compiten; se complementan. El despacho se actualiza en bloque; la vida personal se siembra en un clic.

#### Cálculo de Gravedad (1–12)

Cuando el Proyecto viene del Excel, la gravedad se deriva de **Prioridad** (1–5) e **Impacto** (1–5): a mayor suma, mayor peso en el espectro 1–12. Un reto 5+5 alcanza gravedad **12** — máxima atracción gravitacional en el sistema. Si faltan datos, el sistema asigna gravedad neutra (6) y marca el Proyecto para **revisión HITL** del Observador antes de que entre en Focus Work.

En creación manual, el Observador fija la gravedad directamente. La recomendación filosófica: reservar 10–12 para retos que genuinamente paralizan si se miran enteros; usar 1–4 para mantenimiento y hábitos de baja carga cognitiva.

### 4.3 La Súper Máquina de Contexto Integrada

DeProcast no procesa inputs aislados. Procesa **convergencia semántica** — tres ríos independientes que desembocan en el mismo océano situado, siempre anclados a un Proyecto y un Campo.

```
                    ┌─────────────────────┐
                    │   RÍO 1: VOZ        │
                    │   (móvil → tacho)   │
                    └──────────┬──────────┘
                               │
    ┌─────────────────────┐    │    ┌─────────────────────┐
    │   RÍO 3: ESTRUCTURA│    │    │   RÍO 2: TEXTO      │
    │   (Excel / Proyectos)│◄───┼───►│   (chats / informes)│
    └──────────┬──────────┘    │    └──────────┬──────────┘
               │               │               │
               └───────────────┼───────────────┘
                               ▼
              ┌────────────────────────────────┐
              │   SÚPER MÁQUINA DE CONTEXTO   │
              │   (convergencia semántica)    │
              │                                │
              │   Campo + Proyecto + Onda      │
              │   → fragmento situado          │
              │   → luz indexable              │
              └────────────────────────────────┘
```

#### Los Tres Inputs

| Input | Origen típico | Qué aporta al contexto |
|-------|---------------|------------------------|
| **Voz del móvil** | `data/tacho/celulares/` — audios de WhatsApp, notas de voz, dictados en trayecto | Intención cruda, matices, urgencia emocional, detalles que nunca se tipean |
| **Texto de chats e informes** | Exports de ChatGPT, informes IA, escritura personal, clips web | Argumentación estructurada, conclusiones, errores documentados, QA sobre causas |
| **Estructura de Proyectos / Excel** | Ingesta de proyectos, catálogo de Bosses | El **esqueleto** — qué retos existen, quién es responsable, qué peso tienen, qué se aprendió antes |

Ninguno de los tres es suficiente solo. La voz sin Proyecto es un audio huérfano. El Excel sin fragmentos de texto es un cementerio de buenas intenciones. El chat sin ancla laboral es una alucinación esperando ocurrir.

#### Regla de Asociación Obligatoria

**Cada audio o texto que entra al sistema debe estar vinculado a un Proyecto y a un Campo antes de completar su ciclo de ingesta.**

Esto no es burocracia: es la diferencia entre un exoesqueleto cognitivo y un gestor de archivos glorificado.

**Flujo de asociación en la UI:**

1. El Observador sube un audio o pega un texto (o el daemon lo detecta en el tacho).
2. Antes de procesar, aparece el **selector de anclaje**: Campo → Proyecto (filtrado por Campo) → confirmación de Onda heredada.
3. Si el contenido menciona explícitamente un reto conocido ("seguimos con lo de las matrículas"), el sistema **sugiere** el Proyecto correspondiente; el Observador valida (HITL).
4. Si no hay Proyecto adecuado, el Observador puede crear uno en el acto desde el mismo flujo — sin abandonar la ingesta.
5. Solo tras confirmar el anclaje, el fragmento entra a esterilización (audio) o a `pending/` (texto) con sus siete dimensiones completas.

**Convergencia en acción — ejemplo Boss 002:**

- La **estructura** declara: Proyecto "Resumir causa penal 25.000 páginas", Onda PROCESAL LABORAL, gravedad alta, Jugador Mantvydas.
- Un **texto** de chat documenta: "24 partes, alucinaciones en resúmenes parciales, necesidad de citar folio exacto".
- Una **nota de voz** del móvil captura: "la parte 7 tiene un error en la cronología, revisar antes de seguir".

Los tres fragmentos, anclados al mismo Proyecto dentro del Campo Laboral — Varona, forman un **campo de contexto cruzado** que el RAG consultará con filtros por Onda y Campo antes de responder. La Súper Máquina no fusiona archivos: **teje relaciones** entre luz del mismo reto.

### 4.4 Visualización y Flujo de Trabajo Funcional

La sección laboral y personal del dashboard es el **panel de gravedad** del Observador — no una lista de tareas, sino un mapa topográfico de retos donde la altura representa peso atencional.

#### Estructura Visual del Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PANEL DE PROYECTOS                                    [ + Nuevo ]      │
│                                                                         │
│  ▼ CAMPO: Laboral — Varona                                              │
│  ├─ ONDA: PROCESAL                                                      │
│  │   ├─ ● Boss 001 — 1.916 matrículas          ████████████ 12  [100%] │
│  │   ├─ ● Boss 003 — Remitente MASC            ████████░░░░  9   [ 40%] │
│  │   └─ ○ Boss 004 — Cartel de camiones        ██████░░░░░░  7   [ 15%] │
│  ├─ ONDA: PROCESAL LABORAL                                              │
│  │   ├─ ★ Boss 002 — Causa 25.000 páginas      ███████████░ 11  [ 60%] │
│  │   └─ ○ Boss 005 — Cruce cualitativo         █████░░░░░░░  6   [  5%] │
│  └─ ONDA: TRIBUTARIO                                                    │
│      └─ ○ Boss 006 — Rentas                    ███████░░░░░  8   [ 20%] │
│                                                                         │
│  ▼ CAMPO: Proyectos Personales                                          │
│  └─ ONDA: personal-health                                               │
│      └─ ○ Protocolo de sueño Q3                ██████░░░░░░  6   [  — ] │
└─────────────────────────────────────────────────────────────────────────┘

  ★ = Boss Activo (gravedad 10–12)    ● = Boss estándar    ○ = semilla o baja gravedad
```

**Principios de agrupación:**

1. **Primer nivel: Campo** — separación visual clara entre laboral y personal (colores o secciones plegables distintas).
2. **Segundo nivel: Área (Onda)** — dentro de cada Campo, los Proyectos se agrupan por taxonomía temática. El Observador ve de un vistazo que tiene tres frentes procesales abiertos y uno tributario, no una lista plana de diez ítems.
3. **Tercer nivel: Proyecto** — cada tarjeta muestra título, barra de gravedad (1–12), porcentaje de avance y estado visual.

#### Bosses Activos — La Gravedad que Manda

Los Proyectos con **gravedad 10 a 12** no son filas más en una tabla. Son **Bosses Activos**: entidades gravitacionales que el sistema trata de forma diferenciada.

| Comportamiento | Boss estándar (1–9) | Boss Activo (10–12) |
|----------------|---------------------|---------------------|
| Visualización | Tarjeta normal en su Onda | Destacado con indicador ★, borde de alta señal, posición privilegiada |
| Focus Work | Entra en cola según rotación y Puntos de Señal | **Demanda atención prioritaria** — aparece en la cabecera de la pantalla de Focus Work |
| Fragmentación | Microtareas estándar (< 15 min) | La Trituradora corta más agresivamente; el Observador nunca ve el reto entero de golpe |
| Dopamina | Recompensa proporcional al peso | Recompensa amplificada + riesgo de frustración monitorizado (bucle HITL más sensible) |

**Ejemplos canónicos de Boss Activo en Varona:**

- **Boss 001 — 1.916 matrículas** (gravedad 12): validación masiva MASC. Un reto que paralizaría si se presentara como bloque único; la Trituradora lo convirtió en unidades de 3 días de jornada con marcado exacto de errores.
- **Boss 002 — Causa 25.000 páginas** (gravedad 11): compresión causal penal. La magnitud activa amígdala; el sistema lo mantiene visible como Boss Activo hasta que el Observador declare resolución o downgrade de gravedad.

Los Bosses Activos son el **termómetro de carga cognitiva** del Campo. Si hay más de tres simultáneos, el panel muestra una advertencia suave: el Observador está operando por encima de la capacidad prefrontal sostenible. No es castigo; es espejo.

#### Flujo de Trabajo Diario del Observador

```
  Mañana                          Durante el día                    Cierre
  ───────                         ──────────────                    ──────
  Abrir panel        ──►    Asociar voz/texto        ──►    Revisar Bosses
  de Proyectos              a Proyecto + Campo              Activos pendientes
       │                           │                              │
       ▼                           ▼                              ▼
  Ver Bosses           Iniciar Focus Work con         Calibrar gravedad
  Activos ★            microtarea del Boss            de semillas (HITL)
                       de mayor peso
```

1. **Apertura:** el Observador consulta el panel. Los Bosses Activos (★) son lo primero que ve dentro del Campo laboral.
2. **Ingesta situada:** cualquier captura del día se ancla antes de procesar. No hay "procesar después".
3. **Focus Work:** al entrar en sesión, la cola prioriza microtareas de Bosses Activos. Una sola microtarea visible; timer ≤ 15 min; Estudianta acumula Puntos de Señal.
4. **Cierre:** semillas sin gravedad, frustraciones altas del día, y Bosses estancados quedan marcados para la próxima sesión de calibración.

Este flujo cierra el circuito entre **estructura** (qué retos existen), **contexto** (qué se sabe de ellos) y **acción** (qué micro-unidad ejecutar ahora) — sin que ningún byte salga de la máquina local.

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

### 4.6 Contrato de Transmutación (Excel → Proyectos Vivos)

La ingesta masiva no termina cuando el archivo se parsea. Termina cuando cada fila válida existe como **Proyecto anclado** dentro del Campo elegido, con su gravedad calculada o marcada para revisión, y con el contexto histórico (Observaciones + Puntos de mejora) disponible para la Súper Máquina.

**Entradas:** archivo del despacho + Campo destino + confirmación HITL del Observador.

**Salidas por fila:**

- Un Proyecto en el catálogo del Campo, con Onda, título, gravedad, Jugador y estado de avance.
- Un fragmento de conocimiento estructurado (Markdown con las siete dimensiones) listo para indexación RAG.
- Semillas visibles pero inactivas para filas incompletas — el Observador las completa desde el formulario manual o desde el panel.

**Regla de idempotencia:** reimportar el mismo Excel no duplica Proyectos; actualiza los existentes por identificador estable y preserva el historial de fragmentos ya asociados.

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
