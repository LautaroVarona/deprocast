-- AlterTable
ALTER TABLE "AudioAsset" ADD COLUMN "pipelineStation" TEXT NOT NULL DEFAULT 'QUEUED';
ALTER TABLE "AudioAsset" ADD COLUMN "pipelineError" TEXT;
ALTER TABLE "AudioAsset" ADD COLUMN "originAttributionId" TEXT;

-- CreateIndex
CREATE INDEX "AudioAsset_pipelineStation_idx" ON "AudioAsset"("pipelineStation");

-- AlterTable
ALTER TABLE "OriginAttribution" ADD COLUMN "ambientContext" TEXT;
