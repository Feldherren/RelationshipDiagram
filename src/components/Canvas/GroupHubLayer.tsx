import { useLayoutEffect, useRef, useState } from "react";
import { Group as KonvaGroup, Line } from "react-konva";
import type Konva from "konva";
import type {
  Box,
  Character,
  Group,
  Line as DiagramLine,
  NodeRef,
  Point,
  RGB,
} from "../../models/types";
import { GROUP_HUB_BADGE_RADIUS, rgbToCss } from "../../models/types";
import { MembershipChip } from "./MembershipChips";
import { ConnectHandle } from "./ConnectHandle";
import { getConnectHandleOffset } from "../../utils/connection";
import {
  getGroupHubPosition,
  getGroupMemberAnchors,
  shouldShowGroupHubBadge,
  shouldShowGroupHubSpokes,
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
  const toolMode = useDiagramStore((s) => s.toolMode);
  const connectDrag = useDiagramStore((s) => s.connectDrag);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  return (
    <KonvaGroup listening>
      {groups.map((group) => {
        const members = getGroupMemberAnchors(group, characters, boxes);
        const hasMembers = members.length > 0;
        const vis = { ...visibility, lines, hasMembers };
        const showBadge = shouldShowGroupHubBadge(group.id, vis);
        if (!showBadge) return null;

        const hub = getGroupHubPosition(group, characters, boxes);
        if (!hub) return null;

        const showSpokes = shouldShowGroupHubSpokes(group.id, vis);
        const selected = selectedGroupId === group.id;
        const connectSource = isConnectSource({
          id: group.id,
          kind: "group",
        });
        const showConnect =
          selected || hoveredGroupId === group.id || connectSource;
        const handleOffset = getConnectHandleOffset(GROUP_HUB_BADGE_RADIUS);
        const draggable =
          toolMode !== "exportBounds" &&
          toolMode !== "editGroupMembers" &&
          !connectDrag;

        return (
          <GroupHubNode
            key={group.id}
            group={group}
            members={members}
            hub={hub}
            showSpokes={showSpokes}
            selected={selected}
            showConnect={showConnect}
            connectSource={connectSource}
            handleOffset={handleOffset}
            viewportScale={viewportScale}
            draggable={draggable}
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
  hub,
  color,
  opacity,
  viewportScale,
}: {
  groupId: string;
  members: { character: Character; anchor: { x: number; y: number } }[];
  hub: Point;
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
    `|${hub.x.toFixed(1)},${hub.y.toFixed(1)}|${stroke}|${opacity.toFixed(3)}`;

  useLayoutEffect(() => {
    const node = spokesRef.current;
    if (!node) return;
    node.clearCache();
    node.cache({
      pixelRatio: Math.min(2, Math.max(1, viewportScale)),
    });
  }, [geometryKey, viewportScale]);

  return (
    <KonvaGroup ref={spokesRef} opacity={opacity} listening={false}>
      {members.map(({ character, anchor }) => (
        <Line
          key={`${groupId}-spoke-${character.id}`}
          points={[anchor.x, anchor.y, hub.x, hub.y]}
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
  hub,
  showSpokes,
  selected,
  showConnect,
  connectSource,
  handleOffset,
  viewportScale,
  draggable,
  onHoverChange,
  onSelect,
  onOpenDetails,
  onConnectHandleDown,
}: {
  group: Group;
  members: { character: Character; anchor: { x: number; y: number } }[];
  hub: Point;
  showSpokes: boolean;
  selected: boolean;
  showConnect: boolean;
  connectSource: boolean;
  handleOffset: { x: number; y: number };
  viewportScale: number;
  draggable: boolean;
  onHoverChange: (hovered: boolean) => void;
  onSelect: () => void;
  onOpenDetails: () => void;
  onConnectHandleDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}) {
  const label = group.name.trim();
  const lastClickAtRef = useRef(0);
  const allowDragRef = useRef(false);
  const clickGuard = useClickWithoutDrag();
  const updateGroup = useDiagramStore((s) => s.updateGroup);
  const captureHistory = useDiagramStore((s) => s.captureHistory);
  /** Live drag position so corridors track before store catches up. */
  const [dragHub, setDragHub] = useState<Point | null>(null);
  const hubPos = dragHub ?? hub;

  const handleOpenDetails = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    e.cancelBubble = true;
    e.evt.preventDefault();
    lastClickAtRef.current = 0;
    onOpenDetails();
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    if ("button" in e.evt && e.evt.button !== 0) return;
    if (clickGuard.consumeClickSuppression()) return;
    const now = performance.now();
    if (now - lastClickAtRef.current < 400) {
      handleOpenDetails(e);
      return;
    }
    lastClickAtRef.current = now;
    onSelect();
  };

  return (
    <KonvaGroup>
      {showSpokes && (
        <GroupSpokeCorridors
          groupId={group.id}
          members={members}
          hub={hubPos}
          color={group.appearance.corridorColor}
          opacity={group.appearance.corridorOpacity}
          viewportScale={viewportScale}
        />
      )}
      <KonvaGroup
        x={hubPos.x}
        y={hubPos.y}
        draggable={draggable}
        onMouseEnter={() => {
          onHoverChange(true);
          if (!label) return;
          setMembershipChipTooltip({
            id: `hub:${group.id}`,
            text: label,
            chipX: hubPos.x,
            chipY: hubPos.y,
          });
        }}
        onMouseLeave={() => {
          onHoverChange(false);
          if (getMembershipChipTooltip()?.id === `hub:${group.id}`) {
            setMembershipChipTooltip(null);
          }
        }}
        onMouseDown={(e) => {
          allowDragRef.current = e.evt.button === 0;
        }}
        onTouchStart={() => {
          allowDragRef.current = true;
        }}
        onClick={handleClick}
        onTap={handleClick}
        onDblClick={handleOpenDetails}
        onDblTap={handleOpenDetails}
        onContextMenu={handleOpenDetails}
        onDragStart={(e) => {
          if (!allowDragRef.current) {
            e.target.stopDrag();
            return;
          }
          clickGuard.noticeDrag();
          captureHistory();
          useDiagramStore.setState({ selectionDetailsOpen: false });
          setMembershipChipTooltip(null);
        }}
        onDragMove={(e) => {
          const pos = { x: e.target.x(), y: e.target.y() };
          setDragHub(pos);
          updateGroup(
            group.id,
            { hubPosition: pos },
            { recordHistory: false },
          );
        }}
        onDragEnd={(e) => {
          const pos = { x: e.target.x(), y: e.target.y() };
          setDragHub(null);
          updateGroup(
            group.id,
            { hubPosition: pos },
            { recordHistory: false },
          );
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
            isConnectSource={connectSource}
            onMouseDown={onConnectHandleDown}
          />
        )}
      </KonvaGroup>
    </KonvaGroup>
  );
}
