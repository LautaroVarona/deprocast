-- Migración de limpieza PENDIENTE: elimina ontología legacy Entity/Tag.
--
-- PRE-REQUISITOS:
--   1. npm run kg:reconcile
--   2. Verificar nodos, menciones y centralidad (getCentralityRanking)
--   3. Copiar este archivo a prisma/migrations/<timestamp>_remove_legacy_entity_tables/
--   4. Eliminar del schema.prisma: Entity, Tag, ParentChunkEntity, ParentChunkTag
--      y las relaciones entities/tags en ParentChunk
--   5. npx prisma migrate dev

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "ParentChunkEntity";
DROP TABLE IF EXISTS "ParentChunkTag";
DROP TABLE IF EXISTS "Entity";
DROP TABLE IF EXISTS "Tag";

PRAGMA foreign_keys=ON;
