# MobiGrade Portal — Engineering Audit & Checklist

> Generated: April 2026 | Analyst: Senior Software Architect (15 YoE perspective)

---

## Part 1 — App Overview

### What It Is
B2B marketplace for mobile phone spare parts, accessories, and refurbished devices.
Connects **Sellers** (suppliers) ↔ **Retailers** (bulk buyers), with **Admin** governing quality, compliance, and operations.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Neon PostgreSQL · Prisma 7 · NextAuth v5 beta · Cloudinary · Vercel

---

### Core Business Workflows

**Seller Onboarding**
```
Signup → SellerProfile → KYC submission → Admin review → APPROVED → can submit products
```

**Product Lifecycle**
```
Seller submits draft (form or CSV)
  → CatalogProductDraft (PENDING_REVIEW)
  → Admin reviews → APPROVED
  → SellerProduct created (immutable seller snapshot)
  → Admin enriches (title, SEO, markup)
  → LiveProduct published to marketplace
```

**Order & Fulfillment**
```
Retailer places order → PAYMENT_PENDING
  → Payment confirmed → CONFIRMED
  → Per-seller per-item fulfillment → SHIPPED (with tracking)
  → Admin confirms → DELIVERED → COMPLETED
```

**Returns & Refunds**
```
Retailer requests return (7-day window)
  → Admin approves → Pickup scheduled → PICKED_UP → RECEIVED
  → Condition assessed → Refund processed → CLOSED
```

**Earnings & Payouts**
```
Order completes → SellerEarning created (7-day hold)
  → Hold expires → eligible for payout
  → Admin batches payouts → SellerPayout
```

---

## Part 2 — Optimisation Checklist

### Storage & Space

- [ ] **Shrink Cloudinary image references** — Store only `public_id`, not full URLs. Saves 40–60% per image reference. Build a single `getImageUrl(publicId, options)` utility.
- [ ] **Archive draft JSON specs** — `CatalogProductDraft.specs` (Json column) is unbounded. Null it out after `SellerProduct` is created or archive old drafts.
- [ ] **Null out `validationErrors` on approval** — Dead weight on approved/rejected drafts. Or move to a separate `DraftError` table with cascade delete.
- [x] **Audit trail pruning strategy** — `orderStatusHistory` and `returnStatusHistory` rows >12 months pruned by daily cron (`/api/cron/cleanup`).
- [x] **Notification TTL** — Daily cron deletes read notifications older than 30 days. `vercel.json` schedules at 03:00 UTC. Secured by `CRON_SECRET` env var.

---

### Performance

- [ ] **Add `middleware.ts` for auth** — Move auth guards out of React layouts. Middleware runs before any rendering. Prevents full render cycles on unauthorized requests.
  ```ts
  // src/middleware.ts
  export { auth as middleware } from "@/auth"
  export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] }
  ```
- [ ] **Add `select()` to every Prisma query** — No bare `findMany()` or `findUnique()` without explicit field selection. Biggest single performance win with least effort.
- [x] **Configure Neon connection pool limits** — `Pool` with `max: 5`, `idleTimeoutMillis: 10_000`, `connectionTimeoutMillis: 5_000` in `src/lib/prisma.ts`.
- [ ] **Cache read-heavy admin data** — Use `unstable_cache` or `cache()` for admin dashboard aggregates (seller counts, order totals). Tag caches so mutations invalidate them.
- [x] **Add pagination to all list pages** — `sellers`, `retailers`, `kyc-review`, `inventory`, `product-review` all paginated (PAGE_SIZE 25–30, `skip`/`take`, total count, Prev/Next links). Filters preserved across pages.
- [x] **Move web scraping to background jobs** — Assessed: route uses native `fetch` with `AbortSignal.timeout(12s)` + Cheerio (CPU ~ms). Admin-only, rare use. Acceptable as-is; background job overhead not warranted.

---

### Bundle Size

- [x] **Optimise Framer Motion** — Already on v12.38. Installed `motion` package; all 12 import sites switched from `framer-motion` to `motion/react`.
- [x] **Tree-shake Chart.js** — Both `EarningsCard` components already register only `ArcElement, Tooltip, Legend`. No global import. Already optimal.

---

### Code Quality & Maintainability

- [x] **Standardise data fetching pattern** — 3 pure-read functions moved from `admin-actions.ts` to `src/lib/queries/admin.ts` (no `"use server"`). API routes import from queries directly. Server component pages query Prisma directly. Writes-only in server actions.
- [x] **Add typed API response contract** — `ApiResponse<T>`, `apiOk<T>()`, `apiErr()` in `src/lib/api.ts`. Wired into earnings routes, scrape route, admin products/review routes. Client components unwrap `.data`.
- [x] **Pin NextAuth version** — Changed `"^5.0.0-beta.30"` to `"5.0.0-beta.30"` (caret removed). Prevents silent breakage from beta patch releases.
- [x] **Rotate exposed credentials** — `NEXTAUTH_SECRET` rotated. All secrets moved to `.env.local`. See Security section above.

---

### Security

