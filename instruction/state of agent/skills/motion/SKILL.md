# Skill: Motion (Animation Standards & Physics for RMDU Mobiles)

Global authority for animations, transitions, drawer slides, and micro-interactions across RMDU Mobiles.

---

## Standards

1. **Non-Displacing Hover Feedback**:
   - Card and button hover feedback must be non-displacing: subtle border tint (`hover:border-accent-budget/40`), gentle surface elevation (`hover:bg-surface-elevated`), and soft ambient glow.
   - **Never use vertical translations (`hover:-translate-y-2`) on phone cards** — displacement creates visual clutter and disrupts eye tracking across multi-column device grids.
2. **Comparison Drawer & Modal Motion**:
   - Slide drawers: smooth ease-out entrance (250ms), crisp exit (200ms).
   - Dialog modals: scale up from `0.96` to `1.0` with simultaneous opacity fade (`transition: opacity 200ms ease, transform 200ms cubic-bezier(0.16, 1, 0.3, 1)`).
   - Exits must complete cleanly before unmounting DOM nodes.
3. **Hardware Spec Bar Fills**:
   - When viewing phone hardware details, score bars animate smoothly from 0% to target value using cubic-bezier easing.
4. **GSAP Context Lifecycle**:
   - Always wrap GSAP animations in `gsap.context()` inside `useEffect` and call `ctx.revert()` in the cleanup return to prevent memory leaks and zombie animations.
5. **Reduced Motion Ergonomics**:
   - Every animation must respect `@media (prefers-reduced-motion: reduce)`. Transitions degrade gracefully to instantaneous cuts (`transition: none !important`) for users with vestibular sensitivities.

---

## Good / Bad

- ✅ A phone card that subtly brightens its border and background on hover while remaining stationary.
- ❌ A card that jumps 8 pixels upward on hover, causing adjacent grid cards to vibrate.
- ✅ A comparison drawer that slides smoothly up from the bottom edge.
- ❌ Initializing a GSAP scroll trigger without reverting context on unmount.
