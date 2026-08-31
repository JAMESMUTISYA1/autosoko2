"use client";

import VehicleDataManager from "@/components/vehicle-data/VehicleDataManager";

export default function AdminVehicleDataPage() {
  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Vehicle Data</h1>
      <p className="text-sm text-muted mb-6">Makes, models, generations, and trims used for product compatibility.</p>
      <VehicleDataManager apiBase="/api/v1/admin/vehicle-data" canEdit canDelete />
    </div>
  );
}