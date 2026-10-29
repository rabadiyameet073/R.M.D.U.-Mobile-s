# Pending Component Work (Replacement Debt & Component Inventory)

Explicit inventory of smartphone recommendation platform UI blocks and primitives. Nothing here authorizes rogue refactoring — each entry names the custom component so future sprints can construct exactly this list.

Updated per screen as audited. **Rule:** Never force-fit these into a naive primitive if doing so compromises enterprise aesthetics or introduces visual regressions.

Status key:
- `raw`: Hand-written JSX + inline styles.
- `partial`: Shell primitive + raw internal logic.
- `done`: Fully modularized, tokenized, and browser-verified.

---

## 1. Existing Primitives & Component Inventory

### A. Base UI Primitives (`components/ui/`)
- `Button`: Primary category CTA, subtle ghost secondary, outline icon trigger.
- `Input`: Dark obsidian input fields with subtle focus glow and search iconography.
- `Select`: Custom styled dropdown for sorting (Price: Low to High, Performance Score, Battery Endurance).
- `RangeSlider`: Dual-thumb / stepped range slider for interactive budget filtering.
- `Checkbox`: Custom styled toggle for pinning devices into comparison matrix.
- `Badge`: Category badges (`Budget Killer`, `Gaming Guru`, `Camera Champ`, `Battery Boss`, `G.O.A.T`) and spec pills (`120W Fast Charge`, `Snapdragon 8 Gen 3`, `Sony LYT-900`).
- `Modal`: Accessible backdrop overlay dialog with focus trap and Escape listener.
- `Drawer`: Slide-in sheet used for side-by-side device comparison.
- `Disclosure`: Accordion for detailed hardware breakdown and FAQ items.
- `Tabs`: Segmented controls for switching between categories and spec categories.
- `Tooltip`: Micro-hover context explanation for benchmark scores and camera sensor sizes.
- `Skeleton`: Shimmer placeholder for phone grid and comparison rows during async loads.
- `EmptyState`: Search/budget filter zero-state with reset suggestions.
- `ProgressBar`: Hardware score bar (AnTuTu score, SOT battery, camera score) with category-colored fill.
- `IconButton`: Compact accessible action button with `aria-label`.

### B. Smartphone Platform Domain Components (`components/smartphones/`)
- `PhoneCard`: Device render, name, chipset, camera, battery, price badge, compare checkbox, and detail modal trigger.
- `CategoryHero`: Video loop background, category subtitle, core highlights, and active count.
- `ComparisonDrawer`: Slide-up tray displaying pinned phones with clear action and compare view trigger.
- `ComparisonMatrix`: Head-to-head multi-column table with "Highlight Differences" toggle.
- `FilterBar`: Dynamic budget slider, brand selector pills (Samsung, Apple, OnePlus, iQOO, Xiaomi, Pixel), and sort order.
- `SpecDetailModal`: Comprehensive hardware specification breakdown with score radar and pros/cons list.
- `AiMatchmakerModal`: 3-step diagnostic quiz (Primary Intent $\rightarrow$ Budget Comfort $\rightarrow$ Must-Have Feature) calculating compatibility percentage.

### C. Layout Chrome (`components/layout/`)
- `Header`: Sticky glassmorphic navigation header, category links, search trigger, and comparison badge counter.
- `Footer`: Platform navigation, data source disclaimers, benchmark methodologies, and copyright.
- `MobileMenu`: Full-screen touch-friendly navigation sheet for viewports < 768px.
- `Preloader`: Smooth entry preloader matching branding aesthetics.
- `CustomCursor`: Subtle optical cursor enhancement for desktop viewports.

---

## 2. Template (Per Section / Feature Audit)

```markdown
## <Section/Feature> (`<path>`)
| Block | Status | Why no existing primitive fits | Future component |
|---|---|---|---|
| Side-by-Side Spec Diff Matrix | partial | Requires multi-column sticky headers and difference dimming | `ComparisonMatrix` |
| Stepped Budget Slider | partial | Dual-thumb inputs with currency ticks and touch ergonomics | `BudgetRangeSlider` |
| Hardware Score Radar | done | Multi-axis SVG polygon visualizing benchmark balance | `HardwareScoreRadar` |
```

---

## 3. Global Exclusions & Known Seams

- **Comparison Pin Limit**: Maximum 4 devices allowed in the comparison tray simultaneously; 5th selection triggers an informative toast: *"Maximum 4 devices can be compared simultaneously."*
- **Currency Convention**: Maintain consistent integer values in state; format at render time via `formatCurrency(price, 'INR' | 'USD')`.
- **Video Optimization**: Category background loop videos must pause automatically when scrolled out of viewport via `IntersectionObserver` to save client GPU cycles.
- **Form State Preservation**: AI matchmaker quiz must preserve selections if dismissed and reopened in the same session.
- **Accessibility Invariant**: Every modal and drawer must implement `aria-modal="true"`, lock body scrolling, and restore active focus upon exit.
