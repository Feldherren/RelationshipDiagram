import type { Bounds, Diagram, Line, Point } from "../models/types";
import {
  getNodeCenter,
  getNodeEdgePoint,
  getNodeRadius,
  isPointInsideNode,
  mergeBounds,
  normalize,
  perpendicular,
} from "./geometry";
import { getLineDisplayLabel, resolveLineEndpoint, shouldRenderLine } from "./lineEndpoints";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  getPillLabelSize,
  labelFontSizesFromAppearance,
} from "./labelMetrics";

const LINE_ARROW_MARGIN = 14;

const AUTO_BEND_STEP = 28;
const SAMPLE_SEGMENTS = 48;
/** Minimum loop reach beyond the node rim (bend ≈ 0). */
const SELF_LOOP_BASE_OUTSET = 36;

// Constant pixel period for wavy/jagged styles so the pattern density stays
// fixed regardless of line length (longer lines add more waves/zags rather than
// stretching a fixed count).
const WAVE_LENGTH = 40;
const WAVE_AMPLITUDE = 8;
const WAVE_SAMPLE_SPACING = 4;
const JAG_PERIOD = 24;
const JAG_ZIG = 12;

export interface RoutedLine {
  points: number[];
  labelPoint: Point;
  bendHandlePoint: Point;
}

export function isSelfConnection(line: Pick<Line, "from" | "to">): boolean {
  return line.from.kind === line.to.kind && line.from.id === line.to.id;
}

export function getDirectedPairKey(line: Line): string {
  return `${line.from.kind}:${line.from.id}->${line.to.kind}:${line.to.id}`;
}

export function initialBendForRouteIndex(routeIndex: number): number {
  if (routeIndex <= 0) return 0;
  const side = routeIndex % 2 === 1 ? 1 : -1;
  const magnitude = Math.ceil(routeIndex / 2) * AUTO_BEND_STEP;
  return side * magnitude;
}

/** Default signed bend for a new self-loop (positive size; side comes from routeIndex). */
export function initialSelfLoopBend(routeIndex: number): number {
  return (
    SELF_LOOP_BASE_OUTSET + Math.floor(routeIndex / 2) * AUTO_BEND_STEP
  );
}

export function resolveLineBend(line: Line): number {
  if (line.bend !== undefined) return line.bend;
  if (isSelfConnection(line)) return initialSelfLoopBend(line.routeIndex);
  return initialBendForRouteIndex(line.routeIndex);
}

/** Minimum self-loop bend so drag never flips geometry through zero. */
export const MIN_SELF_LOOP_BEND = 8;

/**
 * Attachment and apex angles for a self-loop (canvas: 0 = east, −π/2 = north).
 * Side/rotation come from routeIndex only — bend is size, never mirroring.
 */
export function getSelfLoopAngles(routeIndex: number): {
  exitAngle: number;
  enterAngle: number;
  midAngle: number;
} {
  const side = routeIndex % 2 === 0 ? 1 : -1;
  const rotation = Math.floor(routeIndex / 2) * (Math.PI / 2);
  // Default: leave at 270° (top), clockwise to 0° (right).
  const exitAngle = -Math.PI / 2 + rotation;
  const enterAngle = exitAngle + side * (Math.PI / 2);
  const midAngle = exitAngle + side * (Math.PI / 4);
  return { exitAngle, enterAngle, midAngle };
}

export function getSelfLoopMidAngle(routeIndex: number): number {
  return getSelfLoopAngles(routeIndex).midAngle;
}

