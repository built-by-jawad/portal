import TaskImportButton from "@/components/TaskImportButton";

export default function TaskImportExportBar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TaskImportButton />
      <a
        href="/api/tasks/export"
        className="rounded-lg border border-mist/40 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-mist/10"
      >
        Export CSV
      </a>
    </div>
  );
}
