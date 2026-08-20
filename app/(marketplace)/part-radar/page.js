import Link from "next/link";
import { Radar, Plus, MessageSquare, Clock } from "lucide-react";
import { auth } from "@/auth"; // ✅ adjust this path to your NextAuth config

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function getOpenRequests() {
  try {
    const res = await fetch(`${getBaseUrl()}/api/v1/part-requests?status=open`, {
      cache: "no-store",
    });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (err) {
    console.warn("[part-radar] Could not load requests:", err.message);
    return [];
  }
}

export default async function PartRadarPage() {
  const requests = await getOpenRequests();
  const session = await auth(); // ✅ get session server‑side

  // URL for logging in and returning to the new request page
  const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent("/part-radar/new")}`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="font-display text-2xl flex items-center gap-2">
            <Radar size={24} />
            Part Radar
          </h1>
          <p className="text-sm text-muted mt-1 max-w-lg">
            Can't find what you need in search? Broadcast it here — sellers,
            agents, and our team can see your request and respond directly.
          </p>
        </div>

        {/* Post a Request / Sign in button */}
        {session?.user ? (
          <Link
            href="/part-radar/new"
            className="shrink-0 flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            Post a Request
          </Link>
        ) : (
          <Link
            href={loginUrl}
            className="shrink-0 flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            Sign in to post a request
          </Link>
        )}
      </div>

      <div className="mt-8">
        {requests.length === 0 ? (
          <div className="border border-line rounded-md px-5 py-16 text-center">
            <Radar size={28} className="mx-auto mb-3 text-muted" />
            <p className="text-sm text-muted mb-4">No open requests right now.</p>
            {session?.user ? (
              <Link href="/part-radar/new" className="text-sm text-accent hover:underline">
                Be the first to post one
              </Link>
            ) : (
              <Link href={loginUrl} className="text-sm text-accent hover:underline">
                Sign in to be the first to post one
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requests.map((r) => (
              <Link
                key={r.id}
                href={`/part-radar/${r.id}`}
                className="border border-line rounded-md p-4 hover:border-fg transition-colors"
              >
                <h3 className="text-sm font-medium mb-1">{r.partName}</h3>
                {r.vehicleInfo && <p className="text-xs text-muted mb-1">{r.vehicleInfo}</p>}
                {r.description && (
                  <p className="text-xs text-muted line-clamp-2 mb-3">{r.description}</p>
                )}
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={11} />
                    {r.responseCount} response{r.responseCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}