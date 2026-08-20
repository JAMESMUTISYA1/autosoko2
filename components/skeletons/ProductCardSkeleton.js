import Skeleton from "@/components/ui/Skeleton";

export default function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-md border border-line overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="p-3.5 space-y-2.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-6 w-24 mt-2" />
        <Skeleton className="h-3 w-3/4 mt-3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
