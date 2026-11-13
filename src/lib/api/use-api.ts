"use client";

/**
 * A small shared cache for API reads. Screens that ask for the same key share one request and one copy of
 * the data; `revalidate` reloads keys after a change. Polling only runs while the tab is visible.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ApiError } from "./client";

interface Entry {
  data?: unknown;
  error?: ApiError;
  loadedAt?: number;
}

const EMPTY: Entry = {};
const cache = new Map<string, Entry>();
const loaders = new Map<string, () => Promise<unknown>>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function load(key: string): Promise<void> {
  const loader = loaders.get(key);
  if (!loader) return Promise.resolve();
  let request = inFlight.get(key);
  if (!request) {
    request = loader()
      .then(
        (data) => void cache.set(key, { data, loadedAt: Date.now() }),
        (error: unknown) => void cache.set(key, { ...cache.get(key), error: error instanceof ApiError ? error : new ApiError(0, "Can't reach the server") }),
      )
      .finally(() => {
        inFlight.delete(key);
        notify(key);
      });
    inFlight.set(key, request);
  }
  return request;
}

/** Reloads every query whose key starts with one of the prefixes. */
export function revalidate(...prefixes: string[]) {
  for (const key of cache.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) void load(key);
  }
}

/** Forgets everything (after logging out). */
export function clearApiCache() {
  cache.clear();
}

/** Reads `key` with `loader`; a null key skips the request (e.g. a list this role may not see). */
export function useApi<T>(key: string | null, loader: () => Promise<T>, pollMs?: number) {
  // Keep the newest loader, so a reload uses the current arguments.
  useEffect(() => {
    if (key) loaders.set(key, loader);
  });

  useEffect(() => {
    if (!key) return;
    if (!cache.get(key)?.loadedAt) void load(key);
    if (!pollMs) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(key);
    }, pollMs);
    return () => clearInterval(timer);
  }, [key, pollMs]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!key) return () => {};
      const keyListeners = listeners.get(key) ?? new Set();
      keyListeners.add(listener);
      listeners.set(key, keyListeners);
      return () => {
        keyListeners.delete(listener);
      };
    },
    [key],
  );

  const entry = useSyncExternalStore(
    subscribe,
    () => (key && cache.get(key)) || EMPTY,
    () => EMPTY,
  );
  return { data: entry.data as T | undefined, error: entry.error, isLoading: Boolean(key) && !entry.loadedAt && !entry.error };
}
