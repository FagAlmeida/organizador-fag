import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-cookies";

// Verificação otimista: sem cookie de sessão, manda para o login guardando a
// página pedida. A verificação de verdade acontece em `getViewer()`.
export function proxy(request: NextRequest) {
  if (request.method !== "GET" || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  const url = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|auth/|_next/static|_next/image|favicon.ico).*)"],
};
