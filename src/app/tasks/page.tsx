import PageHeader from "@/components/PageHeader";
import TaskViewTabs from "@/components/TaskViewTabs";
import TaskImportExportBar from "@/components/TaskImportExportBar";
import TaskCard from "@/components/TaskCard";
import CalendarGrid, { type CalendarGridItem } from "@/components/CalendarGrid";
import { prisma } from "@/lib/prisma";
import { todayInTimeZone, isInView, type CalendarView } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view: CalendarView | "done" =
    rawView === "week" || rawView === "month" || rawView === "done" ? rawView : "today";

  const pakistanToday = todayInTimeZone(PAKISTAN_TZ);

  if (view === "done") {
    const doneTasks = await prisma.task.findMany({
      where: { completedAt: { not: null } },
      include: { lead: { select: { businessName: true } } },
      orderBy: { completedAt: "desc" },
    });

    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <PageHeader
          title="Tasks"
          description={`${doneTasks.length} completed task${doneTasks.length === 1 ? "" : "s"}.`}
          action={<TaskImportExportBar />}
        />
        <TaskViewTabs current={view} />

        {doneTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
            Nothing marked done yet.
          </div>
        ) : (
          <div className="space-y-4">
            {doneTasks.map((t) => (
              <TaskCard
                key={t.id}
                id={t.id}
                title={t.title}
                description={t.description}
                leadId={t.leadId}
                leadBusinessName={t.lead?.businessName ?? null}
                dueDate={t.dueDate}
                dueTime={t.dueTime}
                completedAt={t.completedAt}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const openTasks = await prisma.task.findMany({
    where: { completedAt: null },
    include: { lead: { select: { businessName: true } } },
    orderBy: [{ dueDate: "asc" }, { dueTime: "asc" }],
  });

  if (view === "week" || view === "month") {
    const withDates = openTasks.filter((t) => t.dueDate);
    const gridItems: CalendarGridItem[] = withDates.map((t) => ({
      id: t.id,
      date: t.dueDate!,
      sortKey: t.dueTime ? Number(t.dueTime.replace(":", "")) : 0,
      title: t.title,
      subtitle: t.lead?.businessName,
      href: "/tasks?view=today",
      accent: "ink",
    }));
    const viewCount = withDates.filter((t) => isInView(t.dueDate!, pakistanToday, view)).length;

    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
        <PageHeader
          title="Tasks"
          description={`${viewCount} task${viewCount === 1 ? "" : "s"} due ${view === "week" ? "this week" : "this month"}.`}
          action={<TaskImportExportBar />}
        />
        <TaskViewTabs current={view} />
        <CalendarGrid view={view} todayStr={pakistanToday} items={gridItems} />
        <p className="mt-3 text-xs text-slate">Tasks with no due date aren&apos;t shown on the calendar — see Today.</p>
      </div>
    );
  }

  const todaysTasks = openTasks.filter((t) => t.dueDate === pakistanToday);
  const noDueDateTasks = openTasks.filter((t) => !t.dueDate);
  const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < pakistanToday);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Tasks" description={`${todaysTasks.length} due today.`} action={<TaskImportExportBar />} />
      <TaskViewTabs current="today" />

      {overdueTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display mb-3 text-sm font-bold text-red-600">Overdue</h2>
          <div className="space-y-4">
            {overdueTasks.map((t) => (
              <TaskCard
                key={t.id}
                id={t.id}
                title={t.title}
                description={t.description}
                leadId={t.leadId}
                leadBusinessName={t.lead?.businessName ?? null}
                dueDate={t.dueDate}
                dueTime={t.dueTime}
                completedAt={t.completedAt}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="font-display mb-3 text-sm font-bold text-ink">Today</h2>
        {todaysTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
            Nothing due today.
          </div>
        ) : (
          <div className="space-y-4">
            {todaysTasks.map((t) => (
              <TaskCard
                key={t.id}
                id={t.id}
                title={t.title}
                description={t.description}
                leadId={t.leadId}
                leadBusinessName={t.lead?.businessName ?? null}
                dueDate={t.dueDate}
                dueTime={t.dueTime}
                completedAt={t.completedAt}
              />
            ))}
          </div>
        )}
      </div>

      {noDueDateTasks.length > 0 && (
        <div>
          <h2 className="font-display mb-3 text-sm font-bold text-ink">No due date</h2>
          <div className="space-y-4">
            {noDueDateTasks.map((t) => (
              <TaskCard
                key={t.id}
                id={t.id}
                title={t.title}
                description={t.description}
                leadId={t.leadId}
                leadBusinessName={t.lead?.businessName ?? null}
                dueDate={t.dueDate}
                dueTime={t.dueTime}
                completedAt={t.completedAt}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
