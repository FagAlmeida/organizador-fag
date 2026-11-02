"use client";

import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { useConfirm } from "@/components/ui/confirm";
import { InlineEdit } from "@/components/ui/inline-edit";
import type { LabelDTO, ListDTO } from "@/lib/types";
import { deleteList, renameList } from "@/server/actions/lists";
import { AddCardForm } from "./add-forms";
import { useBoard } from "./board-context";
import { CardItemView, SortableCard } from "./card-item";

type ListColumnProps = {
  list: ListDTO;
  labels: LabelDTO[];
  today: string | null;
  /** Ids dos cartões que passam no filtro, ou null quando não há filtro. */
  visibleCards: Set<string> | null;
  onOpenCard: (cardId: string) => void;
};

export function ListColumn({ list, labels, today, visibleCards, onOpenCard }: ListColumnProps) {
  const { mutate } = useBoard();
  const confirm = useConfirm();
  const [renaming, setRenaming] = useState(false);
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: "list" },
  });

  const cards = visibleCards ? list.cards.filter((c) => visibleCards.has(c.id)) : list.cards;

  function onRename(title: string) {
    mutate(
      (prev) => ({
        ...prev,
        lists: prev.lists.map((l) => (l.id === list.id ? { ...l, title } : l)),
      }),
      () => renameList({ listId: list.id, title }),
    );
  }

  async function onDelete() {
    const count = list.cards.length;
    const ok = await confirm({
      title: "Excluir lista?",
      message: (
        <>
          A lista <strong>{list.title}</strong>
          {count > 0 && (
            <>
              {" "}e {count === 1 ? "o cartão dela" : `os ${count} cartões dela`}
            </>
          )}{" "}
          serão excluídos permanentemente.
        </>
      ),
      confirmLabel: "Excluir lista",
    });
    if (!ok) return;
    mutate(
      (prev) => ({ ...prev, lists: prev.lists.filter((l) => l.id !== list.id) }),
      () => deleteList({ listId: list.id }),
    );
  }

  return (
    <ListShell
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      placeholder={isDragging}
      header={
        <div
          {...attributes}
          {...listeners}
          aria-label={`Lista ${list.title}. Pressione espaço para mover.`}
          className="flex cursor-grab items-center gap-1 rounded-t-xl px-2 pt-2 pb-1 active:cursor-grabbing"
        >
          <div className="min-w-0 flex-1" onKeyDown={(e) => e.stopPropagation()}>
            <InlineEdit
              value={list.title}
              label="Nome da lista"
              maxLength={80}
              editing={renaming || undefined}
              onEditingChange={setRenaming}
              className="block w-full px-2 py-1 text-sm font-semibold text-slate-800"
              inputClassName="font-semibold"
              onSave={onRename}
            />
          </div>
          <span className="shrink-0 rounded-full bg-slate-300/70 px-2 text-xs text-slate-700">
            {visibleCards ? `${cards.length}/${list.cards.length}` : list.cards.length}
          </span>
          <ListMenu onRename={() => setRenaming(true)} onDelete={onDelete} />
        </div>
      }
      footer={<AddCardForm listId={list.id} />}
    >
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <SortableCard
            key={card.id}
            card={card}
            labels={labels}
            today={today}
            disabled={visibleCards !== null}
            onOpen={() => onOpenCard(card.id)}
          />
        ))}
      </SortableContext>
      {cards.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
          {visibleCards ? "Nenhum cartão corresponde aos filtros." : "Nenhum cartão. Arraste um para cá ou adicione abaixo."}
        </p>
      )}
    </ListShell>
  );
}

/** Versão estática usada na pré-visualização durante o arrasto. */
export function ListColumnView({
  list,
  labels,
  today,
}: {
  list: ListDTO;
  labels: LabelDTO[];
  today: string | null;
  overlay?: boolean;
}) {
  return (
    <ListShell
      className="rotate-2 shadow-2xl"
      header={
        <div className="flex items-center gap-1 px-4 pt-3 pb-2">
          <span className="flex-1 truncate text-sm font-semibold text-slate-800">{list.title}</span>
          <span className="rounded-full bg-slate-300/70 px-2 text-xs text-slate-700">
            {list.cards.length}
          </span>
        </div>
      }
    >
      {list.cards.map((card) => (
        <CardItemView key={card.id} card={card} labels={labels} today={today} />
      ))}
    </ListShell>
  );
}

function ListShell({
  ref,
  style,
  header,
  footer,
  children,
  placeholder,
  className = "",
}: {
  ref?: Ref<HTMLElement>;
  style?: CSSProperties;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  placeholder?: boolean;
  className?: string;
}) {
  return (
    <section
      ref={ref}
      style={style}
      className={`flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-slate-100 shadow-sm ${
        placeholder ? "opacity-40" : ""
      } ${className}`}
    >
      {header}
      <div className="flex min-h-2 flex-col gap-2 overflow-y-auto px-2 py-1">{children}</div>
      {footer}
    </section>
  );
}

function ListMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="btn-ghost px-1.5 py-0.5"
        aria-label="Ações da lista"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm5.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-40 rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-slate-200"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            Renomear
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Excluir lista
          </button>
        </div>
      )}
    </div>
  );
}
