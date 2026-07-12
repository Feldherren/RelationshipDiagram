import type { Diagram, Line, Point } from "../models/types";
import {
  getNodeCenter,
  getNodeEdgePoint,
  normalize,
  perpendicular,
} from "./geometry";

const PARALLEL_SPACING = 18;

export interface RoutedLine {
  points: number[];
  labelPoint: Point;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

export function getLinePairKey(line: Line): string {
  const fromKey = `${line.from.kind}:${line.from.id}`;
  const toKey = `${line.to.kind}:${line.to.id}`;
  return pairKey(fromKey, toKey);
}

export function computeRouteOffset(
  line: Line,
  allLines: Line[],
): number {
  const key = getLinePairKey(line);
  const siblings = allLines
    .filter((l) => getLinePairKey(l) === key)
    .sort((a, b) => a.routeIndex - b.routeIndex);
  const index = siblings.findIndex((l) => l.id === line.id);
  const count = siblings.length;
  const center = (count - 1) / 2;
  return (index - center) * PARALLEL_SPACING;
}

function sampleStraight(
  start: Point,
  end: Point,
  offset: number,
): Point[] {
  const mid = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const dir = normalize({ x: end.x - start.x, y: end.y - start.y });
  const perp = perpendicular(dir);
  const shiftedMid = {
    x: mid.x + perp.x * offset,
    y: mid.y + perp.y * offset,
  };
  if (Math.abs(offset) < 0.01) return [start, end];
  return [start, shiftedMid, end];
}

function sampleWavy(start: Point, end: Point, offset: number): Point[] {
  const points: Point[] = [];
  const segments = 24;
  const dir = normalize({ x: end.x - start.x, y: end.y - start.y });
  const perp = perpendicular(dir);
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const amplitude = 8 + Math.abs(offset) * 0.15;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const base = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
    const wave = Math.sin(t * Math.PI * 4) * amplitude;
    points.push({
      x: base.x + perp.x * (offset + wave),
      y: base.y + perp.y * (offset + wave),
    });
  }
  void length;
  return points;
}

function sampleJagged(start: Point, end: Point, offset: number): Point[] {
  const points: Point[] = [start];
  const segments = 6;
  const dir = normalize({ x: end.x - start.x, y: end.y - start.y });
  const perp = perpendicular(dir);
  const zig = 12;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const base = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
    const side = i % 2 === 0 ? 1 : -1;
    points.push({
      x: base.x + perp.x * (offset + side * zig),
      y: base.y + perp.y * (offset + side * zig),
    });
  }
  points.push(end);
  return points;
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
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    }
    traveled += segLen;
  }

  return points[points.length - 1];
}

export function routeLine(line: Line, diagram: Diagram): RoutedLine {
  const fromCenter = getNodeCenter(line.from.kind, line.from.id, diagram);
  const toCenter = getNodeCenter(line.to.kind, line.to.id, diagram);
  const offset = computeRouteOffset(line, diagram.lines);

  const roughStart = getNodeEdgePoint(
    line.from.kind,
    line.from.id,
    toCenter,
    diagram,
  );
  const roughEnd = getNodeEdgePoint(
    line.to.kind,
    line.to.id,
    fromCenter,
    diagram,
  );

  let pathPoints: Point[];
  switch (line.style) {
    case "wavy":
      pathPoints = sampleWavy(roughStart, roughEnd, offset);
      break;
    case "jagged":
      pathPoints = sampleJagged(roughStart, roughEnd, offset);
      break;
    case "straight":
    case "dotted":
    default:
      pathPoints = sampleStraight(roughStart, roughEnd, offset);
      break;
  }

  const start = getNodeEdgePoint(
    line.from.kind,
    line.from.id,
    pathPoints[1] ?? toCenter,
    diagram,
  );
  const end = getNodeEdgePoint(
    line.to.kind,
    line.to.id,
    pathPoints[pathPoints.length - 2] ?? fromCenter,
    diagram,
  );
  pathPoints[0] = start;
  pathPoints[pathPoints.length - 1] = end;

  return {
    points: flattenPoints(pathPoints),
    labelPoint: midpointAlongPath(pathPoints),
  };
}
