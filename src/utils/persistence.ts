import { v4 as uuidv4 } from "uuid";
import i18n from "../i18n";
import { getAppPreferences } from "./appPreferences";
import { buildDefaultDialogPath } from "./fileDialogPaths";
import { isTauriApp } from "./tauri";
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
  clampCharacterSize,
  DEFAULT_CHARACTER_SIZE,
  DEFAULT_FLOATING_TEXT_COLOR,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  FLOATING_TEXT_ALIGNS,
  MAX_FLOATING_TEXT_FONT_SIZE,
  MIN_FLOATING_TEXT_FONT_SIZE,
  MIN_FLOATING_TEXT_HEIGHT,
  MIN_FLOATING_TEXT_WIDTH,
  normalizeMembershipAppearance,
  type Character,
  type FloatingTextAlign,
} from "../models/types";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  isCharacterGeometricallyInBox,
  isFloatingTextGeometricallyInBox,
} from "./geometry";

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

function migrateV1NodeRef(ref: NodeRef | { id: string; kind: string }): NodeRef {
  // Legacy v1 "group" endpoints referred to spatial boxes (same id).
  if (ref.kind === "group") {
    return { id: ref.id, kind: "box" };
  }
  if (ref.kind === "character" || ref.kind === "box") {
    return ref as NodeRef;
  }
  return { id: ref.id, kind: "character" };
}

function normalizeNodeRef(ref: NodeRef | { id: string; kind: string }): NodeRef {
  if (ref.kind === "character" || ref.kind === "box" || ref.kind === "group") {
    return { id: ref.id, kind: ref.kind };
  }
  return { id: ref.id, kind: "character" };
}

function migrateV1Lines(lines: Line[]): Line[] {
  return lines.map((line) => ({
    ...line,
    from: migrateV1NodeRef(line.from),
    to: migrateV1NodeRef(line.to),
  }));
}

