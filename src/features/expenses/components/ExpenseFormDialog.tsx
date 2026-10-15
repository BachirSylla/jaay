"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ChipGroup } from "@/components/shared/ChipGroup";
import { Field } from "@/components/shared/Field";
import { PriceInput } from "@/components/shared/PriceInput";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useShop } from "@/features/shop/shop-context";
import type { Supplier } from "@/features/suppliers/types";
import { errorMessage } from "@/lib/errors";
import { toDateInputValue } from "@/lib/format";
import { fr } from "@/messages/fr";
import { createExpense } from "../actions";
import {
  EXPENSE_CATEGORIES,
  expenseSchema,
  type ExpenseInput,
  type ExpenseValues,
} from "../schemas";

const t = fr.expenses;
const NONE = "none";
const categoryChips = EXPENSE_CATEGORIES.map((value) => ({ value, label: t.categories[value] }));

export function ExpenseFormDialog({ suppliers }: { suppliers: Supplier[] }) {
  const { shop } = useShop();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const defaults: ExpenseInput = {
    category: "delivery",
    amount: null,
    spentAt: toDateInputValue(),
    supplierId: null,
    note: "",
  };
  const form = useForm<ExpenseInput, unknown, ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: defaults,
  });
  const activeSuppliers = suppliers.filter((s) => !s.archivedAt);

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createExpense(shop.id, values);
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
          <Plus data-icon="inline-start" aria-hidden="true" />
          {t.add}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t.add}</DialogTitle>
          <DialogDescription className="sr-only">{t.subtitle}</DialogDescription>
        </DialogHeader>
        <form id="expense-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t.category}</span>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <ChipGroup
                  aria-label={t.category}
                  chips={categoryChips}
                  value={field.value}
                  onValueChange={field.onChange}
                  className="mx-0 flex-wrap px-0"
                />
              )}
            />
          </div>
          <Controller
            control={form.control}
            name="amount"
            render={({ field, fieldState }) => (
              <Field label={t.amount} htmlFor="expense-amount" error={fieldState.error?.message}>
                <PriceInput
                  id="expense-amount"
                  size="lg"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </Field>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.date} htmlFor="expense-date">
              <Input
                id="expense-date"
                type="date"
                max={toDateInputValue()}
                {...form.register("spentAt")}
              />
            </Field>
            <Field label={t.supplier} htmlFor="expense-supplier" optional={fr.common.optional}>
              <Controller
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? null : value)}
                  >
                    <SelectTrigger id="expense-supplier" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE} className="min-h-10">
                        {t.supplierNone}
                      </SelectItem>
                      {activeSuppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id} className="min-h-10">
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <Field label={t.note} htmlFor="expense-note" optional={fr.common.optional}>
            <Textarea
              id="expense-note"
              rows={2}
              className="min-h-12"
              placeholder={t.notePlaceholder}
              {...form.register("note")}
            />
          </Field>
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
          <Button type="submit" form="expense-form" disabled={pending}>
            {pending ? fr.common.saving : fr.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
