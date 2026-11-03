import Link from "next/link";
import { countPendingRequests, isAdminEmail } from "@/server/admission";
import { getSessionUser } from "@/server/auth";
import { signOut } from "@/server/actions/auth";

/** Nome do usuário e botão "Sair" no cabeçalho. Some quando não há login. */
export async function UserMenu() {
  const user = await getSessionUser();
  if (!user) return null;
  const pending = isAdminEmail(user.email) ? await countPendingRequests() : null;
  return (
    <div className="ml-auto flex min-w-0 items-center gap-2 text-sm">
      {pending !== null && (
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Acessos
          {pending > 0 && (
            <span
              className="rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-slate-900"
              aria-label={`${pending} pedido(s) aguardando`}
            >
              {pending}
            </span>
          )}
        </Link>
      )}
      <span className="hidden truncate text-white/80 sm:inline" title={user.email}>
        {user.name}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md px-2 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
