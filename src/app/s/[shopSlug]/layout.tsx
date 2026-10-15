import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ShellSkeleton } from "@/components/layout/ShellSkeleton";
import { getShopContext } from "@/features/shop/queries";
import { ShopProvider } from "@/features/shop/shop-context";

// The shop depends on the URL and the session: it is read at request time, behind Suspense,
// while the skeleton is part of the prerendered shell.
export default function ShopLayout({ children, params }: LayoutProps<"/s/[shopSlug]">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <ShopShell params={params}>{children}</ShopShell>
    </Suspense>
  );
}

async function ShopShell({
  params,
  children,
}: {
  params: Promise<{ shopSlug: string }>;
  children: ReactNode;
}) {
  const { shopSlug } = await params;
  const context = await getShopContext(shopSlug);
  // Not a member (or unknown shop): 404 rather than 403, to not reveal that it exists.
  if (!context) notFound();

  return (
    <ShopProvider value={context}>
      <AppShell>{children}</AppShell>
    </ShopProvider>
  );
}