export function getSelfLoopDirection(routeIndex: number): Point {
  const angle = getSelfLoopMidAngle(routeIndex);
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function getControlPoint(
  fromCenter: Point,
  toCenter: Point,
  bend: number,
): Point {
  const mid = {
    x: (fromCenter.x + toCenter.x) / 2,
    y: (fromCenter.y + toCenter.y) / 2,
  };
  if (Math.abs(bend) < 0.01) return mid;
  const dir = normalize({
    x: toCenter.x - fromCenter.x,
    y: toCenter.y - fromCenter.y,
  });
  const perp = perpendicular(dir);
  return { x: mid.x + perp.x * bend, y: mid.y + perp.y * bend };
}

/**
 * Loop-circle center for a 3/4 self-loop with radial end meetings:
 * intersection of the outline tangents at the exit and enter points.
 */
function selfLoopCircleCenter(
  nodeCenter: Point,
  exit: Point,
  enter: Point,
): Point | null {
  const exitDir = normalize({
    x: exit.x - nodeCenter.x,
    y: exit.y - nodeCenter.y,
  });
  const enterDir = normalize({
    x: enter.x - nodeCenter.x,
    y: enter.y - nodeCenter.y,
  });
  const exitTan = perpendicular(exitDir);
  const enterTan = perpendicular(enterDir);
  const det = exitTan.x * enterTan.y - exitTan.y * enterTan.x;
  if (Math.abs(det) < 1e-6) return null;
  const dx = enter.x - exit.x;
  const dy = enter.y - exit.y;
  const a = (dx * enterTan.y - dy * enterTan.x) / det;
  return {
    x: exit.x + a * exitTan.x,
    y: exit.y + a * exitTan.y,
  };
}

function majorArcSweep(startAng: number, endAng: number): number {
  let sweep = (endAng - startAng + Math.PI * 2) % (Math.PI * 2);
  // Prefer the long way (~3/4 circle) between attachment points.
  if (sweep < Math.PI) sweep -= Math.PI * 2;
  return sweep;
}

export function getSelfLoopApex(
  center: Point,
  nodeRadius: number,
  bend: number,
  routeIndex: number,
): Point {
  const { exitAngle, enterAngle } = getSelfLoopAngles(routeIndex);
  const exitDir = { x: Math.cos(exitAngle), y: Math.sin(exitAngle) };
  const enterDir = { x: Math.cos(enterAngle), y: Math.sin(enterAngle) };
  const exit = {
    x: center.x + exitDir.x * nodeRadius,
    y: center.y + exitDir.y * nodeRadius,
  };
  const enter = {
    x: center.x + enterDir.x * nodeRadius,
    y: center.y + enterDir.y * nodeRadius,
  };
  const path = sampleSelfLoopPath(center, exit, enter, bend, "straight");
  if (path.length === 0) {
    const mid = getSelfLoopDirection(routeIndex);
    const dist = nodeRadius + Math.abs(bend);
    return { x: center.x + mid.x * dist, y: center.y + mid.y * dist };
  }
  return path[Math.floor(path.length / 2)];
}

export function bendDeltaFromDrag(
  fromCenter: Point,
  toCenter: Point,
  fromWorld: Point,
  toWorld: Point,
  options?: { selfLoop?: boolean; bend?: number; routeIndex?: number },
): number {
  if (
    options?.selfLoop ||
    (Math.abs(fromCenter.x - toCenter.x) < 0.01 &&
      Math.abs(fromCenter.y - toCenter.y) < 0.01)
  ) {
    const routeIndex = options?.routeIndex ?? 0;
    const dir = getSelfLoopDirection(routeIndex);
    return (
      (toWorld.x - fromWorld.x) * dir.x + (toWorld.y - fromWorld.y) * dir.y
    );
  }

  const dir = normalize({
    x: toCenter.x - fromCenter.x,
    y: toCenter.y - fromCenter.y,
  });
  const perp = perpendicular(dir);
  return (
    (toWorld.x - fromWorld.x) * perp.x + (toWorld.y - fromWorld.y) * perp.y
  );
}

function quadraticPointAt(
  p0: Point,
  p1: Point,
  p2: Point,
  t: number,
): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function sampleQuadratic(p0: Point, p1: Point, p2: Point, segments: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    points.push(quadraticPointAt(p0, p1, p2, i / segments));
  }
  return points;
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y,
    );
  }
  return total;
}

interface PathSample {
  point: Point;
  tangent: Point;
  distance: number;
}

/**
 * Walk a polyline once and emit evenly-spaced samples along its arc length.
 * The number of samples derives from the true length, so density is constant
 * regardless of how long the path is. Endpoints are always included exactly.
 */
function sampleAlongPolyline(base: Point[], spacing: number): PathSample[] {
  if (base.length < 2) {
    return base.map((p) => ({ point: p, tangent: { x: 1, y: 0 }, distance: 0 }));
  }
  const total = polylineLength(base);
  if (total === 0) {
    return [{ point: base[0], tangent: { x: 1, y: 0 }, distance: 0 }];
  }

  const count = Math.max(1, Math.round(total / spacing));
  const step = total / count;

  const samples: PathSample[] = [];
  let segIdx = 0;
  let segStartDist = 0;
  let segLen = Math.hypot(base[1].x - base[0].x, base[1].y - base[0].y);

  for (let s = 0; s <= count; s++) {
    const target = s * step;
    while (segIdx < base.length - 2 && segStartDist + segLen < target) {
      segStartDist += segLen;
      segIdx += 1;
      segLen = Math.hypot(
        base[segIdx + 1].x - base[segIdx].x,
        base[segIdx + 1].y - base[segIdx].y,
      );
    }
    const a = base[segIdx];
    const b = base[segIdx + 1];
    const localT = segLen > 0 ? (target - segStartDist) / segLen : 0;
    samples.push({
      point: interpolate(a, b, Math.min(1, Math.max(0, localT))),
      tangent: normalize({ x: b.x - a.x, y: b.y - a.y }),
      distance: target,
    });
  }
  return samples;
}

