import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import ExpenseForm from "@/components/ExpenseForm";
import DeleteExpenseButton from "@/components/DeleteExpenseButton";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const profiles = await prisma.profile.findMany({ orderBy: { name: "asc" } });

  const expenses = await prisma.expense.findMany({
    where: me.isAdmin ? {} : { adminOnly: false, shares: { some: { profileId: me.id } } },
    include: { paidBy: { select: { name: true } }, shares: { include: { profile: { select: { name: true } } } } },
    orderBy: { date: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Expenses" description={`${expenses.length} expense${expenses.length === 1 ? "" : "s"}.`} />

      <div className="mb-8 rounded-xl border border-mist/30 bg-white/60 p-4 sm:p-6">
        <h2 className="mb-4 font-display font-bold text-ink">Add expense</h2>
        <ExpenseForm profiles={profiles.map((p) => ({ id: p.id, name: p.name }))} />
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          No expenses yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="rounded-xl border border-mist/30 bg-white/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display font-bold text-ink">{expense.description}</p>
                  <p className="text-xs text-slate">
                    {expense.date} · ${expense.amount.toFixed(2)}
                    {expense.paidBy && <> · paid by {expense.paidBy.name}</>}
                    {expense.adminOnly && <> · admin-only</>}
                  </p>
                  {!expense.adminOnly && expense.shares.length > 0 && (
                    <p className="mt-1 text-xs text-slate">
                      Split: {expense.shares.map((s) => `${s.profile.name} $${s.amount.toFixed(2)}`).join(", ")}
                    </p>
                  )}
                </div>
                {me.isAdmin && <DeleteExpenseButton expenseId={expense.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
