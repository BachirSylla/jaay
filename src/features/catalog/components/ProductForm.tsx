"use client";

import { useRouter } from "next/navigation";
import { type ComponentProps, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "cn";
import { Field, fieldAria } from "@/components/shared/Field";
import { PriceInput } from "@/components/shared/PriceInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useShop } from "@/features/shop/shop-context";
import { BAG_COLORS } from "@/lib/bag-colors";
import { errorMessage } from "@/lib/errors";
import { useFreshFormKey } from "@/lib/use-fresh-form-key";
import { fr } from "@/messages/fr";
import { createProduct, updateProduct } from "../actions";
import { productSchema, type ProductInput, type ProductValues } from "../schemas";
import type { Category, Product } from "../types";

const t = fr.catalog;
const NO_CATEGORY = "none";

function defaults(product?: Product): ProductInput {
  return {
    name: product?.name ?? "",
    categoryId: product?.categoryId ?? null,
    color: product?.color ?? "",
    description: product?.description ?? "",
    suggestedPrice: product?.suggestedPrice ?? null,
    resellerPrice: product?.resellerPrice ?? null,
    lowStockThreshold: product?.lowStockThreshold ?? 2,
    isPublic: product?.isPublic ?? true,
  };
}

function ProductFormBody({
  onSubmitted,
  categories,
  product,
}: {
  /** Called after a successful submit: the form is rebuilt empty for the next visit. */
  onSubmitted: () => void;
  categories: Category[];
  product?: Product;
}) {
  const { shop } = useShop();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ProductInput, unknown, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaults(product),
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      if (product) {
        const result = await updateProduct(shop.id, product.id, values);
        if (!result.ok) return setFormError(errorMessage(result.error));
        toast.success(t.updated);
        form.reset(form.getValues());
      } else {
        const result = await createProduct(shop.id, values);
        if (!result.ok) return setFormError(errorMessage(result.error));
        onSubmitted();
        toast.success(t.created);
        // Next step: add photos on the product page.
        router.replace(`/s/${shop.slug}/modeles/${result.data.id}`);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field label={t.name} htmlFor="product-name" error={errors.name?.message}>
        <Input
          {...fieldAria("product-name", errors.name?.message)}
          placeholder={t.namePlaceholder}
          {...form.register("name")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.category} htmlFor="product-category">
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Select
                value={field.value ?? NO_CATEGORY}
                onValueChange={(value) => field.onChange(value === NO_CATEGORY ? null : value)}
              >
                <SelectTrigger id="product-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY} className="min-h-10">
                    {fr.categories.none}
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="min-h-10">
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label={t.color} htmlFor="product-color" optional={fr.common.optional}>
          <Input id="product-color" placeholder={t.colorPlaceholder} {...form.register("color")} />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.color}>
            {BAG_COLORS.map((color) => (
              <button
                key={color.key}
                type="button"
                onClick={() => form.setValue("color", color.label, { shouldDirty: true })}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[13px] font-medium hover:bg-surface-muted"
              >
                <span
                  aria-hidden="true"
                  className={cn("size-3.5 rounded-full ring-1 ring-ink/10", color.className)}
                />
                {color.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="suggestedPrice"
          render={({ field }) => (
            <Field
              label={t.suggestedPrice}
              htmlFor="product-suggested"
              optional={fr.common.optional}
            >
              <PriceInput
                id="product-suggested"
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="resellerPrice"
          render={({ field }) => (
            <Field label={t.resellerPrice} htmlFor="product-reseller" optional={fr.common.optional}>
              <PriceInput
                id="product-reseller"
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            </Field>
          )}
        />
      </div>
      <p className="-mt-3 text-[13px] text-muted-foreground">{t.pricesHint}</p>

      <Field
        label={t.lowStockThreshold}
        htmlFor="product-threshold"
        hint={t.lowStockHint}
        error={errors.lowStockThreshold?.message}
      >
        <Input
          {...fieldAria("product-threshold", errors.lowStockThreshold?.message, true)}
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          className="max-w-32 tabular-nums"
          {...form.register("lowStockThreshold", { valueAsNumber: true })}
        />
      </Field>

      <Field label={t.description} htmlFor="product-description" optional={fr.common.optional}>
        <Textarea
          id="product-description"
          rows={3}
          placeholder={t.descriptionPlaceholder}
          {...form.register("description")}
        />
      </Field>

      <div className="flex min-h-11 items-center justify-between gap-4">
        <label htmlFor="product-public" className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{t.isPublic}</span>
          <span className="text-[13px] text-muted-foreground">{t.isPublicHint}</span>
        </label>
        <Controller
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <Switch id="product-public" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {formError}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={pending || (product && !isDirty)}
        className="sm:self-start"
      >
        {pending ? fr.common.saving : product ? fr.common.save : t.add}
      </Button>
    </form>
  );
}

export function ProductForm(props: Omit<ComponentProps<typeof ProductFormBody>, "onSubmitted">) {
  const { key, markSubmitted } = useFreshFormKey();
  return <ProductFormBody key={key} {...props} onSubmitted={markSubmitted} />;
}
