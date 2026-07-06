"use client";

import { HeadphonesIcon } from "lucide-react";

export function EducationalCard() {
  return (
    <div className="space-y-5">
      <div className="space-y-3 text-sm leading-relaxed text-white/60">
        <p>
          Los tonos binaurales funcionan enviando dos frecuencias puras
          ligeramente distintas: una exclusivamente al oído izquierdo y otra al
          derecho. Tu cerebro no escucha dos tonos separados; el tronco
          encefálico calcula la{" "}
          <span className="text-amber-200/90">diferencia entre ambas</span> y
          genera una percepción interna llamada frecuencia de batido.
        </p>
        <p>
          Ese cálculo diferencial puede inducir un fenómeno de{" "}
          <span className="text-emerald-200/90">arrastre neural</span>{" "}
          (entrainment): las ondas cerebrales tienden a sincronizarse con la
          frecuencia binaural elegida — Delta para descanso profundo, Theta para
          creatividad, Alpha para flujo relajado, Beta para concentración activa
          o Gamma para foco intenso.
        </p>
        <p className="text-white/45">
          Todo el audio se genera en tiempo real en tu navegador mediante la Web
          Audio API. No se cargan archivos externos ni se envían datos a ningún
          servidor.
        </p>
      </div>

      <div
        role="alert"
        className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
      >
        <HeadphonesIcon
          className="mt-0.5 size-5 shrink-0 text-amber-400/80"
          aria-hidden
        />
        <p className="font-mono text-xs leading-relaxed text-amber-100/90">
          <span className="font-semibold uppercase tracking-wider">
            Advertencia importante:
          </span>{" "}
          Es estrictamente necesario el uso de auriculares estéreo para que el
          efecto neurológico de arrastre ocurra. Sin separación real entre
          canales izquierdo y derecho, el cerebro no puede calcular la
          diferencia de frecuencia.
        </p>
      </div>
    </div>
  );
}
