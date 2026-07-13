import { useEffect, useRef } from "react";
import { Arrow, Circle, Group, Rect } from "react-konva";
import type Konva from "konva";
import type { RGB } from "../../models/types";
import { rgbaWithAlpha } from "../../utils/geometry";

const AURA_OUTER_PADDING = 20;

function radialColorStops(color: RGB, peakOpacity: number): (number | string)[] {
  return [
    0,
    rgbaWithAlpha(color, peakOpacity),
    0.45,
    rgbaWithAlpha(color, peakOpacity * 0.35),
    1,
    rgbaWithAlpha(color, 0),
  ];
}

interface RadialAuraCircleProps {
  innerRadius: number;
  color: RGB;
  x?: number;
  y?: number;
  peakOpacity?: number;
}

export function RadialAuraCircle({
  innerRadius,
  color,
  x = 0,
  y = 0,
  peakOpacity = 0.3,
}: RadialAuraCircleProps) {
  const outerRadius = innerRadius + AURA_OUTER_PADDING;

  return (
    <Circle
      x={x}
      y={y}
      radius={outerRadius}
      listening={false}
      fillRadialGradientStartPoint={{ x: 0, y: 0 }}
      fillRadialGradientStartRadius={innerRadius}
      fillRadialGradientEndPoint={{ x: 0, y: 0 }}
      fillRadialGradientEndRadius={outerRadius}
      fillRadialGradientColorStops={radialColorStops(color, peakOpacity)}
    />
  );
}

interface RoundedRectAuraRingProps {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  color: RGB;
  pad: number;
  opacity: number;
}

function RoundedRectAuraRing({
  x,
  y,
  width,
  height,
  cornerRadius,
  color,
  pad,
  opacity,
}: RoundedRectAuraRingProps) {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearCache();
    group.cache();
    return () => {
      group.clearCache();
    };
  }, [x, y, width, height, cornerRadius, color, pad, opacity]);

  return (
    <Group ref={groupRef} listening={false}>
      <Rect
        x={x - pad}
        y={y - pad}
        width={width + pad * 2}
        height={height + pad * 2}
        cornerRadius={cornerRadius + pad * 0.35}
        fill={rgbaWithAlpha(color, opacity)}
        listening={false}
      />
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        cornerRadius={cornerRadius}
        globalCompositeOperation="destination-out"
        fill="rgba(0,0,0,1)"
        listening={false}
      />
    </Group>
  );
}

interface RoundedRectAuraProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: RGB;
  cornerRadius?: number;
  peakOpacity?: number;
}

export function RoundedRectAura({
  x,
  y,
  width,
  height,
  color,
  cornerRadius = 12,
  peakOpacity = 0.3,
}: RoundedRectAuraProps) {
  const rings = [
    { pad: 20, opacity: peakOpacity * 0.28 },
    { pad: 14, opacity: peakOpacity * 0.42 },
    { pad: 8, opacity: peakOpacity * 0.68 },
    { pad: 4, opacity: peakOpacity * 0.95 },
  ];

  return (
    <Group listening={false}>
      {rings.map((ring) => (
        <RoundedRectAuraRing
          key={ring.pad}
          x={x}
          y={y}
          width={width}
          height={height}
          cornerRadius={cornerRadius}
          color={color}
          pad={ring.pad}
          opacity={ring.opacity}
        />
      ))}
    </Group>
  );
}

interface LineAuraProps {
  points: number[];
  color: RGB;
  dash?: number[];
  peakOpacity?: number;
}

export function LineAura({
  points,
  color,
  dash,
  peakOpacity = 0.22,
}: LineAuraProps) {
  const stroke = rgbaWithAlpha(color, peakOpacity);

  return (
    <Arrow
      points={points}
      stroke={stroke}
      fill={stroke}
      strokeWidth={14}
      dash={dash}
      pointerLength={0}
      pointerWidth={0}
      lineCap="round"
      lineJoin="round"
      listening={false}
    />
  );
}

export function shouldShowHoverAura(
  hovered: boolean,
  selected: boolean,
): boolean {
  return hovered && !selected;
}
