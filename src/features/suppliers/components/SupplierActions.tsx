"use client";

import { Pencil } from "lucide-react";
import { ArchiveButton } from "@/components/shared/ArchiveButton";
import { WhatsAppLink } from "@/components/shared/WhatsAppLink";
import { Button } from "@/components/ui/button";
import { useShop } from "@/features/shop/shop-context";
import { fr } from "@/messages/fr";
import { setSupplierArchived } from "../actions";
import type { Supplier } from "../types";
import { SupplierFormDialog } from "./SupplierFormDialog";

const t = fr.suppliers;

export function SupplierActions({ supplier }: { supplier: Supplier }) {
  const { shop } = useShop();

  return (
    <>
      {supplier.phone ? <WhatsAppLink phone={supplier.phone} label={t.whatsapp} /> : null}
      <SupplierFormDialog
        supplier={supplier}
        trigger={
          <Button variant="outline">
            <Pencil data-icon="inline-start" aria-hidden="true" />
            {fr.common.edit}
          </Button>
        }
      />
      <ArchiveButton
        archived={Boolean(supplier.archivedAt)}
        title={t.archiveTitle}
        description={t.archiveDescription}
        archivedToast={t.archivedToast}
        unarchivedToast={t.unarchivedToast}
        onToggle={(archived) => setSupplierArchived(shop.id, supplier.id, archived)}
      />
    </>
  );
}
