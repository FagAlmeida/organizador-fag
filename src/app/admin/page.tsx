import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AccessManager } from "@/components/admin/access-manager";
import { adminEmails, isAdminEmail, listAccessEntries } from "@/server/admission";
import { getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: "Acessos" };

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Acessos ao Organizador</h1>
      <p className="mt-1 text-sm text-slate-600">
        Só entra quem você liberar. Quem tentar entrar sem estar liberado aparece aqui como pedido.
      </p>
      <Suspense
        fallback={<div aria-busy="true" className="mt-6 h-40 animate-pulse rounded-xl bg-slate-200" />}
      >
        <AccessSection />
      </Suspense>
    </main>
  );
}

async function AccessSection() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  // Para quem não é administrador, a página simplesmente não existe.
  if (!isAdminEmail(user.email)) notFound();
  return <AccessManager admins={adminEmails()} entries={await listAccessEntries()} />;
}
