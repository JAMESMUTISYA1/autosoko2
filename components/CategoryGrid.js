import Link from "next/link";
import Image from "next/image";
import * as Icons from "lucide-react";

export default function CategoryGrid({ categories }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {categories.map((cat) => {
        const Icon = Icons[cat.icon] || Icons.Wrench;
        const hasIconUrl = Boolean(cat.iconUrl);

        return (
          <Link
            key={cat.id}
            href={`/search?category=${cat.id}`}
            className="group flex flex-col items-center gap-2.5 bg-card border border-line rounded-md py-5 px-2 hover:border-fg hover:shadow-md hover:shadow-black/5 transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-bg flex items-center justify-center group-hover:bg-fg/10 transition-colors">
              {hasIconUrl ? (
                <Image
                  src={cat.iconUrl}
                  alt={cat.name}
                  width={28}
                  height={28}
                  className="object-contain"
                />
              ) : (
                <Icon size={28} className="text-fg" />
              )}
            </div>
            <span className="text-xs text-fg text-center font-medium leading-tight">
              {cat.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}