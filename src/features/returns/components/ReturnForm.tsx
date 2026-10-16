"use client";

import { useRouter } from "next/navigation";
import { type ComponentProps, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, fieldAria } from "@/components/shared/Field";
import { PriceInput } from "@/components/shared/PriceInput";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/features/catalog/types";
import { useShop } from "@/features/shop/shop-context";
import type { Supplier } from "@/features/suppliers/types";
import { errorMessage } from "@/lib/errors";
import { formatQty, toDateInputValue } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { useFreshFormKey } from "@/lib/use-fresh-form-key";
import { fr } from "@/messages/fr";
import { createReturn } from "../actions";
import { returnSchema, type ReturnInput, type ReturnValues } from "../schemas";
import type { SupplierStock } from "../types";

const t = fr.returns;

function linesFor(supplierId: string, stock: SupplierStock) {
  return Object.entries(stock[supplierId] ?? {}).map(([productId, available]) => ({
    productId,
    quantity: available,
  }));
}

/** Return of unsold bags: quantities pre-filled with what is left from the supplier. */
function ReturnFormBody({
  onSubmitted,
  suppliers,
  products,
  stock,
  initialSupplierId,
}: {
  /** Called after a successful submit: the form is rebuilt empty for the next visit. */
  onSubmitted: () => void;
  suppliers: Supplier[];
  products: Product[];
  stock: SupplierStock;
  initialSupplierId: string | null;
}) {
  const { shop } = useShop();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const withStock = suppliers.filter((s) => Object.keys(stock[s.id] ?? {}).length > 0);
  const firstId =
    initialSupplierId && stock[initialSupplierId]
      ? initialSupplierId
      : withStock.length === 1
        ? withStock[0].id
        : "";

  const form = useForm<ReturnInput, unknown, ReturnValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      supplierId: firstId,
      returnedAt: toDateInputValue(),
      lines: firstId ? linesFor(firstId, stock) : [],
      deliveryFee: null,
      note: "",
    },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "lines" });
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const supplierId = useWatch({ control: form.control, name: "supplierId" });
  const productById = new Map(products.map((p) => [p.id, p]));
  const bags = lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createReturn(shop.id, values);
      if (!result.ok) return setFormError(errorMessage(result.error));
      onSubmitted();
      toast.success(t.created);
      router.push(`/s/${shop.slug}/retours/${result.data.id}`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 pb-28 md:pb-24">
      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
        <Field label={t.supplier} htmlFor="return-supplier" error={errors.supplierId?.message}>
          <Controller
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  replace(linesFor(value, stock));
                }}
              >
                <SelectTrigger id="return-supplier" className="w-full">
                  <SelectValue placeholder={t.supplierPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="min-h-10">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label={t.date} htmlFor="return-date">
          <Input
            {...fieldAria("return-date")}
            type="date"
            max={toDateInputValue()}
            {...form.register("returnedAt")}
          />
        </Field>
      </section>

      {supplierId ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg">{t.lines}</h2>
            <p className="text-sm text-muted-foreground">{t.linesHint}</p>
          </div>
          {fields.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-surface px-5 py-6 text-center text-muted-foreground">
              {t.noStock}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {fields.map((field, index) => {
                const product = productById.get(field.productId);
                const available = stock[supplierId]?.[field.productId] ?? 0;
                return (
                  <li
                    key={field.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-4"
                  >
                    <ProductThumb
                      name={product?.name ?? ""}
                      color={product?.color}
                      photoPath={product?.photos[0]?.storagePath}
                      size={56}
                      className="size-14 shrink-0"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{product?.name}</span>
                      <span className="text-[13px] text-muted-foreground">
                        {fill(t.available, { n: available })}
                      </span>
                    </div>
                    <Controller
                      control={form.control}
                      name={`lines.${index}.quantity`}
                      render={({ field: quantity }) => (
                        <QuantityStepper
                          label={`${t.quantity} — ${product?.name ?? ""}`}
                          value={quantity.value}
                          min={0}
                          max={available}
                          onValueChange={quantity.onChange}
                        />
                      )}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          {errors.lines?.message || errors.lines?.root?.message ? (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {errors.lines?.message ?? errors.lines?.root?.message}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="deliveryFee"
          render={({ field }) => (
            <Field
              label={t.deliveryFee}
              htmlFor="return-fee"
              optional={fr.common.optional}
              hint={t.deliveryFeeHint}
            >
              <PriceInput id="return-fee" value={field.value} onValueChange={field.onChange} />
            </Field>
          )}
        />
        <Field label={t.note} htmlFor="return-note" optional={fr.common.optional}>
          <Textarea id="return-note" rows={2} className="min-h-12" {...form.register("note")} />
        </Field>
      </section>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {formError}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur md:bottom-0 md:left-[76px] lg:left-[248px]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 md:px-3 lg:px-5">
          <span className="font-display text-lg font-bold">{formatQty(bags)}</span>
          <Button type="submit" size="lg" disabled={pending || bags === 0}>
            {pending ? fr.common.saving : t.submit}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ReturnForm(props: Omit<ComponentProps<typeof ReturnFormBody>, "onSubmitted">) {
  const { key, markSubmitted } = useFreshFormKey();
  return <ReturnFormBody key={key} {...props} onSubmitted={markSubmitted} />;
}
