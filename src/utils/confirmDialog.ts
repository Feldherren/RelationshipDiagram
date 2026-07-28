import { isTauriApp } from "./tauri";

/**
 * Ok/Cancel confirmation. Uses the native Tauri dialog in the desktop app
 * (WebView2 often ignores window.confirm) and falls back to window.confirm
 * in the browser.
 */
export async function confirmDialog(
  message: string,
  options?: { title?: string },
): Promise<boolean> {
  if (isTauriApp()) {
    try {
      const { confirm } = await import("@tauri-apps/plugin-dialog");
      return await confirm(message, {
        title: options?.title,
        kind: "warning",
      });
    } catch {
      // Plugin/permission failure — fall through to the webview dialog.
    }
  }
  return window.confirm(message);
}
