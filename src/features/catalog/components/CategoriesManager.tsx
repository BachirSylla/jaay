"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShop } from "@/features/shop/shop-context";
import { errorMessage } from "@/lib/errors";
import { fr } from "@/messages/fr";
import { createCategory, renameCategory } from "../actions";
import type { Category } from "../types";

const t = fr.categories;

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const { shop } = useShop();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const add = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createCategory(shop.id, name);
      if (result.ok) {
        toast.success(t.created);
        setName("");
      } else {
        toast.error(result.error === "DUPLICATE" ? t.duplicate : errorMessage(result.error));
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line-soft">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </ul>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          maxLength={60}
        />
        <Button type="submit" variant="outline" disabled={pending || !name.trim()}>
          <Plus aria-hidden="true" />
          {t.add}
        </Button>
      </form>
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const { shop } = useShop();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await renameCategory(shop.id, category.id, name);
      if (result.ok) {
        toast.success(t.renamed);
        setEditing(false);
      } else {
        toast.error(result.error === "DUPLICATE" ? t.duplicate : errorMessage(result.error));
      }
    });

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label={t.rename}
          maxLength={60}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") setEditing(false);
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          aria-label={fr.common.save}
          onClick={save}
          disabled={pending}
        >
          <Check aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={fr.common.cancel}
          onClick={() => {
            setName(category.name);
            setEditing(false);
          }}
        >
          <X aria-hidden="true" />
        </Button>
      </li>
    );
  }

  return (
    <li className="flex min-h-12 items-center justify-between gap-2">
      <span className="font-medium">{category.name}</span>
      <Button
        size="icon"
        variant="ghost"
        aria-label={`${t.rename} — ${category.name}`}
        onClick={() => setEditing(true)}
      >
        <Pencil aria-hidden="true" />
      </Button>
    </li>
  );
}
