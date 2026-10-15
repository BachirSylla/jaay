"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { signOut } from "@/features/auth/actions";
import { ShopList } from "@/features/shop/components/ShopSwitcher";
import { useShop } from "@/features/shop/shop-context";
import { fr } from "@/messages/fr";
import { navHref, visibleNavItems } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

/** Phone "More" menu: full navigation, shop selector, theme and sign-out. */
export function MoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { shop, role, user } = useShop();
  const close = () => onOpenChange(false);
  const items = visibleNavItems(role).filter((item) => item.key !== "dashboard");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-[28px] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="font-display text-lg">{fr.nav.more}</SheetTitle>
          <SheetDescription className="sr-only">{fr.nav.mainNavigation}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-5">
          <nav aria-label={fr.nav.mainNavigation}>
            <ul className="grid grid-cols-3 gap-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <Link
                      href={navHref(item, shop.slug)}
                      target={item.external ? "_blank" : undefined}
                      onClick={close}
                      className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl bg-surface-muted/60 px-2 text-center text-[13px] font-semibold outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <span className="grid size-9 place-items-center rounded-xl bg-cognac-tint text-cognac">
                        <Icon aria-hidden="true" className="size-[18px]" />
                      </span>
                      {fr.nav[item.key]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{fr.shop.myShops}</h2>
            <ShopList onNavigate={close} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{fr.theme.label}</h2>
            <ThemeToggle className="w-full" />
          </section>

          <div className="flex items-center gap-3 border-t border-line pt-4">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{user.fullName}</span>
              <span className="truncate text-sm text-muted-foreground">{user.email}</span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-danger hover:bg-danger-soft"
              >
                <LogOut aria-hidden="true" className="size-[18px]" />
                {fr.auth.signOut}
              </button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
