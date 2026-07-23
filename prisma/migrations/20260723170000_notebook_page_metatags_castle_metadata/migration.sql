-- Columnas usadas por el cliente Prisma pero ausentes en migraciones previas.

ALTER TABLE "NotebookPage" ADD COLUMN "pageMetatags" JSONB;
ALTER TABLE "NotebookPage" ADD COLUMN "enrichments" JSONB;

ALTER TABLE "CastleCard" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';
