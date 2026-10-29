# Skill: Stylesheet Anatomy (`src/styles/global.css`)

Global authority for what lives in the central platform stylesheet — the single source of truth for styles and design tokens across RMDU Mobiles.

---

## Central Stylesheet Organization

The central stylesheet is structured in four strict sections:

1. **Design System Token Block (`:root`)**:
   - Declares all semantic color roles (`--bg-canvas`, `--bg-surface`, `--bg-surface-elevated`, `--border-hairline`).
   - Category accent definitions: `--accent-budget`, `--accent-gaming`, `--accent-camera`, `--accent-battery`, `--accent-goat`.
   - Typography mappings (`Plus Jakarta Sans` / `Outfit` for headings, `Inter` for body, `JetBrains Mono` for hardware metrics).
   - Custom border radii and box shadows.
2. **Base Resets (`@layer base`)**:
   - Global body styling: background color, antialiasing, text color.
   - Preflight augmentations and default button/input behavior.
3. **Utility Layer Augmentations (`@layer utilities`)**:
   - Specialized utilities like `.text-accent-budget`, `.border-hairline`.
4. **Retained Custom CSS**:
   - Keyframe animations (pulse glows, modal entrances).
   - Scrollbar hiding utilities (`.no-scrollbar`).
   - Comparison matrix sticky cell positioning.

---

## When Custom CSS Is Permitted vs Forbidden

- **Permitted**:
  - Pseudo-elements (`::before`, `::after`) creating atmospheric lighting accents.
  - Custom keyframe choreographies for preloader or hardware score bars.
  - Sticky table cell borders and backdrop blur fallbacks.
- **Forbidden**:
  - Creating custom class wrappers for simple layouts (e.g. `.phone-card-row` — use standard flex/grid utilities).
  - Writing ad-hoc margin, padding, or color classes that bypass design tokens.

---

## Good / Bad

- ✅ Defining category semantic tokens inside `:root` in `global.css`.
- ❌ Creating 5 separate CSS module files across components.
- ✅ Documenting deletions with a comment when migrating legacy classes to utilities.
- ❌ Silently removing custom CSS without verifying if a pseudo-element was needed for visual depth.
