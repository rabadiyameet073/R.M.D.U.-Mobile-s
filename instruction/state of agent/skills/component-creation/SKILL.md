# Skill: Component Creation (Architecture, Base Primitives & Domain Components)

Global authority for creating enterprise-grade components in RMDU Mobiles. Scalable, accessible, and backend-attachable by construction.

---

## What Qualifies as a Base Primitive (`components/ui/`)

1. **Reusability Bar**: Used 3+ times across disparate surfaces, OR encapsulates a foundational design token treatment (e.g. `Button`, `Badge`, `Modal`, `Drawer`, `RangeSlider`, `Skeleton`).
2. **Domain Agnostic**: Pure props-in / render-out; zero smartphone or platform domain knowledge (no phone types, camera sensor schemas, or quiz logic). Zero mock imports, ever.
3. **Comprehensive State Coverage**: Carries its own state variants: default, hover, active, focus-visible, disabled, loading, and error states. A primitive that only implements the happy path is incomplete.

---

## Composed vs Domain Components

- **Composed UI**: Assembles multiple base primitives for a general layout surface (e.g. modal shell with header and footer, table wrapper) — remains props-driven and domain-free.
- **Smartphone Domain Components (`components/smartphones/`)**:
  - Domain-aware components (`PhoneCard`, `ComparisonDrawer`, `ComparisonMatrix`, `FilterBar`, `SpecDetailModal`, `AiMatchmakerModal`).
  - Receive data through typed props or custom seam hooks (`usePhones`, `useDeviceComparison`), never via deep fixture imports inside leaf JSX.

---

## Component Creation Checklist

1. **Component Signature**: Explicitly define parameters, default values, and event callbacks.
2. **Design System Alignment**: Rely entirely on design tokens from `global.css` — zero inline hex codes.
3. **Accessibility (A11y)**: Include keyboard navigation (Tab, Arrow keys, Enter, Escape) and ARIA attributes from the first commit.
4. **Resilient Feedback**: Provide explicit loading skeletons and empty states for async lists.
5. **Clean Exports**: Export PascalCase components with clean named exports.

---

## Good / Bad

- ✅ Creating `Badge({ variant, children })` in `ui/` used for category tags, fast charge wattage, and OS update badges.
- ❌ Hardcoding `PhoneCard` inside `components/ui/` with embedded mock data.
- ✅ `ComparisonDrawer` receiving pinned state from `useDeviceComparison` hook and emitting remove events.
- ❌ Creating duplicate button variants for each individual category view instead of utilizing `Button.jsx`.
