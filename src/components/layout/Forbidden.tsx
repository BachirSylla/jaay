import { Lock } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { fr } from "@/messages/fr";
import { PageHeader } from "./PageHeader";

export function Forbidden({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={<Lock />} title={fr.forbidden.title} text={fr.forbidden.text} />
    </>
  );
}
