import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { previewUrl } from "@/features/catalog/og";
import { getShopContext } from "@/features/shop/queries";
import {
  DISPLAY_FONT,
  PaidStamp,
  receiptFonts,
  ShopMark,
  shopLogoForImage,
} from "@/features/shop/receipt-image";
import { getPaymentReceipt } from "@/features/suppliers/queries";
import { BAG_HEX, bagColorFor, isLightBag } from "@/lib/bag-colors";
import { formatDate, formatMoney } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { productPhotoUrl } from "@/lib/storage";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

const WIDTH = 1080;
const PHOTO = 132;
const MUTED = "#6B655E";
const t = fr.supplierAccount.receipt;

/** Photo the image engine can read: the JPEG preview, else an original already in JPEG. */
async function linePhoto(path: string | null): Promise<string | null> {
  if (!path) return null;
  return (await previewUrl(path)) ?? (path.endsWith(".jpg") ? productPhotoUrl(path) : null);
}

/**
 * Receipt of a supplier payment as a PNG, to share on WhatsApp: the sold bags it pays for, at
 * supplier price, with their photo so the supplier recognizes them, any advance, the total and
 * a "paid" stamp (only active payments have a receipt). Never shows sale prices nor the account.
 * Owner/admin only, like the payments themselves.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopSlug: string; id: string; paymentId: string }> },
) {
  const { shopSlug, id, paymentId } = await params;
  const context = await getShopContext(shopSlug);
  if (!context || !can(context.role, "paySuppliers") || !isUuid(id) || !isUuid(paymentId)) {
    return new NextResponse(null, { status: 404 });
  }
  const { shop } = context;
  const receipt = await getPaymentReceipt(shop.id, id, paymentId);
  if (!receipt) return new NextResponse(null, { status: 404 });

  const [photos, logo, fonts] = await Promise.all([
    Promise.all(receipt.lines.map((line) => linePhoto(line.photoPath))),
    shopLogoForImage(shop.logoPath),
    receiptFonts(),
  ]);
  // next/og needs the height up front: sum of the blocks, top to bottom.
  const height =
    490 + // header: logo and name, title, supplier, amount, method
    (receipt.payment.note ? 36 : 0) +
    124 + // section title, with the padding above
    Math.max(1, receipt.lines.length) * (PHOTO + 32) +
    (receipt.advance > 0 ? 64 : 0) + // advance line (text only)
    170 + // separator and total
    250 + // stamp (rotated, so it needs some air)
    110; // footer

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F2F2EF",
        color: "#191714",
        fontFamily: "DM Sans",
        fontSize: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "56px 64px 56px",
          background: "#211A15",
          color: "#F7F1EA",
          borderBottomLeftRadius: 48,
          borderBottomRightRadius: 48,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <ShopMark logo={logo} name={shop.name} size={112} />
          <span style={{ fontFamily: DISPLAY_FONT, fontSize: 48 }}>{shop.name}</span>
        </div>
        <div style={{ display: "flex", color: "#CDBFB0", fontSize: 30, marginTop: 12 }}>
          {`${t.title} · ${formatDate(receipt.payment.paidAt, "long")}`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 16, gap: 4 }}>
          <span style={{ color: "#CDBFB0", fontSize: 28 }}>
            {fill(t.to, { supplier: receipt.supplier.name })}
          </span>
          <span style={{ fontFamily: DISPLAY_FONT, fontSize: 76, color: "#F2C894" }}>
            {formatMoney(receipt.payment.amount)}
          </span>
          <span style={{ color: "#CDBFB0", fontSize: 28 }}>
            {fr.paymentMethods[receipt.payment.method]}
          </span>
          {receipt.payment.note ? (
            <span style={{ color: "#CDBFB0", fontSize: 26 }}>{receipt.payment.note}</span>
          ) : null}
        </div>
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", padding: "48px 64px", gap: 32, flex: 1 }}
      >
        <span style={{ fontSize: 34, fontWeight: 600 }}>{t.covered}</span>
        {receipt.lines.length === 0 && receipt.advance === 0 ? (
          <span style={{ color: MUTED }}>{t.noBags}</span>
        ) : null}
        {receipt.lines.map((line, index) => {
          const photo = photos[index];
          const bag = bagColorFor(line.color);
          return (
            <div key={line.key} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og
                <img
                  src={photo}
                  alt=""
                  width={PHOTO}
                  height={PHOTO}
                  style={{ borderRadius: 24, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: PHOTO,
                    height: PHOTO,
                    borderRadius: 24,
                    background: BAG_HEX[bag.key],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isLightBag(bag) ? "#211A15" : "#F7F1EA",
                    fontFamily: DISPLAY_FONT,
                    fontSize: 56,
                  }}
                >
                  {line.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{line.name}</span>
                <span style={{ color: MUTED, fontSize: 28 }}>
                  {`${line.bags} × ${formatMoney(line.unitCost)}`}
                </span>
              </div>
              <span style={{ fontWeight: 600 }}>{formatMoney(line.amount)}</span>
            </div>
          );
        })}
        {receipt.advance > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between", color: MUTED }}>
            <span>{t.advance}</span>
            <span style={{ fontWeight: 600, color: "#191714" }}>
              {formatMoney(receipt.advance)}
            </span>
          </div>
        ) : null}

        <div style={{ display: "flex", height: 2, background: "#E3E0DA", margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 36, fontWeight: 600 }}>{t.total}</span>
          <span style={{ fontFamily: DISPLAY_FONT, fontSize: 72, color: "#A85A24" }}>
            {formatMoney(receipt.payment.amount)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <PaidStamp label={fr.sales.receiptPaid} date={formatDate(receipt.payment.paidAt)} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "0 64px 48px" }}>
        <span style={{ fontSize: 24, color: "#8A847C" }}>{t.footer}</span>
      </div>
    </div>,
    {
      width: WIDTH,
      height,
      headers: { "Cache-Control": "private, no-store" },
      fonts,
    },
  );
}
