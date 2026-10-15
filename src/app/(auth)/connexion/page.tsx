import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.auth.signInTitle };

export default function SignInPage() {
  return (
    <AuthLayout
      title={fr.auth.signInTitle}
      subtitle={fr.auth.signInSubtitle}
      footer={
        <>
          {fr.auth.noAccount}{" "}
          <Link
            href="/inscription"
            className="font-semibold text-cognac underline-offset-4 hover:underline"
          >
            {fr.auth.linkSignUp}
          </Link>
        </>
      }
    >
      {/* The form reads ?next= from the URL, which is only known at request time. */}
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
        <SignInForm />
      </Suspense>
    </AuthLayout>
  );
}
