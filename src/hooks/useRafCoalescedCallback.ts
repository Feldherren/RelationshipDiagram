import { startTransition, useCallback, useEffect, useRef } from "react";

/**
 * Coalesces rapid calls to at most once per animation frame, then applies the
 * latest value inside startTransition so urgent UI (e.g. colour dragging) stays
 * responsive while heavier subscribers update.
 */
export function useRafCoalescedCallback<T>(
  callback: (value: T) => void,
): (value: T) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const pendingRef = useRef<{ value: T } | null>(null);
  const rafRef = useRef(0);

  const flush = useCallback(() => {
    rafRef.current = 0;
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    const { value } = pending;
    startTransition(() => {
      callbackRef.current(value);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      const pending = pendingRef.current;
      if (pending) {
        pendingRef.current = null;
        callbackRef.current(pending.value);
      }
    };
  }, []);

  return useCallback(
    (value: T) => {
      pendingRef.current = { value };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flush);
      }
    },
    [flush],
  );
}
