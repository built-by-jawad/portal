import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { saveTaskEdit } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [task, leads] = await Promise.all([
    prisma.task.findUnique({ where: { id } }),
    prisma.lead.findMany({ select: { id: true, businessName: true }, orderBy: { businessName: "asc" } }),
  ]);

  if (!task) notFound();

  const boundSave = saveTaskEdit.bind(null, task.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Edit Task" description="Update this to-do." />

      <form action={boundSave} className="space-y-4 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Title <span className="text-green">*</span>
          </label>
          <input
            name="title"
            required
            defaultValue={task.title}
            className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={task.description ?? ""}
            placeholder="Optional, short description of what needs to be done"
            className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Client</label>
          <select
            name="leadId"
            defaultValue={task.leadId ?? ""}
            className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          >
            <option value="">No client / general task</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.businessName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Due date</label>
          <input
            type="date"
            name="dueDate"
            defaultValue={task.dueDate ?? ""}
            className="w-full max-w-xs rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
        >
          Save Task
        </button>
      </form>
    </div>
  );
}
