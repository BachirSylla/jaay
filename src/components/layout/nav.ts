import {
  BarChart3,
  Home,
  Package,
  PackagePlus,
  Receipt,
  Settings,
  Store,
  Truck,
  Undo2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { can, type Action, type ShopRole } from "@/lib/permissions";
import type { fr } from "@/messages/fr";

export type NavKey = keyof typeof fr.nav;

export type NavItem = {
  key: NavKey;
  /** Path relative to /s/<slug>; "" is the dashboard. */
  path: string;
  icon: LucideIcon;
  permission?: Action;
  /** Opens outside the shop space (public catalog). */
  external?: boolean;
};

/** Full navigation (sidebar and "More" menu), in the order of DESIGN.md §5. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "dashboard", path: "", icon: Home },
  { key: "sales", path: "/ventes", icon: Receipt },
  { key: "stock", path: "/stock", icon: Package },
  { key: "receptions", path: "/receptions", icon: PackagePlus },
  { key: "returns", path: "/retours", icon: Undo2 },
  { key: "suppliers", path: "/fournisseurs", icon: Truck, permission: "viewSuppliers" },
  { key: "customers", path: "/clients", icon: Users },
  { key: "expenses", path: "/depenses", icon: Wallet },
  { key: "reports", path: "/rapports", icon: BarChart3, permission: "viewReports" },
  { key: "catalog", path: "", icon: Store, external: true },
  { key: "settings", path: "/parametres", icon: Settings, permission: "manageSettings" },
];

export function visibleNavItems(role: ShopRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permission || can(role, item.permission));
}

export function navHref(item: NavItem, slug: string): string {
  return item.external ? `/b/${slug}` : `/s/${slug}${item.path}`;
}

export function isNavActive(item: NavItem, slug: string, pathname: string): boolean {
  if (item.external) return false;
  const href = `/s/${slug}${item.path}`;
  return item.path === ""
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
