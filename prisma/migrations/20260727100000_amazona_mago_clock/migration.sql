-- Reloj operativo Magos en Yo + inventario AmazonAResource

ALTER TABLE "Yo" ADD COLUMN "mago12" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Yo" ADD COLUMN "mago3" TEXT NOT NULL DEFAULT 'cuerpo';

CREATE TABLE "AmazonAResource" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "powerIds" JSONB NOT NULL,
  "kgNodeId" TEXT,
  "projectId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "AmazonAResource_kgNodeId_key" ON "AmazonAResource"("kgNodeId");
CREATE INDEX "AmazonAResource_projectId_idx" ON "AmazonAResource"("projectId");
CREATE INDEX "AmazonAResource_name_idx" ON "AmazonAResource"("name");
