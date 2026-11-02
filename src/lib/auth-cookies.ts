// Nomes de cookies compartilhados entre o proxy e o servidor. Ficam fora de
// src/server para que o proxy não importe o Prisma.

export const SESSION_COOKIE = "fag_session";
export const OAUTH_STATE_COOKIE = "fag_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "fag_oauth_verifier";
export const OAUTH_NEXT_COOKIE = "fag_oauth_next";

/**
 * Aceita só caminhos internos ("/boards/x"), nunca "//site.com" ou URLs completas.
 * O navegador lê "/\site.com" e "/\t/site.com" como "//site.com", então quem
 * decide é o próprio parser de URL: o resultado precisa continuar na mesma origem.
 */
export function safeNextPath(value: string | null | undefined) {
  if (!value?.startsWith("/")) return "/";
  const base = "http://organizador.invalid";
  try {
    const url = new URL(value, base);
    return url.origin === base ? url.pathname + url.search + url.hash : "/";
  } catch {
    return "/";
  }
}
