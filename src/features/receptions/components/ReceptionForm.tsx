"use client";

import { useRouter } from "next/navigation";
import { type ComponentProps, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Field, fieldAria } from "@/components/shared/Field";
import { Money } from "@/components/shared/Money";
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
import { ColorChoice } from "@/features/catalog/components/ColorChoice";
import { ProductPicker } from "@/features/catalog/components/ProductPicker";
import type { Product } from "@/features/catalog/types";
import { colorOptions, hasColors, NO_VARIANT, variantLabel } from "@/features/catalog/variants";
import { useShop } from "@/features/shop/shop-context";
import type { Supplier } from "@/features/suppliers/types";
import { errorMessage } from "@/lib/errors";
import { formatQty, toDateInputValue } from "@/lib/format";
import { useFreshFormKey } from "@/lib/use-fresh-form-key";
import { fr } from "@/messages/fr";
import { createReception } from "../actions";
import { receptionSchema, type ReceptionInput, type ReceptionValues } from "../schemas";

const t = fr.receptions;

function ReceptionFormBody({
  onSubmitted,
  suppliers,
  products,
  latestCosts,
}: {
  /** Called after a successful submit: the form is rebuilt empty for the next visit. */
  onSubmitted: () => void;
  suppliers: Supplier[];
  products: Product[];
  /** Last supplier price per product: owner/admin only, empty for managers. */
  latestCosts: Record<string, number>;
}) {
  const { shop } = useShop();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const activeSuppliers = suppliers.filter((s) => !s.archivedAt);

  const form = useForm<ReceptionInput, unknown, ReceptionValues>({
    resolver: zodResolver(receptionSchema),
    defaultValues: {
      supplierId: activeSuppliers.length === 1 ? activeSuppliers[0].id : "",
      receivedAt: toDateInputValue(),
      lines: [],
      deliveryFee: null,
      note: "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const { errors } = form.formState;

  const productById = new Map(products.map((p) => [p.id, p]));
  const linesOf = (productId: string) => lines.filter((line) => line.productId === productId);
  // A model is fully added once each of its colors has a line (one line without colors).
  const fullyAdded = products
    .filter((p) => {
      const count = linesOf(p.id).length;
      return hasColors(p) ? count >= p.variants.filter((v) => !v.archivedAt).length : count > 0;
    })
    .map((p) => p.id);
  const addLine = (product: Product, unitCost: number | null) =>
    append({
      productId: product.id,
      variantKey: hasColors(product) ? "" : NO_VARIANT,
      quantity: 1,
      unitCost,
    });
  const totalQty = lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);
  const totalCost = lines.reduce(
    (sum, line) => sum + (line.quantity ?? 0) * (line.unitCost ?? 0),
    0,
  );

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createReception(shop.id, values);
      if (!result.ok) return setFormError(errorMessage(result.error));
      onSubmitted();
      toast.success(t.created);
      router.push(`/s/${shop.slug}/receptions/${result.data.id}`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 pb-28 md:pb-24">
      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
        <Field label={t.supplier} htmlFor="reception-supplier" error={errors.supplierId?.message}>
          <Controller
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="reception-supplier"
                  className="w-full"
                  aria-invalid={errors.supplierId ? true : undefined}
                >
                  <SelectValue placeholder={t.supplierPlaceholder} />
                </SelectTrigger>
                <SelectContent>
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
        <Field label={t.date} htmlFor="reception-date" error={errors.receivedAt?.message}>
          <Input
            {...fieldAria("reception-date", errors.receivedAt?.message)}
            type="date"
            max={toDateInputValue()}
            {...form.register("receivedAt")}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg">{t.lines}</h2>
        {fields.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface px-5 py-6 text-center text-muted-foreground">
            {t.noLines}
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const product = productById.get(field.productId);
            const line = lines[index];
            const lineError = errors.lines?.[index]?.unitCost?.message;
            const colored = product ? hasColors(product) : false;
            const lineName = [
              product?.name ?? "",
              colored && line?.variantKey ? variantLabel(product, line.variantKey) : null,
            ]
              .filter(Boolean)
              .join(" · ");
            const takenKeys = lines
              .filter((other, i) => i !== index && other.productId === field.productId)
              .map((other) => other.variantKey);
            const canAddColor =
              product !== undefined &&
              colored &&
              linesOf(product.id).length < product.variants.filter((v) => !v.archivedAt).length;
            return (
              <li
                key={field.id}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <ProductThumb
                      name={product?.name ?? ""}
                      color={product?.color}
                      photoPath={product?.photos[0]?.storagePath}
                      size={56}
                      className="size-14 shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold">{lineName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${t.removeLine} — ${lineName}`}
                      onClick={() => remove(index)}
                      className="sm:order-last"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="flex items-start gap-3">
                    <Controller
                      control={form.control}
                      name={`lines.${index}.quantity`}
                      render={({ field: quantity }) => (
                        <QuantityStepper
                          label={`${t.quantity} — ${lineName}`}
                          value={quantity.value}
                          onValueChange={quantity.onChange}
                        />
                      )}
                    />
                    <Controller
                      control={form.control}
                      name={`lines.${index}.unitCost`}
                      render={({ field: cost }) => (
                        <div className="w-36 flex-1 sm:flex-none">
                          <PriceInput
                            aria-label={`${t.unitCost} — ${lineName}`}
                            placeholder={t.unitCost}
                            value={cost.value}
                            onValueChange={cost.onChange}
                            aria-invalid={lineError ? true : undefined}
                            className="h-11 text-base"
                            hint={
                              lineError ??
                              (line?.unitCost != null && line.quantity > 1 ? (
                                <Money amount={line.unitCost * line.quantity} size="sm" />
                              ) : (
                                t.unitCostHint
                              ))
                            }
                            hintTone={lineError ? "danger" : "default"}
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
                {product && colored ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Controller
                      control={form.control}
                      name={`lines.${index}.variantKey`}
                      render={({ field: variant }) => (
                        <ColorChoice
                          label={`${fr.variants.label} — ${product.name}`}
                          options={colorOptions(product, undefined, "reception")}
                          value={variant.value}
                          onValueChange={variant.onChange}
                          takenKeys={takenKeys}
                          invalid={Boolean(errors.lines?.[index]?.variantKey)}
                        />
                      )}
                    />
                    {canAddColor ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addLine(product, line?.unitCost ?? null)}
                      >
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        {fr.variants.addColor}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <ProductPicker
          products={products}
          selectedIds={fullyAdded}
          onSelect={(product) => addLine(product, latestCosts[product.id] ?? null)}
          trigger={
            <Button type="button" variant="outline" className="self-start">
              <Plus data-icon="inline-start" aria-hidden="true" />
              {t.addLine}
            </Button>
          }
        />
        {errors.lines?.message || errors.lines?.root?.message ? (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {errors.lines?.message ?? errors.lines?.root?.message}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="deliveryFee"
          render={({ field }) => (
            <Field
              label={t.deliveryFee}
              htmlFor="reception-fee"
              optional={fr.common.optional}
              hint={t.deliveryFeeHint}
            >
              <PriceInput id="reception-fee" value={field.value} onValueChange={field.onChange} />
            </Field>
          )}
        />
        <Field label={t.note} htmlFor="reception-note" optional={fr.common.optional}>
          <Textarea
            id="reception-note"
            rows={2}
            placeholder={t.notePlaceholder}
            className="min-h-12"
            {...form.register("note")}
          />
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

      {/* Sticky summary: above the tab bar on phones, at the bottom of the content otherwise. */}
      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur md:bottom-0 md:left-[76px] lg:left-[248px]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 md:px-3 lg:px-5">
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-muted-foreground">
              {formatQty(totalQty)}
            </span>
            <Money amount={totalCost} size="lg" />
          </div>
          <Button type="submit" size="lg" disabled={pending || fields.length === 0}>
            {pending ? fr.common.saving : t.submit}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ReceptionForm(
  props: Omit<ComponentProps<typeof ReceptionFormBody>, "onSubmitted">,
) {
  const { key, markSubmitted } = useFreshFormKey();
  return <ReceptionFormBody key={key} {...props} onSubmitted={markSubmitted} />;
}
