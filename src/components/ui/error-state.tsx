"use client";

import Link from "next/link";
import { useEffect } from "react";

export function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-md flex-1 px-4 py-16 text-center">
      <p className="text-4xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="mt-3 text-lg font-semibold text-slate-900">Algo deu errado</h1>
      <p className="mt-1 text-sm text-slate-600">
        Não foi possível carregar esta página. Verifique se o banco de dados está configurado e
        tente novamente.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" className="btn-primary" onClick={() => retry()}>
          Tentar novamente
        </button>
        <Link href="/" className="btn-secondary">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
