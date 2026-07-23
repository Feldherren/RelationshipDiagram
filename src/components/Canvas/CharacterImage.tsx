import { useLayoutEffect, useRef } from "react";
import { Group, Image } from "react-konva";
import type { Context } from "konva/lib/Context";
import type Konva from "konva";
import useImage from "use-image";
import type { Character } from "../../models/types";
import { CHARACTER_BORDER_CORNER_RADIUS } from "../../models/types";
import {
  getCoverImageLayout,
  resolveImageFocus,
} from "../../utils/imageLayout";

/** Matches Konva RegularPolygon rounded-corner path (Util.drawRoundedPolygonPath). */
function drawRoundedRegularPolygon(
  canvas: CanvasRenderingContext2D,
  sides: number,
  radius: number,
  cornerRadius: number,
) {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  const absRadius = Math.abs(radius);
  for (let i = 0; i < sides; i++) {
    const prev = points[(i - 1 + sides) % sides];
    const curr = points[i];
    const next = points[(i + 1) % sides];
    const vec1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const vec2 = { x: next.x - curr.x, y: next.y - curr.y };
    const len1 = Math.hypot(vec1.x, vec1.y);
    const len2 = Math.hypot(vec2.x, vec2.y);
    const maxCornerRadius = absRadius * Math.cos(Math.PI / sides);
    const currCornerRadius =
      maxCornerRadius * Math.min(1, (cornerRadius / absRadius) * 2);
    const normalVec1 = { x: vec1.x / len1, y: vec1.y / len1 };
    const normalVec2 = { x: vec2.x / len2, y: vec2.y / len2 };
    const p1 = {
      x: curr.x - normalVec1.x * currCornerRadius,
      y: curr.y - normalVec1.y * currCornerRadius,
    };
    const p2 = {
      x: curr.x + normalVec2.x * currCornerRadius,
      y: curr.y + normalVec2.y * currCornerRadius,
    };
    if (i === 0) canvas.moveTo(p1.x, p1.y);
    else canvas.lineTo(p1.x, p1.y);
    canvas.arcTo(curr.x, curr.y, p2.x, p2.y, currCornerRadius);
  }
  canvas.closePath();
}

function clipFunc(shape: Character["borderShape"], size: number) {
  return (ctx: Context) => {
    const canvas = ctx._context;
    canvas.beginPath();
    switch (shape) {
      case "square":
        canvas.rect(-size, -size, size * 2, size * 2);
        break;
      case "pentagon":
        drawRoundedRegularPolygon(
          canvas,
          5,
          size,
          CHARACTER_BORDER_CORNER_RADIUS,
        );
        break;
      case "hexagon":
        drawRoundedRegularPolygon(
          canvas,
          6,
          size,
          CHARACTER_BORDER_CORNER_RADIUS,
        );
        break;
      default:
        canvas.arc(0, 0, size, 0, Math.PI * 2);
    }
  };
}

export function CharacterImage({
  imageData,
  shape,
  size,
  focus,
}: {
  imageData: string;
  shape: Character["borderShape"];
  size: number;
  focus: Character["imageFocus"];
}) {
  const [image] = useImage(imageData, "anonymous");
  const clipGroupRef = useRef<Konva.Group>(null);
  const imageRef = useRef<Konva.Image>(null);
  const focusPoint = resolveImageFocus(focus);
  const layout = image
    ? getCoverImageLayout(image, size, focusPoint)
    : null;

  useLayoutEffect(() => {
    const node = imageRef.current;
    const group = clipGroupRef.current;
    if (!node || !group || !layout) return;
    node.x(layout.x);
    node.y(layout.y);
    node.width(layout.width);
    node.height(layout.height);
    group.clearCache();
    node.getLayer()?.batchDraw();
  }, [layout?.x, layout?.y, layout?.width, layout?.height, focusPoint.x, focusPoint.y]);

  if (!image || !layout) return null;

  return (
    <Group ref={clipGroupRef} clipFunc={clipFunc(shape, size)}>
      <Image
        ref={imageRef}
        image={image}
        x={layout.x}
        y={layout.y}
        width={layout.width}
        height={layout.height}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}
