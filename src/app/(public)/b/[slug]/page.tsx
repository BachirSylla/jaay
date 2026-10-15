import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShareLinkButton } from "@/components/shared/ShareLinkButton";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicFooter, PublicHeader } from "@/features/catalog/components/PublicHeader";
import { PublicProductGrid } from "@/features/catalog/components/PublicProductGrid";
import { getPublicCatalog } from "@/features/catalog/public";
import { fill, plural } from "@/lib/i18n";
import { catalogUrl } from "@/lib/site";
import { fr } from "@/messages/fr";

const t = fr.publicCatalog;

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getPublicCatalog(slug);
  if (!catalog) return { title: fr.errors.NOT_FOUND };
  const title = fill(t.metaTitle, { shop: catalog.shop.name });
  const description = `${fill(t.metaDescription, { shop: catalog.shop.name })} ${plural(
    catalog.products.length,
    t.models,
  )}.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/b/${slug}` },
    openGraph: {
      title,
      description,
      url: `/b/${slug}`,
      siteName: fr.app.name,
      locale: "fr_FR",
      type: "website",
    },
  };
}

export default function PublicCatalogPage({ params }: PageProps<"/b/[slug]">) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <Catalog params={params} />
    </Suspense>
  );
}

async function Catalog({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getPublicCatalog(slug);
  if (!catalog) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader shop={catalog.shop}>
        <ShareLinkButton
          url={catalogUrl(slug)}
          title={fill(t.metaTitle, { shop: catalog.shop.name })}
          label={t.shareCatalog}
          variant="ghost"
          className="text-espresso-ink hover:bg-espresso-ink/10 hover:text-espresso-ink"
        />
      </PublicHeader>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6 sm:px-10">
        <PublicProductGrid catalog={catalog} />
      </main>
      <PublicFooter />
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-56 rounded-b-[30px] bg-espresso" />
      <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 px-5 py-6 sm:grid-cols-3 sm:px-10 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
