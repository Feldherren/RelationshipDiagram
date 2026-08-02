import type { MembershipChipItem } from "./MembershipChips";
import { EMPTY_MEMBERSHIP_CHIPS } from "./MembershipChips";
import type Konva from "konva";
import type {
  Box,
  Character,
  Diagram,
  FloatingText,
  Group,
  Line,
  NodeRef,
  Selection,
} from "../../models/types";
import {
  isCharacterHidden,
  isFloatingTextHidden,
} from "../../store/diagramStore";
import type { GroupCanvasVisibilityContext } from "../../utils/groupHub";
import { isItemSelected } from "../../utils/selectionMulti";
import type { RoutedLine } from "../../utils/lineRouting";
import type { MoveBoxSnapOptions } from "../../store/diagramStore";
import { BoxContainer } from "./BoxContainer";
import { CharacterNode } from "./CharacterNode";
import { FloatingTextNode } from "./FloatingTextNode";
import { GroupHubLayer } from "./GroupHubLayer";
import { LineEdge } from "./LineEdge";

interface DiagramLayerContentsProps {
  layerId: string;
  characters: Character[];
  boxes: Box[];
  groups: Group[];
  floatingTexts: FloatingText[];
  routedLines: { line: Line; routed: RoutedLine }[];
  diagram: Diagram;
  diagramFontFamily: string;
  selection: Selection;
  editingFloatingTextId: string | null;
  toolMode: string;
  connectDrag: unknown;
  membershipByCharacterId: Map<string, MembershipChipItem[]>;
  highlightedGroupId: string | null;
  highlightedMemberIds: Set<string> | null;
  groupVisibilityCtx: GroupCanvasVisibilityContext;
  hoveredLineId: string | null;
  hoveredBoxId: string | null;
  setHoveredLineId: React.Dispatch<React.SetStateAction<string | null>>;
  setBoxHovered: (boxId: string, hovered: boolean) => void;
  handleToggleBoxCollapse: (boxId: string) => void;
  handleNodeClick: (
    ref: NodeRef,
    options?: { openDetails?: boolean },
  ) => void;
  handleConnectHandleDown: (
    ref: NodeRef,
  ) => (e: Konva.KonvaEventObject<MouseEvent>) => void;
  isConnectSource: (ref: NodeRef) => boolean;
  setSelection: (
    selection: Selection,
    options?: { openDetails?: boolean },
  ) => void;
  updateBox: (
    id: string,
    patch: Partial<Box>,
    options?: { recordHistory?: boolean },
  ) => void;
  moveBox: (
    id: string,
    delta: { dx: number; dy: number },
    contents: { characterIds: string[]; floatingTextIds: string[] },
    options?: MoveBoxSnapOptions,
  ) => void;
  moveCharacter: (
    id: string,
    position: { x: number; y: number },
    options?: { recordHistory?: boolean },
  ) => void;
  moveFloatingText: (
    id: string,
    position: { x: number; y: number },
    options?: { recordHistory?: boolean },
  ) => void;
  updateLine: (
    id: string,
    patch: Partial<Line>,
    options?: { recordHistory?: boolean },
  ) => void;
  beginEditingFloatingText: (id: string) => void;
  setIsResizingBox: (value: boolean) => void;
  setIsDraggingBox: (value: boolean) => void;
}

