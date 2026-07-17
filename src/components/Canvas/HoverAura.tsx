import { useEffect, useRef, useState, type RefObject } from "react";
import { Circle, Group, Line, Rect } from "react-konva";
import type Konva from "konva";
import KonvaLib from "konva";
import type { RGB } from "../../models/types";
import { rgbaWithAlpha } from "../../utils/geometry";
import { HOVER_AURA_NODE_NAME } from "../../utils/export";

const AURA_OUTER_PADDING = 20;
const LINE_AURA_OUTER_WIDTH = 14;
const LINE_AURA_INNER_WIDTH = 2;
const LINE_AURA_MAX_PAD = (LINE_AURA_OUTER_WIDTH - LINE_AURA_INNER_WIDTH) / 2;
const AURA_RING_COUNT = 14;

/** Matches `canvas-add-object-hub-pulse` in App.css */
export const SELECTION_PULSE_DURATION_MS = 1600;
const SELECTION_PULSE_EXPAND_FRACTION = 0.7;
const SELECTION_PULSE_PEAK_OPACITY = 0.45;
/** Hub uses 3.25; canvas shapes are larger so keep expansion subtler. */
const SELECTION_PULSE_MAX_SCALE = 1.65;
const SELECTION_PULSE_LINE_MAX_WIDTH = 28;
const SELECTION_PULSE_LINE_PEAK_OPACITY = 0.65;
/** Fixed outward growth for boxes — not proportional to box size. */
const SELECTION_PULSE_BOX_MAX_PAD = 28;
const SELECTION_PULSE_BOX_STROKE = 10;

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

function selectionPulseAt(timeMs: number): { opacity: number; scale: number } {
  const cycle =
    ((timeMs % SELECTION_PULSE_DURATION_MS) + SELECTION_PULSE_DURATION_MS) %
    SELECTION_PULSE_DURATION_MS;
  const t = cycle / SELECTION_PULSE_DURATION_MS;
  if (t >= SELECTION_PULSE_EXPAND_FRACTION) {
    return { opacity: 0, scale: SELECTION_PULSE_MAX_SCALE };
  }
  const phase = t / SELECTION_PULSE_EXPAND_FRACTION;
  // Approximate CSS ease-out
  const eased = 1 - Math.pow(1 - phase, 3);
  return {
    opacity: SELECTION_PULSE_PEAK_OPACITY * (1 - eased),
    scale: 1 + (SELECTION_PULSE_MAX_SCALE - 1) * eased,
  };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function useSelectionPulse(
  active: boolean,
  apply: (opacity: number, scale: number) => void,
  nodeRef: RefObject<Konva.Node | null>,
) {
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = active && !reducedMotion;
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (!shouldAnimate) {
      node.visible(false);
      return;
    }

    let cancelled = false;
    let anim: InstanceType<typeof KonvaLib.Animation> | null = null;
    let rafId = 0;

    const start = () => {
      if (cancelled) return;
      const layer = node.getLayer();
      if (!layer) {
        rafId = requestAnimationFrame(start);
        return;
      }
      node.visible(true);
      anim = new KonvaLib.Animation((frame) => {
        const { opacity, scale } = selectionPulseAt(frame?.time ?? 0);
        applyRef.current(opacity, scale);
      }, layer);
      anim.start();
    };

    start();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      anim?.stop();
      node.visible(false);
    };
  }, [shouldAnimate, nodeRef]);

  return shouldAnimate;
}

interface RadialAuraCircleProps {
  innerRadius: number;
  color: RGB;
  x?: number;
  y?: number;
  peakOpacity?: number;
  /** Extra glow distance beyond the shape edge. Defaults to 20. */
  outerPadding?: number;
}

