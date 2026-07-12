import { useCallback, useEffect, useRef } from "react";
import { useDiagramStore } from "../store/diagramStore";

export function usePanZoom(containerRef: React.RefObject<HTMLElement | null>) {
  const viewport = useDiagramStore((s) => s.viewport);
  const setViewport = useDiagramStore((s) => s.setViewport);
  const toolMode = useDiagramStore((s) => s.toolMode);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const spaceHeld = useRef(false);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const scaleBy = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newScale = Math.min(4, Math.max(0.15, viewport.scale * scaleBy));

      const mousePointTo = {
        x: (pointer.x - viewport.x) / viewport.scale,
        y: (pointer.y - viewport.y) / viewport.scale,
      };

      setViewport({
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [containerRef, setViewport, viewport.scale, viewport.x, viewport.y],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [containerRef, handleWheel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeld.current = true;
      if (e.key === "Escape") {
        useDiagramStore.setState({ connectFrom: null, toolMode: "select" });
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
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeld.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const startPan = (clientX: number, clientY: number) => {
    isPanning.current = true;
    lastPointer.current = { x: clientX, y: clientY };
  };

  const movePan = (clientX: number, clientY: number) => {
    if (!isPanning.current) return;
    const dx = clientX - lastPointer.current.x;
    const dy = clientY - lastPointer.current.y;
    lastPointer.current = { x: clientX, y: clientY };
    setViewport({ x: viewport.x + dx, y: viewport.y + dy });
  };

  const endPan = () => {
    isPanning.current = false;
  };

  const shouldPan = (button: number) =>
    toolMode === "pan" || button === 1 || spaceHeld.current;

  return { startPan, movePan, endPan, shouldPan, spaceHeld };
}
