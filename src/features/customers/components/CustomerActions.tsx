"use client";

import { Pencil } from "lucide-react";
import { ArchiveButton } from "@/components/shared/ArchiveButton";
import { WhatsAppLink } from "@/components/shared/WhatsAppLink";
import { Button } from "@/components/ui/button";
import { useShop } from "@/features/shop/shop-context";
import { fr } from "@/messages/fr";
import { setCustomerArchived } from "../actions";
import type { Customer } from "../types";
import { CustomerFormDialog } from "./CustomerFormDialog";

const t = fr.customers;

export function CustomerActions({ customer }: { customer: Customer }) {
  const { shop } = useShop();

  return (
    <>
      {customer.phone ? <WhatsAppLink phone={customer.phone} label={t.whatsapp} /> : null}
      <CustomerFormDialog
        customer={customer}
        trigger={
          <Button variant="outline">
            <Pencil data-icon="inline-start" aria-hidden="true" />
            {fr.common.edit}
          </Button>
        }
      />
      <ArchiveButton
        archived={Boolean(customer.archivedAt)}
        title={t.archiveTitle}
        description={t.archiveDescription}
        archivedToast={t.archivedToast}
        unarchivedToast={t.unarchivedToast}
        onToggle={(archived) => setCustomerArchived(shop.id, customer.id, archived)}
      />
    </>
  );
}
