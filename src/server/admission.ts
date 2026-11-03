import "server-only";
import type { AccessEntryDTO } from "@/lib/types";
import { prisma } from "./db";

// Quem pode entrar no Organizador. Os e-mails de ADMIN_EMAILS (separados por
// vírgula) sempre entram e são os únicos que liberam os outros, em /admin.

export type AccessStatus = "pending" | "approved" | "denied";

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.toLowerCase());
}

export async function hasAccess(email: string) {
  if (isAdminEmail(email)) return true;
  const entry = await prisma.accessEntry.findUnique({
    where: { email: email.toLowerCase() },
    select: { status: true },
  });
  return entry?.status === "approved";
}

/**
 * Registra a tentativa de entrada de quem ainda não foi liberado. Quem já foi
 * recusado continua recusado. Devolve a situação atual do e-mail.
 */
export async function requestAccess(email: string, name: string) {
  const entry = await prisma.accessEntry.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name },
    update: { name },
    select: { status: true },
  });
  return entry.status as AccessStatus;
}

export async function listAccessEntries(): Promise<AccessEntryDTO[]> {
  const entries = await prisma.accessEntry.findMany({ orderBy: { updatedAt: "desc" } });
  return entries.map((e) => ({
    email: e.email,
    name: e.name,
    status: e.status as AccessStatus,
    updatedAt: e.updatedAt.toISOString(),
  }));
}

export async function countPendingRequests() {
  return prisma.accessEntry.count({ where: { status: "pending" } });
}