function applyWavyToPolyline(base: Point[]): Point[] {
  if (base.length < 2) return base;
  const samples = sampleAlongPolyline(base, WAVE_SAMPLE_SPACING);
  const last = samples.length - 1;
  return samples.map((sample, i) => {
    if (i === 0 || i === last) return sample.point;
    const perp = perpendicular(sample.tangent);
    const wave =
      Math.sin((2 * Math.PI * sample.distance) / WAVE_LENGTH) * WAVE_AMPLITUDE;
    return {
      x: sample.point.x + perp.x * wave,
      y: sample.point.y + perp.y * wave,
    };
  });
}

function applyJaggedToPolyline(base: Point[]): Point[] {
  if (base.length < 2) return base;
  const samples = sampleAlongPolyline(base, JAG_PERIOD);
  if (samples.length < 2) return base;
  const last = samples.length - 1;
  return samples.map((sample, i) => {
    if (i === 0 || i === last) return sample.point;
    const perp = perpendicular(sample.tangent);
    const side = i % 2 === 0 ? 1 : -1;
    return {
      x: sample.point.x + perp.x * side * JAG_ZIG,
      y: sample.point.y + perp.y * side * JAG_ZIG,
    };
  });
}

function applyPathStyle(base: Point[], style: Line["style"]): Point[] {
  if (base.length < 2) return base;
  if (style === "wavy") return applyWavyToPolyline(base);
  if (style === "jagged") return applyJaggedToPolyline(base);
  return base;
}

/**
 * Self-loop: leave at 270° (top), sweep a ~3/4 circle clockwise to 0° (right).
 * Ends stay on the rim; bend moves the circle center along the chord bisector
 * so the arc stays a true circle through both endpoints (no radial stubs/kinks).
 */
function sampleSelfLoopPath(
  center: Point,
  exit: Point,
  enter: Point,
  bend: number,
  style: Line["style"],
): Point[] {
  const exitDir = normalize({ x: exit.x - center.x, y: exit.y - center.y });
  const enterDir = normalize({ x: enter.x - center.x, y: enter.y - center.y });
  const C0 = selfLoopCircleCenter(center, exit, enter);

  if (!C0) {
    const mid = normalize({
      x: exitDir.x + enterDir.x,
      y: exitDir.y + enterDir.y,
    });
    const dist =
      Math.hypot(exit.x - center.x, exit.y - center.y) +
      Math.max(SELF_LOOP_BASE_OUTSET, Math.abs(bend));
    const apex = {
      x: center.x + mid.x * dist,
      y: center.y + mid.y * dist,
    };
    const points: Point[] = [];
    for (let i = 0; i <= SAMPLE_SEGMENTS; i++) {
      points.push(quadraticPointAt(exit, apex, enter, i / SAMPLE_SEGMENTS));
    }
    return applyPathStyle(points, style);
  }

  const mid = {
    x: (exit.x + enter.x) / 2,
    y: (exit.y + enter.y) / 2,
  };
  let bis = normalize(
    perpendicular({ x: enter.x - exit.x, y: enter.y - exit.y }),
  );
  // Point the bisector outward (away from the node center).
  if ((mid.x - center.x) * bis.x + (mid.y - center.y) * bis.y < 0) {
    bis = { x: -bis.x, y: -bis.y };
  }
  const t0 = (C0.x - mid.x) * bis.x + (C0.y - mid.y) * bis.y;
  // Default bend (≈ BASE) sits at the radial-tangent circle; more bend grows out.
  const grow = Math.max(0, Math.abs(bend) - SELF_LOOP_BASE_OUTSET);
  const C = {
    x: mid.x + bis.x * (t0 + grow),
    y: mid.y + bis.y * (t0 + grow),
  };
  const R = Math.hypot(C.x - exit.x, C.y - exit.y) || 1;

  const startAng = Math.atan2(exit.y - C.y, exit.x - C.x);
  const endAng = Math.atan2(enter.y - C.y, enter.x - C.x);
  const sweep = majorArcSweep(startAng, endAng);

  const points: Point[] = [];
  for (let i = 0; i <= SAMPLE_SEGMENTS; i++) {
    const t = i / SAMPLE_SEGMENTS;
    const ang = startAng + sweep * t;
    points.push({
      x: C.x + Math.cos(ang) * R,
      y: C.y + Math.sin(ang) * R,
    });
  }
  // Exact rim endpoints (covers float drift).
  points[0] = exit;
  points[points.length - 1] = enter;

  return applyPathStyle(points, style);
}

