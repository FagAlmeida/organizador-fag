"use client";

import { useSyncExternalStore } from "react";
import { nowTimeKey, todayKey } from "@/lib/dates";

// Um único relógio para todos os componentes: avisa a cada 30 segundos.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 30_000);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
};

/**
 * Data de hoje no fuso do navegador ("AAAA-MM-DD"). No servidor devolve null,
 * evitando divergência de hidratação quando os fusos são diferentes.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, () => todayKey(), () => null);
}

/** Hora atual no fuso do navegador ("HH:MM"). No servidor devolve null. */
export function useNowTime(): string | null {
  return useSyncExternalStore(subscribe, () => nowTimeKey(), () => null);
}
