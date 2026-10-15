"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fr } from "@/messages/fr";

type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  /** When set, a reason must be typed before confirming (cancellations). */
  reasonLabel?: string;
  destructive?: boolean;
  /** Return true to close the dialog. */
  onConfirm: (reason: string) => Promise<boolean>;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  reasonLabel,
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const reasonId = useId();
  const reasonMissing = Boolean(reasonLabel) && reason.trim().length < 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setReason("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {reasonLabel ? (
          <Field label={reasonLabel} htmlFor={reasonId}>
            <Input
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              autoFocus
              maxLength={200}
            />
          </Field>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            {fr.common.cancel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending || reasonMissing}
            onClick={() =>
              startTransition(async () => {
                if (await onConfirm(reason.trim())) setOpen(false);
              })
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
