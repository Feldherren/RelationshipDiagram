import type { Diagram, Group, Line, NodeRef } from "../models/types";
import { getCharacterById } from "./geometry";

export interface ResolvedLineEndpoint {
  logical: NodeRef;
  anchorKind: "character" | "group";
  anchorId: string;
  hiddenCharacterId?: string;
  hiddenCharacterName?: string;
}

export function getCollapsedGroupForCharacter(
  characterId: string,
  groups: Group[],
): Group | undefined {
  return groups.find(
    (g) => g.collapsed && g.memberCharacterIds.includes(characterId),
  );
}

export function resolveLineEndpoint(
  ref: NodeRef,
  diagram: Pick<Diagram, "characters" | "groups">,
): ResolvedLineEndpoint {
  if (ref.kind === "group") {
    return { logical: ref, anchorKind: "group", anchorId: ref.id };
  }

  const collapsedGroup = getCollapsedGroupForCharacter(ref.id, diagram.groups);
  if (collapsedGroup) {
    const character = getCharacterById(diagram, ref.id);
    return {
      logical: ref,
      anchorKind: "group",
      anchorId: collapsedGroup.id,
      hiddenCharacterId: ref.id,
      hiddenCharacterName: character?.name,
    };
  }

  return { logical: ref, anchorKind: "character", anchorId: ref.id };
}

export function isLineFullyInsideCollapsedGroup(
  line: Line,
  groups: Group[],
): boolean {
  if (line.from.kind !== "character" || line.to.kind !== "character") {
    return false;
  }
  const fromGroup = getCollapsedGroupForCharacter(line.from.id, groups);
  const toGroup = getCollapsedGroupForCharacter(line.to.id, groups);
  return fromGroup != null && toGroup?.id === fromGroup.id;
}

export function shouldRenderLine(
  line: Line,
  diagram: Pick<Diagram, "characters" | "groups">,
): boolean {
  if (isLineFullyInsideCollapsedGroup(line, diagram.groups)) {
    return false;
  }

  const from = resolveLineEndpoint(line.from, diagram);
  const to = resolveLineEndpoint(line.to, diagram);
  if (
    from.anchorKind === "group" &&
    to.anchorKind === "group" &&
    from.anchorId === to.anchorId
  ) {
    return false;
  }

  return true;
}

export function getLineDisplayLabel(
  line: Line,
  diagram: Pick<Diagram, "characters" | "groups">,
): string | null {
  const from = resolveLineEndpoint(line.from, diagram);
  const to = resolveLineEndpoint(line.to, diagram);
  const hiddenNames = new Set<string>();

  if (from.hiddenCharacterName?.trim()) {
    hiddenNames.add(from.hiddenCharacterName.trim());
  }
  if (to.hiddenCharacterName?.trim()) {
    hiddenNames.add(to.hiddenCharacterName.trim());
  }

  const parts: string[] = [];
  if (line.label?.trim()) {
    parts.push(line.label.trim());
  }
  if (hiddenNames.size > 0) {
    parts.push(`→ ${[...hiddenNames].join(", ")}`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
