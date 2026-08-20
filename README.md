# AutoSoko — Frontend (Next.js + Tailwind, JavaScript)

The presentation layer for Documents 1-4 (Architecture, Database, API Spec,
Folder Structure). Plain JavaScript (no TypeScript), Next.js App Router,
Tailwind CSS, monochrome design system.

## Setup

```bash
npm install
npm run dev
```

- Storefront: `http://localhost:3000`
- Seller dashboard: `/seller`
- Admin dashboard: `/admin`
- Agent dashboard: `/agent`
- Services & booking: `/services`

## Route map

```
app/
├── layout.js              — true root: fonts, theme, toast providers
├── (marketplace)/         — storefront (has its own Header/Footer layout)
│   ├── page.js             — homepage
│   ├── search/              — search results, personalization banner, sponsored section
│   ├── product/[slug]/       — product detail (gallery, tutorials, bought-together, store sections)
│   ├── store/[slug]/          — public store/seller page
│   ├── services/                — service types + mechanic directory
│   ├── services/book/            — appointment booking form
│   ├── account/messages/[id]/     — in-platform message thread
│   └── auth/                       — login, register, OTP verify
├── seller/                — seller dashboard (business OR individual)
│   ├── page.js              — overview
│   ├── listings/              — my listings + create listing (multi-image, tutorial, tools, compatibility)
│   ├── wallet/                  — balance, transaction history, withdraw
│   └── sponsorship/              — promote a listing into the sponsored section
├── admin/                  — platform admin (create/manage agents, oversight views)
└── agent/                  — city-scoped agent (verify businesses, track orders)
```

## What's new in this pass

**Product experience**
- Multi-image gallery with scrollable thumbnails and a full lightbox on click (`components/ProductGallery.js`)
- Optional fitting guide per product: YouTube link + step instructions + tools-needed list — cleanly omits itself when a product has none (`components/FittingGuide.js`)
- "Frequently Bought Together" cross-sell (e.g. rims → tyres) with a bundle total (`components/BoughtTogether.js`)
- Two distinct store sections: same-category items from the seller, and everything else they sell (`components/ProductRow.js`)
- Units sold shown on both the product card and detail page
- Sponsored badge on cards + a dedicated "Sponsored" row at the top of search results
- "Message Seller" now navigates to a real in-platform thread (`app/(marketplace)/account/messages/[storeId]`) rather than exposing contact info — the seller card explicitly says communication stays on-platform

**Search**
- Personalization banner (`components/PersonalizeSearchBanner.js`): collapsed by default with "customize to your car?", expands to a Make/Model/Year picker, shows an applied-filter chip once set

**Selling**
- `stores` in `data/sampleData.js` models both `sellerType: "business"` and `sellerType: "individual"` — same product schema either way
- `app/seller/listings/new` — the full create-listing flow: selling-as toggle (individual/business), multi-image upload, optional YouTube/fitting-instructions/tools fields, compatible-vehicle picker
- `app/seller/wallet` — available vs. pending balance, transaction history, a working withdraw form (M-Pesa/Airtel/Bank) with balance validation
- `app/seller/sponsorship` — pick a listing + duration to sponsor it

**Categories**: added Electronics alongside the existing Accessories category.

**Services** (new product surface, distinct from the parts marketplace): `/services` lists bookable service types (alignment, general service, mobile mechanic, diagnostics) plus a mechanic directory; `/services/book` is the appointment form with workshop-vs-home-visit location choice.

## Data model notes

`data/sampleData.js` now models `stores` (sellers) separately from `products`,
with products carrying `storeId`, `images[]`, `unitsSold`, `sponsored`,
`youtubeUrl`, `fittingInstructions`, `toolsNeeded[]`, and `boughtTogetherIds[]`.
`data/sellerData.js` holds wallet balance/transactions for the demo signed-in
seller (deliberately set to the *individual* seller, `store-5`, as the proof
that individual selling works end-to-end, not just businesses).
`data/servicesData.js` holds service types and the mechanic directory.

All of this is mock data behind the same simulated-latency async pattern as
before — swapping in real `fetch()` calls to Document 3's API is a drop-in
change at the function level, not a rewrite of any page.