export function DiagramLayerContents({
  layerId,
  characters,
  boxes,
  groups,
  floatingTexts,
  routedLines,
  diagram,
  diagramFontFamily,
  selection,
  editingFloatingTextId,
  toolMode,
  connectDrag,
  membershipByCharacterId,
  highlightedGroupId,
  highlightedMemberIds,
  groupVisibilityCtx,
  hoveredLineId,
  hoveredBoxId,
  setHoveredLineId,
  setBoxHovered,
  handleToggleBoxCollapse,
  handleNodeClick,
  handleConnectHandleDown,
  isConnectSource,
  setSelection,
  updateBox,
  moveBox,
  moveCharacter,
  moveFloatingText,
  updateLine,
  beginEditingFloatingText,
  setIsResizingBox,
  setIsDraggingBox,
}: DiagramLayerContentsProps) {
  const layerBoxes = boxes.filter((b) => b.layerId === layerId);
  const layerGroups = groups.filter((g) => g.layerId === layerId);
  const layerCharacters = characters.filter((c) => c.layerId === layerId);
  const layerTexts = floatingTexts.filter((t) => t.layerId === layerId);
  const layerRoutedLines = routedLines.filter(
    ({ line }) => line.layerId === layerId,
  );

  return (
    <>
      {layerBoxes
        .filter((b) => !b.collapsed)
        .map((box) => (
          <BoxContainer
            key={`${box.id}-bg`}
            box={box}
            characters={characters}
            selected={isItemSelected(selection, "box", box.id)}
            isConnectSource={isConnectSource({
              id: box.id,
              kind: "box",
            })}
            onSelect={() => handleNodeClick({ id: box.id, kind: "box" })}
            onOpenDetails={() =>
              handleNodeClick(
                { id: box.id, kind: "box" },
                { openDetails: true },
              )
            }
            onToggleCollapse={() => handleToggleBoxCollapse(box.id)}
            onBoundsChange={(bounds) =>
              updateBox(box.id, { bounds }, { recordHistory: false })
            }
            onMoveByDelta={(delta, contents, snapOptions) =>
              moveBox(box.id, delta, contents, {
                recordHistory: false,
                ...snapOptions,
              })
            }
            onResizeStart={() => setIsResizingBox(true)}
            onResizeEnd={() => setIsResizingBox(false)}
            onDragStart={() => setIsDraggingBox(true)}
            onDragEnd={() => setIsDraggingBox(false)}
            onConnectHandleDown={handleConnectHandleDown({
              id: box.id,
              kind: "box",
            })}
            part="background"
            hovered={hoveredBoxId === box.id}
            onHoverChange={(hovered) => setBoxHovered(box.id, hovered)}
          />
        ))}

      <GroupHubLayer
        groups={layerGroups}
        characters={characters}
        boxes={boxes}
        lines={diagram.lines}
        visibility={groupVisibilityCtx}
        selectedGroupId={highlightedGroupId}
        onSelectGroup={(groupId) =>
          setSelection({ type: "group", id: groupId }, { openDetails: false })
        }
        onOpenDetails={(groupId) =>
          setSelection(
            { type: "group", id: groupId },
            { openDetails: true },
          )
        }
        onConnectHandleDown={(groupId) =>
          handleConnectHandleDown({ id: groupId, kind: "group" })
        }
        isConnectSource={isConnectSource}
      />

      {layerRoutedLines.map(({ line, routed }) => (
        <LineEdge
          key={line.id}
          line={line}
          diagram={diagram}
          routed={routed}
          selected={selection?.type === "line" && selection.id === line.id}
          onSelect={() =>
            setSelection(
              { type: "line", id: line.id },
              { openDetails: false },
            )
          }
          onOpenDetails={() =>
            setSelection(
              { type: "line", id: line.id },
              { openDetails: true },
            )
          }
          onBendChange={(bend) =>
            updateLine(line.id, { bend }, { recordHistory: false })
          }
          part="stroke"
          hovered={hoveredLineId === line.id}
          onHoverChange={(hovered) =>
            setHoveredLineId((current) =>
              hovered ? line.id : current === line.id ? null : current,
            )
          }
        />
      ))}

      {layerRoutedLines.map(({ line, routed }) => (
        <LineEdge
          key={`${line.id}-label`}
          line={line}
          diagram={diagram}
          routed={routed}
          selected={selection?.type === "line" && selection.id === line.id}
          onSelect={() =>
            setSelection(
              { type: "line", id: line.id },
              { openDetails: false },
            )
          }
          onOpenDetails={() =>
            setSelection(
              { type: "line", id: line.id },
              { openDetails: true },
            )
          }
          onBendChange={(bend) =>
            updateLine(line.id, { bend }, { recordHistory: false })
          }
          part="label"
          hovered={hoveredLineId === line.id}
          onHoverChange={(hovered) =>
            setHoveredLineId((current) =>
              hovered ? line.id : current === line.id ? null : current,
            )
          }
        />
      ))}

      {layerCharacters
        .filter(
          (c) =>
            !isCharacterHidden(c.id, boxes, characters, diagramFontFamily),
        )
        .map((character) => {
          const membershipGroups =
            membershipByCharacterId.get(character.id) ?? EMPTY_MEMBERSHIP_CHIPS;
          const isMember =
            highlightedMemberIds?.has(character.id) ?? false;
          return (
            <CharacterNode
              key={character.id}
              character={character}
              part="body"
              selected={isItemSelected(
                selection,
                "character",
                character.id,
              )}
              isConnectSource={isConnectSource({
                id: character.id,
                kind: "character",
              })}
              membershipGroups={membershipGroups}
              highlightedGroupId={highlightedGroupId}
              dimmed={highlightedMemberIds != null && !isMember}
              membershipEmphasized={isMember}
              draggable={
                toolMode !== "exportBounds" &&
                toolMode !== "editGroupMembers" &&
                !connectDrag
              }
              onSelect={() =>
                handleNodeClick({ id: character.id, kind: "character" })
              }
              onOpenDetails={() =>
                handleNodeClick(
                  { id: character.id, kind: "character" },
                  { openDetails: true },
                )
              }
              onSelectGroup={
                toolMode === "editGroupMembers"
                  ? () =>
                      handleNodeClick({
                        id: character.id,
                        kind: "character",
                      })
                  : (groupId) =>
                      setSelection({
                        type: "group",
                        id: groupId,
                        anchorCharacterId: character.id,
                      })
              }
              onConnectHandleDown={handleConnectHandleDown({
                id: character.id,
                kind: "character",
              })}
              onDragMove={(pos) =>
                moveCharacter(character.id, pos, { recordHistory: false })
              }
              onDragEnd={(pos) =>
                moveCharacter(character.id, pos, { recordHistory: false })
              }
            />
          );
        })}

      {layerBoxes
        .filter((b) => !b.collapsed)
        .map((box) => (
          <BoxContainer
            key={`${box.id}-fg`}
            box={box}
            characters={characters}
            selected={isItemSelected(selection, "box", box.id)}
            isConnectSource={isConnectSource({
              id: box.id,
              kind: "box",
            })}
            onSelect={() => handleNodeClick({ id: box.id, kind: "box" })}
            onOpenDetails={() =>
              handleNodeClick(
                { id: box.id, kind: "box" },
                { openDetails: true },
              )
            }
            onToggleCollapse={() => handleToggleBoxCollapse(box.id)}
            onBoundsChange={(bounds) =>
              updateBox(box.id, { bounds }, { recordHistory: false })
            }
            onMoveByDelta={(delta, contents, snapOptions) =>
              moveBox(box.id, delta, contents, {
                recordHistory: false,
                ...snapOptions,
              })
            }
            onResizeStart={() => setIsResizingBox(true)}
            onResizeEnd={() => setIsResizingBox(false)}
            onDragStart={() => setIsDraggingBox(true)}
            onDragEnd={() => setIsDraggingBox(false)}
            onConnectHandleDown={handleConnectHandleDown({
              id: box.id,
              kind: "box",
            })}
            part="foreground"
            hovered={hoveredBoxId === box.id}
            onHoverChange={(hovered) => setBoxHovered(box.id, hovered)}
          />
        ))}

      {layerBoxes
        .filter((b) => b.collapsed)
        .map((box) => (
          <BoxContainer
            key={box.id}
            box={box}
            characters={characters}
            selected={isItemSelected(selection, "box", box.id)}
            isConnectSource={isConnectSource({
              id: box.id,
              kind: "box",
            })}
            onSelect={() => handleNodeClick({ id: box.id, kind: "box" })}
            onOpenDetails={() =>
              handleNodeClick(
                { id: box.id, kind: "box" },
                { openDetails: true },
              )
            }
            onToggleCollapse={() => handleToggleBoxCollapse(box.id)}
            onBoundsChange={(bounds) =>
              updateBox(box.id, { bounds }, { recordHistory: false })
            }
            onMoveByDelta={(delta, contents, snapOptions) =>
              moveBox(box.id, delta, contents, {
                recordHistory: false,
                ...snapOptions,
              })
            }
            onResizeStart={() => setIsResizingBox(true)}
            onResizeEnd={() => setIsResizingBox(false)}
            onDragStart={() => setIsDraggingBox(true)}
            onDragEnd={() => setIsDraggingBox(false)}
            onConnectHandleDown={handleConnectHandleDown({
              id: box.id,
              kind: "box",
            })}
            hovered={hoveredBoxId === box.id}
            onHoverChange={(hovered) => setBoxHovered(box.id, hovered)}
          />
        ))}

      {layerTexts
        .filter(
          (t) =>
            !isFloatingTextHidden(
              t.id,
              boxes,
              floatingTexts,
              diagramFontFamily,
            ),
        )
        .map((floatingText) => (
          <FloatingTextNode
            key={floatingText.id}
            floatingText={floatingText}
            selected={isItemSelected(
              selection,
              "floatingText",
              floatingText.id,
            )}
            editing={editingFloatingTextId === floatingText.id}
            draggable={
              toolMode !== "exportBounds" &&
              toolMode !== "editGroupMembers" &&
              !connectDrag &&
              editingFloatingTextId !== floatingText.id
            }
            onSelect={() =>
              setSelection(
                { type: "floatingText", id: floatingText.id },
                { openDetails: false },
              )
            }
            onStartEdit={() => beginEditingFloatingText(floatingText.id)}
            onOpenDetails={() => beginEditingFloatingText(floatingText.id)}
            onDragMove={(pos) =>
              moveFloatingText(floatingText.id, pos, {
                recordHistory: false,
              })
            }
            onDragEnd={(pos) =>
              moveFloatingText(floatingText.id, pos, {
                recordHistory: false,
              })
            }
          />
        ))}
    </>
  );
}
