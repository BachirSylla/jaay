"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, fieldAria } from "@/components/shared/Field";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { fr } from "@/messages/fr";
import { changePassword } from "../actions";
import { passwordChangeSchema, type PasswordChangeValues } from "../schemas";

const t = fr.profile;
const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await changePassword(values);
      if (result.ok) {
        toast.success(t.passwordChanged);
        form.reset(EMPTY);
      } else {
        setFormError(errorMessage(result.error));
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field
        label={t.currentPassword}
        htmlFor="current-password"
        error={errors.currentPassword?.message}
      >
        <PasswordInput
          {...fieldAria("current-password", errors.currentPassword?.message)}
          autoComplete="current-password"
          {...form.register("currentPassword")}
        />
      </Field>
      <Field
        label={t.newPassword}
        htmlFor="new-password"
        error={errors.newPassword?.message}
        hint={fr.auth.passwordHint}
      >
        <PasswordInput
          {...fieldAria("new-password", errors.newPassword?.message, true)}
          autoComplete="new-password"
          {...form.register("newPassword")}
        />
      </Field>
      <Field
        label={t.confirmPassword}
        htmlFor="confirm-password"
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          {...fieldAria("confirm-password", errors.confirmPassword?.message)}
          autoComplete="new-password"
          {...form.register("confirmPassword")}
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
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? fr.common.saving : t.changePassword}
      </Button>
    </form>
  );
}
