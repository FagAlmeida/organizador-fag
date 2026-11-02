import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import type { ActionResult } from "@/lib/types";

/** Erro com mensagem segura para mostrar ao usuário. */
export class UserFacingError extends Error {}

export class NotFoundError extends UserFacingError {
  constructor(what: string) {
    super(`${what} não encontrado(a). Ele(a) pode ter sido excluído(a).`);
  }
}

/** Executa uma ação e converte exceções em um resultado serializável. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    // Deixa passar o redirect para o login quando a sessão expira.
    unstable_rethrow(error);
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Dados inválidos." };
    }
    if (error instanceof UserFacingError) {
      return { ok: false, error: error.message };
    }
    console.error("[action]", error);
    return { ok: false, error: "Não foi possível salvar a alteração. Tente novamente." };
  }
}
