"use client";

import { useState } from "react";
import { useConfirm } from "@/components/ui/confirm";
import { Modal } from "@/components/ui/modal";
import { dueStatus, formatDateKey } from "@/lib/dates";
import { LABEL_COLOR_INFO, LABEL_COLORS, labelClass, type LabelColor } from "@/lib/labels";
import type { BoardDTO, CardDTO, ChecklistItemDTO, LabelDTO } from "@/lib/types";
import { deleteCard, updateCard } from "@/server/actions/cards";
import {
  addChecklistItem,
  deleteChecklistItem,
  updateChecklistItem,
} from "@/server/actions/checklist";
import { createLabel, deleteLabel, setCardLabel, updateLabel } from "@/server/actions/labels";
import { useBoard } from "./board-context";
import { updateCardIn } from "./board-utils";

type Props = {
  card: CardDTO;
  board: BoardDTO;
  today: string | null;
  onClose: () => void;
};

export function CardModal({ card, board, today, onClose }: Props) {
  const { mutate } = useBoard();
  const confirm = useConfirm();
  const [title, setTitle] = useState(card.title);
  const listTitle = board.lists.find((l) => l.id === card.listId)?.title;

  function patch(update: Partial<CardDTO>, input: Record<string, unknown>) {
    return mutate(
      (prev) => updateCardIn(prev, card.id, (c) => ({ ...c, ...update })),
      () => updateCard({ cardId: card.id, ...input }),
    );
  }

  function saveTitle() {
    const value = title.trim();
    if (!value) return setTitle(card.title);
    if (value !== card.title) patch({ title: value }, { title: value });
  }

  async function onDelete() {
    const ok = await confirm({
      title: "Excluir cartão?",
      message: (
        <>
          O cartão <strong>{card.title}</strong> será excluído permanentemente.
        </>
      ),
      confirmLabel: "Excluir cartão",
    });
    if (!ok) return;
    onClose();
    mutate(
      (prev) => ({
        ...prev,
        lists: prev.lists.map((l) => ({ ...l, cards: l.cards.filter((c) => c.id !== card.id) })),
      }),
      () => deleteCard({ cardId: card.id }),
    );
  }

  return (
    <Modal open onClose={onClose} title={card.title} hideTitle size="lg">
      <div className="-mt-6 pr-8">
        <label htmlFor="card-title" className="sr-only">
          Título do cartão
        </label>
        <textarea
          id="card-title"
          data-autofocus
          rows={1}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="w-full resize-none rounded-md border-0 bg-transparent px-1 py-1 text-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
        {listTitle && (
          <p className="px-1 text-sm text-slate-500">
            na lista <span className="font-medium text-slate-700">{listTitle}</span>
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_15rem]">
        <div className="min-w-0 space-y-6">
          <Description card={card} onSave={(description) => patch({ description }, { description })} />
          <Checklist card={card} />
        </div>

        <aside className="space-y-6">
          <DueDate
            value={card.dueDate}
            today={today}
            onChange={(dueDate) => patch({ dueDate }, { dueDate })}
          />
          <Labels card={card} board={board} />
          <div>
            <h3 className="section-title">Ações</h3>
            <button type="button" className="btn-secondary w-full text-red-600" onClick={onDelete}>
              Excluir cartão
            </button>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function Description({ card, onSave }: { card: CardDTO; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(card.description);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <section>
        <h3 className="section-title">Descrição</h3>
        <button
          type="button"
          onClick={() => {
            setDraft(card.description);
            setEditing(true);
          }}
          className={`w-full rounded-md px-3 py-2 text-left text-sm whitespace-pre-wrap ${
            card.description
              ? "text-slate-700 hover:bg-slate-50"
              : "min-h-16 bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          {card.description || "Adicione uma descrição mais detalhada…"}
        </button>
      </section>
    );
  }

  return (
    <section>
      <h3 className="section-title">Descrição</h3>
      <textarea
        autoFocus
        rows={6}
        maxLength={5000}
        aria-label="Descrição"
        className="input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditing(false);
            if (draft !== card.description) onSave(draft);
          }}
        >
          Salvar
        </button>
        <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

const DUE_TEXT = {
  overdue: { text: "Atrasado", className: "bg-red-100 text-red-700" },
  today: { text: "Entrega hoje", className: "bg-amber-100 text-amber-800" },
  soon: { text: "Em breve", className: "bg-yellow-50 text-yellow-800" },
  later: { text: "No prazo", className: "bg-slate-100 text-slate-600" },
};

function DueDate({
  value,
  today,
  onChange,
}: {
  value: string | null;
  today: string | null;
  onChange: (value: string | null) => void;
}) {
  const status = value && today ? DUE_TEXT[dueStatus(value, today)] : null;
  return (
    <section>
      <h3 className="section-title">Data de entrega</h3>
      <input
        type="date"
        aria-label="Data de entrega"
        className="input"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
      {value && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-600">
            {formatDateKey(value, { weekday: "short", year: "numeric" })}
          </span>
          {status && (
            <span className={`rounded px-1.5 py-0.5 font-medium ${status.className}`}>
              {status.text}
            </span>
          )}
        </div>
      )}
      {value && (
        <button type="button" className="btn-ghost mt-1 px-0 text-xs" onClick={() => onChange(null)}>
          Remover data
        </button>
      )}
    </section>
  );
}

function Labels({ card, board }: { card: CardDTO; board: BoardDTO }) {
  const { mutate, setBoard } = useBoard();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  function toggle(label: LabelDTO) {
    const active = !card.labelIds.includes(label.id);
    mutate(
      (prev) =>
        updateCardIn(prev, card.id, (c) => ({
          ...c,
          labelIds: active ? [...c.labelIds, label.id] : c.labelIds.filter((id) => id !== label.id),
        })),
      () => setCardLabel({ cardId: card.id, labelId: label.id, active }),
    );
  }

  async function save(label: { id?: string; name: string; color: LabelColor }) {
    setEditingId(null);
    if (label.id) {
      const id = label.id;
      mutate(
        (prev) => ({
          ...prev,
          labels: prev.labels.map((l) => (l.id === id ? { ...l, ...label, id } : l)),
        }),
        () => updateLabel({ labelId: id, name: label.name, color: label.color }),
      );
      return;
    }
    const result = await mutate(null, () =>
      createLabel({ boardId: board.id, name: label.name, color: label.color }),
    );
    if (!result.ok) return;
    const created = result.data;
    // Cria e já aplica a etiqueta ao cartão.
    setBoard((prev) => ({
      ...prev,
      labels: prev.labels.some((l) => l.id === created.id) ? prev.labels : [...prev.labels, created],
    }));
    toggle(created);
  }

  function remove(label: LabelDTO) {
    setEditingId(null);
    mutate(
      (prev) => ({
        ...prev,
        labels: prev.labels.filter((l) => l.id !== label.id),
        lists: prev.lists.map((list) => ({
          ...list,
          cards: list.cards.map((c) => ({
            ...c,
            labelIds: c.labelIds.filter((id) => id !== label.id),
          })),
        })),
      }),
      () => deleteLabel({ labelId: label.id }),
    );
  }

  return (
    <section>
      <h3 className="section-title">Etiquetas</h3>
      <ul className="space-y-1">
        {board.labels.map((label) =>
          editingId === label.id ? (
            <li key={label.id}>
              <LabelEditor
                initial={label}
                onSave={save}
                onCancel={() => setEditingId(null)}
                onDelete={() => remove(label)}
              />
            </li>
          ) : (
            <li key={label.id} className="flex items-center gap-1">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={card.labelIds.includes(label.id)}
                  onChange={() => toggle(label)}
                />
                <span
                  className={`flex-1 truncate rounded px-2 py-1 text-xs font-semibold ${labelClass(label.color)}`}
                >
                  {label.name || " "}
                </span>
              </label>
              <button
                type="button"
                className="btn-ghost px-1.5 py-1 text-xs"
                aria-label={`Editar etiqueta ${label.name}`}
                onClick={() => setEditingId(label.id)}
              >
                ✎
              </button>
            </li>
          ),
        )}
      </ul>
      {editingId === "new" ? (
        <div className="mt-2">
          <LabelEditor onSave={save} onCancel={() => setEditingId(null)} />
        </div>
      ) : (
        <button
          type="button"
          className="btn-secondary mt-2 w-full"
          onClick={() => setEditingId("new")}
        >
          Criar etiqueta
        </button>
      )}
    </section>
  );
}

function LabelEditor({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: LabelDTO;
  onSave: (label: { id?: string; name: string; color: LabelColor }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<LabelColor>((initial?.color as LabelColor) ?? "green");

  return (
    <form
      className="space-y-2 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ id: initial?.id, name: name.trim(), color });
      }}
    >
      <input
        autoFocus
        className="input"
        placeholder="Nome (opcional)"
        aria-label="Nome da etiqueta"
        maxLength={30}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <fieldset className="flex flex-wrap gap-1.5">
        <legend className="sr-only">Cor</legend>
        {LABEL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={LABEL_COLOR_INFO[c].name}
            aria-label={LABEL_COLOR_INFO[c].name}
            aria-pressed={color === c}
            onClick={() => setColor(c)}
            className={`h-6 w-8 rounded ${LABEL_COLOR_INFO[c].swatch} ${
              color === c ? "ring-2 ring-slate-900 ring-offset-1" : ""
            }`}
          />
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-1.5">
        <button type="submit" className="btn-primary px-2 py-1 text-xs">
          {initial ? "Salvar" : "Criar"}
        </button>
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={onCancel}>
          Cancelar
        </button>
        {onDelete && (
          <button
            type="button"
            className="btn-ghost ml-auto px-2 py-1 text-xs text-red-600"
            onClick={onDelete}
          >
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}

function Checklist({ card }: { card: CardDTO }) {
  const { mutate, setBoard } = useBoard();
  const [text, setText] = useState("");
  const items = card.checklist;
  const done = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((done / items.length) * 100) : 0;

  function updateItems(update: (items: ChecklistItemDTO[]) => ChecklistItemDTO[]) {
    return (prev: BoardDTO) =>
      updateCardIn(prev, card.id, (c) => ({ ...c, checklist: update(c.checklist) }));
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    const result = await mutate(null, () => addChecklistItem({ cardId: card.id, text: value }));
    if (!result.ok) return setText(value);
    const item = result.data;
    setBoard(updateItems((all) => (all.some((i) => i.id === item.id) ? all : [...all, item])));
  }

  function toggle(item: ChecklistItemDTO) {
    mutate(
      updateItems((all) => all.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))),
      () => updateChecklistItem({ itemId: item.id, done: !item.done }),
    );
  }

  function rename(item: ChecklistItemDTO, value: string) {
    mutate(
      updateItems((all) => all.map((i) => (i.id === item.id ? { ...i, text: value } : i))),
      () => updateChecklistItem({ itemId: item.id, text: value }),
    );
  }

  function remove(item: ChecklistItemDTO) {
    mutate(
      updateItems((all) => all.filter((i) => i.id !== item.id)),
      () => deleteChecklistItem({ itemId: item.id }),
    );
  }

  return (
    <section>
      <h3 className="section-title">Checklist</h3>
      {items.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <span className="w-10 text-right text-xs font-medium text-slate-600">{percent}%</span>
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Progresso do checklist"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div
              className={`h-full rounded-full transition-all ${
                percent === 100 ? "bg-green-600" : "bg-blue-600"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">
            {done}/{items.length}
          </span>
        </div>
      )}
      <ul className="space-y-1">
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            onToggle={() => toggle(item)}
            onRename={(v) => rename(item, v)}
            onDelete={() => remove(item)}
          />
        ))}
      </ul>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <input
          className="input"
          placeholder="Adicionar um item"
          aria-label="Novo item do checklist"
          maxLength={200}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn-secondary shrink-0" disabled={!text.trim()}>
          Adicionar
        </button>
      </form>
    </section>
  );
}

function ChecklistRow({
  item,
  onToggle,
  onRename,
  onDelete,
}: {
  item: ChecklistItemDTO;
  onToggle: () => void;
  onRename: (value: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(item.text);

  return (
    <li className="group flex items-center gap-2 rounded-md px-1 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={item.done}
        onChange={onToggle}
        aria-label={`Concluir “${item.text}”`}
      />
      <input
        aria-label="Texto do item"
        maxLength={200}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const value = draft.trim();
          if (!value) setDraft(item.text);
          else if (value !== item.text) onRename(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.stopPropagation();
            setDraft(item.text);
          }
        }}
        className={`min-w-0 flex-1 rounded border-0 bg-transparent px-1 py-1 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none ${
          item.done ? "text-slate-400 line-through" : "text-slate-800"
        }`}
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Excluir “${item.text}”`}
        className="rounded px-1.5 text-slate-400 opacity-100 hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
      >
        ✕
      </button>
    </li>
  );
}
