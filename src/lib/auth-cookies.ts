// Nomes de cookies compartilhados entre o proxy e o servidor. Ficam fora de
// src/server para que o proxy não importe o Prisma.

export const SESSION_COOKIE = "fag_session";
export const OAUTH_STATE_COOKIE = "fag_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "fag_oauth_verifier";
export const OAUTH_NEXT_COOKIE = "fag_oauth_next";

/** Aceita só caminhos internos ("/boards/x"), nunca "//site.com" ou URLs completas. */
export function safeNextPath(value: string | null | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
