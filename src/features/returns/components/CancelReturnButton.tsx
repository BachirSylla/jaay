"use client";

import { CancelOperationButton } from "@/components/shared/CancelOperationButton";
import { fr } from "@/messages/fr";
import { cancelReturn } from "../actions";

const t = fr.returns;

export function CancelReturnButton({ returnId }: { returnId: string }) {
  return (
    <CancelOperationButton
      label={t.cancelAction}
      title={t.cancelTitle}
      description={t.cancelDescription}
      reasonLabel={t.cancelReason}
      successMessage={t.cancelledToast}
      onCancel={(reason) => cancelReturn(returnId, reason)}
    />
  );
}
