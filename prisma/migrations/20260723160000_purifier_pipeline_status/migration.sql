-- Máquina de estados del pipeline de ingesta en PurifierReview.

ALTER TABLE "PurifierReview" ADD COLUMN "pipelineStatus" TEXT NOT NULL DEFAULT 'pendiente_validacion';

CREATE INDEX "PurifierReview_pipelineStatus_processedAt_idx" ON "PurifierReview"("pipelineStatus", "processedAt");
