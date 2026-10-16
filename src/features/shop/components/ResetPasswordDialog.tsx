"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
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
import { errorMessage } from "@/lib/errors";
import { fr } from "@/messages/fr";
import { resetMemberPassword } from "../actions";
import { useShop } from "../shop-context";

const t = fr.members;

/** Owner/admin: new temporary password for a member, shown once to be copied. */
export function ResetPasswordDialog({ userId, name }: { userId: string; name: string }) {
  const { shop } = useShop();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () =>
    startTransition(async () => {
      setError(null);
      const result = await resetMemberPassword(shop.id, userId);
      if (result.ok) setPassword(result.data.password);
      else setError(errorMessage(result.error));
    });

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // The password stays visible and selectable.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPassword(null);
          setError(null);
          setCopied(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${t.resetPassword} — ${name}`}>
          <KeyRound aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {password ? t.resetDone : t.resetTitle}
          </DialogTitle>
          <DialogDescription>{password ? t.resetDoneHint : t.resetDescription}</DialogDescription>
        </DialogHeader>
        {password ? (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted/50 py-1 pr-1 pl-3.5">
            <code
              className="min-w-0 flex-1 truncate font-mono text-lg tracking-wide"
              aria-label={t.resetDone}
            >
              {password}
            </code>
            <Button type="button" variant="ghost" size="sm" onClick={copy}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? fr.common.copied : fr.common.copy}
            </Button>
          </div>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter>
          {password ? (
            <Button onClick={() => setOpen(false)}>{fr.common.close}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                {fr.common.cancel}
              </Button>
              <Button variant="destructive" onClick={reset} disabled={pending}>
                {t.resetConfirm}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
