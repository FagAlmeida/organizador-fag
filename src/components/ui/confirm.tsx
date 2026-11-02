"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Modal } from "./modal";

type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Diálogo de confirmação reutilizável: `if (await confirm({...})) { ... }` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    resolver.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(result: boolean) {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={options !== null} onClose={() => close(false)} title={options?.title ?? ""}>
        <div className="text-sm text-slate-600">{options?.message}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => close(false)}>
            Cancelar
          </button>
          <button type="button" className="btn-danger" data-autofocus onClick={() => close(true)}>
            {options?.confirmLabel ?? "Excluir"}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>.");
  return ctx;
}
