import { stores } from "@/data/sampleData";
import { agents, cityName } from "@/data/adminData";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Suspension state + who-did-it tracking, layered on top of the existing
// stores/agents arrays rather than duplicating them — this is the single
// place account status changes happen, so Overview/Agents/Accounts pages
// never show conflicting state.
const suspensionState = {
  // storeId/agentId -> { suspended, reason, actionedBy, actionedAt }
};

export async function getAllAccounts() {
  await delay(350);

  const sellerAccounts = stores.map((s) => ({
    id: s.id,
    type: "seller",
    name: s.name,
    subtitle: s.sellerType === "individual" ? "Individual Seller" : "Business",
    location: s.location,
    verified: s.verified,
    suspended: suspensionState[s.id]?.suspended || false,
    suspendedReason: suspensionState[s.id]?.reason || null,
    suspendedBy: suspensionState[s.id]?.actionedBy || null,
    suspendedAt: suspensionState[s.id]?.actionedAt || null,
  }));

  const agentAccounts = agents.map((a) => ({
    id: a.id,
    type: "agent",
    name: a.name,
    subtitle: `Agent — ${cityName(a.cityId)}`,
    location: cityName(a.cityId),
    verified: true,
    suspended: suspensionState[a.id]?.suspended ?? a.status === "suspended",
    suspendedReason: suspensionState[a.id]?.reason || null,
    suspendedBy: suspensionState[a.id]?.actionedBy || null,
    suspendedAt: suspensionState[a.id]?.actionedAt || null,
  }));

  return [...sellerAccounts, ...agentAccounts];
}
