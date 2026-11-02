"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; kind: "error" | "success" };

type ToastApi = {
  error: (message: string) => void;
  success: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: Toast["kind"], message: string) => {
      const id = nextId++;
      setToasts((all) => [...all.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      error: (m) => push("error", m),
      success: (m) => push("success", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
              t.kind === "error" ? "bg-red-600" : "bg-slate-800"
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-white/80 hover:text-white"
              aria-label="Fechar aviso"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return ctx;
}
