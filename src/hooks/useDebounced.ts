"use client";

import { useEffect, useState } from "react";

/** The value once it has stopped changing for `delayMs` (so a search box doesn't call the API on every key). */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
