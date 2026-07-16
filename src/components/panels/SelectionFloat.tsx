import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Stage, Layer, Group as KonvaGroup } from "react-konva";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { RgbPicker } from "../pickers/RgbPicker";
import { ShapePicker } from "../pickers/ShapePicker";
import type { LineStyle } from "../../models/types";
import {
  DEFAULT_FLOATING_TEXT_COLOR,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  MEMBERSHIP_CHIP_RADIUS,
  MIN_FLOATING_TEXT_FONT_SIZE,
} from "../../models/types";
import {
  getBoxById,
  getCharacterById,
  getCharactersContainedInBox,
  getFloatingTextById,
  getGroupById,
} from "../../utils/geometry";
import { DEFAULT_IMAGE_FOCUS } from "../../utils/imageLayout";
import { ImageFocusControls } from "./ImageFocusControls";
import { MembershipAppearanceDialog } from "./MembershipAppearanceDialog";
import { MembershipChip } from "../Canvas/MembershipChips";
import {
  clampSelectionFloatPosition,
  connectorEndpoints,
  defaultFloatAnchorScreen,
  getGroupChipAnchorWorld,
  getLineSelectionAvoidBounds,
  getSelectionAnchorWorld,
  isSelectionFloatInteractiveTarget,
  placeSelectionFloat,
  selectionFloatPlacementKey,
  SELECTION_FLOAT_WIDTH,
  shouldShowFloatConnector,
  worldBoundsToScreen,
  worldToScreen,
} from "../../utils/selectionAnchor";
import {
  isSelfConnection,
  nextRouteIndex,
  resolveLineBend,
} from "../../utils/lineRouting";

const LINE_STYLES: LineStyle[] = ["straight", "wavy", "dotted", "jagged"];

const ESTIMATED_FLOAT_HEIGHT = 280;
/** Ignore tiny pointer moves so a click does not detach the panel. */
const FLOAT_DRAG_DETACH_THRESHOLD_PX = 3;

type FloatPlacement = {
  key: string;
  left: number;
  top: number;
  /** Screen-fixed after user drag (or group open). */
  detached: boolean;
};

