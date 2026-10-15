"use client";

import { ArchiveButton } from "@/components/shared/ArchiveButton";
import { useShop } from "@/features/shop/shop-context";
import { fr } from "@/messages/fr";
import { setProductArchived } from "../actions";
import type { Product } from "../types";

const t = fr.catalog;

export function ProductActions({ product }: { product: Product }) {
  const { shop } = useShop();

  return (
    <ArchiveButton
      archived={Boolean(product.archivedAt)}
      title={t.archiveTitle}
      description={t.archiveDescription}
      archivedToast={t.archivedToast}
      unarchivedToast={t.unarchivedToast}
      onToggle={(archived) => setProductArchived(shop.id, product.id, archived)}
    />
  );
}
