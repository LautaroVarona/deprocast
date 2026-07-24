/**
 * Control en memoria de la cola STT (pausa de envíos a Deepgram).
 * Separado de processing-queue para que el loop de chunks pueda consultarlo
 * sin importar el procesador.
 */

const globalForPause = globalThis as typeof globalThis & {
  __deprocastQueuePaused?: boolean;
};

export function isQueuePaused(): boolean {
  return globalForPause.__deprocastQueuePaused === true;
}

export function setQueuePaused(paused: boolean): void {
  globalForPause.__deprocastQueuePaused = paused;
  console.info(
    `[processing-queue] Envíos a Deepgram ${paused ? "PAUSADOS" : "reanudados"}`,
  );
}
