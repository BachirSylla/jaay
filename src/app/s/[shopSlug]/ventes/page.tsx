import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Button } from "@/components/ui/button";
import { SalesList } from "@/features/sales/components/SalesList";
import { listSales } from "@/features/sales/queries";
import { requireShop } from "@/features/shop/require";
import { can } from "@/lib/permissions";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.sales.title };

export default function SalesPage({ params }: PageProps<"/s/[shopSlug]/ventes">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Sales params={params} />
    </Suspense>
  );
}

async function Sales({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shop, role } = await requireShop(params);
  await connection();
  const sales = await listSales(shop.id, { withCosts: can(role, "viewCosts") });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={fr.sales.title}
        description={can(role, "viewAllSales") ? fr.sales.subtitle : fr.sales.subtitleManager}
        actions={
          <Button asChild>
            <Link href={`/s/${shop.slug}/ventes/nouvelle`}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              {fr.nav.newSaleLabel}
            </Link>
          </Button>
        }
      />
      <SalesList sales={sales} now={new Date().toISOString()} />
    </div>
  );
}
