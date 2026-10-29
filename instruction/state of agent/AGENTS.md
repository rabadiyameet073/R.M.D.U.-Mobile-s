# Agent State — `rmdu-mobiles` Smartphone Recommendation Platform (React 18 + Vite)

This directory enables any AI agent, collaborator, or IDE session to resume development on **RMDU Mobiles** exactly where work stopped — without requiring back-and-forth discovery. Start here, in this exact order:

1. `tasks.json` → read `session` (branch, tip, unpushed, `next_up`, `pending_verifications`), then the task list. Verify local `HEAD` matches `session.tip`; if divergent, reconcile before modifying code.
2. `TRACKER_GUIDE.md` → operational rules for updating task states.
3. `rules/` (in numeric order) → **inviolable constraints**. Rules dictate permissions and boundaries: pixel-perfect tolerance, git hygiene, verification gates, never-push, task discipline, branch hygiene, developer identity, and claim/availability integrity. Every report quotes rule compliance.
4. `skills/` → capabilities loaded per task: `theme-tokens`, `utility-first-jsx`, `cascade-layers`, `stylesheet-anatomy`, `design-system`, `motion`, `decorative-graphics`, `debug-frontend`, `responsive-system`, `code-standards`, `component-scalability`, `component-creation`, `folder-structure`, `hooks`, `routes`, `backend-readiness`, `performance-budgets`, `skill-maintenance`.
5. `../technical-architecture/` → system contracts before touching data or availability: [Module 10](../technical-architecture/10_SYSTEM_DESIGN_AND_RELIABILITY_RULES.md) for the table ownership map, transactions, idempotency and reliability, [Module 11](../technical-architecture/11_SYSTEM_DESIGN_MASTER_RULES.md) for claim primitives, holds, live availability truth and load budgets, [Module 12](../technical-architecture/12_CONCURRENCY_AND_RESERVATION_RULES.md) for advisory/row locks, timeouts, Idempotency-Key, conflict UX and deadlock monitoring.

---

## Rules vs Skills (The Split — Never Confuse Them)

- **Rules** dictate what agents must and must not do:
  - Zero unprompted pushes to remote repositories (the human developer pushes after browser audit).
  - Exact file paths only in `git add` (no `git add .`, `-A`, or wildcard sweeping).
  - Strict verification gates before every commit (Vite production build, test suites, token purity, selector-level CSS proof).
  - Single shared branch hygiene (`main`).
  - Canonical attribution strictly to **Meet Rabadiya** (`rabadiyameet09@gmail.com`).
- **Skills** define how to build enterprise-grade, high-converting smartphone recommendation UI:
  - Token systems, utility conventions, cascade layers, drawer and modal motion, side-by-side comparison matrices, and diagnostic quiz workflows.
  - Skills provide technical capability; they never grant permission to bypass rules.

---

## Self-Containment Law (Smartphone-Specific)

Every example, pattern, and mock structure in this directory is native to **RMDU Mobiles**:
- Smartphone discovery and category exploration (`PhoneCard`, `CategoryPage`, `FilterBar`, `CategoryTabs`).
- High-efficiency side-by-side comparison (`ComparisonDrawer`, `ComparisonMatrix`, `DiffHighlighter`).
- 3-step AI smartphone matchmaker quiz (`AiMatchmakerModal`, `QuizQuestionCard`).
- Technical hardware metrics (Snapdragon/Dimensity/Apple chipsets, AnTuTu/Geekbench tiers, Sony LYT/IMX camera sensors, battery mAh, charging wattage, display refresh Hz, price in INR ₹ and USD $).
- Zero references to irrelevant domains (no tutoring, executive mentorship, physical shopping carts, or course cohorts).

---

## Session Continuity Contract

- `tasks.json#session` is refreshed in the same commit as every code block.
- `pushed` flips only on explicit human confirmation ("pushed till <commit>").
- Unpushed local commits are expected and normal; remote pushing belongs strictly to the human engineer.
- `archive/` holds superseded docs and past audit logs (history, not current authority).
