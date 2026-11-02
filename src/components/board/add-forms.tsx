"use client";

import { useState } from "react";
import { createCard } from "@/server/actions/cards";
import { createList } from "@/server/actions/lists";
import { useBoard } from "./board-context";

export function AddListForm({ boardId, isFirst }: { boardId: string; isFirst: boolean }) {
  const { mutate, setBoard } = useBoard();
  const [open, setOpen] = useState(isFirst);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    setSaving(true);
    const result = await mutate(null, () => createList({ boardId, title: value }));
    setSaving(false);
    if (result.ok) {
      const list = result.data;
      // Se a revalidação do servidor já trouxe a lista, não duplica.
      setBoard((prev) =>
        prev.lists.some((l) => l.id === list.id)
          ? prev
          : { ...prev, lists: [...prev.lists, { ...list, cards: [] }] },
      );
      setTitle("");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-72 shrink-0 rounded-xl bg-white/20 px-3 py-2.5 text-left text-sm font-medium text-white transition hover:bg-white/30"
      >
        + Adicionar lista
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0">
      {isFirst && (
        <div className="mb-3 rounded-xl bg-white/15 p-4 text-sm text-white">
          <p className="font-semibold">Este quadro está vazio</p>
          <p className="mt-1 text-white/80">
            Comece criando uma lista, por exemplo “A fazer”, “Em andamento” e “Concluído”.
          </p>
        </div>
      )}
      <form onSubmit={onSubmit} className="rounded-xl bg-slate-100 p-2">
        <input
          autoFocus
          className="input"
          placeholder="Nome da lista"
          aria-label="Nome da lista"
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <div className="mt-2 flex gap-2">
          <button type="submit" className="btn-primary" disabled={saving || !title.trim()}>
            {saving ? "Adicionando…" : "Adicionar lista"}
          </button>
          {!isFirst && (
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export function AddCardForm({ listId }: { listId: string }) {
  const { mutate, setBoard } = useBoard();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    setSaving(true);
    const result = await mutate(null, () => createCard({ listId, title: value }));
    setSaving(false);
    if (result.ok) {
      const card = result.data;
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.map((l) =>
          l.id === listId && !l.cards.some((c) => c.id === card.id)
            ? { ...l, cards: [...l.cards, card] }
            : l,
        ),
      }));
      setTitle("");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="m-2 mt-1 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-200 hover:text-slate-900"
      >
        + Adicionar cartão
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="p-2 pt-1">
      <textarea
        autoFocus
        rows={2}
        className="input resize-none"
        placeholder="Título do cartão"
        aria-label="Título do cartão"
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <div className="mt-2 flex gap-2">
        <button type="submit" className="btn-primary" disabled={saving || !title.trim()}>
          {saving ? "Adicionando…" : "Adicionar"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
