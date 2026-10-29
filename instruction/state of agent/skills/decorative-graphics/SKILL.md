# Skill: Decorative Graphics (Ambient Washes, Category Glows & Hairlines)

Global authority for visual depth, lighting accents, ambient washes, and hairline borders in RMDU Mobiles.

---

## Design System Lighting Patterns

1. **Ambient Radial Washes (Hero & Category Banners)**:
   - Subtle background gradients provide atmospheric depth without overpowering typography or product imagery.
   - Use radial gradients with low opacity tailored to the active category (e.g. `radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 70%)` for Budget Killer).
   - Anchored via `pointer-events-none` and `aria-hidden="true"` so they never interfere with click/touch targets.
2. **Hairline Surface Borders**:
   - 1px hairline dividers using subtle translucent whites: `border border-white/[0.07]` or `border-white/[0.05]`.
   - Never use solid opaque grey borders (`#444444`) that look harsh and dated against obsidian canvases.
3. **Card Elevation & Category Hover Lighting**:
   - Subtle top highlight on active cards: `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]`.
   - Hover glow effects: subtle category illumination:
     - Budget: `hover:border-accent-budget/40 hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)]`
     - Gaming: `hover:border-accent-gaming/40 hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.15)]`
     - Camera: `hover:border-accent-camera/40 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)]`
4. **Stacked Layering Contract**:
   - Background canvas: `z-0`
   - Ambient glow / decorative canvas: `z-0 pointer-events-none`
   - Interactive phone cards / text content: `relative z-10`

---

## Good / Bad

- ✅ Adding an anchored, pointer-events-none ambient cyan spotlight behind the Gaming Guru category banner.
- ❌ Putting an ambient wash directly on the interactive card `div` that prevents children from receiving hover and click events.
- ✅ 1px hairline borders (`border-white/[0.07]`) maintaining subtle card boundaries.
- ❌ Applying thick 2px solid white borders that ruin the dark mode obsidian aesthetic.
