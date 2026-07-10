-- Universos de Babel: Universe, BabelRecord

CREATE TABLE "Universe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "trenchesWeight" INTEGER,
    "isRoot" INTEGER NOT NULL DEFAULT 0,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Universe_slug_key" ON "Universe"("slug");

CREATE TABLE "BabelRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "physicalRef" TEXT NOT NULL,
    "contentPreview" TEXT NOT NULL DEFAULT '',
    "occurredAt" DATETIME NOT NULL,
    "contextSeal" TEXT NOT NULL,
    "campoSlug" TEXT,
    "channel" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BabelRecord_contextSeal_fkey" FOREIGN KEY ("contextSeal") REFERENCES "Universe" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "BabelRecord_contextSeal_occurredAt_idx" ON "BabelRecord"("contextSeal", "occurredAt");
CREATE INDEX "BabelRecord_kind_physicalRef_idx" ON "BabelRecord"("kind", "physicalRef");

-- Seed universo raíz Babel
INSERT INTO "Universe" ("id", "slug", "label", "description", "trenchesWeight", "isRoot", "discoveredAt", "updatedAt")
VALUES (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
    'babel',
    'Babel',
    'Universo raíz — red de captura principal del sistema.',
    NULL,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
