import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { listProducts } from "@/features/catalog/queries";
import { ReturnForm } from "@/features/returns/components/ReturnForm";
import { getSupplierStock } from "@/features/returns/queries";
import { requireShop } from "@/features/shop/require";
import { listSuppliers } from "@/features/suppliers/queries";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.returns.newTitle };

export default function NewReturnPage({
  params,
  searchParams,
}: PageProps<"/s/[shopSlug]/retours/nouveau">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewReturn params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function NewReturn({
  params,
  searchParams,
}: {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { shop } = await requireShop(params);
  const { fournisseur } = await searchParams;
  const [suppliers, products, stock] = await Promise.all([
    listSuppliers(shop.id),
    listProducts(shop.id),
    getSupplierStock(shop.id),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader backHref={`/s/${shop.slug}/retours`} title={fr.returns.newTitle} />
      <ReturnForm
        suppliers={suppliers}
        products={products}
        stock={stock}
        initialSupplierId={
          typeof fournisseur === "string" && isUuid(fournisseur) ? fournisseur : null
        }
      />
    </div>
  );
}
