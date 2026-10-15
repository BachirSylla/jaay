import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-base text-ink transition-[border-color,background-color] duration-150 ease-out outline-none placeholder:text-subtle focus-visible:border-[1.5px] focus-visible:border-cognac focus-visible:bg-cognac-soft disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
