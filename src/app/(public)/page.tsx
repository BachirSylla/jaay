import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fr } from "@/messages/fr";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-6 px-5">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-2xl bg-espresso font-display text-3xl font-bold text-gold"
      >
        J
      </span>
      <h1 className="text-[40px] leading-tight">{fr.app.name}</h1>
      <p className="text-lg text-muted-foreground">{fr.app.tagline}</p>
      {process.env.NODE_ENV !== "production" ? (
        <Button asChild size="lg">
          <Link href="/demo">{fr.demo.title}</Link>
        </Button>
      ) : null}
    </main>
  );
}
