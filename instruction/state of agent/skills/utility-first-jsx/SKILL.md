# Skill: Utility-First JSX (Tailwind & Utility Classes in React Components)

Global authority for writing clean, tokenized component markup with Tailwind and utility classes across RMDU Mobiles.

---

## Rules

1. **Tokens Over Arbitraries**:
   - Spacing, layout, typography, colors, borders, and radii must come strictly from design tokens or framework scale utilities.
   - **Never use hardcoded hex codes** (e.g. `bg-[#08080A]`) or arbitrary dimension brackets unless representing micro-geometry (e.g. `max-h-[85vh]` on a comparison sheet).
2. **State Swapping via Full Ternaries**:
   - Interactive state changes (e.g. pinned vs unpinned device checkbox, active vs inactive category pill) must use **complete ternary swaps**:
     ```jsx
     className={cn(
       'px-4 py-2 rounded-lg font-medium transition-colors',
       isSelected
         ? 'bg-accent-budget text-slate-950 shadow-budget-glow'
         : 'bg-surface text-text-secondary hover:text-white hover:bg-surface-elevated'
     )}
     ```
   - Never write a base utility plus an un-scoped conditional modifier of the same CSS property (e.g. `bg-slate-800 ${isSelected && 'bg-emerald-500'}`) — stylesheet compilation order will cause silent rendering bugs.
3. **Icons & SVG Elements (Lucide React)**:
   - Lucide icons use `color="currentColor"` with color inherited from text utilities (`text-accent-budget`, `text-slate-400`).
   - Dimension icon sizing with standard Tailwind classes (`w-4 h-4`, `w-5 h-5`).
4. **Clean Code Hygiene**:
   - Long class strings should be broken cleanly or organized logically: layout $\rightarrow$ sizing $\rightarrow$ typography $\rightarrow$ colors $\rightarrow$ interactive states.

---

## Good / Bad

- ✅ Full ternary: `isActive ? 'bg-accent-budget text-slate-950' : 'bg-surface text-slate-300'`
- ❌ Fragmented classes: `className={"bg-surface " + (isActive && "bg-emerald-500")}`
- ✅ `<Cpu className="w-5 h-5 text-accent-gaming" />`
- ❌ `<Cpu color="#06B6D4" />`
- ✅ Clean token utility: `border border-hairline bg-surface`
- ❌ Hardcoded values: `border border-[rgba(255,255,255,0.07)] bg-[#0F0F14]`
