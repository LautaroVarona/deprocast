-- AlterTable
ALTER TABLE "DocumentMeta" ADD COLUMN "titleApplied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DocumentMeta" ADD COLUMN "processTrace" JSONB;
