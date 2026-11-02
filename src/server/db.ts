import "server-only";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

// O mesmo adaptador serve para o arquivo local (`file:./prisma/dev.db`) e para
// o Turso em produção (`libsql://...` com DATABASE_AUTH_TOKEN).
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida. Copie .env.example para .env.");
  const adapter = new PrismaLibSql({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  return new PrismaClient({ adapter });
}

// Reaproveita a instância entre recarregamentos do servidor de desenvolvimento.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
