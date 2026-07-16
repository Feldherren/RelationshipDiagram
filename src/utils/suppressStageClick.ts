/**
 * One-shot flag so a trailing Konva stage click after a canvas gesture
 * (e.g. bookmark resize) does not clear the selection.
 */
let suppressNextStageClick = false;

export function requestSuppressStageClick(): void {
  suppressNextStageClick = true;
}

export function consumeSuppressStageClick(): boolean {
  if (!suppressNextStageClick) return false;
  suppressNextStageClick = false;
  return true;
}
