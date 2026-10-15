"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Field, fieldAria } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/errors";
import { ASSIGNABLE_ROLES } from "@/lib/permissions";
import { fr } from "@/messages/fr";
import { addMember } from "../actions";
import {
  addMemberSchema,
  generatePassword,
  type AddMemberInput,
  type AddMemberValues,
} from "../schemas";
import { useShop } from "../shop-context";

const t = fr.members;

export function AddMemberDialog() {
  const { shop } = useShop();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AddMemberInput, unknown, AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { fullName: "", email: "", password: "", role: "manager" },
  });
  const { errors } = form.formState;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setFormError(null);
      form.reset({ fullName: "", email: "", password: generatePassword(), role: "manager" });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await addMember(shop.id, values);
      if (!result.ok) {
        setFormError(errorMessage(result.error));
        return;
      }
      toast.success(result.data.attached ? t.attached : t.added);
      setOpen(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus data-icon="inline-start" aria-hidden="true" />
          {t.add}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t.addTitle}</DialogTitle>
          <DialogDescription>{t.addDescription}</DialogDescription>
        </DialogHeader>
        <form id="add-member" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label={t.fullName} htmlFor="member-name" error={errors.fullName?.message}>
            <Input
              {...fieldAria("member-name", errors.fullName?.message)}
              autoComplete="off"
              placeholder={fr.auth.fullNamePlaceholder}
              {...form.register("fullName")}
            />
          </Field>
          <Field label={t.email} htmlFor="member-email" error={errors.email?.message}>
            <Input
              {...fieldAria("member-email", errors.email?.message)}
              type="email"
              inputMode="email"
              autoComplete="off"
              {...form.register("email")}
            />
          </Field>
          <Field
            label={t.password}
            htmlFor="member-password"
            error={errors.password?.message}
            hint={t.passwordHint}
          >
            <div className="flex gap-2">
              <Input
                {...fieldAria("member-password", errors.password?.message, true)}
                autoComplete="new-password"
                className="font-mono tracking-wide"
                {...form.register("password")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  form.setValue("password", generatePassword(), { shouldValidate: true })
                }
              >
                <RefreshCw aria-hidden="true" />
                {t.generate}
              </Button>
            </div>
          </Field>
          <Field label={t.role} htmlFor="member-role">
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="member-role" className="h-12 w-full rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role} className="min-h-10">
                          {fr.shop.roles[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[13px] text-muted-foreground">
                    {t.roleHints[field.value ?? "manager"]}
                  </p>
                </>
              )}
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
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            {fr.common.cancel}
          </Button>
          <Button type="submit" form="add-member" disabled={pending}>
            {pending ? fr.common.saving : t.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
