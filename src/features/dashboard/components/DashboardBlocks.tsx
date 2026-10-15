import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Money } from "@/components/shared/Money";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { StockBadge } from "@/components/shared/StockBadge";
import type { Sale } from "@/features/sales/types";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";
import type { Dashboard } from "../queries";

const t = fr.dashboard;

/** Card with a title and an optional "see all" link. */
export function Panel({
  title,
  href,
  linkLabel,
  children,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg">{title}</h2>
        {href ? (
          <Link
            href={href}
            className="flex min-h-11 items-center gap-1 text-sm font-semibold text-cognac hover:underline"
          >
            {linkLabel}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const PAY_BG = {
  wave: "bg-pay-wave",
  orange_money: "bg-pay-om",
  cash: "bg-pay-cash",
  other: "bg-subtle",
};

/** Collections by payment method: stacked bar (2px gaps) + legend with amounts. */
export function PaymentBreakdown({ payments }: { payments: Dashboard["byPayment"] }) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">{t.paymentsEmpty}</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {payments.map((p) => (
          <span
            key={p.method}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", PAY_BG[p.method])}
            style={{ width: `${(p.amount / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {payments.map((p) => (
          <li key={p.method} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className={cn("size-2.5 rounded-full", PAY_BG[p.method])} />
            <span className="flex-1">{fr.paymentMethods[p.method]}</span>
            <span className="text-muted-foreground tabular-nums">
              {Math.round((p.amount / total) * 100)} %
            </span>
            <Money amount={p.amount} size="sm" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SupplierDueList({
  balances,
  slug,
}: {
  balances: NonNullable<Dashboard["supplierBalances"]>;
  slug: string;
}) {
  if (balances.length === 0)
    return <p className="text-sm text-muted-foreground">{t.supplierDueEmpty}</p>;
  return (
    <ul className="flex flex-col divide-y divide-line-soft">
      {balances.map((b) => (
        <li key={b.supplierId}>
          <Link
            href={`/s/${slug}/fournisseurs/${b.supplierId}`}
            className="flex min-h-12 items-center justify-between gap-3 hover:text-cognac"
          >
            <span className="truncate font-medium">{b.name}</span>
            <span className="flex items-center gap-2">
              {b.balance < 0 ? (
                <span className="text-xs text-muted-foreground">{t.advance}</span>
              ) : null}
              <Money
                amount={Math.abs(b.balance)}
                size="md"
                variant={b.balance < 0 ? "positive" : "default"}
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LowStockList({ items, slug }: { items: Dashboard["lowStock"]; slug: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{t.lowStockEmpty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.productId}>
          <Link
            href={`/s/${slug}/modeles/${item.productId}`}
            className="flex min-h-12 items-center gap-3 rounded-xl hover:bg-surface-muted/50"
          >
            <ProductThumb
              name={item.name}
              color={item.color}
              size={40}
              className="size-10 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
            <StockBadge
              label={
                item.available === 0 ? fr.stock.outOfStock : fill(t.left, { n: item.available })
              }
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function RecentSales({ sales, slug }: { sales: Sale[]; slug: string }) {
  if (sales.length === 0)
    return <p className="text-sm text-muted-foreground">{t.recentSalesEmpty}</p>;
  return (
    <ul className="flex flex-col divide-y divide-line-soft">
      {sales.map((sale) => (
        <li key={sale.id}>
          <Link
            href={`/s/${slug}/ventes/${sale.id}`}
            className="flex min-h-14 items-center gap-3 py-2 hover:text-cognac"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">
                {sale.lines.map((line) => line.productName).join(", ")}
              </span>
              <span className="truncate text-[13px] text-muted-foreground">
                {formatDate(sale.soldAt, "time")} · {formatQty(sale.bags)} ·{" "}
                {sale.customerName ?? fr.sales.anonymous} · {fr.channels[sale.channel]}
              </span>
            </span>
            <span className="flex flex-col items-end">
              <Money amount={sale.totalAmount} size="md" />
              {sale.margin !== null ? (
                <Money
                  amount={sale.margin}
                  size="sm"
                  signed
                  variant={sale.margin < 0 ? "negative" : "positive"}
                />
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Small figure inside the espresso net-profit card. */
export function MiniFigure({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone?: "mint";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-espresso-muted">{label}</span>
      <span
        className={cn(
          "truncate font-display text-base font-bold tabular-nums",
          tone === "mint" ? "text-mint" : "text-espresso-ink",
        )}
      >
        {formatMoney(amount)}
      </span>
    </div>
  );
}
