import { v4 as uuidv4 } from "uuid";
import type {
  Box,
  Character,
  DiagramLayer,
  FloatingText,
  Group,
  Line,
} from "../models/types";

export const DEFAULT_LAYER_NAME = "Layer 1";

export function createDefaultLayer(name = DEFAULT_LAYER_NAME): DiagramLayer {
  return {
    id: uuidv4(),
    name,
    visible: true,
  };
}

/** Ensure at least one layer exists; returns layers + a guaranteed active id. */
export function ensureLayers(
  layers: DiagramLayer[] | undefined,
  activeLayerId?: string | null,
): { layers: DiagramLayer[]; activeLayerId: string } {
  const normalized = normalizeLayers(layers);
  const list = normalized.length > 0 ? normalized : [createDefaultLayer()];
  const active =
    activeLayerId && list.some((l) => l.id === activeLayerId)
      ? activeLayerId
      : list[list.length - 1].id;
  return { layers: list, activeLayerId: active };
}

export function normalizeLayers(raw: unknown): DiagramLayer[] {
  if (!Array.isArray(raw)) return [];
  const result: DiagramLayer[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const l = entry as Record<string, unknown>;
    if (typeof l.id !== "string" || l.id.trim().length === 0) continue;
    const name =
      typeof l.name === "string" && l.name.trim().length > 0
        ? l.name.trim().slice(0, 80)
        : DEFAULT_LAYER_NAME;
    result.push({
      id: l.id,
      name,
      visible: l.visible !== false,
    });
  }
  return result;
}

export function resolveActiveLayerId(
  layers: DiagramLayer[],
  activeLayerId?: string | null,
): string {
  if (layers.length === 0) {
    throw new Error("Diagram must have at least one layer");
  }
  if (activeLayerId && layers.some((l) => l.id === activeLayerId)) {
    return activeLayerId;
  }
  return layers[layers.length - 1].id;
}

export function isLayerVisible(
  layers: DiagramLayer[],
  layerId: string,
): boolean {
  const layer = layers.find((l) => l.id === layerId);
  return layer?.visible !== false;
}

export function layerHasObjects(
  layerId: string,
  state: {
    characters: Character[];
    lines: Line[];
    groups: Group[];
    boxes: Box[];
    floatingTexts: FloatingText[];
  },
): boolean {
  return (
    state.characters.some((c) => c.layerId === layerId) ||
    state.lines.some((l) => l.layerId === layerId) ||
    state.groups.some((g) => g.layerId === layerId) ||
    state.boxes.some((b) => b.layerId === layerId) ||
    state.floatingTexts.some((t) => t.layerId === layerId)
  );
}

export function countLayerObjects(
  layerId: string,
  state: {
    characters: Character[];
    lines: Line[];
    groups: Group[];
    boxes: Box[];
    floatingTexts: FloatingText[];
  },
): number {
  return (
    state.characters.filter((c) => c.layerId === layerId).length +
    state.lines.filter((l) => l.layerId === layerId).length +
    state.groups.filter((g) => g.layerId === layerId).length +
    state.boxes.filter((b) => b.layerId === layerId).length +
    state.floatingTexts.filter((t) => t.layerId === layerId).length
  );
}

/** Reorder array by moving index `from` to index `to` (inclusive). */
export function moveArrayItem<T>(items: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    from === to
  ) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
