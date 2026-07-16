import { v4 as uuidv4 } from "uuid";
import i18n from "../i18n";
import type {
  Bounds,
  Box,
  Diagram,
  FloatingText,
  Group,
  Line,
  MembershipAppearance,
  NodeRef,
  Point,
  RGB,
} from "../models/types";
import {
  DEFAULT_FLOATING_TEXT_COLOR,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  MIN_FLOATING_TEXT_FONT_SIZE,
  normalizeMembershipAppearance,
} from "../models/types";

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
    floatingTexts: [],
    viewport: data.viewport,
  };
}

function normalizeFloatingTexts(
  texts: Diagram["floatingTexts"],
): FloatingText[] {
  return (texts ?? []).map((t) => {
    const partial = t as Partial<FloatingText> & {
      id: string;
      position: FloatingText["position"];
    };
    const fontSize =
      typeof partial.fontSize === "number" && Number.isFinite(partial.fontSize)
        ? Math.max(MIN_FLOATING_TEXT_FONT_SIZE, Math.round(partial.fontSize))
        : DEFAULT_FLOATING_TEXT_FONT_SIZE;
    return {
      id: partial.id,
      position: { x: partial.position.x, y: partial.position.y },
      text: typeof partial.text === "string" ? partial.text : "",
      color: partial.color
        ? { ...partial.color }
        : { ...DEFAULT_FLOATING_TEXT_COLOR },
      fontSize,
    };
  });
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
    floatingTexts: normalizeFloatingTexts(data.floatingTexts),
    showGrid: data.showGrid ?? true,
    gridStyle: data.gridStyle === "dots" ? "dots" : "lines",
    appearance: data.appearance,
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

function isTauriApp(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function saveBytesWithTauriDialog(
  bytes: Uint8Array,
  suggestedName: string,
  filter: { name: string; extensions: string[] },
): Promise<boolean> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");

  const path = await save({
    defaultPath: suggestedName,
    filters: [filter],
  });
  if (path === null) return false;

  await writeFile(path, bytes);
  return true;
}

async function saveTextWithTauriDialog(
  content: string,
  suggestedName: string,
  filter: { name: string; extensions: string[] },
): Promise<boolean> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");

  const path = await save({
    defaultPath: suggestedName,
    filters: [filter],
  });
  if (path === null) return false;

  await writeTextFile(path, content);
  return true;
}

export async function saveDiagramToFile(diagram: Diagram, filename?: string): Promise<void> {
  const content = serializeDiagram(diagram);
  const suggestedName = filename ?? getDefaultDiagramFilename(diagram);
  const diagramFilter = {
    name: i18n.t("fileFilter.diagram"),
    extensions: ["rdiagram", "json"],
  };

  if (isTauriApp()) {
    await saveTextWithTauriDialog(content, suggestedName, diagramFilter);
    return;
  }

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker!({
        suggestedName,
        types: [
          {
            description: diagramFilter.name,
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
  triggerAnchorDownload(url, suggestedName);
  URL.revokeObjectURL(url);
}

export async function loadDiagramFromFile(): Promise<Diagram> {
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker!({
        types: [
          {
            description: i18n.t("fileFilter.diagram"),
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

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",", 2);
  if (!header || data === undefined) {
    throw new Error("Invalid data URL");
  }

  const isBase64 = /;base64/i.test(header);
  const mimeMatch = /^data:([^;,]+)/i.exec(header);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";

  if (isBase64) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  return new Blob([decodeURIComponent(data)], { type: mime });
}

function triggerAnchorDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export async function downloadDataUrl(
  dataUrl: string,
  filename: string,
): Promise<boolean> {
  const pngFilter = { name: i18n.t("fileFilter.png"), extensions: ["png"] };

  if (isTauriApp()) {
    const blob = dataUrlToBlob(dataUrl);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return saveBytesWithTauriDialog(bytes, filename, pngFilter);
  }

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker!({
        suggestedName: filename,
        types: [
          {
            description: pngFilter.name,
            accept: { "image/png": [".png"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(dataUrlToBlob(dataUrl));
      await writable.close();
      return true;
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return false;
      throw err;
    }
  }

  triggerAnchorDownload(dataUrl, filename);
  return true;
}