/** Rough arc length of a quadratic bezier via its control polygon. */
function estimateQuadraticLength(p0: Point, p1: Point, p2: Point): number {
  const chord = Math.hypot(p2.x - p0.x, p2.y - p0.y);
  const controlNet =
    Math.hypot(p1.x - p0.x, p1.y - p0.y) +
    Math.hypot(p2.x - p1.x, p2.y - p1.y);
  return (chord + controlNet) / 2;
}

function sampleStyledCenterPath(
  fromCenter: Point,
  control: Point,
  toCenter: Point,
  style: Line["style"],
): Point[] {
  if (style === "wavy" || style === "jagged") {
    // Densely sample the base curve so the arc-length walk in the style
    // applicators stays accurate, then perturb at a fixed pixel period.
    const roughLength = estimateQuadraticLength(fromCenter, control, toCenter);
    const segments = Math.max(SAMPLE_SEGMENTS, Math.ceil(roughLength / 6));
    const base = sampleQuadratic(fromCenter, control, toCenter, segments);
    base[0] = fromCenter;
    base[base.length - 1] = toCenter;
    return style === "wavy"
      ? applyWavyToPolyline(base)
      : applyJaggedToPolyline(base);
  }

  // straight / dotted: pure quadratic (or a line when bend ≈ 0)
  const bendAmount = Math.hypot(
    control.x - (fromCenter.x + toCenter.x) / 2,
    control.y - (fromCenter.y + toCenter.y) / 2,
  );
  if (bendAmount < 0.5) {
    return [fromCenter, toCenter];
  }
  return sampleQuadratic(fromCenter, control, toCenter, SAMPLE_SEGMENTS);
}

function interpolate(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function findBoundaryCrossing(
  inside: Point,
  outside: Point,
  isInside: (p: Point) => boolean,
): Point {
  let a = inside;
  let b = outside;
  for (let i = 0; i < 16; i++) {
    const mid = interpolate(a, b, 0.5);
    if (isInside(mid)) a = mid;
    else b = mid;
  }
  return b;
}

function trimPathToNodeOutlines(
  path: Point[],
  line: Line,
  diagram: Diagram,
): Point[] {
  if (path.length < 2) return path;

  const from = resolveLineEndpoint(line.from, diagram);
  const to = resolveLineEndpoint(line.to, diagram);

  const insideFrom = (p: Point) =>
    isPointInsideNode(from.anchorKind, from.anchorId, p, diagram);
  const insideTo = (p: Point) =>
    isPointInsideNode(to.anchorKind, to.anchorId, p, diagram);

  let exitIndex = -1;
  for (let i = 0; i < path.length - 1; i++) {
    if (insideFrom(path[i]) && !insideFrom(path[i + 1])) {
      exitIndex = i;
      break;
    }
  }

  let enterIndex = -1;
  for (let i = path.length - 1; i > 0; i--) {
    if (insideTo(path[i]) && !insideTo(path[i - 1])) {
      enterIndex = i;
      break;
    }
  }

  if (exitIndex < 0 || enterIndex < 0 || exitIndex >= enterIndex) {
    return [
      getNodeEdgePoint(
        from.anchorKind,
        from.anchorId,
        path[path.length - 1],
        diagram,
      ),
      getNodeEdgePoint(to.anchorKind, to.anchorId, path[0], diagram),
    ];
  }

  const start = findBoundaryCrossing(
    path[exitIndex],
    path[exitIndex + 1],
    insideFrom,
  );
  const end = findBoundaryCrossing(
    path[enterIndex],
    path[enterIndex - 1],
    insideTo,
  );

  const middle = path.slice(exitIndex + 1, enterIndex);
  return [start, ...middle, end];
}

function flattenPoints(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

function midpointAlongPath(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  let total = 0;
  const segmentLengths: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y,
    );
    segmentLengths.push(len);
    total += len;
  }

  if (total === 0) return points[0];

  const half = total / 2;
  let traveled = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (traveled + segLen >= half) {
      const t = (half - traveled) / segLen;
      return interpolate(points[i], points[i + 1], t);
    }
    traveled += segLen;
  }

  return points[points.length - 1];
}

