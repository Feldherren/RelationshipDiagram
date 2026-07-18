import { useState } from "react";
import { Group as KonvaGroup, Line } from "react-konva";
import type Konva from "konva";
import type { Box, Character, Group, Line as DiagramLine, NodeRef } from "../../models/types";
import { GROUP_HUB_BADGE_RADIUS } from "../../models/types";
import { MembershipChip } from "./MembershipChips";
import { ConnectHandle } from "./ConnectHandle";
import { getConnectHandleOffset } from "../../utils/connection";
import {
  getGroupCentroid,
  getGroupMemberAnchors,
  paleGroupTint,
  shouldShowGroupHub,
  spokeStrokeWidth,
  type GroupCanvasVisibilityContext,
} from "../../utils/groupHub";
import {
  getMembershipChipTooltip,
  setMembershipChipTooltip,
} from "../../utils/membershipChipTooltip";
import { useDiagramStore } from "../../store/diagramStore";
import { useClickWithoutDrag } from "../../hooks/useClickWithoutDrag";

interface GroupHubLayerProps {
  groups: Group[];
  characters: Character[];
  boxes: Box[];
  lines: DiagramLine[];
  visibility: GroupCanvasVisibilityContext;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onOpenDetails: (groupId: string) => void;
  onConnectHandleDown: (
    groupId: string,
  ) => (e: Konva.KonvaEventObject<MouseEvent>) => void;
  isConnectSource: (ref: NodeRef) => boolean;
}

export function GroupHubLayer({
  groups,
  characters,
  boxes,
  lines,
  visibility,
  selectedGroupId,
  onSelectGroup,
  onOpenDetails,
  onConnectHandleDown,
  isConnectSource,
}: GroupHubLayerProps) {
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  return (
    <KonvaGroup listening>
      {groups.map((group) => {
        const members = getGroupMemberAnchors(group, characters, boxes);
        if (
          !shouldShowGroupHub(group.id, {
            ...visibility,
            lines,
            hasMembers: members.length > 0,
          })
        ) {
          return null;
        }
        const centroid = getGroupCentroid(group, characters, boxes);
        if (!centroid) return null;

        const selected = selectedGroupId === group.id;
        const tint = paleGroupTint(group.appearance.backgroundColor);
        const connectSource = isConnectSource({
          id: group.id,
          kind: "group",
        });
        const showConnect =
          selected || hoveredGroupId === group.id || connectSource;
        const handleOffset = getConnectHandleOffset(GROUP_HUB_BADGE_RADIUS);

        return (
          <GroupHubNode
            key={group.id}
            group={group}
            members={members}
            centroid={centroid}
            tint={tint}
            selected={selected}
            showConnect={showConnect}
            connectSource={connectSource}
            handleOffset={handleOffset}
            viewportScale={viewportScale}
            onHoverChange={(hovered) =>
              setHoveredGroupId((current) =>
                hovered ? group.id : current === group.id ? null : current,
              )
            }
            onSelect={() => onSelectGroup(group.id)}
            onOpenDetails={() => onOpenDetails(group.id)}
            onConnectHandleDown={onConnectHandleDown(group.id)}
          />
        );
      })}
    </KonvaGroup>
  );
}

function GroupHubNode({
  group,
  members,
  centroid,
  tint,
  selected,
  showConnect,
  connectSource,
  handleOffset,
  viewportScale,
  onHoverChange,
  onSelect,
  onOpenDetails,
  onConnectHandleDown,
}: {
  group: Group;
  members: { character: Character; anchor: { x: number; y: number } }[];
  centroid: { x: number; y: number };
  tint: string;
  selected: boolean;
  showConnect: boolean;
  connectSource: boolean;
  handleOffset: { x: number; y: number };
  viewportScale: number;
  onHoverChange: (hovered: boolean) => void;
  onSelect: () => void;
  onOpenDetails: () => void;
  onConnectHandleDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}) {
  const clickGuard = useClickWithoutDrag();
  const label = group.name.trim();

  return (
    <KonvaGroup>
      {members.map(({ character, anchor }) => (
        <Line
          key={`${group.id}-spoke-${character.id}`}
          points={[anchor.x, anchor.y, centroid.x, centroid.y]}
          stroke={tint}
          strokeWidth={spokeStrokeWidth(character.size)}
          lineCap="round"
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
      <KonvaGroup
        x={centroid.x}
        y={centroid.y}
        onMouseEnter={() => {
          onHoverChange(true);
          if (!label) return;
          setMembershipChipTooltip({
            id: `hub:${group.id}`,
            text: label,
            chipX: centroid.x,
            chipY: centroid.y,
          });
        }}
        onMouseLeave={() => {
          onHoverChange(false);
          if (getMembershipChipTooltip()?.id === `hub:${group.id}`) {
            setMembershipChipTooltip(null);
          }
        }}
        onMouseDown={clickGuard.onMouseDown}
        onClick={(e) => {
          e.cancelBubble = true;
          if (!clickGuard.shouldCountAsClick()) return;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDblClick={(e) => {
          e.cancelBubble = true;
          onOpenDetails();
        }}
        onDblTap={(e) => {
          e.cancelBubble = true;
          onOpenDetails();
        }}
      >
        <MembershipChip appearance={group.appearance} radius={GROUP_HUB_BADGE_RADIUS} emphasized={selected} />
        {showConnect && (
          <ConnectHandle
            x={handleOffset.x}
            y={handleOffset.y}
            viewportScale={viewportScale}
            isConnectSource={connectSource}
            onMouseDown={onConnectHandleDown}
          />
        )}
      </KonvaGroup>
    </KonvaGroup>
  );
}
