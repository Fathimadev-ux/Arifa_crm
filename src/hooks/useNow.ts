"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Current time, refreshed every `intervalMs`. Null on the server to avoid a server/browser mismatch. */
export function useNow(intervalMs = 30_000): number | null {
  const subscribe = useCallback(
    (onTick: () => void) => {
      const timer = setInterval(onTick, intervalMs);
      return () => clearInterval(timer);
    },
    [intervalMs],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );
}
