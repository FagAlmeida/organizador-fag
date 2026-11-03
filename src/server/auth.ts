import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Google } from "arctic";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { SESSION_COOKIE } from "@/lib/auth-cookies";
import { hasAccess } from "./admission";
import { prisma } from "./db";

const SESSION_DAYS = 30;

export type SessionUser = { id: string; name: string; email: string };

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  image: string | null;
};

/** Cliente OAuth do Google. A URL de retorno precisa estar cadastrada no Google Cloud. */
export function googleClient(origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não definidas. Veja o README.");
  }
  return new Google(clientId, clientSecret, `${origin}/auth/google/callback`);
}

export function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Cria ou atualiza o usuário a partir do perfil do Google e transforma os
 * convites pendentes para o e-mail dele em participação nos quadros.
 */
export async function upsertGoogleUser(profile: GoogleProfile) {
  const email = profile.email.toLowerCase();
  const data = { email, name: profile.name, image: profile.image };
  const user = await prisma.user.upsert({
    where: { googleId: profile.googleId },
    create: { googleId: profile.googleId, ...data },
    update: data,
    select: { id: true },
  });

  const invites = await prisma.boardInvite.findMany({ where: { email }, select: { boardId: true } });
  if (invites.length > 0) {
    await prisma.$transaction([
      ...invites.map(({ boardId }) =>
        prisma.boardMember.upsert({
          where: { boardId_userId: { boardId, userId: user.id } },
          create: { boardId, userId: user.id },
          update: {},
        }),
      ),
      prisma.boardInvite.deleteMany({ where: { email } }),
    ]);
  }

  // Quadros sem membros (criados antes do login existir, ou pelo seed sem
  // usuários) passam para o primeiro usuário cadastrado.
  if ((await prisma.user.count()) === 1) {
    const orphans = await prisma.board.findMany({
      where: { members: { none: {} } },
      select: { id: true },
    });
    if (orphans.length > 0) {
      await prisma.boardMember.createMany({
        data: orphans.map((b) => ({ boardId: b.id, userId: user.id, role: "owner" })),
      });
    }
  }

  return user.id;
}

/** Abre uma sessão e grava o cookie. Use em Route Handlers ou Server Actions. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

/** Usuário logado nesta requisição, ou null. Lido uma vez por requisição. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Comparar com a hora atual exige renderizar na requisição, não na pré-renderização.
  await connection();
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    select: { expiresAt: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  // Quem teve o acesso removido em /admin perde a sessão na próxima requisição.
  if (!(await hasAccess(session.user.email))) return null;
  return session.user;
});
