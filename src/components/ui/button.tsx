import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-[15px] font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color] duration-150 ease-out outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-cognac text-on-cognac hover:bg-cognac-hover",
        outline:
          "border-line bg-surface text-ink hover:bg-surface-muted aria-expanded:bg-surface-muted",
        secondary: "bg-surface-muted text-ink hover:bg-line aria-expanded:bg-line",
        ghost: "text-ink hover:bg-surface-muted aria-expanded:bg-surface-muted",
        destructive:
          "bg-danger-soft text-danger hover:bg-danger hover:text-surface focus-visible:ring-destructive/30",
        whatsapp: "bg-whatsapp text-white hover:brightness-95",
        link: "text-cognac underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        // Small sizes keep a 44px touch area through an invisible ::after.
        sm: "relative h-9 gap-1.5 rounded-sm px-3 text-sm after:absolute after:inset-x-0 after:-inset-y-1 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-13 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-11",
        "icon-sm": "relative size-9 rounded-sm after:absolute after:-inset-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
