import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { Forbidden } from "@/components/layout/Forbidden";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Money } from "@/components/shared/Money";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Panel,
  PaymentBreakdown,
  SupplierDueList,
} from "@/features/dashboard/components/DashboardBlocks";
import { PeriodLinks } from "@/features/dashboard/components/PeriodLinks";
import { SalesChart } from "@/features/dashboard/components/SalesChart";
import { ShareBars } from "@/features/dashboard/components/ShareBars";
import { getDailySales, getDashboard } from "@/features/dashboard/queries";
import { requireShopAction } from "@/features/shop/require";
import { formatDate, formatQty } from "@/lib/format";
import { plural } from "@/lib/i18n";
import { isPeriodKey, periodRange, type PeriodKey } from "@/lib/period";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.reports.title };

const t = fr.reports;
const d = fr.dashboard;

export default function ReportsPage({ params, searchParams }: PageProps<"/s/[shopSlug]/rapports">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reports params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Reports({
  params,
  searchParams,
}: {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { context, allowed } = await requireShopAction(params, "viewReports");
  if (!allowed) return <Forbidden title={t.title} />;
  const shop = context.shop;
  const query = await searchParams;
  await connection();

  const key: PeriodKey = isPeriodKey(query.periode) ? query.periode : "mois";
  const range = periodRange(key, new Date(), {
    from: typeof query.du === "string" ? query.du : undefined,
    to: typeof query.au === "string" ? query.au : undefined,
  });
  const [dashboard, daily] = await Promise.all([
    getDashboard(shop.id, range.from, range.to),
    getDailySales(shop.id, range.firstDay, range.lastDay),
  ]);

  const base = `/s/${shop.slug}/rapports`;
  const hrefFor = (k: PeriodKey) =>
    k === "libre"
      ? `${base}?periode=libre&du=${range.firstDay}&au=${range.lastDay}`
      : `${base}?periode=${k}`;
  const exportHref = (type: "ventes" | "depenses") =>
    `${base}/export?type=${type}&du=${range.firstDay}&au=${range.lastDay}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        className="mb-0 lg:mb-0"
        title={t.title}
        description={`${formatDate(range.from)} → ${formatDate(range.lastDay)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={exportHref("ventes")} download>
                <Download data-icon="inline-start" aria-hidden="true" />
                {t.exportSales}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={exportHref("depenses")} download>
                <Download data-icon="inline-start" aria-hidden="true" />
                {t.exportExpenses}
              </a>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PeriodLinks
          current={key}
          hrefFor={hrefFor}
          keys={["jour", "semaine", "mois", "libre"]}
          className="w-full md:w-auto"
        />
        {key === "libre" ? (
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="periode" value="libre" />
            <label className="flex flex-col gap-1 text-sm font-semibold">
              {t.from}
              <Input type="date" name="du" defaultValue={range.firstDay} className="h-11" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              {t.to}
              <Input type="date" name="au" defaultValue={range.lastDay} className="h-11" />
            </label>
            <Button type="submit" variant="secondary">
              {t.apply}
            </Button>
          </form>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          variant="espresso"
          label={d.netProfit}
          amount={dashboard.netProfit ?? 0}
          className="col-span-2 lg:col-span-1 xl:col-span-2"
        />
        <StatCard label={d.revenue} amount={dashboard.revenue} />
        <StatCard
          label={d.margin}
          amount={dashboard.margin ?? 0}
          amountVariant={(dashboard.margin ?? 0) < 0 ? "negative" : "positive"}
        />
        <StatCard label={d.expenses} amount={dashboard.expenses ?? 0} />
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
          <span className="text-[13px] font-medium text-muted-foreground">{d.bags}</span>
          <span className="font-display text-[22px] font-bold tabular-nums">{dashboard.bags}</span>
          <span className="text-[13px] text-muted-foreground">
            {plural(dashboard.salesCount, d.salesCount)}
          </span>
        </div>
      </div>

      {daily.length <= 62 ? (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <SalesChart data={daily} title={t.dailyChart} />
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title={d.topProducts} className="lg:col-span-2">
          {dashboard.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.none}</p>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted-foreground">
                    <th scope="col" className="py-2 font-medium">
                      {t.model}
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      {t.bagsCol}
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      {t.revenueCol}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.topProducts.map((product) => (
                    <tr key={product.productId} className="border-b border-line-soft last:border-0">
                      <td className="py-3 font-medium">{product.name}</td>
                      <td className="py-3 text-right tabular-nums">{formatQty(product.bags)}</td>
                      <td className="py-3 text-right">
                        <Money amount={product.revenue} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title={d.payments}>
          <PaymentBreakdown payments={dashboard.byPayment} />
        </Panel>
        <Panel title={d.channels} className="lg:col-span-2">
          <ShareBars
            emptyText={t.none}
            rows={dashboard.byChannel.map((c) => ({
              key: c.channel,
              label: fr.channels[c.channel],
              detail: plural(c.count, d.salesCount),
              amount: c.amount,
            }))}
          />
        </Panel>
        <Panel title={d.supplierDue}>
          <SupplierDueList balances={dashboard.supplierBalances ?? []} slug={shop.slug} />
        </Panel>
      </div>
    </div>
  );
}
