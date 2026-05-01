import { useEffect, useState } from "react";

export type UseIdleReadyOptions = {
  /** Passed to `requestIdleCallback` as `{ timeout }` (max wait before the callback may run). */
  idleTimeout: number;
  /** Used with `setTimeout` when `requestIdleCallback` is not available. */
  fallbackTimeout: number;
};

/** Matches prior `root.tsx` idle vs fallback timings (855c68d). */
export const idleReadyRootNonCriticalScripts: UseIdleReadyOptions = {
  idleTimeout: 2000,
  fallbackTimeout: 1000,
};

/** Matches prior `_main._index.tsx` idle vs fallback timings (855c68d). */
export const idleReadyHomeDeferredSections: UseIdleReadyOptions = {
  idleTimeout: 1500,
  fallbackTimeout: 600,
};

export function useIdleReady({
  idleTimeout,
  fallbackTimeout,
}: UseIdleReadyOptions): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onReady = () => setReady(true);

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(onReady, { timeout: idleTimeout });
      return () => window.cancelIdleCallback(id);
    }

    const t = globalThis.setTimeout(onReady, fallbackTimeout);
    return () => globalThis.clearTimeout(t);
  }, [idleTimeout, fallbackTimeout]);

  return ready;
}
