import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { createClientUpdate } from "@/lib/actions";
import { todayInTimeZone } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";

export default async function NewClientUpdatePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;

  const clients = await prisma.lead.findMany({
    where: { status: "BOOKED" },
    select: { id: true, businessName: true },
    orderBy: { businessName: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Log Client Update" description="Record a piece of completed work — add proof screenshots after saving." />

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist/50 p-6 text-center text-sm text-slate">
          No clients yet. A lead becomes a client once its status is set to Booked.
        </div>
      ) : (
        <form
          action={createClientUpdate}
          className="space-y-4 rounded-xl border border-mist/30 bg-white/60 p-4 shadow-sm sm:p-6"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Client <span className="text-green">*</span>
            </label>
            <select
              name="leadId"
              required
              defaultValue={leadId || ""}
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            >
              <option value="" disabled>
                Select a client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Date <span className="text-green">*</span>
            </label>
            <input
              type="date"
              name="date"
              required
              defaultValue={todayInTimeZone(PAKISTAN_TZ)}
              className="w-full max-w-xs rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              Task name <span className="text-green">*</span>
            </label>
            <input
              name="taskName"
              required
              placeholder="e.g. Rebuilt homepage hero section"
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
            <textarea
              name="description"
              rows={4}
              placeholder="What was done, and why it matters to the client"
              className="w-full rounded-lg border border-mist/40 bg-white px-3 py-2.5 text-sm text-ink focus:border-green focus:outline-none focus:ring-1 focus:ring-green"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-paper transition hover:brightness-95"
          >
            Save update
          </button>
        </form>
      )}
    </div>
  );
}
