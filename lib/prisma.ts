import fs from "node:fs";
import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

import { getDatabaseFilePath, getDatabaseUrl } from "@/lib/runtime-paths";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // better-sqlite3 exige que el directorio padre exista (si no: "Cannot open database…").
  fs.mkdirSync(path.dirname(getDatabaseFilePath()), { recursive: true });

  const adapter = new PrismaBetterSqlite3({
    url: getDatabaseUrl(),
  });

  return new PrismaClient({ adapter });
}

export async function disconnectPrismaClient(): Promise<void> {
  if (!globalForPrisma.prisma) {
    return;
  }

  await globalForPrisma.prisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export function resetPrismaClient(): void {
  if (!globalForPrisma.prisma) {
    return;
  }

  void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

function isPrismaClientStale(client: PrismaClient): boolean {
  return (
    !("activityLog" in client) ||
    client.activityLog === undefined ||
    !("geoLocation" in client) ||
    client.geoLocation === undefined ||
    !("magoColeccion" in client) ||
    client.magoColeccion === undefined ||
    !("yo" in client) ||
    client.yo === undefined ||
    !("personToPerson" in client) ||
    client.personToPerson === undefined ||
    !("entityCandidate" in client) ||
    client.entityCandidate === undefined
  );
}

export function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma && isPrismaClientStale(globalForPrisma.prisma)) {
    void globalForPrisma.prisma.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);

    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }

    return value;
  },
});
