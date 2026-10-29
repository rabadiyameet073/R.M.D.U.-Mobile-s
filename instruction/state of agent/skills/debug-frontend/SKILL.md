# Skill: Debug Frontend (Diagnosis Playbook for RMDU Mobiles)

Global authority for systematically diagnosing and resolving frontend, styling, and interaction bugs without guesswork.

---

## Playbook (In Exact Order)

1. **Reconcile Build & Cache First**:
   - Verify the running environment reflects the latest code changes. Run `npm run build` in `frontend/` and perform a hard cache refresh (`Ctrl+F5` / `Cmd+Shift+R`) before diagnosing complex bugs. Stale hot-module reloading in Vite can simulate phantom defects.
2. **Prove Utility Generation at Selector Level**:
   - Check the built production stylesheet for the escaped class selector (e.g. `\.bg-surface\{`, `\.text-accent-budget\{`). Substring search is invalid because token declarations and CSS comments introduce false positives.
   - If a utility is missing from the output bundle, Tailwind purged it because the class name was dynamically assembled via string concatenation (e.g. ``text-${categoryColor}``). Always use static, full class strings or lookup objects.
3. **Stacking Context & Paint Order Before Geometry**:
   - Stacking bugs in comparison drawers, spec modals, and sticky headers: inspect `position`, `z-index`, and containing stacking contexts (elements with `transform`, `filter`, `opacity < 1`, or `isolation: isolate` create new stacking contexts).
   - The platform stacking contract:
     - Base canvas: `z-0`
     - Background glow: `z-0 pointer-events-none`
     - Content phone cards: `z-10`
     - Sticky Header: `z-40`
     - Modals & Comparison Drawers: `z-50`
     - Toast notifications & Custom Cursor: `z-[60]` / `z-[9999]`
4. **Scrubbing & Re-Render Diagnostics**:
   - If scrubbing the budget slider stutters, check if state updates are non-blocking via `useTransition` or if heavy child trees lack `React.memo`.
5. **Specificity Arithmetic**:
   - Compare `(inline, ids, classes, elements)` specificity. If two rules share identical specificity, document order determines the winner. Never guess — rely on `cn()` to eliminate conflicts.

---

## Good / Bad

- ✅ Inspecting stacking context to fix why a comparison drawer rendered underneath the sticky header.
- ❌ Adding `!important` to 4 different CSS rules to force a modal backdrop to appear on top.
- ✅ Resolving slider lag by wrapping phone list recalculation in `startTransition`.
- ❌ Changing padding 5 times to diagnose an element overlapping a hairline border.
