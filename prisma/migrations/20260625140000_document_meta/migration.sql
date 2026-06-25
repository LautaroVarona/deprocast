-- CreateTable
CREATE TABLE "DocumentMeta" (
    "documentId" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "tituloLocked" BOOLEAN NOT NULL DEFAULT false,
    "materia" TEXT NOT NULL,
    "particula" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "onda" TEXT NOT NULL,
    "tiempoEspacio" TEXT NOT NULL,
    "posicion" TEXT NOT NULL,
    "areas" JSONB NOT NULL,
    "modelUsed" TEXT,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DocumentMeta_processedAt_idx" ON "DocumentMeta"("processedAt");
