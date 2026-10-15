import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, previewUrl } from "@/features/catalog/og";
import { getPublicCatalog } from "@/features/catalog/public";
import { formatMoney } from "@/lib/format";
import { fr } from "@/messages/fr";

export const alt = fr.publicCatalog.orderOnWhatsapp;
export const size = OG_SIZE;
export const contentType = "image/png";

/** WhatsApp / social preview of one model: its photo, name, price and the shop. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;
  const catalog = await getPublicCatalog(slug);
  const product = catalog?.products.find((p) => p.id === productId);
  const photo = await previewUrl(product?.photos[0]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: OG_COLORS.espresso,
        color: OG_COLORS.espressoInk,
      }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>.
        <img src={photo} alt="" width={630} height={630} style={{ objectFit: "cover" }} />
      ) : (
        <div
          style={{
            width: 630,
            height: 630,
            background: OG_COLORS.tile,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: OG_COLORS.gold,
            fontSize: 160,
            fontWeight: 700,
          }}
        >
          {(product?.name ?? "J").slice(0, 1).toUpperCase()}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          padding: 56,
          gap: 20,
        }}
      >
        <div style={{ fontSize: 28, color: OG_COLORS.espressoMuted }}>{catalog?.shop.name}</div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05 }}>
          {product?.name ?? fr.app.name}
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, color: OG_COLORS.gold }}>
          {product && product.price !== null
            ? formatMoney(product.price)
            : fr.publicCatalog.priceOnRequest}
        </div>
        <div style={{ fontSize: 24, color: OG_COLORS.espressoMuted }}>
          {fr.publicCatalog.orderOnWhatsapp}
        </div>
      </div>
    </div>,
    size,
  );
}
