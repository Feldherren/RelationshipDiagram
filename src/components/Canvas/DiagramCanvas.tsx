import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Line, Rect } from "react-konva";
import type Konva from "konva";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { CharacterNode } from "./CharacterNode";
import { FloatingTextNode } from "./FloatingTextNode";
import { LineEdge } from "./LineEdge";
import { BoxContainer } from "./BoxContainer";
import { GridBackground } from "./GridBackground";
import { ViewportStage } from "./ViewportStage";
import { DiagramTitle } from "./DiagramTitle";
import { BookmarkFlagsLayer } from "./BookmarkFlagsLayer";
import { GroupHubLayer } from "./GroupHubLayer";
import { MembershipChipNameOverlay } from "./MembershipChipNameOverlay";
import {
  CanvasAddObjectMenu,
  type CanvasAddObjectMenuState,
} from "../panels/CanvasAddObjectMenu";
import {
  useDiagramStore,
  isCharacterHidden,
  isFloatingTextHidden,
} from "../../store/diagramStore";
import { usePanZoom } from "../../hooks/usePanZoom";
import { sameNodeRef } from "../../utils/connection";
import { shouldRenderLine } from "../../utils/lineEndpoints";
import {
  shouldShowGroupLine,
  type GroupCanvasVisibilityContext,
} from "../../utils/groupHub";
import {
  buildCharacterMembershipChipMap,
  EMPTY_MEMBERSHIP_CHIPS,
} from "./MembershipChips";
import { setMembershipChipTooltip } from "../../utils/membershipChipTooltip";
import type { NodeRef } from "../../models/types";
import { backgroundColorForDisplay } from "../../utils/diagramBackground";
import {
  applyWallpaperCssToElement,
  buildBackgroundImageCssStyle,
  clearWallpaperCssOnElement,
} from "../../utils/backgroundImageStyle";
import { useImageNaturalSize } from "../../hooks/useImageNaturalSize";
import { consumeSuppressStageClick } from "../../utils/suppressStageClick";
import {
  hitTestMarqueeSelection,
  isItemSelected,
  selectionFromMarqueeHits,
} from "../../utils/selectionMulti";
import { routeLine } from "../../utils/lineRouting";
interface DiagramCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

function ScaleStrokeLine({
  points,
  stroke,
  dashPattern,
}: {
  points: number[];
  stroke: string;
  dashPattern: [number, number];
}) {
  const scale = useDiagramStore((s) => s.viewport.scale);
  return (
    <Line
      points={points}
      stroke={stroke}
      strokeWidth={2 / scale}
      dash={[dashPattern[0] / scale, dashPattern[1] / scale]}
      listening={false}
    />
  );
}

function ScaleStrokeRect({
  x,
  y,
  width,
  height,
  stroke,
  fill,
  dashPattern,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  fill: string;
  dashPattern: [number, number];
}) {
  const scale = useDiagramStore((s) => s.viewport.scale);
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      stroke={stroke}
      strokeWidth={2 / scale}
      dash={[dashPattern[0] / scale, dashPattern[1] / scale]}
      fill={fill}
      listening={false}
    />
  );
}

