"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  BOARD_BACKGROUND_NAMES,
  BOARD_BACKGROUNDS,
  backgroundUrl,
  type BoardBackground,
} from "@/lib/backgrounds";
import { setBoardBackground } from "@/server/actions/boards";
import { useBoard } from "./board-context";

/** Botão "Fundo" no cabeçalho do quadro, que abre a galeria de fotos. */
export function BackgroundButton() {
  const { board, mutate } = useBoard();
  const [open, setOpen] = useState(false);

  function choose(background: BoardBackground | null) {
    if (background === board.background) return;
    mutate(
      (prev) => ({ ...prev, background }),
      () => setBoardBackground({ boardId: board.id, background }),
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-white/15 px-2.5 py-1.5 text-sm font-medium text-white transition hover:bg-white/25"
      >
        Fundo
      </button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Fundo do quadro">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <li>
              <Option
                name="Azul (padrão)"
                selected={board.background === null}
                onClick={() => choose(null)}
                className="bg-gradient-to-br from-blue-700 to-indigo-800"
              />
            </li>
            {BOARD_BACKGROUNDS.map((key) => (
              <li key={key}>
                <Option
                  name={BOARD_BACKGROUND_NAMES[key]}
                  selected={board.background === key}
                  onClick={() => choose(key)}
                  className="bg-cover bg-center"
                  style={{ backgroundImage: `url(${backgroundUrl(key, true)})` }}
                />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">O fundo vale para todos os membros do quadro.</p>
        </Modal>
      )}
    </>
  );
}

function Option({
  name,
  selected,
  onClick,
  className,
  style,
}: {
  name: string;
  selected: boolean;
  onClick: () => void;
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={style}
      className={`relative flex aspect-video w-full items-end rounded-lg p-1.5 text-left text-xs font-semibold text-white shadow-sm transition hover:brightness-110 ${className} ${
        selected ? "ring-3 ring-blue-600 ring-offset-2" : ""
      }`}
    >
      <span className="rounded bg-black/45 px-1.5 py-0.5">{name}</span>
      {selected && (
        <span aria-hidden className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[11px]">
          ✓
        </span>
      )}
    </button>
  );
}
