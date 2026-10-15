import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/features/catalog/queries";
import { listCustomers } from "@/features/customers/queries";
import { NewSaleForm } from "@/features/sales/components/NewSaleForm";
import { getFifoLots, getNextSaleNumber } from "@/features/sales/queries";
import { requireShop } from "@/features/shop/require";
import { getStock } from "@/features/stock/queries";
import { can } from "@/lib/permissions";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.sales.newTitle };

const t = fr.sales;

export default function NewSalePage({ params }: PageProps<"/s/[shopSlug]/ventes/nouvelle">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewSale params={params} />
    </Suspense>
  );
}

async function NewSale({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shop, role } = await requireShop(params);
  const finance = can(role, "viewCosts");
  const [products, stock, customers, nextNumber, fifoLots] = await Promise.all([
    listProducts(shop.id),
    getStock(shop.id),
    listCustomers(shop.id),
    getNextSaleNumber(shop.id),
    // Costs never reach a manager's browser.
    finance ? getFifoLots(shop.id) : Promise.resolve({}),
  ]);
  const active = products.filter((p) => !p.archivedAt);
  const inStock = active.some((p) => (stock[p.id]?.available ?? 0) > 0);

  if (!inStock) {
    return (
      <div className="max-w-2xl">
        <PageHeader backHref={`/s/${shop.slug}`} title={t.newTitle} />
        <EmptyState
          icon={<PackagePlus />}
          title={t.noStockTitle}
          text={t.noStockText}
          action={
            <Button asChild>
              <Link href={`/s/${shop.slug}/receptions/nouvelle`}>{t.goToReception}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <NewSaleForm
      nextNumber={nextNumber}
      products={active}
      stock={stock}
      customers={customers}
      fifoLots={fifoLots}
      showMargin={finance}
    />
  );
}
