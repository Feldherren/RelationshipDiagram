import { useCallback, useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { CharacterNode } from "./CharacterNode";
import { LineEdge } from "./LineEdge";
import { GroupContainer } from "./GroupContainer";
import { useDiagramStore, isCharacterHidden } from "../../store/diagramStore";
import { usePanZoom } from "../../hooks/usePanZoom";
import { getExpandedGroupBounds } from "../../store/diagramStore";

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
    showGrid,
    exportBounds,
    setStageSize,
    setSelection,
    setExportBounds,
    moveCharacter,
    handleNodeClick,
    addCharacterToGroup,
    toggleGroupCollapse,
    screenToWorld,
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

  const stageSize = useDiagramStore((s) => s.stageSize);

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
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

    if (
      isStage &&
      e.evt.button === 0 &&
      toolMode !== "connect"
    ) {
      startPan(e.evt.clientX, e.evt.clientY);
      setIsPanningView(true);
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    movePan(e.evt.clientX, e.evt.clientY);
    if (isDrawingExport && drawStart) {
      const pos = screenToWorld({ x: e.evt.offsetX, y: e.evt.offsetY });
      setDrawCurrent(pos);
    }
  };

  const handleStageMouseUp = () => {
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
      useDiagramStore.setState({ connectFrom: null });
    }
  };

  const onCharacterDragEnd = useCallback(
    (characterId: string, pos: { x: number; y: number }) => {
      moveCharacter(characterId, pos);
      for (const group of groups) {
        if (group.collapsed) continue;
        const bounds = getExpandedGroupBounds(group, characters);
        if (!bounds) continue;
        const inside =
          pos.x >= bounds.x &&
          pos.x <= bounds.x + bounds.width &&
          pos.y >= bounds.y &&
          pos.y <= bounds.y + bounds.height;
        if (inside) {
          addCharacterToGroup(characterId, group.id);
        }
      }
    },
    [moveCharacter, groups, characters, addCharacterToGroup],
  );

  const gridLines: number[] = [];
  if (showGrid) {
    const gridSize = 40;
    const startX =
      Math.floor(-viewport.x / viewport.scale / gridSize) * gridSize;
    const endX =
      startX +
      Math.ceil(stageSize.width / viewport.scale / gridSize + 2) * gridSize;
    const startY =
      Math.floor(-viewport.y / viewport.scale / gridSize) * gridSize;
    const endY =
      startY +
      Math.ceil(stageSize.height / viewport.scale / gridSize + 2) * gridSize;
    for (let x = startX; x <= endX; x += gridSize) {
      gridLines.push(x, startY, x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      gridLines.push(startX, y, endX, y);
    }
  }

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
      className={`canvas-container${isPanningView ? " panning" : ""}`}
    >
      {connectFrom && (
        <div className="connect-hint">
          Click a target node to connect (Esc to cancel)
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
      >
        <Layer>
          {showGrid && (
            <Line
              points={gridLines}
              stroke="#e0e0e0"
              strokeWidth={1 / viewport.scale}
              listening={false}
            />
          )}

          {groups
            .filter((g) => !g.collapsed)
            .map((group) => (
              <GroupContainer
                key={group.id}
                group={group}
                characters={characters}
                selected={
                  selection?.type === "group" && selection.id === group.id
                }
                onSelect={() => handleNodeClick({ id: group.id, kind: "group" })}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
              />
            ))}

          {lines.map((line) => (
            <LineEdge
              key={line.id}
              line={line}
              diagram={{ schemaVersion: 1, characters, lines, groups }}
              selected={selection?.type === "line" && selection.id === line.id}
              onSelect={() =>
                setSelection({ type: "line", id: line.id })
              }
            />
          ))}

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
                draggable={toolMode !== "connect" && toolMode !== "exportBounds"}
                onSelect={() =>
                  handleNodeClick({ id: character.id, kind: "character" })
                }
                onDragEnd={(pos) => onCharacterDragEnd(character.id, pos)}
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
                onSelect={() => handleNodeClick({ id: group.id, kind: "group" })}
                onToggleCollapse={() => toggleGroupCollapse(group.id)}
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
