"use client";

import { useSyncExternalStore } from "react";
import { todayKey } from "@/lib/dates";

const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
};

/**
 * Data de hoje no fuso do navegador ("AAAA-MM-DD"). No servidor devolve null,
 * evitando divergência de hidratação quando os fusos são diferentes.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, () => todayKey(), () => null);
}
