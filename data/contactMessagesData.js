function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const CONTACT_STATUSES = ["open", "resolved"];

export const contactMessages = [
  {
    id: "msg-301",
    name: "Peter Kamau",
    email: "peter.kamau@example.com",
    subject: "Order issue",
    message: "My order AS-7003 has been pending for 5 days. Can someone check on this?",
    submittedAt: "2026-08-09",
    status: "open",
    resolvedBy: null,
    resolvedAt: null,
  },
  {
    id: "msg-302",
    name: "Faith Njeri",
    email: "faith.njeri@example.com",
    subject: "Seller account",
    message: "I uploaded my business permit three days ago but my account still shows unverified. How long does review take?",
    submittedAt: "2026-08-08",
    status: "resolved",
    resolvedBy: "Grace Muthoni",
    resolvedAt: "2026-08-08 16:40",
  },
  {
    id: "msg-303",
    name: "David Otieno",
    email: "david.otieno@example.com",
    subject: "Report a listing",
    message: "I think this seller is listing counterfeit parts under a genuine OEM number. Listing: front-brake-pads-toyota-corolla",
    submittedAt: "2026-08-10",
    status: "open",
    resolvedBy: null,
    resolvedAt: null,
  },
  {
    id: "msg-304",
    name: "Amina Hassan",
    email: "amina.hassan@example.com",
    subject: "Partnership / press",
    message: "I run an auto blog in Mombasa and would like to discuss a content partnership.",
    submittedAt: "2026-08-06",
    status: "resolved",
    resolvedBy: "Samuel Kariuki",
    resolvedAt: "2026-08-07 09:15",
  },
];

export async function getContactMessages() {
  await delay(300);
  return contactMessages;
}
