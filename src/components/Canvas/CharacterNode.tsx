import { Group, Rect, RegularPolygon, Circle, Text } from "react-konva";
import type Konva from "konva";
import type { Character } from "../../models/types";
import { rgbToCss } from "../../models/types";
import { getCharacterInitials } from "../../store/diagramStore";
import { CharacterImage } from "./CharacterImage";
import { getConnectHandleOffset } from "../../utils/connection";
import { useDiagramStore } from "../../store/diagramStore";

interface CharacterNodeProps {
  character: Character;
  selected: boolean;
  draggable: boolean;
  isConnectSource: boolean;
  onSelect: () => void;
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
  onDragEnd,
  onConnectHandleDown,
}: CharacterNodeProps) {
  const size = character.size;
  const color = rgbToCss(character.borderColor);
  const subtitleOffset = size + 8;
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
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
        <Text
          text={character.name}
          y={subtitleOffset}
          fontSize={13}
          fontStyle="bold"
          fill="#222"
          align="center"
          width={size * 3}
          offsetX={(size * 3) / 2}
          listening={false}
        />
      )}
      {character.subtitle && (
        <Text
          text={character.subtitle}
          y={subtitleOffset + (character.name ? 16 : 0)}
          fontSize={11}
          fill="#666"
          align="center"
          width={size * 3}
          offsetX={(size * 3) / 2}
          listening={false}
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
