"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DeliveryMethodsList from "@/components/dashboard/DeliveryMethodsList";

export default function AdminDeliveryPage() {
  const { data: session } = useSession();
  const [methods, setMethods] = useState([]);
  const [towns, setTowns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/admin/delivery-methods").then((r) => r.json()),
      fetch("/api/v1/towns").then((r) => r.json()).catch(() => ({ success: false })),
    ]).then(([methodsJson, townsJson]) => {
      setMethods(methodsJson.success ? methodsJson.data : []);
      setTowns(townsJson.success ? townsJson.data : []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Delivery Methods</h1>
      <p className="text-sm text-muted mb-8">Platform-wide delivery options across every town.</p>
      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <DeliveryMethodsList initialMethods={methods} towns={towns} currentActorName={session?.user?.name || "Admin"} />
      )}
    </div>
  );
}
