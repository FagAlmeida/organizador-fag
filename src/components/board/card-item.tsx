"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { dueStatus, formatDateKey } from "@/lib/dates";
import { labelClass } from "@/lib/labels";
import type { CardDTO, LabelDTO } from "@/lib/types";
import { assigneeName } from "./assignees";
import { useBoard } from "./board-context";
import { Avatar } from "./members-button";
import { useNowTime } from "./use-today";

type CardProps = {
  card: CardDTO;
  labels: LabelDTO[];
  today: string | null;
};

export function SortableCard({
  card,
  labels,
  today,
  disabled,
  onOpen,
}: CardProps & { disabled: boolean; onOpen: () => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card" },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`Cartão ${card.title}. Enter abre, espaço move.`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isDragging) {
          e.preventDefault();
          onOpen();
          return;
        }
        listeners?.onKeyDown?.(e);
      }}
      className={`rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
        disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <CardItemView card={card} labels={labels} today={today} />
    </div>
  );
}

const DUE_STYLES = {
  overdue: "bg-red-100 text-red-700",
  today: "bg-amber-100 text-amber-800",
  soon: "bg-yellow-50 text-yellow-800",
  later: "bg-slate-100 text-slate-600",
};

export function CardItemView({ card, labels, today, overlay }: CardProps & { overlay?: boolean }) {
  const cardLabels = labels.filter((l) => card.labelIds.includes(l.id));
  const done = card.checklist.filter((i) => i.done).length;
  const total = card.checklist.length;
  const { board } = useBoard();
  const nowTime = useNowTime();
  const status =
    card.dueDate && today ? dueStatus(card.dueDate, today, card.dueTime, nowTime) : "later";
  const assignee = card.assigneeEmail && assigneeName(board, card.assigneeEmail);

  return (
    <article
      className={`rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 ${
        overlay ? "rotate-2 shadow-xl" : ""
      }`}
    >
      {cardLabels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {cardLabels.map((l) => (
            <span
              key={l.id}
              className={`h-4 min-w-10 rounded px-1.5 text-[10px] leading-4 font-semibold ${labelClass(l.color)}`}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm break-words text-slate-800">{card.title}</p>
      {(card.dueDate || card.description || total > 0 || assignee) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {card.dueDate && (
            <span className={`rounded px-1.5 py-0.5 ${DUE_STYLES[status]}`}>
              <span aria-hidden>🕒 </span>
              <span className="sr-only">Entrega: </span>
              {formatDateKey(card.dueDate)}
              {card.dueTime && ` · ${card.dueTime}`}
            </span>
          )}
          {card.description && (
            <span title="Este cartão tem descrição" aria-label="Tem descrição">
              ☰
            </span>
          )}
          {total > 0 && (
            <span
              className={`rounded px-1.5 py-0.5 ${
                done === total ? "bg-green-100 text-green-700" : ""
              }`}
              aria-label={`Checklist: ${done} de ${total} concluídos`}
            >
              ☑ {done}/{total}
            </span>
          )}
          {assignee && (
            <span className="ml-auto" title={`Responsável: ${assignee}`}>
              <span className="sr-only">Responsável: {assignee}</span>
              <span aria-hidden>
                <Avatar name={assignee} className="h-6 w-6 text-[11px]" />
              </span>
            </span>
          )}
        </div>
      )}
    </article>
  );
}
