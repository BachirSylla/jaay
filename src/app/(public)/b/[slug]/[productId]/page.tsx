import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { ColorDot } from "@/components/shared/ColorDot";
import { Money } from "@/components/shared/Money";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { ShareLinkButton } from "@/components/shared/ShareLinkButton";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicFooter, PublicHeader } from "@/features/catalog/components/PublicHeader";
import { getPublicCatalog } from "@/features/catalog/public";
import { orderLink, publicProductUrl } from "@/features/catalog/public-links";
import { formatMoney } from "@/lib/format";
import { fr } from "@/messages/fr";

const t = fr.publicCatalog;

async function findProduct(slug: string, productId: string) {
  const catalog = await getPublicCatalog(slug);
  const product = catalog?.products.find((p) => p.id === productId);
  return catalog && product ? { catalog, product } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/[productId]">): Promise<Metadata> {
  const { slug, productId } = await params;
  const found = await findProduct(slug, productId);
  if (!found) return { title: fr.errors.NOT_FOUND };
  const { catalog, product } = found;
  const title = `${product.name} — ${catalog.shop.name}`;
  const description = [
    product.price !== null ? formatMoney(product.price) : t.priceOnRequest,
    product.description,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/b/${slug}/${productId}` },
    openGraph: {
      title,
      description,
      url: `/b/${slug}/${productId}`,
      siteName: fr.app.name,
      locale: "fr_FR",
      type: "website",
    },
  };
}

export default function PublicProductPage({ params }: PageProps<"/b/[slug]/[productId]">) {
  return (
    <Suspense fallback={<Skeleton className="m-5 h-96 rounded-3xl" />}>
      <ProductView params={params} />
    </Suspense>
  );
}

async function ProductView({ params }: { params: Promise<{ slug: string; productId: string }> }) {
  const { slug, productId } = await params;
  const found = await findProduct(slug, productId);
  if (!found) notFound();
  const { catalog, product } = found;
  const { shop } = catalog;

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader shop={shop} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-6 sm:px-10">
        <Link
          href={`/b/${slug}`}
          className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-muted-foreground hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-[18px]" />
          {t.backToCatalog}
        </Link>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-2">
            <ProductThumb
              name={product.name}
              color={product.color}
              photoPath={product.photos[0]}
              size={600}
              priority
              className="col-span-2 aspect-square w-full rounded-3xl"
            />
            {product.photos.slice(1).map((photo) => (
              <ProductThumb
                key={photo}
                name={product.name}
                photoPath={photo}
                size={300}
                className="aspect-square w-full"
              />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              {product.category ? (
                <span className="text-sm font-medium text-muted-foreground">
                  {product.category}
                </span>
              ) : null}
              <h1 className="text-[32px] leading-tight">{product.name}</h1>
              {product.material ? (
                <span className="text-muted-foreground">
                  {fr.catalog.materials[product.material]}
                </span>
              ) : null}
            </div>
            {product.colors.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">
                  {fr.variants.available}
                </span>
                <ul className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <li
                      key={color}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-medium"
                    >
                      <ColorDot color={color} />
                      {color}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {product.price !== null ? (
              <Money amount={product.price} size="hero" />
            ) : (
              <span className="font-display text-2xl font-bold">{t.priceOnRequest}</span>
            )}
            {product.description ? (
              <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {shop.whatsappPhone ? (
                <a
                  href={orderLink({ ...shop, whatsappPhone: shop.whatsappPhone }, product)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "whatsapp", size: "lg" })}
                >
                  <MessageCircle aria-hidden="true" />
                  {t.orderOnWhatsapp}
                </a>
              ) : null}
              <ShareLinkButton
                url={publicProductUrl(slug, product.id)}
                title={`${product.name} — ${shop.name}`}
                label={t.shareModel}
              />
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
