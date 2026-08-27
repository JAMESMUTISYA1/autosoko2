export const dynamic = 'force-dynamic';

import Link from "next/link";
import * as Icons from "lucide-react";
import { BadgeCheck, MapPin, Star, Home as HomeIcon, Wrench, Calendar } from "lucide-react";
import { formatPrice } from "@/data/sampleData";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function loadServicesData() {
  try {
    const [typesRes, mechanicsRes] = await Promise.all([
      fetch(`${getBaseUrl()}/api/v1/services/types`, { cache: "no-store" }),
      fetch(`${getBaseUrl()}/api/v1/services/mechanics`, { cache: "no-store" }),
    ]);
    const [typesJson, mechanicsJson] = await Promise.all([typesRes.json(), mechanicsRes.json()]);
    return {
      serviceTypes: typesJson.success ? typesJson.data : [],
      mechanics: mechanicsJson.success ? mechanicsJson.data : [],
    };
  } catch (err) {
    console.warn("[services] Could not load:", err.message);
    return { serviceTypes: [], mechanics: [] };
  }
}

const ICON_MAP = {
  alignment: "GitCommitHorizontal",
  "general-service": "Wrench",
  "mobile-mechanic": "Truck",
  diagnostics: "Activity",
};

export default async function ServicesPage() {
  const { serviceTypes, mechanics } = await loadServicesData();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <span className="inline-flex items-center gap-1 bg-yellow-400 text-blue-900 text-xs font-bold px-3 py-1 rounded-full">
            <Wrench size={14} />
            AUTO SERVICES
          </span>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl mt-3 leading-tight">
            Vehicle Services & Mechanics
          </h1>
          <p className="mt-3 text-blue-100 text-base md:text-lg max-w-xl">
            Book alignment, servicing, and diagnostics with vetted providers —
            at their workshop or at your home.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Service Types */}
        <h2 className="font-display text-2xl text-gray-900 mb-6">Book a Service</h2>
        {serviceTypes.length === 0 ? (
          <div className="border border-dashed border-gray-300 bg-gray-50 rounded-lg p-10 text-center mb-14">
            <Wrench size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No service types configured yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            {serviceTypes.map((s) => {
              const Icon = Icons[ICON_MAP[s.slug]] || Icons.Wrench;
              return (
                <div
                  key={s.id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 flex flex-col hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{s.name}</h3>
                  <p className="text-sm text-gray-600 flex-1">{s.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-500">
                      From <span className="font-mono text-gray-900">{formatPrice(s.priceFromMinor, "KES")}</span>
                    </span>
                    <Link
                      href={`/services/book?type=${s.id}`}
                      className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 text-sm font-semibold px-4 py-2 rounded-md transition-colors"
                    >
                      Book
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mechanics Directory */}
        <h2 className="font-display text-2xl text-gray-900 mb-6">Find a Mechanic</h2>
        {mechanics.length === 0 ? (
          <div className="border border-dashed border-gray-300 bg-gray-50 rounded-lg p-10 text-center">
            <Wrench size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No mechanics listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mechanics.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{m.name}</h3>
                  {m.verified && <BadgeCheck size={14} className="text-blue-500" />}
                </div>
                <p className="text-xs text-gray-500 mt-1">{(m.specialties || []).join(" · ")}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Star size={11} className="fill-yellow-400 text-yellow-400" />
                    {m.ratingAvg} ({m.ratingCount})
                  </span>
                  {m.town?.name && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {m.town.name}
                    </span>
                  )}
                </div>
                {m.mobileAvailable && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-500 mt-1.5">
                    <HomeIcon size={11} /> Available for home visits
                  </span>
                )}
                <Link
                  href={`/services/book?mechanic=${m.id}`}
                  className="block text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-md mt-4 transition-colors"
                >
                  Book
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}