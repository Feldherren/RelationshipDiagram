import type { Diagram } from "../models/types";

export function serializeDiagram(diagram: Diagram): string {
  return JSON.stringify(diagram, null, 2);
}

export function parseDiagram(json: string): Diagram {
  const data = JSON.parse(json) as Diagram;
  if (data.schemaVersion !== 1) {
    throw new Error(`Unsupported schema version: ${data.schemaVersion}`);
  }
  if (!Array.isArray(data.characters) || !Array.isArray(data.lines) || !Array.isArray(data.groups)) {
    throw new Error("Invalid diagram file format");
  }
  return data;
}

export async function saveDiagramToFile(diagram: Diagram, filename?: string): Promise<void> {
  const content = serializeDiagram(diagram);
  const suggestedName = filename ?? "diagram.rdiagram";

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

export async function estimateDataUrlSize(dataUrl: string): Promise<number> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return blob.size;
}
