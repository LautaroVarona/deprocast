# Auditoria visual y UX de Deprocast OS

Fecha: 2026-07-21

Este informe audita el estado actual de la interfaz (UI/UX visual) del repositorio Deprocast OS a partir del sistema de diseno (tokens), componentes recurrentes y rutas clave. No modifica ningun archivo del sistema.

---

## 1. COLORES Y PALETA CROMATICA

### 1.1 Tokenizacion semantica (CSS vars) + mapeo a Tailwind v4

El proyecto usa Tailwind v4 con tokens definidos en CSS mediante `@theme inline` (no hay `tailwind.config.ts/js`). La base de colores semanticos vive en `app/globals.css` con dos modos: `:root` (light) y `.dark` (modo oscuro). Ademas, se define una variante `dark:` que aplica dentro de cualquier descendiente de `.dark`.

```1:49:app/globals.css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}
```

Ademas, se fija la aplicacion base:

```124:134:app/globals.css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

#### Light mode (`:root`) - variables completas

```52:86:app/globals.css
::root {
  color-scheme: light;
  --background: oklch(0.985 0.004 85);
  --foreground: oklch(0.21 0.02 265);
  --card: oklch(1 0.002 85);
  --card-foreground: oklch(0.21 0.02 265);
  --popover: oklch(1 0.002 85);
  --popover-foreground: oklch(0.21 0.02 265);
  --primary: oklch(0.28 0.03 265);
  --primary-foreground: oklch(0.99 0.002 85);
  --secondary: oklch(0.96 0.006 85);
  --secondary-foreground: oklch(0.28 0.03 265);
  --muted: oklch(0.955 0.006 85);
  --muted-foreground: oklch(0.46 0.02 265);
  --accent: oklch(0.94 0.01 85);
  --accent-foreground: oklch(0.28 0.03 265);
  --destructive: oklch(0.52 0.19 27);
  --border: oklch(0.88 0.008 85);
  --input: oklch(0.91 0.008 85);
  --ring: oklch(0.55 0.04 265);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.98 0.004 85);
  --sidebar-foreground: oklch(0.21 0.02 265);
  --sidebar-primary: oklch(0.28 0.03 265);
  --sidebar-primary-foreground: oklch(0.99 0.002 85);
  --sidebar-accent: oklch(0.955 0.006 85);
  --sidebar-accent-foreground: oklch(0.28 0.03 265);
  --sidebar-border: oklch(0.88 0.008 85);
  --sidebar-ring: oklch(0.55 0.04 265);
}
```

#### Dark mode (`.dark`) - variables completas

```88:122:app/globals.css
.dark {
  color-scheme: dark;
  --background: oklch(0.17 0.015 265);
  --foreground: oklch(0.93 0.01 85);
  --card: oklch(0.21 0.018 265);
  --card-foreground: oklch(0.93 0.01 85);
  --popover: oklch(0.21 0.018 265);
  --popover-foreground: oklch(0.93 0.01 85);
  --primary: oklch(0.91 0.01 85);
  --primary-foreground: oklch(0.17 0.015 265);
  --secondary: oklch(0.26 0.018 265);
  --secondary-foreground: oklch(0.93 0.01 85);
  --muted: oklch(0.26 0.018 265);
  --muted-foreground: oklch(0.68 0.02 265);
  --accent: oklch(0.28 0.02 265);
  --accent-foreground: oklch(0.93 0.01 85);
  --destructive: oklch(0.68 0.17 25);
  --border: oklch(0.34 0.02 265 / 55%);
  --input: oklch(0.28 0.02 265 / 80%);
  --ring: oklch(0.58 0.04 265);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.21 0.018 265);
  --sidebar-foreground: oklch(0.93 0.01 85);
  --sidebar-primary: oklch(0.65 0.15 265);
  --sidebar-primary-foreground: oklch(0.99 0.002 85);
  --sidebar-accent: oklch(0.26 0.018 265);
  --sidebar-accent-foreground: oklch(0.93 0.01 85);
  --sidebar-border: oklch(0.34 0.02 265 / 55%);
  --sidebar-ring: oklch(0.58 0.04 265);
}
```

### 1.2 Coexistencia de modos (toggle) + skins Noir por modulo

El modo claro/oscuro se controla con `next-themes` usando la clase `.dark` en el elemento `html`:

```6:17:components/providers.tsx
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="deprocast-theme"
      disableTransitionOnChange
    >
      <BabelProvider>{children}</BabelProvider>
    </ThemeProvider>
  );
}
```

En UI, el toggle usa `setTheme` y espera a que el componente este montado:

```9:40:components/theme-toggle.tsx
export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn("text-muted-foreground", className)}
        disabled
        aria-hidden
      />
    );
  }
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      ...
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Activar modo diurno" : "Activar modo oscuro"}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
```

Ademas del toggle global, `app/globals.css` define varias skins "noir" que fuerzan fondos, bordes y acentos por dominio/modulo. En el archivo aparecen las siguientes familias principales:

- `.x-bookmark-noir-root` / `.x-bookmark-noir-panel` (acento azul)
- `.jornada-noir-root` / `.jornada-noir-panel` (acento cyan + amber) y scanlines `jornada-scanlines`
- `.molecular-noir-root` / `.molecular-noir-panel` (acento esmeralda + violeta)
- `.audio-noir-root` / `.audio-noir-panel` (acento sky/cyan)
- `.archivo-noir-root` / `.archivo-noir-panel` (acento sky/cyan)
- `.finanzas-noir-root` / `.finanzas-noir-panel` (acento esmeralda/emerald)
- `.yo-noir-root` / `.yo-noir-panel` (acento amber)
- `.calendario-noir-root` / `.calendario-noir-panel` (acento cyan + violeta)
- `.hud-noir-root` / `.hud-noir-panel` (acento amber)
- `.enciclopedia-noir-root` / `.enciclopedia-noir-panel` (acento amber)
- `.binauralizer-noir-root` / `.binauralizer-noir-panel` (acento amber + emerald)
- `.isochronic-noir-root` (acento rose)
- `.cam-recorder-noir-root` / `.cam-recorder-noir-panel` (terminal noir absoluto)
- `.babel-noir-root` / `.dark .babel-noir-root` (usa `var(--background)` con overlay en modo dark)
- `.ludus-noir-root` / `.dark .ludus-noir-root` (usa `var(--background)` con override en dark)

Diagnostico: esto crea dos capas visuales:
1) "Superficies" semanticas (`bg-background`, `border-border`, etc.) para el sistema shadcn/base-nova.
2) "Skins" noir que pueden ignorar o sobreescribir el toggle global, forzando #000/#050505 y acentos hardcodeados.

### 1.3 Diagnostico de contraste y consistencia (tokens vs hardcoding)

**Consistencia alta** cuando los componentes usan tokens semanticos:
- `Card`, `Button`, `Badge`, `Sheet` y `CommandMenu` usan clases basadas en `bg-background`, `border-border`, `text-foreground`, `ring-ring`, etc.

**Inconsistencia** donde hay hardcoding de Tailwind (zinc/emerald/cyan/amber) y colores directos (incluye hex y `#000000`):
- `SaludWorkspace` fuerza un fondo y escala de zinc: `bg-zinc-950`, `bg-zinc-900/40`, `text-zinc-*`.
- `CalendarioWorkspace` usa bordes y textos con opacidades no semanticas: `border-white/8`, `text-cyan-400/60`, `text-zinc-600`.
- `PulseInjection` fuerza `bg-black/40`, bordes amber y cambios de estado con `border-emerald-400/40`.
- `LudusWorldMap` mezcla tokens con hardcoding y gradientes (incluye valores tipo `text-[#FFB000]/70` en `/yo`).

