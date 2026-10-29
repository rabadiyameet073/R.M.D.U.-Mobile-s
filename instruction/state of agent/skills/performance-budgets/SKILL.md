# Skill: Performance Budgets (Sub-Second Speed & Core Web Vitals in React SPA)

Global authority for keeping interactions, builds, and view transitions strictly within performance budgets across RMDU Mobiles.

---

## Budgets & Standards

1. **Derive, Don't Recompute**:
   - Memoize filtered phone lists, brand subsets, and price calculations with `useMemo`.
   - Never perform O(N) filtering operations directly in render loops or map passes.
2. **Product Image & Video Optimization**:
   - All phone renders and hero video wrappers must have explicit aspect ratios (e.g. `aspect-[4/5]`) to guarantee zero Cumulative Layout Shift (CLS = 0).
   - Above-the-fold hero elements load with priority; phone cards below the fold load imagery with native `loading="lazy"`.
3. **Storage & I/O Discipline**:
   - Read `localStorage` once on component mount (inside `useEffect`), never inside render bodies.
   - Write to storage only on explicit state transitions (e.g. pinning a phone or saving quiz preferences), never on every keystroke or slider tick.
4. **Animation Cost & GPU Acceleration**:
   - Animate only composite properties (`transform`, `opacity`).
   - Limit heavy backdrop blurs (`backdrop-blur-xl`) to top chrome and active modal overlays — avoid nesting full-viewport blurred layers.
5. **Production Build Benchmarking**:
   - Evaluate performance benchmarks only on production builds (`npm run build && npm run preview`) with single concurrency. Vite dev server unbundled ES module overhead does not reflect real-world speed.

---

## Good / Bad

- ✅ Filtering 50 phones using `useMemo(() => phones.filter(...), [phones, budget, brand])`.
- ❌ Re-filtering and re-sorting phone collections on every unrelated state update.
- ✅ Setting explicit aspect ratio on phone image wrappers (`aspect-[4/3] overflow-hidden`).
- ❌ Loading 40 uncompressed 4MB phone renders simultaneously above the fold.
