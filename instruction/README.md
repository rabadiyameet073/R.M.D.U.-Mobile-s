# Master Platform Instructions, Architecture & Agent Directory

Welcome to the centralized documentation, architecture, and agent instruction directory for **RMDU Mobiles — Smartphone Recommendation & Comparison Platform**.

> [!IMPORTANT]
> **Directory Structural Constraint**:
> `README.md` is the **only file permitted directly at the root** of `instruction/`. All other platform manuals, rules, specifications, and scripts are strictly organized inside their designated domain subdirectories.

---

## 📁 Directory Architecture Overview

The `instruction/` folder is partitioned into 6 specialized directories:

```
instruction/
├── README.md                      # [Single Root File] Platform navigation & directory index
├── platform-specifications/       # Business vision, smartphone taxonomy specs, comparison workflows & blueprints
├── technical-architecture/        # React 18 + Vite SPA architecture, technical SEO, and system design / concurrency rules
├── design-and-motion/             # Enterprise dark mode design tokens, typography scales, Lenis & GSAP motion
├── quality-and-audits/            # Preflight audit checklists and AI agent operating directives
├── state of agent/                # Live session tracker (tasks.json), 8 inviolable rules, and 18 production skills
└── helpers/                       # Drop-in React SEO utilities, head hooks, and XSS-safe JSON-LD components
```

---

## 🧭 Comprehensive Folder & File Directory

