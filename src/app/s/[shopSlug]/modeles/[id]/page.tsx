import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Money } from "@/components/shared/Money";
import { PhotoManager } from "@/features/catalog/components/PhotoManager";
import { ProductActions } from "@/features/catalog/components/ProductActions";
import { ProductForm } from "@/features/catalog/components/ProductForm";
import { getProduct, listCategories } from "@/features/catalog/queries";
import { requireShop } from "@/features/shop/require";
import { getStock } from "@/features/stock/queries";
import { formatQty } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.catalog.models };

const t = fr.catalog;

export default function ProductPage({ params }: PageProps<"/s/[shopSlug]/modeles/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: { params: Promise<{ shopSlug: string; id: string }> }) {
  const { shop, role } = await requireShop(params);
  const { id } = await params;
  const [product, categories, stock] = await Promise.all([
    isUuid(id) ? getProduct(shop.id, id) : null,
    listCategories(shop.id),
    getStock(shop.id),
  ]);
  if (!product) notFound();
  const canManage = can(role, "manageCatalog");

  return (
    <div className="max-w-5xl">
      <PageHeader
        backHref={`/s/${shop.slug}/stock`}
        eyebrow={
          product.archivedAt
            ? fr.common.archived
            : [product.categoryName, product.color].filter(Boolean).join(" · ") || undefined
        }
        title={product.name}
        description={
          <span className={stock[product.id]?.isLow ? "font-semibold text-danger" : undefined}>
            {fr.stock.available} : {formatQty(stock[product.id]?.available ?? 0)}
          </span>
        }
        actions={canManage ? <ProductActions product={product} /> : null}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg">{t.photos}</h2>
          <PhotoManager product={product} editable={canManage} />
        </section>

        <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          {canManage ? (
            <>
              <h2 className="mb-5 text-lg">{fr.common.details}</h2>
              <ProductForm categories={categories} product={product} />
            </>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[13px] font-medium text-muted-foreground">
                  {t.suggestedPrice}
                </dt>
                <dd>
                  {product.suggestedPrice !== null ? (
                    <Money amount={product.suggestedPrice} size="lg" />
                  ) : (
                    t.noPrice
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] font-medium text-muted-foreground">{t.resellerPrice}</dt>
                <dd>
                  {product.resellerPrice !== null ? (
                    <Money amount={product.resellerPrice} size="lg" />
                  ) : (
                    t.noPrice
                  )}
                </dd>
              </div>
              {product.description ? (
                <div className="sm:col-span-2">
                  <dt className="text-[13px] font-medium text-muted-foreground">{t.description}</dt>
                  <dd className="whitespace-pre-line">{product.description}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}
