"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ChevronRight, Plus, Users } from "lucide-react";
import { ChipGroup } from "@/components/shared/ChipGroup";
import { EmptyState } from "@/components/shared/EmptyState";
import { matchesSearch, SearchInput } from "@/components/shared/SearchInput";
import { WhatsAppLink } from "@/components/shared/WhatsAppLink";
import { Button } from "@/components/ui/button";
import { useShop } from "@/features/shop/shop-context";
import { formatMoney } from "@/lib/format";
import { plural } from "@/lib/i18n";
import { initials } from "@/lib/initials";
import { formatPhone } from "@/lib/phone";
import { fr } from "@/messages/fr";
import type { Customer, CustomerType } from "../types";
import { CustomerFormDialog } from "./CustomerFormDialog";

const t = fr.customers;
type Filter = "all" | CustomerType;

export type CustomerStats = Record<
  string,
  { purchases: number; totalSpent: number; lastPurchaseAt: string | null }
>;

export function CustomersList({
  customers,
  stats = {},
}: {
  customers: Customer[];
  stats?: CustomerStats;
}) {
  const { shop } = useShop();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const active = customers.filter((c) => showArchived || !c.archivedAt);
  const archivedCount = customers.length - customers.filter((c) => !c.archivedAt).length;
  const visible = active.filter(
    (c) =>
      (filter === "all" || c.type === filter) &&
      (!deferredQuery || matchesSearch(`${c.name} ${c.phone ?? ""}`, deferredQuery)),
  );

  const chips = [
    { value: "all" as const, label: fr.common.all, count: active.length },
    {
      value: "individual" as const,
      label: t.types.individual,
      count: active.filter((c) => c.type === "individual").length,
    },
    {
      value: "reseller" as const,
      label: t.types.reseller,
      count: active.filter((c) => c.type === "reseller").length,
    },
  ];

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title={t.emptyTitle}
        text={t.emptyText}
        action={
          <CustomerFormDialog
            trigger={
              <Button>
                <Plus data-icon="inline-start" aria-hidden="true" />
                {t.add}
              </Button>
            }
          />
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchInput value={query} onValueChange={setQuery} className="md:max-w-md" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipGroup
          aria-label={t.filterLabel}
          chips={chips}
          value={filter}
          onValueChange={setFilter}
        />
        {archivedCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? fr.common.hideArchived : `${fr.common.showArchived} (${archivedCount})`}
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{fr.common.noResults}</p>
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
          {visible.map((customer) => (
            <li key={customer.id} className="flex items-center gap-2 pr-3 sm:pr-4">
              <Link
                href={`/s/${shop.slug}/clients/${customer.id}`}
                className="flex min-h-16 min-w-0 flex-1 items-center gap-4 py-3 pl-4 outline-none focus-visible:bg-surface-muted/60 sm:pl-5"
              >
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-cognac-tint font-semibold text-cognac"
                >
                  {initials(customer.name)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="truncate">{customer.name}</span>
                    {customer.type === "reseller" ? (
                      <span className="shrink-0 rounded-full bg-cognac-tint px-2 py-0.5 text-xs font-semibold text-cognac">
                        {t.types.reseller}
                      </span>
                    ) : null}
                    {customer.archivedAt ? (
                      <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        {fr.common.archived}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {[
                      customer.phone ? formatPhone(customer.phone) : null,
                      stats[customer.id]
                        ? `${plural(stats[customer.id].purchases, fr.sales.purchases)} · ${formatMoney(stats[customer.id].totalSpent)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-subtle max-sm:hidden"
                />
              </Link>
              {customer.phone ? (
                <WhatsAppLink
                  phone={customer.phone}
                  label={`${t.whatsapp} — ${customer.name}`}
                  size="icon"
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
