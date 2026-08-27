import Link from "next/link";
import { Radar, Plus, MessageSquare, Clock, Users, TrendingUp, CheckCircle2, Zap, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";

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

// Simple summary derived from open requests (could be replaced by /summary endpoint)
function computeSummary(requests) {
  const totalOpen = requests.length;
  const totalResponses = requests.reduce((sum, r) => sum + (r.responseCount || 0), 0);
  return { totalOpen, totalResponses };
}

export default async function PartRadarPage() {
  const requests = await getOpenRequests();
  const session = await auth();
  const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent("/part-radar/new")}`;
  const summary = computeSummary(requests);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero / Header */}
      <section className="relative overflow-hidden bg-blue-600 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(246,139,30,0.3),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1 bg-yellow-400 text-blue-900 text-xs font-bold px-3 py-1 rounded-full">
                <Radar size={14} />
                LIVE · PART RADAR
              </span>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl mt-3 leading-tight">
                Broadcast Your Part Needs
              </h1>
              <p className="mt-3 text-blue-100 text-base md:text-lg max-w-xl">
                Can't find what you need in search? Post a request and let
                verified sellers, agents, and our team respond directly.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {session?.user ? (
                  <Link
                    href="/part-radar/new"
                    className="inline-flex items-center gap-2 bg-yellow-400 text-blue-900 font-semibold px-6 py-3 rounded-md hover:bg-yellow-300 transition-colors shadow-lg"
                  >
                    <Plus size={18} />
                    Post a Request
                  </Link>
                ) : (
                  <Link
                    href={loginUrl}
                    className="inline-flex items-center gap-2 bg-yellow-400 text-blue-900 font-semibold px-6 py-3 rounded-md hover:bg-yellow-300 transition-colors shadow-lg"
                  >
                    <Plus size={18} />
                    Sign in to Post a Request
                  </Link>
                )}
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 border border-white/30 bg-white/10 text-white font-semibold px-6 py-3 rounded-md hover:bg-white/20 transition-colors"
                >
                  How it Works
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                <p className="text-2xl md:text-3xl font-bold text-yellow-300">{summary.totalOpen}</p>
                <p className="text-xs md:text-sm text-blue-100">Open Requests</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                <p className="text-2xl md:text-3xl font-bold text-yellow-300">{summary.totalResponses}</p>
                <p className="text-xs md:text-sm text-blue-100">Responses</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Requests */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl md:text-3xl text-gray-900">
            Open Requests
          </h2>
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            {summary.totalOpen} active
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="border border-gray-200 rounded-md px-5 py-16 text-center bg-gray-50">
            <Radar size={28} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-500 mb-4">No open requests right now.</p>
            {session?.user ? (
              <Link href="/part-radar/new" className="text-sm text-blue-600 hover:underline">
                Be the first to post one
              </Link>
            ) : (
              <Link href={loginUrl} className="text-sm text-blue-600 hover:underline">
                Sign in to be the first to post one
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((r) => (
              <Link
                key={r.id}
                href={`/part-radar/${r.id}`}
                className="group border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all bg-white"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-1">
                    {r.partName}
                  </h3>
                  {r.responseCount > 0 && (
                    <span className="shrink-0 ml-2 inline-flex items-center gap-1 bg-green-100 text-green-800 text-[11px] font-medium px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={10} />
                      {r.responseCount}
                    </span>
                  )}
                </div>
                {r.vehicleInfo && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Users size={11} className="text-blue-500" />
                    {r.vehicleInfo}
                  </p>
                )}
                {r.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mt-2">{r.description}</p>
                )}
                <div className="flex items-center justify-between mt-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <MessageSquare size={11} />
                    Respond
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-2xl md:text-3xl text-gray-900 mb-8 text-center">
            How Part Radar Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <Zap size={22} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Post Your Request</h3>
              <p className="text-sm text-gray-600">
                Describe the part you need, your vehicle, and any urgency.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center mb-4">
                <MessageSquare size={22} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Get Responses</h3>
              <p className="text-sm text-gray-600">
                Sellers and agents reply with offers, availability, and prices.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-4">
                <ShieldCheck size={22} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Compare & Buy</h3>
              <p className="text-sm text-gray-600">
                Choose the best offer and proceed safely through AutoSoko.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-yellow-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h2 className="font-display text-2xl text-blue-900">
              Ready to find your part?
            </h2>
            <p className="text-blue-900/80 mt-1">
              Join thousands of buyers and sellers using Part Radar daily.
            </p>
          </div>
          {session?.user ? (
            <Link
              href="/part-radar/new"
              className="shrink-0 bg-blue-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Post a Request Now
            </Link>
          ) : (
            <Link
              href={loginUrl}
              className="shrink-0 bg-blue-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign in to Post a Request
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}