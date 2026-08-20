# AutoSoko Frontend — Security Notes

This frontend has no backend yet, so it's important to be precise about
what's actually secured here versus what only becomes real once
Document 3's API and Document 1's infrastructure exist.

## Implemented at this layer (real, effective now)

- **HTTP security headers** (`next.config.js`): CSP, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security`. These are enforced by the browser on
  every response regardless of backend state.
- **Client-side input validation** (`lib/validation/authSchemas.js`,
  Zod): catches malformed input before a network request, matching
  the schemas the real API will also enforce server-side.
- **Generic auth error messages**: login failures say "Invalid email/phone
  or password" rather than confirming which part was wrong — this
  prevents account enumeration and is a genuine practice, not cosmetic.
- **Correct `autocomplete` attributes** on all auth fields
  (`new-password`, `current-password`, `one-time-code`) so password
  managers and browsers handle credentials correctly instead of
  guessing.
- **No `dangerouslySetInnerHTML` anywhere** — React's default escaping
  is relied on throughout, which is the main XSS defense a frontend
  actually controls.
- **No sensitive data in `localStorage`/`sessionStorage`** — nothing in
  this codebase persists tokens or credentials client-side. When real
  auth is wired up, sessions should be httpOnly cookies (Auth.js
  default), never `localStorage`, so JavaScript — including any
  injected via a future XSS bug — can't read them.

## UX-only, not real security (labeled in code comments)

- The login/OTP attempt counters and lockout timers in
  `app/auth/login/page.js` and `app/auth/verify-otp/page.js` are
  **client-side conveniences**. A client-side counter can always be
  reset by reloading the page — it has zero enforcement value on its
  own. Real rate limiting is a server-side Redis token bucket
  (Document 3, §0: 5 req/min on `/auth/*`), and that's the actual
  control.

## Still entirely dependent on the backend (Documents 1-3)

- **Authentication & session management** — Auth.js session cookies,
  OTP issuance/expiry, 2FA — none of this exists until the API does.
  Every form here currently simulates a network call with
  `setTimeout` and always "succeeds" or "fails" in a scripted way.
- **Authorization / RBAC** — role and permission checks (Document 2's
  `roles`/`permissions` tables) have no meaning without a real backend
  to enforce them; nothing in this frontend can be trusted to gate
  access on its own.
- **Payments** — no payment form exists yet. When it's built: card
  data must never touch this frontend's own servers or state (use the
  processor's hosted fields/tokenization, per Document 1 §3.6's PCI
  scope note), and M-Pesa/mobile money flows go through the
  `PaymentProvider` adapter pattern (Document 3, §7), never a
  hardcoded client-side call.
- **CSRF protection** — meaningful once there are authenticated,
  state-changing requests; Auth.js and Next Server Actions provide
  this by default, but there's nothing to protect yet.

## Before this goes anywhere near production

1. Real backend auth (Document 3, §1) replacing every `setTimeout`
   stub in `app/auth/*`.
2. Payment forms built with the processor's own hosted/tokenized
   fields — not raw `<input>` fields bound to component state.
3. A CSP tightened further once real third-party script origins
   (payment SDKs, analytics) are known — the current policy is a
   reasonable starting baseline, not a final one.
4. Server-side re-validation of every Zod schema currently only
   checked client-side (already the plan per Document 4's coding
   standard — flagging it here too since it's the single most
   important line in this document).
