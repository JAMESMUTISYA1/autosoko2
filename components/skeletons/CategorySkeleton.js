import Skeleton from "@/components/ui/Skeleton";

export default function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-2.5 bg-card border border-line rounded-md py-5 px-2">
      <Skeleton className="w-11 h-11 rounded-full" />
      <Skeleton className="h-3 w-14" />
    </div>
  );
}
