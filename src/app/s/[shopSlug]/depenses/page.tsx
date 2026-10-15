import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { ExpenseFormDialog } from "@/features/expenses/components/ExpenseFormDialog";
import { ExpensesList } from "@/features/expenses/components/ExpensesList";
import { listExpenses } from "@/features/expenses/queries";
import { requireShop } from "@/features/shop/require";
import { listSuppliers } from "@/features/suppliers/queries";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.expenses.title };

export default function ExpensesPage({ params }: PageProps<"/s/[shopSlug]/depenses">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Expenses params={params} />
    </Suspense>
  );
}

async function Expenses({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shop } = await requireShop(params);
  await connection();
  const [expenses, suppliers] = await Promise.all([listExpenses(shop.id), listSuppliers(shop.id)]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={fr.expenses.title}
        description={fr.expenses.subtitle}
        actions={<ExpenseFormDialog suppliers={suppliers} />}
      />
      <ExpensesList expenses={expenses} now={new Date().toISOString()} />
    </div>
  );
}
