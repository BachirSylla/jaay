import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PasswordForm } from "@/features/account/components/PasswordForm";
import { ProfileForm } from "@/features/account/components/ProfileForm";
import { requireShop } from "@/features/shop/require";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.profile.title };

const t = fr.profile;

export default function ProfilePage({ params }: PageProps<"/s/[shopSlug]/profil">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Profile params={params} />
    </Suspense>
  );
}

async function Profile({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { user } = await requireShop(params);
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-4xl">
      <PageHeader title={t.title} description={t.subtitle} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-lg">{t.details}</h2>
          <ProfileForm
            fullName={profile?.full_name ?? user.fullName}
            phone={profile?.phone ?? null}
            email={profile?.email ?? user.email}
          />
        </section>
        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div>
              <h2 className="text-lg">{t.password}</h2>
              <p className="text-sm text-muted-foreground">{t.passwordHint}</p>
            </div>
            <PasswordForm />
          </section>
          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-lg">{fr.settings.appearance}</h2>
            <ThemeToggle className="w-full" />
          </section>
        </div>
      </div>
    </div>
  );
}
