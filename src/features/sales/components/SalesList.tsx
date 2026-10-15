"use client";

import Link from "next/link";
import { useState } from "react";
import { Receipt } from "lucide-react";
import { cn } from "cn";
import { ChipGroup } from "@/components/shared/ChipGroup";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { useShop } from "@/features/shop/shop-context";
import { formatDate, formatQty, toDateInputValue } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";
import type { Sale } from "../types";

const t = fr.sales;
type Period = "today" | "week" | "month" | "all";
const DAY = 24 * 60 * 60 * 1000;

function inPeriod(sale: Sale, period: Period, now: Date): boolean {
  if (period === "all") return true;
  if (period === "today") return toDateInputValue(sale.soldAt) === toDateInputValue(now);
  const days = period === "week" ? 7 : 30;
  return now.getTime() - new Date(sale.soldAt).getTime() <= days * DAY;
}

/** Sales grouped by day, with a period filter. Margins only reach owner/admin. */
export function SalesList({ sales, now }: { sales: Sale[]; now: string }) {
  const { shop } = useShop();
  const [period, setPeriod] = useState<Period>("week");
  const reference = new Date(now);

  const visible = sales.filter((sale) => inPeriod(sale, period, reference));
  const active = visible.filter((sale) => sale.status === "active");
  const revenue = active.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const margins = active.map((sale) => sale.margin);
  const margin = margins.every((m) => m !== null)
    ? margins.reduce<number>((sum, m) => sum + (m ?? 0), 0)
    : null;

  const groups = new Map<string, Sale[]>();
  for (const sale of visible) {
    const day = toDateInputValue(sale.soldAt);
    groups.set(day, [...(groups.get(day) ?? []), sale]);
  }

  const chips = (["today", "week", "month", "all"] as const).map((value) => ({
    value,
    label: t.periods[value],
  }));

  if (sales.length === 0) {
    return <EmptyState icon={<Receipt />} title={t.emptyTitle} text={t.emptyText} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <ChipGroup
        aria-label={t.periodLabel}
        chips={chips}
        value={period}
        onValueChange={setPeriod}
      />

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <span className="text-[13px] font-medium text-muted-foreground">
            {fill(t.countLabel, { n: active.length })}
          </span>
          <Money amount={revenue} size="lg" className="block" />
        </div>
        {margin !== null ? (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <span className="text-[13px] font-medium text-muted-foreground">{t.margin}</span>
            <Money
              amount={margin}
              size="lg"
              variant={margin < 0 ? "negative" : "positive"}
              className="block"
            />
          </div>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{fr.common.noResults}</p>
      ) : (
        [...groups.entries()].map(([day, daySales]) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className="font-sans text-sm font-semibold text-muted-foreground first-letter:uppercase">
              {formatDate(daySales[0].soldAt, "long")}
            </h2>
            <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
              {daySales.map((sale) => {
                const cancelled = sale.status === "cancelled";
                return (
                  <li key={sale.id}>
                    <Link
                      href={`/s/${shop.slug}/ventes/${sale.id}`}
                      className="flex min-h-16 items-center gap-3 px-4 py-3 outline-none hover:bg-surface-muted/50 focus-visible:bg-surface-muted/60 sm:px-5"
                    >
                      <span className="grid h-11 min-w-11 shrink-0 place-items-center rounded-xl bg-surface-muted px-1.5 text-xs font-bold tabular-nums">
                        {fill(t.numberShort, { n: sale.number })}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={cn(
                            "truncate font-semibold",
                            cancelled && "line-through opacity-60",
                          )}
                        >
                          {sale.lines.map((line) => line.productName).join(", ")}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">
                          {formatDate(sale.soldAt, "time")} · {formatQty(sale.bags)} ·{" "}
                          {sale.customerName ?? t.anonymous} · {fr.channels[sale.channel]}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        {cancelled ? (
                          <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                            {t.cancelled}
                          </span>
                        ) : (
                          <>
                            <Money amount={sale.totalAmount} size="md" />
                            {sale.margin !== null ? (
                              <Money
                                amount={sale.margin}
                                size="sm"
                                signed
                                variant={sale.margin < 0 ? "negative" : "positive"}
                              />
                            ) : null}
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
