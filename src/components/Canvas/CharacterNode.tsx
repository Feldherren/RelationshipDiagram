import { Group, Rect, RegularPolygon, Circle, Text } from "react-konva";
import type Konva from "konva";
import type { Character } from "../../models/types";
import { rgbToCss } from "../../models/types";
import { getCharacterInitials } from "../../store/diagramStore";
import { CharacterImage } from "./CharacterImage";
import { getConnectHandleOffset } from "../../utils/connection";
import { useDiagramStore } from "../../store/diagramStore";
import { getPillLabelHeight, PillLabel } from "./PillLabel";
import { formatFontForCanvas } from "../../utils/diagramFont";

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
    strokeWidth: 3,
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
  const size = character.size;
  const color = rgbToCss(character.borderColor);
  const subtitleOffset = size + 8;
  const nameFontSize = 13;
  const subtitleFontSize = 11;
  const namePillHeight = getPillLabelHeight(nameFontSize);
  const labelGap = 4;
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const handleOffset = getConnectHandleOffset(size);
  const handleRadius = 10 / viewportScale;
  const handleFontSize = 14 / viewportScale;

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
    >
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
          selected={selected}
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
          textFill="#5c5c5c"
          selected={selected}
        />
      )}
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
    </Group>
  );
}
