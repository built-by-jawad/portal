import PageHeader from "@/components/PageHeader";
import TaskViewTabs from "@/components/TaskViewTabs";
import TaskImportExportBar from "@/components/TaskImportExportBar";
import TaskListSection from "@/components/TaskListSection";
import TaskCalendar from "@/components/TaskCalendar";
import { type CalendarGridItem } from "@/components/CalendarGrid";
import { prisma } from "@/lib/prisma";
import { todayInTimeZone, addDays, isInView, type CalendarView } from "@/lib/scheduling";
import { getCurrentProfile } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAKISTAN_TZ = "Asia/Karachi";

function toRow<
  T extends {
    id: string;
    title: string;
    description: string | null;
    leadId: string | null;
    dueDate: string | null;
    dueTime: string | null;
    completedAt: Date | null;
    assignedToIds: string[];
    lead?: { businessName: string } | null;
  },
>(t: T, profileNames: Map<string, string>) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    leadId: t.leadId,
    leadBusinessName: t.lead?.businessName ?? null,
    dueDate: t.dueDate,
    dueTime: t.dueTime,
    completedAt: t.completedAt,
    assignedToNames: t.assignedToIds.map((id) => profileNames.get(id)).filter((n): n is string => !!n),
  };
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view: CalendarView | "done" | "overdue" | "tomorrow" =
    rawView === "week" || rawView === "month" || rawView === "done" || rawView === "today" || rawView === "tomorrow"
      ? rawView
      : "overdue";

  const pakistanToday = todayInTimeZone(PAKISTAN_TZ);
  const pakistanTomorrow = addDays(pakistanToday, 1);
  const profile = await getCurrentProfile();
  const allProfiles = await prisma.profile.findMany({ select: { id: true, name: true } });
  const profileNames = new Map(allProfiles.map((p) => [p.id, p.name]));

  // Admins see every task; everyone else only sees tasks they're specifically assigned to, plus
  // whatever they personally added.
  const visibilityFilter: Prisma.TaskWhereInput =
    profile && !profile.isAdmin
      ? { OR: [{ createdById: profile.id }, { assignedToIds: { has: profile.id } }] }
      : {};

  const doneTasksPromise =
    view === "done"
      ? prisma.task.findMany({
          where: { completedAt: { not: null }, ...visibilityFilter },
          relationLoadStrategy: "join",
          include: { lead: { select: { businessName: true } } },
          orderBy: { completedAt: "desc" },
        })
      : null;
  const openTasks = await prisma.task.findMany({
    where: { completedAt: null, ...visibilityFilter },
    relationLoadStrategy: "join",
    include: { lead: { select: { businessName: true } } },
    orderBy: { dueDate: "asc" },
  });
  const overdueCount = openTasks.filter((t) => t.dueDate && t.dueDate < pakistanToday).length;

  if (view === "done") {
    const doneTasks = await doneTasksPromise!;

    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <PageHeader
          title="Tasks"
          description={`${doneTasks.length} completed task${doneTasks.length === 1 ? "" : "s"}.`}
          action={<TaskImportExportBar />}
        />
        <TaskViewTabs current={view} overdueCount={overdueCount} />

        {doneTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
            Nothing marked done yet.
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate">
              Select tasks below to mark, delete, or log them as client updates in bulk — select just one to act on it alone.
            </p>
            <TaskListSection tasks={doneTasks.map((t) => toRow(t, profileNames))} showAddToUpdate />
          </>
        )}
      </div>
    );
  }

  if (view === "overdue") {
    const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < pakistanToday);

    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <PageHeader
          title="Tasks"
          description={`${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}.`}
          action={<TaskImportExportBar />}
        />
        <TaskViewTabs current={view} overdueCount={overdueCount} />

        {overdueTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
            Nothing overdue. 🎉
          </div>
        ) : (
          <TaskListSection tasks={overdueTasks.map((t) => toRow(t, profileNames))} overdue />
        )}
      </div>
    );
  }

  if (view === "tomorrow") {
    const tomorrowTasks = openTasks.filter((t) => t.dueDate === pakistanTomorrow);

    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <PageHeader
          title="Tasks"
          description={`${tomorrowTasks.length} due tomorrow.`}
          action={<TaskImportExportBar />}
        />
        <TaskViewTabs current={view} overdueCount={overdueCount} />

        {tomorrowTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
            Nothing due tomorrow.
          </div>
        ) : (
          <TaskListSection tasks={tomorrowTasks.map((t) => toRow(t, profileNames))} />
        )}
      </div>
    );
  }

  if (view === "week" || view === "month") {
    const withDates = openTasks.filter((t) => t.dueDate);
    const gridItems: CalendarGridItem[] = withDates.map((t) => ({
      id: t.id,
      date: t.dueDate!,
      sortKey: 0,
      title: t.title,
      subtitle: t.lead?.businessName,
      href: "/tasks?view=today",
      accent: t.dueDate! < pakistanToday ? "red" : "ink",
    }));
    const viewCount = withDates.filter((t) => isInView(t.dueDate!, pakistanToday, view)).length;

    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
        <PageHeader
          title="Tasks"
          description={`${viewCount} task${viewCount === 1 ? "" : "s"} due ${view === "week" ? "this week" : "this month"}.`}
          action={<TaskImportExportBar />}
        />
        <TaskViewTabs current={view} overdueCount={overdueCount} />
        <TaskCalendar view={view} todayStr={pakistanToday} items={gridItems} />
        <p className="mt-3 text-xs text-slate">Tasks with no due date aren&apos;t shown on the calendar — see Today.</p>
      </div>
    );
  }

  const todaysTasks = openTasks.filter((t) => t.dueDate === pakistanToday);
  const noDueDateTasks = openTasks.filter((t) => !t.dueDate);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <PageHeader title="Tasks" description={`${todaysTasks.length} due today.`} action={<TaskImportExportBar />} />
      <TaskViewTabs current={view} overdueCount={overdueCount} />

      <div className="mb-8">
        {todaysTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-mist/50 p-8 text-center text-sm text-slate">
            Nothing due today.
          </div>
        ) : (
          <TaskListSection tasks={todaysTasks.map((t) => toRow(t, profileNames))} />
        )}
      </div>

      {noDueDateTasks.length > 0 && (
        <div>
          <h2 className="font-display mb-3 text-sm font-bold text-ink">No due date</h2>
          <TaskListSection tasks={noDueDateTasks.map((t) => toRow(t, profileNames))} />
        </div>
      )}
    </div>
  );
}
