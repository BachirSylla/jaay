"use client";

import { useDeferredValue, useState, type ReactNode } from "react";
import { ShoppingBag } from "lucide-react";
import { ChipGroup } from "@/components/shared/ChipGroup";
import { EmptyState } from "@/components/shared/EmptyState";
import { matchesSearch, SearchInput } from "@/components/shared/SearchInput";
import { StockBadge } from "@/components/shared/StockBadge";
import { Button } from "@/components/ui/button";
import { useCan, useShop } from "@/features/shop/shop-context";
import { formatQty } from "@/lib/format";
import { fr } from "@/messages/fr";
import type { Category, Product, ProductStock } from "../types";
import { ProductCard } from "./ProductCard";

const t = fr.catalog;
const ALL = "all";
const NONE = "none";

/** Searchable, filterable grid of products (2 columns on phones up to 5 on desktops). */
export function ProductGrid({
  products,
  categories,
  emptyAction,
  stock,
}: {
  products: Product[];
  categories: Category[];
  emptyAction?: ReactNode;
  /** Available quantity per product id (from get_stock), when known. */
  stock?: Record<string, ProductStock>;
}) {
  const { shop } = useShop();
  const canManage = useCan("manageCatalog");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [showArchived, setShowArchived] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const pool = products.filter((p) => showArchived || !p.archivedAt);
  const archivedCount = products.filter((p) => p.archivedAt).length;
  const visible = pool.filter(
    (p) =>
      (category === ALL || (category === NONE ? !p.categoryId : p.categoryId === category)) &&
      (!deferredQuery ||
        matchesSearch(`${p.name} ${p.color ?? ""} ${p.categoryName ?? ""}`, deferredQuery)),
  );

  const chips = [
    { value: ALL, label: fr.common.all, count: pool.length },
    ...categories
      .map((c) => ({
        value: c.id,
        label: c.name,
        count: pool.filter((p) => p.categoryId === c.id).length,
      }))
      .filter((chip) => chip.count > 0),
  ];
  if (pool.some((p) => !p.categoryId)) {
    chips.push({
      value: NONE,
      label: fr.categories.none,
      count: pool.filter((p) => !p.categoryId).length,
    });
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title={t.emptyTitle}
        text={canManage ? t.emptyText : t.emptyTextManager}
        action={canManage ? emptyAction : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={query} onValueChange={setQuery} className="md:max-w-md" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipGroup
          aria-label={t.filterLabel}
          chips={chips}
          value={category}
          onValueChange={setCategory}
        />
        {canManage && archivedCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? fr.common.hideArchived : `${fr.common.showArchived} (${archivedCount})`}
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{fr.common.noResults}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((product) => (
            <li key={product.id} className={product.archivedAt ? "opacity-60" : undefined}>
              <ProductCard
                product={product}
                href={`/s/${shop.slug}/modeles/${product.id}`}
                stock={
                  stock ? (
                    <span className="text-[13px] font-semibold text-muted-foreground tabular-nums">
                      {formatQty(stock[product.id]?.available ?? 0)}
                    </span>
                  ) : undefined
                }
                badge={stock?.[product.id]?.isLow ? <StockBadge label={t.lowStock} /> : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
