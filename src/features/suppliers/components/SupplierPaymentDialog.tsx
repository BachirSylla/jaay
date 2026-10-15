"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/shared/Field";
import { Money } from "@/components/shared/Money";
import { PriceInput } from "@/components/shared/PriceInput";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
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
import { Textarea } from "@/components/ui/textarea";
import { useShop } from "@/features/shop/shop-context";
import { errorMessage } from "@/lib/errors";
import { toDateInputValue } from "@/lib/format";
import { fr } from "@/messages/fr";
import { createSupplierPayment } from "../payment-actions";
import {
  supplierPaymentSchema,
  type SupplierPaymentInput,
  type SupplierPaymentValues,
} from "../schemas";

const t = fr.supplierAccount;
const methods = (["wave", "orange_money", "cash"] as const).map((value) => ({
  value,
  label: fr.paymentMethods[value],
}));

type FormInput = SupplierPaymentInput;

export function SupplierPaymentDialog({
  supplierId,
  balance,
}: {
  supplierId: string;
  balance: number;
}) {
  const { shop } = useShop();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const defaults: FormInput = {
    amount: balance > 0 ? balance : null,
    method: "wave",
    paidAt: toDateInputValue(),
    note: "",
  };
  const form = useForm<FormInput, unknown, SupplierPaymentValues>({
    resolver: zodResolver(supplierPaymentSchema),
    defaultValues: defaults,
  });
  const amount = useWatch({ control: form.control, name: "amount" }) ?? 0;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createSupplierPayment(shop.id, supplierId, values);
      if (!result.ok) return setFormError(errorMessage(result.error));
      toast.success(t.created);
      setOpen(false);
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFormError(null);
          form.reset(defaults);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Banknote data-icon="inline-start" aria-hidden="true" />
          {t.pay}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t.paymentTitle}</DialogTitle>
          <DialogDescription>{t.paymentDescription}</DialogDescription>
        </DialogHeader>
        <form id="supplier-payment" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="amount"
            render={({ field, fieldState }) => (
              <Field
                label={t.amount}
                htmlFor="payment-amount"
                error={fieldState.error ? fr.errors.INVALID_AMOUNT : undefined}
              >
                <PriceInput
                  id="payment-amount"
                  size="lg"
                  value={field.value}
                  onValueChange={field.onChange}
                  autoFocus
                />
              </Field>
            )}
          />
          {balance > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="-mt-2 self-start"
              onClick={() => form.setValue("amount", balance)}
            >
              {t.payAll}
            </Button>
          ) : null}
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-muted/60 p-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t.balanceBefore}</dt>
              <dd>
                <Money amount={balance} size="md" />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.balanceAfter}</dt>
              <dd>
                <Money
                  amount={balance - amount}
                  size="md"
                  variant={balance - amount < 0 ? "negative" : "default"}
                />
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t.method}</span>
            <Controller
              control={form.control}
              name="method"
              render={({ field }) => (
                <SegmentedControl
                  aria-label={t.method}
                  options={methods}
                  value={field.value}
                  onValueChange={field.onChange}
                  className="w-full"
                />
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.date} htmlFor="payment-date">
              <Input
                id="payment-date"
                type="date"
                max={toDateInputValue()}
                {...form.register("paidAt")}
              />
            </Field>
            <Field label={t.note} htmlFor="payment-note" optional={fr.common.optional}>
              <Textarea
                id="payment-note"
                rows={1}
                className="min-h-12"
                {...form.register("note")}
              />
            </Field>
          </div>
          {formError ? (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
            >
              {formError}
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            {fr.common.cancel}
          </Button>
          <Button type="submit" form="supplier-payment" disabled={pending}>
            {pending ? fr.common.saving : t.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
