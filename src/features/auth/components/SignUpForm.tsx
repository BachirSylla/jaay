"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, fieldAria } from "@/components/shared/Field";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { fr } from "@/messages/fr";
import { signUp } from "../actions";
import { signUpSchema, type SignUpValues } from "../schemas";

const t = fr.auth;

export function SignUpForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      // On success the action redirects; it only returns on error.
      const result = await signUp(values);
      if (!result.ok) setFormError(errorMessage(result.error));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label={t.fullName} htmlFor="fullName" error={errors.fullName?.message}>
        <Input
          {...fieldAria("fullName", errors.fullName?.message)}
          autoComplete="name"
          placeholder={t.fullNamePlaceholder}
          {...form.register("fullName")}
        />
      </Field>
      <Field label={t.email} htmlFor="email" error={errors.email?.message}>
        <Input
          {...fieldAria("email", errors.email?.message)}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          {...form.register("email")}
        />
      </Field>
      <Field
        label={t.password}
        htmlFor="password"
        error={errors.password?.message}
        hint={t.passwordHint}
      >
        <PasswordInput
          {...fieldAria("password", errors.password?.message, true)}
          autoComplete="new-password"
          {...form.register("password")}
        />
      </Field>
      {formError ? (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {formError}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? fr.common.loading : t.submitSignUp}
      </Button>
    </form>
  );
}
