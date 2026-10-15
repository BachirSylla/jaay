import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Ban, MessageSquare, StickyNote, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { InfoRow } from "@/components/shared/InfoRow";
import { Money } from "@/components/shared/Money";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { CancelSaleButton } from "@/features/sales/components/CancelSaleButton";
import { ShareReceiptButton } from "@/features/sales/components/ShareReceiptButton";
import { getSale } from "@/features/sales/queries";
import { receiptText } from "@/features/sales/receipt";
import { getMembers } from "@/features/shop/queries";
import { requireShop } from "@/features/shop/require";
import { formatDate, formatQty } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.sales.title };

const t = fr.sales;

export default function SalePage({ params }: PageProps<"/s/[shopSlug]/ventes/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SaleDetail params={params} />
    </Suspense>
  );
}

async function SaleDetail({ params }: { params: Promise<{ shopSlug: string; id: string }> }) {
  const { shop, role } = await requireShop(params);
  const { id } = await params;
  const finance = can(role, "viewCosts");
  const sale = isUuid(id) ? await getSale(shop.id, id, finance) : null;
  if (!sale) notFound();
  const members = await getMembers(shop.id);
  const seller = members.find((m) => m.userId === sale.createdBy)?.fullName ?? null;
  const cancelled = sale.status === "cancelled";

  return (
    <div className="max-w-4xl">
      <PageHeader
        backHref={`/s/${shop.slug}/ventes`}
        eyebrow={formatDate(sale.soldAt, "long")}
        title={fill(t.number, { n: sale.number })}
        description={`${formatQty(sale.bags)} · ${fr.channels[sale.channel]} · ${
          sale.customerType === "reseller" ? t.reseller : t.individual
        }`}
        actions={
          cancelled ? null : (
            <>
              <ShareReceiptButton
                saleId={sale.id}
                saleNumber={sale.number}
                text={receiptText(sale, shop.name)}
                customerPhone={sale.customerPhone}
              />
              {can(role, "cancelOperations") ? <CancelSaleButton saleId={sale.id} /> : null}
            </>
          )
        }
      />

      {cancelled ? (
        <p className="mb-5 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          <Ban aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t.cancelled} — {sale.cancelReason}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg">{t.items}</h2>
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
            {sale.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 p-4">
                <ProductThumb
                  name={line.productName}
                  color={line.productColor}
                  photoPath={line.photoPath}
                  size={48}
                  className="size-12 shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{line.productName}</span>
                  <span className="text-sm text-muted-foreground">
                    {line.quantity} ×{" "}
                    <Money amount={line.unitPrice} size="sm" className="font-medium" />
                    {line.cost !== null ? (
                      <>
                        {" · "}
                        {t.cost} <Money amount={line.cost} size="sm" className="font-medium" />
                      </>
                    ) : null}
                  </span>
                </div>
                <Money amount={line.lineTotal} size="md" />
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-3xl bg-espresso p-5 text-espresso-ink">
            <span className="text-[13px] font-medium text-espresso-muted">{t.total}</span>
            <Money amount={sale.totalAmount} size="hero" currencyClassName="text-gold" />
            {sale.margin !== null ? (
              <span className="text-sm text-espresso-muted">
                {t.margin}{" "}
                <Money
                  amount={sale.margin}
                  size="sm"
                  signed
                  className={sale.margin < 0 ? "text-danger-on-espresso" : "text-mint"}
                />
                {" · "}
                {t.cost} <Money amount={sale.cost ?? 0} size="sm" />
              </span>
            ) : null}
          </div>

          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base">{t.payments}</h2>
            <ul className="flex flex-col gap-2">
              {sale.payments.map((payment) => (
                <li key={payment.method} className="flex items-center justify-between">
                  <span>{fr.paymentMethods[payment.method]}</span>
                  <Money amount={payment.amount} size="sm" />
                </li>
              ))}
            </ul>
          </section>

          <dl className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <InfoRow icon={<UserRound />} label={t.customer}>
              {sale.customerId ? (
                <Link
                  href={`/s/${shop.slug}/clients/${sale.customerId}`}
                  className="font-semibold text-cognac underline-offset-4 hover:underline"
                >
                  {sale.customerName}
                </Link>
              ) : (
                t.anonymous
              )}
            </InfoRow>
            <InfoRow icon={<MessageSquare />} label={t.soldBy}>
              {seller ?? "—"}
            </InfoRow>
            <InfoRow icon={<StickyNote />} label={t.note}>
              <span className="whitespace-pre-line">{sale.note ?? "—"}</span>
            </InfoRow>
          </dl>
        </aside>
      </div>
    </div>
  );
}
