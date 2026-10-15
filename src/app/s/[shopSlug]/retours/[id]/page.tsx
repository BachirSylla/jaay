import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Ban, StickyNote, Truck, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { InfoRow } from "@/components/shared/InfoRow";
import { Money } from "@/components/shared/Money";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { CancelReturnButton } from "@/features/returns/components/CancelReturnButton";
import { getReturn } from "@/features/returns/queries";
import { getMembers } from "@/features/shop/queries";
import { requireShop } from "@/features/shop/require";
import { formatDate, formatQty } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.returns.title };

const t = fr.returns;

export default function ReturnPage({ params }: PageProps<"/s/[shopSlug]/retours/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReturnDetail params={params} />
    </Suspense>
  );
}

async function ReturnDetail({ params }: { params: Promise<{ shopSlug: string; id: string }> }) {
  const { shop, role } = await requireShop(params);
  const { id } = await params;
  const item = isUuid(id) ? await getReturn(shop.id, id) : null;
  if (!item) notFound();
  const members = await getMembers(shop.id);
  const author = members.find((m) => m.userId === item.createdBy)?.fullName ?? "—";
  const cancelled = item.status === "cancelled";

  return (
    <div className="max-w-4xl">
      <PageHeader
        backHref={`/s/${shop.slug}/retours`}
        eyebrow={formatDate(item.returnedAt, "long")}
        title={item.supplierName}
        description={formatQty(item.bags)}
        actions={
          can(role, "cancelOperations") && !cancelled ? (
            <CancelReturnButton returnId={item.id} />
          ) : null
        }
      />
      {cancelled ? (
        <p className="mb-5 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          <Ban aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t.cancelled} — {item.cancelReason}
        </p>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg">{t.lines}</h2>
          <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
            {item.items.map((line) => (
              <li key={line.productId} className="flex items-center gap-3 p-4">
                <ProductThumb
                  name={line.productName}
                  color={line.productColor}
                  size={48}
                  className="size-12 shrink-0"
                />
                <span className="min-w-0 flex-1 truncate font-semibold">{line.productName}</span>
                <span className="font-display font-bold tabular-nums">
                  {formatQty(line.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <dl className="flex h-fit min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <InfoRow icon={<Truck />} label={t.deliveryFee}>
            {item.deliveryFee > 0 ? <Money amount={item.deliveryFee} size="sm" /> : "—"}
          </InfoRow>
          <InfoRow icon={<UserRound />} label={t.returnedBy}>
            {author}
          </InfoRow>
          <InfoRow icon={<StickyNote />} label={t.note}>
            <span className="whitespace-pre-line">{item.note ?? "—"}</span>
          </InfoRow>
        </dl>
      </div>
    </div>
  );
}
