/** Promise-based host state for the open-external-link confirmation dialog. */

type ResolveFn = (confirmed: boolean) => void;

let pendingUri: string | null = null;
let resolvePending: ResolveFn | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function settle(confirmed: boolean): void {
  const resolve = resolvePending;
  pendingUri = null;
  resolvePending = null;
  notify();
  resolve?.(confirmed);
}

/** Ask the user to confirm opening `uri`. Resolves true if they confirm. */
export function requestExternalLinkConfirm(uri: string): Promise<boolean> {
  if (resolvePending) {
    settle(false);
  }
  return new Promise((resolve) => {
    pendingUri = uri;
    resolvePending = resolve;
    notify();
  });
}

export function getPendingExternalLinkUri(): string | null {
  return pendingUri;
}

export function subscribePendingExternalLink(
  onStoreChange: () => void,
): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function cancelExternalLinkConfirm(): void {
  settle(false);
}

export function acceptExternalLinkConfirm(): void {
  settle(true);
}
