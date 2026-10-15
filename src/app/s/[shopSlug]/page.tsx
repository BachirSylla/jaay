import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { requireShop } from "@/features/shop/require";
import { formatDate } from "@/lib/format";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.nav.dashboard };

export default function DashboardPage({ params }: PageProps<"/s/[shopSlug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard params={params} />
    </Suspense>
  );
}

async function Dashboard({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { user, shop } = await requireShop(params);
  // Today's date is request-time data.
  await connection();
  const firstName = user.fullName.split(" ")[0] || user.fullName;

  return (
    <>
      <PageHeader
        eyebrow={`${formatDate(new Date(), "long")} · ${shop.name}`}
        title={fr.dashboard.greeting.replace("{name}", firstName)}
        actions={
          <Button asChild className="max-md:hidden">
            <Link href={`/s/${shop.slug}/ventes/nouvelle`}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              {fr.nav.newSaleLabel}
            </Link>
          </Button>
        }
      />
      <EmptyState
        icon={<Sparkles />}
        title={fr.dashboard.firstStepsTitle}
        text={fr.dashboard.firstStepsText}
      />
    </>
  );
}
