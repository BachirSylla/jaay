import Link from "next/link";
import type { ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { ColorDot } from "@/components/shared/ColorDot";
import { Money } from "@/components/shared/Money";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { fr } from "@/messages/fr";
import type { Product } from "../types";
import type { ColorOption } from "../variants";

/**
 * Stock grid card (DESIGN.md §6): thumbnail, name, category and material, price, optional
 * stock line and stock per color.
 */
export function ProductCard({
  product,
  href,
  stock,
  badge,
  colors,
}: {
  product: Product;
  href: string;
  stock?: ReactNode;
  badge?: ReactNode;
  /** Bags left per color (shown as dots with counts). */
  colors?: ColorOption[];
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-2.5 transition-transform duration-150 ease-out outline-none hover:border-cognac/40 focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.97]"
    >
      <div className="relative">
        <ProductThumb
          name={product.name}
          color={product.color}
          photoPath={product.photos[0]?.storagePath}
          size={260}
          className="aspect-square w-full"
        />
        {badge ? <div className="absolute top-2 left-2">{badge}</div> : null}
        {!product.isPublic ? (
          <span
            title={fr.catalog.hidden}
            className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-surface/90 text-muted-foreground"
          >
            <EyeOff aria-label={fr.catalog.hidden} className="size-3.5" />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 px-1 pb-1">
        <span className="truncate font-semibold">{product.name}</span>
        <span className="truncate text-[13px] text-muted-foreground">
          {[product.categoryName, product.material ? fr.catalog.materials[product.material] : null]
            .filter(Boolean)
            .join(" · ") || " "}
        </span>
        {colors && colors.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1" aria-label={fr.variants.stockTitle}>
            {colors.map((option) => (
              <li
                key={option.key}
                className="flex items-center gap-1 text-[13px] font-semibold tabular-nums"
              >
                <ColorDot color={option.color} />
                <span className="sr-only">{option.label}</span>
                {option.available}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-1 flex items-baseline justify-between gap-2">
          {stock ?? <span />}
          {product.suggestedPrice !== null ? (
            <Money amount={product.suggestedPrice} size="md" />
          ) : (
            <span className="text-[13px] text-muted-foreground">{fr.catalog.noPrice}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