### 1. [`platform-specifications/`](file:///d:/rmdu%20mobiles/instruction/platform-specifications/)
Holds core platform requirements, smartphone domain specifications, high-converting comparison workflows, and benchmark blueprints.
- **[01_PROJECT_MASTER_GUIDE.md](file:///d:/rmdu%20mobiles/instruction/platform-specifications/01_PROJECT_MASTER_GUIDE.md)**: Platform vision (RMDU Mobiles), core pillars, React 18 + Vite + FastAPI + PostgreSQL/Supabase tech stack, and non-negotiable quality bars.
- **[06_SMARTPHONE_PLATFORM_SPECIFICATIONS.md](file:///d:/rmdu%20mobiles/instruction/platform-specifications/06_SMARTPHONE_PLATFORM_SPECIFICATIONS.md)**: 5-category smartphone discovery (Budget Killer, Gaming Guru, Camera Champ, Battery Boss, G.O.A.T), interactive side-by-side comparison drawer, dynamic budget range filtering, 3-step AI smartphone recommendation quiz, and detailed specification cards.
- **[09_REFERENCE_SITES_BLUEPRINTS.md](file:///d:/rmdu%20mobiles/instruction/platform-specifications/09_REFERENCE_SITES_BLUEPRINTS.md)**: Architectural and design teardowns of premier tech platforms (Apple.com device compare, GSMArena deep specs matrix, Versus.com side-by-side heuristics, Linear dark elevation, and Stripe trust markers).

---

### 2. [`technical-architecture/`](file:///d:/rmdu%20mobiles/instruction/technical-architecture/)
Technical standards for React 18 Single Page Application (SPA) engineering, Vite bundling, component boundaries, and search engine optimization.
- **[02_REACT_AND_SEO_RULES.md](file:///d:/rmdu%20mobiles/instruction/technical-architecture/02_REACT_AND_SEO_RULES.md)**: The 7 Core Technical SEO Rules adapted for React SPA (title/description budgets, dynamic canonical isolation via head management, XSS-safe JSON-LD, sitemap/robots in `public/`, broken link mitigation, thin category quarantine) and the Vite Page Speed Concurrency bonus.
- **[03_REACT_VITE_ARCHITECTURE.md](file:///d:/rmdu%20mobiles/instruction/technical-architecture/03_REACT_VITE_ARCHITECTURE.md)**: React 18 + Vite SPA folder architecture, client-side route view conventions, React Suspense + `React.lazy` code splitting, error boundaries, custom hook data seams, Lenis smooth scrolling, GSAP micro-animations, and Tailwind CSS design token structure with `cn()`.
- **[10_SYSTEM_DESIGN_AND_RELIABILITY_RULES.md](file:///d:/rmdu%20mobiles/instruction/technical-architecture/10_SYSTEM_DESIGN_AND_RELIABILITY_RULES.md)**: Platform-wide system design contract: 24-table ownership map, atomic transactions and optimistic versions, idempotency, race-safe workflows (ranking, catalog, recommendations, alerts, cards, chat, accounts), cache/realtime consistency, availability targets and dependency-failure behavior, timeouts/retries/circuit breakers, security gates, job reliability, observability, releases/backups, and the concurrency test matrix.
- **[11_SYSTEM_DESIGN_MASTER_RULES.md](file:///d:/rmdu%20mobiles/instruction/technical-architecture/11_SYSTEM_DESIGN_MASTER_RULES.md)**: The working rulebook for concurrency, data integrity, availability and load: intention vs claim vs truth, the train-ticket hold model translated to RMDU (stock, category rank positions, recommendation generations, card codes), five claim primitives, isolation levels and the lost-update/write-skew/phantom defenses, optimistic versions and lock ordering, the `held → confirmed → released/expired` contract with server-time expiry, four-state availability UI with no ghost bookings, the schema-wide scarce-resource map, the never-broken per-surface contract, resilient degradation ladder, caching/pooling/rate-limit/load-shedding budgets, integrity counters, and the concurrency/load test matrix.
- **[12_CONCURRENCY_AND_RESERVATION_RULES.md](file:///d:/rmdu%20mobiles/instruction/technical-architecture/12_CONCURRENCY_AND_RESERVATION_RULES.md)**: Implementation mechanics for the same guarantees: lock-strategy selector, transaction-scoped advisory locks with key namespaces, row locking and lock ordering, a per-workflow race-condition library (reservations, comparison sessions, alerts, recommendation queues, cards, reviews/votes, chat, ranking), session timeout and auto-release policy, constraint/trigger discipline with column-level grant gaps, `Idempotency-Key` contract with DDL, status-code contract, frontend availability UX, lock-failure fallback table, deadlock/stuck-transaction monitoring queries and runbook, and the lock-specific test matrix.

---

### 3. [`design-and-motion/`](file:///d:/rmdu%20mobiles/instruction/design-and-motion/)
Design system specifications, semantic color roles, typography pairings, and micro-interaction standards.
- **[04_ENTERPRISE_UIUX_DESIGN_SYSTEM.md](file:///d:/rmdu%20mobiles/instruction/design-and-motion/04_ENTERPRISE_UIUX_DESIGN_SYSTEM.md)**: High-craft obsidian dark mode: deep canvas (`#08080A`), slate card surfaces (`#0F0F14`), elevated hover surfaces (`#16161E`), 1px translucent hairline borders (`rgba(255,255,255,0.07)`), category semantic accents (emerald, cyan, amber, purple, gold), and modern typography.
- **[05_UI_MICRO_INTERACTIONS_AND_MOTION.md](file:///d:/rmdu%20mobiles/instruction/design-and-motion/05_UI_MICRO_INTERACTIONS_AND_MOTION.md)**: Non-displacing card hovers, side-by-side comparison drawer slide transitions, specification score bar fills, Lenis fluid scroll integration, GSAP timeline cleanups, and `prefers-reduced-motion` compliance.

---

### 4. [`quality-and-audits/`](file:///d:/rmdu%20mobiles/instruction/quality-and-audits/)
Validation checklists, automated audit scripts, and AI agent operating directives.
- **[07_PREFLIGHT_AUDIT_CHECKLIST.md](file:///d:/rmdu%20mobiles/instruction/quality-and-audits/07_PREFLIGHT_AUDIT_CHECKLIST.md)**: Pre-flight audit checklist covering React SPA SEO, accessibility (WCAG 2.1 AA), dead link quarantine, Vite production build integrity, and Core Web Vitals.
- **[08_AI_AGENT_OPERATING_DIRECTIVES.md](file:///d:/rmdu%20mobiles/instruction/quality-and-audits/08_AI_AGENT_OPERATING_DIRECTIVES.md)**: AI agent persona guidelines, automated terminal grep audit commands for React/Vite codebases, and failure remediation playbooks.

---

### 5. [`state of agent/`](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/)
The live resume-from-anywhere workspace state for AI agents and developers.
- **[AGENTS.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/AGENTS.md)**: Master entrypoint defining the Rules vs Skills separation, self-containment law, and session continuity contracts for RMDU Mobiles.
- **[TRACKER_GUIDE.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/TRACKER_GUIDE.md)**: Operational guide for `tasks.json`, status flows, push accounting (human-only remote pushes), and task completion.
- **[pending-component-work.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/pending-component-work.md)**: Inventory of UI primitives, smartphone domain components, comparison matrix primitives, and replacement debt.
- **[tasks.json](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/tasks.json)**: Machine-readable task tracker with session state (`branch: main`, `updated_by: Meet Rabadiya`), summary counts, and completed/in-progress tasks.
- **[`rules/`](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/rules/)** (8 Inviolable Constraints):
  - [00-pixel-perfect.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/rules/00-pixel-perfect.md): Zero-pixel deviation tolerance and computed style comparison.
  - [01-git-hygiene.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/rules/01-git-hygiene.md): Exact paths only (`git add <path>`); no wildcard staging.
  - [02-gates.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/rules/02-gates.md): Verification gates (Vite production build, tests, token purity, selector-level utility proof).
  - [03-never-push.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/rules/03-never-push.md): Agents never push to remote; human pushes exclusively after browser audit.
  - [04-task-discipline.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/rules/04-task-discipline.md): Every prompt opens/closes a tracked task; no silent context.
  - [05-branch-hygiene.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/rules/05-branch-hygiene.md): Single shared branch `main`; zero force-push.
  - [06-claim-integrity.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/rules/06-claim-integrity.md): Atomic repeat-safe claims, zero-rows-means-denied, server-time expiry, no invented availability, guaranteed releases.
  - [09-developer-identity.md](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/rules/09-developer-identity.md): Developer name strictly **Meet Rabadiya** (`rabadiyameet09@gmail.com`).
- **[`skills/`](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/)** (18 Production Capabilities):
  - [backend-readiness](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/backend-readiness/SKILL.md) · [cascade-layers](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/cascade-layers/SKILL.md) · [code-standards](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/code-standards/SKILL.md) · [component-creation](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/component-creation/SKILL.md) · [component-scalability](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/component-scalability/SKILL.md) · [debug-frontend](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/debug-frontend/SKILL.md) · [decorative-graphics](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/decorative-graphics/SKILL.md) · [design-system](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/design-system/SKILL.md) · [folder-structure](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/folder-structure/SKILL.md) · [hooks](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/hooks/SKILL.md) · [motion](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/motion/SKILL.md) · [performance-budgets](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/performance-budgets/SKILL.md) · [responsive-system](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/responsive-system/SKILL.md) · [routes](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/routes/SKILL.md) · [skill-maintenance](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/skill-maintenance/SKILL.md) · [stylesheet-anatomy](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/stylesheet-anatomy/SKILL.md) · [theme-tokens](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/theme-tokens/SKILL.md) · [utility-first-jsx](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/skills/utility-first-jsx/SKILL.md)
- **[`archive/`](file:///d:/rmdu%20mobiles/instruction/state%20of%20agent/archive/)**: Preserved location for superseded notes, previous audits, and historical logs.

---

### 6. [`helpers/`](file:///d:/rmdu%20mobiles/instruction/helpers/)
Production-ready React utilities for technical SEO, dynamic head management, and platform operations.
- **[seo-helpers.js](file:///d:/rmdu%20mobiles/instruction/helpers/seo-helpers.js)**: Reusable utilities including `fitTitle()`, `buildPageMetadata()`, `useDocumentHead()` custom hook, and the XSS-safe `<JsonLd />` component with `\u003c` script escaping.

---

## ⚡ Core Summary: The 7 SEO Rules & Speed Bonus for React SPA

1. **Title**: Strictly 50–60 characters. Never blindly append site names; use `fitTitle()`.
2. **Description**: Strictly 120–160 characters. Must be 100% unique per route/device category.
3. **Canonical URL**: Dynamic canonical set on every view via `useDocumentHead()`. Never leave canonical unmanaged.
4. **Broken Links**: Fix self-404s. Filter combinations yielding zero phones must render a status 200 empty state with `noindex, follow`.
5. **Image Alt Text**: Add descriptive alt text to all device renders and banners (`alt="Samsung Galaxy S24 Ultra Titanium Gray Rear View"`); mark decorative icons with `aria-hidden="true"`.
6. **Thin Category Pages**: Any filtered category or price bucket with fewer than 3 devices must set `robots: { index: false, follow: true }` and stay excluded from `sitemap.xml`.
7. **Robots, Sitemap & JSON-LD**: Deployed via `public/robots.txt`, `public/sitemap.xml`, and client `<JsonLd />` component with `\u003c` script escaping for `Product`, `Review`, and `ItemList` schemas.
8. 🎁 **Page Speed Bonus**: Audit page speed only on production builds (`npm run build && npm run preview`) with concurrency = 1 (Vite dev servers compile unbundled ES modules on-demand, causing sequential queue latency under parallel crawler audits).
