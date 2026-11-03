"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/ui/confirm";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { MemberDTO } from "@/lib/types";
import { cancelInvite, inviteMember, removeMember } from "@/server/actions/members";
import { useBoard } from "./board-context";

/** Botão "Membros" no cabeçalho do quadro, com as iniciais dos primeiros membros. */
export function MembersButton() {
  const { board } = useBoard();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto inline-flex items-center gap-2 rounded-md bg-white/15 px-2.5 py-1.5 text-sm font-medium text-white transition hover:bg-white/25"
      >
        <span aria-hidden className="flex -space-x-1.5">
          {board.members.slice(0, 3).map((m) => (
            <Avatar key={m.userId} name={m.name} className="h-6 w-6 text-[11px] ring-2 ring-blue-700" />
          ))}
        </span>
        Membros ({board.members.length})
      </button>
      {open && <MembersDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function MembersDialog({ onClose }: { onClose: () => void }) {
  const { board, mutate } = useBoard();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [email, setEmail] = useState("");
  const [sending, startSend] = useTransition();
  const isOwner = board.members.some((m) => m.userId === board.viewerId && m.role === "owner");

  function onInvite(event: React.FormEvent) {
    event.preventDefault();
    startSend(async () => {
      const result = await mutate(null, () => inviteMember({ boardId: board.id, email }));
      if (!result.ok) return;
      setEmail("");
      toast.success(
        result.data === "added"
          ? "Pessoa adicionada ao quadro."
          : "Convite registrado. Ele vale quando a pessoa entrar com esse e-mail, depois que o administrador liberar o acesso dela.",
      );
    });
  }

  async function onRemove(member: MemberDTO) {
    const ok = await confirm({
      title: "Remover membro?",
      message: (
        <>
          <strong>{member.name}</strong> perderá o acesso a este quadro.
        </>
      ),
      confirmLabel: "Remover",
    });
    if (!ok) return;
    mutate(
      (prev) => ({ ...prev, members: prev.members.filter((m) => m.userId !== member.userId) }),
      () => removeMember({ boardId: board.id, userId: member.userId }),
    );
  }

  async function onLeave() {
    const ok = await confirm({
      title: "Sair do quadro?",
      message: "Você perderá o acesso. Para voltar, outro membro precisa convidar você de novo.",
      confirmLabel: "Sair do quadro",
    });
    if (!ok) return;
    const result = await mutate(null, () =>
      removeMember({ boardId: board.id, userId: board.viewerId }),
    );
    if (result.ok) router.push("/");
  }

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link do quadro copiado.");
    } catch {
      toast.error("Não foi possível copiar. Copie o endereço da barra do navegador.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Membros do quadro">
      <form onSubmit={onInvite} className="flex gap-2">
        <label htmlFor="invite-email" className="sr-only">
          E-mail da pessoa
        </label>
        <input
          id="invite-email"
          data-autofocus
          type="email"
          className="input"
          placeholder="E-mail da conta Google"
          value={email}
          maxLength={254}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={sending || !email.trim()}>
          {sending ? "Convidando…" : "Convidar"}
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-500">
        Depois de convidar, envie o link do quadro. A pessoa entra com a conta Google desse e-mail.{" "}
        <button type="button" onClick={onCopyLink} className="font-medium text-blue-700 hover:underline">
          Copiar link
        </button>
      </p>

      <ul className="mt-5 divide-y divide-slate-100">
        {board.members.map((member) => {
          const isMe = member.userId === board.viewerId;
          return (
            <li key={member.userId} className="flex items-center gap-3 py-2">
              <Avatar name={member.name} className="h-8 w-8 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {member.name}
                  {isMe && <span className="font-normal text-slate-500"> (você)</span>}
                </p>
                <p className="truncate text-xs text-slate-500">{member.email}</p>
              </div>
              {member.role === "owner" ? (
                <span className="text-xs font-medium text-slate-500">Dono</span>
              ) : isMe ? (
                <button type="button" className="btn-ghost text-red-600" onClick={onLeave}>
                  Sair
                </button>
              ) : (
                isOwner && (
                  <button
                    type="button"
                    className="btn-ghost text-red-600"
                    onClick={() => onRemove(member)}
                  >
                    Remover
                  </button>
                )
              )}
            </li>
          );
        })}
      </ul>

      {board.invites.length > 0 && (
        <>
          <h3 className="section-title mt-5">Convites pendentes</h3>
          <ul className="divide-y divide-slate-100">
            {board.invites.map((invited) => (
              <li key={invited} className="flex items-center gap-3 py-2">
                <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{invited}</p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    mutate(
                      (prev) => ({ ...prev, invites: prev.invites.filter((e) => e !== invited) }),
                      () => cancelInvite({ boardId: board.id, email: invited }),
                    )
                  }
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

const AVATAR_COLORS = ["bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500", "bg-violet-500"];

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const hash = [...name].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white uppercase ${
        AVATAR_COLORS[hash % AVATAR_COLORS.length]
      } ${className}`}
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
