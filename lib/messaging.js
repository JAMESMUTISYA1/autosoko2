// Pure helpers for the messaging feature, safe to import from both API
// routes and client pages — same pattern as lib/orders.js / lib/sponsorships.js.

export const MAX_MESSAGE_LENGTH = 4000;

// Deliberately loose, and deliberately used ONLY for a soft, dismissible
// client-side reminder — never to block sending. This is an auto-parts
// marketplace: OEM/part numbers are long digit strings too (e.g.
// "90919-01199"), so a hard block on "looks like a phone number" would
// constantly misfire on completely legitimate messages about the actual
// product being discussed. Nudge, don't break the core use case.
const PHONE_PATTERN = /(?:\+?\d[\s.-]?){9,15}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const EXTERNAL_APP_PATTERN = /\b(whatsapp|wa\.me|t\.me|telegram|signal)\b/i;

export function mightContainContactInfo(text) {
  if (!text) return false;
  return PHONE_PATTERN.test(text) || EMAIL_PATTERN.test(text) || EXTERNAL_APP_PATTERN.test(text);
}

// Groups a flat, oldest-first message array into WhatsApp-style day
// sections: [{ label, key, messages }]
export function groupMessagesByDay(messages) {
  const groups = [];
  let currentKey = null;
  for (const m of messages) {
    const date = new Date(m.createdAt);
    const key = date.toDateString();
    if (key !== currentKey) {
      groups.push({ label: dayLabel(date), key, messages: [] });
      currentKey = key;
    }
    groups[groups.length - 1].messages.push(m);
  }
  return groups;
}

function dayLabel(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function isSameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatRelativeTime(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
