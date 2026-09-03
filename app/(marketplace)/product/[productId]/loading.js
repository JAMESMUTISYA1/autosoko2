import Skeleton from "@/components/ui/Skeleton";

export default function ProductLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Skeleton className="h-3 w-72 mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10">
        <div>
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="grid grid-cols-5 gap-2 mt-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
          <div className="mt-10 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-line rounded-md p-5 space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-11 w-full mt-2" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="border border-line rounded-md p-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
