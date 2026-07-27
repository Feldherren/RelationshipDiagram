import { Path } from "react-konva";
import {
  EXTERNAL_LINK_LAYOUT,
  EXTERNAL_LINK_PATHS,
} from "../../utils/linkChipGeometry";

interface ExternalLinkSymbolProps {
  chipRadius: number;
  color: string;
}

export function ExternalLinkSymbol({ chipRadius, color }: ExternalLinkSymbolProps) {
  const glyph = chipRadius * 0.68;
  const scale = glyph * EXTERNAL_LINK_LAYOUT.unitScale;
  const strokeWidth = Math.max(1.5, chipRadius * 0.14);

  return (
    <>
      {EXTERNAL_LINK_PATHS.map((data, index) => (
        <Path
          key={index}
          data={data}
          stroke={color}
          strokeWidth={strokeWidth / scale}
          lineCap="round"
          lineJoin="round"
          fillEnabled={false}
          scaleX={scale}
          scaleY={scale}
          offsetX={EXTERNAL_LINK_LAYOUT.centerX}
          offsetY={EXTERNAL_LINK_LAYOUT.centerY}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </>
  );
}