**Riesgo concreto de coherencia en modo dark**:
- Algunas skins noir tienen override explicito en `.dark ...` (`babel-noir-root`, `ludus-noir-root`).
- Otras skins noir utilizan `#000000` o negros absolutos sin ajustar segun el toggle. Resultado: un usuario puede alternar el theme global pero el dominio noir permanece "siempre oscuro" (lo cual puede ser intencional para la identidad Noir, pero rompe expectativa de consistencia entre paginas).

---

## 2. TIPOGRAFIA Y FUENTES

### 2.1 Fuentes cargadas

En el layout root se cargan **Geist Sans** y **Geist Mono** via `next/font/google`:

```5:16:app/layout.tsx
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

Se inyectan en el elemento `html`:

```30:36:app/layout.tsx
<html
  lang="es"
  className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
>
...
</html>
```

### 2.2 Aplicacion tipografica y escala observada

No se observa una escala global declarada para `h1/h2/h3` en `app/globals.css`. En cambio, la jerarquia se define con Tailwind clases en cada componente (por ejemplo, `TacticalHud` define su `h1` directamente).

Puntos clave del patron tipografico:

- **Sans (general)**: aplicada en base a `@layer base html { @apply font-sans; }` (pero ver nota de posible mismatch abajo).
- **Mono (consola / etiquetas tacticas / microcopy)**: `font-mono` se usa intensivamente para:
  - labels de HUD
  - titulos de secciones tacticas
  - badges de atajos (`kbd`)
  - filtros compactos.
- **Encabezados** (escala variable por ruta):
  - `/` (HUD tactico): `h1` con `text-2xl md:text-3xl` (alto impacto visual).
  - `/calendario`: `h1` pequeno con `text-lg`.
  - `/grafo`: `h1` y paneles usando `text-sm` / `text-base`.
  - `/salud`: `h1` reducido (`text-sm`).

Ejemplos:

```12:22:components/hud/tactical-hud.tsx
<h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
  HUD Tactico
