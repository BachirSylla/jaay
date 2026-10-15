import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Ban, StickyNote, Truck, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { InfoRow } from "@/components/shared/InfoRow";
import { Money } from "@/components/shared/Money";
import { CancelReceptionButton } from "@/features/receptions/components/CancelReceptionButton";
import { ReceptionLines } from "@/features/receptions/components/ReceptionLines";
import { getReceptionLines, getReceptions } from "@/features/receptions/queries";
import { requireShop } from "@/features/shop/require";
import { formatDate, formatQty } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.receptions.title };

const t = fr.receptions;

export default function ReceptionPage({ params }: PageProps<"/s/[shopSlug]/receptions/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReceptionDetail params={params} />
    </Suspense>
  );
}

async function ReceptionDetail({ params }: { params: Promise<{ shopSlug: string; id: string }> }) {
  const { shop, role } = await requireShop(params);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const reception = (await getReceptions(shop.id)).find((r) => r.id === id);
  if (!reception) notFound();
  const lines = await getReceptionLines(id);

  const cancelled = reception.status === "cancelled";
  const hasMovements = lines.some((line) => line.qtySold > 0 || line.qtyReturned > 0);

  return (
    <div className="max-w-4xl">
      <PageHeader
        backHref={`/s/${shop.slug}/receptions`}
        eyebrow={formatDate(reception.receivedAt, "long")}
        title={reception.supplierName}
        description={formatQty(reception.totalQty)}
        actions={
          can(role, "cancelOperations") && !cancelled ? (
            <CancelReceptionButton receptionId={reception.id} disabled={hasMovements} />
          ) : null
        }
      />

      {cancelled ? (
        <p className="mb-5 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          <Ban aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t.cancelled} — {reception.cancelReason}
        </p>
      ) : hasMovements && can(role, "cancelOperations") ? (
        <p className="mb-5 text-sm text-muted-foreground">{fr.errors.RECEPTION_HAS_MOVEMENTS}</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg">{t.lines}</h2>
          <ReceptionLines lines={lines} />
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          {reception.totalCost !== null ? (
            <div className="flex flex-col gap-2 rounded-3xl bg-espresso p-5 text-espresso-ink">
              <span className="text-[13px] font-medium text-espresso-muted">{t.totalCost}</span>
              <Money amount={reception.totalCost} size="hero" currencyClassName="text-gold" />
            </div>
          ) : null}
          <dl className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <InfoRow icon={<Truck />} label={t.deliveryFee}>
              {reception.deliveryFee > 0 ? <Money amount={reception.deliveryFee} size="sm" /> : "—"}
            </InfoRow>
            <InfoRow icon={<UserRound />} label={t.receivedBy}>
              {reception.createdByName ?? "—"}
            </InfoRow>
            <InfoRow icon={<StickyNote />} label={t.note}>
              <span className="whitespace-pre-line">{reception.note ?? "—"}</span>
            </InfoRow>
          </dl>
        </aside>
      </div>
    </div>
  );
}
