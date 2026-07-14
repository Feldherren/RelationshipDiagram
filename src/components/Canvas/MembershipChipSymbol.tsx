import { Circle, Group, Line, Path, Rect, RegularPolygon, Star } from "react-konva";
import type { MembershipSymbol } from "../../models/types";
import { rgbToCss, type RGB } from "../../models/types";
import {
  BREEZE_LAYOUT,
  BREEZE_PATH,
  DROPLET_LAYOUT,
  DROPLET_PATH,
  FLAME_LAYOUT,
  FLAME_PATH,
  HEART_PATH,
  MOON_PATH,
  MUSIC_NOTE_LAYOUT,
  MUSIC_NOTE_PATH,
  ROCK_LAYOUT,
  ROCK_PATH,
  SWORD_LAYOUT,
  SWORD_PATH,
} from "../../utils/membershipSymbolGeometry";

interface MembershipChipSymbolProps {
  symbol: MembershipSymbol;
  color: RGB;
  /** Outer chip radius; glyph scales inside this. */
  chipRadius: number;
}

function ScaledPath({
  data,
  fill,
  glyph,
  stroke,
  strokeWidth,
}: {
  data: string;
  fill?: string;
  glyph: number;
  stroke?: string;
  strokeWidth?: number;
}) {
  return (
    <Path
      data={data}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
      scaleX={glyph}
      scaleY={glyph}
      listening={false}
    />
  );
}

export function MembershipChipSymbol({
  symbol,
  color,
  chipRadius,
}: MembershipChipSymbolProps) {
  if (symbol === "none") return null;

  const fill = rgbToCss(color);
  const glyph = chipRadius * 0.55;
  const stroke = Math.max(1.5, chipRadius * 0.14);

  switch (symbol) {
    case "star":
      return (
        <Star
          numPoints={5}
          innerRadius={glyph * 0.4}
          outerRadius={glyph}
          fill={fill}
          listening={false}
        />
      );
    case "moon":
      return <ScaledPath data={MOON_PATH} fill={fill} glyph={glyph} />;
    case "heart":
      return <ScaledPath data={HEART_PATH} fill={fill} glyph={glyph} />;
    case "diamond":
      return (
        <RegularPolygon
          sides={4}
          radius={glyph}
          fill={fill}
          listening={false}
        />
      );
    case "circle":
      return <Circle radius={glyph * 0.75} fill={fill} listening={false} />;
    case "ring":
      return (
        <Circle
          radius={glyph * 0.72}
          stroke={fill}
          strokeWidth={stroke}
          listening={false}
        />
      );
    case "square":
      return (
        <Rect
          x={-glyph * 0.65}
          y={-glyph * 0.65}
          width={glyph * 1.3}
          height={glyph * 1.3}
          fill={fill}
          cornerRadius={glyph * 0.12}
          listening={false}
        />
      );
    case "triangle":
      return (
        <RegularPolygon
          sides={3}
          radius={glyph}
          fill={fill}
          listening={false}
        />
      );
    case "hexagon":
      return (
        <RegularPolygon
          sides={6}
          radius={glyph * 0.95}
          fill={fill}
          listening={false}
        />
      );
    case "plus":
      return (
        <Group listening={false}>
          <Line
            points={[-glyph, 0, glyph, 0]}
            stroke={fill}
            strokeWidth={stroke}
            lineCap="round"
          />
          <Line
            points={[0, -glyph, 0, glyph]}
            stroke={fill}
            strokeWidth={stroke}
            lineCap="round"
          />
        </Group>
      );
    case "cross":
      return (
        <Group listening={false}>
          <Line
            points={[-glyph * 0.75, -glyph * 0.75, glyph * 0.75, glyph * 0.75]}
            stroke={fill}
            strokeWidth={stroke}
            lineCap="round"
          />
          <Line
            points={[-glyph * 0.75, glyph * 0.75, glyph * 0.75, -glyph * 0.75]}
            stroke={fill}
            strokeWidth={stroke}
            lineCap="round"
          />
        </Group>
      );
    case "slash":
      return (
        <Line
          points={[-glyph * 0.7, glyph * 0.7, glyph * 0.7, -glyph * 0.7]}
          stroke={fill}
          strokeWidth={stroke}
          lineCap="round"
          listening={false}
        />
      );
    case "music": {
      const scale = glyph * MUSIC_NOTE_LAYOUT.unitScale;
      return (
        <Path
          data={MUSIC_NOTE_PATH}
          fill={fill}
          scaleX={scale}
          scaleY={scale}
          offsetX={MUSIC_NOTE_LAYOUT.centerX}
          offsetY={MUSIC_NOTE_LAYOUT.centerY}
          listening={false}
        />
      );
    }
    case "sword": {
      const scale = glyph * SWORD_LAYOUT.unitScale;
      return (
        <Path
          data={SWORD_PATH}
          fill={fill}
          fillRule="evenodd"
          scaleX={scale}
          scaleY={scale}
          offsetX={SWORD_LAYOUT.centerX}
          offsetY={SWORD_LAYOUT.centerY}
          listening={false}
        />
      );
    }
    case "flame": {
      const scale = glyph * FLAME_LAYOUT.unitScale;
      return (
        <Path
          data={FLAME_PATH}
          fill={fill}
          scaleX={scale}
          scaleY={scale}
          offsetX={FLAME_LAYOUT.centerX}
          offsetY={FLAME_LAYOUT.centerY}
          listening={false}
        />
      );
    }
    case "droplet": {
      const scale = glyph * DROPLET_LAYOUT.unitScale;
      return (
        <Path
          data={DROPLET_PATH}
          fill={fill}
          fillRule="evenodd"
          scaleX={scale}
          scaleY={scale}
          offsetX={DROPLET_LAYOUT.centerX}
          offsetY={DROPLET_LAYOUT.centerY}
          listening={false}
        />
      );
    }
    case "breeze": {
      const scale = glyph * BREEZE_LAYOUT.unitScale;
      return (
        <Path
          data={BREEZE_PATH}
          fill={fill}
          fillRule="evenodd"
          scaleX={scale}
          scaleY={scale}
          offsetX={BREEZE_LAYOUT.centerX}
          offsetY={BREEZE_LAYOUT.centerY}
          listening={false}
        />
      );
    }
    case "rock": {
      const scale = glyph * ROCK_LAYOUT.unitScale;
      return (
        <Path
          data={ROCK_PATH}
          fill={fill}
          scaleX={scale}
          scaleY={scale}
          offsetX={ROCK_LAYOUT.centerX}
          offsetY={ROCK_LAYOUT.centerY}
          listening={false}
        />
      );
    }
    default:
      return null;
  }
}