</h1>
<p className="mt-1 max-w-xl text-sm text-white/45">
  Inyecta materia, vigila el Atanor y baja a la trinchera sin friccion.
</p>
```

```565:567:components/grafo/grafo-workspace.tsx
<h2 className="mt-1 text-base font-semibold break-words">
  {detail.node.primaryName}
</h2>
```

Microcopy tactico:

```286:288:components/command-menu/command-menu.tsx
<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
  Portal de navegacion
</p>
```

Ejemplo de `kbd` (mono + tamano mini):

```121:124:components/diario/journal-canvas.tsx
<kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[9px]">
  {modifierKey}
  {" + Enter"}
</kbd>
```

### 2.3 Nota de consistencia de `font-sans`

En `app/globals.css` se mapea `--font-sans` de forma auto-referencial:

```7:13:app/globals.css
@theme inline {
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
...
}
```

Con el comportamiento actual, el uso de `font-sans` puede depender de como `shadcn/tailwind.css` o Tailwind resuelvan `font-sans` por defecto. Visualmente, muchas paginas se apoyan en `font-mono`, por lo que el impacto puede ser bajo, pero la coherencia completa del sistema tipografico queda como un riesgo.

---

## 3. POSICIONAMIENTO, ESTRUCTURA Y LAYOUT

### 3.1 Shell global (header + main)

`AppShell` introduce la estructura:

```6:14:components/app-shell.tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  ...
  return (
    <>
      <AppHeader onOpenCommandMenu={() => setOpen(true)} />
      <CommandMenu open={open} onOpenChange={setOpen} />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </>
  );
}
```

El header global es sticky, con altura `h-14` y un padding horizontal responsive:

```28:35:components/app-header.tsx
<header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
  <div className="flex h-14 w-full items-center gap-4 px-4 sm:gap-6 sm:px-6">
...
  </div>
</header>
```

No existe sidebar global; la navegacion principal es horizontal (header), y las "sidebars reales" aparecen a nivel de pagina (por ejemplo `/grafo` y `/calendario`).

### 3.2 Altura del viewport y estrategia de scroll (patron repetido)

Muchas paginas/workspaces fijan altura para restar el header:

- `finanzas/layout.tsx`: usa `h-[calc(100dvh-3.5rem)]`.
- `calendario/layout.tsx`, `salud/layout.tsx`, `grafo/layout.tsx`: usan el mismo patron y `overflow-hidden` para contener scroll interno.

Ejemplo:

```1:7:app/calendario/layout.tsx
export default function CalendarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      {children}
    </div>
  );
}
```

### 3.3 Rutas clave (grid, contenedores y densidad)

#### `/` Home (HUD tactico)

Estructura:
- wrapper noir `hud-noir-root`
- overlay de scanlines via `absolute inset-0 jornada-scanlines opacity-30`
- contenedor centrado con `max-w-5xl`
- scroll interno `overflow-y-auto`.

Evidencia:

```9:13:components/hud/tactical-hud.tsx
<div className="hud-noir-root flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden text-foreground">
  <div className="pointer-events-none absolute inset-0 jornada-scanlines opacity-30" />
  <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col gap-5 overflow-y-auto px-4 py-6 md:px-6">
