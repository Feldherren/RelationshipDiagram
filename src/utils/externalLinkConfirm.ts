/** Promise-based host state for the open-external-link confirmation dialog. */

export interface ExternalLinkConfirmResult {
  confirmed: boolean;
  /** When true with confirmed, remember to skip prompts for this diagram locally. */
  skipFuturePrompts: boolean;
}

type ResolveFn = (result: ExternalLinkConfirmResult) => void;

let pendingUri: string | null = null;
let resolvePending: ResolveFn | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function settle(result: ExternalLinkConfirmResult): void {
  const resolve = resolvePending;
  pendingUri = null;
  resolvePending = null;
  notify();
  resolve?.(result);
}

/** Ask the user to confirm opening `uri`. */
export function requestExternalLinkConfirm(
  uri: string,
): Promise<ExternalLinkConfirmResult> {
  if (resolvePending) {
    settle({ confirmed: false, skipFuturePrompts: false });
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
  settle({ confirmed: false, skipFuturePrompts: false });
}

export function acceptExternalLinkConfirm(skipFuturePrompts = false): void {
  settle({ confirmed: true, skipFuturePrompts });
}
