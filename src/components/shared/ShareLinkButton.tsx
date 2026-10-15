"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fr } from "@/messages/fr";

/** Shares a link with the phone's share sheet, or copies it when sharing is not available. */
export function ShareLinkButton({
  url,
  title,
  text,
  label = fr.publicCatalog.share,
  variant = "outline",
  className,
}: {
  url: string;
  title: string;
  text?: string;
  label?: string;
  variant?: "outline" | "ghost" | "secondary";
  className?: string;
}) {
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url, title, text });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(fr.publicCatalog.linkCopied);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(fr.errors.UNKNOWN);
    }
  };

  return (
    <Button type="button" variant={variant} onClick={share} className={className}>
      <Share2 data-icon="inline-start" aria-hidden="true" />
      {label}
    </Button>
  );
}
