"use client";

import VehicleDataManager from "@/components/vehicle-data/VehicleDataManager";

export default function SellerVehicleDataPage() {
  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Vehicle Data</h1>
      <p className="text-sm text-muted mb-6">
        Browse makes, models, generations, and trims, and add any that are missing for your listings.
        Editing and deleting existing entries is admin-only, to keep this data consistent across all sellers.
      </p>
      <VehicleDataManager apiBase="/api/v1/seller/vehicle-data" canEdit={false} canDelete={false} />
    </div>
  );
}