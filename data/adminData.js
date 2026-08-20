// Placeholder data for the internal admin/agent tools. Shaped to extend
// Document 2's schema: an "agent" here is a Platform Staff user (scope:
// platform) whose role additionally carries an assignedCity/assignedCountry
// — a city-scoped Ops Agent, handling business verification and delivery
// tracking for their region. Real data comes from /api/v1/admin/* once
// the backend exists (Document 3, §11) — this mirrors those shapes.

export const cities = [
  { id: "nairobi", name: "Nairobi", country: "Kenya" },
  { id: "mombasa", name: "Mombasa", country: "Kenya" },
  { id: "kisumu", name: "Kisumu", country: "Kenya" },
  { id: "kampala", name: "Kampala", country: "Uganda" },
  { id: "dar-es-salaam", name: "Dar es Salaam", country: "Tanzania" },
  { id: "arusha", name: "Arusha", country: "Tanzania" },
  { id: "kigali", name: "Kigali", country: "Rwanda" },
];

export const agents = [
  {
    id: "ag-1",
    name: "Grace Muthoni",
    email: "grace.muthoni@autosoko.africa",
    phone: "+254712000111",
    cityId: "nairobi",
    status: "active",
    createdAt: "2026-03-14",
    stats: { verificationsCompleted: 142, ordersHandled: 389 },
  },
  {
    id: "ag-2",
    name: "Brian Otieno",
    email: "brian.otieno@autosoko.africa",
    phone: "+254712000222",
    cityId: "mombasa",
    status: "active",
    createdAt: "2026-04-02",
    stats: { verificationsCompleted: 67, ordersHandled: 201 },
  },
  {
    id: "ag-3",
    name: "Immaculate Nabirye",
    email: "immaculate.n@autosoko.africa",
    phone: "+256700111222",
    cityId: "kampala",
    status: "active",
    createdAt: "2026-05-20",
    stats: { verificationsCompleted: 54, ordersHandled: 176 },
  },
  {
    id: "ag-4",
    name: "Daniel Mwakalinga",
    email: "daniel.mwakalinga@autosoko.africa",
    phone: "+255712000333",
    cityId: "dar-es-salaam",
    status: "suspended",
    createdAt: "2026-02-11",
    stats: { verificationsCompleted: 88, ordersHandled: 240 },
  },
  {
    id: "ag-5",
    name: "Aline Uwimana",
    email: "aline.uwimana@autosoko.africa",
    phone: "+250780111222",
    cityId: "kigali",
    status: "active",
    createdAt: "2026-06-01",
    stats: { verificationsCompleted: 31, ordersHandled: 98 },
  },
];

export const pendingVerifications = [
  {
    id: "biz-201",
    name: "Westlands Auto Traders",
    type: "Wholesaler",
    cityId: "nairobi",
    submittedAt: "2026-08-06",
    documents: ["Business Permit", "Tax Certificate"],
  },
  {
    id: "biz-202",
    name: "Ngong Road Garage Supplies",
    type: "Garage",
    cityId: "nairobi",
    submittedAt: "2026-08-07",
    documents: ["Business Permit"],
  },
  {
    id: "biz-203",
    name: "Coastal Motor Imports",
    type: "Importer",
    cityId: "mombasa",
    submittedAt: "2026-08-05",
    documents: ["Registration Certificate", "Tax Certificate", "Import License"],
  },
  {
    id: "biz-204",
    name: "Kampala Central Spares",
    type: "Dealer",
    cityId: "kampala",
    submittedAt: "2026-08-08",
    documents: ["Business Permit", "Tax Certificate"],
  },
];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

export const agentOrders = [
  {
    id: "ord-9001",
    orderNumber: "AS-9001",
    buyerName: "James K.",
    businessName: "Nairobi Auto Spares",
    cityId: "nairobi",
    status: "processing",
    totalMinor: 350000,
    currency: "KES",
    placedAt: "2026-08-08",
    paymentVerified: true,
    paymentVerifiedBy: "Grace Muthoni",
    paymentVerifiedAt: "2026-08-08 10:12",
    deliveredConfirmed: false,
    deliveredConfirmedBy: null,
    deliveredConfirmedAt: null,
  },
  {
    id: "ord-9002",
    orderNumber: "AS-9002",
    buyerName: "Peter M.",
    businessName: "Thika Road Auto Hub",
    cityId: "nairobi",
    status: "confirmed",
    totalMinor: 620000,
    currency: "KES",
    placedAt: "2026-08-08",
    paymentVerified: false,
    paymentVerifiedBy: null,
    paymentVerifiedAt: null,
    deliveredConfirmed: false,
    deliveredConfirmedBy: null,
    deliveredConfirmedAt: null,
  },
  {
    id: "ord-9003",
    orderNumber: "AS-9003",
    buyerName: "Fatuma A.",
    businessName: "Mombasa Parts Junction",
    cityId: "mombasa",
    status: "shipped",
    totalMinor: 1850000,
    currency: "KES",
    placedAt: "2026-08-07",
    paymentVerified: true,
    paymentVerifiedBy: "Brian Otieno",
    paymentVerifiedAt: "2026-08-07 09:30",
    deliveredConfirmed: false,
    deliveredConfirmedBy: null,
    deliveredConfirmedAt: null,
  },
  {
    id: "ord-9004",
    orderNumber: "AS-9004",
    buyerName: "Ronald K.",
    businessName: "Kampala Auto Traders",
    cityId: "kampala",
    status: "pending",
    totalMinor: 980000,
    currency: "UGX",
    placedAt: "2026-08-09",
    paymentVerified: false,
    paymentVerifiedBy: null,
    paymentVerifiedAt: null,
    deliveredConfirmed: false,
    deliveredConfirmedBy: null,
    deliveredConfirmedAt: null,
  },
  {
    id: "ord-9005",
    orderNumber: "AS-8991",
    buyerName: "Susan W.",
    businessName: "Nairobi Auto Spares",
    cityId: "nairobi",
    status: "delivered",
    totalMinor: 1450000,
    currency: "KES",
    placedAt: "2026-08-01",
    paymentVerified: true,
    paymentVerifiedBy: "Grace Muthoni",
    paymentVerifiedAt: "2026-08-01 08:40",
    deliveredConfirmed: true,
    deliveredConfirmedBy: "Grace Muthoni",
    deliveredConfirmedAt: "2026-08-03 15:10",
  },
];

export function cityName(cityId) {
  const c = cities.find((c) => c.id === cityId);
  return c ? `${c.name}, ${c.country}` : "Unknown";
}

// Stands in for "the currently signed-in admin" until real auth exists —
// same pattern as CURRENT_AGENT in the agent pages.
export const CURRENT_ADMIN = {
  name: "Samuel Kariuki",
  email: "samuel.kariuki@autosoko.africa",
  phone: "+254712000001",
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAgents() {
  await delay(400);
  return agents;
}

export async function getPendingVerifications(cityId) {
  await delay(400);
  return cityId ? pendingVerifications.filter((v) => v.cityId === cityId) : pendingVerifications;
}

export async function getAgentOrders(cityId) {
  await delay(400);
  return cityId ? agentOrders.filter((o) => o.cityId === cityId) : agentOrders;
}
