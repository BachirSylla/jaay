"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, Plus } from "lucide-react";
import { cn } from "cn";
import { Logo } from "@/components/shared/Logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { signOut } from "@/features/auth/actions";
import { ShopSwitcher } from "@/features/shop/components/ShopSwitcher";
import { useShop } from "@/features/shop/shop-context";
import { initials } from "@/lib/initials";
import { fr } from "@/messages/fr";
import { isNavActive, navHref, visibleNavItems } from "./nav";

/**
 * Espresso sidebar: full (248px) from 1024px, icons only (76px) between 768 and 1023px,
 * hidden on phones (BottomNav takes over).
 */
export function Sidebar() {
  const pathname = usePathname();
  const { shop, role, user } = useShop();
  const items = visibleNavItems(role);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col gap-4 bg-sidebar px-3 py-5 text-sidebar-foreground md:flex lg:w-[248px] lg:px-4">
      <Link
        href={`/s/${shop.slug}`}
        className="flex min-h-11 items-center gap-2.5 rounded-xl px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-gold/60 max-lg:justify-center"
      >
        <Logo size={34} />
        <span className="font-display text-xl font-bold max-lg:hidden">{fr.app.name}</span>
      </Link>

      <ShopSwitcher />

      <SidebarTooltip label={fr.nav.newSaleLabel}>
        <Link
          href={`/s/${shop.slug}/ventes/nouvelle`}
          aria-label={fr.nav.newSaleLabel}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cognac font-semibold text-on-cognac transition-[transform,background-color] duration-150 ease-out outline-none hover:bg-cognac-hover focus-visible:ring-2 focus-visible:ring-gold/60 active:scale-[0.97]"
        >
          <Plus aria-hidden="true" className="size-[18px]" />
          <span className="max-lg:hidden">{fr.nav.newSaleLabel}</span>
        </Link>
      </SidebarTooltip>

      <nav aria-label={fr.nav.mainNavigation} className="-mx-1 flex-1 overflow-y-auto px-1">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isNavActive(item, shop.slug, pathname);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <SidebarTooltip label={fr.nav[item.key]}>
                  <Link
                    href={navHref(item, shop.slug)}
                    target={item.external ? "_blank" : undefined}
                    aria-current={active ? "page" : undefined}
                    aria-label={fr.nav[item.key]}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-gold/60 max-lg:justify-center",
                      active
                        ? "bg-sidebar-accent text-espresso-ink"
                        : "text-espresso-muted hover:bg-sidebar-accent hover:text-espresso-ink",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn("size-[19px] shrink-0", active && "text-gold")}
                    />
                    <span className="flex-1 truncate max-lg:hidden">{fr.nav[item.key]}</span>
                    {item.external ? (
                      <ExternalLink
                        aria-hidden="true"
                        className="size-3.5 opacity-60 max-lg:hidden"
                      />
                    ) : null}
                  </Link>
                </SidebarTooltip>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3 border-t border-sidebar-border pt-4 max-lg:flex-col">
        <SidebarTooltip label={fr.profile.open}>
          <Link
            href={`/s/${shop.slug}/profil`}
            aria-label={fr.profile.open}
            aria-current={pathname === `/s/${shop.slug}/profil` ? "page" : undefined}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-gold/60 max-lg:justify-center lg:-ml-1 lg:px-1"
          >
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-espresso-ink/10 text-sm font-semibold"
            >
              {initials(user.fullName || user.email || "")}
            </span>
            <span className="flex min-w-0 flex-1 flex-col max-lg:hidden">
              <span className="truncate text-sm font-semibold">{user.fullName}</span>
              <span className="truncate text-xs text-espresso-muted">{user.email}</span>
            </span>
          </Link>
        </SidebarTooltip>
        <form action={signOut}>
          <SidebarTooltip label={fr.auth.signOut} always>
            <button
              type="submit"
              aria-label={fr.auth.signOut}
              className="grid size-11 place-items-center rounded-xl text-espresso-muted outline-none hover:bg-sidebar-accent hover:text-espresso-ink focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <LogOut aria-hidden="true" className="size-[18px]" />
            </button>
          </SidebarTooltip>
        </form>
      </div>
    </aside>
  );
}

/** Tooltip shown only when the sidebar is collapsed (tablet), unless `always`. */
function SidebarTooltip({
  label,
  always = false,
  children,
}: {
  label: string;
  always?: boolean;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className={always ? undefined : "lg:hidden"}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
