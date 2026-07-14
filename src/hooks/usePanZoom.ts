import { useCallback, useEffect, useRef } from "react";
import { useDiagramStore } from "../store/diagramStore";

export function usePanZoom(containerRef: React.RefObject<HTMLElement | null>) {
  const setViewport = useDiagramStore((s) => s.setViewport);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const DRAG_THRESHOLD = 3;

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const current = useDiagramStore.getState().viewport;
      const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const scaleBy = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newScale = Math.min(4, Math.max(0.15, current.scale * scaleBy));

      const mousePointTo = {
        x: (pointer.x - current.x) / current.scale,
        y: (pointer.y - current.y) / current.scale,
      };

      setViewport({
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [containerRef, setViewport],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [containerRef, handleWheel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useDiagramStore.getState().cancelConnect();
        useDiagramStore.setState({ toolMode: "select" });
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        useDiagramStore.getState().deleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const startPan = useCallback((clientX: number, clientY: number) => {
    isPanning.current = true;
    didDrag.current = false;
    lastPointer.current = { x: clientX, y: clientY };
  }, []);

  const movePan = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPanning.current) return;
      const dx = clientX - lastPointer.current.x;
      const dy = clientY - lastPointer.current.y;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        didDrag.current = true;
      }
      lastPointer.current = { x: clientX, y: clientY };
      const current = useDiagramStore.getState().viewport;
      setViewport({ x: current.x + dx, y: current.y + dy });
    },
    [setViewport],
  );

  const endPan = useCallback(() => {
    const dragged = didDrag.current;
    isPanning.current = false;
    didDrag.current = false;
    return dragged;
  }, []);

  const shouldPan = useCallback((button: number) => button === 1, []);

  return { startPan, movePan, endPan, shouldPan };
}
