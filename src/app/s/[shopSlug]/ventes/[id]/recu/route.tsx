import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { previewUrl } from "@/features/catalog/og";
import { getSale } from "@/features/sales/queries";
import { getMembers, getShopContext } from "@/features/shop/queries";
import {
  DISPLAY_FONT,
  PaidStamp,
  receiptFonts,
  ShopMark,
  shopLogoForImage,
} from "@/features/shop/receipt-image";
import { bagColorFor, BAG_HEX, isLightBag } from "@/lib/bag-colors";
import { formatDate, formatMoney } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { productPhotoUrl } from "@/lib/storage";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

const WIDTH = 1080;
const PHOTO = 148;
const DISPLAY = DISPLAY_FONT;
const t = fr.sales;
const INK = "#191714";
const MUTED = "#6B655E";
const LINE = "#E3E0DA";
const COGNAC = "#A85A24";

/** Photo the image engine can read: the JPEG preview, else an original already in JPEG. */
async function linePhoto(path: string | null): Promise<string | null> {
  if (!path) return null;
  return (await previewUrl(path)) ?? (path.endsWith(".jpg") ? productPhotoUrl(path) : null);
}

/**
 * Receipt of a sale as a PNG, to share on WhatsApp. Same access rules as the sale itself
 * (session + RLS: a manager only gets their own sales). Never shows costs. Cancelled sales
 * have no receipt, so the "paid" stamp is always true (RG8: paid in full at sale time).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopSlug: string; id: string }> },
) {
  const { shopSlug, id } = await params;
  const context = await getShopContext(shopSlug);
  if (!context || !isUuid(id)) return new NextResponse(null, { status: 404 });
  const { shop } = context;
  const sale = await getSale(shop.id, id, false);
  if (!sale || sale.status !== "active") return new NextResponse(null, { status: 404 });

  const [members, photos, logo, fonts] = await Promise.all([
    getMembers(shop.id),
    Promise.all(sale.lines.map((line) => linePhoto(line.photoPath))),
    shopLogoForImage(shop.logoPath),
    receiptFonts(),
  ]);
  const seller = members.find((m) => m.userId === sale.createdBy)?.fullName ?? null;
  const addressLines = (shop.address ?? "").split("\n").filter((line) => line.trim() !== "");
  // About 42 characters fit on a line of the header.
  const headerLines =
    addressLines.reduce((sum, line) => sum + Math.ceil(line.length / 42), 0) +
    (shop.whatsappPhone ? 1 : 0);
  // next/og needs the height up front: sum of the blocks, top to bottom.
  const height =
    Math.max(224, 182 + headerLines * 34) + // header
    44 + // space above the customer card
    224 + // customer card and gap
    sale.lines.length * (PHOTO + 36) +
    184 + // separator and total
    200 + // payments and stamp (rotated, so it needs some air)
    180; // thanks and footer

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F2F2EF",
        color: INK,
        fontFamily: "DM Sans",
        fontSize: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 32,
          padding: "56px 64px",
          background: "#211A15",
          color: "#F7F1EA",
          borderBottomLeftRadius: 48,
          borderBottomRightRadius: 48,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, flex: 1 }}>
          <ShopMark logo={logo} name={shop.name} size={112} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 48 }}>{shop.name}</span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                color: "#CDBFB0",
                fontSize: 26,
                marginTop: 8,
              }}
            >
              {addressLines.map((line, index) => (
                <span key={index}>{line}</span>
              ))}
              {shop.whatsappPhone ? (
                <span>{`WhatsApp ${formatPhone(shop.whatsappPhone)}`}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 44, color: "#F2C894" }}>
            {t.receiptTitle.toUpperCase()}
          </span>
          <span style={{ fontSize: 32, marginTop: 4 }}>
            {fill(t.receiptNumber, { n: String(sale.number).padStart(6, "0") })}
          </span>
          <span style={{ fontSize: 26, color: "#CDBFB0", marginTop: 8 }}>
            {formatDate(sale.soldAt, "datetime")}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "44px 64px 0",
          gap: 36,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 32,
            background: "#FFFFFF",
            border: `2px solid ${LINE}`,
            borderRadius: 32,
            padding: "30px 36px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: 2, color: MUTED }}>
              {t.receiptClient.toUpperCase()}
            </span>
            <span style={{ fontSize: 36, fontWeight: 600, marginTop: 8 }}>
              {sale.customerName ?? t.anonymous}
            </span>
            {sale.customerPhone ? (
              <span style={{ fontSize: 30, color: MUTED, marginTop: 2 }}>
                {formatPhone(sale.customerPhone)}
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: 2, color: MUTED }}>
              {t.receiptSoldBy.toUpperCase()}
            </span>
            {seller ? (
              <span style={{ fontSize: 36, fontWeight: 600, marginTop: 8 }}>{seller}</span>
            ) : null}
            <span style={{ fontSize: 30, color: MUTED, marginTop: 2 }}>
              {fr.channels[sale.channel]}
            </span>
          </div>
        </div>

        {sale.lines.map((line, index) => {
          const photo = photos[index];
          const bag = bagColorFor(line.productColor);
          return (
            <div key={line.id} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og
                <img
                  src={photo}
                  alt=""
                  width={PHOTO}
                  height={PHOTO}
                  style={{ borderRadius: 28, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: PHOTO,
                    height: PHOTO,
                    borderRadius: 28,
                    background: BAG_HEX[bag.key],
                    color: isLightBag(bag) ? "#211A15" : "#F7F1EA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: DISPLAY,
                    fontSize: 60,
                  }}
                >
                  {line.productName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontSize: 36, fontWeight: 600 }}>{line.productName}</span>
                <span style={{ fontSize: 28, color: MUTED, marginTop: 4 }}>
                  {`${line.quantity} × ${formatMoney(line.unitPrice)}`}
                </span>
              </div>
              <span style={{ fontSize: 36, fontWeight: 600 }}>{formatMoney(line.lineTotal)}</span>
            </div>
          );
        })}

        <div style={{ display: "flex", height: 2, background: LINE }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 34, fontWeight: 600 }}>{t.total}</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 78, color: COGNAC, letterSpacing: -2 }}>
            {formatMoney(sale.totalAmount)}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 30 }}>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: 2, color: MUTED }}>
              {t.receiptPayment.toUpperCase()}
            </span>
            {sale.payments.map((payment) => (
              <div key={payment.method} style={{ display: "flex", gap: 12 }}>
                <span style={{ color: MUTED }}>{fr.paymentMethods[payment.method]}</span>
                <span style={{ fontWeight: 600 }}>{formatMoney(payment.amount)}</span>
              </div>
            ))}
          </div>
          <PaidStamp label={t.receiptPaid} date={formatDate(sale.soldAt)} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "32px 64px 52px",
        }}
      >
        <span style={{ fontFamily: DISPLAY, fontSize: 42, color: COGNAC }}>{t.thanks}</span>
        <span style={{ fontSize: 22, color: "#8A847C" }}>{t.receiptFooter}</span>
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
