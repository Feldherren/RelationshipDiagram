import { useLayoutEffect, useRef } from "react";
import { Group, Image } from "react-konva";
import type { Context } from "konva/lib/Context";
import type Konva from "konva";
import useImage from "use-image";
import type { Character } from "../../models/types";
import {
  getCoverImageLayout,
  resolveImageFocus,
} from "../../utils/imageLayout";

function clipFunc(shape: Character["borderShape"], size: number) {
  return (ctx: Context) => {
    const canvas = ctx._context;
    canvas.beginPath();
    switch (shape) {
      case "square":
        canvas.rect(-size, -size, size * 2, size * 2);
        break;
      case "pentagon": {
        const sides = 5;
        for (let i = 0; i < sides; i++) {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
          const x = Math.cos(angle) * size;
          const y = Math.sin(angle) * size;
          if (i === 0) canvas.moveTo(x, y);
          else canvas.lineTo(x, y);
        }
        canvas.closePath();
        break;
      }
      case "hexagon": {
        const sides = 6;
        for (let i = 0; i < sides; i++) {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
          const x = Math.cos(angle) * size;
          const y = Math.sin(angle) * size;
          if (i === 0) canvas.moveTo(x, y);
          else canvas.lineTo(x, y);
        }
        canvas.closePath();
        break;
      }
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
