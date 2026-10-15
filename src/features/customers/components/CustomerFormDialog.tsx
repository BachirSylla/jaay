"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, fieldAria } from "@/components/shared/Field";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
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
import { createCustomer, updateCustomer } from "../actions";
import {
  CUSTOMER_TYPES,
  customerSchema,
  type CustomerInput,
  type CustomerValues,
} from "../schemas";
import type { Customer } from "../types";

const t = fr.customers;
const typeOptions = CUSTOMER_TYPES.map((value) => ({ value, label: t.types[value] }));

function defaults(customer?: Customer, initialName = ""): CustomerInput {
  return {
    name: customer?.name ?? initialName,
    phone: customer?.phone ? formatPhone(customer.phone) : "",
    type: customer?.type ?? "individual",
    notes: customer?.notes ?? "",
  };
}

export function CustomerFormDialog({
  customer,
  trigger,
  open: controlledOpen,
  onOpenChange,
  initialName,
  onCreated,
}: {
  customer?: Customer;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialName?: string;
  onCreated?: (customer: Customer) => void;
}) {
  const { shop } = useShop();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CustomerInput, unknown, CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaults(customer, initialName),
  });
  const { errors } = form.formState;

  const setOpen = (next: boolean) => {
    if (next) {
      setFormError(null);
      form.reset(defaults(customer, initialName));
    }
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      if (customer) {
        const result = await updateCustomer(shop.id, customer.id, values);
        if (!result.ok) return setFormError(errorMessage(result.error));
        toast.success(t.updated);
      } else {
        const result = await createCustomer(shop.id, values);
        if (!result.ok) return setFormError(errorMessage(result.error));
        toast.success(t.created);
        onCreated?.(result.data);
      }
      setOpen(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {customer ? t.editTitle : t.add}
          </DialogTitle>
          <DialogDescription className="sr-only">{t.subtitle}</DialogDescription>
        </DialogHeader>
        <form id="customer-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label={t.name} htmlFor="customer-name" error={errors.name?.message}>
            <Input
              {...fieldAria("customer-name", errors.name?.message)}
              placeholder={t.namePlaceholder}
              {...form.register("name")}
            />
          </Field>
          <Field
            label={t.phone}
            htmlFor="customer-phone"
            optional={fr.common.optional}
            error={errors.phone?.message}
          >
            <Input
              {...fieldAria("customer-phone", errors.phone?.message)}
              type="tel"
              inputMode="tel"
              placeholder={fr.welcome.whatsappPlaceholder}
              {...form.register("phone")}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t.type}</span>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <SegmentedControl
                  aria-label={t.type}
                  options={typeOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  className="w-full"
                />
              )}
            />
          </div>
          <Field label={t.notes} htmlFor="customer-notes" optional={fr.common.optional}>
            <Textarea
              id="customer-notes"
              rows={3}
              placeholder={t.notesPlaceholder}
              {...form.register("notes")}
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
          <Button type="submit" form="customer-form" disabled={pending}>
            {pending ? fr.common.saving : fr.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
