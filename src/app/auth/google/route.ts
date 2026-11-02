import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  safeNextPath,
} from "@/lib/auth-cookies";
import { cookieOptions, googleClient } from "@/server/auth";

// Início do login: guarda `state` e o verificador PKCE em cookies de curta
// duração e manda o usuário para a tela de login do Google.
export async function GET(request: NextRequest) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = googleClient(request.nextUrl.origin).createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);
  url.searchParams.set("prompt", "select_account");

  const store = await cookies();
  const options = cookieOptions(new Date(Date.now() + 10 * 60 * 1000));
  store.set(OAUTH_STATE_COOKIE, state, options);
  store.set(OAUTH_VERIFIER_COOKIE, codeVerifier, options);
  store.set(OAUTH_NEXT_COOKIE, safeNextPath(request.nextUrl.searchParams.get("next")), options);

  return NextResponse.redirect(url);
}
