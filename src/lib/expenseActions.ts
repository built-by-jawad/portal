"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

export async function createExpense(formData: FormData) {
  const description = str(formData, "description");
  const amountStr = str(formData, "amount");
  const date = str(formData, "date");
  if (!description || !amountStr || !date) throw new Error("Description, amount, and date are required");
  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const adminOnly = formData.get("adminOnly") === "on";
  const splitMode = formData.get("splitMode") === "CUSTOM" ? "CUSTOM" : "EQUAL";
  const paidById = str(formData, "paidById");

  const shareProfileIds = adminOnly ? [] : formData.getAll("shareProfileIds").map(String).filter(Boolean);

  const shares =
    splitMode === "EQUAL"
      ? shareProfileIds.map((profileId) => ({ profileId, amount: amount / shareProfileIds.length }))
      : shareProfileIds.map((profileId) => {
          const customAmount = Number(formData.get(`customAmount_${profileId}`) ?? 0);
          return { profileId, amount: customAmount };
        });

  await prisma.expense.create({
    data: {
      description,
      amount,
      date,
      adminOnly,
      splitMode,
      paidById,
      shares: adminOnly || shares.length === 0 ? undefined : { create: shares },
    },
  });

  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function deleteExpense(expenseId: string) {
  await prisma.expense.delete({ where: { id: expenseId } });
  revalidatePath("/expenses");
}
