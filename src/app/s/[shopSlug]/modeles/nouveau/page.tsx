import type { Metadata } from "next";
import { Suspense } from "react";
import { Forbidden } from "@/components/layout/Forbidden";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { ProductForm } from "@/features/catalog/components/ProductForm";
import { listCategories } from "@/features/catalog/queries";
import { requireShopAction } from "@/features/shop/require";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.catalog.newTitle };

export default function NewProductPage({ params }: PageProps<"/s/[shopSlug]/modeles/nouveau">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewProduct params={params} />
    </Suspense>
  );
}

async function NewProduct({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { context, allowed } = await requireShopAction(params, "manageCatalog");
  if (!allowed) return <Forbidden title={fr.catalog.newTitle} />;
  const categories = await listCategories(context.shop.id);

  return (
    <div className="max-w-2xl">
      <PageHeader backHref={`/s/${context.shop.slug}/stock`} title={fr.catalog.newTitle} />
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <ProductForm categories={categories} />
      </section>
    </div>
  );
}
