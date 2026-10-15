import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ShoppingBag, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/features/catalog/queries";
import { ReceptionForm } from "@/features/receptions/components/ReceptionForm";
import { getLatestCosts } from "@/features/receptions/queries";
import { requireShop } from "@/features/shop/require";
import { listSuppliers } from "@/features/suppliers/queries";
import { can } from "@/lib/permissions";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.receptions.newTitle };

const t = fr.receptions;

export default function NewReceptionPage({
  params,
}: PageProps<"/s/[shopSlug]/receptions/nouvelle">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewReception params={params} />
    </Suspense>
  );
}

async function NewReception({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shop, role } = await requireShop(params);
  const finance = can(role, "viewCosts");
  const [suppliers, products, latestCosts] = await Promise.all([
    listSuppliers(shop.id),
    listProducts(shop.id),
    // Managers never get past supplier prices.
    finance ? getLatestCosts(shop.id) : Promise.resolve({}),
  ]);
  const activeSuppliers = suppliers.filter((s) => !s.archivedAt);
  const activeProducts = products.filter((p) => !p.archivedAt);
  const canManage = can(role, "manageCatalog");

  let content;
  if (activeSuppliers.length === 0) {
    content = (
      <EmptyState
        icon={<Truck />}
        title={t.noSupplierTitle}
        text={canManage ? t.noSupplierText : t.noSupplierTextManager}
        action={
          canManage ? (
            <Button asChild>
              <Link href={`/s/${shop.slug}/fournisseurs`}>{t.goToSuppliers}</Link>
            </Button>
          ) : undefined
        }
      />
    );
  } else if (activeProducts.length === 0) {
    content = (
      <EmptyState
        icon={<ShoppingBag />}
        title={t.noProductTitle}
        text={canManage ? t.noProductText : t.noProductTextManager}
        action={
          canManage ? (
            <Button asChild>
              <Link href={`/s/${shop.slug}/modeles/nouveau`}>{t.goToProducts}</Link>
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    content = (
      <ReceptionForm suppliers={suppliers} products={activeProducts} latestCosts={latestCosts} />
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader backHref={`/s/${shop.slug}/receptions`} title={t.newTitle} />
      {content}
    </div>
  );
}
