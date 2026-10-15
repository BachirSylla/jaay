import type { ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";
import { fr } from "@/messages/fr";

/**
 * Sign-up / sign-in screen (mockup 6): espresso upper half with the gold logo and the
 * tagline, light sheet with the form. On large screens the two halves sit side by side.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-espresso lg:flex-row">
      <section className="flex flex-col justify-end gap-5 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-12 text-espresso-ink sm:px-10 lg:w-1/2 lg:justify-center lg:px-16 lg:pb-16">
        <Logo size={52} />
        <p className="max-w-md font-display text-[34px] leading-[1.1] font-bold tracking-[-0.5px] sm:text-[40px] lg:text-[52px]">
          {fr.app.tagline}
        </p>
        <p className="max-w-md text-espresso-muted">{fr.app.description}</p>
      </section>

      <main className="-mt-6 flex flex-1 flex-col rounded-t-[28px] bg-ground px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 lg:mt-0 lg:items-center lg:justify-center lg:rounded-none lg:px-16">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px]">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          {children}
          <p className="text-center text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}
