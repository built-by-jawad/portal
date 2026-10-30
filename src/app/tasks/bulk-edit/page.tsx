import PageHeader from "@/components/PageHeader";
import BulkEditTable from "@/components/BulkEditTable";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function BulkEditTasksPage() {
  const profile = await getCurrentProfile();
  const visibilityFilter: Prisma.TaskWhereInput =
    profile && !profile.isAdmin ? { OR: [{ createdById: profile.id }, { assignedToIds: { has: profile.id } }] } : {};

  const [tasks, leads] = await Promise.all([
    prisma.task.findMany({
      where: visibilityFilter,
      orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.lead.findMany({
      where: { status: "BOOKED" },
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader
        title="Bulk Edit Tasks"
        description="Edit fields inline, or select rows for bulk actions (set client, set due date, mark done, delete)."
      />
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-10 text-center text-sm text-slate">
          No tasks yet.
        </div>
      ) : (
        <BulkEditTable tasks={tasks} leads={leads} />
      )}
    </div>
  );
}