/** Arrows-repeat glyph: right arrow above, left arrow below. */
function ReverseLineIcon() {
  return (
    <svg
      className="btn-icon-svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m16 10 3-3m0 0-3-3m3 3H5v3m3 4-3 3m0 0 3 3m-3-3h14v-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowToggleIcon({ direction }: { direction: "left" | "right" }) {
  const path =
    direction === "left"
      ? "M19 12H5m0 0 5-5m-5 5 5 5"
      : "M5 12h14m0 0-5-5m5 5-5 5";

  return (
    <svg
      className="btn-icon-svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SelectionFloat() {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [panelHeight, setPanelHeight] = useState(ESTIMATED_FLOAT_HEIGHT);
  const [chipAppearanceOpen, setChipAppearanceOpen] = useState(false);
  const [floatPlacement, setFloatPlacement] = useState<FloatPlacement | null>(
    null,
  );
  const [isDraggingFloat, setIsDraggingFloat] = useState(false);
  const floatDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
  } | null>(null);

  const selection = useDiagramStore((s) => s.selection);
  const characters = useDiagramStore((s) => s.characters);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const lines = useDiagramStore((s) => s.lines);
  const groups = useDiagramStore((s) => s.groups);
  const boxes = useDiagramStore((s) => s.boxes);
  const floatingTexts = useDiagramStore((s) => s.floatingTexts);
  const viewport = useDiagramStore((s) => s.viewport);
  const stageSize = useDiagramStore((s) => s.stageSize);
  const getDiagram = useDiagramStore((s) => s.getDiagram);
  const updateCharacter = useDiagramStore((s) => s.updateCharacter);
  const updateLine = useDiagramStore((s) => s.updateLine);
  const updateGroup = useDiagramStore((s) => s.updateGroup);
  const updateBox = useDiagramStore((s) => s.updateBox);
  const updateFloatingText = useDiagramStore((s) => s.updateFloatingText);
  const toggleBoxCollapse = useDiagramStore((s) => s.toggleBoxCollapse);
  const toolMode = useDiagramStore((s) => s.toolMode);
  const setToolMode = useDiagramStore((s) => s.setToolMode);
  const deleteSelected = useDiagramStore((s) => s.deleteSelected);

  const selectedGroupId =
    selection?.type === "group" ? selection.id : null;
  const placementKey = selection
    ? selectionFloatPlacementKey(selection)
    : null;

  useEffect(() => {
    setChipAppearanceOpen(false);
  }, [selectedGroupId]);

  useEffect(() => {
    if (placementKey) return;
    setFloatPlacement(null);
    setIsDraggingFloat(false);
    floatDragRef.current = null;
  }, [placementKey]);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const height = el.offsetHeight;
    if (height > 0 && Math.abs(height - panelHeight) > 1) {
      setPanelHeight(height);
    }
  }, [selection, characters, lines, groups, boxes, floatingTexts, panelHeight]);

  // Groups freeze in screen space as soon as they open (detached).
  useLayoutEffect(() => {
    if (selection?.type !== "group" || !placementKey) return;
    if (floatPlacement?.key === placementKey) return;

    const diagram = getDiagram();
    const chipAnchor = getGroupChipAnchorWorld(
      selection.anchorCharacterId,
      diagram,
    );
    const placed = placeSelectionFloat({
      anchorScreen: chipAnchor
        ? worldToScreen(chipAnchor, viewport)
        : defaultFloatAnchorScreen(stageSize.width, stageSize.height),
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      panelWidth: SELECTION_FLOAT_WIDTH,
      panelHeight,
    });

    setFloatPlacement({
      key: placementKey,
      left: placed.left,
      top: placed.top,
      detached: true,
    });
    setIsDraggingFloat(false);
    floatDragRef.current = null;
  }, [
    selection,
    placementKey,
    floatPlacement?.key,
    getDiagram,
    viewport,
    stageSize.width,
    stageSize.height,
    panelHeight,
  ]);

  if (!selection) {
    return null;
  }

  // Canvas bookmark selection shows a viewport outline only (no float panel).
  if (selection.type === "bookmark") {
    return null;
  }

  const diagram = getDiagram();
  const isGroupSelection = selection.type === "group";

  const connectorAnchorWorld = isGroupSelection
    ? getGroupChipAnchorWorld(selection.anchorCharacterId, diagram)
    : getSelectionAnchorWorld(selection, diagram);

  let avoidScreen: ReturnType<typeof worldBoundsToScreen> | undefined;
  if (selection.type === "line") {
    const line = lines.find((l) => l.id === selection.id);
    if (line) {
      avoidScreen = worldBoundsToScreen(
        getLineSelectionAvoidBounds(line, diagram),
        viewport,
      );
    }
  }

  const placementMatches =
    Boolean(placementKey) && floatPlacement?.key === placementKey;
  const isDetached = Boolean(placementMatches && floatPlacement?.detached);

  let left: number;
  let top: number;

  if (isDetached && floatPlacement) {
    ({ left, top } = clampSelectionFloatPosition({
      left: floatPlacement.left,
      top: floatPlacement.top,
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      panelWidth: SELECTION_FLOAT_WIDTH,
      panelHeight,
    }));
  } else if (isGroupSelection) {
    // Provisional group placement before the freeze layout effect commits.
    const chipAnchor = getGroupChipAnchorWorld(
      selection.anchorCharacterId,
      diagram,
    );
    ({ left, top } = placeSelectionFloat({
      anchorScreen: chipAnchor
        ? worldToScreen(chipAnchor, viewport)
        : defaultFloatAnchorScreen(stageSize.width, stageSize.height),
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      panelWidth: SELECTION_FLOAT_WIDTH,
      panelHeight,
    }));
  } else {
    const anchorWorld = getSelectionAnchorWorld(selection, diagram);
    const anchorScreen = anchorWorld
      ? worldToScreen(anchorWorld, viewport)
      : defaultFloatAnchorScreen(stageSize.width, stageSize.height);
    ({ left, top } = placeSelectionFloat({
      anchorScreen,
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      panelWidth: SELECTION_FLOAT_WIDTH,
      panelHeight,
      avoidScreen,
    }));
  }

  const endFloatDrag = (pointerId: number) => {
    const drag = floatDragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    floatDragRef.current = null;
    setIsDraggingFloat(false);
    const el = panelRef.current;
    if (el?.hasPointerCapture(pointerId)) {
      el.releasePointerCapture(pointerId);
    }
  };

  const handleFloatPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!placementKey || e.button !== 0) return;
    if (isSelectionFloatInteractiveTarget(e.target)) return;
    e.preventDefault();
    floatDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: left,
      originTop: top,
      moved: false,
    };
    setIsDraggingFloat(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleFloatPointerMove = (e: PointerEvent<HTMLElement>) => {
    const drag = floatDragRef.current;
    if (!drag || !placementKey || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (
      !drag.moved &&
      Math.hypot(dx, dy) < FLOAT_DRAG_DETACH_THRESHOLD_PX
    ) {
      return;
    }
    drag.moved = true;

    const next = clampSelectionFloatPosition({
      left: drag.originLeft + dx,
      top: drag.originTop + dy,
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      panelWidth: SELECTION_FLOAT_WIDTH,
      panelHeight,
    });
    setFloatPlacement({
      key: placementKey,
      left: next.left,
      top: next.top,
      detached: true,
    });
  };

  const handleFloatPointerUp = (e: PointerEvent<HTMLElement>) => {
    endFloatDrag(e.pointerId);
  };

  let body: ReactNode = null;
  let chipDialog: ReactNode = null;

  if (selection.type === "character") {
    const character = getCharacterById({ characters }, selection.id);
    if (!character) return null;

    const handleImage = (file: File | null) => {
      if (!file) {
        updateCharacter(character.id, {
          imageData: undefined,
          imageFileName: undefined,
        });
        return;
      }
      const fileName = file.name;
      const characterId = character.id;
      const reader = new FileReader();
      reader.onload = () => {
        updateCharacter(characterId, {
          imageData: reader.result as string,
          imageFileName: fileName,
          imageFocus: DEFAULT_IMAGE_FOCUS,
        });
      };
      reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
      updateCharacter(character.id, {
        imageData: undefined,
        imageFileName: undefined,
        imageFocus: undefined,
      });
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    };

    body = (
      <>
        <h2>{t("selection.character")}</h2>
        <label className="field">
          <span>{t("selection.name")}</span>
          <input
            type="text"
            value={character.name}
            placeholder={t("selection.nameless")}
            onChange={(e) =>
              updateCharacter(character.id, { name: e.target.value })
            }
          />
        </label>
        <label className="field">
          <span>{t("selection.subtitle")}</span>
          <input
            type="text"
            value={character.subtitle ?? ""}
            onChange={(e) =>
              updateCharacter(character.id, {
                subtitle: e.target.value || undefined,
              })
            }
          />
        </label>
        <div className="field">
          <span>{t("selection.image")}</span>
          <input
            key={character.id}
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
          />
          {character.imageData && (
            <p className="hint hint-filename" title={character.imageFileName}>
              {character.imageFileName
                ? character.imageFileName
                : t("selection.imageAttached")}
            </p>
          )}
          {character.imageData && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleRemoveImage}
            >
              {t("selection.removeImage")}
            </button>
          )}
        </div>
        {character.imageData && (
          <details className="float-details">
            <summary>{t("selection.adjustCrop")}</summary>
            <ImageFocusControls character={character} />
          </details>
        )}
        <ShapePicker
          value={character.borderShape}
          onChange={(borderShape) =>
            updateCharacter(character.id, { borderShape })
          }
        />
        <RgbPicker
          label={t("selection.borderColour")}
          value={character.borderColor}
          onChange={(borderColor) =>
            updateCharacter(character.id, { borderColor })
          }
        />
        <label className="field">
          <span>{t("selection.size")}</span>
          <input
            type="range"
            min={24}
            max={80}
            value={character.size}
            onChange={(e) =>
              updateCharacter(character.id, {
                size: Number(e.target.value),
              })
            }
          />
        </label>
        <button type="button" className="btn-danger" onClick={deleteSelected}>
          {t("selection.deleteCharacter")}
        </button>
      </>
    );
  } else if (selection.type === "line") {
    const line = lines.find((l) => l.id === selection.id);
    if (!line) return null;

    const endpointLabel = (ref: (typeof line)["from"]) => {
      if (ref.kind === "character") {
        const character = getCharacterById({ characters }, ref.id);
        const name = character?.name.trim();
        return name || t("selection.nameless");
      }
      const box = getBoxById({ boxes }, ref.id);
      const name = box?.name.trim();
      return name || t("selection.box");
    };

    const reverseLine = () => {
      const from = line.to;
      const to = line.from;
      const others = lines.filter((l) => l.id !== line.id);
      const bend = resolveLineBend(line);
      updateLine(line.id, {
        from,
        to,
        routeIndex: nextRouteIndex(from, to, others),
        bend: isSelfConnection(line) ? bend : -bend,
      });
    };

    body = (
      <>
        <h2>{t("selection.line")}</h2>
        <div className="selection-line-endpoints">
          <button
            type="button"
            className="btn-icon"
            aria-label={t("selection.reverseLine")}
            title={t("selection.reverseLine")}
            onClick={reverseLine}
          >
            <ReverseLineIcon />
          </button>
          <p className="hint">
            {t("selection.lineEndpoints", {
              from: endpointLabel(line.from),
              to: endpointLabel(line.to),
            })}
          </p>
        </div>
        <div className="line-arrow-toggles">
          <button
            type="button"
            className={`btn-icon line-arrow-toggle${
              line.startArrow ? " is-active" : ""
            }`}
            aria-label={t("selection.arrowStart")}
            aria-pressed={line.startArrow}
            title={t("selection.arrowStart")}
            onClick={() =>
              updateLine(line.id, { startArrow: !line.startArrow })
            }
          >
            <ArrowToggleIcon direction="left" />
          </button>
          <button
            type="button"
            className={`btn-icon line-arrow-toggle${
              line.endArrow ? " is-active" : ""
            }`}
            aria-label={t("selection.arrowEnd")}
            aria-pressed={line.endArrow}
            title={t("selection.arrowEnd")}
            onClick={() => updateLine(line.id, { endArrow: !line.endArrow })}
          >
            <ArrowToggleIcon direction="right" />
          </button>
        </div>
        <label className="field">
          <span>{t("selection.label")}</span>
          <input
            type="text"
            value={line.label ?? ""}
            onChange={(e) =>
              updateLine(line.id, { label: e.target.value || undefined })
            }
          />
        </label>
        <label className="field">
          <span>{t("selection.style")}</span>
          <select
            value={line.style}
            onChange={(e) =>
              updateLine(line.id, { style: e.target.value as LineStyle })
            }
          >
            {LINE_STYLES.map((style) => (
              <option key={style} value={style}>
                {t(`lineStyle.${style}`)}
              </option>
            ))}
          </select>
        </label>
        <RgbPicker
          label={t("selection.lineColour")}
          value={line.color}
          onChange={(color) => updateLine(line.id, { color })}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => updateLine(line.id, { bend: 0 })}
        >
          {t("selection.resetCurve")}
        </button>
        <button type="button" className="btn-danger" onClick={deleteSelected}>
          {t("selection.deleteLine")}
        </button>
      </>
    );
  } else if (selection.type === "box") {
    const box = getBoxById({ boxes }, selection.id);
    if (!box) return null;
    const contained = getCharactersContainedInBox(
      box,
      characters,
      diagramFontFamily,
    );

    body = (
      <>
        <h2>{t("selection.box")}</h2>
        <label className="field">
          <span>{t("selection.name")}</span>
          <input
            type="text"
            value={box.name}
            onChange={(e) => updateBox(box.id, { name: e.target.value })}
          />
        </label>
        <RgbPicker
          label={t("selection.borderColour")}
          value={box.borderColor}
          onChange={(borderColor) => updateBox(box.id, { borderColor })}
        />
        <p className="hint">
          {t("selection.containedCount", { count: contained.length })}
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => toggleBoxCollapse(box.id)}
        >
          {box.collapsed
            ? t("selection.expandBox")
            : t("selection.collapseBox")}
        </button>
        <p className="hint">{t("selection.collapseHint")}</p>
        <button type="button" className="btn-danger" onClick={deleteSelected}>
          {t("selection.deleteBox")}
        </button>
      </>
    );
  } else if (selection.type === "floatingText") {
    const floatingText = getFloatingTextById(
      { floatingTexts },
      selection.id,
    );
    if (!floatingText) return null;

    const color = floatingText.color ?? DEFAULT_FLOATING_TEXT_COLOR;
    const fontSize =
      floatingText.fontSize || DEFAULT_FLOATING_TEXT_FONT_SIZE;

    const commitFontSize = (raw: string) => {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        updateFloatingText(floatingText.id, { fontSize });
        return;
      }
      updateFloatingText(floatingText.id, {
        fontSize: Math.max(MIN_FLOATING_TEXT_FONT_SIZE, Math.round(parsed)),
      });
    };

    body = (
      <>
        <h2>{t("selection.text")}</h2>
        <label className="field">
          <span>{t("selection.textField")}</span>
          <textarea
            value={floatingText.text}
            placeholder={t("selection.textPlaceholder")}
            rows={4}
            onChange={(e) =>
              updateFloatingText(floatingText.id, { text: e.target.value })
            }
          />
        </label>
        <RgbPicker
          label={t("selection.colour")}
          value={color}
          onChange={(nextColor) =>
            updateFloatingText(floatingText.id, { color: nextColor })
          }
        />
        <label className="field">
          <span>{t("selection.fontSize")}</span>
          <input
            type="number"
            min={MIN_FLOATING_TEXT_FONT_SIZE}
            step={1}
            value={fontSize}
            onChange={(e) => {
              if (e.target.value.trim() === "") return;
              const parsed = Number(e.target.value);
              if (!Number.isFinite(parsed)) return;
              updateFloatingText(floatingText.id, {
                fontSize: Math.round(parsed),
              });
            }}
            onBlur={(e) => commitFontSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitFontSize((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </label>
        <button type="button" className="btn-danger" onClick={deleteSelected}>
          {t("selection.deleteText")}
        </button>
      </>
    );
  } else if (selection.type === "group") {
    const group = getGroupById({ groups }, selection.id);
    if (!group) return null;

    const previewSize = (MEMBERSHIP_CHIP_RADIUS + 4) * 2;

    body = (
      <>
        <h2>{t("selection.group")}</h2>
        <p className="hint">{t("selection.groupHint")}</p>
        <label className="field">
          <span>{t("selection.name")}</span>
          <input
            type="text"
            value={group.name}
            onChange={(e) => updateGroup(group.id, { name: e.target.value })}
          />
        </label>
        <div className="field">
          <span>{t("selection.chip")}</span>
          <div className="membership-chip-summary">
            <div className="membership-chip-preview">
              <Stage width={previewSize} height={previewSize}>
                <Layer>
                  <KonvaGroup x={previewSize / 2} y={previewSize / 2}>
                    <MembershipChip appearance={group.appearance} />
                  </KonvaGroup>
                </Layer>
              </Stage>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setChipAppearanceOpen(true)}
            >
              {t("selection.customiseChip")}
            </button>
          </div>
        </div>
        <div className="field">
          <span>
            {t("selection.members", {
              count: group.memberCharacterIds.length,
            })}
          </span>
          {characters.length === 0 ? (
            <p className="hint">{t("selection.noCharacters")}</p>
          ) : (
            <>
              <button
                type="button"
                className={
                  toolMode === "editGroupMembers"
                    ? "btn-primary"
                    : "btn-secondary"
                }
                onClick={() =>
                  setToolMode(
                    toolMode === "editGroupMembers"
                      ? "select"
                      : "editGroupMembers",
                  )
                }
              >
                {toolMode === "editGroupMembers"
                  ? t("selection.doneEditingMembers")
                  : t("selection.editMembers")}
              </button>
              <p className="hint">
                {toolMode === "editGroupMembers"
                  ? t("selection.membersHintActive")
                  : t("selection.membersHintIdle")}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          className="btn-danger"
          onClick={deleteSelected}
          disabled={toolMode === "editGroupMembers"}
        >
          {t("selection.deleteGroup")}
        </button>
      </>
    );

    chipDialog = (
      <MembershipAppearanceDialog
        groupId={group.id}
        open={chipAppearanceOpen}
        onClose={() => setChipAppearanceOpen(false)}
      />
    );
  }

  if (!body) return null;

  const floatClassName = [
    "selection-float",
    "selection-float-draggable",
    isDraggingFloat ? "is-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  let connector: ReactNode = null;
  if (isDetached && connectorAnchorWorld) {
    const anchorScreen = worldToScreen(connectorAnchorWorld, viewport);
    const panelBounds = {
      x: left,
      y: top,
      width: SELECTION_FLOAT_WIDTH,
      height: panelHeight,
    };
    if (shouldShowFloatConnector(panelBounds, anchorScreen)) {
      const { from, to } = connectorEndpoints(panelBounds, anchorScreen);
      connector = (
        <svg
          className="selection-float-connector"
          width={stageSize.width}
          height={stageSize.height}
          aria-hidden
        >
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className="selection-float-connector-line"
          />
          <circle
            cx={from.x}
            cy={from.y}
            r={3}
            className="selection-float-connector-dot"
          />
        </svg>
      );
    }
  }

  return (
    <>
      {connector}
      <aside
        ref={panelRef}
        className={floatClassName}
        style={{ left, top, width: SELECTION_FLOAT_WIDTH }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          e.stopPropagation();
          handleFloatPointerDown(e);
        }}
        onPointerMove={handleFloatPointerMove}
        onPointerUp={handleFloatPointerUp}
        onPointerCancel={handleFloatPointerUp}
      >
        {body}
      </aside>
      {chipDialog}
    </>
  );
}
