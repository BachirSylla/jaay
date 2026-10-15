"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/initials";
import { fr } from "@/messages/fr";
import { useShop } from "../shop-context";

function ShopBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[10px] bg-cognac font-display text-sm font-bold text-on-cognac",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Sidebar shop selector (espresso). Collapses to the badge on tablets. */
export function ShopSwitcher() {
  const { shop, role, shops } = useShop();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={fr.shop.switcherLabel}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-gold/60 data-[state=open]:bg-sidebar-accent max-lg:justify-center"
      >
        <ShopBadge name={shop.name} />
        <span className="flex min-w-0 flex-1 flex-col max-lg:hidden">
          <span className="truncate font-semibold text-espresso-ink">{shop.name}</span>
          <span className="truncate text-xs text-espresso-muted">{fr.shop.roles[role]}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 text-espresso-muted max-lg:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" className="w-64">
        <ShopMenuItems currentSlug={shop.slug} shops={shops} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShopMenuItems({
  currentSlug,
  shops,
}: {
  currentSlug: string;
  shops: ReturnType<typeof useShop>["shops"];
}) {
  return (
    <>
      <DropdownMenuLabel>{fr.shop.myShops}</DropdownMenuLabel>
      {shops.map((item) => (
        <DropdownMenuItem key={item.id} asChild className="min-h-11 gap-3">
          <Link href={`/s/${item.slug}`}>
            <ShopBadge name={item.name} className="size-8 text-xs" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">{fr.shop.roles[item.role]}</span>
            </span>
            {item.slug === currentSlug ? (
              <Check aria-hidden="true" className="size-4 text-cognac" />
            ) : null}
          </Link>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild className="min-h-11 gap-3">
        <Link href="/bienvenue">
          <span className="grid size-8 place-items-center rounded-[10px] bg-surface-muted">
            <Plus aria-hidden="true" className="size-4" />
          </span>
          {fr.shop.createShop}
        </Link>
      </DropdownMenuItem>
    </>
  );
}

/** Plain list version, used inside the mobile "More" sheet. */
export function ShopList({ onNavigate }: { onNavigate?: () => void }) {
  const { shop: current, shops } = useShop();

  return (
    <ul className="flex flex-col gap-1">
      {shops.map((item) => (
        <li key={item.id}>
          <Link
            href={`/s/${item.slug}`}
            onClick={onNavigate}
            aria-current={item.slug === current.slug ? "true" : undefined}
            className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-surface-muted aria-[current]:bg-cognac-soft"
          >
            <ShopBadge name={item.name} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{item.name}</span>
              <span className="text-xs text-muted-foreground">{fr.shop.roles[item.role]}</span>
            </span>
            {item.slug === current.slug ? (
              <Check aria-hidden="true" className="size-4 text-cognac" />
            ) : null}
          </Link>
        </li>
      ))}
      <li>
        <Link
          href="/bienvenue"
          onClick={onNavigate}
          className="flex min-h-12 items-center gap-3 rounded-xl px-2 font-medium hover:bg-surface-muted"
        >
          <span className="grid size-9 place-items-center rounded-[10px] bg-surface-muted">
            <Plus aria-hidden="true" className="size-4" />
          </span>
          {fr.shop.createShop}
        </Link>
      </li>
    </ul>
  );
}
