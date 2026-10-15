"use client";

import { useDeferredValue, useState } from "react";
import { ChevronDown, Plus, UserRound, X } from "lucide-react";
import { matchesSearch, SearchInput } from "@/components/shared/SearchInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerFormDialog } from "@/features/customers/components/CustomerFormDialog";
import type { Customer } from "@/features/customers/types";
import { fill } from "@/lib/i18n";
import { initials } from "@/lib/initials";
import { formatPhone } from "@/lib/phone";
import { fr } from "@/messages/fr";

const t = fr.sales;

/** Customer of the sale: search the file, create on the fly, or leave anonymous. */
export function CustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: Customer[];
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const active = customers.filter((c) => !c.archivedAt);
  const visible = active
    .filter((c) => !deferredQuery || matchesSearch(`${c.name} ${c.phone ?? ""}`, deferredQuery))
    .slice(0, 30);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg border border-line bg-surface px-3.5 text-left outline-none hover:bg-surface-muted/50 focus-visible:border-[1.5px] focus-visible:border-cognac"
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-cognac-tint text-xs font-semibold text-cognac"
          >
            {value ? initials(value.name) : <UserRound className="size-4" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{value ? value.name : t.anonymous}</span>
            {value?.phone ? (
              <span className="truncate text-xs text-muted-foreground">
                {formatPhone(value.phone)}
              </span>
            ) : null}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 text-subtle" />
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t.removeCustomer}
            className="grid size-11 place-items-center rounded-lg text-subtle hover:bg-surface-muted hover:text-ink"
          >
            <X aria-hidden="true" className="size-[18px]" />
          </button>
        ) : null}
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t.customer}</DialogTitle>
            <DialogDescription className="sr-only">{t.customerSearch}</DialogDescription>
          </DialogHeader>
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder={t.customerSearch}
            aria-label={t.customerSearch}
            autoFocus
          />
          <ul className="-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCreating(true);
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left font-semibold text-cognac hover:bg-surface-muted"
              >
                <span className="grid size-9 place-items-center rounded-full bg-cognac-tint">
                  <Plus aria-hidden="true" className="size-4" />
                </span>
                {query.trim() ? fill(t.createCustomer, { name: query.trim() }) : t.newCustomer}
              </button>
            </li>
            {visible.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(customer);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-muted"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-cognac-tint text-xs font-semibold text-cognac"
                  >
                    {initials(customer.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{customer.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[
                        fr.customers.types[customer.type],
                        customer.phone && formatPhone(customer.phone),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog
        // Re-mounted for each creation so the form starts from the name being searched.
        key={creating ? `new-${query}` : "idle"}
        open={creating}
        onOpenChange={setCreating}
        initialName={query.trim()}
        onCreated={(customer) => {
          onChange(customer);
          setQuery("");
        }}
      />
    </>
  );
}