export function RadialAuraCircle({
  innerRadius,
  color,
  x = 0,
  y = 0,
  peakOpacity = 0.3,
  outerPadding = AURA_OUTER_PADDING,
}: RadialAuraCircleProps) {
  const outerRadius = innerRadius + outerPadding;

  return (
    <Circle
      name={HOVER_AURA_NODE_NAME}
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

interface RadialSelectionPulseProps {
  innerRadius: number;
  color: RGB;
  x?: number;
  y?: number;
  active: boolean;
}

export function RadialSelectionPulse({
  innerRadius,
  color,
  x = 0,
  y = 0,
  active,
}: RadialSelectionPulseProps) {
  const circleRef = useRef<Konva.Circle>(null);
  const colorCss = rgbaWithAlpha(color, 1);

  useSelectionPulse(
    active,
    (opacity, scale) => {
      const circle = circleRef.current;
      if (!circle) return;
      circle.opacity(opacity);
      circle.scale({ x: scale, y: scale });
    },
    circleRef,
  );

  if (!active) return null;

  return (
    <Circle
      ref={circleRef}
      name={HOVER_AURA_NODE_NAME}
      x={x}
      y={y}
      radius={innerRadius}
      fill={colorCss}
      listening={false}
      perfectDrawEnabled={false}
      visible={false}
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
    <Group name={HOVER_AURA_NODE_NAME} listening={false}>
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

interface RoundedRectSelectionPulseProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: RGB;
  cornerRadius?: number;
  active: boolean;
}

export function RoundedRectSelectionPulse({
  x,
  y,
  width,
  height,
  color,
  cornerRadius = 12,
  active,
}: RoundedRectSelectionPulseProps) {
  const rectRef = useRef<Konva.Rect>(null);
  const colorCss = rgbaWithAlpha(color, 1);
  const layoutRef = useRef({ x, y, width, height, cornerRadius });
  layoutRef.current = { x, y, width, height, cornerRadius };

  useSelectionPulse(
    active,
    (opacity, scale) => {
      const rect = rectRef.current;
      if (!rect) return;
      const progress =
        (scale - 1) / (SELECTION_PULSE_MAX_SCALE - 1 || 1);
      const pad = progress * SELECTION_PULSE_BOX_MAX_PAD;
      const layout = layoutRef.current;
      rect.opacity(opacity);
      rect.x(layout.x - pad);
      rect.y(layout.y - pad);
      rect.width(layout.width + pad * 2);
      rect.height(layout.height + pad * 2);
      rect.cornerRadius(layout.cornerRadius + pad * 0.35);
    },
    rectRef,
  );

  if (!active) return null;

  return (
    <Rect
      ref={rectRef}
      name={HOVER_AURA_NODE_NAME}
      x={x}
      y={y}
      width={width}
      height={height}
      cornerRadius={cornerRadius}
      stroke={colorCss}
      strokeWidth={SELECTION_PULSE_BOX_STROKE}
      fillEnabled={false}
      listening={false}
      perfectDrawEnabled={false}
      visible={false}
    />
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
    <Group name={HOVER_AURA_NODE_NAME} listening={false}>
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

interface LineSelectionPulseProps {
  points: number[];
  color: RGB;
  dash?: number[];
  active: boolean;
}

export function LineSelectionPulse({
  points,
  color,
  dash,
  active,
}: LineSelectionPulseProps) {
  const lineRef = useRef<Konva.Line>(null);
  const colorCss = rgbaWithAlpha(color, 1);

  useSelectionPulse(
    active,
    (opacity, scale) => {
      const line = lineRef.current;
      if (!line) return;
      const t =
        (scale - 1) / (SELECTION_PULSE_MAX_SCALE - 1 || 1);
      // Remap shared hub opacity to a stronger line peak so selection
      // reads clearly against the softer hover aura.
      const opacityScale =
        SELECTION_PULSE_LINE_PEAK_OPACITY / SELECTION_PULSE_PEAK_OPACITY;
      line.opacity(opacity * opacityScale);
      line.strokeWidth(
        LINE_AURA_INNER_WIDTH +
          t * (SELECTION_PULSE_LINE_MAX_WIDTH - LINE_AURA_INNER_WIDTH),
      );
    },
    lineRef,
  );

  if (!active) return null;

  return (
    <Line
      ref={lineRef}
      name={HOVER_AURA_NODE_NAME}
      points={points}
      stroke={colorCss}
      strokeWidth={LINE_AURA_INNER_WIDTH}
      dash={dash}
      lineCap="round"
      lineJoin="round"
      listening={false}
      perfectDrawEnabled={false}
      visible={false}
    />
  );
}

export function shouldShowAura(
  hovered: boolean,
  selected: boolean,
): boolean {
  return hovered || selected;
}
