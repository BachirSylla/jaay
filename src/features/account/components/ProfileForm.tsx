"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, fieldAria } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/phone";
import { fr } from "@/messages/fr";
import { updateProfile } from "../actions";
import { profileSchema, type ProfileInput, type ProfileValues } from "../schemas";

const t = fr.profile;

export function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string | null;
  email: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName, phone: phone ? formatPhone(phone) : "" },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result.ok) {
        toast.success(t.saved);
        form.reset(form.getValues());
      } else {
        toast.error(errorMessage(result.error));
      }
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label={t.fullName} htmlFor="profile-name" error={errors.fullName?.message}>
        <Input
          {...fieldAria("profile-name", errors.fullName?.message)}
          autoComplete="name"
          {...form.register("fullName")}
        />
      </Field>
      <Field
        label={t.phone}
        htmlFor="profile-phone"
        optional={fr.common.optional}
        error={errors.phone?.message}
      >
        <Input
          {...fieldAria("profile-phone", errors.phone?.message)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={fr.welcome.whatsappPlaceholder}
          {...form.register("phone")}
        />
      </Field>
      <Field label={t.email} htmlFor="profile-email" hint={t.emailHint}>
        <Input
          id="profile-email"
          value={email ?? ""}
          readOnly
          aria-describedby="profile-email-hint"
        />
      </Field>
      <Button type="submit" disabled={pending || !isDirty} className="self-start">
        {pending ? fr.common.saving : fr.common.save}
      </Button>
    </form>
  );
}
