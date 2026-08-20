# AutoSoko Backend

Real backend, built on top of the frontend from the earlier passes.
Next.js API routes (Document 1's "modular monolith" decision) + Prisma +
Neon Postgres. This document covers setup, what's actually secure and why,
what makes it fast, and — importantly — what was and wasn't possible to
test given the environment this was built in.

## A note on how this was built and verified

Prisma's CLI (`generate`, `migrate`, `validate`) needs to download a
compiled engine binary from `binaries.prisma.sh`. That domain is blocked
by this sandbox's network policy — confirmed directly (`x-deny-reason:
host_not_allowed`), not assumed. This means `npx prisma generate` cannot
run here, and neither can any command that needs it.

Rather than ship unverified code and call it done, here's what was
actually done to validate correctness anyway:

1. **The full relational schema was hand-translated to raw SQL** (see
   `prisma/validation_ddl.sql`) and executed against a real local
   PostgreSQL 16 instance, installed in this sandbox specifically for
   this purpose. All 40 tables, 18 enums, and every foreign key and
   index applied cleanly with zero errors.
2. **The highest-stakes logic — the order-creation transaction with
   atomic stock decrement — was tested for real**, with actual `BEGIN`/
   `UPDATE ... WHERE stock >= qty`/`COMMIT` statements against seeded
   test data, confirming stock correctly went from 10 → 8 after
   ordering 2 units, inside one atomic transaction.
3. **The driver-adapter API** (`@prisma/adapter-neon`, used in
   `lib/db.js`) was verified against that exact package's own installed
   README rather than memory, since guessing at an API for critical
   infrastructure code is exactly the kind of thing worth checking, not
   assuming.
4. A relation-naming bug (`Conversation`↔`User`) and a missing foreign
   key (`Conversation.productId` had no actual `@relation`) were caught
   during manual schema review and fixed before any of the above testing.

**What this means for you:** the database design and the core
transaction logic are genuinely tested, not just written and hoped for.
What's *not* verified is Prisma Client's actual generated TypeScript/JS
output and runtime behavior against Neon specifically — that requires
running `npx prisma generate` and `npx prisma migrate dev` yourself, in
an environment with normal internet access. The commands below are
exactly what to run; there's no reason to expect them to fail, but "no
reason to expect failure" and "verified" are different claims, and it'd
be dishonest to blur them.

## Setup

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL and DIRECT_URL from your Neon project dashboard
# (Connection Details → pooled and direct connection strings respectively)

npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

npm run dev
```

Generate an `AUTH_SECRET` with `npx auth secret` and add it to `.env`.
For Google sign-in, add OAuth credentials from
`console.cloud.google.com`. For rate limiting to actually be enforced
(see below), add Upstash Redis credentials from `console.upstash.com`.

## Why Neon, and how the connection is actually used

Two connection strings, deliberately:

- `DATABASE_URL` — the **pooled** connection (Neon's PgBouncer-based
  pooler, port 6543). Every normal app query goes through this. This is
  the fix for the connection-exhaustion problem flagged earlier in this
  project's planning: serverless functions open a connection per
  invocation, and without pooling that exhausts Postgres's connection
  limit under real concurrent load, fast.
- `DIRECT_URL` — the **unpooled** connection (port 5432). Migrations
  need a session-level connection that a transaction-mode pooler
  doesn't support, so `prisma migrate` uses this one specifically.

`lib/db.js` goes one step further than just pointing at the pooled URL —
it uses `@prisma/adapter-neon`, Neon's own serverless driver, which talks
to Postgres over HTTP/WebSocket instead of holding a persistent TCP
connection open. This is the actual production-recommended pattern for
Neon + serverless, not a workaround; it's what makes a stateless Next.js
API route on Vercel safe to call under load without connection-pool
exhaustion being a concern at all.

## Security

| Concern | Implementation |
|---|---|
| Password storage | bcrypt (bcryptjs — pure JS, no native compilation, safe for serverless), cost factor 12 (OWASP baseline) — `lib/auth/password.js` |
| Auth | Auth.js v5, JWT sessions (no DB round-trip per request/middleware check), credentials (phone/email + password) and Google OAuth providers — `auth.js` |
| Route protection | `middleware.js` — the gap flagged repeatedly in earlier passes (zero protection on `/admin`, `/agent`, `/seller`) is now closed. Runs at the edge, reads the JWT only |
| Fine-grained permissions | `lib/auth/rbac.js` — business-scoped permission checks against Document 2's `roles`/`permissions`/`role_permissions` tables, checked inside API routes (middleware only gates page-level role, not "can this specific user edit this specific business's products") |
| Account enumeration | Login and registration give generic failure messages; `verifyPassword` runs even against a null hash rather than short-circuiting, so the response shape doesn't leak whether an account exists |
| Rate limiting | Upstash Redis, sliding window, limits matching Document 3 §0 (5/min auth, 100/min default, 300/min autocomplete) — `lib/auth/rateLimit.js`. **Fails open if Upstash isn't configured** — deliberate for local dev, but means rate limiting is not actually enforced until real Upstash credentials are set. Don't mistake "the code exists" for "it's protecting anything" until that's done |
| Input validation | Zod at every API route boundary, same schemas the frontend forms already validate against client-side |
| SQL injection | Not applicable by construction — Prisma parameterizes every query; no raw SQL string concatenation anywhere in the API routes |
| Overselling / race conditions | Atomic `UPDATE ... WHERE stock >= quantity` inside a DB transaction — verified against real Postgres, not just written (see above) |
| Idempotency | `Idempotency-Key` header read on order creation to prevent duplicate orders from a double-tapped submit — sketched, not fully wired (needs a storage decision for the key itself, most likely Upstash again) |
| Secrets | `.env` is gitignored; `.env.example` has placeholders only |

## Performance

- **Connection pooling** via Neon's pooler (above) — the single biggest lever for handling concurrent load, and the one most naive Prisma+serverless setups get wrong.
- **Field selection, always** — every query in the API routes uses Prisma's `select` to fetch exactly the columns a given view needs, never the whole row. The products list endpoint, for instance, doesn't fetch `longDescription` or `fittingInstructions` — those only matter on the detail page.
- **Parallel queries where independent** — e.g. the products list endpoint runs `count()` and `findMany()` concurrently via `Promise.all` rather than sequentially, since neither depends on the other's result.
- **Indexes** — every index specified in Document 2's design is in the Prisma schema and was verified to actually create in Postgres: `business_id`, `category_id`, `sku`, `oem_number`, `part_number`, `status` on products; `(business_id, status)` composite on orders (the single most common seller-dashboard query); `(entity_type, entity_id)` on audit logs.
- **JWT sessions over database sessions** — middleware runs on every matched request; a DB-backed session would mean a query on every single page navigation just to check "is this person logged in."

## What's built vs. what follows the same pattern

Built and tested (schema) / written-but-unexecuted (application code, per
the honesty note above):
- `POST /api/v1/auth/register`
- `POST /api/v1/products`, `GET /api/v1/products`
- `POST /api/v1/orders` (the critical one — stock-safe, multi-seller splitting)
- Auth.js credentials + Google OAuth, full session/JWT flow
- Middleware route protection for `/admin`, `/agent`, `/seller`

Document 3 specifies roughly 40 endpoints total. The rest — messaging,
reviews, wallet/payments, admin verification actions, search indexing —
follow the exact same pattern established here (Zod validation → RBAC
check → Prisma query with explicit `select` → typed response envelope)
and are the natural next slice of work, not a different architecture.

## Migrating the frontend off mock data

Every mock data function (`data/sampleData.js`, `sellerData.js`,
`adminData.js`, etc.) is already shaped to match these API responses —
that was deliberate from the first frontend pass specifically so this
migration would be mechanical. Swapping `getFeaturedProducts()` from a
`setTimeout`-delayed static array to `fetch('/api/v1/products')` is a
change inside that one function, not a rewrite of any page that calls it.

## This pass: more endpoints + frontend wiring

**New endpoints:**
- `GET /api/v1/products/:slug` — product detail, with wholesale pricing gated behind verified-business auth
- `GET /api/v1/categories` — cached at the edge (rarely changes)
- `GET /api/v1/businesses/:slug` — public store profile (never exposes taxPin/registrationNumber/verification docs, by construction of the `select`, not by remembering to strip them)
- `GET /api/v1/vehicles/makes`, `GET /api/v1/vehicles/makes/:makeId/models` — cascading vehicle picker data
- `GET /api/v1/orders`, `GET /api/v1/orders/:id` — buyer's own order history and detail, ownership-checked
- `GET/POST /api/v1/wishlist`, `DELETE /api/v1/wishlist/:productId`

**Auth is now real, not simulated:** login calls actual `signIn("credentials", ...)`;
registration calls the real `/api/v1/auth/register`; Google buttons trigger real
OAuth; the Header shows actual session state (name, sign out) instead of
always showing "Sign In". Added `auth.config.js` earlier specifically so
none of this could break `/admin`/`/agent`/`/seller` route protection —
see that file's comments.

**Frontend data wiring:** `data/sampleData.js`'s core functions
(`getCategories`, `getProductBySlug`, `getVehicleMakes`) now call the
real API. The store page and buyer order pages do too, using a
cookie-forwarding pattern for the authenticated ones (Server Components
don't auto-forward the incoming request's session cookie to internal
`fetch()` calls — has to be done explicitly via `headers()`).

**Every wired function falls back to mock data if the API call fails**,
logged clearly (`console.warn`) so the fallback is never mistaken for
real data. This isn't hedging on the wiring — every one of them
genuinely calls the real endpoint first. It's there so a fresh clone
without Neon set up yet still renders something instead of crashing,
and it's proven to work: visible directly in this pass's build log
(`[getCategories] Falling back to mock data: ...`) since even the build
step itself has no live database to reach.

**Known gaps, honestly scoped rather than hidden:**
- No `GET /api/v1/products/featured` endpoint yet — homepage still shows
  mock data pending a real "featured" ranking endpoint (would reuse the
  same relevance-blend idea as `lib/search/searchEngine.js`)
- Product detail page's "more from this store" / "bought together"
  sections only render for mock-sourced products — no cross-sell table
  or businessId-exposing product-listing-by-store path exists yet for
  real API-sourced products
- `WishlistContext` stays localStorage-based (not wired to the new
  `/api/v1/wishlist` endpoints yet) — guest wishlists still work, but
  don't sync to an account
- Checkout calls the real order-creation endpoint, but cart items added
  from mock-data-sourced pages (fake ids like `"p1"`) will fail
  real validation (`productId` must be a UUID) — surfaced as an honest
  error, not a silent fake success
- Search still queries the Fuse.js index built from `data/sampleData.js`'s
  static arrays, not the live database — this is the correct architecture
  per Document 1 §3.2 (search is a derived index, not a live query), but
  it means search results and API-backed browse results only stay
  consistent with each other once the database has been seeded from that
  same file, which `npx prisma db seed` now does (seed script rewritten
  this pass to import the full mock catalog directly, rather than a
  hand-duplicated subset)

**On the reported "search not returning results" issue:** re-tested
exhaustively against a live server — `mazda bumper lip`, autocomplete for
`maz`, and every other case from the original testing pass still returns
identical, correct results. Could not reproduce it. If it's still
happening, the most useful next step would be specifics — which page,
what actually happens on screen (no dropdown at all? an error? results
just don't appear?) — since blindly changing already-verified-correct
code isn't the right move without being able to reproduce the problem.
