"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Menu, Package, Plus, Users, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { useShop } from "@/features/shop/shop-context";
import { fr } from "@/messages/fr";
import { MoreSheet } from "./MoreSheet";

type Tab = { label: string; path: string; icon: LucideIcon; exact?: boolean };

/** Phone tab bar: Accueil, Stock, + Vente (raised), Clients, Plus. */
export function BottomNav() {
  const pathname = usePathname();
  const { shop } = useShop();
  const [moreOpen, setMoreOpen] = useState(false);
  const base = `/s/${shop.slug}`;
  // The sale screen has its own fixed footer ("Encaisser"): no tab bar there.
  const focused = pathname === `${base}/ventes/nouvelle`;

  const isActive = (tab: Tab) => {
    const href = base + tab.path;
    return tab.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  };

  const left: Tab[] = [
    { label: fr.nav.home, path: "", icon: Home, exact: true },
    { label: fr.nav.stock, path: "/stock", icon: Package },
  ];
  const right: Tab[] = [{ label: fr.nav.customers, path: "/clients", icon: Users }];

  const renderTab = (tab: Tab) => {
    const active = isActive(tab);
    const Icon = tab.icon;
    return (
      <li key={tab.path} className="flex-1">
        <Link
          href={base + tab.path}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold outline-none focus-visible:text-cognac",
            active ? "text-ink" : "text-subtle",
          )}
        >
          <Icon aria-hidden="true" className={cn("size-[22px]", active && "text-cognac")} />
          {tab.label}
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav
        aria-label={fr.nav.mainNavigation}
        hidden={focused}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-end px-2">
          {left.map(renderTab)}
          <li className="flex flex-1 justify-center">
            <Link
              href={`${base}/ventes/nouvelle`}
              aria-label={fr.nav.newSaleLabel}
              className="-mt-5 mb-1 flex flex-col items-center gap-1 text-[11px] font-semibold text-ink outline-none"
            >
              <span className="grid size-14 place-items-center rounded-full bg-cognac text-on-cognac shadow-fab transition-transform duration-150 ease-out active:scale-[0.94]">
                <Plus aria-hidden="true" className="size-7" strokeWidth={2.5} />
              </span>
              {fr.nav.newSale}
            </Link>
          </li>
          {right.map(renderTab)}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-subtle outline-none focus-visible:text-cognac"
            >
              <Menu aria-hidden="true" className="size-[22px]" />
              {fr.nav.more}
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
