import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { History, Phone, StickyNote, Tag } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoRow } from "@/components/shared/InfoRow";
import { Money } from "@/components/shared/Money";
import { CustomerActions } from "@/features/customers/components/CustomerActions";
import { getCustomer } from "@/features/customers/queries";
import { listSales } from "@/features/sales/queries";
import { requireShop } from "@/features/shop/require";
import { formatDate, formatQty } from "@/lib/format";
import { fill, plural } from "@/lib/i18n";
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
  // RLS: a manager only gets the sales they made.
  const sales = await listSales(shop.id, { customerId: customer.id, withCosts: false });
  const active = sales.filter((sale) => sale.status === "active");
  const totalSpent = active.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return (
    <div className="max-w-4xl">
      <PageHeader
        backHref={`/s/${shop.slug}/clients`}
        eyebrow={customer.archivedAt ? fr.common.archived : t.types[customer.type]}
        title={customer.name}
        description={`${t.since} ${formatDate(customer.createdAt)}`}
        actions={<CustomerActions customer={customer} />}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <span className="text-[13px] font-medium text-muted-foreground">
                {fr.sales.totalSpent}
              </span>
              <Money amount={totalSpent} size="lg" className="block" />
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <span className="text-[13px] font-medium text-muted-foreground">
                {fr.sales.lastPurchase}
              </span>
              <span className="block font-display text-lg font-bold">
                {active[0] ? formatDate(active[0].soldAt) : "—"}
              </span>
            </div>
          </div>
          <dl className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
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
        </div>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg">
            {t.historyTitle}
            {active.length > 0 ? (
              <span className="ml-2 font-sans text-sm font-medium text-muted-foreground">
                {plural(active.length, fr.sales.purchases)}
              </span>
            ) : null}
          </h2>
          {sales.length === 0 ? (
            <EmptyState icon={<History />} title={t.historyTitle} text={t.historyComing} />
          ) : (
            <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
              {sales.map((sale) => (
                <li key={sale.id}>
                  <Link
                    href={`/s/${shop.slug}/ventes/${sale.id}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface-muted/50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">
                        {sale.lines.map((line) => line.productName).join(", ")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(sale.soldAt)} · {formatQty(sale.bags)} ·{" "}
                        {fill(fr.sales.numberShort, { n: sale.number })}
                      </span>
                    </span>
                    {sale.status === "cancelled" ? (
                      <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                        {fr.sales.cancelled}
                      </span>
                    ) : (
                      <Money amount={sale.totalAmount} size="md" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