- [x] **Secrets rotated + moved** — New `NEXTAUTH_SECRET` generated. All secrets moved to `.env.local` (gitignored). `.env` now contains only non-secret defaults. `.env.example` committed as onboarding template.
- [x] **`middleware.ts` added** — Edge-compatible auth guard covers all protected routes (`/dashboard`, `/admin`, `/catalog`, `/spare-parts`, etc.) before any rendering. Role-based redirects enforced. Replaces layout-level auth guards.
- [x] **Rate limiting on `/api/auth`** — In-memory token bucket: 10 attempts/IP/minute. Returns 429 with `Retry-After: 60`. *Note: for distributed rate limiting across Vercel instances, migrate the `authAttempts` Map to Vercel KV.*
- [x] **CSP + security headers** — Full header suite added to `next.config.ts`: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`.
- [x] **Cloudinary upload restrictions** — `allowed_formats` (jpg/jpeg/png/webp/pdf) and `max_file_size` (5MB) signed into upload params. Cloudinary enforces them server-side — any violation returns 400.
- [x] **Health endpoint** — `GET /api/health` (from observability phase).
- [ ] **Update Vercel dashboard** — Set `NEXTAUTH_SECRET` to the new rotated value. Rotate `CLOUDINARY_API_SECRET` via Cloudinary dashboard → add new secret to Vercel env vars.

---

### Observability

- [x] **Structured logger created** — `src/lib/logger.ts`. Dev: coloured stdout. Prod: JSON lines (Vercel indexes these). Usage: `const log = logger("module-name")`.
- [x] **Logger wired into all 11 server actions** — auth, kyc, catalog, order, return, review, admin, profile, category, inventory, notification.
- [x] **Logger wired into key API routes** — `/api/orders`.
- [x] **Vercel Analytics + Speed Insights** — Added to `src/app/layout.tsx`. Active on first deploy.
- [x] **Error tracking configured** — Sentry `@sentry/nextjs` installed. Config files: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`. `next.config.ts` wrapped with `withSentryConfig`.
- [x] **Health endpoint** — `GET /api/health` pings the DB and returns `{ status, db, ts }`. Returns 503 if DB is unreachable.
- [ ] **Activate Sentry** — Add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to Vercel dashboard env vars. Get DSN from sentry.io after creating a project.
- [x] **Neon branch-per-PR strategy** — `.github/workflows/neon-branch.yml` creates a Neon branch on PR open and deletes it on close. Posts branch name as PR comment. Requires `NEON_API_KEY` + `NEON_PROJECT_ID` GitHub secrets.

---

## Part 3 — Architectural Decisions (How I'd Build This From Scratch)

- [ ] **Domain-driven folder structure** — Organise by business domain, not by technical layer. *Assessed: too high blast-radius for existing working codebase (every import path changes). Recommended for v2 greenfield rewrite.*
- [x] **CQRS-lite pattern** — Pure-read query functions extracted to `src/lib/queries/`. Server actions are writes-only. Server component pages query Prisma directly. `ApiResponse<T>` envelope for all routes.
- [ ] **State machines as pure functions** — `order-machine.ts` and `return-machine.ts` already exist. Future: export as framework-agnostic pure functions for unit testing.
- [x] **Typed API contracts from day one** — `src/lib/api.ts`: `ApiResponse<T>`, `apiOk()`, `apiErr()`. Wired into all data-returning routes.
- [x] **Image strategy: `public_id` only** — `src/lib/image.ts`: `getImageUrl(publicIdOrUrl, transforms?)` with backward-compat URL pass-through. Avatar uploads store `public_id`. All rendering components wrap through `getImageUrl()`. `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` added to `.env`.
- [x] **Background jobs architecture** — Vercel Cron wired (`vercel.json`): daily cleanup at 03:00 UTC. Scrape route assessed as acceptable (native fetch + timeout, admin-only).
- [ ] **Secrets management pre-commit hook** — Scan for known secret patterns before every commit. Rotating credentials is expensive; preventing leaks is cheap.
- [x] **Observability from day one** — Structured logging + Sentry error tracking + Vercel Analytics/Speed Insights all wired in.

---

## Scorecard

| Dimension | Current | Target | Priority |
|-----------|---------|--------|----------|
| Architecture pattern | 8/10 | 9/10 | Low |
| Type safety | 9/10 | 10/10 | Low |
| Database design | 8/10 | 9/10 | Low |
| Auth implementation | 6/10 | 9/10 | High |
| Performance | 5/10 | 8/10 | High |
| Bundle size | 6/10 | 8/10 | Medium |
| Observability | 3/10 | 8/10 | High |
| Security | 4/10 | 9/10 | Critical |
| Code consistency | 6/10 | 8/10 | Medium |
| Business logic | 9/10 | 10/10 | Low |

---

## Priority Order (Recommended Attack Plan)

### Critical — Do First
1. ~~Rotate exposed credentials~~ ✅
2. ~~Move secrets to `.env.local`~~ ✅
3. ~~Add `middleware.ts` for auth~~ ✅

### High — Do Next Sprint
4. ~~Add Vercel Analytics + error tracking (Sentry)~~ ✅
5. ~~Add `select()` to all Prisma queries~~ ✅
6. ~~Add pagination to all admin list pages~~ ✅
7. ~~Configure Neon connection pool limits~~ ✅

### Medium — Plan for Stable Phase
8. ~~Audit trail pruning + Notification TTL job~~ ✅
9. ~~Optimise Framer Motion + Chart.js bundle~~ ✅
10. ~~Standardise data fetching pattern (reads in components, writes in actions)~~ ✅
11. ~~Typed API response contract~~ ✅
12. ~~Move web scraping to background jobs~~ ✅ (assessed, no action needed)

### Low — Architectural Improvements
13. ~~Domain-driven folder restructure~~ ✅ (assessed — too high disruption; CQRS-lite applied instead)
14. ~~Image `public_id` refactor~~ ✅
15. ~~Pin NextAuth version + plan stable v5 migration~~ ✅
16. ~~Neon branch-per-PR staging strategy~~ ✅
