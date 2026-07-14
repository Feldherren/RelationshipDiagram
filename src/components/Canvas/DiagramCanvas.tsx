import { useCallback, useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { CharacterNode } from "./CharacterNode";
import { LineEdge } from "./LineEdge";
import { GroupContainer } from "./GroupContainer";
import { GridBackground } from "./GridBackground";
import { DiagramTitle } from "./DiagramTitle";
import {
  CanvasContextMenu,
  type CanvasContextMenuState,
} from "./CanvasContextMenu";
import { useDiagramStore, isCharacterHidden } from "../../store/diagramStore";
import { usePanZoom } from "../../hooks/usePanZoom";
import { getExpandedGroupBounds } from "../../store/diagramStore";
import { sameNodeRef } from "../../utils/connection";
import { shouldRenderLine } from "../../utils/lineEndpoints";
import type { NodeRef } from "../../models/types";
import { backgroundColorForDisplay } from "../../utils/diagramBackground";
import { isPointOverCollapsedGroup } from "../../utils/geometry";

interface DiagramCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function DiagramCanvas({ stageRef }: DiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    characters,
    lines,
    groups,
    viewport,
    selection,
    toolMode,
    connectFrom,
    connectDrag,
    showGrid,
    exportBounds,
    diagramBackgroundColor,
    setStageSize,
    setSelection,
    setExportBounds,
    moveCharacter,
    handleNodeClick,
    addCharacterToGroup,
    removeCharacterFromGroup,
    toggleGroupCollapse,
    updateGroup,
    moveGroup,
    screenToWorld,
    addCharacterAt,
    addGroupAt,
    startConnectDrag,
    updateConnectDrag,
    endConnectDrag,
    updateLine,
  } = useDiagramStore();

  const { startPan, movePan, endPan, shouldPan } = usePanZoom(containerRef);
  const suppressClick = useRef(false);
  const [isPanningView, setIsPanningView] = useState(false);
  const [isDrawingExport, setIsDrawingExport] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [drawCurrent, setDrawCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isResizingGroup, setIsResizingGroup] = useState(false);
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const isInteractingWithGroup = isResizingGroup || isDraggingGroup;
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(
    null,
  );

  useEffect(() => {
    const clearGroupInteraction = () => {
      setIsResizingGroup(false);
      setIsDraggingGroup(false);
    };
    window.addEventListener("mouseup", clearGroupInteraction);
    return () => window.removeEventListener("mouseup", clearGroupInteraction);
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      setStageSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight,
      );
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [setStageSize]);

  useEffect(() => {
    if (!connectDrag) return;

    const pointerToWorld = (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage) return null;
      const rect = stage.container().getBoundingClientRect();
      return screenToWorld({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    };

    const onMove = (e: MouseEvent) => {
      const world = pointerToWorld(e.clientX, e.clientY);
      if (world) updateConnectDrag(world);
    };

    const onUp = (e: MouseEvent) => {
      const world = pointerToWorld(e.clientX, e.clientY);
      if (world) endConnectDrag(world);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [
    connectDrag,
    stageRef,
    screenToWorld,
    updateConnectDrag,
    endConnectDrag,
  ]);

  const stageSize = useDiagramStore((s) => s.stageSize);

  const handleConnectHandleDown = useCallback(
    (ref: NodeRef) => (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;
      const world = screenToWorld(pointer);
      startConnectDrag(ref, world);
    },
    [screenToWorld, startConnectDrag],
  );

  const isConnectSource = useCallback(
    (ref: NodeRef) => {
      if (connectFrom && sameNodeRef(connectFrom, ref)) return true;
      if (connectDrag && sameNodeRef(connectDrag.from, ref)) return true;
      return false;
    },
    [connectFrom, connectDrag],
  );

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (connectDrag || isInteractingWithGroup) return;

    const isStage = e.target === e.target.getStage();

    if (shouldPan(e.evt.button)) {
      startPan(e.evt.clientX, e.evt.clientY);
      setIsPanningView(true);
      return;
    }

    if (toolMode === "exportBounds" && isStage) {
      const pos = screenToWorld({ x: e.evt.offsetX, y: e.evt.offsetY });
      setIsDrawingExport(true);
      setDrawStart(pos);
      setDrawCurrent(pos);
      return;
    }

    if (isStage && e.evt.button === 0) {
      startPan(e.evt.clientX, e.evt.clientY);
      setIsPanningView(true);
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!connectDrag && !isInteractingWithGroup) {
      movePan(e.evt.clientX, e.evt.clientY);
    }
    if (isDrawingExport && drawStart) {
      const pos = screenToWorld({ x: e.evt.offsetX, y: e.evt.offsetY });
      setDrawCurrent(pos);
    }
  };

  const handleStageMouseUp = () => {
    if (connectDrag || isInteractingWithGroup) return;

    if (endPan()) {
      suppressClick.current = true;
    }
    setIsPanningView(false);
    if (isDrawingExport && drawStart && drawCurrent) {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);
      if (width > 10 && height > 10) {
        setExportBounds({ x, y, width, height });
      }
      setIsDrawingExport(false);
      setDrawStart(null);
      setDrawCurrent(null);
    }
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (shouldPan(e.evt.button)) return;
    if (toolMode === "exportBounds") return;
    if (e.target === e.target.getStage()) {
      setSelection(null);
      useDiagramStore.getState().cancelConnect();
    }
  };

  const handleStageContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (connectDrag || toolMode === "exportBounds") return;
    if (e.target !== e.target.getStage()) return;

    const world = screenToWorld({ x: e.evt.offsetX, y: e.evt.offsetY });
    setContextMenu({
      screenX: e.evt.clientX,
      screenY: e.evt.clientY,
      worldX: world.x,
      worldY: world.y,
    });
  };

  const onCharacterDragEnd = useCallback(
    (characterId: string, pos: { x: number; y: number }) => {
      moveCharacter(characterId, pos);
      for (const group of groups) {
        if (group.collapsed) {
          if (isPointOverCollapsedGroup(pos, group)) {
            addCharacterToGroup(characterId, group.id);
          }
          continue;
        }

        const bounds = getExpandedGroupBounds(group, characters);
        if (!bounds) continue;
        const inside =
          pos.x >= bounds.x &&
          pos.x <= bounds.x + bounds.width &&
          pos.y >= bounds.y &&
          pos.y <= bounds.y + bounds.height;

        if (group.memberCharacterIds.includes(characterId)) {
          if (!inside) {
            removeCharacterFromGroup(characterId, group.id);
          }
        } else if (inside) {
          addCharacterToGroup(characterId, group.id);
        }
      }
    },
    [
      moveCharacter,
      groups,
      characters,
      addCharacterToGroup,
      removeCharacterFromGroup,
    ],
  );

  const diagram = { schemaVersion: 1 as const, characters, lines, groups };

  const previewBounds =
    isDrawingExport && drawStart && drawCurrent
      ? {
          x: Math.min(drawStart.x, drawCurrent.x),
          y: Math.min(drawStart.y, drawCurrent.y),
          width: Math.abs(drawCurrent.x - drawStart.x),
          height: Math.abs(drawCurrent.y - drawStart.y),
        }
      : exportBounds;

  return (
    <div
      ref={containerRef}
      className={`canvas-container${isPanningView ? " panning" : ""}${connectDrag ? " connecting" : ""}${isInteractingWithGroup ? " resizing-group" : ""}${
        diagramBackgroundColor === null ? " canvas-checkerboard" : ""
      }`}
      style={
        diagramBackgroundColor === null
          ? undefined
          : { background: backgroundColorForDisplay(diagramBackgroundColor) ?? undefined }
      }
      onContextMenu={(e) => e.preventDefault()}
    >
      <DiagramTitle />
      <CanvasContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddCharacter={addCharacterAt}
        onAddGroup={addGroupAt}
      />
      {connectFrom && (
        <div className="connect-hint">
          Click another character or group to connect (Esc to cancel)
        </div>
      )}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        onContextMenu={handleStageContextMenu}
      >
        <Layer>
          {showGrid && (
            <GridBackground
              viewport={viewport}
              stageWidth={stageSize.width}
              stageHeight={stageSize.height}
            />
          )}

          {groups
            .filter((g) => !g.collapsed)
            .map((group) => (
              <GroupContainer
                key={`${group.id}-bg`}
                group={group}
                characters={characters}
                selected={
                  selection?.type === "group" && selection.id === group.id
                }
                isConnectSource={isConnectSource({
                  id: group.id,
                  kind: "group",
                })}
                onSelect={() => handleNodeClick({ id: group.id, kind: "group" })}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
                onBoundsChange={(bounds) => updateGroup(group.id, { bounds })}
                onMoveByDelta={(delta) => moveGroup(group.id, delta)}
                onResizeStart={() => setIsResizingGroup(true)}
                onResizeEnd={() => setIsResizingGroup(false)}
                onDragStart={() => setIsDraggingGroup(true)}
                onDragEnd={() => setIsDraggingGroup(false)}
                onConnectHandleDown={handleConnectHandleDown({
                  id: group.id,
                  kind: "group",
                })}
                part="background"
              />
            ))}

          {lines
            .filter((line) => shouldRenderLine(line, diagram))
            .map((line) => (
              <LineEdge
                key={line.id}
                line={line}
                diagram={diagram}
                selected={
                  selection?.type === "line" && selection.id === line.id
                }
                onSelect={() =>
                  setSelection({ type: "line", id: line.id })
                }
                onBendChange={(bend) => updateLine(line.id, { bend })}
                part="stroke"
                hovered={hoveredLineId === line.id}
                onHoverChange={(hovered) =>
                  setHoveredLineId((current) =>
                    hovered ? line.id : current === line.id ? null : current,
                  )
                }
              />
            ))}

          {lines
            .filter((line) => shouldRenderLine(line, diagram))
            .map((line) => (
              <LineEdge
                key={`${line.id}-label`}
                line={line}
                diagram={diagram}
                selected={
                  selection?.type === "line" && selection.id === line.id
                }
                onSelect={() =>
                  setSelection({ type: "line", id: line.id })
                }
                onBendChange={(bend) => updateLine(line.id, { bend })}
                part="label"
                hovered={hoveredLineId === line.id}
                onHoverChange={(hovered) =>
                  setHoveredLineId((current) =>
                    hovered ? line.id : current === line.id ? null : current,
                  )
                }
              />
            ))}

          {connectDrag && (
            <Line
              points={[
                connectDrag.startX,
                connectDrag.startY,
                connectDrag.x,
                connectDrag.y,
              ]}
              stroke="#4a90d9"
              strokeWidth={2 / viewport.scale}
              dash={[8 / viewport.scale, 5 / viewport.scale]}
              listening={false}
            />
          )}

          {characters
            .filter((c) => !isCharacterHidden(c.id, groups))
            .map((character) => (
              <CharacterNode
                key={character.id}
                character={character}
                selected={
                  selection?.type === "character" &&
                  selection.id === character.id
                }
                isConnectSource={isConnectSource({
                  id: character.id,
                  kind: "character",
                })}
                draggable={toolMode !== "exportBounds" && !connectDrag}
                onSelect={() =>
                  handleNodeClick({ id: character.id, kind: "character" })
                }
                onConnectHandleDown={handleConnectHandleDown({
                  id: character.id,
                  kind: "character",
                })}
                onDragMove={(pos) => moveCharacter(character.id, pos)}
                onDragEnd={(pos) => onCharacterDragEnd(character.id, pos)}
              />
            ))}

          {groups
            .filter((g) => !g.collapsed)
            .map((group) => (
              <GroupContainer
                key={`${group.id}-fg`}
                group={group}
                characters={characters}
                selected={
                  selection?.type === "group" && selection.id === group.id
                }
                isConnectSource={isConnectSource({
                  id: group.id,
                  kind: "group",
                })}
                onSelect={() => handleNodeClick({ id: group.id, kind: "group" })}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
                onBoundsChange={(bounds) => updateGroup(group.id, { bounds })}
                onMoveByDelta={(delta) => moveGroup(group.id, delta)}
                onResizeStart={() => setIsResizingGroup(true)}
                onResizeEnd={() => setIsResizingGroup(false)}
                onDragStart={() => setIsDraggingGroup(true)}
                onDragEnd={() => setIsDraggingGroup(false)}
                onConnectHandleDown={handleConnectHandleDown({
                  id: group.id,
                  kind: "group",
                })}
                part="foreground"
              />
            ))}

          {groups
            .filter((g) => g.collapsed)
            .map((group) => (
              <GroupContainer
                key={group.id}
                group={group}
                characters={characters}
                selected={
                  selection?.type === "group" && selection.id === group.id
                }
                isConnectSource={isConnectSource({
                  id: group.id,
                  kind: "group",
                })}
                onSelect={() => handleNodeClick({ id: group.id, kind: "group" })}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
                onBoundsChange={(bounds) => updateGroup(group.id, { bounds })}
                onMoveByDelta={(delta) => moveGroup(group.id, delta)}
                onResizeStart={() => setIsResizingGroup(true)}
                onResizeEnd={() => setIsResizingGroup(false)}
                onDragStart={() => setIsDraggingGroup(true)}
                onDragEnd={() => setIsDraggingGroup(false)}
                onConnectHandleDown={handleConnectHandleDown({
                  id: group.id,
                  kind: "group",
                })}
              />
            ))}

          {previewBounds && (
            <Rect
              x={previewBounds.x}
              y={previewBounds.y}
              width={previewBounds.width}
              height={previewBounds.height}
              stroke="#e67e22"
              strokeWidth={2 / viewport.scale}
              dash={[8 / viewport.scale, 4 / viewport.scale]}
              fill="rgba(230, 126, 34, 0.08)"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
