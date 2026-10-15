import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.auth.signUpTitle };

export default function SignUpPage() {
  return (
    <AuthLayout
      title={fr.auth.signUpTitle}
      subtitle={fr.auth.signUpSubtitle}
      footer={
        <>
          {fr.auth.haveAccount}{" "}
          <Link
            href="/connexion"
            className="font-semibold text-cognac underline-offset-4 hover:underline"
          >
            {fr.auth.linkSignIn}
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthLayout>
  );
}
