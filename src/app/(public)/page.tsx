import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { fr } from "@/messages/fr";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-espresso text-espresso-ink">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-6 py-16 sm:px-10">
        <Logo size={56} />
        <h1 className="max-w-2xl text-[40px] leading-[1.05] tracking-[-1px] sm:text-[56px]">
          {fr.app.tagline}
        </h1>
        <p className="max-w-xl text-lg text-espresso-muted">{fr.app.description}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/inscription">{fr.auth.signUpTitle}</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="text-espresso-ink hover:bg-espresso-ink/10 hover:text-espresso-ink"
          >
            <Link href="/connexion">{fr.auth.linkSignIn}</Link>
          </Button>
          {process.env.NODE_ENV !== "production" ? (
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-espresso-muted hover:bg-espresso-ink/10 hover:text-espresso-ink"
            >
              <Link href="/demo">{fr.demo.title}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
