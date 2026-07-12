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
  paddingX?: number;
  paddingY?: number;
  strokeWidth?: number;
  selectedStrokeWidth?: number;
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
  paddingX = LABEL_PADDING_X,
  paddingY = LABEL_PADDING_Y,
  strokeWidth = 1,
  selectedStrokeWidth = 2,
  anchor = "center",
}: PillLabelProps) {
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const fontFamily = fontFamilyProp ?? diagramFontFamily;
  const { width, height } = getPillLabelSize(
    text,
    fontSize,
    fontStyle,
    fontFamily,
    paddingX,
    paddingY,
  );
  const rectX = -width / 2;
  const rectY = anchor === "center" ? -height / 2 : 0;
  const stroke = selected ? selectedStroke : unselectedStroke;
  const activeStrokeWidth = selected ? selectedStrokeWidth : strokeWidth;

  return (
    <Group x={x} y={y} listening={false}>
      <Rect
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        fill="#ffffff"
        stroke={stroke}
        strokeWidth={activeStrokeWidth}
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

export function getPillLabelHeight(
  fontSize: number,
  paddingY: number = LABEL_PADDING_Y,
): number {
  return fontSize + paddingY * 2;
}

export { LABEL_PADDING_X, LABEL_PADDING_Y, DEFAULT_DIAGRAM_FONT };
