"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link2 } from "lucide-react";
import { Field, fieldAria } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { siteHost } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { fr } from "@/messages/fr";
import { createShop } from "../actions";
import { createShopSchema, type CreateShopInput, type CreateShopValues } from "../schemas";

const t = fr.welcome;

export function CreateShopForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CreateShopInput, unknown, CreateShopValues>({
    resolver: zodResolver(createShopSchema),
    defaultValues: { name: "", whatsappPhone: "" },
  });
  const { errors } = form.formState;
  const name = useWatch({ control: form.control, name: "name" });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await createShop(values);
      if (!result.ok) setFormError(errorMessage(result.error));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field label={t.shopName} htmlFor="name" error={errors.name?.message}>
        <Input
          {...fieldAria("name", errors.name?.message)}
          autoComplete="organization"
          placeholder={t.shopNamePlaceholder}
          autoFocus
          {...form.register("name")}
        />
      </Field>

      <div className="flex items-start gap-3 rounded-xl bg-cognac-soft px-4 py-3 ring-1 ring-cognac-tint">
        <Link2 aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-cognac" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted-foreground">{t.publicLink}</span>
          <span className="truncate font-medium text-ink">
            {siteHost()}/b/<span className="text-cognac">{slugify(name ?? "")}</span>
          </span>
          <span className="text-xs text-muted-foreground">{t.publicLinkHint}</span>
        </div>
      </div>

      <Field
        label={t.whatsapp}
        htmlFor="whatsappPhone"
        optional={fr.common.optional}
        error={errors.whatsappPhone?.message}
        hint={t.whatsappHint}
      >
        <Input
          {...fieldAria("whatsappPhone", errors.whatsappPhone?.message, true)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t.whatsappPlaceholder}
          {...form.register("whatsappPhone")}
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
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? fr.common.loading : t.submit}
      </Button>
    </form>
  );
}
