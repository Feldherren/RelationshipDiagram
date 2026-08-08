import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Stage, Layer, Group as KonvaGroup } from "react-konva";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { RgbPicker } from "../pickers/RgbPicker";
import { ShapePicker } from "../pickers/ShapePicker";
import type {
  FloatingTextAlign,
  LineStyle,
  Selection,
  Viewport,
} from "../../models/types";
import {
  clampCharacterSize,
  contrastingInk,
  DEFAULT_FLOATING_TEXT_ALIGN,
  DEFAULT_FLOATING_TEXT_COLOR,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  FLOATING_TEXT_ALIGNS,
  MAX_CHARACTER_SIZE,
  MAX_FLOATING_TEXT_FONT_SIZE,
  MEMBERSHIP_CHIP_RADIUS,
  MIN_CHARACTER_SIZE,
  MIN_FLOATING_TEXT_FONT_SIZE,
  rgbToCss,
} from "../../models/types";
import { DEFAULT_DIAGRAM_BACKGROUND } from "../../utils/diagramBackground";
import { isValidUri, normalizeCharacterLink } from "../../utils/uri";
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
  getSelectionAnchorWorld,
  getSelectionAvoidBounds,
  getSelectionConnectorAnchorWorld,
  isSelectionFloatInteractiveTarget,
  placeSelectionFloat,
  screenToWorld,
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