export function DiagramCanvas({ stageRef }: DiagramCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<Konva.Layer | null>(null);

  const {
    characters,
    lines,
    groups,
    boxes,
    floatingTexts,
    selection,
    toolMode,
    connectFrom,
    connectDrag,
    groupsCanvasMode,
    showGrid,
    exportBounds,
    diagramBackgroundColor,
    diagramAppearance,
    diagramFontFamily,
    stageSize,
    setStageSize,
    setSelection,
    setExportBounds,
    moveCharacter,
    moveFloatingText,
    handleNodeClick,
    toggleBoxCollapse,
    updateBox,
    moveBox,
    screenToWorld,
    startConnectDrag,
    updateConnectDrag,
    endConnectDrag,
    updateLine,
  } = useDiagramStore(
    useShallow((s) => ({
      characters: s.characters,
      lines: s.lines,
      groups: s.groups,
      boxes: s.boxes,
      floatingTexts: s.floatingTexts,
      selection: s.selection,
      toolMode: s.toolMode,
      connectFrom: s.connectFrom,
      connectDrag: s.connectDrag,
      groupsCanvasMode: s.groupsCanvasMode,
      showGrid: s.showGrid,
      exportBounds: s.exportBounds,
      diagramBackgroundColor: s.diagramBackgroundColor,
      diagramAppearance: s.diagramAppearance,
      diagramFontFamily: s.diagramFontFamily,
      stageSize: s.stageSize,
      setStageSize: s.setStageSize,
      setSelection: s.setSelection,
      setExportBounds: s.setExportBounds,
      moveCharacter: s.moveCharacter,
      moveFloatingText: s.moveFloatingText,
      handleNodeClick: s.handleNodeClick,
      toggleBoxCollapse: s.toggleBoxCollapse,
      updateBox: s.updateBox,
      moveBox: s.moveBox,
      screenToWorld: s.screenToWorld,
      startConnectDrag: s.startConnectDrag,
      updateConnectDrag: s.updateConnectDrag,
      endConnectDrag: s.endConnectDrag,
      updateLine: s.updateLine,
    })),
  );

  const isImageBackground = diagramAppearance.backgroundMode === "image";
  const wallpaperData = isImageBackground
    ? diagramAppearance.backgroundImageData
    : null;
  const wallpaperNaturalSize = useImageNaturalSize(wallpaperData);
  const wallpaperNaturalSizeRef = useRef(wallpaperNaturalSize);
  wallpaperNaturalSizeRef.current = wallpaperNaturalSize;

  const applyWallpaperForViewport = useCallback(
    (nextViewport: {
      x: number;
      y: number;
      scale: number;
    }) => {
      const el = containerRef.current;
      if (!el) return;
      const appearance = useDiagramStore.getState().diagramAppearance;
      if (
        appearance.backgroundMode !== "image" ||
        !appearance.backgroundImageData
      ) {
        clearWallpaperCssOnElement(el);
        return;
      }
      const css = buildBackgroundImageCssStyle({
        imageData: appearance.backgroundImageData,
        placement: appearance.backgroundImagePlacement,
        scale: appearance.backgroundImageScale,
        offset: appearance.backgroundImageOffset,
        naturalSize: wallpaperNaturalSizeRef.current,
        viewport: nextViewport,
      });
      applyWallpaperCssToElement(el, css);
    },
    [],
  );

  const { startPan, movePan, endPan, shouldPan } = usePanZoom(
    containerRef,
    stageRef,
    applyWallpaperForViewport,
  );

  // Sync wallpaper when appearance/size changes, and when viewport jumps
  // outside the pan preview path (fit, bookmark, load).
  useEffect(() => {
    applyWallpaperForViewport(useDiagramStore.getState().viewport);
    return useDiagramStore.subscribe((state, prev) => {
      if (state.viewport === prev.viewport) return;
      applyWallpaperForViewport(state.viewport);
    });
  }, [
    applyWallpaperForViewport,
    wallpaperData,
    wallpaperNaturalSize,
    diagramAppearance.backgroundImagePlacement,
    diagramAppearance.backgroundImageScale,
    diagramAppearance.backgroundImageOffset,
    diagramAppearance.backgroundMode,
  ]);
  const suppressClick = useRef(false);
  const [isPanningView, setIsPanningView] = useState(false);
  const [isDrawingExport, setIsDrawingExport] = useState(false);
  const [isDrawingMarquee, setIsDrawingMarquee] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [drawCurrent, setDrawCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const drawStartRef = useRef(drawStart);
  const drawCurrentRef = useRef(drawCurrent);
  drawStartRef.current = drawStart;
  drawCurrentRef.current = drawCurrent;
  const [isResizingBox, setIsResizingBox] = useState(false);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const isInteractingWithBox = isResizingBox || isDraggingBox;
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [addObjectMenu, setAddObjectMenu] =
    useState<CanvasAddObjectMenuState | null>(null);

  const SAME_MENU_SPOT_PX = 8;

  const isSameMenuSpot = (
    menu: CanvasAddObjectMenuState,
    screenX: number,
    screenY: number,
  ) =>
    Math.hypot(menu.screenX - screenX, menu.screenY - screenY) <=
    SAME_MENU_SPOT_PX;

  const highlightedGroupId =
    selection?.type === "group" ? selection.id : null;
  const highlightedMemberIds =
    highlightedGroupId != null
      ? new Set(
          groups.find((g) => g.id === highlightedGroupId)?.memberCharacterIds ??
            [],
        )
      : null;

  const groupVisibilityCtx: GroupCanvasVisibilityContext = useMemo(
    () => ({
      groupsCanvasMode,
      selectedGroupId: highlightedGroupId,
      toolMode,
      connectFrom,
      connectDragFrom: connectDrag?.from ?? null,
      lines,
    }),
    [
      groupsCanvasMode,
      highlightedGroupId,
      toolMode,
      connectFrom,
      connectDrag,
      lines,
    ],
  );

  useEffect(() => {
    const clearBoxInteraction = () => {
      setIsResizingBox(false);
      setIsDraggingBox(false);
    };
    window.addEventListener("mouseup", clearBoxInteraction);
    return () => window.removeEventListener("mouseup", clearBoxInteraction);
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

  useEffect(() => {
    if (!isPanningView) return;

    const onMove = (e: MouseEvent) => {
      if (useDiagramStore.getState().connectDrag) return;
      movePan(e.clientX, e.clientY);
    };
    const onUp = () => {
      if (endPan()) {
        suppressClick.current = true;
      }
      setIsPanningView(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanningView, movePan, endPan]);

  useEffect(() => {
    if (!isDrawingMarquee) return;

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
      if (world) setDrawCurrent(world);
    };

    const onUp = (e: MouseEvent) => {
      const world = pointerToWorld(e.clientX, e.clientY);
      const start = drawStartRef.current;
      const current = world ?? drawCurrentRef.current;
      if (start && current) {
        const x = Math.min(start.x, current.x);
        const y = Math.min(start.y, current.y);
        const width = Math.abs(current.x - start.x);
        const height = Math.abs(current.y - start.y);
        if (width > 4 && height > 4) {
          suppressClick.current = true;
          const state = useDiagramStore.getState();
          const hits = hitTestMarqueeSelection(
            { x, y, width, height },
            {
              characters: state.characters,
              boxes: state.boxes,
              floatingTexts: state.floatingTexts,
              fontFamily: state.diagramFontFamily,
            },
          );
          const next = selectionFromMarqueeHits(hits);
          if (next?.type === "multi") {
            state.setMultiSelection(next.items);
          } else {
            state.setSelection(next, { openDetails: false });
          }
        }
      }
      setIsDrawingMarquee(false);
      setDrawStart(null);
      setDrawCurrent(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDrawingMarquee, stageRef, screenToWorld]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.listening(!isPanningView);
  }, [isPanningView]);

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
    if (connectDrag || isInteractingWithBox) return;

    // A new press starts a fresh gesture; any suppress flag from a prior
    // drag (e.g. marquee) that never emitted a trailing click is stale.
    suppressClick.current = false;

    const isStage = e.target === e.target.getStage();

    if (shouldPan(e.evt.button)) {
      e.evt.preventDefault();
      setMembershipChipTooltip(null);
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
      e.evt.shiftKey &&
      toolMode === "select"
    ) {
      const pos = screenToWorld({ x: e.evt.offsetX, y: e.evt.offsetY });
      setIsDrawingMarquee(true);
      setDrawStart(pos);
      setDrawCurrent(pos);
      return;
    }

    if (isStage && e.evt.button === 0) {
      setMembershipChipTooltip(null);
      startPan(e.evt.clientX, e.evt.clientY);
      setIsPanningView(true);
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Window listener owns pan moves; avoid doubling store updates.
    if (!isPanningView && !connectDrag && !isInteractingWithBox) {
      movePan(e.evt.clientX, e.evt.clientY);
    }
    if ((isDrawingExport || isDrawingMarquee) && drawStart) {
      const pos = screenToWorld({ x: e.evt.offsetX, y: e.evt.offsetY });
      setDrawCurrent(pos);
    }
  };

  const handleStageMouseUp = () => {
    if (connectDrag || isInteractingWithBox) return;

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
    if (consumeSuppressStageClick()) return;
    if (shouldPan(e.evt.button)) return;
    if (toolMode === "exportBounds") return;
    if (e.target === e.target.getStage()) {
      if (toolMode === "editGroupMembers") {
        useDiagramStore.setState({ toolMode: "select" });
        return;
      }
      setSelection(null);
      useDiagramStore.getState().cancelConnect();
    }
  };

  const openAddObjectMenu = (
    e: Konva.KonvaEventObject<MouseEvent | PointerEvent>,
  ) => {
    if (e.target !== e.target.getStage()) return;
    if (
      toolMode === "exportBounds" ||
      toolMode === "editGroupMembers" ||
      connectFrom
    ) {
      return;
    }
    e.evt.preventDefault();
    const world = screenToWorld({ x: e.evt.offsetX, y: e.evt.offsetY });
    setAddObjectMenu({
      screenX: e.evt.clientX,
      screenY: e.evt.clientY,
      world,
    });
  };

  const handleAddObjectContextMenu = (
    e: Konva.KonvaEventObject<PointerEvent>,
  ) => {
    if (e.target !== e.target.getStage()) return;
    if (
      toolMode === "exportBounds" ||
      toolMode === "editGroupMembers" ||
      connectFrom
    ) {
      return;
    }
    e.evt.preventDefault();
    const screenX = e.evt.clientX;
    const screenY = e.evt.clientY;
    setSelection(null);
    setAddObjectMenu((current) => {
      if (current && isSameMenuSpot(current, screenX, screenY)) {
        return null;
      }
      const world = screenToWorld({ x: e.evt.offsetX, y: e.evt.offsetY });
      return { screenX, screenY, world };
    });
  };

  const diagram = useMemo(
    () => ({
      schemaVersion: 3 as const,
      characters,
      lines,
      groups,
      boxes,
      floatingTexts,
      fontFamily: diagramFontFamily,
    }),
    [characters, lines, groups, boxes, floatingTexts, diagramFontFamily],
  );

  const membershipByCharacterId = useMemo(
    () => buildCharacterMembershipChipMap(groups),
    [groups],
  );

  const visibleRoutedLines = useMemo(
    () =>
      lines
        .filter((line) => shouldRenderLine(line, diagram))
        .filter((line) => shouldShowGroupLine(line, groupVisibilityCtx))
        .map((line) => ({
          line,
          routed: routeLine(line, diagram),
        })),
    [lines, diagram, groupVisibilityCtx],
  );

  const dragRectBounds =
    (isDrawingExport || isDrawingMarquee) && drawStart && drawCurrent
      ? {
          x: Math.min(drawStart.x, drawCurrent.x),
          y: Math.min(drawStart.y, drawCurrent.y),
          width: Math.abs(drawCurrent.x - drawStart.x),
          height: Math.abs(drawCurrent.y - drawStart.y),
        }
      : null;
  const previewBounds = isDrawingMarquee
    ? dragRectBounds
    : isDrawingExport
      ? dragRectBounds
      : exportBounds;
  const previewStroke = isDrawingMarquee ? "#4a90d9" : "#e67e22";
  const previewFill = isDrawingMarquee
    ? "rgba(74, 144, 217, 0.08)"
    : "rgba(230, 126, 34, 0.08)";

  const underlayCss =
    diagramBackgroundColor === null
      ? undefined
      : (backgroundColorForDisplay(diagramBackgroundColor) ?? undefined);
  const canvasStyle = underlayCss
    ? { backgroundColor: underlayCss }
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`canvas-container${isPanningView ? " panning" : ""}${connectDrag ? " connecting" : ""}${toolMode === "editGroupMembers" ? " editing-members" : ""}${isInteractingWithBox ? " resizing-group" : ""}${
        diagramBackgroundColor === null ? " canvas-checkerboard" : ""
      }`}
      style={canvasStyle}
      onContextMenu={(e) => e.preventDefault()}
    >
      <DiagramTitle />
      {connectFrom && (
        <div className="connect-hint">{t("canvas.connectHint")}</div>
      )}
      {toolMode === "editGroupMembers" && !connectFrom && (
        <div className="connect-hint">{t("canvas.editMembersHint")}</div>
      )}
      <ViewportStage
        stageRef={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        onContextMenu={handleAddObjectContextMenu}
        onDblClick={openAddObjectMenu}
      >
        <Layer ref={layerRef}>
          {showGrid && (
            <GridBackground
              stageWidth={stageSize.width}
              stageHeight={stageSize.height}
            />
          )}

          {boxes
            .filter((b) => !b.collapsed)
            .map((box) => (
              <BoxContainer
                key={`${box.id}-bg`}
                box={box}
                characters={characters}
                selected={isItemSelected(selection, "box", box.id)}
                isConnectSource={isConnectSource({
                  id: box.id,
                  kind: "box",
                })}
                onSelect={() => handleNodeClick({ id: box.id, kind: "box" })}
                onOpenDetails={() =>
                  handleNodeClick(
                    { id: box.id, kind: "box" },
                    { openDetails: true },
                  )
                }
                onToggleCollapse={() => toggleBoxCollapse(box.id)}
                onBoundsChange={(bounds) =>
                  updateBox(box.id, { bounds }, { recordHistory: false })
                }
                onMoveByDelta={(delta, contents) =>
                  moveBox(box.id, delta, contents, { recordHistory: false })
                }
                onResizeStart={() => setIsResizingBox(true)}
                onResizeEnd={() => setIsResizingBox(false)}
                onDragStart={() => setIsDraggingBox(true)}
                onDragEnd={() => setIsDraggingBox(false)}
                onConnectHandleDown={handleConnectHandleDown({
                  id: box.id,
                  kind: "box",
                })}
                part="background"
              />
            ))}

          <GroupHubLayer
            groups={groups}
            characters={characters}
            boxes={boxes}
            lines={lines}
            visibility={groupVisibilityCtx}
            selectedGroupId={highlightedGroupId}
            onSelectGroup={(groupId) =>
              setSelection({ type: "group", id: groupId }, { openDetails: false })
            }
            onOpenDetails={(groupId) =>
              setSelection(
                { type: "group", id: groupId },
                { openDetails: true },
              )
            }
            onConnectHandleDown={(groupId) =>
              handleConnectHandleDown({ id: groupId, kind: "group" })
            }
            isConnectSource={isConnectSource}
          />

          {visibleRoutedLines.map(({ line, routed }) => (
              <LineEdge
                key={line.id}
                line={line}
                diagram={diagram}
                routed={routed}
                selected={
                  selection?.type === "line" && selection.id === line.id
                }
                onSelect={() =>
                  setSelection({ type: "line", id: line.id }, { openDetails: false })
                }
                onOpenDetails={() =>
                  setSelection({ type: "line", id: line.id }, { openDetails: true })
                }
                onBendChange={(bend) =>
                  updateLine(line.id, { bend }, { recordHistory: false })
                }
                part="stroke"
                hovered={hoveredLineId === line.id}
                onHoverChange={(hovered) =>
                  setHoveredLineId((current) =>
                    hovered ? line.id : current === line.id ? null : current,
                  )
                }
              />
            ))}

          {visibleRoutedLines.map(({ line, routed }) => (
              <LineEdge
                key={`${line.id}-label`}
                line={line}
                diagram={diagram}
                routed={routed}
                selected={
                  selection?.type === "line" && selection.id === line.id
                }
                onSelect={() =>
                  setSelection({ type: "line", id: line.id }, { openDetails: false })
                }
                onOpenDetails={() =>
                  setSelection({ type: "line", id: line.id }, { openDetails: true })
                }
                onBendChange={(bend) =>
                  updateLine(line.id, { bend }, { recordHistory: false })
                }
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
            <ScaleStrokeLine
              points={[
                connectDrag.startX,
                connectDrag.startY,
                connectDrag.x,
                connectDrag.y,
              ]}
              stroke="#4a90d9"
              dashPattern={[8, 5]}
            />
          )}

          {characters
            .filter(
              (c) =>
                !isCharacterHidden(c.id, boxes, characters, diagramFontFamily),
            )
            .map((character) => {
              const membershipGroups =
                membershipByCharacterId.get(character.id) ??
                EMPTY_MEMBERSHIP_CHIPS;
              const isMember =
                highlightedMemberIds?.has(character.id) ?? false;
              return (
                <CharacterNode
                  key={character.id}
                  character={character}
                  selected={isItemSelected(
                    selection,
                    "character",
                    character.id,
                  )}
                  isConnectSource={isConnectSource({
                    id: character.id,
                    kind: "character",
                  })}
                  membershipGroups={membershipGroups}
                  highlightedGroupId={highlightedGroupId}
                  dimmed={highlightedMemberIds != null && !isMember}
                  membershipEmphasized={isMember}
                  draggable={
                    toolMode !== "exportBounds" &&
                    toolMode !== "editGroupMembers" &&
                    !connectDrag
                  }
                  onSelect={() =>
                    handleNodeClick({ id: character.id, kind: "character" })
                  }
                  onOpenDetails={() =>
                    handleNodeClick(
                      { id: character.id, kind: "character" },
                      { openDetails: true },
                    )
                  }
                  onSelectGroup={
                    toolMode === "editGroupMembers"
                      ? () =>
                          handleNodeClick({
                            id: character.id,
                            kind: "character",
                          })
                      : (groupId) =>
                          setSelection({
                            type: "group",
                            id: groupId,
                            anchorCharacterId: character.id,
                          })
                  }
                  onConnectHandleDown={handleConnectHandleDown({
                    id: character.id,
                    kind: "character",
                  })}
                  onDragMove={(pos) =>
                    moveCharacter(character.id, pos, { recordHistory: false })
                  }
                  onDragEnd={(pos) =>
                    moveCharacter(character.id, pos, { recordHistory: false })
                  }
                />
              );
            })}

          {boxes
            .filter((b) => !b.collapsed)
            .map((box) => (
              <BoxContainer
                key={`${box.id}-fg`}
                box={box}
                characters={characters}
                selected={isItemSelected(selection, "box", box.id)}
                isConnectSource={isConnectSource({
                  id: box.id,
                  kind: "box",
                })}
                onSelect={() => handleNodeClick({ id: box.id, kind: "box" })}
                onOpenDetails={() =>
                  handleNodeClick(
                    { id: box.id, kind: "box" },
                    { openDetails: true },
                  )
                }
                onToggleCollapse={() => toggleBoxCollapse(box.id)}
                onBoundsChange={(bounds) =>
                  updateBox(box.id, { bounds }, { recordHistory: false })
                }
                onMoveByDelta={(delta, contents) =>
                  moveBox(box.id, delta, contents, { recordHistory: false })
                }
                onResizeStart={() => setIsResizingBox(true)}
                onResizeEnd={() => setIsResizingBox(false)}
                onDragStart={() => setIsDraggingBox(true)}
                onDragEnd={() => setIsDraggingBox(false)}
                onConnectHandleDown={handleConnectHandleDown({
                  id: box.id,
                  kind: "box",
                })}
                part="foreground"
              />
            ))}

          {boxes
            .filter((b) => b.collapsed)
            .map((box) => (
              <BoxContainer
                key={box.id}
                box={box}
                characters={characters}
                selected={isItemSelected(selection, "box", box.id)}
                isConnectSource={isConnectSource({
                  id: box.id,
                  kind: "box",
                })}
                onSelect={() => handleNodeClick({ id: box.id, kind: "box" })}
                onOpenDetails={() =>
                  handleNodeClick(
                    { id: box.id, kind: "box" },
                    { openDetails: true },
                  )
                }
                onToggleCollapse={() => toggleBoxCollapse(box.id)}
                onBoundsChange={(bounds) =>
                  updateBox(box.id, { bounds }, { recordHistory: false })
                }
                onMoveByDelta={(delta, contents) =>
                  moveBox(box.id, delta, contents, { recordHistory: false })
                }
                onResizeStart={() => setIsResizingBox(true)}
                onResizeEnd={() => setIsResizingBox(false)}
                onDragStart={() => setIsDraggingBox(true)}
                onDragEnd={() => setIsDraggingBox(false)}
                onConnectHandleDown={handleConnectHandleDown({
                  id: box.id,
                  kind: "box",
                })}
              />
            ))}

          {floatingTexts
            .filter(
              (t) =>
                !isFloatingTextHidden(
                  t.id,
                  boxes,
                  floatingTexts,
                  diagramFontFamily,
                ),
            )
            .map((floatingText) => (
            <FloatingTextNode
              key={floatingText.id}
              floatingText={floatingText}
              selected={isItemSelected(
                selection,
                "floatingText",
                floatingText.id,
              )}
              draggable={
                toolMode !== "exportBounds" &&
                toolMode !== "editGroupMembers" &&
                !connectDrag
              }
              onSelect={() =>
                setSelection(
                  { type: "floatingText", id: floatingText.id },
                  { openDetails: false },
                )
              }
              onOpenDetails={() =>
                setSelection(
                  { type: "floatingText", id: floatingText.id },
                  { openDetails: true },
                )
              }
              onDragMove={(pos) =>
                moveFloatingText(floatingText.id, pos, {
                  recordHistory: false,
                })
              }
              onDragEnd={(pos) =>
                moveFloatingText(floatingText.id, pos, {
                  recordHistory: false,
                })
              }
            />
          ))}

          {previewBounds && (
            <ScaleStrokeRect
              x={previewBounds.x}
              y={previewBounds.y}
              width={previewBounds.width}
              height={previewBounds.height}
              stroke={previewStroke}
              fill={previewFill}
              dashPattern={[8, 4]}
            />
          )}
        </Layer>
        <MembershipChipNameOverlay />
        <BookmarkFlagsLayer />
      </ViewportStage>
      <CanvasAddObjectMenu
        menu={addObjectMenu}
        onClose={() => setAddObjectMenu(null)}
      />
    </div>
  );
}
