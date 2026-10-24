"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { ChipGroup } from "@/components/shared/ChipGroup";
import { Field } from "@/components/shared/Field";
import { Money } from "@/components/shared/Money";
import { PriceInput } from "@/components/shared/PriceInput";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ColorChoice } from "@/features/catalog/components/ColorChoice";
import { ProductPicker } from "@/features/catalog/components/ProductPicker";
import type { Product, ProductStock } from "@/features/catalog/types";
import {
  colorOptions,
  hasColors,
  variantLabel,
  type VariantStock,
} from "@/features/catalog/variants";
import type { Customer } from "@/features/customers/types";
import { useShop } from "@/features/shop/shop-context";
import { errorMessage } from "@/lib/errors";
import { fifoCost, type FifoLot } from "@/lib/fifo";
import { formatMoney, formatQty, toDateInputValue } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { useFreshFormKey } from "@/lib/use-fresh-form-key";
import { fr } from "@/messages/fr";
import { createSale } from "../actions";
import { SALE_CHANNELS, saleSchema, saleTotal, type SaleInput, type SaleValues } from "../schemas";
import type { CustomerType } from "../types";
import { CustomerPicker } from "./CustomerPicker";
import { PaymentPicker, paymentsFor, type PaymentState } from "./PaymentPicker";

const t = fr.sales;
const typeOptions = [
  { value: "individual", label: t.individual },
  { value: "reseller", label: t.reseller },
] as const;
const channelChips = SALE_CHANNELS.map((value) => ({ value, label: fr.channels[value] }));

type SaleDraft = { values: SaleInput; payment: PaymentState; editedPrices: string[] };

