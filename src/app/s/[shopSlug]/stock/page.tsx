import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { listCategories, listProducts } from "@/features/catalog/queries";
import { requireShop } from "@/features/shop/require";
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
  const [products, categories] = await Promise.all([
    listProducts(shop.id),
    listCategories(shop.id),
  ]);
  const canManage = can(role, "manageCatalog");
  const activeCount = products.filter((p) => !p.archivedAt).length;

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
        description={`${activeCount} ${fr.catalog.models.toLowerCase()}`}
        actions={canManage && products.length > 0 ? addButton : null}
      />
      <ProductGrid products={products} categories={categories} emptyAction={addButton} />
    </>
  );
}
