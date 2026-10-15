import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { fr } from "@/messages/fr";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5">
      <EmptyState
        icon={<SearchX />}
        title={fr.errors.NOT_FOUND}
        text={fr.notFound.text}
        action={
          <Button asChild>
            <Link href="/app">{fr.notFound.action}</Link>
          </Button>
        }
      />
    </main>
  );
}
