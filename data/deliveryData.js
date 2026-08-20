function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const DELIVERY_METHOD_TYPES = ["Courier", "Boda-boda", "Pickup Point", "Same-Day Express"];

export const deliveryMethods = [
  {
    id: "dm-1",
    townId: "nairobi",
    method: "Courier",
    provider: "Sendy",
    etaDays: 2,
    feeMinor: 30000,
    active: true,
    addedBy: "Samuel Kariuki",
  },
  {
    id: "dm-2",
    townId: "nairobi",
    method: "Boda-boda",
    provider: "In-house riders",
    etaDays: 1,
    feeMinor: 15000,
    active: true,
    addedBy: "Grace Muthoni",
  },
  {
    id: "dm-3",
    townId: "mombasa",
    method: "Courier",
    provider: "G4S",
    etaDays: 3,
    feeMinor: 35000,
    active: true,
    addedBy: "Brian Otieno",
  },
  {
    id: "dm-4",
    townId: "kampala",
    method: "Pickup Point",
    provider: "Partner shop network",
    etaDays: 1,
    feeMinor: 0,
    active: true,
    addedBy: "Immaculate Nabirye",
  },
];

export async function getDeliveryMethods(townId) {
  await delay(300);
  return townId ? deliveryMethods.filter((d) => d.townId === townId) : deliveryMethods;
}
