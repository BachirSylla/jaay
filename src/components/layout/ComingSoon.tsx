import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { fr } from "@/messages/fr";
import { PageHeader } from "./PageHeader";

/** Placeholder for screens delivered in a later phase. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={<Hammer />} title={fr.common.comingSoon} text={fr.common.comingSoonText} />
    </>
  );
}
