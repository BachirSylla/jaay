import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PackagePlus, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { ShareLinkButton } from "@/components/shared/ShareLinkButton";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { listCategories, listProducts } from "@/features/catalog/queries";
import { requireShop } from "@/features/shop/require";
import { getStock, getVariantStock } from "@/features/stock/queries";
import { formatQty } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { catalogUrl } from "@/lib/site";
import { can } from "@/lib/permissions";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.catalog.title };

export default function StockPage({ params }: PageProps<"/s/[shopSlug]/stock">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Stock params={params} />
    </Suspense>
  );
}

async function Stock({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shop, role } = await requireShop(params);
  const [products, categories, stock, variantStock] = await Promise.all([
    listProducts(shop.id),
    listCategories(shop.id),
    getStock(shop.id),
    getVariantStock(shop.id),
  ]);
  const canManage = can(role, "manageCatalog");
  const active = products.filter((p) => !p.archivedAt);
  const totalBags = active.reduce((sum, p) => sum + (stock[p.id]?.available ?? 0), 0);

  const addButton = (
    <Button asChild>
      <Link href={`/s/${shop.slug}/modeles/nouveau`}>
        <Plus data-icon="inline-start" aria-hidden="true" />
        {fr.catalog.add}
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title={fr.catalog.title}
        description={`${formatQty(totalBags)} · ${active.length} ${fr.catalog.models.toLowerCase()}`}
        actions={
          products.length > 0 ? (
            <>
              {shop.catalogEnabled ? (
                <ShareLinkButton
                  url={catalogUrl(shop.slug)}
                  title={fill(fr.publicCatalog.metaTitle, { shop: shop.name })}
                  label={fr.publicCatalog.share}
                />
              ) : null}
              <Button asChild variant="outline">
                <Link href={`/s/${shop.slug}/receptions/nouvelle`}>
                  <PackagePlus data-icon="inline-start" aria-hidden="true" />
                  {fr.stock.newReception}
                </Link>
              </Button>
              {canManage ? addButton : null}
            </>
          ) : null
        }
      />
      <ProductGrid
        products={products}
        categories={categories}
        stock={stock}
        variantStock={variantStock}
        emptyAction={addButton}
      />
    </>
  );
}
