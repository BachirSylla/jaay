import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.nav.sales };

export default function Page() {
  return <ComingSoon title={fr.nav.sales} />;
}
