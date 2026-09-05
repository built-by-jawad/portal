import Skeleton from "@/components/Skeleton";

export default function LeadDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
      <Skeleton className="mb-6 h-4 w-20" />
      <div className="mb-6 border-b border-mist/30 pb-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-32" />
      </div>
      <Skeleton className="mb-4 h-6 w-24" />
      <Skeleton className="mb-10 h-72" />
      <Skeleton className="mb-4 h-6 w-40" />
      <Skeleton className="h-96" />
    </div>
  );
}
