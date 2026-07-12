import { Group, Rect, Text } from "react-konva";
import { useDiagramStore } from "../../store/diagramStore";
import {
  DEFAULT_DIAGRAM_FONT,
  formatFontForCanvas,
} from "../../utils/diagramFont";
import {
  LABEL_PADDING_X,
  LABEL_PADDING_Y,
  getPillLabelSize,
} from "../../utils/labelMetrics";

interface PillLabelProps {
  text: string;
  x?: number;
  y?: number;
  fontSize?: number;
  fontStyle?: "normal" | "bold";
  textFill?: string;
  selected?: boolean;
  unselectedStroke?: string;
  selectedStroke?: string;
  fontFamily?: string;
  /** When "top", y is the top edge of the pill; when "center", y is the vertical center. */
  anchor?: "top" | "center";
}

export function PillLabel({
  text,
  x = 0,
  y = 0,
  fontSize = 12,
  fontStyle = "normal",
  textFill = "#1f1f1f",
  selected = false,
  unselectedStroke = "#d0d0d0",
  selectedStroke = "#4a90d9",
  fontFamily: fontFamilyProp,
  anchor = "center",
}: PillLabelProps) {
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const fontFamily = fontFamilyProp ?? diagramFontFamily;
  const { width, height } = getPillLabelSize(
    text,
    fontSize,
    fontStyle,
    fontFamily,
  );
  const rectX = -width / 2;
  const rectY = anchor === "center" ? -height / 2 : 0;
  const stroke = selected ? selectedStroke : unselectedStroke;
  const strokeWidth = selected ? 2 : 1;

  return (
    <Group x={x} y={y} listening={false}>
      <Rect
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        fill="#ffffff"
        stroke={stroke}
        strokeWidth={strokeWidth}
        cornerRadius={height / 2}
        listening={false}
      />
      <Text
        text={text}
        fontFamily={formatFontForCanvas(fontFamily)}
        fontSize={fontSize}
        fontStyle={fontStyle}
        fill={textFill}
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  );
}

export function getPillLabelHeight(fontSize: number): number {
  return fontSize + LABEL_PADDING_Y * 2;
}

export { LABEL_PADDING_X, LABEL_PADDING_Y, DEFAULT_DIAGRAM_FONT };