## Endpoints referenced but not yet in Document 3

A few features here imply backend endpoints that don't exist in the API
spec yet — flagged in code comments at each call site, summarized here:
- `POST /api/v1/wallet/withdrawals` (seller wallet)
- `POST /api/v1/products/:id/sponsor` (sponsorship)
- `POST /api/v1/appointments` (services booking)
- `POST /api/v1/admin/agents` (already flagged previously)

Worth folding into Document 3 as a proper spec pass when the backend gets built.

## Not yet wired up
- No route protection on `/admin`, `/agent`, or `/seller` — anyone can navigate there directly. Depends on real auth/RBAC (see `SECURITY.md`).
- Image uploads in "Create Listing" only track filenames — no real upload target yet (needs Cloudinary/S3 per Document 1).
- Cart and checkout flows are still UI-only stubs.
- Booking/appointment data doesn't persist beyond the confirmation screen.

## Next candidates
- Auth gate / role-based route protection
- Cart & checkout flow
- Payment form (M-Pesa STK push UI, processor-hosted card fields)
- Buyer-side "My Bookings" and order tracking pages

## Added: cart, checkout, wishlist, order tracking (this pass)

The biggest gap flagged in earlier passes — "Add to Cart" only showed a
toast and did nothing real — is now fixed:

- `contexts/CartContext.js` — real cart state, persisted to `localStorage`,
  grouped by seller (`groupedByStore`) since checkout splits into one order
  per seller per Document 3 §6.1
- `contexts/WishlistContext.js` — also fixes a real bug: the wishlist heart
  used to be local `useState` per `ProductCard`, so it reset every time you
  navigated away. Now it's global and persisted.
- `app/(marketplace)/cart/` — cart view, grouped by seller, quantity controls
- `app/(marketplace)/checkout/` — address, per-seller delivery method,
  payment method selection, order placement (creates one order per seller)
- `app/(marketplace)/account/orders/` — order history + order detail with a
  visual status-tracking timeline (pending → confirmed → processing →
  shipped → delivered)
- `app/(marketplace)/account/wishlist/` — saved items page
- `app/(marketplace)/account/messages/` — fixes a previously dead link;
  now a real inbox listing conversations
- `app/not-found.js` — styled 404 page (previously the Next.js default)
- Header cart icon now shows a live item-count badge

`data/buyerData.js` holds mock order history for the tracking timeline.

## Accent color

One accent — Electric Blue (`#2563EB`) — layered on top of the monochrome
system as `bg-accent`/`border-accent`/`text-accent`. Originally used only for
small touches (logo underline, focus rings, live-status dots); later expanded
to every primary action button (Add to Cart, Sign In, Place Order, Publish
Listing, Approve, Book Appointment, etc.) per a follow-up request. Badges and
price tags (`parts-tag`, condition labels, "Sponsored") deliberately stayed
black/white — they label data rather than prompt an action, so keeping that
distinction seemed worth preserving.

## This pass: theme debugging, accent expansion, mobile menu overhaul, and several new features

**Dark mode investigation:** stress-tested the theme system directly — inspected
the compiled CSS (`.dark` rule and all `--*` variables present and correct),
inspected the raw SSR HTML output (script present, `bg-bg`/`text-fg` classes
present, no hydration-error markers), and smoke-tested every major route
against a real production build (all 200s). Found no evidence of a build-level
bug. If it's still not working after a fresh `npm install` + `rm -rf .next`,
that'd point to a browser-side issue worth screenshotting.

**Accent color expanded** from "single touch" to actual primary buttons:
every real call-to-action (Add to Cart, Buy Now, Sign In, Place Order, Publish
Listing, Confirm Withdrawal, Approve, Book Appointment, etc.) is now
`bg-accent`/`text-white`. Badges and price tags (`parts-tag`, "New"/"Used",
"Sponsored") deliberately stayed monochrome — they're data, not actions, so
mixing them into the accent would blur that distinction. Dashboard active-nav
highlighting also uses the accent now.

**Mobile menu rebuilt.** It was previously an inline panel that pushed page
content down when opened — now it's a true floating overlay (fixed position,
backdrop, slide-in), with body-scroll lock and Escape-to-close, matching
across the storefront header and every dashboard (`DashboardShell`). The
dashboard sidebar toggle is now a floating action button fixed to the bottom
of the screen, reachable regardless of scroll position, per your request.

