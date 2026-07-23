-- Nodo gravitacional Yo (reemplaza OperatorProfile hardcodeado).

CREATE TABLE "Yo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operatorName" TEXT,
    "exocortexName" TEXT,
    "exocortexNamedBy" TEXT,
    "operationalStatus" TEXT NOT NULL DEFAULT 'STANDBY',
    "energyLevel" INTEGER NOT NULL DEFAULT 5,
    "calibration" JSONB NOT NULL DEFAULT '{}',
    "genesisCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "YoConduitMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yoId" TEXT NOT NULL DEFAULT 'core',
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YoConduitMessage_yoId_fkey" FOREIGN KEY ("yoId") REFERENCES "Yo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "YoConduitMessage_yoId_createdAt_idx" ON "YoConduitMessage"("yoId", "createdAt");

-- Migrar OperatorProfile legacy si existe (preserva identidad, elimina default Lautaro en código).
INSERT INTO "Yo" (
    "id",
    "operatorName",
    "exocortexName",
    "exocortexNamedBy",
    "operationalStatus",
    "energyLevel",
    "calibration",
    "genesisCompletedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'core',
    CASE
        WHEN TRIM("displayName") = '' OR LOWER(TRIM("displayName")) = 'lautaro' THEN NULL
        ELSE TRIM("displayName")
    END,
    NULL,
    NULL,
    COALESCE(NULLIF(TRIM("operationalStatus"), ''), 'STANDBY'),
    COALESCE("energyLevel", 5),
    COALESCE("calibration", '{}'),
    CASE
        WHEN TRIM("displayName") = '' OR LOWER(TRIM("displayName")) = 'lautaro' THEN NULL
        ELSE CURRENT_TIMESTAMP
    END,
    "createdAt",
    "updatedAt"
FROM "OperatorProfile"
WHERE "id" = 'operator'
  AND NOT EXISTS (SELECT 1 FROM "Yo" WHERE "id" = 'core');

-- Shell vacío si no había perfil.
INSERT INTO "Yo" ("id", "operationalStatus", "energyLevel", "calibration", "createdAt", "updatedAt")
SELECT 'core', 'STANDBY', 5, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Yo" WHERE "id" = 'core');

DROP TABLE IF EXISTS "OperatorProfile";
