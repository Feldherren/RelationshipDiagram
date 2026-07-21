/** Ephemeral hover tooltip for membership chips (not part of diagram state). */

export interface MembershipChipTooltip {
  id: string;
  text: string;
  /** World-space centre of the chip. */
  chipX: number;
  chipY: number;
}

let tooltip: MembershipChipTooltip | null = null;
const listeners = new Set<() => void>();

export function setMembershipChipTooltip(
  next: MembershipChipTooltip | null,
): void {
  const same =
    tooltip === next ||
    (tooltip != null &&
      next != null &&
      tooltip.id === next.id &&
      tooltip.text === next.text &&
      tooltip.chipX === next.chipX &&
      tooltip.chipY === next.chipY) ||
    (tooltip == null && next == null);
  if (same) return;
  tooltip = next;
  for (const listener of listeners) listener();
}

export function getMembershipChipTooltip(): MembershipChipTooltip | null {
  return tooltip;
}

export function subscribeMembershipChipTooltip(
  onStoreChange: () => void,
): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}
