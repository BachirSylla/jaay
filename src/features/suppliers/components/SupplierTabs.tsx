"use client";

import { useState, type ReactNode } from "react";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { fr } from "@/messages/fr";

const t = fr.supplierAccount;
const options = [
  { value: "lots", label: t.tabs.lots },
  { value: "history", label: t.tabs.history },
] as const;

/** "Lots en dépôt" / "Historique" switch of the supplier page (content rendered by the server). */
export function SupplierTabs({ lots, history }: { lots: ReactNode; history: ReactNode }) {
  const [tab, setTab] = useState<"lots" | "history">("lots");
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        aria-label={t.tabsLabel}
        options={options}
        value={tab}
        onValueChange={setTab}
        className="w-full sm:w-auto sm:self-start"
      />
      <div>{tab === "lots" ? lots : history}</div>
    </div>
  );
}
