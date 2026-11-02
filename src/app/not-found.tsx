import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md flex-1 px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Página não encontrada</h1>
      <p className="mt-1 text-sm text-slate-600">
        O quadro que você procura não existe, foi excluído ou você não é membro dele.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Ver meus quadros
      </Link>
    </div>
  );
}
