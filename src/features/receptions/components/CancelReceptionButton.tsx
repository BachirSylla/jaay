"use client";

import { CancelOperationButton } from "@/components/shared/CancelOperationButton";
import { fr } from "@/messages/fr";
import { cancelReception } from "../actions";

const t = fr.receptions;

export function CancelReceptionButton({
  receptionId,
  disabled,
}: {
  receptionId: string;
  disabled?: boolean;
}) {
  return (
    <CancelOperationButton
      label={t.cancelAction}
      title={t.cancelTitle}
      description={t.cancelDescription}
      reasonLabel={t.cancelReason}
      successMessage={t.cancelledToast}
      disabled={disabled}
      onCancel={(reason) => cancelReception(receptionId, reason)}
    />
  );
}
