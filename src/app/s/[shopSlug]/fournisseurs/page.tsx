import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Forbidden } from "@/components/layout/Forbidden";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Button } from "@/components/ui/button";
import { requireShopAction } from "@/features/shop/require";
import { SupplierFormDialog } from "@/features/suppliers/components/SupplierFormDialog";
import { SuppliersList } from "@/features/suppliers/components/SuppliersList";
import { getSupplierBalances, listSuppliers } from "@/features/suppliers/queries";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.suppliers.title };

export default function SuppliersPage({ params }: PageProps<"/s/[shopSlug]/fournisseurs">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Suppliers params={params} />
    </Suspense>
  );
}

async function Suppliers({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { context, allowed } = await requireShopAction(params, "viewSuppliers");
  if (!allowed) return <Forbidden title={fr.suppliers.title} />;
  const [suppliers, balances] = await Promise.all([
    listSuppliers(context.shop.id),
    getSupplierBalances(context.shop.id),
  ]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={fr.suppliers.title}
        description={fr.suppliers.subtitle}
        actions={
          suppliers.length > 0 ? (
            <SupplierFormDialog
              trigger={
                <Button>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  {fr.suppliers.add}
                </Button>
              }
            />
          ) : null
        }
      />
      <SuppliersList
        suppliers={suppliers}
        balances={Object.fromEntries(Object.entries(balances).map(([id, b]) => [id, b.balance]))}
      />
    </div>
  );
}
