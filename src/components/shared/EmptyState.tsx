import type { ReactNode } from "react";
import { cn } from "cn";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, text, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-2xl bg-cognac-tint text-cognac [&_svg]:size-6"
      >
        {icon}
      </span>
      <p className="font-display text-lg font-bold">{title}</p>
      {text ? <p className="max-w-sm text-muted-foreground">{text}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
