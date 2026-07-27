import { Circle, Group } from "react-konva";
import type Konva from "konva";
import type { BorderShape } from "../../models/types";
import { MEMBERSHIP_CHIP_RADIUS } from "../../models/types";
import {
  borderPointAtAngle,
  CHARACTER_LINK_CHIP_ANGLE,
} from "../../utils/borderChipPosition";
import {
  getMembershipChipTooltip,
  setMembershipChipTooltip,
} from "../../utils/membershipChipTooltip";
import { openExternalUrl } from "../../utils/openExternalUrl";
import { isValidUri } from "../../utils/uri";
import { ExternalLinkSymbol } from "./ExternalLinkSymbol";

const LINK_CHIP_BORDER_STROKE_WIDTH = 2;

interface CharacterLinkChipProps {
  characterId: string;
  link?: string;
  characterSize: number;
  borderShape: BorderShape;
  characterX: number;
  characterY: number;
}

export function CharacterLinkChip({
  characterId,
  link,
  characterSize,
  borderShape,
  characterX,
  characterY,
}: CharacterLinkChipProps) {
  if (!link || !isValidUri(link)) return null;

  const tooltipId = `link-${characterId}`;
  const pos = borderPointAtAngle(
    CHARACTER_LINK_CHIP_ANGLE,
    characterSize,
    borderShape,
  );

  const handleOpen = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    if ("button" in e.evt && e.evt.button !== 0) return;
    document.body.style.cursor = "";
    if (getMembershipChipTooltip()?.id === tooltipId) {
      setMembershipChipTooltip(null);
    }
    void openExternalUrl(link);
  };

  return (
    <Group
      x={pos.x}
      y={pos.y}
      onMouseEnter={() => {
        document.body.style.cursor = "pointer";
        setMembershipChipTooltip({
          id: tooltipId,
          text: link,
          chipX: characterX + pos.x,
          chipY: characterY + pos.y,
        });
      }}
      onMouseLeave={() => {
        document.body.style.cursor = "";
        if (getMembershipChipTooltip()?.id === tooltipId) {
          setMembershipChipTooltip(null);
        }
      }}
      onClick={handleOpen}
      onTap={handleOpen}
    >
      <Circle
        radius={MEMBERSHIP_CHIP_RADIUS}
        fill="#e8e8e8"
        stroke="#333"
        strokeWidth={LINK_CHIP_BORDER_STROKE_WIDTH}
        shadowColor="rgba(0,0,0,0.35)"
        shadowBlur={3}
        shadowOpacity={1}
        shadowEnabled
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
      <ExternalLinkSymbol chipRadius={MEMBERSHIP_CHIP_RADIUS} color="#333" />
    </Group>
  );
}
