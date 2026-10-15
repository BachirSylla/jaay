"use client";

import { useDeferredValue, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "cn";
import { Money } from "@/components/shared/Money";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { matchesSearch, SearchInput } from "@/components/shared/SearchInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatQty } from "@/lib/format";
import { fr } from "@/messages/fr";
import type { Product, ProductStock } from "../types";

const t = fr.receptions;

/**
 * Searchable list of active products to add to a reception, a sale or a return.
 * Products already added are marked; `disabled` products (e.g. out of stock) are dimmed.
 */
export function ProductPicker({
  products,
  stock,
  selectedIds,
  isDisabled,
  onSelect,
  trigger,
  title = t.pickTitle,
}: {
  products: Product[];
  stock?: Record<string, ProductStock>;
  selectedIds: string[];
  isDisabled?: (product: Product) => boolean;
  onSelect: (product: Product) => void;
  trigger: ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const visible = products.filter(
    (p) =>
      !p.archivedAt &&
      (!deferredQuery ||
        matchesSearch(`${p.name} ${p.color ?? ""} ${p.categoryName ?? ""}`, deferredQuery)),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <SearchInput value={query} onValueChange={setQuery} autoFocus />
        <ul className="-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {visible.length === 0 ? (
            <li className="py-8 text-center text-muted-foreground">{t.pickEmpty}</li>
          ) : null}
          {visible.map((product) => {
            const selected = selectedIds.includes(product.id);
            const disabled = !selected && (isDisabled?.(product) ?? false);
            const available = stock?.[product.id]?.available;
            return (
              <li key={product.id}>
                <button
                  type="button"
                  disabled={selected || disabled}
                  onClick={() => {
                    onSelect(product);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none hover:bg-surface-muted focus-visible:bg-surface-muted",
                    disabled && "opacity-45",
                  )}
                >
                  <ProductThumb
                    name={product.name}
                    color={product.color}
                    photoPath={product.photos[0]?.storagePath}
                    size={48}
                    className="size-12 shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{product.name}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {available !== undefined
                        ? `${formatQty(available)} ${fr.stock.inStock}`
                        : [product.categoryName, product.color].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {selected ? (
                    <span className="flex items-center gap-1 text-[13px] font-semibold text-cognac">
                      <Check aria-hidden="true" className="size-4" />
                      {t.added}
                    </span>
                  ) : product.suggestedPrice !== null ? (
                    <Money amount={product.suggestedPrice} size="sm" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
