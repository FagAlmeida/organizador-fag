"use client";

import { useState } from "react";
import { labelClass } from "@/lib/labels";
import type { LabelDTO } from "@/lib/types";
import type { AssigneeOption } from "./assignees";
import { EMPTY_FILTERS, hasActiveFilters, type CardFilters, type DueFilter } from "./board-utils";

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: "all", label: "Qualquer data" },
  { value: "overdue", label: "Atrasados" },
  { value: "today", label: "Entrega hoje" },
  { value: "week", label: "Próximos 7 dias" },
  { value: "none", label: "Sem data" },
];

type Props = {
  labels: LabelDTO[];
  people: AssigneeOption[];
  filters: CardFilters;
  onChange: (filters: CardFilters) => void;
  resultCount: number | null;
  totalCount: number;
};

export function BoardFilters({ labels, people, filters, onChange, resultCount, totalCount }: Props) {
  const [labelsOpen, setLabelsOpen] = useState(false);
  const active = hasActiveFilters(filters);

  function toggleLabel(id: string) {
    const labelIds = filters.labelIds.includes(id)
      ? filters.labelIds.filter((l) => l !== id)
      : [...filters.labelIds, id];
    onChange({ ...filters, labelIds });
  }

  return (
    <div
      role="search"
      className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto"
    >
      <input
        type="search"
        aria-label="Buscar cartões"
        placeholder="Buscar cartões…"
        className="input w-full sm:w-56"
        value={filters.text}
        onChange={(e) => onChange({ ...filters, text: e.target.value })}
      />

      <div
        className="relative"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setLabelsOpen(false);
        }}
      >
        <button
          type="button"
          className="btn-secondary"
          aria-expanded={labelsOpen}
          onClick={() => setLabelsOpen((v) => !v)}
        >
          Etiquetas{filters.labelIds.length > 0 && ` (${filters.labelIds.length})`}
        </button>
        {labelsOpen && (
          <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg bg-white p-2 shadow-lg ring-1 ring-slate-200 sm:left-0 sm:right-auto">
            {labels.length === 0 ? (
              <p className="p-2 text-sm text-slate-500">
                Este quadro ainda não tem etiquetas. Crie uma em qualquer cartão.
              </p>
            ) : (
              <ul className="space-y-1">
                {labels.map((label) => (
                  <li key={label.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={filters.labelIds.includes(label.id)}
                        onChange={() => toggleLabel(label.id)}
                      />
                      <span
                        className={`flex-1 truncate rounded px-2 py-0.5 text-xs font-semibold ${labelClass(label.color)}`}
                      >
                        {label.name || "Sem nome"}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <select
        aria-label="Filtrar por data de entrega"
        className="input w-auto"
        value={filters.due}
        onChange={(e) => onChange({ ...filters, due: e.target.value as DueFilter })}
      >
        {DUE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por responsável"
        className="input w-auto"
        value={filters.assignee}
        onChange={(e) => onChange({ ...filters, assignee: e.target.value })}
      >
        <option value="all">Qualquer responsável</option>
        {people.map((p) => (
          <option key={p.email} value={p.email}>
            {p.isViewer ? "Minhas tarefas" : p.name}
          </option>
        ))}
        <option value="none">Sem responsável</option>
      </select>

      {active && (
        <>
          <span className="text-xs text-white/90" aria-live="polite">
            {resultCount} de {totalCount}
          </span>
          <button
            type="button"
            className="btn-ghost text-white hover:bg-white/20 hover:text-white"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Limpar filtros
          </button>
        </>
      )}
    </div>
  );
}
