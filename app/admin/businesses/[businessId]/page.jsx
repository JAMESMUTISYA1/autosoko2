"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import OverviewTab from "./OverviewTab";
import MembersTab from "./MembersTab";
import BranchesTab from "./BranchesTab";
import ProductsTab from "./ProductsTab";
import IncomeTab from "./IncomeTab";
import VerificationTab from "./VerificationTab";
import PayoutTab from "./PayoutTab";
import SettingsTab from "./SettingsTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "branches", label: "Branches" },
  { id: "products", label: "Products" },
  { id: "income", label: "Income" },
  { id: "verification", label: "Verification" },
  { id: "payout", label: "Payout" },
  { id: "settings", label: "Settings" },
];

export default function AdminBusinessDetailPage() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const toast = useToast();

  const fetchBusiness = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/businesses/${businessId}`);
      const json = await res.json();
      if (json.success) setBusiness(json.data);
      else toast.error(json.error?.message || "Failed to load business");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  if (loading) return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;
  if (!business) return <p className="text-sm text-gray-500">Business not found.</p>;

  return (
    <div>
      <Link href="/admin/businesses" className="inline-flex items-center gap-2 text-sm text-blue-600 mb-4">
        <ArrowLeft size={16} /> All Businesses
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100" />
          )}
          <div>
            <h1 className="font-display text-2xl">{business.name}</h1>
            <p className="text-sm text-muted">
              {business.businessType.replace("_", " ")} · {business.town?.name || business.country?.name || "No location"}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
            business.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {business.status}
        </span>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab business={business} onUpdate={fetchBusiness} />}
      {activeTab === "members" && <MembersTab businessId={business.id} />}
      {activeTab === "branches" && <BranchesTab businessId={business.id} />}
      {activeTab === "products" && <ProductsTab businessId={business.id} />}
      {activeTab === "income" && <IncomeTab businessId={business.id} />}
      {activeTab === "verification" && <VerificationTab business={business} onUpdate={fetchBusiness} />}
      {activeTab === "payout" && <PayoutTab businessId={business.id} />}
      {activeTab === "settings" && <SettingsTab business={business} onUpdate={fetchBusiness} />}
    </div>
  );
}