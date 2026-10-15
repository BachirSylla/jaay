"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { cn } from "cn";
import { ChipGroup } from "@/components/shared/ChipGroup";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { buttonVariants } from "@/components/ui/button";
import { fr } from "@/messages/fr";
import { orderLink } from "../public-links";
import type { PublicCatalog } from "../public";

const t = fr.publicCatalog;
const ALL = "__all";

/** Public grid: category filter, photo, name, price or "price on request", "Commander". */
export function PublicProductGrid({ catalog }: { catalog: PublicCatalog }) {
  const { shop, products } = catalog;
  const [category, setCategory] = useState(ALL);
  const categories = [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))];
  const visible = products.filter((p) => category === ALL || p.category === category);

  if (products.length === 0) {
    return <EmptyState icon={<ShoppingBag />} title={t.emptyTitle} text={t.emptyText} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {categories.length > 1 ? (
        <ChipGroup
          aria-label={t.categoriesLabel}
          chips={[
            { value: ALL, label: t.allCategories },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
          value={category}
          onValueChange={setCategory}
        />
      ) : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((product, index) => (
          <li
            key={product.id}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-2.5"
          >
            <Link href={`/b/${shop.slug}/${product.id}`} className="flex flex-col gap-3">
              <ProductThumb
                name={product.name}
                color={product.color}
                photoPath={product.photos[0]}
                size={280}
                priority={index < 4}
                className="aspect-square w-full"
              />
              <span className="flex min-w-0 flex-col gap-0.5 px-1">
                <span className="truncate font-semibold">{product.name}</span>
                {product.price !== null ? (
                  <Money amount={product.price} size="md" />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    {t.priceOnRequest}
                  </span>
                )}
              </span>
            </Link>
            {shop.whatsappPhone ? (
              <a
                href={orderLink({ ...shop, whatsappPhone: shop.whatsappPhone }, product)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t.order} — ${product.name}`}
                className={cn(buttonVariants({ variant: "whatsapp", size: "sm" }), "w-full")}
              >
                <MessageCircle aria-hidden="true" />
                {t.order}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
