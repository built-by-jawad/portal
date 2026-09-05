import Skeleton from "@/components/Skeleton";

export default function LeadsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <div className="mb-6 border-b border-mist/30 pb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-24" />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-px overflow-hidden rounded-xl border border-mist/30">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-none bg-white/60" />
        ))}
      </div>
    </div>
  );
}
