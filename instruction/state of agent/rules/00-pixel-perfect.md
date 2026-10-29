# Rule 00 — Pixel-Perfect (inviolable)

Every UI modification must render byte-identically to the approved design system specifications except the explicitly requested delta. Tolerance is zero: one displaced pixel, wrong font weight, incorrect category accent, or drifting border opacity fails the pass.

---

## Protocol

1. Before modifying or replacing any component or style, record the computed values that matter (box metrics, border opacity, background colors, typography scale, line-height, corner radius, elevation, and z-index) from the current build.
2. After the change, re-capture and compare those values on the same routes, interactive states, and breakpoints (360px mobile, 768px tablet, 1024px desktop, and 1440px+ ultra-wide viewports).
3. Any single differing pixel or unexpected layout shift fails the pass — fix the root cause immediately. Never compensate by haphazardly tweaking unrelated padding or margins elsewhere.
4. Verify all interactive state variants: hover, active, focus-visible ring, disabled, and modal/drawer backdrop overlays.

---

## Good / Bad

- ✅ Replacing a hardcoded hex color with its design token twin (`bg-surface`, `text-accent-budget`) after verifying exact value equality.
- ❌ Replacing `padding: 12px 18px` with `p-4` (16px vs 12px vertical — alters card metrics and misaligns spec rows).
- ❌ Approving a side-by-side comparison drawer or specs modal without inspecting computed travel dimensions and mobile safe-area paddings.
- ❌ Eyeballing layout spacing without opening browser developer tools computed style inspector.

---

## Enforcement

Every work report must include:
> **Pixel-Perfect Verification**: <methodology — computed style comparison, viewport matrix check at 360/768/1024/1440px>.  
A work report omitting this verification statement is incomplete and cannot be accepted.
