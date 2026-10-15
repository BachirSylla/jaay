import type { ReactNode } from "react";

/** Icon + label + value line of a detail card (inside a <dl>). */
export function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 text-subtle [&_svg]:size-[18px]">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
        <dd className="break-words">{children}</dd>
      </div>
    </div>
  );
}
