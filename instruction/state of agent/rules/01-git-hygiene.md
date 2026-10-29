# Rule 01 — Git Hygiene (inviolable)

---

## Exact Paths Only

- Stage explicit file paths only: `git add <path> [<path>...]`.
- **NEVER** use `git add .`, `git add -A`, `git commit -a`, wildcard globs, or sweeping repository refactors.
- **One discrete feature/fix = one commit.** Never batch unrelated alterations into a massive catch-all commit.
- Work on the shared session branch only (`main`).
- Quarantine and never commit:
  - CRLF-only whitespace churn (`core.autocrlf=true` conflicts).
  - Scratch screenshot PNGs, video dumps, or temporary debug scripts outside approved artifact directories.
  - Editor/IDE configuration artifacts (`.vscode/`, `.idea/`).
  - Stray `node_modules/` or unpruned build artifacts (`dist/`).

---

## Good / Bad

- ✅ `git add frontend/src/components/smartphones/ComparisonDrawer.jsx instruction/state\ of\ agent/tasks.json`
- ❌ `git add .` (accidentally commits build scratchpad files and unreviewed config changes).
- ❌ A single commit titled "updates and fixes" touching the Header, QuizModal, and CSS tokens simultaneously.

---

## Enforcement

Every work report must state:
> **Git Paths**: <exact files staged and committed>  
> **Untouched**: <areas deliberately left clean or untouched>  
A report omitting this breakdown is incomplete.
