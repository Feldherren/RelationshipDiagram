import { getDiagramLocalPreferences, setDiagramLocalPreferences } from "./diagramLocalPreferences";
import { requestExternalLinkConfirm } from "./externalLinkConfirm";
import { isHttpUri, isValidUri, normalizeUriForOpen } from "./uri";
import { isTauriApp } from "./tauri";
import { useDiagramStore } from "../store/diagramStore";

/** Delegate custom schemes to the OS handler (e.g. obsidian:// → Obsidian). */
function openCustomProtocolUri(uri: string): void {
  const link = document.createElement("a");
  link.href = uri;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function openExternalUrlNow(uri: string): Promise<void> {
  if (isTauriApp()) {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(uri);
      return;
    } catch {
      // Permission or handler failure — fall through to the webview path.
    }
  }

  if (isHttpUri(uri)) {
    window.open(uri, "_blank", "noopener,noreferrer");
  } else {
    openCustomProtocolUri(uri);
  }
}

export async function openExternalUrl(raw: string): Promise<void> {
  const uri = normalizeUriForOpen(raw);
  if (!isValidUri(uri)) return;

  const diagramId = useDiagramStore.getState().diagramId;
  const { confirmBeforeOpenExternalLink } =
    getDiagramLocalPreferences(diagramId);

  if (confirmBeforeOpenExternalLink) {
    const result = await requestExternalLinkConfirm(uri);
    if (!result.confirmed) return;
    if (result.skipFuturePrompts) {
      setDiagramLocalPreferences(diagramId, {
        confirmBeforeOpenExternalLink: false,
      });
    }
  }

  await openExternalUrlNow(uri);
}
