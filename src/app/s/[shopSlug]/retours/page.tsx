import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ReturnsList } from "@/features/returns/components/ReturnsList";
import { listReturns } from "@/features/returns/queries";
import { requireShop } from "@/features/shop/require";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.returns.title };

const t = fr.returns;

export default function ReturnsPage({ params }: PageProps<"/s/[shopSlug]/retours">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Returns params={params} />
    </Suspense>
  );
}

async function Returns({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shop } = await requireShop(params);
  const returns = await listReturns(shop.id);
  const addButton = (
    <Button asChild>
      <Link href={`/s/${shop.slug}/retours/nouveau`}>
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
        actions={returns.length > 0 ? addButton : null}
      />
      {returns.length === 0 ? (
        <EmptyState icon={<Undo2 />} title={t.emptyTitle} text={t.emptyText} action={addButton} />
      ) : (
        <ReturnsList returns={returns} slug={shop.slug} />
      )}
    </div>
  );
}
