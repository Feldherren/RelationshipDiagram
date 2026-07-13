import { Arrow, Circle, Rect } from "react-konva";
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

interface RadialAuraRectProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: RGB;
  cornerRadius?: number;
  peakOpacity?: number;
}

export function RadialAuraRect({
  x,
  y,
  width,
  height,
  color,
  cornerRadius = 12,
  peakOpacity = 0.24,
}: RadialAuraRectProps) {
  const pad = AURA_OUTER_PADDING;
  const auraWidth = width + pad * 2;
  const auraHeight = height + pad * 2;
  const centerX = auraWidth / 2;
  const centerY = auraHeight / 2;
  const innerRadius = Math.min(width, height) / 2;
  const outerRadius =
    Math.max(width, height) / 2 + AURA_OUTER_PADDING;

  return (
    <Rect
      x={x - pad}
      y={y - pad}
      width={auraWidth}
      height={auraHeight}
      cornerRadius={cornerRadius + pad * 0.5}
      listening={false}
      fillRadialGradientStartPoint={{ x: centerX, y: centerY }}
      fillRadialGradientStartRadius={innerRadius}
      fillRadialGradientEndPoint={{ x: centerX, y: centerY }}
      fillRadialGradientEndRadius={outerRadius}
      fillRadialGradientColorStops={radialColorStops(color, peakOpacity)}
    />
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
