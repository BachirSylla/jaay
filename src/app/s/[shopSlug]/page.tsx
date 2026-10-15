import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { Money } from "@/components/shared/Money";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import {
  LowStockList,
  MiniFigure,
  Panel,
  PaymentBreakdown,
  RecentSales,
  SupplierDueList,
} from "@/features/dashboard/components/DashboardBlocks";
import { PeriodLinks } from "@/features/dashboard/components/PeriodLinks";
import { SalesChart } from "@/features/dashboard/components/SalesChart";
import { getDailySales, getDashboard } from "@/features/dashboard/queries";
import { listSales } from "@/features/sales/queries";
import { requireShop } from "@/features/shop/require";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import { fill, plural } from "@/lib/i18n";
import { isPeriodKey, lastSevenDays, periodRange } from "@/lib/period";
import { can } from "@/lib/permissions";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.nav.dashboard };

const t = fr.dashboard;

export default function DashboardPage({ params, searchParams }: PageProps<"/s/[shopSlug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, shop, role } = await requireShop(params);
  const { periode } = await searchParams;
  // "Now" is request-time data.
  await connection();
  const now = new Date();
  const key = isPeriodKey(periode) && periode !== "libre" ? periode : "jour";
  const range = periodRange(key, now);
  const week = lastSevenDays(now);
  const finance = can(role, "viewCosts");

  const [dashboard, daily, recent] = await Promise.all([
    getDashboard(shop.id, range.from, range.to),
    getDailySales(shop.id, week.firstDay, week.lastDay),
    listSales(shop.id, { from: range.from, to: range.to, withCosts: finance, limit: 6 }),
  ]);
  const recentActive = recent.filter((sale) => sale.status === "active").slice(0, 5);
  const base = `/s/${shop.slug}`;
  const hrefFor = (k: string) => (k === "jour" ? base : `${base}?periode=${k}`);
  const firstName = user.fullName.split(" ")[0] || user.fullName;
  const totalDue = (dashboard.supplierBalances ?? []).reduce(
    (sum, b) => sum + Math.max(0, b.balance),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        className="mb-0 lg:mb-0"
        eyebrow={`${formatDate(now, "long")} · ${shop.name}`}
        title={fill(t.greeting, { name: firstName })}
        actions={
          <>
            <PeriodLinks current={key} hrefFor={hrefFor} className="w-full md:w-auto" />
            <Button asChild className="max-md:hidden">
              <Link href={`${base}/ventes/nouvelle`}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                {fr.nav.newSaleLabel}
              </Link>
            </Button>
          </>
        }
      />

      {finance && dashboard.netProfit !== null ? (
        <>
          {/* Phone & tablet: espresso card with 3 mini figures (mockup 1). */}
          <section className="flex flex-col gap-4 rounded-3xl bg-espresso p-5 text-espresso-ink lg:hidden">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-espresso-muted">{t.netProfit}</span>
              <Money
                amount={dashboard.netProfit}
                size="hero"
                currencyClassName="text-gold"
                className={dashboard.netProfit < 0 ? "text-danger-on-espresso" : undefined}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-espresso-ink/10 pt-4">
              <MiniFigure
                label={plural(dashboard.salesCount, t.salesCount)}
                amount={dashboard.revenue}
              />
              <MiniFigure label={t.margin} amount={dashboard.margin ?? 0} tone="mint" />
              <MiniFigure label={t.expenses} amount={dashboard.expenses ?? 0} />
            </div>
          </section>
          {/* Desktop: 4 indicators, net profit in espresso (mockup 7). */}
          <div className="hidden gap-3 lg:grid lg:grid-cols-4">
            <StatCard
              variant="espresso"
              label={t.netProfit}
              amount={dashboard.netProfit}
              sub={fill(t.netProfitSub, {
                margin: formatMoney(dashboard.margin ?? 0),
                expenses: formatMoney(dashboard.expenses ?? 0),
              })}
            />
            <StatCard
              label={t.revenue}
              amount={dashboard.revenue}
              sub={`${plural(dashboard.salesCount, t.salesCount)} · ${formatQty(dashboard.bags)}`}
            />
            <StatCard
              label={t.margin}
              amount={dashboard.margin ?? 0}
              amountVariant={(dashboard.margin ?? 0) < 0 ? "negative" : "positive"}
            />
            <StatCard label={t.expenses} amount={dashboard.expenses ?? 0} />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label={t.revenue}
            amount={dashboard.revenue}
            sub={plural(dashboard.salesCount, t.salesCount)}
            className="col-span-2 lg:col-span-1"
          />
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
            <span className="text-[13px] font-medium text-muted-foreground">{t.bags}</span>
            <span className="font-display text-[22px] font-bold tabular-nums">
              {dashboard.bags}
            </span>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
            <span className="text-[13px] font-medium text-muted-foreground">{t.sales}</span>
            <span className="font-display text-[22px] font-bold tabular-nums">
              {dashboard.salesCount}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
          {finance ? (
            <Link
              href={`${base}/fournisseurs`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 transition-transform duration-150 ease-out hover:border-cognac/40 active:scale-[0.98] lg:hidden"
            >
              <span className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-muted-foreground">
                  {t.supplierDue}
                </span>
                <Money amount={totalDue} size="lg" />
              </span>
              <ChevronRight aria-hidden="true" className="size-5 text-subtle" />
            </Link>
          ) : null}

          <section className="rounded-2xl border border-line bg-surface p-5">
            <SalesChart data={daily} title={t.weekChart} />
          </section>

          <Panel title={t.recentSales} href={`${base}/ventes`} linkLabel={t.seeAllSales}>
            <RecentSales sales={recentActive} slug={shop.slug} />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {finance && dashboard.supplierBalances ? (
            <Panel
              title={t.supplierDue}
              href={`${base}/fournisseurs`}
              linkLabel={fr.common.seeAll}
              className="max-lg:hidden"
            >
              <SupplierDueList balances={dashboard.supplierBalances} slug={shop.slug} />
            </Panel>
          ) : null}
          <Panel title={t.payments}>
            <PaymentBreakdown payments={dashboard.byPayment} />
          </Panel>
          <Panel title={t.lowStock} href={`${base}/stock`} linkLabel={fr.common.seeAll}>
            <LowStockList items={dashboard.lowStock} slug={shop.slug} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
