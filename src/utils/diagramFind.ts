import type { Diagram, Selection } from "../models/types";
import { getLineDisplayLabel } from "./lineEndpoints";

export type FindEntitySelection = Exclude<
  Selection,
  null | { type: "multi" }
>;

export type FindMatch =
  | {
      kind: "entity";
      selection: FindEntitySelection;
      label: string;
      field: string;
    }
  | { kind: "header"; field: "title" | "subtitle"; label: string };

function matchesField(value: string | undefined | null, needle: string): boolean {
  const text = value?.trim();
  return Boolean(text && text.toLowerCase().includes(needle));
}

function firstMatchingField(
  fields: Array<{ key: string; value: string | undefined | null }>,
  needle: string,
): string | null {
  for (const field of fields) {
    if (matchesField(field.value, needle)) {
      return field.key;
    }
  }
  return null;
}

function truncateLabel(text: string, maxLength = 48): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function searchDiagram(diagram: Diagram, query: string): FindMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const results: FindMatch[] = [];

  for (const character of diagram.characters) {
    const field = firstMatchingField(
      [
        { key: "name", value: character.name },
        { key: "subtitle", value: character.subtitle },
        { key: "imageFileName", value: character.imageFileName },
        { key: "link", value: character.link },
      ],
      needle,
    );
    if (!field) continue;
    results.push({
      kind: "entity",
      selection: { type: "character", id: character.id },
      label: character.name.trim() || character.subtitle?.trim() || character.id,
      field,
    });
  }

  for (const group of diagram.groups) {
    if (!matchesField(group.name, needle)) continue;
    results.push({
      kind: "entity",
      selection: { type: "group", id: group.id },
      label: group.name.trim(),
      field: "name",
    });
  }

  for (const box of diagram.boxes) {
    if (!matchesField(box.name, needle)) continue;
    results.push({
      kind: "entity",
      selection: { type: "box", id: box.id },
      label: box.name.trim(),
      field: "name",
    });
  }

  for (const line of diagram.lines) {
    const displayLabel = getLineDisplayLabel(line, diagram);
    const field = firstMatchingField(
      [
        { key: "label", value: line.label },
        { key: "displayLabel", value: displayLabel },
      ],
      needle,
    );
    if (!field) continue;
    results.push({
      kind: "entity",
      selection: { type: "line", id: line.id },
      label: displayLabel?.trim() || line.label?.trim() || line.id,
      field,
    });
  }

  for (const floatingText of diagram.floatingTexts ?? []) {
    if (!matchesField(floatingText.text, needle)) continue;
    results.push({
      kind: "entity",
      selection: { type: "floatingText", id: floatingText.id },
      label: truncateLabel(floatingText.text),
      field: "text",
    });
  }

  for (const bookmark of diagram.bookmarks ?? []) {
    if (!matchesField(bookmark.name, needle)) continue;
    results.push({
      kind: "entity",
      selection: { type: "bookmark", id: bookmark.id },
      label: bookmark.name.trim(),
      field: "name",
    });
  }

  if (matchesField(diagram.title, needle)) {
    results.push({
      kind: "header",
      field: "title",
      label: diagram.title!.trim(),
    });
  }

  if (matchesField(diagram.subtitle, needle)) {
    results.push({
      kind: "header",
      field: "subtitle",
      label: diagram.subtitle!.trim(),
    });
  }

  return results;
}

export function flashDiagramHeaderHighlight(): void {
  const element = document.querySelector(".diagram-title-bar");
  if (!(element instanceof HTMLElement)) return;
  element.classList.add("diagram-title-bar--find-highlight");
  window.setTimeout(() => {
    element.classList.remove("diagram-title-bar--find-highlight");
  }, 1500);
}
