import { useEffect, useRef } from "react";
import { Circle, Group, Line, Rect } from "react-konva";
import type Konva from "konva";
import type { RGB } from "../../models/types";
import { rgbaWithAlpha } from "../../utils/geometry";

const AURA_OUTER_PADDING = 20;
const LINE_AURA_OUTER_WIDTH = 14;
const LINE_AURA_INNER_WIDTH = 2;
const LINE_AURA_MAX_PAD = (LINE_AURA_OUTER_WIDTH - LINE_AURA_INNER_WIDTH) / 2;
const AURA_RING_COUNT = 14;

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

function auraRingBandOpacity(t: number, peakOpacity: number): number {
  const eased = Math.pow(t, 0.9);
  return peakOpacity * (0.5 - eased * 0.36);
}

function buildAuraRings(
  maxPad: number,
  peakOpacity: number,
  count = AURA_RING_COUNT,
): { pad: number; opacity: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const step = index + 1;
    const t = step / count;
    return {
      pad: maxPad * t,
      opacity: auraRingBandOpacity(t, peakOpacity),
    };
  }).reverse();
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
  peakOpacity = 0.24,
}: RoundedRectAuraProps) {
  const rings = buildAuraRings(AURA_OUTER_PADDING, peakOpacity);

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

interface LineAuraRingProps {
  points: number[];
  color: RGB;
  pad: number;
  opacity: number;
  innerWidth: number;
  dash?: number[];
}

function LineAuraRing({
  points,
  color,
  pad,
  opacity,
  innerWidth,
  dash,
}: LineAuraRingProps) {
  const groupRef = useRef<Konva.Group>(null);
  const outerWidth = innerWidth + pad * 2;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearCache();
    group.cache();
    return () => {
      group.clearCache();
    };
  }, [points, color, pad, opacity, innerWidth, dash]);

  return (
    <Group ref={groupRef} listening={false}>
      <Line
        points={points}
        stroke={rgbaWithAlpha(color, opacity)}
        strokeWidth={outerWidth}
        dash={dash}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
      <Line
        points={points}
        stroke="rgba(0,0,0,1)"
        strokeWidth={innerWidth}
        dash={dash}
        globalCompositeOperation="destination-out"
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
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
  peakOpacity = 0.2,
}: LineAuraProps) {
  const rings = buildAuraRings(LINE_AURA_MAX_PAD, peakOpacity);

  return (
    <Group listening={false}>
      {rings.map((ring) => (
        <LineAuraRing
          key={ring.pad}
          points={points}
          color={color}
          pad={ring.pad}
          opacity={ring.opacity}
          innerWidth={LINE_AURA_INNER_WIDTH}
          dash={dash}
        />
      ))}
    </Group>
  );
}

export function shouldShowAura(
  hovered: boolean,
  selected: boolean,
): boolean {
  return hovered || selected;
}
