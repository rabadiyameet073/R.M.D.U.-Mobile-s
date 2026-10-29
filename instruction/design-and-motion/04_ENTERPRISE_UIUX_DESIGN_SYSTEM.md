# Module 04: Enterprise Platform UI/UX Design System

## 1. Professional Palette Architecture

Smartphone evaluation requires high focus, clear visual hierarchy, and instant metric readability. RMDU Mobiles strictly avoids garish or noisy palettes in favor of calm, authoritative dark mode luxury:

```css
:root {
  /* Surfaces */
  --bg-canvas: #08080A;          /* Deep obsidian canvas */
  --bg-surface: #0F0F14;         /* Primary card surface */
  --bg-surface-elevated: #16161E;/* Hover elevation & modal bodies */
  --bg-surface-subtle: #1C1C26;  /* Input fields & secondary pills */

  /* Hairlines & Borders */
  --border-hairline: rgba(255, 255, 255, 0.07);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-focus: #10B981;

  /* Category Semantic Accents */
  --accent-budget: #10B981;      /* Emerald (Budget Killer) */
  --accent-gaming: #06B6D4;      /* Electric Cyan (Gaming Guru) */
  --accent-camera: #F59E0B;      /* Warm Amber (Camera Champ) */
  --accent-battery: #8B5CF6;     /* Royal Purple (Battery Boss) */
  --accent-goat: #EAB308;        /* Sovereign Gold (G.O.A.T) */

  /* Typography */
  --text-primary: #F8FAFC;       /* High-contrast headings and active metrics */
  --text-secondary: #94A3B8;     /* Explanatory text, specs, and descriptions */
  --text-dim: #64748B;           /* Captions, timestamps, and subtle labels */
}
```

---

## 2. Typography Hierarchy & Optical Kerning

- **Display Headings (H1, H2)**: Modern geometric sans (`Plus Jakarta Sans` or `Outfit`), tight optical letter-spacing (`tracking-tight` / `-0.025em`), bold authority.
- **Body & Editorial Text**: Neutral legible sans (`Inter`), `1.6` line-height for fatigue-free reading across detailed phone teardowns.
- **Hardware & Metric Values**: Precision monospaced font (`JetBrains Mono`). Used for AnTuTu scores, battery capacity (`5,000 mAh`), charging wattage (`120W`), aperture (`f/1.6`), and price displays (`₹29,999` / `$349`). Widened tracking (`tracking-wider` / `+0.05em`).

---

## 3. High-Craft Layout Patterns

- **Structured Grids**: Responsive 12-column layouts with balanced 24px to 32px gap intervals between phone cards.
- **Hairline Dividers**: 1px subtle separation borders (`rgba(255,255,255,0.07)`). Never use opaque, harsh grey borders.
- **Glassmorphic Headers & Drawers**: `backdrop-filter: blur(16px)` with multi-layer shadow depths for sticky navigation and comparison drawers.
- **Hardware Score Bars**: Dynamic visual progress meters indicating category performance (e.g., Gaming 9.4/10, Battery 8.8/10) with category-colored fills.