```

Densidad: media; se usa `gap-5`, `px-4 py-6` y el area principal se organiza con grid 2 columnas en `lg+`.

#### `/finanzas`

Estructura:
- `finanzas-noir-root` (noir esmeralda)
- header interno con `border-b` y padding `px-4 py-4`
- contenido scroll interno con `overflow-y-auto`
- contenedor `mx-auto max-w-5xl`.

Evidencia:

```214:227:components/finanzas/finanzas-workspace.tsx
<div className="finanzas-noir-root flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
  <header className="shrink-0 border-b border-white/5 px-4 py-4 md:px-6">
...
  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
```

Densidad: media-alta por acumulacion de secciones (ingesta + pendientes + 2x2 metricas).

#### `/calendario`

Estructura:
- wrapper noir `calendario-noir-root`
- header compacto con `border-b`
- main dividido en:
  - columna principal flexible (week/month/day)
  - `SuggestionDeck` como aside.
- `overflow-hidden` para evitar doble scroll y mantener layout estable.

Evidencia:

```249:278:components/calendario/calendario-workspace.tsx
<div className="calendario-noir-root flex h-full min-h-0 flex-col overflow-hidden">
  <header className="shrink-0 border-b border-white/8 px-4 py-3">
...
  <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
...
```

Aside del mazo:

```37:41:components/temporal/suggestion-deck.tsx
<aside className={cn(
  "flex w-full shrink-0 flex-col rounded-xl border lg:w-64",
  panelClass,
)}>
```

Densidad: alta. Se emplean muchos textos de 9-11px (con uppercase y tracking) y padding reducido (`p-3`, `gap-3`).

#### `/salud`

Estructura:
- fondo forzado `bg-zinc-950` (no usa tokens semanticos globales en superficie principal)
- header con tabs Alimentacion/Entrenamiento
- grid `lg:grid-cols-[1.05fr_0.95fr]` sin `max-w-*` (ocupa ancho completo)
- panel izquierdo: ingesta (textarea o tabla) con borde zinc
- panel derecho: totales y lista con `overflow-auto`.
- overlay flotante de borrador con `absolute inset-x-0 bottom-3`.

Evidencia:

```155:177:components/salud/salud-workspace.tsx
<div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950">
  <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2">
...
  <div className="grid min-h-0 flex-1 gap-2 overflow-hidden p-2 lg:grid-cols-[1.05fr_0.95fr]">
    <section className="flex min-h-0 flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2">
