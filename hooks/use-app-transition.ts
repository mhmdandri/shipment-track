import { useState, useTransition } from "react";
import { useProgress } from "@bprogress/next";

export function useAppTransition() {
  const [isPending, startTransition] = useTransition();
  const { start: startProgress, stop: stopProgress } = useProgress();
  const [error, setError] = useState<string | null>(null);

  const execute = (callback: () => Promise<void> | void) => {
    setError(null);
    startProgress();
    startTransition(async () => {
      try {
        await callback();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        stopProgress();
      }
    });
  };

  return { isPending, error, setError, execute };
}
