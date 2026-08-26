export const dynamic = 'force-dynamic';
"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

function BookingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const preselectedType = searchParams.get("type") || "";
  const preselectedMechanic = searchParams.get("mechanic") || "";

  const [serviceTypeId, setServiceTypeId] = useState(preselectedType);
  const [mechanicId, setMechanicId] = useState(preselectedMechanic);
  const [locationType, setLocationType] = useState("workshop"); // workshop | home
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const serviceType = serviceTypes.find((s) => s.id === serviceTypeId);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [mechanics, setMechanics] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/services/types").then((r) => r.json()).catch(() => ({ success: false })),
      fetch("/api/v1/services/mechanics").then((r) => r.json()).catch(() => ({ success: false })),
    ]).then(([typesJson, mechJson]) => {
      setServiceTypes(typesJson.success ? typesJson.data : []);
      setMechanics(mechJson.success ? mechJson.data : []);
    });
  }, []);

  const mechanic = mechanics.find((m) => m.id === mechanicId);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!serviceTypeId && !mechanicId) return;
    if (!date || !time || !vehicle || !phone) return;
    if (locationType === "home" && !address) return;

    setSubmitting(true);
    const res = await fetch("/api/v1/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceTypeId: serviceTypeId || undefined,
        mechanicId: mechanicId || undefined,
        locationType,
        address: locationType === "home" ? address : undefined,
        scheduledFor: new Date(`${date}T${time}`).toISOString(),
        vehicleInfo: vehicle,
        phone,
        notes: notes || undefined,
      }),
    }).catch(() => null);
    setSubmitting(false);

    if (res?.status === 401) {
      router.push("/auth/login?redirectTo=/services/book");
      return;
    }
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Couldn't book the appointment. Try again.");
      return;
    }
    setConfirmed(true);
    toast.success("Appointment booked");
  }

  if (confirmed) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-4" />
        <h1 className="font-display text-xl mb-2">Appointment Confirmed</h1>
        <p className="text-sm text-muted mb-6">
          {(serviceType?.name || "Service")} on {date} at {time}
          {locationType === "home" ? " — we'll come to you" : " — at the provider's workshop"}.
          A confirmation has been sent to {phone}.
        </p>
        <button
          onClick={() => router.push("/services")}
          className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90"
        >
          Back to Services
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-1">Book an Appointment</h1>
      <p className="text-sm text-muted mb-8">
        {mechanic ? `With ${mechanic.name}` : "Choose a service and preferred time"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-line rounded-md p-5">
        {!mechanic && (
          <div>
            <label className="block text-xs text-muted mb-1.5">Service Type</label>
            <select
              value={serviceTypeId}
              onChange={(e) => setServiceTypeId(e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
            >
              <option value="">Select a service</option>
              {serviceTypes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-muted mb-1.5">Location</label>
          <div className="grid grid-cols-2 gap-2">
            <label className={`text-center border rounded-sm px-3 py-2.5 text-sm cursor-pointer ${
              locationType === "workshop" ? "border-fg bg-fg text-bg" : "border-line"
            }`}>
              <input type="radio" name="locationType" value="workshop" checked={locationType === "workshop"} onChange={() => setLocationType("workshop")} className="sr-only" />
              At Workshop
            </label>
            <label className={`text-center border rounded-sm px-3 py-2.5 text-sm cursor-pointer ${
              locationType === "home" ? "border-fg bg-fg text-bg" : "border-line"
            }`}>
              <input type="radio" name="locationType" value="home" checked={locationType === "home"} onChange={() => setLocationType("home")} className="sr-only" />
              At My Location
            </label>
          </div>
        </div>

        {locationType === "home" && (
          <div>
            <label className="block text-xs text-muted mb-1.5">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, estate, landmark"
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">Vehicle</label>
          <input
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="e.g. Toyota Corolla, 2018"
            className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254712345678"
            className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything the provider should know beforehand"
            className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold text-sm py-3 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Booking..." : "Confirm Appointment"}
        </button>
      </form>
    </div>
  );
}

export default function BookServicePage() {
  return (
    <Suspense fallback={null}>
      <BookingForm />
    </Suspense>
  );
}
