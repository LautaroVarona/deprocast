import { requestCancellation } from "@/lib/processing-cancellation";
import {
  isQueuePaused,
  setQueuePaused,
} from "@/lib/processing-queue-control";
import { prisma } from "@/lib/prisma";

type QueueStatus = {
  active: {
    id: string;
    filename: string;
    partialText: string | null;
    status: string;
  } | null;
  queuedIds: string[];
  queuedCount: number;
  purifyingIds: string[];
  /** Si true, no se inician jobs nuevos y el STT espera entre segmentos. */
  paused: boolean;
};

/** Cola STT durable: SSOT = AudioAsset.status en SQLite (PENDING/PROCESSING/…). */
class ProcessingQueue {
  private running = false;
  private activeId: string | null = null;
  /** Auto-purify post-STT es efímero; no sobrevive reinicios (el transcript sí). */
  private purifyingIds = new Set<string>();
  private reclaimPromise: Promise<number> | null = null;

  /** Reclama PROCESSING stale → PENDING y arranca el drenado. Idempotente. */
  async reclaimAndDrain(): Promise<number> {
    if (!this.reclaimPromise) {
      this.reclaimPromise = (async () => {
        const stale = await prisma.audioAsset.updateMany({
          where: { status: "PROCESSING" },
          data: { status: "PENDING", partialText: null },
        });
        if (stale.count > 0) {
          console.info(
            `[processing-queue] Reclamados ${stale.count} assets PROCESSING → PENDING`,
          );
        }
        void this.processNext();
        return stale.count;
      })().finally(() => {
        this.reclaimPromise = null;
      });
    }
    return this.reclaimPromise;
  }

  async isQueued(assetId: string): Promise<boolean> {
    if (this.activeId === assetId) return true;
    const asset = await prisma.audioAsset.findUnique({
      where: { id: assetId },
      select: { status: true },
    });
    return asset?.status === "PENDING" || asset?.status === "PROCESSING";
  }

  async hasActiveJobs(): Promise<boolean> {
    if (this.running || this.activeId !== null || this.purifyingIds.size > 0) {
      return true;
    }
    const count = await prisma.audioAsset.count({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
    });
    return count > 0;
  }

  isPurifying(assetId: string): boolean {
    return this.purifyingIds.has(assetId);
  }

  isPaused(): boolean {
    return isQueuePaused();
  }

  /** Pausa envíos a Deepgram: el job activo espera entre segmentos; no arranca el siguiente. */
  pause(): QueueStatus["paused"] {
    setQueuePaused(true);
    return true;
  }

  /** Reanuda envíos y drena PENDING. */
  resume(): QueueStatus["paused"] {
    setQueuePaused(false);
    void this.processNext();
    return false;
  }

  async clearQueue(): Promise<void> {
    await prisma.audioAsset.updateMany({
      where: { status: "PENDING" },
      data: { status: "ERROR", partialText: null },
    });
    this.running = false;
    this.activeId = null;
  }

  async getStatus(): Promise<QueueStatus> {
    const pending = await prisma.audioAsset.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const queuedIds = pending
      .map((a) => a.id)
      .filter((id) => id !== this.activeId);

    return {
      active: null,
      queuedIds,
      queuedCount: queuedIds.length,
      purifyingIds: [...this.purifyingIds],
      paused: isQueuePaused(),
    };
  }

  async getStatusWithActive(): Promise<QueueStatus> {
    const base = await this.getStatus();

    const processing = this.activeId
      ? await prisma.audioAsset.findUnique({
          where: { id: this.activeId },
          select: {
            id: true,
            filename: true,
            partialText: true,
            status: true,
          },
        })
      : await prisma.audioAsset.findFirst({
          where: { status: "PROCESSING" },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            filename: true,
            partialText: true,
            status: true,
          },
        });

    return {
      ...base,
      active: processing,
    };
  }

  enqueue(assetId: string): boolean {
    void this.enqueueAsync(assetId);
    return true;
  }

  private async enqueueAsync(assetId: string): Promise<boolean> {
    const asset = await prisma.audioAsset.findUnique({
      where: { id: assetId },
      select: { id: true, status: true },
    });
    if (!asset) return false;

    if (asset.status === "PROCESSING" && this.activeId === assetId) {
      return false;
    }

    if (asset.status !== "PENDING") {
      await prisma.audioAsset.update({
        where: { id: assetId },
        data: { status: "PENDING", partialText: null },
      });
    }

    // Encolar de forma explícita implica querer trabajar: salir de pausa.
    if (isQueuePaused()) {
      setQueuePaused(false);
    }

    void this.processNext();
    return true;
  }

  enqueueMany(assetIds: string[]): number {
    let added = 0;
    for (const assetId of assetIds) {
      this.enqueue(assetId);
      added += 1;
    }
    return added;
  }

  cancel(assetId: string): "removed_from_queue" | "stopped_active" | "not_found" {
    if (this.activeId === assetId) {
      requestCancellation(assetId);
      return "stopped_active";
    }

    void prisma.audioAsset
      .findUnique({ where: { id: assetId }, select: { status: true } })
      .then(async (asset) => {
        if (asset?.status === "PENDING") {
          await prisma.audioAsset.update({
            where: { id: assetId },
            data: { status: "ERROR", partialText: null },
          });
        }
      });

    return "removed_from_queue";
  }

  private async processNext(): Promise<void> {
    if (this.running || isQueuePaused()) {
      return;
    }

    const next = await prisma.audioAsset.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!next) {
      return;
    }

    const assetId = next.id;
    this.running = true;
    this.activeId = assetId;

    try {
      await prisma.audioAsset.update({
        where: { id: assetId },
        data: { status: "PROCESSING", partialText: null },
      });

      const { processAssetDeepgram } = await import(
        "@/lib/deepgram-speech-processor"
      );
      await processAssetDeepgram(assetId);

      this.purifyingIds.add(assetId);
      void (async () => {
        try {
          const { autoPurifyAudioAsset } = await import(
            "@/lib/audio-station/auto-purify"
          );
          const result = await autoPurifyAudioAsset(assetId);
          if (result.status === "purified") {
            console.info(
              `Auto-purify OK: asset ${assetId} → review ${result.reviewId}`,
            );
          }
        } catch (error) {
          console.error(`Auto-purify hook error for ${assetId}:`, error);
        } finally {
          this.purifyingIds.delete(assetId);
        }
      })();
    } catch (error) {
      console.error(`Error en cola procesando ${assetId}:`, error);

      await prisma.audioAsset
        .update({
          where: { id: assetId },
          data: { status: "ERROR", partialText: null },
        })
        .catch(() => undefined);
    } finally {
      this.activeId = null;
      this.running = false;
      void this.processNext();
    }
  }
}

const globalForQueue = globalThis as typeof globalThis & {
  processingQueue?: ProcessingQueue;
};

export const processingQueue =
  globalForQueue.processingQueue ?? new ProcessingQueue();

globalForQueue.processingQueue = processingQueue;
