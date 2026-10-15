"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Megaphone, Package, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { ChipGroup } from "@/components/shared/ChipGroup";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { useCan, useShop } from "@/features/shop/shop-context";
import { errorMessage } from "@/lib/errors";
import { formatDate, toDateInputValue } from "@/lib/format";
import { fr } from "@/messages/fr";
import { cancelExpense } from "../actions";
import { EXPENSE_CATEGORIES } from "../schemas";
import type { Expense } from "../types";

const t = fr.expenses;
type Period = "today" | "week" | "month" | "all";
const DAY = 24 * 60 * 60 * 1000;
const ICONS = {
  delivery: <Truck />,
  packaging: <Package />,
  advertising: <Megaphone />,
  other: <Wallet />,
};

export function ExpensesList({ expenses, now }: { expenses: Expense[]; now: string }) {
  const { shop } = useShop();
  const canCancel = useCan("cancelOperations");
  const [period, setPeriod] = useState<Period>("month");
  const reference = new Date(now);

  const visible = expenses.filter((expense) => {
    if (period === "all") return true;
    if (period === "today")
      return toDateInputValue(expense.spentAt) === toDateInputValue(reference);
    const days = period === "week" ? 7 : 30;
    return reference.getTime() - new Date(expense.spentAt).getTime() <= days * DAY;
  });
  const active = visible.filter((e) => e.status === "active");
  const total = active.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = EXPENSE_CATEGORIES.map((category) => ({
    category,
    amount: active.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0),
  })).filter((row) => row.amount > 0);

  const chips = (["today", "week", "month", "all"] as const).map((value) => ({
    value,
    label: fr.sales.periods[value],
  }));

  if (expenses.length === 0) {
    return <EmptyState icon={<Wallet />} title={t.emptyTitle} text={t.emptyText} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <ChipGroup
        aria-label={fr.sales.periodLabel}
        chips={chips}
        value={period}
        onValueChange={setPeriod}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[13px] font-medium text-muted-foreground">{t.total}</span>
          <Money amount={total} size="lg" className="block" />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {byCategory.map((row) => (
            <li key={row.category} className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t.categories[row.category]}</span>
              <Money amount={row.amount} size="sm" />
            </li>
          ))}
        </ul>
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{fr.common.noResults}</p>
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
          {visible.map((expense) => {
            const cancelled = expense.status === "cancelled";
            const linked = expense.receptionId
              ? {
                  href: `/s/${shop.slug}/receptions/${expense.receptionId}`,
                  label: t.linkedReception,
                }
              : expense.returnId
                ? { href: `/s/${shop.slug}/retours/${expense.returnId}`, label: t.linkedReturn }
                : null;
            return (
              <li key={expense.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-cognac-tint text-cognac [&_svg]:size-[18px]"
                >
                  {ICONS[expense.category]}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn("truncate font-semibold", cancelled && "line-through opacity-60")}
                  >
                    {t.categories[expense.category]}
                    {expense.supplierName ? ` · ${expense.supplierName}` : ""}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {formatDate(expense.spentAt)}
                    {linked ? (
                      <>
                        {" · "}
                        <Link
                          href={linked.href}
                          className="text-cognac underline-offset-4 hover:underline"
                        >
                          {linked.label}
                        </Link>
                      </>
                    ) : null}
                    {expense.note ? ` · ${expense.note}` : ""}
                    {cancelled ? ` · ${t.cancelled} — ${expense.cancelReason}` : ""}
                  </span>
                </span>
                <Money
                  amount={expense.amount}
                  size="md"
                  className={cancelled ? "line-through opacity-60" : undefined}
                />
                {canCancel && !cancelled && !linked ? (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label={t.cancelAction}>
                        <Ban aria-hidden="true" />
                      </Button>
                    }
                    title={t.cancelTitle}
                    description={t.cancelDescription}
                    reasonLabel={t.cancelReason}
                    confirmLabel={t.cancelAction}
                    onConfirm={async (reason) => {
                      const result = await cancelExpense(expense.id, reason);
                      if (result.ok) toast.success(t.cancelledToast);
                      else toast.error(errorMessage(result.error));
                      return result.ok;
                    }}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
