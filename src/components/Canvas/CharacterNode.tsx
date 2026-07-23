import { Group, Rect, RegularPolygon, Circle, Text } from "react-konva";
import { useRef, useState } from "react";
import type Konva from "konva";
import type { Character } from "../../models/types";
import {
  CHARACTER_BORDER_CORNER_RADIUS,
  CHARACTER_BORDER_STROKE_WIDTH,
  rgbToCss,
} from "../../models/types";
import { getCharacterInitials } from "../../store/diagramStore";
import { CharacterImage } from "./CharacterImage";
import {
  getConnectHandleOffset,
} from "../../utils/connection";
import { useDiagramStore } from "../../store/diagramStore";
import {
  CHARACTER_LABEL_GAP,
  CHARACTER_LABEL_PADDING_X,
  CHARACTER_LABEL_PADDING_Y,
  CHARACTER_NAME_FONT_SIZE,
  CHARACTER_SUBTITLE_FONT_SIZE,
} from "../../utils/labelMetrics";
import { getPillLabelHeight, PillLabel } from "./PillLabel";
import { ConnectHandle } from "./ConnectHandle";
import { formatFontForCanvas } from "../../utils/diagramFont";
import {
  RadialAuraCircle,
  RadialSelectionPulse,
  shouldShowAura,
} from "./HoverAura";
import {
  MembershipChips,
  type MembershipChipItem,
} from "./MembershipChips";
import { isIdInMultiSelection } from "../../utils/selectionMulti";

interface CharacterNodeProps {
  character: Character;
  selected: boolean;
  draggable: boolean;
  isConnectSource: boolean;
  membershipGroups: MembershipChipItem[];
  highlightedGroupId?: string | null;
  dimmed?: boolean;
  membershipEmphasized?: boolean;
  onSelect: () => void;
  onOpenDetails: () => void;
  onSelectGroup?: (groupId: string) => void;
  onDragMove: (pos: { x: number; y: number }) => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
  onConnectHandleDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}

function ShapeOutline({
  shape,
  size,
  color,
  fill = "#ffffff",
}: {
  shape: Character["borderShape"];
  size: number;
  color: string;
  fill?: string;
}) {
  const props = {
    stroke: color,
    strokeWidth: CHARACTER_BORDER_STROKE_WIDTH,
    fill,
  };

  switch (shape) {
    case "square":
      return (
        <Rect
          x={-size}
          y={-size}
          width={size * 2}
          height={size * 2}
          cornerRadius={CHARACTER_BORDER_CORNER_RADIUS}
          {...props}
        />
      );
    case "pentagon":
      return (
        <RegularPolygon
          x={0}
          y={0}
          sides={5}
          radius={size}
          cornerRadius={CHARACTER_BORDER_CORNER_RADIUS}
          {...props}
        />
      );
    case "hexagon":
      return (
        <RegularPolygon
          x={0}
          y={0}
          sides={6}
          radius={size}
          cornerRadius={CHARACTER_BORDER_CORNER_RADIUS}
          {...props}
        />
      );
    default:
      return <Circle x={0} y={0} radius={size} {...props} />;
  }
}

