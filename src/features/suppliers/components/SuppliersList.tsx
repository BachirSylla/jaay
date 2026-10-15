"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ChevronRight, Phone, Plus, Truck } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { matchesSearch, SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { useShop } from "@/features/shop/shop-context";
import { initials } from "@/lib/initials";
import { formatPhone } from "@/lib/phone";
import { fr } from "@/messages/fr";
import type { Supplier } from "../types";
import { SupplierFormDialog } from "./SupplierFormDialog";

const t = fr.suppliers;

export function SuppliersList({ suppliers }: { suppliers: Supplier[] }) {
  const { shop } = useShop();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const archivedCount = suppliers.filter((s) => s.archivedAt).length;
  const visible = suppliers.filter(
    (s) =>
      (showArchived || !s.archivedAt) &&
      (!deferredQuery || matchesSearch(`${s.name} ${s.phone ?? ""}`, deferredQuery)),
  );

  if (suppliers.length === 0) {
    return (
      <EmptyState
        icon={<Truck />}
        title={t.emptyTitle}
        text={t.emptyText}
        action={
          <SupplierFormDialog
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={query} onValueChange={setQuery} className="sm:max-w-sm sm:flex-1" />
        {archivedCount > 0 ? (
          <Button variant="ghost" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? fr.common.hideArchived : `${fr.common.showArchived} (${archivedCount})`}
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{fr.common.noResults}</p>
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
          {visible.map((supplier) => (
            <li key={supplier.id}>
              <Link
                href={`/s/${shop.slug}/fournisseurs/${supplier.id}`}
                className="flex min-h-16 items-center gap-4 px-4 py-3 transition-colors outline-none hover:bg-surface-muted/50 focus-visible:bg-surface-muted/60 sm:px-5"
              >
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-cognac-tint font-semibold text-cognac"
                >
                  {initials(supplier.name)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 truncate font-semibold">
                    {supplier.name}
                    {supplier.archivedAt ? (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        {fr.common.archived}
                      </span>
                    ) : null}
                  </span>
                  {supplier.phone ? (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone aria-hidden="true" className="size-3.5" />
                      {formatPhone(supplier.phone)}
                    </span>
                  ) : null}
                </span>
                <ChevronRight aria-hidden="true" className="size-5 text-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
