"use client";

import { useState, useTransition } from "react";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import type { AccessEntryDTO, ActionResult } from "@/lib/types";
import { deleteAccess, denyAccess, grantAccess } from "@/server/actions/access";

type Props = { admins: string[]; entries: AccessEntryDTO[] };

/** Página /admin: liberar e-mails, responder pedidos e remover acessos. */
export function AccessManager({ admins, entries }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const pending = entries.filter((e) => e.status === "pending");
  const approved = entries.filter((e) => e.status === "approved");
  const denied = entries.filter((e) => e.status === "denied");

  function run(target: string, action: () => Promise<ActionResult>, success?: string) {
    setBusy(target);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if (!result.ok) toast.error(result.error);
      else if (success) toast.success(success);
    });
  }

  function onAdd(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    run(value, async () => {
      const result = await grantAccess({ email: value });
      if (result.ok) setEmail("");
      return result;
    }, "E-mail liberado. A pessoa já pode entrar com a conta Google.");
  }

  async function onRemove(entry: AccessEntryDTO) {
    const ok = await confirm({
      title: "Remover acesso?",
      message: (
        <>
          <strong>{entry.name ?? entry.email}</strong> não vai mais conseguir entrar no Organizador.
          Os quadros e cartões dela continuam como estão.
        </>
      ),
      confirmLabel: "Remover acesso",
    });
    if (ok) run(entry.email, () => denyAccess({ email: entry.email }));
  }

  return (
    <div className="mt-6 space-y-8">
      <section>
        <form onSubmit={onAdd} className="flex gap-2">
          <label htmlFor="access-email" className="sr-only">
            E-mail para liberar
          </label>
          <input
            id="access-email"
            type="email"
            className="input"
            placeholder="E-mail da conta Google para liberar"
            value={email}
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={busy !== null || !email.trim()}>
            Liberar
          </button>
        </form>
      </section>

      <Section title={`Pedidos aguardando (${pending.length})`} empty="Nenhum pedido no momento.">
        {pending.map((entry) => (
          <Row key={entry.email} entry={entry}>
            <button
              type="button"
              className="btn-primary"
              disabled={busy === entry.email}
              onClick={() => run(entry.email, () => grantAccess({ email: entry.email }), "Acesso liberado.")}
            >
              Liberar
            </button>
            <button
              type="button"
              className="btn-ghost text-red-600"
              disabled={busy === entry.email}
              onClick={() => run(entry.email, () => denyAccess({ email: entry.email }))}
            >
              Recusar
            </button>
          </Row>
        ))}
      </Section>

      <Section title={`Liberados (${approved.length + admins.length})`}>
        {admins.map((admin) => (
          <li key={admin} className="flex items-center gap-3 py-2">
            <p className="min-w-0 flex-1 truncate text-sm text-slate-900">{admin}</p>
            <span className="text-xs font-medium text-slate-500">Administrador</span>
          </li>
        ))}
        {approved.map((entry) => (
          <Row key={entry.email} entry={entry}>
            <button
              type="button"
              className="btn-ghost text-red-600"
              disabled={busy === entry.email}
              onClick={() => onRemove(entry)}
            >
              Remover
            </button>
          </Row>
        ))}
      </Section>

      {denied.length > 0 && (
        <Section title={`Recusados (${denied.length})`}>
          {denied.map((entry) => (
            <Row key={entry.email} entry={entry}>
              <button
                type="button"
                className="btn-ghost"
                disabled={busy === entry.email}
                onClick={() => run(entry.email, () => grantAccess({ email: entry.email }), "Acesso liberado.")}
              >
                Liberar
              </button>
              <button
                type="button"
                className="btn-ghost text-red-600"
                title="Apaga o registro. Se a pessoa tentar entrar de novo, vira um novo pedido."
                disabled={busy === entry.email}
                onClick={() => run(entry.email, () => deleteAccess({ email: entry.email }))}
              >
                Excluir
              </button>
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string;
  children: React.ReactNode[];
}) {
  const hasItems = children.flat().length > 0;
  return (
    <section>
      <h2 className="section-title">{title}</h2>
      {hasItems ? (
        <ul className="divide-y divide-slate-100 rounded-xl bg-white px-4 shadow-sm ring-1 ring-slate-200">
          {children}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{empty}</p>
      )}
    </section>
  );
}

function Row({ entry, children }: { entry: AccessEntryDTO; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        {entry.name && <p className="truncate text-sm font-medium text-slate-900">{entry.name}</p>}
        <p className={`truncate ${entry.name ? "text-xs text-slate-500" : "text-sm text-slate-900"}`}>
          {entry.email}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">{children}</div>
    </li>
  );
}
