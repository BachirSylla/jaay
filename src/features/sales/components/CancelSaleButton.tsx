"use client";

import { CancelOperationButton } from "@/components/shared/CancelOperationButton";
import { fr } from "@/messages/fr";
import { cancelSale } from "../actions";

const t = fr.sales;

export function CancelSaleButton({ saleId }: { saleId: string }) {
  return (
    <CancelOperationButton
      label={t.cancelAction}
      title={t.cancelTitle}
      description={t.cancelDescription}
      reasonLabel={t.cancelReason}
      successMessage={t.cancelledToast}
      onCancel={(reason) => cancelSale(saleId, reason)}
    />
  );
}
