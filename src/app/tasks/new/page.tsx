import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { createTask } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const [leads, profiles] = await Promise.all([
    prisma.lead.findMany({
      select: { id: true, businessName: true },
      orderBy: { businessName: "asc" },
    }),
    prisma.profile.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Add Task" description="A to-do, optionally tied to a lead." />

      <form action={createTask} className="space-y-4 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Title <span className="text-green">*</span>
          </label>
          <input
            name="title"
            required
            className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Optional, short description of what needs to be done"
            className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Client</label>
          <select
            name="leadId"
            defaultValue=""
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Due date</label>
            <input
              type="date"
              name="dueDate"
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Due time (for WhatsApp reminder)</label>
            <input
              type="time"
              name="dueTime"
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Assign to</label>
          <div className="flex flex-wrap gap-4">
            {profiles.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="assignedToIds" value={p.id} className="h-4 w-4 rounded border-mist/40 accent-green" />
                {p.name}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="visibleToAll"
            value="true"
            defaultChecked
            className="h-4 w-4 rounded border-mist/40 accent-green"
          />
          Visible to other profiles with Tasks access (uncheck to keep this just for you)
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
        >
          Add Task
        </button>
      </form>
    </div>
  );
}
