import { isTauriApp } from "./tauri";

export function joinDialogPath(directory: string, filename: string): string {
  const trimmedDir = directory.replace(/[\\/]+$/, "");
  const separator = /\\/.test(trimmedDir) ? "\\" : "/";
  return `${trimmedDir}${separator}${filename}`;
}

export function buildDefaultDialogPath(
  directory: string | null | undefined,
  filename: string,
): string {
  const dir = directory?.trim();
  if (!dir) return filename;
  return joinDialogPath(dir, filename);
}

export async function pickDirectory(
  currentDirectory?: string | null,
): Promise<string | null> {
  if (!isTauriApp()) return null;

  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath: currentDirectory?.trim() || undefined,
  });

  return typeof selected === "string" ? selected : null;
}
