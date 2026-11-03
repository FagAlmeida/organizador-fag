import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth-cookies";
import { getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  cancelado: "O login com o Google foi cancelado.",
  expirado: "O login demorou demais ou foi aberto em outra aba. Tente de novo.",
  google: "Não foi possível confirmar sua conta com o Google. Tente de novo.",
  email: "Sua conta Google não tem um e-mail verificado.",
  pendente:
    "Seu pedido de acesso foi enviado. Você poderá entrar assim que o administrador liberar o seu e-mail.",
  negado: "O acesso deste e-mail ao Organizador não foi liberado.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Entrar no Organizador</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use sua conta Google para ver os quadros que você criou ou para os quais foi convidado.
        </p>
        <Suspense fallback={<div className="mt-6 h-9" />}>
          <LoginAction searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginAction({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  if (await getSessionUser()) redirect(next);

  const error = typeof params.erro === "string" ? ERRORS[params.erro] : undefined;
  const href = next === "/" ? "/auth/google" : `/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <>
      {error && (
        <p
          role="alert"
          className={`mt-4 rounded-md px-3 py-2 text-sm ${
            params.erro === "pendente" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"
          }`}
        >
          {error}
        </p>
      )}
      <a href={href} className="btn-primary mt-6 w-full py-2">
        Entrar com Google
      </a>
    </>
  );
}
