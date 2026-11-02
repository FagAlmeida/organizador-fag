"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { InlineEdit } from "@/components/ui/inline-edit";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import type { BoardSummary } from "@/lib/types";
import { createBoard, deleteBoard, renameBoard } from "@/server/actions/boards";

export function BoardsHome({ boards }: { boards: BoardSummary[] }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [creating, startCreate] = useTransition();

  function onCreate(event: React.FormEvent) {
    event.preventDefault();
    startCreate(async () => {
      const result = await createBoard({ title });
      if (!result.ok) return toast.error(result.error);
      setTitle("");
      router.push(`/boards/${result.data.id}`);
    });
  }

  return (
    <div className="mt-6">
      <form onSubmit={onCreate} className="flex max-w-md gap-2">
        <label htmlFor="new-board" className="sr-only">
          Nome do novo quadro
        </label>
        <input
          id="new-board"
          className="input"
          placeholder="Nome do novo quadro"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={creating || !title.trim()}>
          {creating ? "Criando…" : "Criar quadro"}
        </button>
      </form>

      {boards.length === 0 ? (
        <div className="mt-10 rounded-xl border-2 border-dashed border-slate-300 px-6 py-12 text-center">
          <p className="text-base font-medium text-slate-800">Nenhum quadro ainda</p>
          <p className="mt-1 text-sm text-slate-600">
            Crie seu primeiro quadro usando o campo acima.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boards.map((board) => (
            <BoardTile key={board.id} board={board} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BoardTile({ board }: { board: BoardSummary }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [title, setTitle] = useState(board.title);
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();

  async function onRename(next: string) {
    const previous = title;
    setTitle(next);
    const result = await renameBoard({ boardId: board.id, title: next });
    if (!result.ok) {
      setTitle(previous);
      toast.error(result.error);
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: "Excluir quadro?",
      message: (
        <>
          O quadro <strong>{title}</strong> e todas as suas listas e cartões serão excluídos
          permanentemente.
        </>
      ),
      confirmLabel: "Excluir quadro",
    });
    if (!ok) return;
    startDelete(async () => {
      const result = await deleteBoard({ boardId: board.id });
      if (!result.ok) toast.error(result.error);
      else toast.success("Quadro excluído.");
    });
  }

  return (
    <li
      className={`group relative flex h-28 flex-col rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-sm transition hover:shadow-md ${
        deleting ? "opacity-50" : ""
      }`}
    >
      {editing ? (
        <InlineEdit
          value={title}
          label="Nome do quadro"
          maxLength={80}
          editing
          onEditingChange={setEditing}
          onSave={onRename}
        />
      ) : (
        <Link
          href={`/boards/${board.id}`}
          className="line-clamp-2 font-semibold after:absolute after:inset-0 after:rounded-xl"
        >
          {title}
        </Link>
      )}
      <p className="mt-auto text-xs text-white/80">
        {board.listCount} {board.listCount === 1 ? "lista" : "listas"} · {board.cardCount}{" "}
        {board.cardCount === 1 ? "cartão" : "cartões"}
      </p>
      <div className="absolute right-2 bottom-2 z-10 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-white/30"
        >
          Renomear
        </button>
        {board.isOwner && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-red-500"
          >
            Excluir
          </button>
        )}
      </div>
    </li>
  );
}
