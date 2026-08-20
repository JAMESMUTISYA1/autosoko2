import Skeleton from "@/components/ui/Skeleton";
import CategorySkeleton from "@/components/skeletons/CategorySkeleton";
import ProductCardSkeleton from "@/components/skeletons/ProductCardSkeleton";

export default function HomeLoading() {
  return (
    <div>
      {/* Hero skeleton — light background, no vehicle selector */}
      <section className="bg-white relative overflow-hidden">
        {/* Optional decorative yellow block placeholder */}
        <div className="absolute top-0 right-0 w-24 h-24 md:w-40 md:h-40 bg-[#F68B1E]/20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16 md:pt-16 md:pb-24">
          <div className="max-w-2xl">
            {/* Badge */}
            <Skeleton className="h-5 w-56 bg-gray-200 rounded-full" />
            {/* Heading */}
            <Skeleton className="h-9 sm:h-11 w-64 md:w-80 bg-gray-200 mt-5" />
            <Skeleton className="h-9 sm:h-11 w-48 md:w-64 bg-gray-200 mt-2" />
            {/* Description */}
            <Skeleton className="h-4 w-full max-w-xl bg-gray-200 mt-4" />
            <Skeleton className="h-4 w-5/6 max-w-lg bg-gray-200 mt-2" />
            {/* Get Started button */}
            <div className="mt-6">
              <Skeleton className="h-12 w-36 bg-[#F68B1E]/40 rounded-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Promo banners skeleton */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 md:pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 md:h-48 bg-gray-200 rounded-lg" />
          <Skeleton className="h-40 md:h-48 bg-gray-200 rounded-lg" />
        </div>
      </section>

      {/* Featured products skeleton */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="flex items-end justify-between mb-6">
          <Skeleton className="h-7 w-48 bg-gray-200" />
          <Skeleton className="h-4 w-16 bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Trust strip skeleton */}
      <section className="border-y border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex flex-wrap items-center justify-center gap-x-6 md:gap-x-10 gap-y-1.5">
          <Skeleton className="h-4 w-56 bg-gray-200" />
          <Skeleton className="h-4 w-56 bg-gray-200" />
          <Skeleton className="h-4 w-56 bg-gray-200" />
        </div>
      </section>

      {/* Categories skeleton */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="flex items-end justify-between mb-6">
          <Skeleton className="h-7 w-40 bg-gray-200" />
          <Skeleton className="h-4 w-16 bg-gray-200" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <CategorySkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Vehicle makes skeleton */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <Skeleton className="h-7 w-52 bg-gray-200 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 sm:h-16 bg-gray-200 rounded-md" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}