```

Overlay de borrador:

```291:302:components/salud/salud-workspace.tsx
{draftState ? (
  <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
    <div className="pointer-events-auto w-full max-w-2xl">
      <HealthDraftCard ... />
    </div>
  </div>
) : null}
```

Densidad: muy alta (padding `p-2`, tipografia `text-xs` y listas compactas).

#### `/grafo`

Estructura:
- barra superior con tabs (grafo/proyectos/stats/duplicados) y utilidades
- modo "grafo": layout 2 columnas (canvas + aside detalle)
- canvas en `relative min-h-0 flex-1 bg-muted/20`
- aside `w-80` con `border-l`.

Evidencia:

```314:381:components/grafo/grafo-workspace.tsx
{tab === "grafo" && (
  <div className="flex min-h-0 flex-1">
    <div className="flex min-w-0 flex-1 flex-col">
      ...
      <div className="relative min-h-0 flex-1 bg-muted/20">
        <ForceGraph ... />
      </div>
    </div>
    <NodeDetailPanel ... />
  </div>
)}
```

Aside:

```545:546:components/grafo/grafo-workspace.tsx
<aside className="w-80 shrink-0 overflow-y-auto border-l border-border p-4">
```

Densidad: media; se mantiene `overflow-y-auto` solo en el aside y en secciones especificas.

#### `/yo`

Estructura:
- wrapper terminal amber `yo-noir-root`
- contenedor estrecho centrado `mx-auto max-w-3xl` y `gap-6`
- carga muestra un placeholder en mono.

Evidencia:

```77:84:components/yo/yo-command-center.tsx
return (
  <div className="yo-noir-root px-4 py-8 md:px-8 md:py-10">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <OperatorProfile ... />
      <ContinuousCalibrationForm ... />
    </div>
  </div>
);
```

Densidad: baja-media; mas aire relativo comparado con salud/calendario.

#### `/ludus`

Estructura:
- `ludus-noir-root castillo-dot-grid` como fondo con grid de puntos
- pagina con scroll vertical `overflow-y-auto`
- secciones centradas `mx-auto max-w-5xl`
- cartas "castillo" y grid de areas (cards) `md:grid-cols-3`.

Evidencia (seccion de areas):

```71:83:components/ludus/ludus-world-map.tsx
<div className="grid gap-6 md:grid-cols-3">
  {LUDUS_AREAS.map((area) => {
...
  <article className={cn(
    "castillo-card relative flex h-full min-h-[220px] flex-col overflow-hidden p-6 transition-all duration-300",
    area.available
      ? cn("cursor-pointer hover:-translate-y-1 hover:shadow-2xl", styles.border)
      : "cursor-not-allowed opacity-55",
  )}>
```

Densidad: media; estilo de videojuego con grandes targets visuales.

---

## 4. COMPONENTES VISUALMENTE RECURRENTES (UI KIT DE FACTO)

### 4.1 Cards

**Card base (sistema semantico)** en `components/ui/card.tsx`:
- `rounded-xl`
- `bg-card`
- borde/ring `ring-1 ring-foreground/10`
- footer consistente `border-t bg-muted/50`.

Evidencia:

```11:18:components/ui/card.tsx
className={cn(
  "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 ...",
  className
)}
```

**Cards Noir (dominio)** suelen usar zinc/hardcoding y CSS global:
- Ejemplo salud HITL: `HealthDraftCard` con `border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-2xl`.

```41:54:components/salud/shared/health-draft-card.tsx
<div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-2xl">
  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
    Borrador health-broker
  </p>
  <p className="mt-1 text-sm text-zinc-100">{compact || draft.summary}</p>
  <div className="mt-2 flex items-center gap-2">
    <Button size="sm" onClick={onApprove} disabled={isSaving}>Aprobar</Button>
    <Button size="sm" variant="outline" onClick={onDiscard} disabled={isSaving}>Descartar</Button>
  </div>
</div>
```

### 4.2 Botones

El boton canonicamente usa:
- `focus-visible:ring-3 ring-ring/50`
- `active:not-aria-[haspopup]:translate-y-px`
- estados `disabled:pointer-events-none disabled:opacity-50`.

Evidencia:

```6:20:components/ui/button.tsx
const buttonVariants = cva(
  "group/button inline-flex ... transition-all ... focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 ...",
  { variants: { variant: { default: "bg-primary text-primary-foreground hover:bg-primary/80", ... } } }
)
```

En noir, los modulos implementan variantes "manuales":
- `PulseInjection` usa botones icon con clases amber/rose/emerald (hardcoded) y loaders animate-spin.

```258:296:components/hud/pulse-injection.tsx
<div className={cn(
  "flex items-stretch gap-2 rounded-2xl border border-amber-500/20 bg-black/40 p-2 shadow-[inset_0_1px_0_rgba(251,191,36,0.08)]",
  "focus-within:border-amber-400/40 focus-within:ring-1 focus-within:ring-amber-500/20",
  successFlash && "border-emerald-400/40",
)}>
  ...
  <Button ... disabled={isSubmitting} className={cn(
    "size-11 shrink-0 border-amber-500/30",
    isRecording && "animate-pulse border-rose-400/50 bg-rose-500/20 text-rose-200",
  )}>
    {isRecording ? <SquareIcon className="size-4" /> : <MicIcon className="size-4" />}
  </Button>
  <Button ... disabled={...}>
    {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : <SendHorizonalIcon className="size-4" />}
  </Button>
</div>
```

### 4.3 Badges / Chips

El `Badge` base:
- estilo pill `rounded-4xl`
- altura fija `h-5`
- variantes `default/secondary/destructive/outline/ghost/link`.

Evidencia:

```7:22:components/ui/badge.tsx
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit ... rounded-4xl border ... px-2 py-0.5 text-xs ... focus-visible:ring-[3px] focus-visible:ring-ring/50 ...",
  { variants: { variant: { default: "bg-primary text-primary-foreground ...", outline: "border-border text-foreground ...", ghost: "hover:bg-muted hover:text-muted-foreground ...", ... } } }
)
```

En UX tactico, la UI usa badges tipo `kbd` con `font-mono` y tamanos 9-10px:

```415:417:components/command-menu/command-menu.tsx
function HotkeyBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}
```

### 4.4 Modales / Sheets / Overlays

No se observa un `Dialog` shadcn estandar: el sistema usa componentes propios:

**Sheet** (`components/ui/sheet.tsx`):
- overlay `fixed inset-0 z-50 flex justify-end`
- click en overlay cierra
- `Escape` cierra con listener de teclado
- `body` sin scroll mientras esta abierto.

Evidencia:

```15:26:components/ui/sheet.tsx
useEffect(() => {
  if (!open) return;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") onOpenChange(false);
  };
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", onKeyDown);
  return () => {
    document.body.style.overflow = "";
    window.removeEventListener("keydown", onKeyDown);
  };
}, [open, onOpenChange]);
```

Overlay + panel:

```31:45:components/ui/sheet.tsx
return (
  <div className="fixed inset-0 z-50 flex justify-end">
    <button
      type="button"
      aria-label="Cerrar panel"
      className="absolute inset-0 bg-black/40 backdrop-blur-[1px] dark:bg-black/60"
      onClick={() => onOpenChange(false)}
    />
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "relative flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-200",
        className,
      )}
    >
      {children}
    </div>
  </div>
);
```

**CommandMenu** (modal overlay central):
- overlay con `bg-black/55 backdrop-blur-sm`
- contenedor con borde `border-amber-500/20` y animacion `fade-in zoom-in-95`.

```265:281:components/command-menu/command-menu.tsx
return (
  <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] sm:p-6">
    <button
      type="button"
      aria-label="Cerrar menu"
      className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={close}
    />
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-500/20",
        "bg-background/95 shadow-2xl shadow-amber-500/10 backdrop-blur-md",
        "animate-in fade-in zoom-in-95 duration-200",
      )}
    >
