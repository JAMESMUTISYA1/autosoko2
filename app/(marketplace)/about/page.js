export const dynamic = 'force-dynamic';
import { ShieldCheck, Users, MapPin, Package } from "lucide-react";

const STATS = [
  { icon: Users, value: "250,000+", label: "Sellers & counting" },
  { icon: Package, value: "1M+", label: "Parts listed" },
  { icon: MapPin, value: "6", label: "Countries served" },
  { icon: ShieldCheck, value: "100%", label: "In-platform messaging & payments" },
];

const VALUES = [
  {
    title: "Trust by default",
    body: "Verified seller badges, agent-reviewed businesses, and in-platform messaging mean you never have to take a stranger's word for it.",
  },
  {
    title: "Built for East Africa",
    body: "M-Pesa, Airtel Money, and MTN MoMo from day one — not bolted on. Local currencies, local languages, local delivery realities.",
  },
  {
    title: "Everyone can sell",
    body: "A registered importer and a mechanic clearing out spare parts from their garage get the same tools, the same reach, the same trust badge path.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <section className="bg-invert text-invert-fg">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="font-display text-3xl md:text-4xl mb-4">
            Built to be East Africa's largest auto parts marketplace
          </h1>
          <p className="text-invert-muted max-w-xl mx-auto">
            AutoSoko connects garages, dealers, importers, and individual
            sellers with the drivers and mechanics who need parts — fast,
            verified, and without the guesswork.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="border border-line rounded-md p-5 text-center">
              <s.icon size={20} className="mx-auto mb-2 text-accent" />
              <p className="font-display text-xl">{s.value}</p>
              <p className="text-xs text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border-y border-line">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="font-display text-2xl mb-8">What We Believe</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {VALUES.map((v) => (
              <div key={v.title}>
                <h3 className="font-display text-base mb-2">{v.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-14 text-center">
        <h2 className="font-display text-2xl mb-3">Our Story</h2>
        <p className="text-sm text-muted leading-relaxed">
          AutoSoko started with a simple frustration: finding the right part
          for the right car, from someone you can actually trust, shouldn't
          mean driving across town to three different shops. We built a
          marketplace where vehicle compatibility is checked before you buy,
          sellers earn their verification badge, and every conversation and
          payment stays protected on the platform — for garages sourcing in
          bulk and for someone selling a spare battery from their driveway,
          equally.
        </p>
      </section>
    </div>
  );
}
