"use client";

import { Ban } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { errorMessage, type ActionResult } from "@/lib/errors";

/** Cancels an operation (reception, sale, return, payment) with a mandatory reason. */
export function CancelOperationButton({
  label,
  title,
  description,
  reasonLabel,
  successMessage,
  onCancel,
  disabled,
}: {
  label: string;
  title: string;
  description: string;
  reasonLabel: string;
  successMessage: string;
  onCancel: (reason: string) => Promise<ActionResult>;
  disabled?: boolean;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" disabled={disabled}>
          <Ban data-icon="inline-start" aria-hidden="true" />
          {label}
        </Button>
      }
      title={title}
      description={description}
      reasonLabel={reasonLabel}
      confirmLabel={label}
      onConfirm={async (reason) => {
        const result = await onCancel(reason);
        if (result.ok) toast.success(successMessage);
        else toast.error(errorMessage(result.error));
        return result.ok;
      }}
    />
  );
}
