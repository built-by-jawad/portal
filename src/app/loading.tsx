import Skeleton from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6 border-b border-mist/30 pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="mt-10">
        <Skeleton className="mb-4 h-6 w-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