/** Centers used as the true curve endpoints (for bend dragging). */
export function getLineAnchors(
  line: Line,
  diagram: Diagram,
): { start: Point; end: Point } {
  const from = resolveLineEndpoint(line.from, diagram);
  const to = resolveLineEndpoint(line.to, diagram);
  return {
    start: getNodeCenter(from.anchorKind, from.anchorId, diagram),
    end: getNodeCenter(to.anchorKind, to.anchorId, diagram),
  };
}

export function routeLine(line: Line, diagram: Diagram): RoutedLine {
  const from = resolveLineEndpoint(line.from, diagram);
  const to = resolveLineEndpoint(line.to, diagram);
  const fromCenter = getNodeCenter(from.anchorKind, from.anchorId, diagram);
  const toCenter = getNodeCenter(to.anchorKind, to.anchorId, diagram);
  const bend = resolveLineBend(line);

  if (
    isSelfConnection(line) ||
    (from.anchorKind === to.anchorKind && from.anchorId === to.anchorId)
  ) {
    const nodeRadius = getNodeRadius(from.anchorKind, from.anchorId, diagram);
    const { exitAngle, enterAngle } = getSelfLoopAngles(line.routeIndex);
    const exitToward = {
      x: fromCenter.x + Math.cos(exitAngle) * (nodeRadius + 100),
      y: fromCenter.y + Math.sin(exitAngle) * (nodeRadius + 100),
    };
    const enterToward = {
      x: fromCenter.x + Math.cos(enterAngle) * (nodeRadius + 100),
      y: fromCenter.y + Math.sin(enterAngle) * (nodeRadius + 100),
    };
    const exit = getNodeEdgePoint(
      from.anchorKind,
      from.anchorId,
      exitToward,
      diagram,
    );
    const enter = getNodeEdgePoint(
      to.anchorKind,
      to.anchorId,
      enterToward,
      diagram,
    );
    const path = sampleSelfLoopPath(
      fromCenter,
      exit,
      enter,
      bend,
      line.style,
    );
    const apex = getSelfLoopApex(fromCenter, nodeRadius, bend, line.routeIndex);
    return {
      points: flattenPoints(path),
      labelPoint: midpointAlongPath(path),
      bendHandlePoint: apex,
    };
  }

  const control = getControlPoint(fromCenter, toCenter, bend);
  const fullPath = sampleStyledCenterPath(
    fromCenter,
    control,
    toCenter,
    line.style,
  );
  const visiblePath = trimPathToNodeOutlines(fullPath, line, diagram);

  return {
    points: flattenPoints(visiblePath),
    labelPoint: midpointAlongPath(visiblePath),
    bendHandlePoint: control,
  };
}

function boundsFromPoints(points: number[], margin = 0): Bounds | null {
  if (points.length < 2) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
}

export function getLineBounds(
  line: Line,
  diagram: Diagram,
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
  lineLabelFontSize?: number,
): Bounds | null {
  if (!shouldRenderLine(line, diagram)) return null;

  const routed = routeLine(line, diagram);
  let result = boundsFromPoints(routed.points, LINE_ARROW_MARGIN);

  const displayLabel = getLineDisplayLabel(line, diagram);
  if (displayLabel) {
    const fontSize =
      lineLabelFontSize ??
      labelFontSizesFromAppearance(diagram.appearance).line;
    const pill = getPillLabelSize(
      displayLabel,
      fontSize,
      "normal",
      fontFamily,
    );
    const margin = LINE_ARROW_MARGIN;
    const labelBounds: Bounds = {
      x: routed.labelPoint.x - pill.width / 2 - margin,
      y: routed.labelPoint.y - pill.height / 2 - margin,
      width: pill.width + margin * 2,
      height: pill.height + margin * 2,
    };
    result = result ? mergeBounds(result, labelBounds) : labelBounds;
  }

  return result;
}

export function nextRouteIndex(
  from: Line["from"],
  to: Line["to"],
  lines: Line[],
): number {
  const key = `${from.kind}:${from.id}->${to.kind}:${to.id}`;
  const existing = lines.filter((l) => getDirectedPairKey(l) === key);
  if (existing.length === 0) return 0;
  return Math.max(...existing.map((l) => l.routeIndex)) + 1;
}
