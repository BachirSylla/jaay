"use client";

import { useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useShop } from "@/features/shop/shop-context";
import { fill } from "@/lib/i18n";
import { whatsappDigits } from "@/lib/phone";
import { fr } from "@/messages/fr";

/**
 * Shares the receipt image (and its text) through the phone's share sheet (WhatsApp…).
 * Without file sharing (most desktops), downloads the image and opens WhatsApp with the text.
 */
export function ShareReceiptButton({
  saleId,
  saleNumber,
  text,
  customerPhone,
}: {
  saleId: string;
  saleNumber: number;
  text: string;
  customerPhone: string | null;
}) {
  const { shop } = useShop();
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/s/${shop.slug}/ventes/${saleId}/recu`);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const file = new File([blob], `recu-${saleNumber}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text,
          title: fill(fr.sales.shareText, { shop: shop.name }),
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      const target = customerPhone ? whatsappDigits(customerPhone) : "";
      window.open(`https://wa.me/${target}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    } catch (error) {
      // Closing the share sheet is not an error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(fr.errors.UNKNOWN);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="whatsapp" onClick={share} disabled={busy}>
      {busy ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <Share2 aria-hidden="true" />
      )}
      {fr.sales.share}
    </Button>
  );
}