function readDraft(key: string): SaleDraft | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SaleDraft) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: SaleDraft) {
  try {
    if ((draft.values.lines?.length ?? 0) === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Storage unavailable (private mode): no draft, the form still works.
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}

/** Pre-filled price: suggested for individuals, reseller price (or suggested) for resellers. */
function priceFor(product: Product | undefined, type: CustomerType): number | null {
  if (!product) return null;
  return type === "reseller"
    ? (product.resellerPrice ?? product.suggestedPrice)
    : product.suggestedPrice;
}

/**
 * Quick sale (mockup 2): customer type, customer, lines with free price, channel, payment,
 * fixed footer with the total and "Encaisser". Designed to take less than 20 seconds.
 */
function NewSaleFormBody({
  onSubmitted,
  nextNumber,
  products,
  stock,
  variantStock,
  customers,
  fifoLots,
  showMargin,
}: {
  /** Called after a successful submit: the form is rebuilt empty for the next visit. */
  onSubmitted: () => void;
  nextNumber: number;
  products: Product[];
  stock: Record<string, ProductStock>;
  /** Bags per model and color. */
  variantStock: VariantStock;
  customers: Customer[];
  /** Available lots per `${productId}:${variantKey}` (owner/admin only, empty for managers). */
  fifoLots: Record<string, FifoLot[]>;
  /** Owner/admin: estimated margin and below-cost warnings. */
  showMargin: boolean;
}) {
  const { shop } = useShop();
  const router = useRouter();
  const finance = showMargin;
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payment, setPayment] = useState<PaymentState>({ method: "cash", split: null });
  const [editedPrices, setEditedPrices] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState<number | null>(null);

  const form = useForm<SaleInput, unknown, SaleValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerId: null,
      customerType: "individual",
      channel: "in_person",
      soldAt: toDateInputValue(),
      lines: [],
      payments: [],
      note: "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const customerType = useWatch({ control: form.control, name: "customerType" });
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const total = saleTotal(lines);
  const bags = lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);
  const cost = finance
    ? lines.reduce(
        (sum, line) =>
          sum +
          (fifoCost(fifoLots[`${line.productId}:${line.variantKey}`] ?? [], line.quantity) ?? 0),
        0,
      )
    : null;
  const margin = cost === null ? null : total - cost;

  // Colors (or uncolored stock) of a model that still hold bags.
  const optionsOf = (product: Product) => colorOptions(product, variantStock[product.id], "stock");
  const linesOf = (productId: string) => lines.filter((line) => line.productId === productId);
  // A model is fully added once each of its colors in stock has a line.
  const fullyAdded = products
    .filter((p) => linesOf(p.id).length >= Math.max(1, optionsOf(p).length))
    .map((p) => p.id);
  const addLine = (product: Product) => {
    const options = optionsOf(product);
    const taken = linesOf(product.id).map((line) => line.variantKey);
    const free = options.filter((option) => !taken.includes(option.key));
    append({
      productId: product.id,
      // A single possible color is chosen for the seller; otherwise they pick it.
      variantKey: options.length === 1 ? options[0].key : free.length === 1 ? free[0].key : "",
      quantity: 1,
      unitPrice: priceFor(product, customerType),
    });
  };

  const setType = (type: CustomerType) => {
    form.setValue("customerType", type);
    // Re-price the lines whose price was not typed by hand.
    lines.forEach((line, index) => {
      if (!editedPrices.has(line.productId)) {
        form.setValue(`lines.${index}.unitPrice`, priceFor(productById.get(line.productId), type));
      }
    });
  };

  // Draft kept in this device's storage: a network cut or a closed tab never loses a sale.
  const draftKey = `jaay:sale-draft:${shop.id}`;
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const draft = readDraft(draftKey);
    if (!draft) return;
    const knownLines =
      draft.values.lines
        ?.filter((line) => productById.has(line.productId))
        .map((line) => ({ ...line, variantKey: line.variantKey ?? "" })) ?? [];
    if (knownLines.length === 0) return;
    form.reset({ ...draft.values, lines: knownLines, payments: [] });
    // Restoring from device storage can only happen after hydration (no storage on the
    // server), once, when the screen opens.
    /* eslint-disable react-hooks/set-state-in-effect */
    setPayment(draft.payment);
    setCustomer(customers.find((c) => c.id === draft.values.customerId) ?? null);
    setEditedPrices(new Set(draft.editedPrices));
    /* eslint-enable react-hooks/set-state-in-effect */
    toast(fr.offline.draftRestored);
  }, [draftKey, form, customers, productById]);

  useEffect(() => {
    if (success !== null) return;
    const save = () =>
      writeDraft(draftKey, {
        values: form.getValues(),
        payment,
        editedPrices: [...editedPrices],
      });
    save();
    return form.subscribe({ formState: { values: true }, callback: save });
  }, [draftKey, form, payment, editedPrices, success]);

  const onSubmit = (event: React.FormEvent) => {
    form.setValue("payments", paymentsFor(payment, total));
    form.handleSubmit((values) => {
      setFormError(null);
      if (!navigator.onLine) {
        setFormError(fr.errors.OFFLINE);
        return;
      }
      startTransition(async () => {
        let result: Awaited<ReturnType<typeof createSale>>;
        try {
          result = await createSale(shop.id, values);
        } catch {
          // Network failure: the draft is still saved, the user can retry.
          setFormError(navigator.onLine ? fr.errors.UNKNOWN : fr.errors.OFFLINE);
          return;
        }
        if (!result.ok) {
          if (result.stock) {
            const product = productById.get(result.stock.productId);
            const name = [
              product?.name ?? "",
              product && hasColors(product) ? variantLabel(product, result.stock.variantKey) : null,
            ]
              .filter(Boolean)
              .join(" · ");
            setFormError(fill(t.onlyLeft, { n: result.stock.available, name }));
          } else {
            setFormError(errorMessage(result.error));
          }
          return;
        }
        clearDraft(draftKey);
        onSubmitted();
        setSuccess(result.data.number);
        toast.success(fill(t.created, { n: result.data.number }), {
          action: {
            label: t.viewReceipt,
            onClick: () => router.push(`/s/${shop.slug}/ventes/${result.data.id}`),
          },
        });
        // Let the check animation play, then back to the dashboard (fresh figures).
        setTimeout(() => router.push(`/s/${shop.slug}`), 900);
      });
    })(event);
  };

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-2xl flex-col gap-6 pb-36">
      <header className="flex items-center gap-3">
        <Link
          href={`/s/${shop.slug}`}
          aria-label={fr.common.close}
          className="-ml-2 grid size-11 place-items-center rounded-xl hover:bg-surface-muted"
        >
          <X aria-hidden="true" className="size-6" />
        </Link>
        <h1 className="flex-1 text-[28px] leading-tight">{t.newTitle}</h1>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold tabular-nums">
          {fill(t.numberShort, { n: nextNumber })}
        </span>
      </header>

      <section className="flex flex-col gap-3">
        <SegmentedControl
          aria-label={t.customerType}
          options={typeOptions}
          value={customerType}
          onValueChange={setType}
          className="w-full"
        />
        <CustomerPicker
          customers={customers}
          value={customer}
          onChange={(next) => {
            setCustomer(next);
            form.setValue("customerId", next?.id ?? null);
            if (next) setType(next.type);
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg">{t.lines}</h2>
        <AnimatePresence initial={false}>
          {fields.map((field, index) => {
            const product = productById.get(field.productId);
            const line = lines[index];
            const options = product ? optionsOf(product) : [];
            const colored = product ? hasColors(product) : false;
            const available = line?.variantKey
              ? (variantStock[field.productId]?.[line.variantKey] ?? 0)
              : (stock[field.productId]?.available ?? 0);
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
              product !== undefined && linesOf(product.id).length < options.length;
            const suggested = priceFor(product, customerType);
            const lineCost = finance
              ? fifoCost(
                  fifoLots[`${field.productId}:${line?.variantKey}`] ?? [],
                  line?.quantity ?? 1,
                )
              : null;
            const belowCost =
              lineCost !== null &&
              line?.unitPrice != null &&
              line.unitPrice * (line.quantity ?? 1) < lineCost;
            return (
              <motion.div
                key={field.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-4"
              >
                <div className="flex items-center gap-3">
                  <ProductThumb
                    name={product?.name ?? ""}
                    color={product?.color}
                    photoPath={product?.photos[0]?.storagePath}
                    size={56}
                    className="size-14 shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{lineName}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {fill(t.inStock, { n: available })}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${t.removeLine} — ${lineName}`}
                    onClick={() => remove(index)}
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
                        max={Math.max(1, available)}
                        onValueChange={quantity.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name={`lines.${index}.unitPrice`}
                    render={({ field: price }) => (
                      <div className="min-w-0 flex-1">
                        <PriceInput
                          aria-label={`${t.price} — ${lineName}`}
                          placeholder={t.price}
                          value={price.value}
                          onValueChange={(next) => {
                            price.onChange(next);
                            setEditedPrices((previous) => new Set(previous).add(field.productId));
                          }}
                          aria-invalid={errors.lines?.[index]?.unitPrice ? true : undefined}
                          className="h-11 text-base"
                          hint={
                            belowCost
                              ? t.belowCost
                              : suggested !== null
                                ? fill(
                                    customerType === "reseller" ? t.resellerSuggested : t.suggested,
                                    {
                                      amount: formatMoney(suggested),
                                    },
                                  )
                                : undefined
                          }
                          hintTone={belowCost ? "danger" : "default"}
                        />
                      </div>
                    )}
                  />
                </div>
                {product && (options.length > 1 || (colored && !line?.variantKey)) ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Controller
                      control={form.control}
                      name={`lines.${index}.variantKey`}
                      render={({ field: variant }) => (
                        <ColorChoice
                          label={`${fr.variants.label} — ${product.name}`}
                          options={options}
                          value={variant.value}
                          onValueChange={(key) => {
                            variant.onChange(key);
                            // Keep the quantity within the stock of the chosen color.
                            const left = variantStock[product.id]?.[key] ?? 0;
                            if ((line?.quantity ?? 1) > left) {
                              form.setValue(`lines.${index}.quantity`, Math.max(1, left));
                            }
                          }}
                          takenKeys={takenKeys}
                          showStock
                          invalid={Boolean(errors.lines?.[index]?.variantKey)}
                        />
                      )}
                    />
                    {canAddColor ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addLine(product)}
                      >
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        {fr.variants.addColor}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </AnimatePresence>

        <ProductPicker
          products={products}
          stock={stock}
          selectedIds={fullyAdded}
          isDisabled={(product) => (stock[product.id]?.available ?? 0) <= 0}
          onSelect={addLine}
          trigger={
            <Button
              type="button"
              variant={fields.length === 0 ? "default" : "outline"}
              size={fields.length === 0 ? "lg" : "default"}
              className={cn(fields.length === 0 ? "w-full" : "self-start")}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              {t.addLine}
            </Button>
          }
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg">{t.channel}</h2>
        <Controller
          control={form.control}
          name="channel"
          render={({ field }) => (
            <ChipGroup
              aria-label={t.channel}
              chips={channelChips}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg">{t.payment}</h2>
        <PaymentPicker value={payment} total={total} onChange={setPayment} />
      </section>

      <details className="group rounded-2xl border border-line bg-surface">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold">
          {t.moreOptions}
          <Plus aria-hidden="true" className="size-4 transition-transform group-open:rotate-45" />
        </summary>
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
          <Field label={t.date} htmlFor="sale-date">
            <Input
              id="sale-date"
              type="date"
              max={toDateInputValue()}
              {...form.register("soldAt")}
            />
          </Field>
          <Field label={t.note} htmlFor="sale-note" optional={fr.common.optional}>
            <Textarea
              id="sale-note"
              rows={2}
              className="min-h-12"
              placeholder={t.notePlaceholder}
              {...form.register("note")}
            />
          </Field>
        </div>
      </details>

      {formError || errors.payments?.message || errors.payments?.root?.message ? (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {formError ?? errors.payments?.message ?? errors.payments?.root?.message}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:left-[76px] lg:left-[248px]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-medium text-muted-foreground">
              {formatQty(bags)}
              {margin !== null && bags > 0 ? (
                <>
                  {" · "}
                  {t.margin}{" "}
                  <Money
                    amount={margin}
                    size="sm"
                    variant={margin < 0 ? "negative" : "positive"}
                    className="font-semibold"
                  />
                </>
              ) : null}
            </span>
            <Money amount={total} size="lg" />
          </div>
          <Button type="submit" size="lg" disabled={pending || fields.length === 0 || total <= 0}>
            {pending ? fr.common.saving : fill(t.collect, { amount: formatMoney(total) })}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {success !== null ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-ground/85 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="grid size-20 place-items-center rounded-full bg-emerald text-white"
              >
                <Check aria-hidden="true" className="size-10" strokeWidth={3} />
              </motion.span>
              <p className="font-display text-xl font-bold">{fill(t.created, { n: success })}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </form>
  );
}

export function NewSaleForm(props: Omit<ComponentProps<typeof NewSaleFormBody>, "onSubmitted">) {
  const { key, markSubmitted } = useFreshFormKey();
  return <NewSaleFormBody key={key} {...props} onSubmitted={markSubmitted} />;
}
