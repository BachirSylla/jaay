import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "cn";
import { fr } from "@/messages/fr";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Small line above the title (date, context). */
  eyebrow?: ReactNode;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between lg:mb-8",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={fr.common.back}
            className="-ml-2 grid size-11 shrink-0 place-items-center rounded-xl text-ink hover:bg-surface-muted"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          {eyebrow ? (
            <span className="text-[13px] font-medium text-muted-foreground">{eyebrow}</span>
          ) : null}
          <h1 className="text-[28px] leading-tight lg:text-[32px]">{title}</h1>
          {description ? <p className="text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