export function CharacterNode({
  character,
  selected,
  draggable,
  isConnectSource,
  membershipGroups,
  highlightedGroupId = null,
  dimmed = false,
  membershipEmphasized = false,
  onSelect,
  onOpenDetails,
  onSelectGroup,
  onDragMove,
  onDragEnd,
  onConnectHandleDown,
}: CharacterNodeProps) {
  const [hovered, setHovered] = useState(false);
  /** Konva dragstart often fires from mousemove (button===0); remember the real press. */
  const allowNodeDragRef = useRef(true);
  const multiDragLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const selection = useDiagramStore((s) => s.selection);
  const selectionPulseEnabled = useDiagramStore((s) => s.selectionPulseEnabled);
  const captureHistory = useDiagramStore((s) => s.captureHistory);
  const moveMultiSelectionByDelta = useDiagramStore(
    (s) => s.moveMultiSelectionByDelta,
  );
  const size = character.size;
  const color = rgbToCss(character.borderColor);
  const subtitleOffset = size + 8;
  const nameFontSize = CHARACTER_NAME_FONT_SIZE;
  const subtitleFontSize = CHARACTER_SUBTITLE_FONT_SIZE;
  const namePillHeight = getPillLabelHeight(
    nameFontSize,
    CHARACTER_LABEL_PADDING_Y,
  );
  const labelGap = CHARACTER_LABEL_GAP;
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const nameLabel = useDiagramStore(
    (s) => s.diagramAppearance.characterNameLabel,
  );
  const subtitleLabel = useDiagramStore(
    (s) => s.diagramAppearance.characterSubtitleLabel,
  );
  const characterPlaceholderFill = useDiagramStore(
    (s) => s.diagramAppearance.characterPlaceholderFill,
  );
  const characterInitialsColor = useDiagramStore(
    (s) => s.diagramAppearance.characterInitialsColor,
  );
  const handleOffset = getConnectHandleOffset(size);
  const showConnectHandle = selected || hovered || isConnectSource;
  const showAura =
    shouldShowAura(hovered, selected) || membershipEmphasized;
  const strongStaticSelectionAura = selected && !selectionPulseEnabled;

  const handleLabelSelect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    if ("button" in e.evt && e.evt.button !== 0) return;
    onSelect();
  };

  const handleOpenDetails = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    e.cancelBubble = true;
    e.evt.preventDefault();
    onOpenDetails();
  };

  return (
    <Group
      x={character.position.x}
      y={character.position.y}
      opacity={dimmed ? 0.28 : 1}
      draggable={draggable}
      onMouseDown={(e) => {
        allowNodeDragRef.current = e.evt.button === 0;
      }}
      onTouchStart={() => {
        allowNodeDragRef.current = true;
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        if (e.evt.button !== 0) return;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={handleOpenDetails}
      onDblTap={handleOpenDetails}
      onContextMenu={handleOpenDetails}
      onDragStart={(e) => {
        if (!allowNodeDragRef.current) {
          e.target.stopDrag();
          return;
        }
        // Dragging is layout, not inspect — keep selection, close the float.
        captureHistory();
        useDiagramStore.setState({ selectionDetailsOpen: false });
        multiDragLastPosRef.current = {
          x: character.position.x,
          y: character.position.y,
        };
      }}
      onDragMove={(e) => {
        const pos = { x: e.target.x(), y: e.target.y() };
        if (isIdInMultiSelection(selection, "character", character.id)) {
          const last = multiDragLastPosRef.current ?? pos;
          const dx = pos.x - last.x;
          const dy = pos.y - last.y;
          multiDragLastPosRef.current = pos;
          if (dx !== 0 || dy !== 0) {
            moveMultiSelectionByDelta({ dx, dy }, { recordHistory: false });
          }
          return;
        }
        onDragMove(pos);
      }}
      onDragEnd={(e) => {
        const pos = { x: e.target.x(), y: e.target.y() };
        multiDragLastPosRef.current = null;
        if (isIdInMultiSelection(selection, "character", character.id)) {
          return;
        }
        onDragEnd(pos);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showAura && (
        <RadialAuraCircle
          innerRadius={size}
          color={character.borderColor}
          peakOpacity={strongStaticSelectionAura ? 0.55 : undefined}
          outerPadding={strongStaticSelectionAura ? 32 : undefined}
        />
      )}
      {selected && selectionPulseEnabled && (
        <RadialSelectionPulse
          innerRadius={size}
          color={character.borderColor}
          active
        />
      )}
      <ShapeOutline
        shape={character.borderShape}
        size={size}
        color={color}
        fill={
          character.imageData
            ? "transparent"
            : rgbToCss(characterPlaceholderFill)
        }
      />
      {character.imageData ? (
        <CharacterImage
          imageData={character.imageData}
          shape={character.borderShape}
          size={size}
          focus={character.imageFocus}
        />
      ) : (
        <Text
          text={getCharacterInitials(character.name)}
          fontFamily={formatFontForCanvas(diagramFontFamily)}
          fontSize={size * 0.55}
          fontStyle="bold"
          fill={rgbToCss(characterInitialsColor)}
          align="center"
          verticalAlign="middle"
          width={size * 2}
          height={size * 2}
          offsetX={size}
          offsetY={size}
          listening={false}
        />
      )}
      <MembershipChips
        groups={membershipGroups}
        characterSize={size}
        borderShape={character.borderShape}
        characterX={character.position.x}
        characterY={character.position.y}
        highlightedGroupId={highlightedGroupId}
        onChipClick={onSelectGroup}
      />
      {character.name && (
        <PillLabel
          text={character.name}
          y={subtitleOffset}
          anchor="top"
          fontSize={nameFontSize}
          paddingX={CHARACTER_LABEL_PADDING_X}
          paddingY={CHARACTER_LABEL_PADDING_Y}
          strokeWidth={1.5}
          selectedStrokeWidth={2.5}
          textFill={rgbToCss(nameLabel.textColor)}
          fill={rgbToCss(nameLabel.backgroundColor)}
          unselectedStroke={rgbToCss(nameLabel.borderColor)}
          selected={selected}
          onClick={handleLabelSelect}
          onTap={handleLabelSelect}
        />
      )}
      {character.subtitle && (
        <PillLabel
          text={character.subtitle}
          y={
            subtitleOffset +
            (character.name ? namePillHeight + labelGap : 0)
          }
          anchor="top"
          fontSize={subtitleFontSize}
          paddingX={CHARACTER_LABEL_PADDING_X}
          paddingY={CHARACTER_LABEL_PADDING_Y}
          strokeWidth={1.5}
          selectedStrokeWidth={2.5}
          textFill={rgbToCss(subtitleLabel.textColor)}
          fill={rgbToCss(subtitleLabel.backgroundColor)}
          unselectedStroke={rgbToCss(subtitleLabel.borderColor)}
          selected={selected}
          onClick={handleLabelSelect}
          onTap={handleLabelSelect}
        />
      )}
      {showConnectHandle && (
        <ConnectHandle
          x={handleOffset.x}
          y={handleOffset.y}
          viewportScale={viewportScale}
          isConnectSource={isConnectSource}
          onMouseDown={onConnectHandleDown}
        />
      )}
    </Group>
  );
}
