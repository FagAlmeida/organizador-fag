"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  size?: "sm" | "lg";
  /** Esconde o título visualmente (continua acessível a leitores de tela). */
  hideTitle?: boolean;
};

const openStack: string[] = [];

export function Modal({ open, onClose, title, children, size = "sm", hideTitle }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel;
    first?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    openStack.push(titleId);

    function onKeyDown(event: KeyboardEvent) {
      // Com modais empilhados, só o do topo responde ao Esc.
      if (event.key === "Escape" && openStack.at(-1) === titleId) {
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openStack.splice(openStack.indexOf(titleId), 1);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, titleId]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full rounded-xl bg-white shadow-xl outline-none ${
          size === "lg" ? "max-w-3xl" : "max-w-md"
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-4">
          <h2
            id={titleId}
            className={hideTitle ? "sr-only" : "text-lg font-semibold text-slate-900"}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-5 pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
