"use client";

import { useState } from "react";

type InlineEditProps = {
  value: string;
  onSave: (value: string) => void;
  label: string;
  className?: string;
  inputClassName?: string;
  maxLength?: number;
  /** Controle externo do modo de edição (ex.: botão "Renomear" em um menu). */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
};

/** Texto que vira campo ao clicar. Enter salva, Esc cancela. */
export function InlineEdit({
  value,
  onSave,
  label,
  className = "",
  inputClassName = "",
  maxLength = 120,
  editing: editingProp,
  onEditingChange,
}: InlineEditProps) {
  const [editingState, setEditingState] = useState(false);
  const [draft, setDraft] = useState(value);
  const editing = editingProp ?? editingState;
  const [wasEditing, setWasEditing] = useState(editing);

  // Recomeça o rascunho a partir do valor atual sempre que a edição é aberta.
  if (editing !== wasEditing) {
    setWasEditing(editing);
    if (editing) setDraft(value);
  }

  function setEditing(next: boolean) {
    setEditingState(next);
    onEditingChange?.(next);
  }

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== value) onSave(trimmed);
  }

  if (editing) {
    return (
      <input
        autoFocus
        aria-label={label}
        value={draft}
        maxLength={maxLength}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`input ${inputClassName}`}
      />
    );
  }

  return (
    <button
      type="button"
      title={`${label}: clique para editar`}
      onClick={() => setEditing(true)}
      className={`truncate rounded-md text-left hover:bg-black/5 ${className}`}
    >
      {value}
    </button>
  );
}
