# Rule 02 — Verification Gates (inviolable)

No code commit lands unless every applicable verification gate passes cleanly on the final tree:

1. **Vite Production Build Verification**: `npm run build` in `frontend/` completes with exit code 0, zero bundling errors, and zero unresolved imports.
2. **Logic & Syntax Integrity**: Clean execution without console errors, runtime crashes, or broken hooks.
3. **Token Purity**: Zero raw hex codes and zero unapproved `[...]` arbitraries in touched JSX lines (tokenized styles only, with documented exceptions for micro-geometry).
4. **Selector-Level Utility Proof**: Every new utility class used must be proven present in the built CSS output at SELECTOR level (`\.util\{` escaped) — substring counts are invalid because token definitions contaminate them.
5. **Multi-Viewport Ergonomics**: Responsive visual verification at 360px (mobile), 768px (tablet), 1024px (desktop), and 1440px+ (large display).
6. **Accessibility (WCAG 2.1 AA)**: Minimum 4.5:1 text contrast, visible focus rings on interactive elements, Escape dismissal on modals and drawers, and screen-reader `aria-label` / `aria-hidden` attributes on icon triggers.

---

## Good / Bad

- ✅ Proving `\.text-accent-budget` is emitted in production CSS before closing a task.
- ❌ Counting occurrences of `budget` via substring search (matches CSS comments and raw token declarations).
- ❌ Committing immediately after editing JSX without running `npm run build` to verify syntax and imports.
- ❌ Introducing hardcoded `#10B981` in a component instead of using the design token class `text-accent-budget`.

---

## Enforcement

Every work report must state:
> **Gates**: build/syntax/token-purity/css-proof/responsiveness/accessibility — <pass details and terminal evidence>.  
A report lacking explicit gate pass verification cannot be merged or closed.