function normalizeLines(lines: Line[]): Line[] {
  return lines.map((line) => ({
    ...line,
    from: normalizeNodeRef(line.from),
    to: normalizeNodeRef(line.to),
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

  return normalizeDiagram({
    schemaVersion: 3,
    title: data.title,
    subtitle: data.subtitle,
    showHeader: data.showHeader,
    fontFamily: data.fontFamily,
    backgroundColor: data.backgroundColor,
    characters: data.characters,
    lines: migrateV1Lines(data.lines ?? []),
    groups,
    boxes,
    floatingTexts: [],
    viewport: data.viewport,
  });
}

function normalizeFloatingTextAlign(
  value: unknown,
): FloatingTextAlign | undefined {
  if (
    typeof value === "string" &&
    (FLOATING_TEXT_ALIGNS as string[]).includes(value)
  ) {
    return value as FloatingTextAlign;
  }
  return undefined;
}

function normalizeFloatingTextDimension(
  value: unknown,
  min: number,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(min, Math.round(value));
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
        ? Math.min(
            MAX_FLOATING_TEXT_FONT_SIZE,
            Math.max(MIN_FLOATING_TEXT_FONT_SIZE, Math.round(partial.fontSize)),
          )
        : DEFAULT_FLOATING_TEXT_FONT_SIZE;
    const textAlign = normalizeFloatingTextAlign(partial.textAlign);
    const width = normalizeFloatingTextDimension(
      partial.width,
      MIN_FLOATING_TEXT_WIDTH,
    );
    const height = normalizeFloatingTextDimension(
      partial.height,
      MIN_FLOATING_TEXT_HEIGHT,
    );
    return {
      id: partial.id,
      position: { x: partial.position.x, y: partial.position.y },
      text: typeof partial.text === "string" ? partial.text : "",
      color: partial.color
        ? { ...partial.color }
        : { ...DEFAULT_FLOATING_TEXT_COLOR },
      fontSize,
      ...(textAlign ? { textAlign } : {}),
      ...(width != null ? { width } : {}),
      ...(height != null ? { height } : {}),
    };
  });
}

function normalizeCharacters(
  characters: Diagram["characters"],
): Character[] {
  return (characters ?? []).map((c) => {
    const link =
      typeof c.link === "string" && c.link.trim().length > 0
        ? c.link.trim()
        : undefined;
    return {
      ...c,
      size:
        typeof c.size === "number" && Number.isFinite(c.size)
          ? clampCharacterSize(c.size)
          : DEFAULT_CHARACTER_SIZE,
      link,
    };
  });
}

function normalizeDiagramId(id: unknown): string {
  if (typeof id === "string" && id.trim().length > 0) {
    return id.trim();
  }
  return uuidv4();
}

function normalizeDiagram(
  data: Omit<Diagram, "schemaVersion" | "id"> & {
    schemaVersion?: number;
    id?: string;
  },
): Diagram {
  const fontFamily = data.fontFamily ?? DEFAULT_DIAGRAM_FONT;
  const characters = normalizeCharacters(data.characters);
  const floatingTexts = normalizeFloatingTexts(data.floatingTexts);

  return {
    ...data,
    schemaVersion: 3,
    id: normalizeDiagramId(data.id),
    characters,
    lines: normalizeLines(data.lines ?? []),
    groups: (data.groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      memberCharacterIds: [...(g.memberCharacterIds ?? [])],
      appearance: normalizeMembershipAppearance(
        g.appearance as Partial<MembershipAppearance> | undefined,
        { r: 100, g: 140, b: 100 },
      ),
      ...(g.hubPosition &&
      typeof g.hubPosition.x === "number" &&
      typeof g.hubPosition.y === "number"
        ? { hubPosition: { x: g.hubPosition.x, y: g.hubPosition.y } }
        : {}),
    })),
    boxes: (data.boxes ?? []).map((b) => {
      const collapsed = b.collapsed ?? false;
      const box: Box = {
        id: b.id,
        name: b.name,
        borderColor: b.borderColor,
        collapsed,
        collapsedPosition: b.collapsedPosition,
        anchorPosition: b.anchorPosition,
        bounds: b.bounds,
      };
      if (!collapsed) return box;

      // Prefer persisted freeze; backfill from geometry for older files.
      box.containedCharacterIds = Array.isArray(b.containedCharacterIds)
        ? [...b.containedCharacterIds]
        : characters
            .filter((c) => isCharacterGeometricallyInBox(c, box))
            .map((c) => c.id);
      box.containedFloatingTextIds = Array.isArray(b.containedFloatingTextIds)
        ? [...b.containedFloatingTextIds]
        : floatingTexts
            .filter((t) =>
              isFloatingTextGeometricallyInBox(t, box, fontFamily),
            )
            .map((t) => t.id);
      return box;
    }),
    floatingTexts,
    showGrid: data.showGrid ?? true,
    gridStyle: data.gridStyle === "dots" ? "dots" : "lines",
    appearance: data.appearance,
    bookmarks: data.bookmarks,
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

  if (data.schemaVersion === 2 || data.schemaVersion === 3) {
    const diagram = data as Diagram;
    if (
      !Array.isArray(diagram.characters) ||
      !Array.isArray(diagram.lines) ||
      !Array.isArray(diagram.groups) ||
      !Array.isArray(diagram.boxes)
    ) {
      throw new Error("Invalid diagram file format");
    }
    return normalizeDiagram(diagram);
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

async function saveBytesWithTauriDialog(
  bytes: Uint8Array,
  suggestedName: string,
  filter: { name: string; extensions: string[] },
  directory?: string | null,
): Promise<boolean> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");

  const path = await save({
    defaultPath: buildDefaultDialogPath(directory, suggestedName),
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
  directory?: string | null,
  defaultPathOverride?: string,
): Promise<string | null> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");

  const path = await save({
    defaultPath:
      defaultPathOverride ??
      buildDefaultDialogPath(directory, suggestedName),
    filters: [filter],
  });
  if (path === null) return null;

  await writeTextFile(path, content);
  return path;
}

export type DiagramSaveResult = {
  cancelled: boolean;
  filePath?: string;
  fileHandle?: FileSystemFileHandle;
  /** True when the path was chosen via a native dialog this session (Tauri fs scope). */
  pathScopeGranted?: boolean;
};

export type DiagramLoadResult = {
  diagram: Diagram;
  filePath?: string;
  fileHandle?: FileSystemFileHandle;
  pathScopeGranted?: boolean;
};

async function writeDiagramToTauriPath(
  content: string,
  path: string,
): Promise<void> {
  if (content.length < 2) {
    throw new Error("Refusing to write empty diagram content");
  }
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(path, content);
}

async function writeDiagramToFileHandle(
  content: string,
  handle: FileSystemFileHandle,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function saveDiagramToFile(
  diagram: Diagram,
  options?: {
    filename?: string;
    filePath?: string;
    fileHandle?: FileSystemFileHandle;
    /** When false, Tauri must use the save dialog to acquire fs scope for the path. */
    pathScopeGranted?: boolean;
  },
): Promise<DiagramSaveResult> {
  const content = serializeDiagram(diagram);
  if (content.length < 2) {
    throw new Error("Refusing to save empty diagram content");
  }
  const suggestedName =
    options?.filename ?? getDefaultDiagramFilename(diagram);
  const diagramFilter = {
    name: i18n.t("fileFilter.diagram"),
    extensions: ["rdiagram", "json"],
  };

  if (isTauriApp()) {
    const { defaultDiagramDirectory } = getAppPreferences();
    const dialogDefaultPath =
      options?.filePath ??
      buildDefaultDialogPath(defaultDiagramDirectory, suggestedName);

    if (options?.filePath && options.pathScopeGranted) {
      try {
        await writeDiagramToTauriPath(content, options.filePath);
        return {
          cancelled: false,
          filePath: options.filePath,
          pathScopeGranted: true,
        };
      } catch (err) {
        console.warn("Direct save failed, falling back to save dialog:", err);
      }
    }

    const path = await saveTextWithTauriDialog(
      content,
      suggestedName,
      diagramFilter,
      defaultDiagramDirectory,
      dialogDefaultPath,
    );
    if (path === null) return { cancelled: true };
    return { cancelled: false, filePath: path, pathScopeGranted: true };
  }

  if (options?.fileHandle) {
    try {
      await writeDiagramToFileHandle(content, options.fileHandle);
      return {
        cancelled: false,
        fileHandle: options.fileHandle,
        pathScopeGranted: true,
      };
    } catch {
      // Fall through to picker if the handle is no longer writable.
    }
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
      await writeDiagramToFileHandle(content, handle);
      return { cancelled: false, fileHandle: handle, pathScopeGranted: true };
    } catch (err) {
      if ((err as DOMException).name === "AbortError") {
        return { cancelled: true };
      }
      throw err;
    }
  }

  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  triggerAnchorDownload(url, suggestedName);
  URL.revokeObjectURL(url);
  return { cancelled: false };
}

export async function loadDiagramFromFile(): Promise<DiagramLoadResult> {
  const diagramFilter = {
    name: i18n.t("fileFilter.diagram"),
    extensions: ["rdiagram", "json"],
  };

  if (isTauriApp()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const { defaultDiagramDirectory } = getAppPreferences();

    const path = await open({
      multiple: false,
      defaultPath: defaultDiagramDirectory?.trim() || undefined,
      filters: [diagramFilter],
    });
    if (path === null) {
      throw new Error("cancelled");
    }
    if (Array.isArray(path)) {
      throw new Error("Invalid diagram file selection");
    }

    const text = await readTextFile(path);
    return { diagram: parseDiagram(text), filePath: path, pathScopeGranted: true };
  }

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
      return { diagram: parseDiagram(text), fileHandle: handle, pathScopeGranted: true };
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
        resolve({ diagram: parseDiagram(text) });
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
    const { defaultExportDirectory } = getAppPreferences();
    return saveBytesWithTauriDialog(
      bytes,
      filename,
      pngFilter,
      defaultExportDirectory,
    );
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
