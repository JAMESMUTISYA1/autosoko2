// Services is a distinct product surface from the parts marketplace —
// booking a time slot with a provider rather than buying a physical
// item. Extends Document 1's user types (Garages, Mechanics) with a
// bookable-appointment model. Real backend would need new tables
// (service_providers, appointments, availability_slots) not yet in
// Document 2 — worth adding as a follow-up schema doc section.

export const SERVICE_TYPES = [
  {
    id: "alignment",
    name: "Wheel Alignment",
    description: "Precision alignment to fix pulling, uneven tyre wear, and steering drift.",
    icon: "GitCommitHorizontal",
    location: "workshop", // workshop | home | both
    priceFrom: 250000,
  },
  {
    id: "general-service",
    name: "General Service",
    description: "Oil change, filters, fluid top-ups, and a full multi-point inspection.",
    icon: "Wrench",
    location: "both",
    priceFrom: 450000,
  },
  {
    id: "mobile-mechanic",
    name: "Mobile Mechanic",
    description: "A qualified mechanic comes to your home or office for diagnostics and repairs.",
    icon: "Truck",
    location: "home",
    priceFrom: 150000,
  },
  {
    id: "diagnostics",
    name: "Full Diagnostic Scan",
    description: "Computerized scan to identify check-engine lights and hidden faults.",
    icon: "Activity",
    location: "both",
    priceFrom: 200000,
  },
];

export const mechanics = [
  {
    id: "mech-1",
    name: "Peter's Auto Clinic",
    specialties: ["General Service", "Diagnostics"],
    rating: 4.9,
    ratingCount: 214,
    location: "Nairobi, Kenya",
    verified: true,
    mobileAvailable: true,
  },
  {
    id: "mech-2",
    name: "Ken Auto Care",
    specialties: ["Alignment", "Suspension"],
    rating: 4.7,
    ratingCount: 132,
    location: "Nairobi, Kenya",
    verified: true,
    mobileAvailable: false,
  },
  {
    id: "mech-3",
    name: "QuickFix Mobile Mechanics",
    specialties: ["Mobile Mechanic", "General Service"],
    rating: 4.6,
    ratingCount: 88,
    location: "Mombasa, Kenya",
    verified: false,
    mobileAvailable: true,
  },
  {
    id: "mech-4",
    name: "Kampala Motor Works",
    specialties: ["Diagnostics", "General Service"],
    rating: 4.8,
    ratingCount: 176,
    location: "Kampala, Uganda",
    verified: true,
    mobileAvailable: true,
  },
];

export function getServiceType(id) {
  return SERVICE_TYPES.find((s) => s.id === id) || null;
}
