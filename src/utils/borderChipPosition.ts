import type { BorderShape, Point } from "../models/types";
import { MEMBERSHIP_CHIP_RADIUS } from "../models/types";

/** Project a point onto the character border at the given angle (radians). */
export function borderPointAtAngle(
  angle: number,
  size: number,
  shape: BorderShape,
): Point {
  let radius = size;
  if (shape === "square") {
    const c = Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    radius = size / (c || 1);
  } else if (shape === "pentagon" || shape === "hexagon") {
    const sides = shape === "pentagon" ? 5 : 6;
    const step = (2 * Math.PI) / sides;
    const start = -Math.PI / 2;
    let rel = angle - start;
    rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const sectorMid = start + Math.floor(rel / step) * step + step / 2;
    const alpha = angle - sectorMid;
    radius = (size * Math.cos(Math.PI / sides)) / Math.cos(alpha);
  }

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

/** Lower-right on the character border (opposite membership chip start). */
export const CHARACTER_LINK_CHIP_ANGLE = Math.PI / 4;

export function membershipChipAngleForIndex(
  index: number,
  characterSize: number,
): number {
  const startAngle = (-3 * Math.PI) / 4;
  const spacing =
    MEMBERSHIP_CHIP_RADIUS * 2 + Math.max(2, MEMBERSHIP_CHIP_RADIUS * 0.25);
  const angleStep = spacing / Math.max(characterSize, 1);
  return startAngle - index * angleStep;
}

export function membershipChipPositionOnBorder(
  index: number,
  size: number,
  shape: BorderShape,
): Point {
  return borderPointAtAngle(
    membershipChipAngleForIndex(index, size),
    size,
    shape,
  );
}
