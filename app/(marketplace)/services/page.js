export const dynamic = 'force-dynamic';
import Link from "next/link";
import * as Icons from "lucide-react";
import { BadgeCheck, MapPin, Star, Home as HomeIcon } from "lucide-react";
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

const ICON_MAP = { alignment: "GitCommitHorizontal", "general-service": "Wrench", "mobile-mechanic": "Truck", diagnostics: "Activity" };

export default async function ServicesPage() {
  const { serviceTypes, mechanics } = await loadServicesData();

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-1">Services</h1>
      <p className="text-sm text-muted mb-8 max-w-xl">
        Book alignment, servicing, and diagnostics with vetted providers — at their workshop or at your home.
      </p>

      {serviceTypes.length === 0 ? (
        <p className="text-sm text-muted mb-14">No service types configured yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {serviceTypes.map((s) => {
            const Icon = Icons[ICON_MAP[s.slug]] || Icons.Wrench;
            return (
              <div key={s.id} className="border border-line rounded-md p-5 flex flex-col">
                <div className="w-10 h-10 rounded-full bg-bg flex items-center justify-center mb-3">
                  <Icon size={18} />
                </div>
                <h2 className="font-display text-base mb-1">{s.name}</h2>
                <p className="text-sm text-muted flex-1">{s.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted">
                    From <span className="font-mono text-fg">{formatPrice(s.priceFromMinor, "KES")}</span>
                  </span>
                  <Link href={`/services/book?type=${s.id}`} className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors">
                    Book Appointment
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="font-display text-xl mb-1">Find a Mechanic</h2>
      <p className="text-sm text-muted mb-6">Browse vetted mechanics and garages near you.</p>

      {mechanics.length === 0 ? (
        <p className="text-sm text-muted">No mechanics listed yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mechanics.map((m) => (
            <div key={m.id} className="border border-line rounded-md p-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium">{m.name}</h3>
                {m.verified && <BadgeCheck size={13} className="text-fg shrink-0" />}
              </div>
              <p className="text-xs text-muted mt-1">{(m.specialties || []).join(" · ")}</p>
              <div className="flex items-center gap-3 text-xs text-muted mt-2">
                <span className="flex items-center gap-1"><Star size={11} className="fill-fg text-fg" />{m.ratingAvg} ({m.ratingCount})</span>
                {m.town?.name && <span className="flex items-center gap-1"><MapPin size={11} />{m.town.name}</span>}
              </div>
              {m.mobileAvailable && (
                <span className="flex items-center gap-1 text-[11px] text-muted mt-1.5"><HomeIcon size={11} /> Available for home visits</span>
              )}
              <Link href={`/services/book?mechanic=${m.id}`} className="block text-center border border-fg text-sm font-medium py-2 rounded-sm mt-3 hover:bg-fg hover:text-bg transition-colors">
                Book
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
