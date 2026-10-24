"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/shared/Field";
import { Money } from "@/components/shared/Money";
import { PriceInput } from "@/components/shared/PriceInput";
import { ProductThumb } from "@/components/shared/ProductThumb";
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
import { formatDate, formatMoney, toDateInputValue } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";
import { createSupplierPayment } from "../payment-actions";
import type { SoldBagLine } from "../queries";
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

/** One unpaid bag (a sale line of 2 bags gives 2 rows: each bag is paid in full or not). */
type BagRow = SoldBagLine & { key: string };

function bagRows(unpaid: SoldBagLine[]): BagRow[] {
  return unpaid.flatMap((line) =>
    Array.from({ length: line.unpaid }, (_, index) => ({
      ...line,
      key: `${line.allocationId}:${index}`,
    })),
  );
}

/**
 * Supplier payment: the owner ticks the sold bags paid (the amount follows); an amount above
 * the bags ticked, or without any bag, is an advance.
 */
export function SupplierPaymentDialog({
  supplierId,
  balance,
  unpaid,
}: {
  supplierId: string;
  balance: number;
  /** Sold bags not paid yet, oldest sale first. */
  unpaid: SoldBagLine[];
}) {
  const { shop } = useShop();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const rows = bagRows(unpaid);
  const defaults: FormInput = {
    amount: null,
    method: "wave",
    paidAt: toDateInputValue(),
    note: "",
    items: [],
  };
  const form = useForm<FormInput, unknown, SupplierPaymentValues>({
    resolver: zodResolver(supplierPaymentSchema),
    defaultValues: defaults,
  });
  const amount = useWatch({ control: form.control, name: "amount" }) ?? 0;
  const selectedTotal = rows
    .filter((row) => selected.has(row.key))
    .reduce((sum, row) => sum + row.unitCost, 0);
  const advance = amount - selectedTotal;

  const select = (next: Set<string>) => {
    setSelected(next);
    const total = rows
      .filter((row) => next.has(row.key))
      .reduce((sum, row) => sum + row.unitCost, 0);
    form.setValue("amount", total > 0 ? total : null);
  };

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    if (values.amount < selectedTotal) {
      setFormError(fill(t.amountTooLow, { amount: formatMoney(selectedTotal) }));
      return;
    }
    const quantities = new Map<string, number>();
    for (const row of rows) {
      if (selected.has(row.key)) {
        quantities.set(row.allocationId, (quantities.get(row.allocationId) ?? 0) + 1);
      }
    }
    const items = [...quantities].map(([allocationId, quantity]) => ({ allocationId, quantity }));
    startTransition(async () => {
      const result = await createSupplierPayment(shop.id, supplierId, { ...values, items });
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
          setSelected(new Set());
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
      <DialogContent className="flex max-h-[92dvh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t.paymentTitle}</DialogTitle>
          <DialogDescription>{t.bagsHint}</DialogDescription>
        </DialogHeader>
        <form
          id="supplier-payment"
          onSubmit={onSubmit}
          noValidate
          className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1"
        >
          <section className="flex flex-col gap-2" aria-labelledby="payment-bags">
            <div className="flex items-center justify-between gap-2">
              <h3 id="payment-bags" className="text-base">
                {t.bagsTitle}
              </h3>
              {rows.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => select(new Set(rows.map((row) => row.key)))}
                >
                  {t.payAll}
                </Button>
              ) : null}
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noUnpaid}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line">
                {rows.map((row) => (
                  <li key={row.key}>
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(row.key)}
                        onChange={(event) => {
                          const next = new Set(selected);
                          if (event.target.checked) next.add(row.key);
                          else next.delete(row.key);
                          select(next);
                        }}
                        className="size-5 shrink-0 accent-cognac"
                      />
                      <ProductThumb
                        name={row.name}
                        color={row.color}
                        photoPath={row.photoPath ?? undefined}
                        size={40}
                        className="size-10 shrink-0"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold">{row.name}</span>
                        <span className="text-[13px] text-muted-foreground">
                          {fill(t.soldOn, { n: row.saleNumber, date: formatDate(row.soldAt) })}
                        </span>
                      </span>
                      <Money amount={row.unitCost} size="sm" />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Controller
            control={form.control}
            name="amount"
            render={({ field, fieldState }) => (
              <Field
                label={t.amount}
                htmlFor="payment-amount"
                error={fieldState.error ? fr.errors.INVALID_AMOUNT : undefined}
                hint={
                  advance > 0 && selectedTotal > 0
                    ? fill(t.advancePart, { amount: formatMoney(advance) })
                    : undefined
                }
              >
                <PriceInput
                  id="payment-amount"
                  size="lg"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </Field>
            )}
          />
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
