import { useSyncExternalStore } from "react";
import {
  acceptExternalLinkConfirm,
  cancelExternalLinkConfirm,
  getPendingExternalLinkUri,
  subscribePendingExternalLink,
} from "../../utils/externalLinkConfirm";
import { OpenExternalLinkDialog } from "./OpenExternalLinkDialog";

/** Mount once near the app root so canvas chips can await a React confirm dialog. */
export function ExternalLinkConfirmHost() {
  const uri = useSyncExternalStore(
    subscribePendingExternalLink,
    getPendingExternalLinkUri,
    () => null,
  );

  return (
    <OpenExternalLinkDialog
      open={uri != null}
      uri={uri ?? ""}
      onCancel={cancelExternalLinkConfirm}
      onConfirm={acceptExternalLinkConfirm}
    />
  );
}
