"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { useShop } from "@/features/shop/shop-context";
import { errorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/phone";
import { fr } from "@/messages/fr";
import { createSupplier, updateSupplier } from "../actions";
import { supplierSchema, type SupplierInput, type SupplierValues } from "../schemas";
import type { Supplier } from "../types";

const t = fr.suppliers;

function defaults(supplier?: Supplier): SupplierInput {
  return {
    name: supplier?.name ?? "",
    phone: supplier?.phone ? formatPhone(supplier.phone) : "",
    address: supplier?.address ?? "",
    notes: supplier?.notes ?? "",
  };
}

export function SupplierFormDialog({
  supplier,
  trigger,
  onCreated,
}: {
  supplier?: Supplier;
  trigger: ReactNode;
  onCreated?: (id: string) => void;
}) {
  const { shop } = useShop();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SupplierInput, unknown, SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaults(supplier),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      if (supplier) {
        const result = await updateSupplier(shop.id, supplier.id, values);
        if (!result.ok) return setFormError(errorMessage(result.error));
        toast.success(t.updated);
      } else {
        const result = await createSupplier(shop.id, values);
        if (!result.ok) return setFormError(errorMessage(result.error));
        toast.success(t.created);
        onCreated?.(result.data.id);
      }
      setOpen(false);
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFormError(null);
          form.reset(defaults(supplier));
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {supplier ? t.editTitle : t.add}
          </DialogTitle>
          <DialogDescription className="sr-only">{t.subtitle}</DialogDescription>
        </DialogHeader>
        <form id="supplier-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label={t.name} htmlFor="supplier-name" error={errors.name?.message}>
            <Input
              {...fieldAria("supplier-name", errors.name?.message)}
              placeholder={t.namePlaceholder}
              {...form.register("name")}
            />
          </Field>
          <Field
            label={t.phone}
            htmlFor="supplier-phone"
            optional={fr.common.optional}
            error={errors.phone?.message}
          >
            <Input
              {...fieldAria("supplier-phone", errors.phone?.message)}
              type="tel"
              inputMode="tel"
              placeholder={fr.welcome.whatsappPlaceholder}
              {...form.register("phone")}
            />
          </Field>
          <Field label={t.address} htmlFor="supplier-address" optional={fr.common.optional}>
            <Input id="supplier-address" {...form.register("address")} />
          </Field>
          <Field label={t.notes} htmlFor="supplier-notes" optional={fr.common.optional}>
            <Textarea id="supplier-notes" rows={3} {...form.register("notes")} />
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
          <Button type="submit" form="supplier-form" disabled={pending}>
            {pending ? fr.common.saving : fr.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
