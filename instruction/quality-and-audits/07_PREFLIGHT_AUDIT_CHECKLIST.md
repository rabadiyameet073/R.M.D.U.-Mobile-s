# Module 07: Pre-Flight Audit Checklist

Run this comprehensive checklist before committing code, merging branches, or pushing to production.

---

## 1. Technical SEO Checklist (React SPA)
- [ ] **Titles**: Strictly 50–60 characters on all indexable views using `fitTitle()`.
- [ ] **Descriptions**: Strictly 120–160 characters; unique across all 5 category routes and phone views.
- [ ] **Canonical URL Isolation**: Dynamically updated on every view via `useDocumentHead()`. `index.html` has NO static conflicting canonical declaration.
- [ ] **Link Health & Empty States**: Zero 404 errors on internal routes. Filter combinations with 0 matches return an empty state with `noindex, follow`.
- [ ] **Image Alt Text**: Explicit descriptive `alt` on all phone images and hardware renders; `aria-hidden="true"` on decorative Lucide icons.
- [ ] **Thin Content Quarantine**: Categories or query filters with <3 devices set to `noindex, follow` and excluded from `public/sitemap.xml`.
- [ ] **Robots & Sitemap**: `public/robots.txt` and `public/sitemap.xml` valid, well-formed, and resolving in production build.
- [ ] **Safe JSON-LD**: Structured data present for `Product`, `Review`, and `ItemList` with `<` safely escaped to `\u003c`.

---

## 2. Core Web Vitals & Vite Performance Checklist
- [ ] **Production Build Verification**: Tested strictly on production bundle (`npm run build && npm run preview`).
- [ ] **Audit Concurrency**: Audit crawler / Lighthouse tool concurrency set to 1.
- [ ] **Largest Contentful Paint (LCP)**: LCP < 2.5s (hero video/poster preloaded; primary device renders optimized).
- [ ] **Cumulative Layout Shift (CLS)**: CLS < 0.1 (all device cards use fixed aspect-ratio wrappers to prevent image load jump).
- [ ] **Interaction to Next Paint (INP)**: INP < 200ms (budget slider state updates wrapped in `startTransition`).
- [ ] **Bundle Size Budget**: Vendor chunks split cleanly without monolithic bundle warnings in Vite output.

---

## 3. UI/UX & Interaction Checklist
- [ ] **Viewport Ergonomics**: Responsive verification at 360px (compact mobile), 768px (tablet), 1024px (desktop), and 1440px+ (ultra-wide).
- [ ] **Touch Targets**: All filter pills, category buttons, and modal close triggers have minimum `44px × 44px` touch targets.
- [ ] **Side-by-Side Comparison**: Pinning and removing devices works smoothly; horizontal scroll on mobile does not clip header data.
- [ ] **Keyboard Accessibility**: Modal dialogs, filter drawers, and comparison drawer dismiss cleanly on Escape key press with focus restoration.
- [ ] **Memory Leak Prevention**: All GSAP animations wrapped in `gsap.context()` with clean `.revert()` in component unmount effects.

---

## 4. Availability & Claim Integrity Checklist

Applies to any screen or endpoint that shows availability, ownership, a rank position, a share code, or a "reserve / save / submit" action. Full contract: [Module 11](../technical-architecture/11_SYSTEM_DESIGN_MASTER_RULES.md).

- [ ] **One claim primitive**: the write is a single transaction/RPC (unique insert, conditional update, lock, expiring hold, or lease) — no read-then-write in Python or JS.
- [ ] **Zero-rows means denied**: a taken slot returns `409` with `retry_after`, never a silent success.
- [ ] **Server-time authority**: expiry and countdowns come from the database timestamp; malformed or missing expiry fails closed.
- [ ] **Honest availability**: the four states (available / held by you / held by others / unavailable) are rendered from a fresh `no-store` read; no cached or optimistic "available".
- [ ] **All UI states proven**: loading, success, genuine empty, validation error, unauthorized, slow, dependency-down and retry verified in the browser for the changed surface.
- [ ] **No fake data on failure**: no empty-as-success, no invented stock, no "sent"/"saved"/"reserved" without committed evidence.
- [ ] **Repeat-safe**: double click, retry after timeout, and replay produce one business effect.
- [ ] **Integrity counters at zero**: oversell, double-confirm and confirm-after-expiry are proven `0` by the test matrix.
- [ ] **Locks fail fast and cleanly**: transaction-scoped advisory locks only (never session-level under pooling), 1 s lock timeout, deadlock/serialization retried at whole-transaction scope, surfaced as `409` with `retry_after`, and deadlock/long-transaction alerting exists ([Module 12](../technical-architecture/12_CONCURRENCY_AND_RESERVATION_RULES.md)).
