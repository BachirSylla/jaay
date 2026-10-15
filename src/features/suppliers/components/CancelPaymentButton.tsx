"use client";

import { Ban } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { fr } from "@/messages/fr";
import { cancelSupplierPayment } from "../payment-actions";

const t = fr.supplierAccount;

export function CancelPaymentButton({ paymentId }: { paymentId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={t.cancelTitle}>
          <Ban aria-hidden="true" />
        </Button>
      }
      title={t.cancelTitle}
      description={t.cancelDescription}
      reasonLabel={t.cancelReason}
      confirmLabel={t.cancelAction}
      onConfirm={async (reason) => {
        const result = await cancelSupplierPayment(paymentId, reason);
        if (result.ok) toast.success(t.cancelledToast);
        else toast.error(errorMessage(result.error));
        return result.ok;
      }}
    />
  );
}
