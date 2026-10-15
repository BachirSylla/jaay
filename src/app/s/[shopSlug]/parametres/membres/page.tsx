import type { Metadata } from "next";
import { Suspense } from "react";
import { Forbidden } from "@/components/layout/Forbidden";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { AddMemberDialog } from "@/features/shop/components/AddMemberDialog";
import { MembersList } from "@/features/shop/components/MembersList";
import { getMembers } from "@/features/shop/queries";
import { requireShopAction } from "@/features/shop/require";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.members.title };

export default function MembersPage({ params }: PageProps<"/s/[shopSlug]/parametres/membres">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Members params={params} />
    </Suspense>
  );
}

async function Members({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { context, allowed } = await requireShopAction(params, "manageMembers");
  if (!allowed) return <Forbidden title={fr.members.title} />;
  const members = await getMembers(context.shop.id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={fr.members.title}
        description={fr.members.subtitle}
        backHref={`/s/${context.shop.slug}/parametres`}
        actions={<AddMemberDialog />}
      />
      <MembersList members={members} />
    </div>
  );
}
