"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ColorDot } from "@/components/shared/ColorDot";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShop } from "@/features/shop/shop-context";
import { BAG_COLORS } from "@/lib/bag-colors";
import { errorMessage } from "@/lib/errors";
import { formatQty } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";
import { addVariant, archiveVariant, assignStockColors } from "../actions";
import type { Product } from "../types";
import { NO_VARIANT } from "../variants";

const t = fr.variants;

/**
 * Colors of a model with their stock. Owner/admin add or remove colors and spread the stock
 * recorded without color over the colors.
 */
export function VariantsManager({
  product,
  stock,
  editable,
}: {
  product: Product;
  /** Bags available per color key of this model. */
  stock: Record<string, number>;
  editable: boolean;
}) {
  const { shop } = useShop();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const active = product.variants.filter((v) => !v.archivedAt);
  // Removed colors still show while bags of that color remain.
  const listed = product.variants.filter((v) => !v.archivedAt || (stock[v.id] ?? 0) > 0);
  const uncolored = stock[NO_VARIANT] ?? 0;
  const known = new Set(active.map((v) => v.color.toLowerCase()));

  const add = (color: string) => {
    if (!color.trim()) return;
    startTransition(async () => {
      const result = await addVariant(shop.id, product.id, color);
      if (result.ok) {
        toast.success(t.added);
        setName("");
      } else {
        toast.error(result.error === "DUPLICATE" ? t.duplicate : errorMessage(result.error));
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted-foreground">{t.hint}</p>

      {listed.length === 0 && uncolored === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft">
          {listed.map((variant) => (
            <li key={variant.id} className="flex min-h-12 items-center gap-3">
              <ColorDot color={variant.color} className="size-4" />
              <span className="flex-1 font-medium">
                {variant.color}
                {variant.archivedAt ? (
                  <span className="ml-2 text-[13px] text-muted-foreground">
                    ({fr.common.archived})
                  </span>
                ) : null}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatQty(stock[variant.id] ?? 0)}
              </span>
              {editable && !variant.archivedAt ? (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${t.remove} — ${variant.color}`}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  }
                  title={t.removeTitle}
                  description={t.removeDescription}
                  confirmLabel={t.remove}
                  onConfirm={async () => {
                    const result = await archiveVariant(shop.id, variant.id);
                    if (result.ok) toast.success(t.removed);
                    else toast.error(errorMessage(result.error));
                    return result.ok;
                  }}
                />
              ) : null}
            </li>
          ))}
          {uncolored > 0 ? (
            <li className="flex min-h-12 items-center gap-3">
              <ColorDot color={null} className="size-4" />
              <span className="flex-1 font-medium text-muted-foreground">{t.none}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatQty(uncolored)}
              </span>
            </li>
          ) : null}
        </ul>
      )}

      {editable ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.title}>
            {BAG_COLORS.filter((color) => !known.has(color.label.toLowerCase())).map((color) => (
              <button
                key={color.key}
                type="button"
                disabled={pending}
                onClick={() => add(color.label)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[13px] font-medium hover:bg-surface-muted disabled:opacity-50"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                <ColorDot color={color.label} className="size-3.5" />
                {color.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              add(name);
            }}
            className="flex gap-2"
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              maxLength={40}
            />
            <Button type="submit" variant="outline" disabled={pending || !name.trim()}>
              <Plus aria-hidden="true" />
              {t.add}
            </Button>
          </form>
        </div>
      ) : null}

      {editable && uncolored > 0 && active.length > 0 ? (
        <AssignColors product={product} colors={active} uncolored={uncolored} />
      ) : null}
    </div>
  );
}

function AssignColors({
  product,
  colors,
  uncolored,
}: {
  product: Product;
  colors: Product["variants"];
  uncolored: number;
}) {
  const { shop } = useShop();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const total = Object.values(quantities).reduce((sum, n) => sum + n, 0);
  const tooMany = total > uncolored;

  const submit = () =>
    startTransition(async () => {
      const items = colors
        .map((v) => ({ variantId: v.id, quantity: quantities[v.id] ?? 0 }))
        .filter((item) => item.quantity > 0);
      const result = await assignStockColors(shop.id, product.id, items);
      if (result.ok) {
        toast.success(t.assigned);
        setQuantities({});
      } else {
        toast.error(errorMessage(result.error));
      }
    });

  return (
    <section
      aria-labelledby="assign-colors"
      className="flex flex-col gap-3 rounded-2xl bg-cognac-soft p-4"
    >
      <h3 id="assign-colors" className="text-base">
        {t.assignTitle}
      </h3>
      <p className="text-[13px] text-muted-foreground">{fill(t.assignHint, { n: uncolored })}</p>
      <ul className="flex flex-col gap-2">
        {colors.map((variant) => (
          <li key={variant.id} className="flex items-center gap-3">
            <ColorDot color={variant.color} className="size-4" />
            <span className="flex-1 font-medium">{variant.color}</span>
            <QuantityStepper
              label={`${t.label} — ${variant.color}`}
              value={quantities[variant.id] ?? 0}
              min={0}
              max={uncolored}
              onValueChange={(value) =>
                setQuantities((previous) => ({ ...previous, [variant.id]: value }))
              }
            />
          </li>
        ))}
      </ul>
      {tooMany ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {fill(t.assignTooMany, { n: uncolored })}
        </p>
      ) : null}
      <Button
        type="button"
        onClick={submit}
        disabled={pending || total === 0 || tooMany}
        className="self-start"
      >
        {t.assignSubmit}
      </Button>
    </section>
  );
}
