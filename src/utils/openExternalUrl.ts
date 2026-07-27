import { isHttpUri, isValidUri, normalizeUriForOpen } from "./uri";
import { isTauriApp } from "./tauri";

/** Delegate custom schemes to the OS handler (e.g. obsidian:// → Obsidian). */
function openCustomProtocolUri(uri: string): void {
  const link = document.createElement("a");
  link.href = uri;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function openExternalUrl(raw: string): Promise<void> {
  const uri = normalizeUriForOpen(raw);
  if (!isValidUri(uri)) return;

  if (isTauriApp()) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(uri);
      return;
    } catch {
      // Permission or handler failure — fall through to the webview anchor path.
    }
  }

  if (isHttpUri(uri)) {
    window.open(uri, "_blank", "noopener,noreferrer");
  } else {
    openCustomProtocolUri(uri);
  }
}
