import { useLayoutEffect, useRef, useState } from "react";
import { Group as KonvaGroup, Line } from "react-konva";
import type Konva from "konva";
import type {
  Box,
  Character,
  Group,
  Line as DiagramLine,
  NodeRef,
  RGB,
} from "../../models/types";
import { GROUP_HUB_BADGE_RADIUS, rgbToCss } from "../../models/types";
import { MembershipChip } from "./MembershipChips";
import { ConnectHandle } from "./ConnectHandle";
import { getConnectHandleOffset } from "../../utils/connection";
import {
  getGroupCentroid,
  getGroupMemberAnchors,
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

/** Opaque strokes cached as one bitmap, then faded — overlaps don’t stack alpha. */
function GroupSpokeCorridors({
  groupId,
  members,
  centroid,
  color,
  opacity,
  viewportScale,
}: {
  groupId: string;
  members: { character: Character; anchor: { x: number; y: number } }[];
  centroid: { x: number; y: number };
  color: RGB;
  opacity: number;
  viewportScale: number;
}) {
  const spokesRef = useRef<Konva.Group>(null);
  const stroke = rgbToCss(color);
  const geometryKey =
    members
      .map(
        ({ character, anchor }) =>
          `${character.id}:${anchor.x.toFixed(1)},${anchor.y.toFixed(1)},${character.size}`,
      )
      .join("|") +
    `|${centroid.x.toFixed(1)},${centroid.y.toFixed(1)}|${stroke}|${opacity.toFixed(3)}`;

  useLayoutEffect(() => {
    const node = spokesRef.current;
    if (!node) return;
    node.clearCache();
    // Children draw opaque into the cache; Group.opacity applies when blitting.
    node.cache({
      pixelRatio: Math.min(2, Math.max(1, viewportScale)),
    });
  }, [geometryKey, viewportScale]);

  return (
    <KonvaGroup
      ref={spokesRef}
      opacity={opacity}
      listening={false}
    >
      {members.map(({ character, anchor }) => (
        <Line
          key={`${groupId}-spoke-${character.id}`}
          points={[anchor.x, anchor.y, centroid.x, centroid.y]}
          stroke={stroke}
          strokeWidth={spokeStrokeWidth(character.size)}
          lineCap="round"
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </KonvaGroup>
  );
}

function GroupHubNode({
  group,
  members,
  centroid,
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
      <GroupSpokeCorridors
        groupId={group.id}
        members={members}
        centroid={centroid}
        color={group.appearance.corridorColor}
        opacity={group.appearance.corridorOpacity}
        viewportScale={viewportScale}
      />
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
        <MembershipChip
          appearance={group.appearance}
          radius={GROUP_HUB_BADGE_RADIUS}
          emphasized={selected}
        />
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
