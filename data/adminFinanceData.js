export const adminDocuments = [
  {
    id: "doc-1",
    name: "Q2 2026 Compliance Report.pdf",
    category: "Compliance",
    uploadedBy: "Samuel Kariuki",
    uploadedAt: "2026-07-15",
    size: "2.4 MB",
  },
  {
    id: "doc-2",
    name: "Agent Onboarding Checklist.docx",
    category: "HR",
    uploadedBy: "Samuel Kariuki",
    uploadedAt: "2026-06-02",
    size: "180 KB",
  },
  {
    id: "doc-3",
    name: "Payment Provider Agreement — M-Pesa.pdf",
    category: "Legal",
    uploadedBy: "Wanjiru Kamau",
    uploadedAt: "2026-05-20",
    size: "1.1 MB",
  },
  {
    id: "doc-4",
    name: "Business Verification SOP v3.pdf",
    category: "Operations",
    uploadedBy: "Wanjiru Kamau",
    uploadedAt: "2026-08-01",
    size: "640 KB",
  },
];

export const DOCUMENT_CATEGORIES = ["Compliance", "HR", "Legal", "Operations", "Finance"];

export const monthlyRevenue = [
  { month: "Mar", revenueMinor: 82000000 },
  { month: "Apr", revenueMinor: 95000000 },
  { month: "May", revenueMinor: 88000000 },
  { month: "Jun", revenueMinor: 121000000 },
  { month: "Jul", revenueMinor: 143000000 },
  { month: "Aug", revenueMinor: 97000000 },
];

export const revenueByCountry = [
  { country: "Kenya", revenueMinor: 312000000, share: 0.58 },
  { country: "Uganda", revenueMinor: 98000000, share: 0.18 },
  { country: "Tanzania", revenueMinor: 71000000, share: 0.13 },
  { country: "Rwanda", revenueMinor: 59000000, share: 0.11 },
];

export const financeSummary = {
  totalRevenueMinor: 626000000,
  platformFeesMinor: 31300000,
  totalPayoutsMinor: 594700000,
  avgOrderValueMinor: 68500,
  totalOrders: 9140,
};
