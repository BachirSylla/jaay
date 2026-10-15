import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Button } from "@/components/ui/button";
import { CustomerFormDialog } from "@/features/customers/components/CustomerFormDialog";
import { CustomersList } from "@/features/customers/components/CustomersList";
import { listCustomers } from "@/features/customers/queries";
import { requireShop } from "@/features/shop/require";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.customers.title };

export default function CustomersPage({ params }: PageProps<"/s/[shopSlug]/clients">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Customers params={params} />
    </Suspense>
  );
}

async function Customers({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shop } = await requireShop(params);
  const customers = await listCustomers(shop.id);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={fr.customers.title}
        description={fr.customers.subtitle}
        actions={
          customers.length > 0 ? (
            <CustomerFormDialog
              trigger={
                <Button>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  {fr.customers.add}
                </Button>
              }
            />
          ) : null
        }
      />
      <CustomersList customers={customers} />
    </div>
  );
}
