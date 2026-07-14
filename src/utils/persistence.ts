import { v4 as uuidv4 } from "uuid";
import type {
  Bounds,
  Box,
  Diagram,
  Group,
  Line,
  MembershipAppearance,
  NodeRef,
  Point,
  RGB,
} from "../models/types";
import { normalizeMembershipAppearance } from "../models/types";

export function serializeDiagram(diagram: Diagram): string {
  return JSON.stringify(diagram, null, 2);
}

interface LegacyV1Group {
  id: string;
  name: string;
  memberCharacterIds?: string[];
  collapsed?: boolean;
  collapsedPosition?: Point;
  anchorPosition?: Point;
  bounds?: Bounds;
  borderColor: RGB;
}

interface LegacyV1Diagram {
  schemaVersion: 1;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  fontFamily?: string;
  backgroundColor?: RGB | null;
  characters: Diagram["characters"];
  lines: Line[];
  groups: LegacyV1Group[];
  viewport?: Diagram["viewport"];
}

function migrateNodeRef(ref: NodeRef | { id: string; kind: string }): NodeRef {
  if (ref.kind === "group") {
    return { id: ref.id, kind: "box" };
  }
  if (ref.kind === "character" || ref.kind === "box") {
    return ref as NodeRef;
  }
  return { id: ref.id, kind: "character" };
}

function migrateLines(lines: Line[]): Line[] {
  return lines.map((line) => ({
    ...line,
    from: migrateNodeRef(line.from),
    to: migrateNodeRef(line.to),
  }));
}

function migrateV1ToV2(data: LegacyV1Diagram): Diagram {
  const boxes: Box[] = [];
  const groups: Group[] = [];

  for (const g of data.groups ?? []) {
    boxes.push({
      id: g.id,
      name: g.name,
      borderColor: g.borderColor,
      collapsed: g.collapsed ?? false,
      collapsedPosition: g.collapsedPosition,
      anchorPosition: g.anchorPosition,
      bounds: g.bounds,
    });
    groups.push({
      id: uuidv4(),
      name: g.name,
      memberCharacterIds: [...(g.memberCharacterIds ?? [])],
      appearance: normalizeMembershipAppearance({
        backgroundColor: { ...g.borderColor },
        borderColor: { ...g.borderColor },
      }),
    });
  }

  return {
    schemaVersion: 2,
    title: data.title,
    subtitle: data.subtitle,
    showHeader: data.showHeader,
    fontFamily: data.fontFamily,
    backgroundColor: data.backgroundColor,
    characters: data.characters,
    lines: migrateLines(data.lines ?? []),
    groups,
    boxes,
    viewport: data.viewport,
  };
}

function normalizeV2(data: Diagram): Diagram {
  return {
    ...data,
    schemaVersion: 2,
    characters: data.characters,
    lines: migrateLines(data.lines ?? []),
    groups: (data.groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      memberCharacterIds: [...(g.memberCharacterIds ?? [])],
      appearance: normalizeMembershipAppearance(
        g.appearance as Partial<MembershipAppearance> | undefined,
        { r: 100, g: 140, b: 100 },
      ),
    })),
    boxes: (data.boxes ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      borderColor: b.borderColor,
      collapsed: b.collapsed ?? false,
      collapsedPosition: b.collapsedPosition,
      anchorPosition: b.anchorPosition,
      bounds: b.bounds,
    })),
  };
}

export function parseDiagram(json: string): Diagram {
  const data = JSON.parse(json) as { schemaVersion?: number };

  if (data.schemaVersion === 1) {
    const v1 = data as LegacyV1Diagram;
    if (
      !Array.isArray(v1.characters) ||
      !Array.isArray(v1.lines) ||
      !Array.isArray(v1.groups)
    ) {
      throw new Error("Invalid diagram file format");
    }
    return migrateV1ToV2(v1);
  }

  if (data.schemaVersion === 2) {
    const v2 = data as Diagram;
    if (
      !Array.isArray(v2.characters) ||
      !Array.isArray(v2.lines) ||
      !Array.isArray(v2.groups) ||
      !Array.isArray(v2.boxes)
    ) {
      throw new Error("Invalid diagram file format");
    }
    return normalizeV2(v2);
  }

  throw new Error(`Unsupported schema version: ${data.schemaVersion}`);
}

function getDefaultFilenameFromTitle(
  title: string | undefined,
  extension: string,
  fallback: string,
): string {
  const raw = title?.trim();
  if (!raw) return fallback;

  const sanitized = raw
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!sanitized) return fallback;

  return `${sanitized}.${extension}`;
}

function getDefaultDiagramFilename(diagram: Diagram): string {
  return getDefaultFilenameFromTitle(
    diagram.title,
    "rdiagram",
    "diagram.rdiagram",
  );
}

export function getDefaultExportFilename(title?: string): string {
  return getDefaultFilenameFromTitle(
    title,
    "png",
    "relationship-diagram.png",
  );
}

export async function saveDiagramToFile(diagram: Diagram, filename?: string): Promise<void> {
  const content = serializeDiagram(diagram);
  const suggestedName = filename ?? getDefaultDiagramFilename(diagram);

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker!({
        suggestedName,
        types: [
          {
            description: "Relationship Diagram",
            accept: { "application/json": [".rdiagram", ".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return;
      throw err;
    }
  }

  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadDiagramFromFile(): Promise<Diagram> {
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker!({
        types: [
          {
            description: "Relationship Diagram",
            accept: { "application/json": [".rdiagram", ".json"] },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      return parseDiagram(text);
    } catch (err) {
      if ((err as DOMException).name === "AbortError") {
        throw new Error("cancelled");
      }
      throw err;
    }
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".rdiagram,.json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("cancelled"));
        return;
      }
      try {
        const text = await file.text();
        resolve(parseDiagram(text));
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
