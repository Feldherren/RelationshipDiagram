import type {
  Box,
  Character,
  NodeRef,
  Selection,
  ToolMode,
} from "../../models/types";
import { isCharacterHidden } from "../../store/diagramStore";
import { isItemSelected } from "../../utils/selectionMulti";
import { BoxContainer } from "./BoxContainer";
import { CharacterNode } from "./CharacterNode";
import {
  EMPTY_MEMBERSHIP_CHIPS,
  type MembershipChipItem,
} from "./MembershipChips";

interface CharacterChromeOverlayProps {
  characters: Character[];
  boxes: Box[];
  visibleLayerIds: Set<string>;
  diagramFontFamily: string;
  selection: Selection;
  toolMode: ToolMode;
  membershipByCharacterId: Map<string, MembershipChipItem[]>;
  highlightedGroupId: string | null;
  highlightedMemberIds: Set<string> | null;
  handleNodeClick: (
    ref: NodeRef,
    options?: { openDetails?: boolean },
  ) => void;
  setSelection: (
    selection: Selection,
    options?: { openDetails?: boolean },
  ) => void;
}

const noop = () => undefined;

/** Character/box names and chips — always above relationship lines. */
export function CharacterChromeOverlay({
  characters,
  boxes,
  visibleLayerIds,
  diagramFontFamily,
  selection,
  toolMode,
  membershipByCharacterId,
  highlightedGroupId,
  highlightedMemberIds,
  handleNodeClick,
  setSelection,
}: CharacterChromeOverlayProps) {
  return (
    <>
      {boxes
        .filter((b) => visibleLayerIds.has(b.layerId))
        .map((box) => (
          <BoxContainer
            key={`${box.id}-label`}
            box={box}
            characters={characters}
            selected={isItemSelected(selection, "box", box.id)}
            isConnectSource={false}
            onSelect={() => handleNodeClick({ id: box.id, kind: "box" })}
            onOpenDetails={() =>
              handleNodeClick(
                { id: box.id, kind: "box" },
                { openDetails: true },
              )
            }
            onToggleCollapse={noop}
            onBoundsChange={noop}
            onMoveByDelta={noop}
            onResizeStart={noop}
            onResizeEnd={noop}
            onDragStart={noop}
            onDragEnd={noop}
            onConnectHandleDown={noop}
            part="label"
          />
        ))}
      {characters
        .filter(
          (c) =>
            visibleLayerIds.has(c.layerId) &&
            !isCharacterHidden(c.id, boxes, characters, diagramFontFamily),
        )
        .map((character) => {
          const membershipGroups =
            membershipByCharacterId.get(character.id) ?? EMPTY_MEMBERSHIP_CHIPS;
          const isMember =
            highlightedMemberIds?.has(character.id) ?? false;
          return (
            <CharacterNode
              key={`${character.id}-chrome`}
              character={character}
              part="overlays"
              selected={isItemSelected(
                selection,
                "character",
                character.id,
              )}
              isConnectSource={false}
              membershipGroups={membershipGroups}
              highlightedGroupId={highlightedGroupId}
              dimmed={highlightedMemberIds != null && !isMember}
              membershipEmphasized={isMember}
              draggable={false}
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
              onConnectHandleDown={noop}
              onDragMove={noop}
              onDragEnd={noop}
            />
          );
        })}
    </>
  );
}
