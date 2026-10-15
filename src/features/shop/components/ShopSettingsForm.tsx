"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Field, fieldAria } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/phone";
import { catalogUrl } from "@/lib/site";
import { fr } from "@/messages/fr";
import { updateShopSettings } from "../actions";
import { shopSettingsSchema, type ShopSettingsInput, type ShopSettingsValues } from "../schemas";
import { useShop } from "../shop-context";

const t = fr.settings;

export function ShopSettingsForm() {
  const { shop } = useShop();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const form = useForm<ShopSettingsInput, unknown, ShopSettingsValues>({
    resolver: zodResolver(shopSettingsSchema),
    defaultValues: {
      name: shop.name,
      whatsappPhone: shop.whatsappPhone ? formatPhone(shop.whatsappPhone) : "",
      showPublicPrices: shop.showPublicPrices,
      catalogEnabled: shop.catalogEnabled,
    },
  });
  const { errors, isDirty } = form.formState;
  const link = catalogUrl(shop.slug);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateShopSettings(shop.id, values);
      if (result.ok) {
        toast.success(t.saved);
        form.reset(form.getValues());
      } else {
        toast.error(errorMessage(result.error));
      }
    });
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be refused; the link stays visible and selectable.
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field label={t.name} htmlFor="name" error={errors.name?.message}>
        <Input {...fieldAria("name", errors.name?.message)} {...form.register("name")} />
      </Field>

      <Field
        label={t.whatsapp}
        htmlFor="whatsappPhone"
        optional={fr.common.optional}
        error={errors.whatsappPhone?.message}
        hint={fr.welcome.whatsappHint}
      >
        <Input
          {...fieldAria("whatsappPhone", errors.whatsappPhone?.message, true)}
          type="tel"
          inputMode="tel"
          placeholder={fr.welcome.whatsappPlaceholder}
          {...form.register("whatsappPhone")}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.publicLink}</span>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted/50 py-1 pr-1 pl-3.5">
          <span className="min-w-0 flex-1 truncate text-sm">{link}</span>
          <Button type="button" variant="ghost" size="sm" onClick={copyLink}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? fr.common.copied : fr.common.copy}
          </Button>
        </div>
      </div>

      <SwitchRow
        id="showPublicPrices"
        label={t.showPrices}
        hint={t.showPricesHint}
        control={
          <Controller
            control={form.control}
            name="showPublicPrices"
            render={({ field }) => (
              <Switch
                id="showPublicPrices"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        }
      />
      <SwitchRow
        id="catalogEnabled"
        label={t.catalogEnabled}
        hint={t.catalogEnabledHint}
        control={
          <Controller
            control={form.control}
            name="catalogEnabled"
            render={({ field }) => (
              <Switch id="catalogEnabled" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        }
      />

      <Button type="submit" disabled={pending || !isDirty} className="self-start">
        {pending ? fr.common.saving : fr.common.save}
      </Button>
    </form>
  );
}

function SwitchRow({
  id,
  label,
  hint,
  control,
}: {
  id: string;
  label: string;
  hint: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={id} className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-[13px] text-muted-foreground">{hint}</span>
      </label>
      {control}
    </div>
  );
}
