import type { Bounds, Diagram, Line, Point } from "../models/types";
import {
  getNodeCenter,
  getNodeEdgePoint,
  isPointInsideNode,
  mergeBounds,
  normalize,
  perpendicular,
} from "./geometry";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import { getPillLabelSize } from "./labelMetrics";

const LINE_ARROW_MARGIN = 12;
const LINE_LABEL_FONT_SIZE = 12;

const AUTO_BEND_STEP = 28;
const SAMPLE_SEGMENTS = 48;

export interface RoutedLine {
  points: number[];
  labelPoint: Point;
  bendHandlePoint: Point;
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

export function resolveLineBend(line: Line): number {
  if (line.bend !== undefined) return line.bend;
  return initialBendForRouteIndex(line.routeIndex);
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

export function bendDeltaFromDrag(
  fromCenter: Point,
  toCenter: Point,
  fromWorld: Point,
  toWorld: Point,
): number {
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

function quadraticTangentAt(
  p0: Point,
  p1: Point,
  p2: Point,
  t: number,
): Point {
  const mt = 1 - t;
  return normalize({
    x: 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  });
}

function sampleQuadratic(p0: Point, p1: Point, p2: Point, segments: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    points.push(quadraticPointAt(p0, p1, p2, i / segments));
  }
  return points;
}

function sampleStyledCenterPath(
  fromCenter: Point,
  control: Point,
  toCenter: Point,
  style: Line["style"],
): Point[] {
  if (style === "wavy") {
    const points: Point[] = [];
    const amplitude = 8;
    for (let i = 0; i <= SAMPLE_SEGMENTS; i++) {
      const t = i / SAMPLE_SEGMENTS;
      const base = quadraticPointAt(fromCenter, control, toCenter, t);
      const tangent = quadraticTangentAt(fromCenter, control, toCenter, t);
      const perp = perpendicular(tangent);
      const wave = Math.sin(t * Math.PI * 4) * amplitude;
      points.push({
        x: base.x + perp.x * wave,
        y: base.y + perp.y * wave,
      });
    }
    points[0] = fromCenter;
    points[points.length - 1] = toCenter;
    return points;
  }

  if (style === "jagged") {
    const points: Point[] = [fromCenter];
    const segments = 8;
    const zig = 12;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const base = quadraticPointAt(fromCenter, control, toCenter, t);
      const tangent = quadraticTangentAt(fromCenter, control, toCenter, t);
      const perp = perpendicular(tangent);
      const side = i % 2 === 0 ? 1 : -1;
      points.push({
        x: base.x + perp.x * side * zig,
        y: base.y + perp.y * side * zig,
      });
    }
    points.push(toCenter);
    return points;
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

  const insideFrom = (p: Point) =>
    isPointInsideNode(line.from.kind, line.from.id, p, diagram);
  const insideTo = (p: Point) =>
    isPointInsideNode(line.to.kind, line.to.id, p, diagram);

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
      getNodeEdgePoint(line.from.kind, line.from.id, path[path.length - 1], diagram),
      getNodeEdgePoint(line.to.kind, line.to.id, path[0], diagram),
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
  return {
    start: getNodeCenter(line.from.kind, line.from.id, diagram),
    end: getNodeCenter(line.to.kind, line.to.id, diagram),
  };
}

export function routeLine(line: Line, diagram: Diagram): RoutedLine {
  const fromCenter = getNodeCenter(line.from.kind, line.from.id, diagram);
  const toCenter = getNodeCenter(line.to.kind, line.to.id, diagram);
  const bend = resolveLineBend(line);
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
): Bounds | null {
  const routed = routeLine(line, diagram);
  let result = boundsFromPoints(routed.points, LINE_ARROW_MARGIN);

  if (line.label) {
    const pill = getPillLabelSize(
      line.label,
      LINE_LABEL_FONT_SIZE,
      "bold",
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