...
    </div>
  </div>
);
```

### 4.5 Inputs / Ingest recurrente

El patron general de inputs en modo "ingesta HITL" combina:
- label en mono uppercase con tracking
- panel con borde/ring y fondo noir o token
- acciones con botones icon o CTA.

Ejemplo: PulseInjection.
Ejemplo: SaludWorkspace usa textarea con `bg-transparent` dentro del panel noir zinc.

---

## 5. EXPERIENCIA DE USUARIO (UX) Y FEEDBACK VISUAL

### 5.1 Respuesta a acciones (hover/focus/active/disabled)

El sistema de botones base establece:
- focus visible con ring coherente a `ring-ring`
- active con desplazamiento (micro-interaction)
- disabled con opacidad y sin interaccion.

Evidencia:

```6:8:components/ui/button.tsx
"... focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 ... "
```

Ejemplos de hover en cards noir:

```79:83:components/ludus/ludus-world-map.tsx
area.available
  ? cn("cursor-pointer hover:-translate-y-1 hover:shadow-2xl", styles.border)
  : "cursor-not-allowed opacity-55"
```

### 5.2 Loading y estados del sistema

Se usa el spinner estandar de Lucide con `animate-spin`:
- En CommandMenu al buscar.
- En PulseInjection al enviar.
- En Toaster (sonner) para toasts loading.

Evidencia (CommandMenu):

```314:319:components/command-menu/command-menu.tsx
{isSearching ? (
  <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
) : (
  <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
    ⌘K
  </span>
)}
```

Evidencia (sonner):

```27:29:components/ui/sonner.tsx
loading: (
  <Loader2Icon className="size-4 animate-spin" />
),
```

### 5.3 Hotkeys y consistencia visual de badges

CommandMenu implementa hotkeys globales:
- `Escape` cierra
- `Ctrl`/`Meta` + `K` abre y enfoca busqueda (cuando el foco no esta en inputs/textarea)
- `Alt + tecla` navega a rutas por hotkey
- flechas `ArrowDown/ArrowUp` recorren items
- `Enter` selecciona
- digitos `1-9` seleccion rapida solo cuando el target es editable.

Evidencia (manejo de teclado):

```183:207:components/command-menu/command-menu.tsx
if (event.key === "Escape") {
  ...
  close();
  return;
}
if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
  event.preventDefault();
  inputRef.current?.focus();
  return;
}
if (event.altKey && !event.metaKey && !event.ctrlKey) {
  const route = findRouteByHotkey(event.key);
  if (route) {
    event.preventDefault();
    navigate(route.href);
  }
  return;
}
if (event.key === "ArrowDown") { ... }
if (event.key === "ArrowUp") { ... }
if (event.key === "Enter" && entries[activeIndex]) { ... }
```

La UI tambien hace visible el atajo:
- `Cmd+K` como badge en el header del modal.
- badges por ruta usando `HotkeyBadge`.

Evidencia (badge inline):

```316:324:components/command-menu/command-menu.tsx
<span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
  ⌘K
