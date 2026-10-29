# Module 05: UI Micro-Interactions, Motion & Ergonomics

## 1. Professional UI Motion Standards

Enterprise technology platforms (Linear, Apple, Stripe) utilize motion to communicate state changes, guide spatial hierarchy, and provide instantaneous feedback—never for slow, gratuitous decoration:

- **Duration**: Interactions stay rapid: `150ms` for micro-hover states and filter toggles; `200ms–300ms` for modal entrances and comparison drawers.
- **Easing**: Natural spring physics (`stiffness: 160, damping: 22, mass: 0.6`) or quintic bezier curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Reduced Motion Support**: Always strictly respect `@media (prefers-reduced-motion: reduce)`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

## 2. Interactive Ergonomics in RMDU Mobiles

### A. Non-Displacing Phone Card Hover Feedback
- Phone cards in dense grids must **never jump upward** (`hover:-translate-y-2`), as physical translation causes jarring layout vibration across multi-column grids.
- Instead, use non-displacing luminous feedback:
  - Surface tint: `hover:bg-surface-elevated`
  - Category border illumination: `hover:border-accent-budget/40`
  - Soft ambient depth: `hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)]`

### B. Instant Visual Press Feedback
- All buttons, category tabs, and filter pills must incorporate tactile active states (`active:scale-[0.98] transition-transform duration-75`).

### C. Comparison Drawer & Spec Modal Transitions
- The bottom/side comparison drawer slides in smoothly with `backdrop-filter: blur(12px)`.
- Modals scale from `0.96` to `1.0` with simultaneous opacity fade.
- Always handle Escape key press and backdrop click to dismiss gracefully.

### D. Spec Score Bar Fills
- Hardware benchmark bars (AnTuTu score, Battery SOT, Camera score) animate smoothly from `0%` to their target width when entering viewport view (`transition: width 800ms cubic-bezier(0.16, 1, 0.3, 1)`).