**New this pass:**
- Quick "Add to Cart" button directly on listing/search cards (`components/ProductCard.js`) — previously only available on the product detail page
- `/about`, `/contact` — real pages (Footer links to these were already present but dead)
- `components/HomeBanners.js` — auto-rotating promo banner on the homepage, with manual prev/next and dot navigation
- `components/GoogleSignInButton.js` — on both login and register; UI only, logs a toast (real OAuth wiring depends on Auth.js per Document 1 §3.7)
- `/admin/documents` — internal document repository: admins upload files with a category, visible to all other admins (not agents/sellers)
- `/admin/finance` — financial analysis: revenue/fees/payouts stat cards, a dependency-free monthly revenue bar chart, and a revenue-by-country breakdown

## Removed: dark mode

Light/dark theme switching (`ThemeContext`, `ThemeToggle`, the `.dark` CSS
variables, the flash-prevention script in `layout.js`) was removed by
request. The app is permanently light mode now. `app/globals.css` keeps a
single `:root` block with all the design tokens — if a dark mode is wanted
again later, it's a matter of re-adding a `.dark` variable block and a
toggle component, not restructuring the color system.

## Real search engine

Previously `searchProducts()` was a stub returning the whole catalog
regardless of query. It's now a genuine fuzzy, multi-field, ranked search —
built with Fuse.js rather than hand-rolled string matching, since real
relevance ranking (typo tolerance, per-word matching, field weighting) is
exactly the kind of thing worth using a maintained library for.

**Architecture** (`lib/search/`):
- `index.js` — builds the search index (Fuse instances over products and
  stores) once per server process and caches it. Uses Fuse's
  `useTokenSearch` mode so multi-word queries match per-word with BM25-style
  weighting, rather than treating the whole query as one string — this is
  what makes `"mazda bumper lip"` find *"Front Bumper Lip Spoiler — Mazda
  3"* even though the words are reordered. Two indices per corpus (strict
  "all words must match" and lenient "any word") — strict is tried first,
  falling back to lenient only if it finds nothing, so a query never
  dead-ends into zero results when a reasonable partial match exists.
- `searchEngine.js` — `runSearch()` blends Fuse's text relevance with
  business signals (sponsored placement, verified sellers, rating, units
  sold) into a single ranking score — the hand-rolled equivalent of
  Meilisearch's custom ranking rules (Document 1 §3.2). Also detects when a
  query confidently matches a *store name* and returns that store's full
  catalog even if individual listings don't textually match the query —
  this is what makes searching a seller's name work.
- `highlight.js` + `components/HighlightedText.js` — turns Fuse's match
  indices into bolded substrings in result titles, so it's visible *why*
  a result matched.

**API surface**: `app/api/search/route.js` and `/api/search/autocomplete/route.js`
implement Document 3 §5.1/§5.2's contract for client-side callers (the
autocomplete dropdown). The search page itself is a Server Component that
calls `runSearch()` directly — no network hop during SSR — so behavior
can never drift between the page and the API.

**A real bug worth knowing about, since it's the kind of thing that only
shows up under testing, not code review:** Fuse's `threshold` option
does not exclude weak matches when `useTokenSearch` is enabled — verified
this empirically, it's not clearly documented — so without a manual
cutoff, short queries returned the entire catalog, just ranked. Added a
manual relevance cutoff instead. Calibrating that cutoff took an extra
pass: fields like `oemNumber`/`sku`/`brand` didn't exist on any product
originally, and Fuse penalizes missing weighted fields quite hard, which
pushed every score up uniformly and made even a correct match with a few
typos ("braek pads corola") fail the cutoff. Fixed properly — not by
loosening the cutoff blindly, but by actually populating brand/OEM
number/part number/SKU/description on all 14 products (which Document 3's
spec calls for as searchable fields anyway), then recalibrating the cutoff
against real empirical scores for both a relevant typo'd query (~0.68) and
genuine noise (~0.81+) to find the actual safe gap between them.

