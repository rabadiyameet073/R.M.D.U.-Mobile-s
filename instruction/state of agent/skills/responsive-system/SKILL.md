# Skill: Responsive System (Breakpoints & Mobile-First Ergonomics)

Global authority for adaptive layouts, comparison matrix ergonomics, and touch targets across all screen sizes in RMDU Mobiles.

---

## The Viewport Matrix

All UI components must be tested and verified against the canonical 4-tier viewport matrix:
1. **Mobile (360px – 480px)**: Compact single-column card flow, bottom-sheet comparison tray, 44px+ touch targets, thumb-accessible primary filters.
2. **Tablet (768px – 1023px)**: 2-column phone grid, condensed horizontal navigation, side-by-side 2-phone comparison view.
3. **Desktop (1024px – 1439px)**: 3-column phone grid, right-hand filter drawer or sticky top bar, 3-phone comparison matrix.
4. **Ultra-Wide (1440px+)**: Centered container with max-width bounding (`max-w-7xl mx-auto`), 4-column phone grid or 4-phone full comparison matrix, crisp metrics.

---

## Responsive Rules

1. **Touch Ergonomics (Mobile-First)**:
   - Interactive buttons, category pills, and compare checkboxes must have a minimum touch target of `44px × 44px`.
   - On viewports < 768px, the comparison tray docks as a compact bottom sheet with quick-expand actions.
2. **Comparison Matrix Horizontal Scrolling**:
   - On mobile and tablet screens, multi-device comparison tables must support smooth horizontal touch panning with the first column (Spec Names) sticky-locked to the left.
3. **Fluid Typography & Spacing**:
   - Headings scale smoothly across viewports (e.g. `text-3xl md:text-5xl lg:text-6xl`).
   - Never allow unintended horizontal document overflow or scrollbars.
4. **Mutual Exclusivity in Responsive Classes**:
   - Use clean responsive prefixes without conflicting properties (e.g. `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).

---

## Good / Bad

- ✅ Phone directory gracefully transitioning: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.
- ❌ Hardcoding `w-[1200px]` that introduces horizontal scrollbars across the entire window on mobile.
- ✅ Comparison checkboxes maintaining 44px hit-area on touchscreen devices.
- ❌ Miniature 16px touch targets that cause accidental clicks between phone cards.
