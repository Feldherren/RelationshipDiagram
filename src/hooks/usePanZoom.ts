import { useCallback, useEffect, useRef } from "react";
import type Konva from "konva";
import { useDiagramStore } from "../store/diagramStore";

export function usePanZoom(
  containerRef: React.RefObject<HTMLElement | null>,
  stageRef?: React.RefObject<Konva.Stage | null>,
) {
  const setViewport = useDiagramStore((s) => s.setViewport);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const pendingViewport = useRef<{ x: number; y: number; scale: number } | null>(
    null,
  );
  const rafId = useRef(0);
  const DRAG_THRESHOLD = 3;

  const flushViewport = useCallback(() => {
    rafId.current = 0;
    const pending = pendingViewport.current;
    if (!pending) return;
    pendingViewport.current = null;
    setViewport(pending);
  }, [setViewport]);

  const scheduleViewport = useCallback(
    (next: { x: number; y: number; scale: number }) => {
      pendingViewport.current = next;
      const stage = stageRef?.current;
      if (stage) {
        stage.position({ x: next.x, y: next.y });
        stage.scale({ x: next.scale, y: next.scale });
        stage.batchDraw();
      }
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(flushViewport);
      }
    },
    [flushViewport, stageRef],
  );

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const current =
        pendingViewport.current ?? useDiagramStore.getState().viewport;
      const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const scaleBy = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newScale = Math.min(4, Math.max(0.15, current.scale * scaleBy));

      const mousePointTo = {
        x: (pointer.x - current.x) / current.scale,
        y: (pointer.y - current.y) / current.scale,
      };

      scheduleViewport({
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [containerRef, scheduleViewport],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [containerRef, handleWheel]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      const isEditable = isEditableTarget(target);
      const key = e.key.toLowerCase();
      const hasShortcutModifier = e.ctrlKey || e.metaKey;

      if (hasShortcutModifier && !isEditable) {
        if (key === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            useDiagramStore.getState().redo();
          } else {
            useDiagramStore.getState().undo();
          }
          return;
        }
        if (key === "y") {
          e.preventDefault();
          useDiagramStore.getState().redo();
          return;
        }
      }

      if (e.key === "Escape") {
        useDiagramStore.getState().cancelConnect();
        useDiagramStore.setState({ toolMode: "select" });
      }
      if (e.key === "Enter") {
        if (isEditable) {
          return;
        }
        if (useDiagramStore.getState().toolMode !== "select") {
          return;
        }
        const { selection } = useDiagramStore.getState();
        if (!selection || selection.type === "bookmark") {
          return;
        }
        e.preventDefault();
        useDiagramStore.getState().openSelectionDetails();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isEditable) {
          return;
        }
        if (useDiagramStore.getState().toolMode === "editGroupMembers") {
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
      const current =
        pendingViewport.current ?? useDiagramStore.getState().viewport;
      scheduleViewport({
        x: current.x + dx,
        y: current.y + dy,
        scale: current.scale,
      });
    },
    [scheduleViewport],
  );

  const endPan = useCallback(() => {
    const dragged = didDrag.current;
    isPanning.current = false;
    didDrag.current = false;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      flushViewport();
    }
    return dragged;
  }, [flushViewport]);

  const shouldPan = useCallback((button: number) => button === 1, []);

  return { startPan, movePan, endPan, shouldPan };
}