**Filters and sort are now functional**, not cosmetic — `components/search/SearchFilters.js`
and `SortControl.js` read/write real URL query params, so the whole thing
works through Next.js's normal server-rendered navigation (no client-side
result-shuffling state to keep in sync).

**Not yet done**: full vehicle-trim compatibility filtering (Document 2's
`product_vehicle_compatibility` join table) — the "customize to your car"
banner currently applies a lightweight name-text boost for the selected
make rather than a hard compatibility filter, since the mock catalog
doesn't have real trim IDs wired up yet.

## Payouts, agent/admin workflows, and accountability

**Seller withdrawals** (`app/seller/wallet`) — sellers verify a phone
number once via OTP (`components/shared/VerifiedPhoneField.js` — shows a
locked "Verified" state afterward, with an explicit "Change" action if
they need to update it) and/or save a bank account with **double-entry
confirmation** (`components/shared/BankAccountField.js` — the confirm
field blocks paste, since the whole point of retyping is to catch typos
paste would bypass). Withdrawal requests go into a queue, not an instant
transfer — matching how real payout systems work.

**Agent order actions** (`components/dashboard/AgentOrdersList.js`) — now
has two explicit actions beyond the fulfillment-status dropdown: **Verify
Payment** and **Mark Delivered**, deliberately modeled as independent
facts about an order (a payment can be verified before shipping even
starts; delivery can't be confirmed until payment is). Both actions
record who did it and when.

**Admin gets the same agent actions**, platform-wide (not city-scoped) —
`/admin/orders` and `/admin/verifications` reuse the exact same
`AgentOrdersList`/`VerificationsList` components agents use, so behavior
can't drift between the two roles. Admin's additions on top:
- `/admin/withdrawals` — approve → mark paid seller payout requests
- `/admin/accounts` — suspend/reactivate any seller or agent account (a
  reason is required to suspend, and it's shown alongside who did it)
- `/admin/delivery` (+ `/agent/delivery`, city-locked for agents) —
  configurable delivery methods per town (courier, boda-boda, pickup
  point), each attributed to who added it

**Contact Us inbox** (`/admin/support`, `/agent/support`) — reviews and
resolves submissions from the public Contact page. Known limitation,
consistent with the rest of this mock-data layer: the public `/contact`
form and this inbox aren't actually wired together yet (both use static
mock arrays), so a real submission won't appear here until the backend
exists.

**Profile pages** (`/seller/profile`, `/agent/profile`, `/admin/profile`)
— all built from the same two shared components (`ProfileDetailsForm`,
`ChangePasswordForm`) so the pattern stays consistent across roles.

**Accountability ("who did what")** — every action that changes state
(verify, approve, reject, suspend, resolve, confirm delivery) records an
actor name and timestamp, surfaced via `components/shared/ActionedByBadge.js`
("Verified by Grace Muthoni · 2026-08-08 10:12"). Right now the actor is
a hardcoded stand-in (`CURRENT_AGENT`/`CURRENT_ADMIN` constants) since
there's no real session yet — but every action already threads a
`currentActorName` prop through, so swapping that constant for the real
authenticated user's name is the entire migration once auth exists.

**Date/period filtering** (`components/shared/DateRangeFilter.js` +
`lib/dateFilter.js`) — This week / This month / Last 30 days / custom
range, wired to URL params the same way search filters are. Added to
every list page where it's meaningful: admin & agent orders,
verifications, withdrawals, contact messages, and wallet transaction
history.

## Backend

A real backend now exists alongside this frontend — Next.js API routes,
Prisma, and Neon Postgres. See **`BACKEND.md`** for full setup
instructions, the complete security architecture, performance decisions,
and an honest account of what was and wasn't possible to test in this
build environment (short version: the full 40-table schema and the
critical order-transaction logic were verified against a real local
Postgres instance; Prisma Client itself needs `npx prisma generate` run
in an environment with normal internet access, since this one's network
policy blocks the domain Prisma's CLI downloads its engine from).

Quick start:
```bash
cp .env.example .env   # fill in your Neon connection strings
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

`middleware.js` now genuinely protects `/admin`, `/agent`, and `/seller`
— the gap flagged repeatedly throughout the earlier frontend-only passes
is closed.
