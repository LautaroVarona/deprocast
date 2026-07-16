const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "prisma", "dev.db");
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS "GeoLocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "latitude" REAL NOT NULL,
  "longitude" REAL NOT NULL,
  "isPermanent" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "placeId" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "GeoLocation_isPermanent_idx" ON "GeoLocation"("isPermanent");
CREATE INDEX IF NOT EXISTS "GeoLocation_latitude_longitude_idx" ON "GeoLocation"("latitude", "longitude");
`);

// Ensure CastleCard.metadata exists (schema drift from earlier)
const cols = db.prepare("PRAGMA table_info(CastleCard)").all();
const names = cols.map((c) => c.name);
console.log("CastleCard columns:", names.join(", "));
if (!names.includes("metadata")) {
  db.exec(`ALTER TABLE "CastleCard" ADD COLUMN "metadata" TEXT NOT NULL DEFAULT '{}'`);
  console.log("Added CastleCard.metadata");
}

console.log(
  "GeoLocation:",
  db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='GeoLocation'",
    )
    .get(),
);
db.close();
