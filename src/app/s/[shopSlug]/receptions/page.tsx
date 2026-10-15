import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PackagePlus, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ReceptionsList } from "@/features/receptions/components/ReceptionsList";
import { getReceptions } from "@/features/receptions/queries";
import { requireShop } from "@/features/shop/require";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.receptions.title };

const t = fr.receptions;

export default function ReceptionsPage({ params }: PageProps<"/s/[shopSlug]/receptions">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Receptions params={params} />
    </Suspense>
  );
}

async function Receptions({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shop } = await requireShop(params);
  const receptions = await getReceptions(shop.id);
  const addButton = (
    <Button asChild>
      <Link href={`/s/${shop.slug}/receptions/nouvelle`}>
        <Plus data-icon="inline-start" aria-hidden="true" />
        {t.add}
      </Link>
    </Button>
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={t.title}
        description={t.subtitle}
        actions={receptions.length > 0 ? addButton : null}
      />
      {receptions.length === 0 ? (
        <EmptyState
          icon={<PackagePlus />}
          title={t.emptyTitle}
          text={t.emptyText}
          action={addButton}
        />
      ) : (
        <ReceptionsList receptions={receptions} slug={shop.slug} />
      )}
    </div>
  );
}
