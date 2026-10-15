import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { cn } from "cn";
import { bagColorFor, isLightBag } from "@/lib/bag-colors";
import { productPhotoUrl } from "@/lib/storage";

type ProductThumbProps = {
  name: string;
  color?: string | null;
  photoPath?: string | null;
  /** Rendered size in px, used for the image sizes hint. */
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Product photo, or a tile in the bag color with a bag icon when there is no photo. */
export function ProductThumb({
  name,
  color,
  photoPath,
  size = 92,
  className,
  priority,
}: ProductThumbProps) {
  if (photoPath) {
    return (
      <span className={cn("relative block overflow-hidden rounded-xl bg-surface-muted", className)}>
        <Image
          src={productPhotoUrl(photoPath)}
          alt={name}
          fill
          sizes={`${size}px`}
          priority={priority}
          className="object-cover"
        />
      </span>
    );
  }

  const bag = bagColorFor(color);
  return (
    <span
      role="img"
      aria-label={name}
      className={cn("grid place-items-center rounded-xl", bag.className, className)}
    >
      <ShoppingBag
        aria-hidden="true"
        strokeWidth={1.5}
        className={cn("size-[40%]", isLightBag(bag) ? "text-espresso/60" : "text-white/75")}
      />
    </span>
  );
}
