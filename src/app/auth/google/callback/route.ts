import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  safeNextPath,
} from "@/lib/auth-cookies";
import { hasAccess, requestAccess } from "@/server/admission";
import { createSession, googleClient, upsertGoogleUser } from "@/server/auth";

type GoogleClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

// Retorno do Google: confere o `state`, troca o código pelos tokens, cria ou
// atualiza o usuário e abre a sessão.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = store.get(OAUTH_VERIFIER_COOKIE)?.value;
  const next = safeNextPath(store.get(OAUTH_NEXT_COOKIE)?.value);
  store.delete(OAUTH_STATE_COOKIE);
  store.delete(OAUTH_VERIFIER_COOKIE);
  store.delete(OAUTH_NEXT_COOKIE);

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?erro=${reason}`, request.url));

  if (params.get("error")) return fail("cancelado");
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
    return fail("expirado");
  }

  let claims: GoogleClaims;
  try {
    const tokens = await googleClient(request.nextUrl.origin).validateAuthorizationCode(
      code,
      codeVerifier,
    );
    // O id_token veio direto do Google por HTTPS, então não precisa validar a assinatura.
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch (error) {
    console.error("[auth] falha ao validar o código do Google", error);
    return fail("google");
  }

  if (!claims.email || !claims.email_verified) return fail("email");

  // Só entra quem o administrador liberou; os outros viram um pedido em /admin.
  const name = claims.name || claims.email;
  if (!(await hasAccess(claims.email))) {
    const status = await requestAccess(claims.email, name);
    return fail(status === "denied" ? "negado" : "pendente");
  }

  const userId = await upsertGoogleUser({
    googleId: claims.sub,
    email: claims.email,
    name,
    image: claims.picture ?? null,
  });
  await createSession(userId);

  return NextResponse.redirect(new URL(next, request.url));
}
