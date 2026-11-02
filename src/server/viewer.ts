import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";

/**
 * Quem está fazendo a requisição.
 *
 * Ponto único de identificação: consultas e ações chamam `getViewer()` e
 * filtram por `boardScope(viewer)`. Sem sessão válida, manda para o login.
 */
export type Viewer = { userId: string };

export async function getViewer(): Promise<Viewer> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return { userId: user.id };
}

/** Filtro Prisma para quadros em que o usuário atual é membro. */
export function boardScope(viewer: Viewer) {
  return { members: { some: { userId: viewer.userId } } };
}
