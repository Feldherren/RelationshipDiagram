import { Group, Rect, RegularPolygon, Circle, Text } from "react-konva";
import { useState } from "react";
import type Konva from "konva";
import type { Character } from "../../models/types";
import { CHARACTER_BORDER_STROKE_WIDTH, rgbToCss } from "../../models/types";
import { getCharacterInitials } from "../../store/diagramStore";
import { CharacterImage } from "./CharacterImage";
import {
  CONNECT_HANDLE_FONT_SIZE,
  CONNECT_HANDLE_SCREEN_RADIUS,
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
import { formatFontForCanvas } from "../../utils/diagramFont";
import {
  RadialAuraCircle,
  shouldShowHoverAura,
} from "./HoverAura";

interface CharacterNodeProps {
  character: Character;
  selected: boolean;
  draggable: boolean;
  isConnectSource: boolean;
  onSelect: () => void;
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
          cornerRadius={4}
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
  onSelect,
  onDragMove,
  onDragEnd,
  onConnectHandleDown,
}: CharacterNodeProps) {
  const [hovered, setHovered] = useState(false);
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
  const handleOffset = getConnectHandleOffset(size);
  const handleRadius = CONNECT_HANDLE_SCREEN_RADIUS / viewportScale;
  const handleFontSize = CONNECT_HANDLE_FONT_SIZE / viewportScale;
  const showConnectHandle = selected || hovered || isConnectSource;
  const showAura = shouldShowHoverAura(hovered, selected);

  const handleLabelSelect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    onSelect();
  };

  return (
    <Group
      x={character.position.x}
      y={character.position.y}
      draggable={draggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragMove={(e) => {
        onDragMove({ x: e.target.x(), y: e.target.y() });
      }}
      onDragEnd={(e) => {
        onDragEnd({ x: e.target.x(), y: e.target.y() });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showAura && (
        <RadialAuraCircle
          innerRadius={size}
          color={character.borderColor}
        />
      )}
      {selected && (
        <Circle
          x={0}
          y={0}
          radius={size + 6}
          stroke="#4a90d9"
          strokeWidth={2}
          dash={[6, 4]}
          listening={false}
        />
      )}
      <ShapeOutline
        shape={character.borderShape}
        size={size}
        color={color}
        fill={character.imageData ? "transparent" : "#ffffff"}
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
          fill="#333"
          align="center"
          verticalAlign="middle"
          width={size * 2}
          height={size * 2}
          offsetX={size}
          offsetY={size}
          listening={false}
        />
      )}
      {character.name && (
        <PillLabel
          text={character.name}
          y={subtitleOffset}
          anchor="top"
          fontSize={nameFontSize}
          fontStyle="bold"
          paddingX={CHARACTER_LABEL_PADDING_X}
          paddingY={CHARACTER_LABEL_PADDING_Y}
          strokeWidth={1.5}
          selectedStrokeWidth={2.5}
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
          textFill="#5c5c5c"
          selected={selected}
          onClick={handleLabelSelect}
          onTap={handleLabelSelect}
        />
      )}
      {showConnectHandle && (
        <Group
          x={handleOffset.x}
          y={handleOffset.y}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            onConnectHandleDown(e);
          }}
          onClick={(e) => {
            e.cancelBubble = true;
          }}
          onTap={(e) => {
            e.cancelBubble = true;
          }}
        >
          <Circle
            radius={handleRadius}
            fill={isConnectSource ? "#2f6fb3" : "#4a90d9"}
            stroke="#ffffff"
            strokeWidth={2 / viewportScale}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={4 / viewportScale}
            shadowOffset={{ x: 0, y: 1 / viewportScale }}
          />
          <Text
            text="+"
            fontSize={handleFontSize}
            fontStyle="bold"
            fill="#ffffff"
            align="center"
            verticalAlign="middle"
            width={handleRadius * 2}
            height={handleRadius * 2}
            offsetX={handleRadius}
            offsetY={handleRadius}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}
