"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import type { ActionResult, BoardDTO } from "@/lib/types";

type BoardContextValue = {
  board: BoardDTO;
  setBoard: (update: BoardDTO | ((prev: BoardDTO) => BoardDTO)) => void;
  setDragging: (dragging: boolean) => void;
  /**
   * Aplica `update` imediatamente e grava com `action`. Se a gravação falhar,
   * volta ao estado anterior e mostra o erro.
   */
  mutate: <T>(
    update: ((prev: BoardDTO) => BoardDTO) | null,
    action: () => Promise<ActionResult<T>>,
    rollbackTo?: BoardDTO,
  ) => Promise<ActionResult<T>>;
};

/** De quanto em quanto tempo o quadro busca as alterações feitas por outras pessoas. */
const REFRESH_MS = 5000;

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({
  serverBoard,
  children,
}: {
  serverBoard: BoardDTO;
  children: ReactNode;
}) {
  const toast = useToast();
  const [board, setBoard] = useState(serverBoard);
  const [syncedFrom, setSyncedFrom] = useState(serverBoard);
  const [pending, setPending] = useState(0);
  const [dragging, setDragging] = useState(false);
  const router = useRouter();
  const busy = useRef(false);

  useEffect(() => {
    busy.current = pending > 0 || dragging;
  }, [pending, dragging]);

  // Busca os dados do servidor de tempos em tempos e ao voltar para a aba, para
  // mostrar o que outros membros mudaram. Pausa durante gravações e arrastos.
  useEffect(() => {
    function refresh() {
      if (!busy.current && document.visibilityState === "visible") router.refresh();
    }
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  // Quando o servidor envia dados novos (após revalidação), adotamos esses dados,
  // mas só quando não há gravações nem arrasto em andamento, para não sobrescrever
  // o estado otimista com uma resposta intermediária.
  if (pending === 0 && !dragging && serverBoard !== syncedFrom) {
    setSyncedFrom(serverBoard);
    setBoard(serverBoard);
  }

  const mutate: BoardContextValue["mutate"] = async (update, action, rollbackTo) => {
    const snapshot = rollbackTo ?? board;
    if (update) setBoard(update);
    setPending((n) => n + 1);
    try {
      const result = await action();
      if (!result.ok) {
        setBoard(snapshot);
        toast.error(result.error);
      }
      return result;
    } catch {
      setBoard(snapshot);
      const error = "Sem conexão com o servidor. A alteração foi desfeita.";
      toast.error(error);
      return { ok: false, error };
    } finally {
      setPending((n) => n - 1);
    }
  };

  return (
    <BoardContext.Provider value={{ board, setBoard, mutate, setDragging }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard precisa estar dentro de <BoardProvider>.");
  return ctx;
}
