import { getSessionUser } from "@/server/auth";
import { signOut } from "@/server/actions/auth";

/** Nome do usuário e botão "Sair" no cabeçalho. Some quando não há login. */
export async function UserMenu() {
  const user = await getSessionUser();
  if (!user) return null;
  return (
    <div className="ml-auto flex min-w-0 items-center gap-2 text-sm">
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
