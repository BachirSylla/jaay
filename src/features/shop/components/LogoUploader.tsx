"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { compressImage } from "@/lib/image";
import { initials } from "@/lib/initials";
import { SHOP_LOGOS_BUCKET, shopLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { fr } from "@/messages/fr";
import { setShopLogo } from "../actions";
import { useShop } from "../shop-context";

const t = fr.settings;

/** Shop logo: compressed in the browser (512px), uploaded under "<shop_id>/", then saved. */
export function LogoUploader() {
  const { shop } = useShop();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const image = await compressImage(file, { maxSize: 512, quality: 0.85 });
      const path = `${shop.id}/logo-${crypto.randomUUID()}.${image.extension}`;
      const bucket = createClient().storage.from(SHOP_LOGOS_BUCKET);
      const { error } = await bucket.upload(path, image.blob, {
        contentType: image.contentType,
        cacheControl: "31536000",
      });
      if (error) throw error;
      const result = await setShopLogo(shop.id, path);
      if (result.ok) toast.success(t.logoSaved);
      else {
        await bucket.remove([path]);
        toast.error(errorMessage(result.error));
      }
    } catch {
      toast.error(fr.errors.UNKNOWN);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-espresso font-display text-xl font-bold text-gold">
        {shop.logoPath ? (
          <Image
            src={shopLogoUrl(shop.logoPath)}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          initials(shop.name)
        )}
      </span>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <ImagePlus aria-hidden="true" />
            )}
            {shop.logoPath ? t.logoChange : t.logoAdd}
          </Button>
          {shop.logoPath ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setShopLogo(shop.id, null);
                  if (result.ok) toast.success(t.logoRemoved);
                  else toast.error(errorMessage(result.error));
                })
              }
            >
              <Trash2 aria-hidden="true" />
              {t.logoRemove}
            </Button>
          ) : null}
        </div>
        <span className="text-[13px] text-muted-foreground">{t.logoHint}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label={t.logoAdd}
        onChange={(event) => upload(event.target.files?.[0])}
      />
    </div>
  );
}