function LayerSelectField({
  layerId,
  onChange,
}: {
  layerId: string;
  onChange: (layerId: string) => void;
}) {
  const { t } = useTranslation();
  const layers = useDiagramStore((s) => s.layers);
  return (
    <label className="field">
      <span>{t("selection.layer")}</span>
      <select
        value={layerId}
        onChange={(e) => onChange(e.target.value)}
      >
        {[...layers].reverse().map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Connector only — keeps viewport subscription off the detached panel body. */
function SelectionFloatConnector({
  selection,
  left,
  top,
  panelHeight,
  stageWidth,
  stageHeight,
}: {
  selection: NonNullable<Selection>;
  left: number;
  top: number;
  panelHeight: number;
  stageWidth: number;
  stageHeight: number;
}) {
  const viewport = useDiagramStore((s) => s.viewport);
  const getDiagram = useDiagramStore((s) => s.getDiagram);
  const diagramBackgroundColor = useDiagramStore(
    (s) => s.diagramBackgroundColor,
  );
  const diagram = getDiagram();
  const panelBounds = {
    x: left,
    y: top,
    width: SELECTION_FLOAT_WIDTH,
    height: panelHeight,
  };
  const panelCenterScreen = {
    x: left + SELECTION_FLOAT_WIDTH / 2,
    y: top + panelHeight / 2,
  };
  const connectorAnchorWorld = getSelectionConnectorAnchorWorld(
    selection,
    diagram,
    screenToWorld(panelCenterScreen, viewport),
    viewport.scale,
  );
  if (!connectorAnchorWorld) return null;
  const anchorScreen = worldToScreen(connectorAnchorWorld, viewport);
  if (!shouldShowFloatConnector(panelBounds, anchorScreen)) return null;
  const { from, to } = connectorEndpoints(panelBounds, anchorScreen);
  const connectorColor = rgbToCss(
    contrastingInk(diagramBackgroundColor ?? DEFAULT_DIAGRAM_BACKGROUND),
  );
  return (
    <svg
      className="selection-float-connector"
      width={stageWidth}
      height={stageHeight}
      aria-hidden
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        className="selection-float-connector-line"
        style={{ stroke: connectorColor }}
      />
      <circle
        cx={from.x}
        cy={from.y}
        r={3}
        className="selection-float-connector-dot"
        style={{ fill: connectorColor }}
      />
    </svg>
  );
}

function liveViewport(tracked: Viewport | null): Viewport {
  return tracked ?? useDiagramStore.getState().viewport;
}

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

function TextAlignIcon({ align }: { align: FloatingTextAlign }) {
  const lines =
    align === "left"
      ? [
          { x: 4, w: 16 },
          { x: 4, w: 12 },
          { x: 4, w: 14 },
        ]
      : align === "right"
        ? [
            { x: 4, w: 16 },
            { x: 8, w: 12 },
            { x: 6, w: 14 },
          ]
        : [
            { x: 4, w: 16 },
            { x: 6, w: 12 },
            { x: 5, w: 14 },
          ];

  return (
    <svg
      className="btn-icon-svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      {lines.map((line, index) => (
        <rect
          key={index}
          x={line.x}
          y={6 + index * 5}
          width={line.w}
          height={2}
          rx={1}
          fill="currentColor"
        />
      ))}
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
  const selectionDetailsOpen = useDiagramStore((s) => s.selectionDetailsOpen);
  const characters = useDiagramStore((s) => s.characters);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const lines = useDiagramStore((s) => s.lines);
  const groups = useDiagramStore((s) => s.groups);
  const boxes = useDiagramStore((s) => s.boxes);
  const floatingTexts = useDiagramStore((s) => s.floatingTexts);
  const bookmarks = useDiagramStore((s) => s.bookmarks);
  const stageSize = useDiagramStore((s) => s.stageSize);
  const getDiagram = useDiagramStore((s) => s.getDiagram);
  const updateCharacter = useDiagramStore((s) => s.updateCharacter);
  const updateLine = useDiagramStore((s) => s.updateLine);
  const updateGroup = useDiagramStore((s) => s.updateGroup);
  const updateBox = useDiagramStore((s) => s.updateBox);
  const updateFloatingText = useDiagramStore((s) => s.updateFloatingText);
  const updateBookmark = useDiagramStore((s) => s.updateBookmark);
  const updateBookmarkView = useDiagramStore((s) => s.updateBookmarkView);
  const deleteBookmark = useDiagramStore((s) => s.deleteBookmark);
  const toggleBoxCollapse = useDiagramStore((s) => s.toggleBoxCollapse);
  const toolMode = useDiagramStore((s) => s.toolMode);
  const setToolMode = useDiagramStore((s) => s.setToolMode);
  const deleteSelected = useDiagramStore((s) => s.deleteSelected);
  const setEntityLayer = useDiagramStore((s) => s.setEntityLayer);

  const selectedGroupId =
    selection?.type === "group" ? selection.id : null;
  const placementKey = selection
    ? selectionFloatPlacementKey(selection)
    : null;
  const placementDetached = Boolean(
    placementKey &&
      floatPlacement?.key === placementKey &&
      floatPlacement.detached,
  );
  const trackViewport =
    Boolean(selectionDetailsOpen) &&
    selection != null &&
    selection.type !== "multi" &&
    !placementDetached;
  const viewport = useDiagramStore((s) =>
    trackViewport ? s.viewport : null,
  );

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
  }, [
    selection,
    characters,
    lines,
    groups,
    boxes,
    floatingTexts,
    bookmarks,
    panelHeight,
  ]);

  // Groups freeze in screen space as soon as they open (detached).
  useLayoutEffect(() => {
    if (selection?.type !== "group" || !placementKey) return;
    if (floatPlacement?.key === placementKey) return;

    const diagram = getDiagram();
    const chipAnchor = getGroupChipAnchorWorld(
      selection.anchorCharacterId,
      diagram,
    );
    const vp = liveViewport(viewport);
    const placed = placeSelectionFloat({
      anchorScreen: chipAnchor
        ? worldToScreen(chipAnchor, vp)
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

  if (!selection || !selectionDetailsOpen) {
    return null;
  }

  // Multi-select: highlight only (no float panel).
  if (selection.type === "multi") {
    return null;
  }

  const diagram = getDiagram();
  const isGroupSelection = selection.type === "group";
  const vp = liveViewport(viewport);

  const avoidWorld = getSelectionAvoidBounds(selection, diagram, vp.scale);
  const avoidScreen = avoidWorld
    ? worldBoundsToScreen(avoidWorld, vp)
    : undefined;

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
        ? worldToScreen(chipAnchor, vp)
        : defaultFloatAnchorScreen(stageSize.width, stageSize.height),
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      panelWidth: SELECTION_FLOAT_WIDTH,
      panelHeight,
    }));
  } else {
    const anchorWorld = getSelectionAnchorWorld(selection, diagram);
    const anchorScreen = anchorWorld
      ? worldToScreen(anchorWorld, vp)
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

  /** Keep the panel fixed while size sliders change object bounds under the cursor. */
  const freezeFloatPlacement = () => {
    if (!placementKey || isDetached) return;
    setFloatPlacement({
      key: placementKey,
      left,
      top,
      detached: true,
    });
  };

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

    const commitSize = (raw: string) => {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        return;
      }
      updateCharacter(character.id, {
        size: clampCharacterSize(parsed),
      });
    };

    body = (
      <>
        <h2>{t("selection.character")}</h2>
        <LayerSelectField
          layerId={character.layerId}
          onChange={(layerId) =>
            setEntityLayer("character", character.id, layerId)
          }
        />
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
        <label className="field">
          <span>{t("selection.link")}</span>
          <input
            type="text"
            value={character.link ?? ""}
            placeholder={t("selection.linkPlaceholder")}
            onChange={(e) =>
              updateCharacter(character.id, {
                link: e.target.value || undefined,
              })
            }
            onBlur={(e) => {
              const next = normalizeCharacterLink(e.target.value);
              if (next !== character.link) {
                updateCharacter(character.id, { link: next });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const next = normalizeCharacterLink(
                  (e.target as HTMLInputElement).value,
                );
                updateCharacter(character.id, { link: next });
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          {character.link && !isValidUri(character.link) && (
            <p className="hint">{t("selection.linkInvalid")}</p>
          )}
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
          <div className="range-row">
            <input
              type="number"
              min={MIN_CHARACTER_SIZE}
              max={MAX_CHARACTER_SIZE}
              step={1}
              value={character.size}
              aria-label={t("selection.size")}
              onChange={(e) => {
                if (e.target.value.trim() === "") return;
                const parsed = Number(e.target.value);
                if (!Number.isFinite(parsed)) return;
                updateCharacter(character.id, {
                  size: clampCharacterSize(parsed),
                });
              }}
              onBlur={(e) => commitSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitSize((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <input
              type="range"
              min={MIN_CHARACTER_SIZE}
              max={MAX_CHARACTER_SIZE}
              value={character.size}
              onPointerDown={freezeFloatPlacement}
              onFocus={freezeFloatPlacement}
              onChange={(e) =>
                updateCharacter(character.id, {
                  size: Number(e.target.value),
                })
              }
            />
          </div>
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
      if (ref.kind === "group") {
        const group = getGroupById({ groups }, ref.id);
        const name = group?.name.trim();
        return name || t("selection.group");
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
        <LayerSelectField
          layerId={line.layerId}
          onChange={(layerId) => setEntityLayer("line", line.id, layerId)}
        />
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
        <LayerSelectField
          layerId={box.layerId}
          onChange={(layerId) => setEntityLayer("box", box.id, layerId)}
        />
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
    const textAlign = floatingText.textAlign ?? DEFAULT_FLOATING_TEXT_ALIGN;

    const commitFontSize = (raw: string) => {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        updateFloatingText(floatingText.id, { fontSize });
        return;
      }
      updateFloatingText(floatingText.id, {
        fontSize: Math.min(
          MAX_FLOATING_TEXT_FONT_SIZE,
          Math.max(MIN_FLOATING_TEXT_FONT_SIZE, Math.round(parsed)),
        ),
      });
    };

    body = (
      <>
        <h2>{t("selection.text")}</h2>
        <LayerSelectField
          layerId={floatingText.layerId}
          onChange={(layerId) =>
            setEntityLayer("floatingText", floatingText.id, layerId)
          }
        />
        <div className="field">
          <span>{t("selection.textAlign")}</span>
          <div
            className="line-arrow-toggles"
            role="group"
            aria-label={t("selection.textAlign")}
          >
            {FLOATING_TEXT_ALIGNS.map((align) => {
              const alignLabelKey =
                align === "left"
                  ? "selection.textAlignLeft"
                  : align === "right"
                    ? "selection.textAlignRight"
                    : "selection.textAlignCenter";
              return (
                <button
                  key={align}
                  type="button"
                  className={`btn-icon line-arrow-toggle${
                    textAlign === align ? " is-active" : ""
                  }`}
                  aria-label={t(alignLabelKey)}
                  aria-pressed={textAlign === align}
                  title={t(alignLabelKey)}
                  onClick={() =>
                    updateFloatingText(floatingText.id, { textAlign: align })
                  }
                >
                  <TextAlignIcon align={align} />
                </button>
              );
            })}
          </div>
        </div>
        <RgbPicker
          label={t("selection.colour")}
          value={color}
          onChange={(nextColor) =>
            updateFloatingText(floatingText.id, { color: nextColor })
          }
        />
        <label className="field">
          <span>{t("selection.fontSize")}</span>
          <div className="range-row">
            <input
              type="number"
              min={MIN_FLOATING_TEXT_FONT_SIZE}
              max={MAX_FLOATING_TEXT_FONT_SIZE}
              step={1}
              value={fontSize}
              aria-label={t("selection.fontSize")}
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
            <input
              type="range"
              min={MIN_FLOATING_TEXT_FONT_SIZE}
              max={MAX_FLOATING_TEXT_FONT_SIZE}
              value={fontSize}
              onPointerDown={freezeFloatPlacement}
              onFocus={freezeFloatPlacement}
              onChange={(e) =>
                updateFloatingText(floatingText.id, {
                  fontSize: Number(e.target.value),
                })
              }
            />
          </div>
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
        <LayerSelectField
          layerId={group.layerId}
          onChange={(layerId) => setEntityLayer("group", group.id, layerId)}
        />
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
        {group.hubPosition != null && (
          <button
            type="button"
            className="btn-secondary"
            title={t("selection.resetHubPositionHint")}
            onClick={() => updateGroup(group.id, { hubPosition: null })}
          >
            {t("selection.resetHubPosition")}
          </button>
        )}
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
  } else if (selection.type === "bookmark") {
    const bookmark = bookmarks.find((b) => b.id === selection.id);
    if (!bookmark) return null;

    body = (
      <>
        <h2>{t("bookmarks.editTitle")}</h2>
        <label className="field">
          <span>{t("bookmarks.nameLabel")}</span>
          <input
            type="text"
            value={bookmark.name}
            onChange={(e) =>
              updateBookmark(bookmark.id, { name: e.target.value })
            }
            maxLength={80}
            autoFocus
          />
        </label>
        <RgbPicker
          label={t("bookmarks.colourLabel")}
          value={bookmark.color}
          onChange={(color) => updateBookmark(bookmark.id, { color })}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => updateBookmarkView(bookmark.id)}
        >
          {t("bookmarks.updateView")}
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => deleteBookmark(bookmark.id)}
        >
          {t("bookmarks.delete")}
        </button>
      </>
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
  if (isDetached) {
    connector = (
      <SelectionFloatConnector
        selection={selection}
        left={left}
        top={top}
        panelHeight={panelHeight}
        stageWidth={stageSize.width}
        stageHeight={stageSize.height}
      />
    );
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
