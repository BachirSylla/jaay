"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { Button } from "@/components/ui/button";
import { useShop } from "@/features/shop/shop-context";
import { errorMessage } from "@/lib/errors";
import { compressImage, previewPathFor } from "@/lib/image";
import { PRODUCT_PHOTOS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { fr } from "@/messages/fr";
import { deleteProductPhoto, registerProductPhoto, setCoverPhoto } from "../actions";
import type { Product } from "../types";

const t = fr.catalog;
const MAX_PHOTOS = 6;

/**
 * Photos of a product. Files are compressed in the browser (WebP, JPEG fallback), uploaded
 * straight to Storage under '<shop>/<product>/', then recorded by a server action.
 */
export function PhotoManager({ product, editable }: { product: Product; editable: boolean }) {
  const { shop } = useShop();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const supabase = createClient();
    try {
      const room = MAX_PHOTOS - product.photos.length;
      for (const file of Array.from(files).slice(0, room)) {
        const image = await compressImage(file);
        // JPEG copy for WhatsApp / social previews (they do not all read WebP).
        const preview = await compressImage(file, { maxSize: 1200, quality: 0.8, format: "jpeg" });
        const path = `${shop.id}/${product.id}/${crypto.randomUUID()}.${image.extension}`;
        const bucket = supabase.storage.from(PRODUCT_PHOTOS_BUCKET);
        const { error } = await bucket.upload(path, image.blob, {
          contentType: image.contentType,
          cacheControl: "31536000",
        });
        if (error) throw error;
        await bucket.upload(previewPathFor(path), preview.blob, {
          contentType: preview.contentType,
          cacheControl: "31536000",
        });

        const result = await registerProductPhoto(shop.id, product.id, path);
        if (!result.ok) {
          await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).remove([path, previewPathFor(path)]);
          toast.error(errorMessage(result.error));
          return;
        }
      }
      toast.success(t.photoAdded);
    } catch {
      toast.error(fr.errors.UNKNOWN);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
        {product.photos.length === 0 ? (
          <li className="col-span-1">
            <ProductThumb name={product.name} color={product.color} className="aspect-square" />
          </li>
        ) : null}
        {product.photos.map((photo, index) => (
          <li key={photo.id} className="group relative">
            <ProductThumb
              name={product.name}
              photoPath={photo.storagePath}
              size={200}
              className="aspect-square"
            />
            {index === 0 ? (
              <span className="absolute top-1.5 left-1.5 rounded-full bg-espresso/80 px-2 py-0.5 text-[11px] font-semibold text-espresso-ink">
                {t.cover}
              </span>
            ) : null}
            {editable ? (
              <div className="absolute right-1.5 bottom-1.5 flex gap-1">
                {index > 0 ? (
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    aria-label={t.makeCover}
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await setCoverPhoto(shop.id, product.id, photo.id);
                        if (!result.ok) toast.error(errorMessage(result.error));
                      })
                    }
                    className="bg-surface/90 backdrop-blur"
                  >
                    <Star aria-hidden="true" />
                  </Button>
                ) : null}
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label={t.removePhoto}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteProductPhoto(shop.id, photo.id);
                      if (result.ok) toast.success(t.photoRemoved);
                      else toast.error(errorMessage(result.error));
                    })
                  }
                  className="bg-surface/90 text-danger backdrop-blur"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </li>
        ))}
        {editable && product.photos.length < MAX_PHOTOS ? (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-line bg-surface text-[13px] font-semibold text-muted-foreground outline-none hover:border-cognac hover:text-cognac focus-visible:border-cognac disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 aria-hidden="true" className="size-6 animate-spin" />
              ) : (
                <ImagePlus aria-hidden="true" className="size-6" />
              )}
              {uploading ? t.uploading : t.addPhoto}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-label={t.addPhoto}
              onChange={(event) => upload(event.target.files)}
            />
          </li>
        ) : null}
      </ul>
      {editable ? <p className="text-[13px] text-muted-foreground">{t.photosHint}</p> : null}
    </div>
  );
}
