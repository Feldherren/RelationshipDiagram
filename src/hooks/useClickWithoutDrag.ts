import { useCallback, useRef } from "react";

/**
 * Distinguishes intentional clicks from drag gestures so selection
 * (and the selection float) only open on click, not after a drag.
 */
export function useClickWithoutDrag() {
  const suppressClickRef = useRef(false);

  const noticeDrag = useCallback(() => {
    suppressClickRef.current = true;
  }, []);

  const consumeClickSuppression = useCallback((): boolean => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return { noticeDrag, consumeClickSuppression };
}
