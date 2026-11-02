"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function Error(props: { error: unknown; retry: () => void }) {
  return <ErrorState {...props} />;
}
