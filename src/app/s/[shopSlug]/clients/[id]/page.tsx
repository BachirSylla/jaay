import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { History, Phone, StickyNote, Tag } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoRow } from "@/components/shared/InfoRow";
import { CustomerActions } from "@/features/customers/components/CustomerActions";
import { getCustomer } from "@/features/customers/queries";
import { requireShop } from "@/features/shop/require";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.customers.title };

const t = fr.customers;

export default function CustomerPage({ params }: PageProps<"/s/[shopSlug]/clients/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomerDetail params={params} />
    </Suspense>
  );
}

async function CustomerDetail({ params }: { params: Promise<{ shopSlug: string; id: string }> }) {
  const { shop } = await requireShop(params);
  const { id } = await params;
  const customer = isUuid(id) ? await getCustomer(shop.id, id) : null;
  if (!customer) notFound();

  return (
    <div className="max-w-4xl">
      <PageHeader
        backHref={`/s/${shop.slug}/clients`}
        eyebrow={customer.archivedAt ? fr.common.archived : t.types[customer.type]}
        title={customer.name}
        description={`${t.since} ${formatDate(customer.createdAt)}`}
        actions={<CustomerActions customer={customer} />}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg">{fr.common.details}</h2>
          <dl className="flex flex-col gap-3">
            <InfoRow icon={<Phone />} label={fr.common.phone}>
              {customer.phone ? formatPhone(customer.phone) : "—"}
            </InfoRow>
            <InfoRow icon={<Tag />} label={t.type}>
              {t.types[customer.type]}
            </InfoRow>
            <InfoRow icon={<StickyNote />} label={t.notes}>
              <span className="whitespace-pre-line">{customer.notes ?? "—"}</span>
            </InfoRow>
          </dl>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-lg">{t.historyTitle}</h2>
          <EmptyState icon={<History />} title={t.historyTitle} text={t.historyComing} />
        </section>
      </div>
    </div>
  );
}
