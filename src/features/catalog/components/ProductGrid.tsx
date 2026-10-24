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
import type { Category, Material, Product, ProductStock } from "../types";
import { colorOptions, hasColors, type VariantStock } from "../variants";
import { ProductCard } from "./ProductCard";

const t = fr.catalog;
const ALL = "all";
const NONE = "none";
const LOW = "low";

/** Searchable, filterable grid of products (2 columns on phones up to 5 on desktops). */
export function ProductGrid({
  products,
  categories,
  emptyAction,
  stock,
  variantStock,
}: {
  products: Product[];
  categories: Category[];
  emptyAction?: ReactNode;
  /** Available quantity per product id (from get_stock), when known. */
  stock?: Record<string, ProductStock>;
  /** Bags per product and color, to show the stock of each color. */
  variantStock?: VariantStock;
}) {
  const { shop } = useShop();
  const canManage = useCan("manageCatalog");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [material, setMaterial] = useState<string>(ALL);
  const [showArchived, setShowArchived] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const pool = products.filter((p) => showArchived || !p.archivedAt);
  const archivedCount = products.filter((p) => p.archivedAt).length;
  const visible = pool.filter(
    (p) =>
      (material === ALL || p.material === material) &&
      (category === ALL ||
        (category === LOW
          ? Boolean(stock?.[p.id]?.isLow)
          : category === NONE
            ? !p.categoryId
            : p.categoryId === category)) &&
      (!deferredQuery ||
        matchesSearch(
          `${p.name} ${p.variants.map((v) => v.color).join(" ")} ${p.color ?? ""} ${p.categoryName ?? ""} ${p.material ? t.materials[p.material] : ""}`,
          deferredQuery,
        )),
  );

  const materials = (Object.keys(t.materials) as Material[])
    .map((value) => ({
      value: value as string,
      label: t.materials[value],
      count: pool.filter((p) => p.material === value).length,
    }))
    .filter((chip) => chip.count > 0);
  const materialChips =
    materials.length > 0
      ? [{ value: ALL, label: fr.common.all, count: pool.length }, ...materials]
      : [];

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
  const lowCount = stock ? pool.filter((p) => stock[p.id]?.isLow).length : 0;
  if (lowCount > 0) chips.splice(1, 0, { value: LOW, label: fr.stock.lowOnly, count: lowCount });
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
        {materialChips.length > 0 ? (
          <ChipGroup
            aria-label={t.materialFilterLabel}
            chips={materialChips}
            value={material}
            onValueChange={setMaterial}
          />
        ) : null}
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
                      {(stock[product.id]?.available ?? 0) > 0
                        ? formatQty(stock[product.id]?.available ?? 0)
                        : fr.stock.outOfStock}
                    </span>
                  ) : undefined
                }
                badge={stock?.[product.id]?.isLow ? <StockBadge label={t.lowStock} /> : undefined}
                colors={
                  variantStock && hasColors(product)
                    ? colorOptions(product, variantStock[product.id], "stock")
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
