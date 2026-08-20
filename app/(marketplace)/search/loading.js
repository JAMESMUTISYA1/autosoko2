import Skeleton from "@/components/ui/Skeleton";
import ProductCardSkeleton from "@/components/skeletons/ProductCardSkeleton";

export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Skeleton className="h-3 w-28 mb-2" />
      <Skeleton className="h-7 w-64 mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
        <aside className="space-y-7">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
          ))}
        </aside>

        <div>
          <div className="flex justify-end mb-4">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