</span>
```

Otros modulos muestran atajos similares:
- `JournalCanvas`: `Ctrl/Cmd + Enter` guarda, con `kbd` visual.

Evidencia (guardar por hotkey):

```51:57:components/diario/journal-canvas.tsx
const handleKeyDown = useCallback(
  (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (canSave) onSave();
    }
  },
  [canSave, onSave],
);
```

Y el `kbd`:

```121:124:components/diario/journal-canvas.tsx
<kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[9px]">
  {modifierKey}
  {" + Enter"}
</kbd>
```

### 5.4 Transiciones y animaciones

No se detecta framer-motion u otras librerias animadas en componentes clave; la animacion proviene de:
- clases Tailwind `animate-in`, `fade-in`, `zoom-in-95`, `slide-in-from-right`
- CSS animations en `app/globals.css` (por ejemplo scanlines y glows noir).

Ejemplos:
- CommandMenu: `animate-in fade-in zoom-in-95 duration-200`
- Sheet: `animate-in slide-in-from-right duration-200`
- Toaster loading: `animate-spin`
- Scanlines (HUD/ Jornanda): `jornada-scanlines` (CSS keyframes).

---

## 6. RESUMEN DE BRECHAS Y PUNTOS DE FRICCION VISUAL

1. **Divergencia entre sistema semantico y skins noir hardcodeadas**
   - El sistema semantico (`bg-background`, `border-border`, `text-foreground`) es consistente para primitives (`Card`, `Button`, `Badge`, `Sheet`).
   - Pero varias paginas dominan por hardcoding zinc/emerald/cyan/amber, rompiendo uniformidad visual.
   - Ejemplo: `SaludWorkspace` fuerza `bg-zinc-950`, `bg-zinc-900/40`, `border-zinc-800`.

   ```155:163:components/salud/salud-workspace.tsx
   <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950">
     <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2">
   ```

2. **Inconsistencia de expectativa con el toggle de theme**
   - El theme global cambia `html` via `.dark`.
   - Algunas skins noir reaccionan a `.dark` (`babel-noir-root`, `ludus-noir-root`), otras usan `#000000`/negro absoluto sin override.
   - Resultado: el toggle no produce un cambio visual equivalente en todas las rutas (posiblemente intencional por identidad Noir, pero genera friccion de coherencia).

3. **Riesgo de mismatch tipografico en `font-sans`**
   - `app/globals.css` define `--font-sans: var(--font-sans)` (auto-referencia).
   - Esto puede dejar `font-sans` dependiendo de defaults externos.
   - Visualmente hoy se mitiga porque `font-mono` domina el microcopy tactico, pero la consistencia del sistema tipografico completo queda incompleta.

4. **Densidad extrema y legibilidad (especialmente microcopy 9-10px)**
   - En varias rutas se usa `text-[9px]` y `text-[10px]` con uppercase + tracking alto:
     - `CommandMenu` y `CalendarioWorkspace`
     - `SuggestionDeck` usa textos comprimidos para titulos y metadatos.
   - Riesgo: fatiga visual y accesibilidad (contraste/target size), especialmente en pantallas pequenas.

   Evidencia:

   ```272:274:components/calendario/calendario-workspace.tsx
   <p className="mt-2 font-mono text-[9px] text-zinc-600">
    1·2·3 vistas · Enter coagular · C confirmar rutina · S saltear · Shift+área filtrar
   </p>
   ```

5. **Overlay flotante puede interferir con el flujo en rutas densas**
   - `SaludWorkspace` coloca `HealthDraftCard` absoluto al fondo con `pointer-events-none` en el wrapper.
   - Si el usuario esta escribiendo (textarea tabla) o necesita scroll, puede ocurrir superposicion perceptual.

6. **Falta de unificacion de primitivas de superficie noir**
   - Hay estilos noir definidos en `app/globals.css` (good), pero componentes principales a veces implementan sus propios fondos con `bg-black/40` + clases amber/cyan directas.
   - Resultado: hay multiples maneras validas de lograr un mismo "mood", lo cual complica consistencia fina (bordes, sombras, blur, radios, alpha).

---

Si quieres, puedo convertir este informe en una lista priorizada de ajustes (por ejemplo: "normalizar surfaces noir", "centralizar tokens de acento por dominio", "corregir font-sans", "definir escala microcopy 9-10px con reglas de accesibilidad") y proponerte cambios de arquitectura visual con diffs controlados.

