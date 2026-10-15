import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapPin, Phone, StickyNote } from "lucide-react";
import { Forbidden } from "@/components/layout/Forbidden";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { InfoRow } from "@/components/shared/InfoRow";
import { requireShopAction } from "@/features/shop/require";
import { SupplierActions } from "@/features/suppliers/components/SupplierActions";
import { getSupplier } from "@/features/suppliers/queries";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.suppliers.title };

const t = fr.suppliers;

export default function SupplierPage({ params }: PageProps<"/s/[shopSlug]/fournisseurs/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SupplierDetail params={params} />
    </Suspense>
  );
}

async function SupplierDetail({ params }: { params: Promise<{ shopSlug: string; id: string }> }) {
  const { context, allowed } = await requireShopAction(params, "viewSuppliers");
  if (!allowed) return <Forbidden title={t.title} />;
  const { id } = await params;
  const supplier = isUuid(id) ? await getSupplier(context.shop.id, id) : null;
  if (!supplier) notFound();

  return (
    <div className="max-w-4xl">
      <PageHeader
        backHref={`/s/${context.shop.slug}/fournisseurs`}
        eyebrow={supplier.archivedAt ? fr.common.archived : undefined}
        title={supplier.name}
        description={`${t.since} ${formatDate(supplier.createdAt)}`}
        actions={<SupplierActions supplier={supplier} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg">{fr.common.details}</h2>
          <dl className="flex flex-col gap-3">
            <InfoRow icon={<Phone />} label={fr.common.phone}>
              {supplier.phone ? formatPhone(supplier.phone) : "—"}
            </InfoRow>
            <InfoRow icon={<MapPin />} label={t.address}>
              {supplier.address ?? "—"}
            </InfoRow>
            <InfoRow icon={<StickyNote />} label={t.notes}>
              <span className="whitespace-pre-line">{supplier.notes ?? "—"}</span>
            </InfoRow>
          </dl>
        </section>
        <section className="rounded-2xl border border-dashed border-line bg-surface p-5 text-muted-foreground">
          {t.balanceComing}
        </section>
      </div>
    </div>
  );
}
